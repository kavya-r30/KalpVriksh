import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from agno.agent import Agent
from agno.models.google import Gemini
from agno.models.groq import Groq
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import csv
import io
import google.genai as genai

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

engine = create_engine(DB_URL)

with open("schema.json", "r") as f:
    DATABASE_SCHEMA = json.load(f)

# =============================================
# REQUEST/RESPONSE MODELS
# =============================================

class ChatRequest(BaseModel):
    message: str
    user_id: str
    role: str

class AgentTaskRequest(BaseModel):
    task_type: str
    user_id: str
    role: str
    params: dict = {}

class NotificationRequest(BaseModel):
    school_id: str
    notification_type: str
    target_audience: str
    title: str
    message: str
    class_id: Optional[str] = None
    sent_by: str

class DataIngestionRequest(BaseModel):
    data_type: str
    school_id: str
    records: List[dict]


# =============================================
# CORE DATABASE TOOLS
# =============================================

def run_sql_query(query: str) -> str:
    """
    USE THIS TOOL FOR: All READ operations - fetching data, viewing records, getting lists, checking information.

    PURPOSE: Executes SELECT queries to retrieve data from the database.

    WHEN TO USE:
    - "Show me...", "List all...", "Who is...", "What is...", "How many..."
    - Any question asking for information
    - Checking if data exists before making changes
    - Getting counts, averages, sums, or any aggregations

    IMPORTANT: This tool ONLY allows SELECT queries. For INSERT/UPDATE, use execute_write_query.

    RETURNS: JSON array of results or error message.
    """
    try:
        forbidden = ["DROP", "DELETE", "TRUNCATE", "UPDATE", "INSERT", "ALTER"]
        if any(cmd in query.upper() for cmd in forbidden):
            return "ERROR: Security Alert. You are only allowed to run SELECT queries. Use execute_write_query for modifications."

        with engine.connect() as connection:
            result = connection.execute(text(query))

            if result.returns_rows:
                columns = result.keys()
                rows = [dict(zip(columns, row)) for row in result]

                if not rows:
                    return "Query executed successfully but returned 0 records. The data you're looking for may not exist."

                return json.dumps(rows, default=str)
            return "Action completed successfully (No rows returned)."

    except Exception as e:
        return f"DATABASE ERROR: {str(e)}. Check column names and table relationships."


def execute_write_query(query: str) -> str:
    """
    USE THIS TOOL FOR: All WRITE operations - creating, updating, or modifying data.

    PURPOSE: Executes INSERT, UPDATE queries to modify database records.

    WHEN TO USE:
    - "Add a...", "Create a...", "Insert...", "Mark as...", "Update...", "Change..."
    - Recording attendance, entering marks, adding students
    - Updating status, modifying records

    IMPORTANT:
    - Always verify data exists using run_sql_query BEFORE updating
    - Cannot be undone - double check values before executing
    - DROP, TRUNCATE, ALTER are forbidden

    RETURNS: Success message with rows affected or error message.
    """
    try:
        forbidden = ["DROP", "TRUNCATE", "ALTER", "GRANT", "REVOKE"]
        if any(cmd in query.upper() for cmd in forbidden):
            return "ERROR: Destructive schema changes (DROP/TRUNCATE/ALTER) are strictly forbidden."

        with engine.begin() as connection:
            result = connection.execute(text(query))
            return f"Action Successful. Rows affected: {result.rowcount}"

    except Exception as e:
        return f"WRITE ERROR: {str(e)}. Verify the data and foreign key relationships."


def get_table_schema(table_name: str) -> str:
    """
    USE THIS TOOL FOR: When unsure about column names or data types.

    PURPOSE: Returns the structure of a specific table including column names and types.

    WHEN TO USE:
    - Before writing a complex query and unsure of column names
    - When a query fails due to unknown column error
    - To verify the correct column to use for joins

    RETURNS: List of (column_name, data_type) pairs.
    """
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        schema_info = [(col['name'], str(col['type'])) for col in columns]
        return str(schema_info)
    except Exception as e:
        return f"Error fetching schema: {e}"


# =============================================
# SPECIALIZED ANALYSIS TOOLS
# =============================================

def get_attendance_analysis(student_id: str, days: int = 30) -> str:
    """
    USE THIS TOOL FOR: Detailed attendance analysis with patterns and recommendations.

    PURPOSE: Analyzes a student's attendance over a period and provides insights.

    WHEN TO USE:
    - "How is [student]'s attendance?"
    - "Is [student] attending regularly?"
    - "Attendance report for..."
    - When checking if a student is at risk due to low attendance

    RETURNS: JSON with attendance stats, percentage, status (critical/warning/good), and recommendations.
    """
    try:
        with engine.connect() as connection:
            period_start = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
            query = text(f"""
                SELECT
                    COUNT(*) as total_days,
                    SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
                    SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
                    SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
                    SUM(CASE WHEN status = 'Holiday' THEN 1 ELSE 0 END) as holidays
                FROM attendance
                WHERE student_id = '{student_id}'
                AND attendance_date >= '{period_start}'
            """)
            result = connection.execute(query)
            row = result.fetchone()

            if not row or row[0] == 0:
                return json.dumps({"status": "no_data", "message": "No attendance records found for this period"})

            total = row[0]
            present = row[1] or 0
            absent = row[2] or 0
            late = row[3] or 0
            holidays = row[4] or 0
            working_days = total - holidays
            percentage = round((present / working_days) * 100, 1) if working_days > 0 else 0

            # Get recent absence pattern
            pattern_query = text(f"""
                SELECT attendance_date, status
                FROM attendance
                WHERE student_id = '{student_id}' AND status = 'Absent'
                AND attendance_date >= '{period_start}'
                ORDER BY attendance_date DESC
                LIMIT 5
            """)
            pattern_result = connection.execute(pattern_query)
            recent_absences = [str(r[0]) for r in pattern_result]

            analysis = {
                "period_days": days,
                "total_days": total,
                "working_days": working_days,
                "present_days": present,
                "absent_days": absent,
                "late_days": late,
                "holidays": holidays,
                "attendance_percentage": percentage,
                "recent_absences": recent_absences,
                "status": "critical" if percentage < 75 else "warning" if percentage < 85 else "good",
                "recommendation": ""
            }

            if percentage < 75:
                analysis["recommendation"] = f"CRITICAL: Attendance is {percentage}% (below 75%). Immediate parent meeting required. Risk of attendance shortage."
            elif percentage < 85:
                analysis["recommendation"] = f"WARNING: Attendance is {percentage}% (below 85%). Send reminder to parents. Monitor closely."
            else:
                analysis["recommendation"] = f"GOOD: Attendance is {percentage}%. Keep up the good work!"

            return json.dumps(analysis)
    except Exception as e:
        return f"Error analyzing attendance: {str(e)}"


def get_performance_insights(student_id: str, include_class_comparison: bool = True) -> str:
    """
    USE THIS TOOL FOR: Comprehensive academic performance analysis with comparisons.

    PURPOSE: Analyzes marks across subjects, identifies strengths/weaknesses, compares with class.

    WHEN TO USE:
    - "How is [student] performing academically?"
    - "Show me [student]'s marks/grades"
    - "Which subjects need improvement?"
    - "Academic report for..."
    - When generating report cards or parent meetings

    RETURNS: JSON with subject-wise analysis, overall average, trends, class rank, and recommendations.
    """
    try:
        with engine.connect() as connection:
            # Get student's marks with exam details
            query = text(f"""
                SELECT
                    s.name as subject_name,
                    e.name as exam_name,
                    e.exam_type,
                    es.max_marks,
                    m.marks_obtained,
                    ROUND((m.marks_obtained / es.max_marks) * 100, 1) as percentage,
                    e.start_date as exam_date
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN subjects s ON es.subject_id = s.id
                JOIN exams e ON es.exam_id = e.id
                WHERE m.student_id = '{student_id}'
                ORDER BY e.start_date DESC, s.name
            """)
            result = connection.execute(query)
            rows = [dict(zip(result.keys(), row)) for row in result]

            if not rows:
                return json.dumps({"status": "no_data", "message": "No marks records found"})

            # Get student's class for comparison
            class_query = text(f"SELECT current_class_id FROM students WHERE id = '{student_id}'")
            class_result = connection.execute(class_query).fetchone()
            class_id = class_result[0] if class_result else None

            # Analyze by subject
            subject_stats = {}
            for row in rows:
                subject = row['subject_name']
                if subject not in subject_stats:
                    subject_stats[subject] = {"marks": [], "percentages": [], "exams": []}
                subject_stats[subject]['percentages'].append(float(row['percentage'] or 0))
                subject_stats[subject]['exams'].append({
                    "exam": row['exam_name'],
                    "marks": float(row['marks_obtained'] or 0),
                    "max": float(row['max_marks'] or 0),
                    "percentage": float(row['percentage'] or 0)
                })

            analysis = {
                "subjects": [],
                "overall_average": 0,
                "strong_subjects": [],
                "weak_subjects": [],
                "improving_subjects": [],
                "declining_subjects": [],
                "class_rank": None,
                "class_average": None,
                "top_performer_in": [],
                "recommendations": []
            }

            total_avg = 0
            for subject, stats in subject_stats.items():
                avg_pct = sum(stats['percentages']) / len(stats['percentages'])
                total_avg += avg_pct

                trend = "stable"
                if len(stats['percentages']) >= 2:
                    recent = stats['percentages'][0]
                    older = stats['percentages'][-1]
                    if recent > older + 5:
                        trend = "improving"
                        analysis["improving_subjects"].append(subject)
                    elif recent < older - 5:
                        trend = "declining"
                        analysis["declining_subjects"].append(subject)

                subject_data = {
                    "name": subject,
                    "average_percentage": round(avg_pct, 1),
                    "highest_score": round(max(stats['percentages']), 1),
                    "lowest_score": round(min(stats['percentages']), 1),
                    "total_exams": len(stats['percentages']),
                    "trend": trend,
                    "recent_exams": stats['exams'][:3]  # Last 3 exams
                }

                analysis["subjects"].append(subject_data)

                if avg_pct >= 80:
                    analysis["strong_subjects"].append(subject)
                elif avg_pct < 50:
                    analysis["weak_subjects"].append(subject)

            analysis["overall_average"] = round(total_avg / len(subject_stats), 1) if subject_stats else 0

            # Class comparison if enabled and class_id exists
            if include_class_comparison and class_id:
                # Get class rank
                rank_query = text(f"""
                    WITH student_avgs AS (
                        SELECT
                            m.student_id,
                            ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_pct
                        FROM marks m
                        JOIN exam_schedule es ON m.exam_schedule_id = es.id
                        JOIN students s ON m.student_id = s.id
                        WHERE s.current_class_id = '{class_id}'
                        GROUP BY m.student_id
                    )
                    SELECT
                        COUNT(*) + 1 as rank,
                        (SELECT AVG(avg_pct) FROM student_avgs) as class_avg
                    FROM student_avgs
                    WHERE avg_pct > (SELECT avg_pct FROM student_avgs WHERE student_id = '{student_id}')
                """)
                rank_result = connection.execute(rank_query).fetchone()
                if rank_result:
                    analysis["class_rank"] = int(rank_result[0])
                    analysis["class_average"] = round(float(rank_result[1] or 0), 1)

            # Generate recommendations
            if analysis["weak_subjects"]:
                analysis["recommendations"].append(f"FOCUS NEEDED: Extra coaching recommended for {', '.join(analysis['weak_subjects'])}")
            if analysis["declining_subjects"]:
                analysis["recommendations"].append(f"ATTENTION: Performance declining in {', '.join(analysis['declining_subjects'])}. Investigate cause.")
            if analysis["overall_average"] < 50:
                analysis["recommendations"].append("CRITICAL: Overall average below 50%. Urgent intervention needed.")
            elif analysis["overall_average"] < 60:
                analysis["recommendations"].append("Parent-teacher meeting recommended to discuss improvement strategies.")
            elif analysis["overall_average"] >= 85:
                analysis["recommendations"].append("EXCELLENT: Consider advanced programs or competitive exam preparation.")
            if analysis["improving_subjects"]:
                analysis["recommendations"].append(f"POSITIVE: Good improvement seen in {', '.join(analysis['improving_subjects'])}")

            return json.dumps(analysis, default=str)
    except Exception as e:
        return f"Error analyzing performance: {str(e)}"


def get_fee_status(student_id: str) -> str:
    """
    USE THIS TOOL FOR: Complete fee status with payment history and dues.

    PURPOSE: Gets all fee information for a student including pending, paid, and overdue fees.

    WHEN TO USE:
    - "What are [student]'s pending fees?"
    - "Fee status for..."
    - "Has [student] paid their fees?"
    - "Show fee dues/balance"
    - When checking financial status before issuing certificates

    RETURNS: JSON with fee breakdown, total due, overdue amount, payment history, and status.
    """
    try:
        with engine.connect() as connection:
            query = text(f"""
                SELECT
                    sf.id,
                    fs.fee_type,
                    sf.total_amount,
                    sf.paid_amount,
                    sf.balance_amount,
                    sf.status,
                    sf.due_date,
                    sf.academic_year
                FROM student_fees sf
                JOIN fee_structures fs ON sf.fee_structure_id = fs.id
                WHERE sf.student_id = '{student_id}'
                ORDER BY sf.due_date
            """)
            result = connection.execute(query)
            fees = [dict(zip(result.keys(), row)) for row in result]

            # Get recent payments
            payment_query = text(f"""
                SELECT fp.amount, fp.payment_date, fp.payment_method, fp.receipt_number, fs.fee_type
                FROM fee_payments fp
                JOIN student_fees sf ON fp.student_fee_id = sf.id
                JOIN fee_structures fs ON sf.fee_structure_id = fs.id
                WHERE sf.student_id = '{student_id}'
                ORDER BY fp.payment_date DESC
                LIMIT 5
            """)
            payment_result = connection.execute(payment_query)
            recent_payments = [dict(zip(payment_result.keys(), row)) for row in payment_result]

            total_due = sum(f['balance_amount'] or 0 for f in fees)
            total_paid = sum(f['paid_amount'] or 0 for f in fees)
            total_fees = sum(f['total_amount'] or 0 for f in fees)
            overdue_fees = [f for f in fees if f['due_date'] and datetime.strptime(str(f['due_date']), '%Y-%m-%d') < datetime.now() and (f['balance_amount'] or 0) > 0]

            analysis = {
                "fees": fees,
                "recent_payments": recent_payments,
                "summary": {
                    "total_fees": total_fees,
                    "total_paid": total_paid,
                    "total_due": total_due,
                    "payment_percentage": round((total_paid / total_fees) * 100, 1) if total_fees > 0 else 0
                },
                "overdue": {
                    "count": len(overdue_fees),
                    "amount": sum(f['balance_amount'] for f in overdue_fees),
                    "fee_types": [f['fee_type'] for f in overdue_fees]
                },
                "status": "overdue" if overdue_fees else "pending" if total_due > 0 else "clear",
                "recommendation": ""
            }

            if overdue_fees:
                analysis["recommendation"] = f"URGENT: {len(overdue_fees)} fee(s) overdue totaling ₹{analysis['overdue']['amount']:,.2f}. Send reminder immediately."
            elif total_due > 0:
                analysis["recommendation"] = f"PENDING: ₹{total_due:,.2f} fees pending. Send payment reminder before due date."
            else:
                analysis["recommendation"] = "All fees cleared. No action needed."

            return json.dumps(analysis, default=str)
    except Exception as e:
        return f"Error fetching fee status: {str(e)}"


def get_class_analytics(class_id: str) -> str:
    """
    USE THIS TOOL FOR: Comprehensive class-level analytics and insights.

    PURPOSE: Provides overall class performance, attendance, fees, and identifies students needing attention.

    WHEN TO USE:
    - "How is Class X performing?"
    - "Class analytics/report for..."
    - "Show class statistics"
    - When comparing classes or generating reports

    RETURNS: JSON with class stats, top/bottom performers, attendance trends, fee collection status.
    """
    try:
        with engine.connect() as connection:
            # Get class info
            class_info_query = text(f"""
                SELECT c.name, c.grade_level, c.academic_year, s.name as school_name
                FROM classes c
                JOIN schools s ON c.school_id = s.id
                WHERE c.id = '{class_id}'
            """)
            class_info = connection.execute(class_info_query).fetchone()

            # Get student count
            student_query = text(f"SELECT COUNT(*) FROM students WHERE current_class_id = '{class_id}'")
            student_count = connection.execute(student_query).scalar()

            # Get average attendance (last 30 days)
            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            attendance_query = text(f"""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE s.current_class_id = '{class_id}'
                AND a.attendance_date >= '{thirty_days_ago}'
            """)
            att_result = connection.execute(attendance_query).fetchone()
            avg_attendance = round((att_result[1] / att_result[0]) * 100, 1) if att_result[0] and att_result[0] > 0 else 0

            # Get top 10 performers
            top_performers_query = text(f"""
                SELECT
                    s.id, s.first_name, s.last_name, s.roll_number,
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_percentage
                FROM students s
                JOIN marks m ON s.id = m.student_id
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                WHERE s.current_class_id = '{class_id}'
                GROUP BY s.id, s.first_name, s.last_name, s.roll_number
                ORDER BY avg_percentage DESC
                LIMIT 10
            """)
            top_performers = [dict(zip(['id', 'first_name', 'last_name', 'roll_number', 'avg_percentage'], row))
                           for row in connection.execute(top_performers_query)]

            # Get bottom 5 performers (need attention)
            bottom_performers_query = text(f"""
                SELECT
                    s.id, s.first_name, s.last_name, s.roll_number,
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_percentage
                FROM students s
                JOIN marks m ON s.id = m.student_id
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                WHERE s.current_class_id = '{class_id}'
                GROUP BY s.id, s.first_name, s.last_name, s.roll_number
                HAVING AVG((m.marks_obtained / es.max_marks) * 100) < 50
                ORDER BY avg_percentage ASC
                LIMIT 5
            """)
            bottom_performers = [dict(zip(['id', 'first_name', 'last_name', 'roll_number', 'avg_percentage'], row))
                               for row in connection.execute(bottom_performers_query)]

            # Get class average, highest, lowest marks
            marks_stats_query = text(f"""
                SELECT
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as class_average,
                    ROUND(MAX((m.marks_obtained / es.max_marks) * 100), 1) as highest,
                    ROUND(MIN((m.marks_obtained / es.max_marks) * 100), 1) as lowest
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN students s ON m.student_id = s.id
                WHERE s.current_class_id = '{class_id}'
            """)
            marks_stats = connection.execute(marks_stats_query).fetchone()

            # Get subject-wise class performance
            subject_performance_query = text(f"""
                SELECT
                    sub.name as subject,
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_percentage,
                    COUNT(DISTINCT m.student_id) as students_appeared
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN subjects sub ON es.subject_id = sub.id
                JOIN students s ON m.student_id = s.id
                WHERE s.current_class_id = '{class_id}'
                GROUP BY sub.name
                ORDER BY avg_percentage DESC
            """)
            subject_performance = [dict(zip(['subject', 'avg_percentage', 'students_appeared'], row))
                                 for row in connection.execute(subject_performance_query)]

            # Get fee collection status
            fee_query = text(f"""
                SELECT
                    SUM(sf.total_amount) as total,
                    SUM(sf.paid_amount) as collected,
                    SUM(sf.balance_amount) as pending,
                    COUNT(CASE WHEN sf.status = 'Overdue' THEN 1 END) as overdue_count
                FROM student_fees sf
                JOIN students s ON sf.student_id = s.id
                WHERE s.current_class_id = '{class_id}'
            """)
            fee_result = connection.execute(fee_query).fetchone()
            fee_collection_rate = round((fee_result[1] / fee_result[0]) * 100, 1) if fee_result[0] else 0

            # Students with low attendance
            low_attendance_query = text(f"""
                SELECT s.id, s.first_name, s.last_name, s.roll_number,
                    ROUND(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as attendance_pct
                FROM students s
                LEFT JOIN attendance a ON s.id = a.student_id AND a.attendance_date >= '{thirty_days_ago}'
                WHERE s.current_class_id = '{class_id}'
                GROUP BY s.id, s.first_name, s.last_name, s.roll_number
                HAVING COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) < 75
                ORDER BY attendance_pct ASC
                LIMIT 5
            """)
            low_attendance = [dict(zip(['id', 'first_name', 'last_name', 'roll_number', 'attendance_pct'], row))
                            for row in connection.execute(low_attendance_query)]

            analysis = {
                "class_info": {
                    "name": class_info[0] if class_info else "Unknown",
                    "grade_level": class_info[1] if class_info else None,
                    "academic_year": class_info[2] if class_info else None,
                    "school": class_info[3] if class_info else None
                },
                "student_count": student_count,
                "attendance": {
                    "average_percentage": avg_attendance,
                    "status": "good" if avg_attendance >= 85 else "needs_attention" if avg_attendance >= 75 else "critical",
                    "students_with_low_attendance": low_attendance
                },
                "academics": {
                    "class_average": float(marks_stats[0] or 0) if marks_stats else 0,
                    "highest_score": float(marks_stats[1] or 0) if marks_stats else 0,
                    "lowest_score": float(marks_stats[2] or 0) if marks_stats else 0,
                    "top_10_performers": top_performers,
                    "need_attention": bottom_performers,
                    "subject_performance": subject_performance
                },
                "fees": {
                    "total_amount": float(fee_result[0] or 0) if fee_result else 0,
                    "collected": float(fee_result[1] or 0) if fee_result else 0,
                    "pending": float(fee_result[2] or 0) if fee_result else 0,
                    "collection_rate": fee_collection_rate,
                    "overdue_students": fee_result[3] if fee_result else 0
                },
                "recommendations": []
            }

            # Generate recommendations
            if avg_attendance < 80:
                analysis["recommendations"].append(f"Class attendance ({avg_attendance}%) needs improvement. Address absenteeism.")
            if marks_stats and marks_stats[0] and float(marks_stats[0]) < 50:
                analysis["recommendations"].append(f"Class average ({marks_stats[0]}%) is concerning. Review teaching methods.")
            if fee_collection_rate < 80:
                analysis["recommendations"].append(f"Fee collection at {fee_collection_rate}%. Follow up with pending payments.")
            if bottom_performers:
                analysis["recommendations"].append(f"{len(bottom_performers)} students scoring below 50% need academic support.")

            return json.dumps(analysis, default=float)
    except Exception as e:
        return f"Error analyzing class: {str(e)}"


def get_academic_report(class_id: str = None, school_id: str = None, exam_id: str = None) -> str:
    """
    USE THIS TOOL FOR: Comprehensive academic reports with rankings and statistics.

    PURPOSE: Generates detailed academic report with top performers, class statistics, subject analysis.

    WHEN TO USE:
    - "Generate academic report for..."
    - "Show exam results for..."
    - "Who are the top students?"
    - "Class rankings for..."
    - When preparing for PTM or academic reviews

    RETURNS: JSON with top 10 students, subject-wise stats, pass/fail counts, grade distribution.
    """
    try:
        with engine.connect() as connection:
            # Build filter conditions
            filters = []
            if class_id:
                filters.append(f"s.current_class_id = '{class_id}'")
            if school_id:
                filters.append(f"s.school_id = '{school_id}'")
            if exam_id:
                filters.append(f"es.exam_id = '{exam_id}'")

            where_clause = " AND ".join(filters) if filters else "1=1"

            # Get top 10 overall performers
            top_students_query = text(f"""
                SELECT
                    s.id, s.first_name, s.last_name, s.admission_number, s.roll_number,
                    c.name as class_name,
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as percentage,
                    SUM(m.marks_obtained) as total_obtained,
                    SUM(es.max_marks) as total_max
                FROM students s
                JOIN marks m ON s.id = m.student_id
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN classes c ON s.current_class_id = c.id
                WHERE {where_clause}
                GROUP BY s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name
                ORDER BY percentage DESC
                LIMIT 10
            """)
            top_students = [dict(zip(['id', 'first_name', 'last_name', 'admission_number', 'roll_number', 'class_name', 'percentage', 'total_obtained', 'total_max'], row))
                          for row in connection.execute(top_students_query)]

            # Get subject-wise statistics
            subject_stats_query = text(f"""
                SELECT
                    sub.name as subject,
                    COUNT(DISTINCT m.student_id) as students,
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_percentage,
                    ROUND(MAX((m.marks_obtained / es.max_marks) * 100), 1) as highest,
                    ROUND(MIN((m.marks_obtained / es.max_marks) * 100), 1) as lowest,
                    SUM(CASE WHEN (m.marks_obtained / es.max_marks) * 100 >= 40 THEN 1 ELSE 0 END) as passed,
                    SUM(CASE WHEN (m.marks_obtained / es.max_marks) * 100 < 40 THEN 1 ELSE 0 END) as failed
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN subjects sub ON es.subject_id = sub.id
                JOIN students s ON m.student_id = s.id
                WHERE {where_clause}
                GROUP BY sub.name
                ORDER BY avg_percentage DESC
            """)
            subject_stats = [dict(zip(['subject', 'students', 'avg_percentage', 'highest', 'lowest', 'passed', 'failed'], row))
                           for row in connection.execute(subject_stats_query)]

            # Get grade distribution
            grade_dist_query = text(f"""
                SELECT
                    CASE
                        WHEN (m.marks_obtained / es.max_marks) * 100 >= 90 THEN 'A+'
                        WHEN (m.marks_obtained / es.max_marks) * 100 >= 80 THEN 'A'
                        WHEN (m.marks_obtained / es.max_marks) * 100 >= 70 THEN 'B'
                        WHEN (m.marks_obtained / es.max_marks) * 100 >= 60 THEN 'C'
                        WHEN (m.marks_obtained / es.max_marks) * 100 >= 50 THEN 'D'
                        WHEN (m.marks_obtained / es.max_marks) * 100 >= 40 THEN 'E'
                        ELSE 'F'
                    END as grade,
                    COUNT(*) as count
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN students s ON m.student_id = s.id
                WHERE {where_clause}
                GROUP BY grade
                ORDER BY grade
            """)
            grade_dist = {row[0]: row[1] for row in connection.execute(grade_dist_query)}

            # Overall statistics
            overall_query = text(f"""
                SELECT
                    COUNT(DISTINCT m.student_id) as total_students,
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as overall_average,
                    COUNT(DISTINCT CASE WHEN (m.marks_obtained / es.max_marks) * 100 >= 40 THEN m.student_id END) as students_passed
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN students s ON m.student_id = s.id
                WHERE {where_clause}
            """)
            overall = connection.execute(overall_query).fetchone()

            report = {
                "summary": {
                    "total_students": overall[0] if overall else 0,
                    "overall_average": float(overall[1] or 0) if overall else 0,
                    "students_passed": overall[2] if overall else 0,
                    "pass_percentage": round((overall[2] / overall[0]) * 100, 1) if overall and overall[0] else 0
                },
                "top_10_performers": top_students,
                "subject_analysis": subject_stats,
                "grade_distribution": grade_dist,
                "insights": []
            }

            # Generate insights
            if report["summary"]["pass_percentage"] < 70:
                report["insights"].append(f"Pass rate ({report['summary']['pass_percentage']}%) is below expected. Review curriculum coverage.")

            weak_subjects = [s for s in subject_stats if float(s['avg_percentage']) < 50]
            if weak_subjects:
                report["insights"].append(f"Subjects needing attention: {', '.join([s['subject'] for s in weak_subjects])}")

            strong_subjects = [s for s in subject_stats if float(s['avg_percentage']) >= 80]
            if strong_subjects:
                report["insights"].append(f"Strong subjects: {', '.join([s['subject'] for s in strong_subjects])}")

            return json.dumps(report, default=float)
    except Exception as e:
        return f"Error generating academic report: {str(e)}"


def get_timetable(class_id: str = None, teacher_id: str = None, school_id: str = None, day_of_week: int = None) -> str:
    """
    USE THIS TOOL FOR: Fetching timetable/schedule information.

    PURPOSE: Gets class schedules, teacher schedules, or school-wide timetables.

    WHEN TO USE:
    - "What is the timetable for Class X?"
    - "Show my schedule for Monday"
    - "What classes does [teacher] have today?"
    - "School timetable"
    - When planning or checking schedules

    PARAMETERS:
    - class_id: Filter by specific class
    - teacher_id: Filter by teacher
    - school_id: Filter by school
    - day_of_week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

    RETURNS: JSON with timetable entries grouped by day with subject, teacher, time, room details.
    """
    try:
        with engine.connect() as connection:
            filters = ["t.is_active = true"]
            if class_id:
                filters.append(f"t.class_id = '{class_id}'")
            if teacher_id:
                filters.append(f"t.teacher_id = '{teacher_id}'")
            if school_id:
                filters.append(f"t.school_id = '{school_id}'")
            if day_of_week is not None:
                filters.append(f"t.day_of_week = {day_of_week}")

            where_clause = " AND ".join(filters)

            query = text(f"""
                SELECT
                    t.id, t.day_of_week, t.start_time, t.end_time, t.room_number,
                    c.name as class_name, c.grade_level,
                    sec.name as section_name,
                    sub.name as subject_name,
                    st.first_name as teacher_first_name, st.last_name as teacher_last_name
                FROM timetable t
                JOIN classes c ON t.class_id = c.id
                JOIN subjects sub ON t.subject_id = sub.id
                LEFT JOIN sections sec ON t.section_id = sec.id
                LEFT JOIN staff st ON t.teacher_id = st.id
                WHERE {where_clause}
                ORDER BY t.day_of_week, t.start_time
            """)
            result = connection.execute(query)
            rows = [dict(zip(result.keys(), row)) for row in result]

            # Group by day
            days = {0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"}
            grouped = {}
            for row in rows:
                day = days.get(row['day_of_week'], 'Unknown')
                if day not in grouped:
                    grouped[day] = []
                grouped[day].append({
                    "id": str(row['id']),
                    "time": f"{row['start_time']} - {row['end_time']}",
                    "start_time": str(row['start_time']),
                    "end_time": str(row['end_time']),
                    "subject": row['subject_name'],
                    "class": row['class_name'],
                    "section": row['section_name'],
                    "teacher": f"{row['teacher_first_name']} {row['teacher_last_name']}" if row['teacher_first_name'] else "Not Assigned",
                    "room": row['room_number']
                })

            return json.dumps({
                "total_periods": len(rows),
                "schedule": grouped
            }, default=str)
    except Exception as e:
        return f"Error fetching timetable: {str(e)}"


def get_holidays(school_id: str, month: int = None, year: int = None) -> str:
    """
    USE THIS TOOL FOR: Getting holiday and event calendar information.

    PURPOSE: Retrieves school holidays, events, and special days.

    WHEN TO USE:
    - "What are the upcoming holidays?"
    - "Show holiday calendar"
    - "Is there a holiday on [date]?"
    - "School events this month"
    - When planning academic activities

    RETURNS: JSON with holiday list, categorized by type, with dates and descriptions.
    """
    try:
        with engine.connect() as connection:
            filters = [f"school_id = '{school_id}'"]

            if month and year:
                filters.append(f"EXTRACT(MONTH FROM holiday_date) = {month}")
                filters.append(f"EXTRACT(YEAR FROM holiday_date) = {year}")
            elif year:
                filters.append(f"EXTRACT(YEAR FROM holiday_date) = {year}")
            else:
                # Default: upcoming holidays in next 90 days
                filters.append(f"holiday_date >= CURRENT_DATE")
                filters.append(f"holiday_date <= CURRENT_DATE + INTERVAL '90 days'")

            where_clause = " AND ".join(filters)

            query = text(f"""
                SELECT
                    id, name, description, holiday_date, holiday_type, is_recurring
                FROM holidays
                WHERE {where_clause}
                ORDER BY holiday_date
            """)
            result = connection.execute(query)
            holidays = [dict(zip(result.keys(), row)) for row in result]

            # Group by type
            by_type = {}
            for h in holidays:
                htype = h['holiday_type']
                if htype not in by_type:
                    by_type[htype] = []
                by_type[htype].append({
                    "name": h['name'],
                    "date": str(h['holiday_date']),
                    "description": h['description'],
                    "recurring": h['is_recurring']
                })

            return json.dumps({
                "total_holidays": len(holidays),
                "holidays": holidays,
                "by_type": by_type
            }, default=str)
    except Exception as e:
        return f"Error fetching holidays: {str(e)}"


def get_certificate_requests(school_id: str = None, student_id: str = None, status: str = None) -> str:
    """
    USE THIS TOOL FOR: Viewing certificate request status and history.

    PURPOSE: Gets certificate requests (Bonafide, Character, TC, etc.) with their status.

    WHEN TO USE:
    - "Show pending certificate requests"
    - "Has [student] requested any certificates?"
    - "Certificate request status"
    - When managing certificate approvals

    RETURNS: JSON with request list, status, student details, and processing info.
    """
    try:
        with engine.connect() as connection:
            filters = []
            if school_id:
                filters.append(f"s.school_id = '{school_id}'")
            if student_id:
                filters.append(f"cr.student_id = '{student_id}'")
            if status:
                filters.append(f"cr.status = '{status}'")

            where_clause = " AND ".join(filters) if filters else "1=1"

            query = text(f"""
                SELECT
                    cr.id, cr.certificate_type, cr.purpose, cr.status,
                    cr.remarks, cr.created_at, cr.processed_at,
                    s.first_name, s.last_name, s.admission_number,
                    c.name as class_name,
                    st.first_name as processor_first, st.last_name as processor_last
                FROM certificate_requests cr
                JOIN students s ON cr.student_id = s.id
                LEFT JOIN classes c ON s.current_class_id = c.id
                LEFT JOIN staff st ON cr.processed_by = st.id
                WHERE {where_clause}
                ORDER BY cr.created_at DESC
                LIMIT 50
            """)
            result = connection.execute(query)
            requests = [dict(zip(result.keys(), row)) for row in result]

            # Count by status
            status_counts = {}
            for r in requests:
                s = r['status']
                status_counts[s] = status_counts.get(s, 0) + 1

            return json.dumps({
                "total": len(requests),
                "status_counts": status_counts,
                "requests": [{
                    "id": str(r['id']),
                    "student": f"{r['first_name']} {r['last_name']}",
                    "admission_number": r['admission_number'],
                    "class": r['class_name'],
                    "certificate_type": r['certificate_type'],
                    "purpose": r['purpose'],
                    "status": r['status'],
                    "remarks": r['remarks'],
                    "requested_on": str(r['created_at']),
                    "processed_on": str(r['processed_at']) if r['processed_at'] else None,
                    "processed_by": f"{r['processor_first']} {r['processor_last']}" if r['processor_first'] else None
                } for r in requests]
            }, default=str)
    except Exception as e:
        return f"Error fetching certificate requests: {str(e)}"


def send_notification(school_id: str, title: str, message: str, notification_type: str, target_audience: str, sent_by: str, class_id: str = None) -> str:
    """
    USE THIS TOOL FOR: Sending notifications and announcements.

    PURPOSE: Creates and sends notifications to students, parents, teachers, or all.

    WHEN TO USE:
    - "Send notification to..."
    - "Announce..."
    - "Notify parents about..."
    - "Send reminder for..."

    PARAMETERS:
    - notification_type: 'Announcement', 'Fee', 'Exam', 'Attendance', 'Other'
    - target_audience: 'All', 'Students', 'Parents', 'Teachers', 'Staff'
    - class_id: Optional - to target specific class

    RETURNS: Success/failure with notification ID.
    """
    try:
        with engine.begin() as connection:
            query = text(f"""
                INSERT INTO notifications (school_id, title, message, notification_type, target_audience, sent_by, class_id, created_at)
                VALUES ('{school_id}', '{title}', '{message}', '{notification_type}', '{target_audience}', '{sent_by}', {f"'{class_id}'" if class_id else 'NULL'}, NOW())
                RETURNING id
            """)
            result = connection.execute(query)
            notification_id = result.fetchone()[0]
            return json.dumps({"success": True, "notification_id": str(notification_id), "message": f"Notification sent successfully to {target_audience}"})
    except Exception as e:
        return json.dumps({"success": False, "error": str(e)})


def identify_at_risk_students(school_id: str, class_id: str = None) -> str:
    """
    USE THIS TOOL FOR: Finding students who need immediate attention.

    PURPOSE: Identifies students at risk based on attendance, academics, and fee defaults.

    WHEN TO USE:
    - "Which students need attention?"
    - "At-risk students report"
    - "Students with problems"
    - "Who is struggling?"
    - When planning interventions or parent meetings

    RETURNS: JSON with prioritized list of at-risk students, risk factors, and recommended actions.
    """
    try:
        with engine.connect() as connection:
            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

            class_filter = f"AND s.current_class_id = '{class_id}'" if class_id else ""

            query = text(f"""
                SELECT
                    s.id,
                    s.first_name,
                    s.last_name,
                    s.admission_number,
                    s.roll_number,
                    c.name as class_name,
                    (SELECT ROUND(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1)
                     FROM attendance a WHERE a.student_id = s.id AND a.attendance_date >= '{thirty_days_ago}') as attendance_pct,
                    (SELECT ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1)
                     FROM marks m JOIN exam_schedule es ON m.exam_schedule_id = es.id
                     WHERE m.student_id = s.id) as avg_marks,
                    (SELECT SUM(sf.balance_amount) FROM student_fees sf WHERE sf.student_id = s.id AND sf.balance_amount > 0) as pending_fees,
                    (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'Absent' AND a.attendance_date >= '{thirty_days_ago}') as recent_absences
                FROM students s
                LEFT JOIN classes c ON s.current_class_id = c.id
                WHERE s.school_id = '{school_id}' {class_filter}
            """)
            result = connection.execute(query)
            students = [dict(zip(result.keys(), row)) for row in result]

            at_risk = []
            for student in students:
                risk_factors = []
                risk_score = 0

                att_pct = student['attendance_pct'] or 100
                if att_pct < 75:
                    risk_factors.append(f"Critical attendance: {att_pct}%")
                    risk_score += 4
                elif att_pct < 85:
                    risk_factors.append(f"Low attendance: {att_pct}%")
                    risk_score += 2

                avg_marks = student['avg_marks'] or 50
                if avg_marks < 35:
                    risk_factors.append(f"Failing grades: {avg_marks}%")
                    risk_score += 4
                elif avg_marks < 50:
                    risk_factors.append(f"Poor academics: {avg_marks}%")
                    risk_score += 2

                pending_fees = student['pending_fees'] or 0
                if pending_fees > 20000:
                    risk_factors.append(f"High fee dues: ₹{pending_fees:,.0f}")
                    risk_score += 3
                elif pending_fees > 10000:
                    risk_factors.append(f"Pending fees: ₹{pending_fees:,.0f}")
                    risk_score += 1

                recent_absences = student['recent_absences'] or 0
                if recent_absences > 10:
                    risk_factors.append(f"Frequent absences: {recent_absences} in last 30 days")
                    risk_score += 2

                if risk_score >= 2:
                    priority = "CRITICAL" if risk_score >= 7 else "HIGH" if risk_score >= 5 else "MEDIUM" if risk_score >= 3 else "LOW"
                    at_risk.append({
                        "student_id": str(student['id']),
                        "name": f"{student['first_name']} {student['last_name']}",
                        "admission_number": student['admission_number'],
                        "roll_number": student['roll_number'],
                        "class": student['class_name'],
                        "risk_score": risk_score,
                        "risk_factors": risk_factors,
                        "priority": priority,
                        "recommended_action": "Immediate parent meeting" if priority in ["CRITICAL", "HIGH"] else "Send warning notice"
                    })

            at_risk.sort(key=lambda x: x['risk_score'], reverse=True)

            return json.dumps({
                "total_at_risk": len(at_risk),
                "by_priority": {
                    "critical": len([s for s in at_risk if s['priority'] == 'CRITICAL']),
                    "high": len([s for s in at_risk if s['priority'] == 'HIGH']),
                    "medium": len([s for s in at_risk if s['priority'] == 'MEDIUM']),
                    "low": len([s for s in at_risk if s['priority'] == 'LOW'])
                },
                "students": at_risk[:25]  # Top 25 at-risk students
            })
    except Exception as e:
        return f"Error identifying at-risk students: {str(e)}"


# =============================================
# AGENT INSTRUCTIONS
# =============================================

def get_common_instructions(user_id: str, role: str) -> list:
    """Generate common instructions shared across all roles."""
    schema_text = json.dumps(DATABASE_SCHEMA, indent=2)

    return [
        "You are 'SchoolBot', a helpful, professional, and friendly school management assistant connected to a PostgreSQL database.",
        f"CURRENT USER: Role='{role}', UserID='{user_id}'",

        "=" * 50,
        "### CRITICAL: MULTI-PART QUERY HANDLING",
        "=" * 50,
        """
IMPORTANT: When a user asks a question with multiple parts (containing 'and', 'also', 'as well as', commas, or multiple questions):
1. IDENTIFY all parts of the question
2. ADDRESS EACH PART separately and completely
3. DO NOT skip or ignore any part
4. Structure your response with clear sections for each part

Example: "Show me attendance AND marks for student X"
- First, get attendance data
- Then, get marks data
- Present BOTH in your response

Example: "How many students are there and what is the fee collection?"
- Answer student count
- Answer fee collection
- Include both in response

NEVER respond to just one part when multiple are asked!
""",

        "=" * 50,
        "### DATABASE SCHEMA MAP",
        "=" * 50,

        "**1. IDENTITY & PEOPLE:**",
        "   - `users`: Root authentication table (id, email, role: admin/principal/teacher/student/parent)",
        "   - `students`: Student profiles (user_id links to users, current_class_id, section_id, admission_number, roll_number)",
        "   - `staff`: Teacher/staff profiles (user_id links to users, school_id, designation, subject_specialization)",
        "   - `parents`: Parent profiles (user_id links to users)",
        "   - `student_parents`: Links students to parents (student_id, parent_id, is_primary_contact)",

        "**2. SCHOOL STRUCTURE:**",
        "   - `schools`: School info (id, name, school_code, principal_id, board: CBSE/State/ICSE/Other)",
        "   - `classes`: Grade levels (school_id, name, grade_level, academic_year)",
        "   - `sections`: Class divisions (class_id, name, class_teacher_id)",
        "   - `subjects`: Academic subjects (school_id, name, code)",
        "   - `class_subjects`: Links subjects to classes with teachers (class_id, subject_id, teacher_id)",

        "**3. EXAMINATIONS & RESULTS:**",
        "   - `exams`: Exam definitions (school_id, name, exam_type, academic_year, start_date, end_date)",
        "   - `exam_schedule`: Specific exam timings (exam_id, class_id, subject_id, exam_date, max_marks, min_passing_marks)",
        "   - `marks`: Student scores (exam_schedule_id, student_id, marks_obtained, is_absent)",
        "   - `report_cards`: Final grades (student_id, exam_id, percentage, grade, rank)",

        "**4. ATTENDANCE:**",
        "   - `attendance`: Daily attendance (student_id, attendance_date, status: Present/Absent/Late/Holiday)",
        "   - `leave_requests`: Leave applications (student_id, from_date, to_date, status: Pending/Approved/Rejected)",

        "**5. FEES & FINANCE:**",
        "   - `fee_structures`: Fee definitions (school_id, class_id, fee_type: Tuition/Exam/Library/Transport/Other, amount)",
        "   - `student_fees`: Assigned fees (student_id, fee_structure_id, total_amount, paid_amount, balance_amount, status: Pending/Paid/Overdue/Partial)",
        "   - `fee_payments`: Payment records (student_fee_id, amount, payment_method: UPI/Card/Cash/NetBanking/Cheque, receipt_number)",

        "**6. TIMETABLE & SCHEDULING:**",
        "   - `timetable`: Class schedules (school_id, class_id, section_id, subject_id, teacher_id, day_of_week: 0-6, start_time, end_time, room_number)",
        "   - `period_definitions`: Standard periods (school_id, period_number, period_name, start_time, end_time, is_break)",
        "   - `holidays`: School holidays (school_id, name, holiday_date, holiday_type: Holiday/Event/Exam/Half-Day/Vacation)",

        "**7. CERTIFICATES & TRANSFERS:**",
        "   - `certificates`: Issued certificates (student_id, certificate_type: TC/Character/Bonafide/Other, certificate_number, issue_date)",
        "   - `certificate_requests`: Certificate applications (student_id, certificate_type, purpose, status: Pending/Approved/Rejected/Generated)",
        "   - `transfer_requests`: TC requests (student_id, from_school_id, status, tc_number)",

        "**8. COMMUNICATION:**",
        "   - `notifications`: Announcements (school_id, title, message, notification_type, target_audience: All/Students/Parents/Teachers/Staff)",
        "   - `notification_recipients`: Read tracking (notification_id, user_id, is_read)",
        "   - `assignments`: Homework (class_id, subject_id, teacher_id, title, due_date)",

        "**9. SKILLS & ACHIEVEMENTS:**",
        "   - `student_skills`: Student abilities (student_id, skill_name, proficiency_level: Beginner/Intermediate/Advanced)",
        "   - `competitions`: Competition records (student_id, competition_name, level: School/District/State/National/International, position)",
        "   - `skill_categories`: Skill types (name, description)",

        schema_text,

        "=" * 50,
        "### TOOL USAGE GUIDE",
        "=" * 50,
        """
CHOOSE THE RIGHT TOOL:

1. **run_sql_query** - For ANY data retrieval
   - Use for: "Show me...", "List...", "How many...", "Who...", "What..."
   - Returns: JSON data from SELECT queries

2. **execute_write_query** - For data modifications (if permitted)
   - Use for: "Add...", "Update...", "Mark...", "Change..."
   - Always verify data exists first with run_sql_query

3. **get_table_schema** - When unsure about columns
   - Use for: Unknown column names, query errors

4. **get_attendance_analysis** - For attendance insights
   - Use for: "How is attendance?", "Attendance report"
   - Provides: Stats, patterns, recommendations

5. **get_performance_insights** - For academic analysis
   - Use for: "Academic performance", "How are marks?"
   - Provides: Subject analysis, trends, class rank, recommendations

6. **get_fee_status** - For fee information
   - Use for: "Fee status", "Pending dues", "Payment history"
   - Provides: Breakdown, overdue info, payment history

7. **get_class_analytics** - For class-level reports
   - Use for: "Class performance", "Class report"
   - Provides: Top 10, attendance, fees, subject-wise stats

8. **get_academic_report** - For exam reports with rankings
   - Use for: "Academic report", "Exam results", "Top students"
   - Provides: Rankings, grade distribution, subject analysis

9. **get_timetable** - For schedule information
   - Use for: "Timetable", "Schedule", "What classes today?"
   - Provides: Day-wise schedule with teacher, room info

10. **get_holidays** - For holiday calendar
    - Use for: "Holidays", "Events", "School calendar"
    - Provides: Holiday list with dates and types

11. **get_certificate_requests** - For certificate status
    - Use for: "Certificate requests", "Pending certificates"
    - Provides: Request list with status

12. **identify_at_risk_students** - For intervention planning
    - Use for: "At-risk students", "Who needs help?"
    - Provides: Prioritized list with risk factors

13. **send_notification** - For announcements (if permitted)
    - Use for: "Send notification", "Announce"
""",

        "=" * 50,
        "### RESPONSE GUIDELINES",
        "=" * 50,
        """
1. **Be Comprehensive**:
   - For academic reports: Include TOP 10 students, class average, highest/lowest marks
   - For attendance: Include percentage, pattern, recent absences
   - For fees: Include breakdown, overdue amount, payment history

2. **Provide Rich Context**:
   - Don't just give numbers - explain what they mean
   - Include comparisons (vs class average, vs previous exams)
   - Add recommendations when relevant

3. **Format Nicely**:
   - Use tables for lists (students, marks, fees)
   - Use bullet points for summaries
   - Use headers for sections
   - Format currency with ₹ symbol
   - Format dates in readable format

4. **Be Proactive**:
   - If checking marks, also mention attendance if concerning
   - If checking fees, mention overdue items prominently
   - Suggest next steps when appropriate

5. **Handle Multiple Queries**:
   - Address ALL parts of compound questions
   - Use clear sections for each part
   - Summarize at the end if multiple topics covered
""",
    ]


def get_student_instructions(user_id: str) -> list:
    """Instructions specific to student role."""
    return [
        "### STUDENT ACCESS RULES:",
        f"1. First, get your student ID: `SELECT id FROM students WHERE user_id = '{user_id}'`",
        "2. You can ONLY view YOUR OWN data - always filter by your student_id",
        "3. You CANNOT modify any data (no INSERT/UPDATE permissions)",
        "",
        "**What you CAN access:**",
        "- Your attendance records and analysis",
        "- Your marks and performance insights",
        "- Your fee status and payment history",
        "- Your class timetable",
        "- School holidays and events",
        "- Your certificates and requests",
        "- Notifications meant for you",
        "- Your assignments and homework",
        "",
        "**Helpful responses:**",
        "- When asked about performance, also check upcoming exams",
        "- When asked about attendance, mention if there are concerns",
        "- Suggest improvement tips based on weak subjects",
    ]


def get_parent_instructions(user_id: str) -> list:
    """Instructions specific to parent role."""
    return [
        "### PARENT ACCESS RULES:",
        f"1. First, get your parent ID: `SELECT id FROM parents WHERE user_id = '{user_id}'`",
        "2. Then find your children: `SELECT student_id FROM student_parents WHERE parent_id = [your_parent_id]`",
        "3. You can ONLY view data for YOUR CHILDREN",
        "4. You CANNOT modify any data (no INSERT/UPDATE permissions)",
        "",
        "**What you CAN access:**",
        "- Your children's attendance and analysis",
        "- Your children's marks and performance",
        "- Fee status and payment history",
        "- Class timetables",
        "- School holidays and events",
        "- Leave request status",
        "- Certificate requests",
        "- School notifications",
        "",
        "**Helpful responses:**",
        "- If parent has multiple children, show data for ALL children",
        "- Highlight any concerning patterns (low attendance, failing grades)",
        "- Include recommendations for improvement",
        "- Mention upcoming dues or overdue fees prominently",
    ]


def get_teacher_instructions(user_id: str) -> list:
    """Instructions specific to teacher role."""
    return [
        "### TEACHER ACCESS RULES:",
        f"1. First, get your staff ID: `SELECT id, school_id FROM staff WHERE user_id = '{user_id}'`",
        "2. You oversee classes where you are class_teacher_id in sections",
        "3. You teach subjects where you are teacher_id in class_subjects",
        "4. You HAVE permission to INSERT and UPDATE data",
        "",
        "**What you CAN do:**",
        "- View students in your classes",
        "- Mark attendance (INSERT into attendance table)",
        "- Enter/update marks (INSERT/UPDATE marks table)",
        "- View class analytics and performance",
        "- Identify at-risk students",
        "- Send notifications to your classes",
        "- View and manage assignments",
        "- View timetable and schedules",
        "",
        "**Important for data entry:**",
        "- For attendance: Verify student_id exists, use correct date format",
        "- For marks: Verify exam_schedule_id and student_id exist",
        "- Always confirm successful operations",
        "",
        "**Helpful responses:**",
        "- When showing class data, include TOP 10 performers",
        "- Highlight students needing attention",
        "- Suggest interventions for at-risk students",
        "- NEVER delete or drop anything",
    ]


def get_admin_principal_instructions(user_id: str, role: str) -> list:
    """Instructions specific to principal and admin roles."""
    return [
        f"### {role.upper()} ACCESS RULES:",
        f"Your UserID: {user_id}",
        "1. You have READ access to ALL data across all schools (admin) or your school (principal)",
        "2. You HAVE permission to INSERT and UPDATE data",
        "3. You can send notifications to any audience",
        "",
        "**What you CAN do:**",
        "- View all students, staff, classes, marks, attendance",
        "- Generate comprehensive reports (academic, attendance, financial)",
        "- Mark attendance and enter marks",
        "- Identify at-risk students school-wide",
        "- Send mass notifications",
        "- View and manage all timetables",
        "- Process certificate requests",
        "- Manage holidays and events",
        "",
        "**For reports and analytics:**",
        "- Always include TOP 10 performers",
        "- Show class-wise comparisons",
        "- Include highest/lowest marks",
        "- Show grade distribution",
        "- Include fee collection statistics",
        "- Highlight areas needing attention",
        "",
        "**Important guidelines:**",
        "- NEVER drop tables or delete critical data",
        "- Verify data before bulk updates",
        "- Use aggregations (COUNT, AVG, SUM) for summaries",
        f"{'For admin: Filter by school_id when needed' if role == 'admin' else 'Filter by your school_id when relevant'}",
    ]


def get_role_instructions(user_id: str, role: str) -> list:
    """Combine common and role-specific instructions."""
    instructions = get_common_instructions(user_id, role)

    if role == 'student':
        instructions.extend(get_student_instructions(user_id))
    elif role == 'parent':
        instructions.extend(get_parent_instructions(user_id))
    elif role == 'teacher':
        instructions.extend(get_teacher_instructions(user_id))
    elif role in ['principal', 'admin']:
        instructions.extend(get_admin_principal_instructions(user_id, role))

    return instructions


# =============================================
# AGENT FACTORY
# =============================================

def get_agent_for_user(user_id: str, role: str):
    """Create an agent with appropriate tools based on user role."""

    # Base tools for all roles
    tools = [
        run_sql_query,
        get_table_schema,
        get_attendance_analysis,
        get_performance_insights,
        get_fee_status,
        get_timetable,
        get_holidays,
        get_certificate_requests
    ]

    # Additional tools for teachers, principals, and admins
    if role in ['teacher', 'principal', 'admin']:
        tools.extend([
            execute_write_query,
            get_class_analytics,
            get_academic_report,
            send_notification,
            identify_at_risk_students
        ])

    return Agent(
        # model=Gemini(id="gemini-2.5-flash-lite", api_key=os.getenv("GEMINI_API_KEY")),
        model=Groq(id="meta-llama/llama-4-scout-17b-16e-instruct", api_key=os.getenv("GROQ_API_KEY")),
        tools=tools,
        name=f"SchoolBot_{role}",
        instructions=get_role_instructions(user_id, role),
        markdown=True,
    )


# =============================================
# API ENDPOINTS
# =============================================

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        agent = get_agent_for_user(request.user_id, request.role)
        response = agent.run(request.message)
        bot_reply = response.content
        return {"reply": bot_reply}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/analyze-student")
async def analyze_student(student_id: str, analysis_type: str = "comprehensive"):
    """Provides comprehensive analysis for a student"""
    try:
        results = {}

        if analysis_type in ["comprehensive", "attendance"]:
            results["attendance"] = json.loads(get_attendance_analysis(student_id))

        if analysis_type in ["comprehensive", "performance"]:
            results["performance"] = json.loads(get_performance_insights(student_id))

        if analysis_type in ["comprehensive", "fees"]:
            results["fees"] = json.loads(get_fee_status(student_id))

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/class-analytics")
async def class_analytics(class_id: str):
    """Provides comprehensive analytics for a class"""
    try:
        return json.loads(get_class_analytics(class_id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/academic-report")
async def academic_report(class_id: str = None, school_id: str = None, exam_id: str = None):
    """Generates academic report with rankings"""
    try:
        return json.loads(get_academic_report(class_id, school_id, exam_id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/at-risk-students")
async def at_risk_students(school_id: str, class_id: str = None):
    """Identifies students at risk"""
    try:
        return json.loads(identify_at_risk_students(school_id, class_id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/timetable")
async def get_timetable_endpoint(school_id: str = None, class_id: str = None, teacher_id: str = None, day_of_week: int = None):
    """Gets timetable information"""
    try:
        return json.loads(get_timetable(class_id, teacher_id, school_id, day_of_week))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/holidays")
async def get_holidays_endpoint(school_id: str, month: int = None, year: int = None):
    """Gets holiday calendar"""
    try:
        return json.loads(get_holidays(school_id, month, year))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/notifications/send")
async def send_notification_endpoint(request: NotificationRequest):
    """Sends a notification to specified audience"""
    try:
        result = json.loads(send_notification(
            request.school_id,
            request.title,
            request.message,
            request.notification_type,
            request.target_audience,
            request.sent_by,
            request.class_id
        ))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-ingestion/csv")
async def ingest_csv_data(
    file: UploadFile = File(...),
    data_type: str = Form(...),
    school_id: str = Form(...)
):
    """
    Ingests data from CSV file.
    Supported data_types: attendance, marks, students, fees
    """
    try:
        content = await file.read()
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        records = list(reader)

        if not records:
            return {"success": False, "message": "No records found in CSV"}

        inserted = 0
        errors = []

        with engine.begin() as connection:
            for i, record in enumerate(records):
                try:
                    if data_type == "attendance":
                        student_query = text(f"SELECT id FROM students WHERE admission_number = '{record['student_admission_number']}' AND school_id = '{school_id}'")
                        student = connection.execute(student_query).fetchone()
                        if student:
                            insert_query = text(f"""
                                INSERT INTO attendance (student_id, attendance_date, status, created_at)
                                VALUES ('{student[0]}', '{record['date']}', '{record['status']}', NOW())
                                ON CONFLICT (student_id, attendance_date) DO UPDATE SET status = '{record['status']}'
                            """)
                            connection.execute(insert_query)
                            inserted += 1
                        else:
                            errors.append(f"Row {i+1}: Student {record['student_admission_number']} not found")

                    elif data_type == "students":
                        class_query = text(f"SELECT id FROM classes WHERE name = '{record['class_name']}' AND school_id = '{school_id}'")
                        class_result = connection.execute(class_query).fetchone()

                        insert_query = text(f"""
                            INSERT INTO students (school_id, admission_number, first_name, last_name, date_of_birth, gender, current_class_id, created_at, updated_at)
                            VALUES ('{school_id}', '{record['admission_number']}', '{record['first_name']}', '{record['last_name']}',
                                    '{record.get('date_of_birth', '')}', '{record.get('gender', '')}',
                                    {f"'{class_result[0]}'" if class_result else 'NULL'}, NOW(), NOW())
                            ON CONFLICT (admission_number) DO NOTHING
                        """)
                        connection.execute(insert_query)
                        inserted += 1

                    elif data_type == "fees":
                        student_query = text(f"SELECT id FROM students WHERE admission_number = '{record['student_admission_number']}' AND school_id = '{school_id}'")
                        student = connection.execute(student_query).fetchone()
                        if student:
                            fee_query = text(f"""
                                SELECT sf.id FROM student_fees sf
                                JOIN fee_structures fs ON sf.fee_structure_id = fs.id
                                WHERE sf.student_id = '{student[0]}' AND fs.fee_type = '{record.get('fee_type', 'Tuition')}'
                            """)
                            student_fee = connection.execute(fee_query).fetchone()

                            if student_fee:
                                receipt_num = f"RCP{datetime.now().strftime('%Y%m%d%H%M%S')}{i}"
                                insert_query = text(f"""
                                    INSERT INTO fee_payments (student_fee_id, amount, payment_date, payment_method, payment_status, receipt_number, created_at)
                                    VALUES ('{student_fee[0]}', {record['amount']}, '{record['payment_date']}', '{record.get('payment_method', 'Cash')}', 'Success', '{receipt_num}', NOW())
                                """)
                                connection.execute(insert_query)

                                update_query = text(f"""
                                    UPDATE student_fees
                                    SET paid_amount = paid_amount + {record['amount']},
                                        balance_amount = balance_amount - {record['amount']},
                                        status = CASE WHEN balance_amount - {record['amount']} <= 0 THEN 'Paid' ELSE 'Partial' END,
                                        updated_at = NOW()
                                    WHERE id = '{student_fee[0]}'
                                """)
                                connection.execute(update_query)
                                inserted += 1
                            else:
                                errors.append(f"Row {i+1}: No fee structure found for student {record['student_admission_number']}")
                        else:
                            errors.append(f"Row {i+1}: Student {record['student_admission_number']} not found")

                except Exception as row_error:
                    errors.append(f"Row {i+1}: {str(row_error)}")

        return {
            "success": True,
            "inserted": inserted,
            "total_records": len(records),
            "errors": errors[:10] if errors else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-ingestion/image")
async def ingest_image_data(
    file: UploadFile = File(...),
    data_type: str = Form(...),
    school_id: str = Form(...)
):
    """
    Extracts data from image using Gemini Vision and ingests it.
    Supports scanned attendance sheets, mark sheets, fee receipts.
    """
    try:
        content = await file.read()

        model = genai.GenerativeModel('gemini-2.0-flash')

        prompt = f"""
        Analyze this image which contains {data_type} data from a school.
        Extract all the data and return it as a JSON array.

        For attendance data, extract:
        - student_name or admission_number
        - date
        - status (Present/Absent/Late)

        For marks data, extract:
        - student_name or admission_number
        - subject
        - marks_obtained
        - max_marks

        For fee payments, extract:
        - student_name or admission_number
        - amount
        - payment_date
        - receipt_number (if visible)

        Return ONLY a valid JSON array, no other text.
        """

        import PIL.Image
        image = PIL.Image.open(io.BytesIO(content))
        response = model.generate_content([prompt, image])

        extracted_text = response.text.strip()
        if extracted_text.startswith("```json"):
            extracted_text = extracted_text[7:]
        if extracted_text.endswith("```"):
            extracted_text = extracted_text[:-3]

        try:
            extracted_data = json.loads(extracted_text)
        except json.JSONDecodeError:
            return {
                "success": False,
                "message": "Could not parse extracted data",
                "raw_extraction": extracted_text[:500]
            }

        processed = 0
        errors = []

        with engine.begin() as connection:
            for i, record in enumerate(extracted_data):
                try:
                    student_identifier = record.get('admission_number') or record.get('student_name', '')
                    student_query = text(f"""
                        SELECT id FROM students
                        WHERE (admission_number = '{student_identifier}'
                               OR CONCAT(first_name, ' ', last_name) ILIKE '%{student_identifier}%')
                        AND school_id = '{school_id}'
                        LIMIT 1
                    """)
                    student = connection.execute(student_query).fetchone()

                    if not student:
                        errors.append(f"Record {i+1}: Student '{student_identifier}' not found")
                        continue

                    if data_type == "attendance":
                        insert_query = text(f"""
                            INSERT INTO attendance (student_id, attendance_date, status, created_at)
                            VALUES ('{student[0]}', '{record['date']}', '{record['status']}', NOW())
                            ON CONFLICT (student_id, attendance_date) DO UPDATE SET status = '{record['status']}'
                        """)
                        connection.execute(insert_query)
                        processed += 1

                    elif data_type == "marks":
                        subject_query = text(f"""
                            SELECT es.id FROM exam_schedule es
                            JOIN subjects s ON es.subject_id = s.id
                            WHERE s.name ILIKE '%{record.get('subject', '')}%'
                            AND es.class_id = (SELECT current_class_id FROM students WHERE id = '{student[0]}')
                            ORDER BY es.exam_date DESC
                            LIMIT 1
                        """)
                        schedule = connection.execute(subject_query).fetchone()

                        if schedule:
                            insert_query = text(f"""
                                INSERT INTO marks (exam_schedule_id, student_id, marks_obtained, is_absent, created_at)
                                VALUES ('{schedule[0]}', '{student[0]}', {record.get('marks_obtained', 0)}, false, NOW())
                                ON CONFLICT (exam_schedule_id, student_id) DO UPDATE SET marks_obtained = {record.get('marks_obtained', 0)}
                            """)
                            connection.execute(insert_query)
                            processed += 1
                        else:
                            errors.append(f"Record {i+1}: Exam schedule for subject '{record.get('subject')}' not found")

                except Exception as row_error:
                    errors.append(f"Record {i+1}: {str(row_error)}")

        return {
            "success": True,
            "extracted_records": len(extracted_data),
            "processed": processed,
            "errors": errors[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    current_user_id = "b5942695-71d9-4148-9d89-3dd397b65736"
    current_role = "admin"

    student_agent = get_agent_for_user(current_user_id, current_role)
    student_agent.print_response("Show me table of all teachers")    

    # import uvicorn
    # uvicorn.run(app, host="0.0.0.0", port=8000)