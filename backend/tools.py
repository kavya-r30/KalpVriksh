import json
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timedelta, date, time
from sqlalchemy import text, inspect
from .database import engine


class CustomJSONEncoder(json.JSONEncoder):
    """Handle UUID, datetime, date, time, Decimal serialization."""
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, time):
            return obj.strftime('%H:%M:%S')
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, bytes):
            return obj.decode('utf-8')
        return super().default(obj)


def to_json(data) -> str:
    """Serialize data to JSON with custom encoding."""
    return json.dumps(data, cls=CustomJSONEncoder)


def run_sql_query(query: str) -> str:
    """
    Execute SELECT queries to retrieve data from the database.

    Args:
        query: SQL SELECT query string

    Returns:
        JSON array of results or error message

    Use when: User asks to show, list, count, find, or view any data
    Example triggers: "Show me...", "List all...", "How many...", "Who is...", "What are..."
    """
    try:
        forbidden = ["DROP", "DELETE", "TRUNCATE", "UPDATE", "INSERT", "ALTER"]
        if any(cmd in query.upper() for cmd in forbidden):
            return "ERROR: Only SELECT queries allowed. Use execute_write_query for modifications."

        with engine.connect() as connection:
            result = connection.execute(text(query))
            if result.returns_rows:
                columns = result.keys()
                rows = [dict(zip(columns, row)) for row in result]
                if not rows:
                    return "No records found matching your criteria."
                return to_json(rows)
            return "Query executed successfully."
    except Exception as e:
        return f"DATABASE ERROR: {str(e)}"


def execute_write_query(query: str) -> str:
    """
    Execute INSERT/UPDATE queries to modify database records.

    Args:
        query: SQL INSERT or UPDATE query string

    Returns:
        Success message with rows affected or error message

    Use when: User wants to add, create, update, mark, or change data
    Example triggers: "Add a...", "Create new...", "Update...", "Mark as...", "Change..."
    Important: Always verify data exists first using run_sql_query before updating
    """
    try:
        forbidden = ["DROP", "TRUNCATE", "ALTER", "GRANT", "REVOKE"]
        if any(cmd in query.upper() for cmd in forbidden):
            return "ERROR: Destructive operations (DROP/TRUNCATE/ALTER) are forbidden."

        with engine.begin() as connection:
            result = connection.execute(text(query))
            return f"Success. Rows affected: {result.rowcount}"
    except Exception as e:
        return f"WRITE ERROR: {str(e)}"


def get_table_schema(table_name: str) -> str:
    """
    Get table structure including column names and data types.

    Args:
        table_name: Name of the database table (e.g., 'students', 'marks')

    Returns:
        List of (column_name, data_type) pairs

    Use when: Unsure about column names or data types before writing a query
    """
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        schema_info = [(col['name'], str(col['type'])) for col in columns]
        return str(schema_info)
    except Exception as e:
        return f"Error: {e}"


def get_attendance_analysis(student_id: str, days: int = 30) -> str:
    """
    Analyze student attendance patterns with insights and recommendations.

    Args:
        student_id: UUID of the student
        days: Number of days to analyze (default: 30)

    Returns:
        JSON with attendance stats, percentage, status (good/warning/critical),
        recent absences, and recommendations

    Use when: User asks about attendance, regularity, or absenteeism
    Example triggers: "How is attendance?", "Attendance report", "Is student regular?"
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
                FROM attendance WHERE student_id = '{student_id}' AND attendance_date >= '{period_start}'
            """)
            row = connection.execute(query).fetchone()

            if not row or row[0] == 0:
                return to_json({"status": "no_data", "message": "No attendance records found"})

            total, present, absent, late, holidays = row[0], row[1] or 0, row[2] or 0, row[3] or 0, row[4] or 0
            working_days = total - holidays
            percentage = round((present / working_days) * 100, 1) if working_days > 0 else 0

            pattern_query = text(f"""
                SELECT attendance_date FROM attendance
                WHERE student_id = '{student_id}' AND status = 'Absent' AND attendance_date >= '{period_start}'
                ORDER BY attendance_date DESC LIMIT 5
            """)
            recent_absences = [str(r[0]) for r in connection.execute(pattern_query)]

            status = "critical" if percentage < 75 else "warning" if percentage < 85 else "good"
            recommendation = (
                f"CRITICAL: {percentage}% attendance. Parent meeting required." if percentage < 75
                else f"WARNING: {percentage}% attendance. Monitor closely." if percentage < 85
                else f"GOOD: {percentage}% attendance."
            )

            return to_json({
                "period_days": days, "working_days": working_days,
                "present_days": present, "absent_days": absent, "late_days": late,
                "attendance_percentage": percentage, "recent_absences": recent_absences,
                "status": status, "recommendation": recommendation
            })
    except Exception as e:
        return f"Error: {str(e)}"


def get_performance_insights(student_id: str, include_class_comparison: bool = True) -> str:
    """
    Comprehensive academic performance analysis with subject-wise breakdown.

    Args:
        student_id: UUID of the student
        include_class_comparison: Whether to include class rank (default: True)

    Returns:
        JSON with subject analysis (avg, highest, trend), overall average,
        strong/weak subjects, class rank, and recommendations

    Use when: User asks about marks, grades, academic performance, or progress
    Example triggers: "Academic performance", "Show marks", "Which subjects need work?"
    """
    try:
        with engine.connect() as connection:
            query = text(f"""
                SELECT s.name as subject_name, e.name as exam_name, e.exam_type,
                    es.max_marks, m.marks_obtained,
                    ROUND((m.marks_obtained / es.max_marks) * 100, 1) as percentage
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN subjects s ON es.subject_id = s.id
                JOIN exams e ON es.exam_id = e.id
                WHERE m.student_id = '{student_id}'
                ORDER BY e.start_date DESC, s.name
            """)
            rows = [dict(zip(connection.execute(query).keys(), row)) for row in connection.execute(query)]

            if not rows:
                return to_json({"status": "no_data", "message": "No marks records found"})

            class_result = connection.execute(text(f"SELECT current_class_id FROM students WHERE id = '{student_id}'")).fetchone()
            class_id = class_result[0] if class_result else None

            subject_stats = {}
            for row in rows:
                subject = row['subject_name']
                if subject not in subject_stats:
                    subject_stats[subject] = {"percentages": [], "exams": []}
                subject_stats[subject]['percentages'].append(float(row['percentage'] or 0))
                subject_stats[subject]['exams'].append({
                    "exam": row['exam_name'], "percentage": float(row['percentage'] or 0)
                })

            analysis = {
                "subjects": [], "overall_average": 0,
                "strong_subjects": [], "weak_subjects": [],
                "class_rank": None, "recommendations": []
            }

            total_avg = 0
            for subject, stats in subject_stats.items():
                avg_pct = sum(stats['percentages']) / len(stats['percentages'])
                total_avg += avg_pct

                trend = "stable"
                if len(stats['percentages']) >= 2:
                    if stats['percentages'][0] > stats['percentages'][-1] + 5:
                        trend = "improving"
                    elif stats['percentages'][0] < stats['percentages'][-1] - 5:
                        trend = "declining"

                analysis["subjects"].append({
                    "name": subject, "average_percentage": round(avg_pct, 1),
                    "highest_score": round(max(stats['percentages']), 1),
                    "trend": trend, "recent_exams": stats['exams'][:3]
                })

                if avg_pct >= 80:
                    analysis["strong_subjects"].append(subject)
                elif avg_pct < 50:
                    analysis["weak_subjects"].append(subject)

            analysis["overall_average"] = round(total_avg / len(subject_stats), 1) if subject_stats else 0

            if include_class_comparison and class_id:
                rank_query = text(f"""
                    WITH student_avgs AS (
                        SELECT m.student_id, ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_pct
                        FROM marks m JOIN exam_schedule es ON m.exam_schedule_id = es.id
                        JOIN students s ON m.student_id = s.id
                        WHERE s.current_class_id = '{class_id}' GROUP BY m.student_id
                    )
                    SELECT COUNT(*) + 1 as rank FROM student_avgs
                    WHERE avg_pct > (SELECT avg_pct FROM student_avgs WHERE student_id = '{student_id}')
                """)
                rank_result = connection.execute(rank_query).fetchone()
                if rank_result:
                    analysis["class_rank"] = int(rank_result[0])

            if analysis["weak_subjects"]:
                analysis["recommendations"].append(f"Focus on: {', '.join(analysis['weak_subjects'])}")
            if analysis["overall_average"] < 50:
                analysis["recommendations"].append("Urgent intervention needed.")
            elif analysis["overall_average"] >= 85:
                analysis["recommendations"].append("Excellent performance.")

            return to_json(analysis)
    except Exception as e:
        return f"Error: {str(e)}"


def get_fee_status(student_id: str) -> str:
    """
    Complete fee status including payment history and pending dues.

    Args:
        student_id: UUID of the student

    Returns:
        JSON with fee breakdown by type, recent payments, summary totals,
        overdue info, status (clear/pending/overdue), and recommendations

    Use when: User asks about fees, payments, dues, or financial status
    Example triggers: "Fee status", "Pending fees", "Payment history", "Has fees been paid?"
    """
    try:
        with engine.connect() as connection:
            query = text(f"""
                SELECT sf.id, fs.fee_type, sf.total_amount, sf.paid_amount,
                    sf.balance_amount, sf.status, sf.due_date, sf.academic_year
                FROM student_fees sf
                JOIN fee_structures fs ON sf.fee_structure_id = fs.id
                WHERE sf.student_id = '{student_id}' ORDER BY sf.due_date
            """)
            fees = [dict(zip(connection.execute(query).keys(), row)) for row in connection.execute(query)]

            payment_query = text(f"""
                SELECT fp.amount, fp.payment_date, fp.payment_method, fp.receipt_number, fs.fee_type
                FROM fee_payments fp
                JOIN student_fees sf ON fp.student_fee_id = sf.id
                JOIN fee_structures fs ON sf.fee_structure_id = fs.id
                WHERE sf.student_id = '{student_id}'
                ORDER BY fp.payment_date DESC LIMIT 5
            """)
            recent_payments = [dict(zip(connection.execute(payment_query).keys(), row)) for row in connection.execute(payment_query)]

            total_due = sum(float(f['balance_amount'] or 0) for f in fees)
            total_paid = sum(float(f['paid_amount'] or 0) for f in fees)
            total_fees = sum(float(f['total_amount'] or 0) for f in fees)
            overdue_fees = [f for f in fees if f['due_date'] and datetime.strptime(str(f['due_date']), '%Y-%m-%d') < datetime.now() and float(f['balance_amount'] or 0) > 0]

            status = "overdue" if overdue_fees else "pending" if total_due > 0 else "clear"
            recommendation = (
                f"URGENT: {len(overdue_fees)} fee(s) overdue." if overdue_fees
                else f"PENDING: Rs.{total_due:,.2f} fees pending." if total_due > 0
                else "All fees cleared."
            )

            return to_json({
                "fees": fees, "recent_payments": recent_payments,
                "summary": {
                    "total_fees": total_fees, "total_paid": total_paid,
                    "total_due": total_due,
                    "payment_percentage": round((total_paid / total_fees) * 100, 1) if total_fees > 0 else 0
                },
                "overdue": {"count": len(overdue_fees), "amount": sum(float(f['balance_amount']) for f in overdue_fees)},
                "status": status, "recommendation": recommendation
            })
    except Exception as e:
        return f"Error: {str(e)}"


def get_class_analytics(class_id: str) -> str:
    """
    Comprehensive class-level analytics including academics, attendance, and fees.

    Args:
        class_id: UUID of the class

    Returns:
        JSON with class info, student count, attendance average,
        academic stats (class avg, highest, lowest), top 10 performers,
        and fee collection status

    Use when: User asks about class performance, statistics, or overall report
    Example triggers: "Class performance", "Class report", "How is Class X doing?"
    """
    try:
        with engine.connect() as connection:
            class_info = connection.execute(text(f"""
                SELECT c.name, c.grade_level, c.academic_year, s.name as school_name
                FROM classes c JOIN schools s ON c.school_id = s.id WHERE c.id = '{class_id}'
            """)).fetchone()

            student_count = connection.execute(text(f"SELECT COUNT(*) FROM students WHERE current_class_id = '{class_id}'")).scalar()

            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

            att_result = connection.execute(text(f"""
                SELECT COUNT(*), SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)
                FROM attendance a JOIN students s ON a.student_id = s.id
                WHERE s.current_class_id = '{class_id}' AND a.attendance_date >= '{thirty_days_ago}'
            """)).fetchone()
            avg_attendance = round((att_result[1] / att_result[0]) * 100, 1) if att_result[0] and att_result[0] > 0 else 0

            top_performers = [dict(zip(['id', 'first_name', 'last_name', 'roll_number', 'avg_percentage'], row)) for row in connection.execute(text(f"""
                SELECT s.id, s.first_name, s.last_name, s.roll_number,
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_percentage
                FROM students s JOIN marks m ON s.id = m.student_id
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                WHERE s.current_class_id = '{class_id}'
                GROUP BY s.id, s.first_name, s.last_name, s.roll_number
                ORDER BY avg_percentage DESC LIMIT 10
            """))]

            marks_stats = connection.execute(text(f"""
                SELECT ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1),
                    ROUND(MAX((m.marks_obtained / es.max_marks) * 100), 1),
                    ROUND(MIN((m.marks_obtained / es.max_marks) * 100), 1)
                FROM marks m JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN students s ON m.student_id = s.id WHERE s.current_class_id = '{class_id}'
            """)).fetchone()

            fee_result = connection.execute(text(f"""
                SELECT SUM(sf.total_amount), SUM(sf.paid_amount), SUM(sf.balance_amount)
                FROM student_fees sf JOIN students s ON sf.student_id = s.id
                WHERE s.current_class_id = '{class_id}'
            """)).fetchone()
            fee_collection_rate = round((float(fee_result[1] or 0) / float(fee_result[0] or 1)) * 100, 1) if fee_result[0] else 0

            return to_json({
                "class_info": {
                    "name": class_info[0] if class_info else "Unknown",
                    "grade_level": class_info[1] if class_info else None,
                    "school": class_info[3] if class_info else None
                },
                "student_count": student_count,
                "attendance": {"average_percentage": avg_attendance},
                "academics": {
                    "class_average": float(marks_stats[0] or 0) if marks_stats else 0,
                    "highest_score": float(marks_stats[1] or 0) if marks_stats else 0,
                    "lowest_score": float(marks_stats[2] or 0) if marks_stats else 0,
                    "top_10_performers": top_performers
                },
                "fees": {
                    "total_amount": float(fee_result[0] or 0) if fee_result else 0,
                    "collected": float(fee_result[1] or 0) if fee_result else 0,
                    "pending": float(fee_result[2] or 0) if fee_result else 0,
                    "collection_rate": fee_collection_rate
                }
            })
    except Exception as e:
        return f"Error: {str(e)}"


def get_academic_report(class_id: str = None, school_id: str = None, exam_id: str = None) -> str:
    """
    Generate academic report with rankings and subject-wise analysis.

    Args:
        class_id: Filter by class UUID (optional)
        school_id: Filter by school UUID (optional)
        exam_id: Filter by exam UUID (optional)

    Returns:
        JSON with summary (total students, overall avg), top 10 performers,
        and subject-wise stats (avg, highest, lowest, pass/fail count)

    Use when: User asks for academic reports, exam results, rankings, or top students
    Example triggers: "Academic report", "Exam results", "Top students", "Class rankings"
    """
    try:
        with engine.connect() as connection:
            filters = []
            if class_id:
                filters.append(f"s.current_class_id = '{class_id}'")
            if school_id:
                filters.append(f"s.school_id = '{school_id}'")
            if exam_id:
                filters.append(f"es.exam_id = '{exam_id}'")
            where_clause = " AND ".join(filters) if filters else "1=1"

            top_students = [dict(zip(['id', 'first_name', 'last_name', 'admission_number', 'class_name', 'percentage'], row)) for row in connection.execute(text(f"""
                SELECT s.id, s.first_name, s.last_name, s.admission_number, c.name,
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as percentage
                FROM students s JOIN marks m ON s.id = m.student_id
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN classes c ON s.current_class_id = c.id
                WHERE {where_clause}
                GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name
                ORDER BY percentage DESC LIMIT 10
            """))]

            subject_stats = [dict(zip(['subject', 'students', 'avg_percentage', 'highest', 'lowest', 'passed', 'failed'], row)) for row in connection.execute(text(f"""
                SELECT sub.name, COUNT(DISTINCT m.student_id),
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_percentage,
                    ROUND(MAX((m.marks_obtained / es.max_marks) * 100), 1),
                    ROUND(MIN((m.marks_obtained / es.max_marks) * 100), 1),
                    SUM(CASE WHEN (m.marks_obtained / es.max_marks) * 100 >= 40 THEN 1 ELSE 0 END),
                    SUM(CASE WHEN (m.marks_obtained / es.max_marks) * 100 < 40 THEN 1 ELSE 0 END)
                FROM marks m JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN subjects sub ON es.subject_id = sub.id
                JOIN students s ON m.student_id = s.id
                WHERE {where_clause} GROUP BY sub.name ORDER BY avg_percentage DESC
            """))]

            overall = connection.execute(text(f"""
                SELECT COUNT(DISTINCT m.student_id), ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1)
                FROM marks m JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN students s ON m.student_id = s.id WHERE {where_clause}
            """)).fetchone()

            return to_json({
                "summary": {
                    "total_students": overall[0] if overall else 0,
                    "overall_average": float(overall[1] or 0) if overall else 0
                },
                "top_10_performers": top_students,
                "subject_analysis": subject_stats
            })
    except Exception as e:
        return f"Error: {str(e)}"


def get_timetable(class_id: str = None, teacher_id: str = None, school_id: str = None, day_of_week: int = None) -> str:
    """
    Fetch timetable/schedule information.

    Args:
        class_id: Filter by class UUID (optional)
        teacher_id: Filter by teacher UUID (optional)
        school_id: Filter by school UUID (optional)
        day_of_week: Filter by day (0=Sunday, 1=Monday, ... 6=Saturday) (optional)

    Returns:
        JSON with total periods and schedule grouped by day,
        including time, subject, class, teacher, and room

    Use when: User asks about schedules, timetables, or class timings
    Example triggers: "Timetable", "Schedule", "What classes today?", "When is Math?"
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

            rows = [dict(zip(['day_of_week', 'start_time', 'end_time', 'class_name', 'subject_name', 'teacher_first', 'teacher_last', 'room_number'], row)) for row in connection.execute(text(f"""
                SELECT t.day_of_week, t.start_time, t.end_time, c.name, sub.name,
                    st.first_name, st.last_name, t.room_number
                FROM timetable t
                JOIN classes c ON t.class_id = c.id
                JOIN subjects sub ON t.subject_id = sub.id
                LEFT JOIN staff st ON t.teacher_id = st.id
                WHERE {where_clause} ORDER BY t.day_of_week, t.start_time
            """))]

            days = {0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"}
            grouped = {}
            for row in rows:
                day = days.get(row['day_of_week'], 'Unknown')
                if day not in grouped:
                    grouped[day] = []
                grouped[day].append({
                    "time": f"{row['start_time']} - {row['end_time']}",
                    "subject": row['subject_name'],
                    "class": row['class_name'],
                    "teacher": f"{row['teacher_first']} {row['teacher_last']}" if row['teacher_first'] else "Not Assigned",
                    "room": row['room_number']
                })

            return to_json({"total_periods": len(rows), "schedule": grouped})
    except Exception as e:
        return f"Error: {str(e)}"


def get_holidays(school_id: str, month: int = None, year: int = None) -> str:
    """
    Get holiday and event calendar for a school.

    Args:
        school_id: UUID of the school (required)
        month: Filter by month 1-12 (optional)
        year: Filter by year (optional)

    Returns:
        JSON with total count, holiday list with dates/types,
        and holidays grouped by type

    Use when: User asks about holidays, vacations, or school events
    Example triggers: "Holidays", "School events", "Is there a holiday on...?", "Vacation dates"
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
                filters.append("holiday_date >= CURRENT_DATE")
                filters.append("holiday_date <= CURRENT_DATE + INTERVAL '90 days'")
            where_clause = " AND ".join(filters)

            holidays = [dict(zip(['id', 'name', 'description', 'holiday_date', 'holiday_type'], row)) for row in connection.execute(text(f"""
                SELECT id, name, description, holiday_date, holiday_type
                FROM holidays WHERE {where_clause} ORDER BY holiday_date
            """))]

            by_type = {}
            for h in holidays:
                htype = h['holiday_type']
                if htype not in by_type:
                    by_type[htype] = []
                by_type[htype].append({"name": h['name'], "date": str(h['holiday_date'])})

            return to_json({"total_holidays": len(holidays), "holidays": holidays, "by_type": by_type})
    except Exception as e:
        return f"Error: {str(e)}"


def get_certificate_requests(school_id: str = None, student_id: str = None, status: str = None) -> str:
    """
    View certificate request status and history.

    Args:
        school_id: Filter by school UUID (optional)
        student_id: Filter by student UUID (optional)
        status: Filter by status - Pending/Approved/Rejected/Generated (optional)

    Returns:
        JSON with total count, status counts, and request list
        with student name, class, type, status, and dates

    Use when: User asks about certificate requests or their status
    Example triggers: "Pending certificates", "Certificate status", "TC requests"
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

            requests = [dict(zip(['id', 'certificate_type', 'purpose', 'status', 'created_at', 'first_name', 'last_name', 'class_name'], row)) for row in connection.execute(text(f"""
                SELECT cr.id, cr.certificate_type, cr.purpose, cr.status, cr.created_at,
                    s.first_name, s.last_name, c.name
                FROM certificate_requests cr
                JOIN students s ON cr.student_id = s.id
                LEFT JOIN classes c ON s.current_class_id = c.id
                WHERE {where_clause} ORDER BY cr.created_at DESC LIMIT 50
            """))]

            status_counts = {}
            for r in requests:
                s = r['status']
                status_counts[s] = status_counts.get(s, 0) + 1

            return to_json({
                "total": len(requests), "status_counts": status_counts,
                "requests": [{"id": str(r['id']), "student": f"{r['first_name']} {r['last_name']}",
                    "class": r['class_name'], "certificate_type": r['certificate_type'],
                    "status": r['status'], "requested_on": str(r['created_at'])} for r in requests]
            })
    except Exception as e:
        return f"Error: {str(e)}"


def send_notification(school_id: str, title: str, message: str, notification_type: str, target_audience: str, sent_by: str, class_id: str = None) -> str:
    """
    Send notification or announcement to specified audience.

    Args:
        school_id: UUID of the school (required)
        title: Notification title (required)
        message: Notification body text (required)
        notification_type: Type - Announcement/Fee/Exam/Attendance/Other (required)
        target_audience: Recipients - All/Students/Parents/Teachers/Staff (required)
        sent_by: UUID of sender (required)
        class_id: Target specific class UUID (optional)

    Returns:
        JSON with success status, notification ID, and confirmation message

    Use when: User wants to send announcements or notify specific groups
    Example triggers: "Send notification", "Announce", "Notify parents about..."
    """
    try:
        with engine.begin() as connection:
            result = connection.execute(text(f"""
                INSERT INTO notifications (school_id, title, message, notification_type, target_audience, sent_by, class_id, created_at)
                VALUES ('{school_id}', '{title}', '{message}', '{notification_type}', '{target_audience}', '{sent_by}', {f"'{class_id}'" if class_id else 'NULL'}, NOW())
                RETURNING id
            """))
            notification_id = result.fetchone()[0]
            return to_json({"success": True, "notification_id": str(notification_id), "message": f"Notification sent to {target_audience}"})
    except Exception as e:
        return to_json({"success": False, "error": str(e)})


def identify_at_risk_students(school_id: str, class_id: str = None) -> str:
    """
    Identify students needing immediate attention based on multiple risk factors.

    Args:
        school_id: UUID of the school (required)
        class_id: Filter by class UUID (optional)

    Returns:
        JSON with total at-risk count, breakdown by priority (CRITICAL/HIGH/MEDIUM),
        and list of students with risk factors and scores

    Risk factors considered:
        - Attendance below 75% (critical) or 85% (warning)
        - Academic average below 35% (failing) or 50% (poor)
        - Fee dues above Rs.20,000

    Use when: User asks about struggling students or needs intervention list
    Example triggers: "At-risk students", "Who needs help?", "Students with problems"
    """
    try:
        with engine.connect() as connection:
            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            class_filter = f"AND s.current_class_id = '{class_id}'" if class_id else ""

            students = [dict(zip(['id', 'first_name', 'last_name', 'admission_number', 'class_name', 'attendance_pct', 'avg_marks', 'pending_fees'], row)) for row in connection.execute(text(f"""
                SELECT s.id, s.first_name, s.last_name, s.admission_number, c.name,
                    (SELECT ROUND(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1)
                     FROM attendance a WHERE a.student_id = s.id AND a.attendance_date >= '{thirty_days_ago}'),
                    (SELECT ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1)
                     FROM marks m JOIN exam_schedule es ON m.exam_schedule_id = es.id WHERE m.student_id = s.id),
                    (SELECT SUM(sf.balance_amount) FROM student_fees sf WHERE sf.student_id = s.id AND sf.balance_amount > 0)
                FROM students s LEFT JOIN classes c ON s.current_class_id = c.id
                WHERE s.school_id = '{school_id}' {class_filter}
            """))]

            at_risk = []
            for student in students:
                risk_factors = []
                risk_score = 0

                att_pct = float(student['attendance_pct'] or 100)
                if att_pct < 75:
                    risk_factors.append(f"Critical attendance: {att_pct}%")
                    risk_score += 4
                elif att_pct < 85:
                    risk_factors.append(f"Low attendance: {att_pct}%")
                    risk_score += 2

                avg_marks = float(student['avg_marks'] or 50)
                if avg_marks < 35:
                    risk_factors.append(f"Failing grades: {avg_marks}%")
                    risk_score += 4
                elif avg_marks < 50:
                    risk_factors.append(f"Poor academics: {avg_marks}%")
                    risk_score += 2

                pending_fees = float(student['pending_fees'] or 0)
                if pending_fees > 20000:
                    risk_factors.append(f"High fee dues: Rs.{pending_fees:,.0f}")
                    risk_score += 3

                if risk_score >= 2:
                    priority = "CRITICAL" if risk_score >= 7 else "HIGH" if risk_score >= 5 else "MEDIUM"
                    at_risk.append({
                        "student_id": str(student['id']),
                        "name": f"{student['first_name']} {student['last_name']}",
                        "class": student['class_name'],
                        "risk_score": risk_score,
                        "risk_factors": risk_factors,
                        "priority": priority
                    })

            at_risk.sort(key=lambda x: x['risk_score'], reverse=True)
            return to_json({
                "total_at_risk": len(at_risk),
                "by_priority": {
                    "critical": len([s for s in at_risk if s['priority'] == 'CRITICAL']),
                    "high": len([s for s in at_risk if s['priority'] == 'HIGH']),
                    "medium": len([s for s in at_risk if s['priority'] == 'MEDIUM'])
                },
                "students": at_risk[:25]
            })
    except Exception as e:
        return f"Error: {str(e)}"
