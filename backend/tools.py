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


def validate_uuid(value) -> bool:
    if not isinstance(value, str):
        return False
    try:
        UUID(value)
        return True
    except (ValueError, TypeError):
        return False


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


def get_attendance_analysis(student_id: str = None, class_id: str = None, school_id: str = None, days: int = 30) -> str:
    """
    Analyze attendance patterns - individual student, class-wide, or school-wide.

    Args:
        student_id: UUID of the student (optional)
        class_id: UUID of the class - for class-wide analysis (optional)
        school_id: UUID of the school - for school-wide analysis (optional)
        days: Number of days to analyze (default: 30, optional)

    Returns:
        JSON with attendance stats, percentage, status (good/warning/critical),
        recent absences, and recommendations for student/class/school

    Use when: User asks about attendance, regularity, or absenteeism
    Example triggers: 
        - "How is attendance?" / "Attendance report" (individual)
        - "Class attendance" / "Attendance of Class 10A" (class-wide)
        - "School attendance summary" (school-wide)
    """
    if (student_id is not None and not validate_uuid(student_id)):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid student_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )
    if class_id is not None and not validate_uuid(class_id):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid class_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )
    if school_id is not None and not validate_uuid(school_id):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid school_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )
    
    def _rows_to_dicts(result) -> list[dict]:
        columns = list(result.keys())
        return [dict(zip(columns, row)) for row in result]
        
    try:
        with engine.connect() as connection:
            period_start = (datetime.now() - timedelta(days=days)).date()

            if student_id:
                row = connection.execute(
                    text("""
                        SELECT
                            COUNT(*) as total_days,
                            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
                            SUM(CASE WHEN status = 'Absent'  THEN 1 ELSE 0 END) as absent_days,
                            SUM(CASE WHEN status = 'Late'    THEN 1 ELSE 0 END) as late_days,
                            SUM(CASE WHEN status = 'Holiday' THEN 1 ELSE 0 END) as holidays
                        FROM attendance
                        WHERE student_id = :student_id
                          AND attendance_date >= :period_start
                    """),
                    {"student_id": student_id, "period_start": period_start}
                ).fetchone()

                if not row or row[0] == 0:
                    return to_json({"status": "no_data", "message": "No attendance records found"})

                total, present, absent, late, holidays = (
                    row[0], row[1] or 0, row[2] or 0, row[3] or 0, row[4] or 0
                )
                working_days = total - holidays
                percentage = round((present / working_days) * 100, 1) if working_days > 0 else 0

                recent_result = connection.execute(
                    text("""
                        SELECT attendance_date FROM attendance
                        WHERE student_id = :student_id
                          AND status = 'Absent'
                          AND attendance_date >= :period_start
                        ORDER BY attendance_date DESC LIMIT 5
                    """),
                    {"student_id": student_id, "period_start": period_start}
                )
                recent_absences = [str(r[0]) for r in recent_result]

                status = "critical" if percentage < 75 else "warning" if percentage < 85 else "good"
                recommendation = (
                    f"CRITICAL: {percentage}% attendance. Parent meeting required." if percentage < 75
                    else f"WARNING: {percentage}% attendance. Monitor closely."    if percentage < 85
                    else f"GOOD: {percentage}% attendance."
                )

                return to_json({
                    "query_type": "individual",
                    "period_days": days,
                    "working_days": working_days,
                    "present_days": present,
                    "absent_days": absent,
                    "late_days": late,
                    "attendance_percentage": percentage,
                    "recent_absences": recent_absences,
                    "status": status,
                    "recommendation": recommendation
                })

            elif class_id:
                students_result = connection.execute(
                    text("""
                        SELECT
                            s.id,
                            s.first_name,
                            s.last_name,
                            s.roll_number,
                            s.admission_number,
                            COUNT(a.id) as total_days,
                            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_days,
                            SUM(CASE WHEN a.status = 'Absent'  THEN 1 ELSE 0 END) as absent_days,
                            SUM(CASE WHEN a.status = 'Late'    THEN 1 ELSE 0 END) as late_days,
                            SUM(CASE WHEN a.status = 'Holiday' THEN 1 ELSE 0 END) as holidays
                        FROM students s
                        LEFT JOIN attendance a 
                            ON s.id = a.student_id 
                            AND a.attendance_date >= :period_start
                        WHERE s.current_class_id = :class_id
                        GROUP BY s.id, s.first_name, s.last_name, s.roll_number, s.admission_number
                        ORDER BY s.roll_number, s.last_name, s.first_name
                    """),
                    {"class_id": class_id, "period_start": period_start}
                )
                students = _rows_to_dicts(students_result)

                for student in students:
                    total = int(student['total_days'] or 0)
                    present = int(student['present_days'] or 0)
                    holidays = int(student['holidays'] or 0)
                    working_days = total - holidays

                    percentage = round((present / working_days) * 100, 1) if working_days > 0 else 0
                    student['working_days'] = working_days
                    student['attendance_percentage'] = percentage
                    student['status'] = (
                        "critical" if percentage < 75
                        else "warning" if percentage < 85
                        else "good"
                    )

                total_students = len(students)
                avg_percentage = (
                    round(sum(s['attendance_percentage'] for s in students) / total_students, 1)
                    if total_students > 0 else 0
                )
                critical_count = len([s for s in students if s['status'] == 'critical'])
                warning_count = len([s for s in students if s['status'] == 'warning'])
                good_count = len([s for s in students if s['status'] == 'good'])

                return to_json({
                    "query_type": "class",
                    "period_days": days,
                    "total_students": total_students,
                    "summary": {
                        "class_average_percentage": avg_percentage,
                        "students_critical": critical_count,
                        "students_warning": warning_count,
                        "students_good": good_count
                    },
                    "students": students
                })

            elif school_id:
                classes_result = connection.execute(
                    text("""
                        SELECT
                            c.id,
                            c.name AS class_name,
                            c.grade_level,
                            COUNT(DISTINCT s.id) as total_students,
                            COUNT(a.id) as total_records,
                            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_days,
                            SUM(CASE WHEN a.status = 'Absent'  THEN 1 ELSE 0 END) as absent_days,
                            SUM(CASE WHEN a.status = 'Late'    THEN 1 ELSE 0 END) as late_days,
                            SUM(CASE WHEN a.status = 'Holiday' THEN 1 ELSE 0 END) as holidays
                        FROM classes c
                        LEFT JOIN students s ON c.id = s.current_class_id
                        LEFT JOIN attendance a 
                            ON s.id = a.student_id 
                            AND a.attendance_date >= :period_start
                        WHERE c.school_id = :school_id
                        GROUP BY c.id, c.name, c.grade_level
                        ORDER BY c.grade_level, c.name
                    """),
                    {"school_id": school_id, "period_start": period_start}
                )
                classes = _rows_to_dicts(classes_result)

                for cls in classes:
                    total = int(cls['total_records'] or 0)
                    present = int(cls['present_days'] or 0)
                    holidays = int(cls['holidays'] or 0)
                    working_records = total - holidays

                    percentage = round((present / working_records) * 100, 1) if working_records > 0 else 0
                    cls['attendance_percentage'] = percentage
                    cls['status'] = (
                        "critical" if percentage < 75
                        else "warning" if percentage < 85
                        else "good"
                    )

                total_classes = len(classes)
                avg_percentage = (
                    round(sum(c['attendance_percentage'] for c in classes) / total_classes, 1)
                    if total_classes > 0 else 0
                )

                return to_json({
                    "query_type": "school",
                    "period_days": days,
                    "total_classes": total_classes,
                    "summary": {
                        "school_average_percentage": avg_percentage,
                        "classes_critical": len([c for c in classes if c['status'] == 'critical']),
                        "classes_warning": len([c for c in classes if c['status'] == 'warning']),
                        "classes_good": len([c for c in classes if c['status'] == 'good'])
                    },
                    "classes": classes
                })

            else:
                return to_json({
                    "error": "At least one of student_id, class_id, or school_id must be provided"
                })

    except Exception as e:
        return f"Error: {str(e)}"


# def get_attendance_analysis(student_id: str, days: int = 30) -> str:
#     """
#     Analyze student attendance patterns with insights and recommendations.

#     Args:
#         student_id: UUID of the student
#         days: Number of days to analyze (default: 30)

#     Returns:
#         JSON with attendance stats, percentage, status (good/warning/critical),
#         recent absences, and recommendations

#     Use when: User asks about attendance, regularity, or absenteeism
#     Example triggers: "How is attendance?", "Attendance report", "Is student regular?"
#     """

#     if(student_id is not None and not validate_uuid(student_id)):
#         import time
#         time.sleep(2)
#         raise ValueError(
#             "Invalid class_id. Must be UUID. "
#             "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
#         )
        
#     try:
#         with engine.connect() as connection:
#             period_start = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
#             query = text(f"""
#                 SELECT
#                     COUNT(*) as total_days,
#                     SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
#                     SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
#                     SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
#                     SUM(CASE WHEN status = 'Holiday' THEN 1 ELSE 0 END) as holidays
#                 FROM attendance WHERE student_id = '{student_id}' AND attendance_date >= '{period_start}'
#             """)
#             row = connection.execute(query).fetchone()

#             if not row or row[0] == 0:
#                 return to_json({"status": "no_data", "message": "No attendance records found"})

#             total, present, absent, late, holidays = row[0], row[1] or 0, row[2] or 0, row[3] or 0, row[4] or 0
#             working_days = total - holidays
#             percentage = round((present / working_days) * 100, 1) if working_days > 0 else 0

#             pattern_query = text(f"""
#                 SELECT attendance_date FROM attendance
#                 WHERE student_id = '{student_id}' AND status = 'Absent' AND attendance_date >= '{period_start}'
#                 ORDER BY attendance_date DESC LIMIT 5
#             """)
#             recent_absences = [str(r[0]) for r in connection.execute(pattern_query)]

#             status = "critical" if percentage < 75 else "warning" if percentage < 85 else "good"
#             recommendation = (
#                 f"CRITICAL: {percentage}% attendance. Parent meeting required." if percentage < 75
#                 else f"WARNING: {percentage}% attendance. Monitor closely." if percentage < 85
#                 else f"GOOD: {percentage}% attendance."
#             )

#             return to_json({
#                 "period_days": days, "working_days": working_days,
#                 "present_days": present, "absent_days": absent, "late_days": late,
#                 "attendance_percentage": percentage, "recent_absences": recent_absences,
#                 "status": status, "recommendation": recommendation
#             })
#     except Exception as e:
#         return f"Error: {str(e)}"


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

    if(student_id is not None and not validate_uuid(student_id)):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid class_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )

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
                    "name": subject,
                    "student_average": round(avg_pct, 1),
                    "student_highest": round(max(stats['percentages']), 1),
                    "trend": trend, "recent_exams": stats['exams'][:3]
                })

                if include_class_comparison and class_id:
                    class_subject_stats = connection.execute(
                        text(f"""
                            SELECT
                                ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) AS class_avg,
                                ROUND(MAX((m.marks_obtained / es.max_marks) * 100), 1) AS class_highest
                            FROM marks m
                            JOIN exam_schedule es ON m.exam_schedule_id = es.id
                            JOIN students s ON m.student_id = s.id
                            JOIN subjects subj ON es.subject_id = subj.id
                            WHERE s.current_class_id = '{class_id}'
                              AND subj.name = '{subject}'
                        """),
                    ).fetchone()
                    if class_subject_stats:
                        analysis["subjects"].append({
                            "class_average": float(class_subject_stats[0] or 0),
                            "class_highest": float(class_subject_stats[1] or 0)
                        })

                if avg_pct >= 80:
                    analysis["strong_subjects"].append(subject)
                elif avg_pct < 50:
                    analysis["weak_subjects"].append(subject)

            analysis["overall_average"] = round(total_avg / len(subject_stats), 1) if subject_stats else 0

            if include_class_comparison and class_id:
                class_overall_stats = connection.execute(
                    text("""
                        SELECT
                            ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) AS class_avg,
                            ROUND(MAX((m.marks_obtained / es.max_marks) * 100), 1) AS class_highest
                        FROM marks m
                        JOIN exam_schedule es ON m.exam_schedule_id = es.id
                        JOIN students s ON m.student_id = s.id
                        WHERE s.current_class_id = :class_id
                    """),
                    {"class_id": class_id}
                ).fetchone()

                if class_overall_stats:
                    analysis["class_statistics"] = {
                        "overall_class_average": float(class_overall_stats[0] or 0),
                        "overall_class_highest": float(class_overall_stats[1] or 0)
                    }

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

            if include_class_comparison and class_id and "overall_class_average" in analysis["class_statistics"]:
                class_avg = analysis["class_statistics"]["overall_class_average"]
                if analysis["overall_average"] > class_avg + 10:
                    analysis["recommendations"].append("Performing above class average.")
                elif analysis["overall_average"] < class_avg - 10:
                    analysis["recommendations"].append("Performing below class average.")

            return to_json(analysis)
    except Exception as e:
        return f"Error: {str(e)}"


def get_fee_status(student_id: str = None, school_id: str = None, class_id: str = None) -> str:
    """
    Get Complete Fee Status — individual student or aggregate by School/Class.

    Args:
        student_id: Filter by student UUID (optional)
        school_id: Filter by school UUID (optional)
        class_id: Filter by class UUID (optional)

    Returns:
        If student_id provided: JSON with individual student's fee breakdown,
            payment history, summary, overdue info, status, and recommendations
        If school_id/class_id provided: JSON with aggregate fee table showing
            all students in that scope with their totals, paid, balance, and status

    Use when: User asks about fees status, payments, dues, or financial status
    Example triggers: 
        - "Get Fee status" / "Pending fees" / "Payment history" (individual)
        - "Get Fee status for all Schools" / "Get Fee status of all students" (aggregate)
    """

    if ((class_id is not None and not validate_uuid(class_id)) or
        (school_id is not None and not validate_uuid(school_id)) or
        (student_id is not None and not validate_uuid(student_id))
    ):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid class_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )

    try:
        with engine.connect() as connection:

            def _rows_to_dicts(result) -> list[dict]:
                columns = list(result.keys())
                return [dict(zip(columns, row)) for row in result]
            
            def _to_date(value) -> date | None:
                if value is None:
                    return None
                if isinstance(value, datetime):
                    return value.date()
                if isinstance(value, date):
                    return value
                try:
                    return datetime.strptime(str(value), '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    return None

            # INDIVIDUAL STUDENT MODE
            if student_id:
                fees_result = connection.execute(
                    text("""
                        SELECT sf.id, fs.fee_type, sf.total_amount, sf.paid_amount,
                            sf.balance_amount, sf.status, sf.due_date, sf.academic_year
                        FROM student_fees sf
                        JOIN fee_structures fs ON sf.fee_structure_id = fs.id
                        WHERE sf.student_id = :student_id
                        ORDER BY sf.due_date
                    """),
                    {"student_id": student_id}
                )
                fees = _rows_to_dicts(fees_result)

                payments_result = connection.execute(
                    text("""
                        SELECT fp.amount, fp.payment_date, fp.payment_method,
                            fp.receipt_number, fs.fee_type
                        FROM fee_payments fp
                        JOIN student_fees sf    ON fp.student_fee_id    = sf.id
                        JOIN fee_structures fs  ON sf.fee_structure_id  = fs.id
                        WHERE sf.student_id = :student_id
                        ORDER BY fp.payment_date DESC LIMIT 5
                    """),
                    {"student_id": student_id}
                )
                recent_payments = _rows_to_dicts(payments_result)

                total_due  = sum(float(f['balance_amount'] or 0) for f in fees)
                total_paid = sum(float(f['paid_amount']     or 0) for f in fees)
                total_fees = sum(float(f['total_amount']    or 0) for f in fees)

                today = date.today()
                overdue_fees = [
                    f for f in fees
                    if _to_date(f['due_date']) is not None
                    and _to_date(f['due_date']) < today
                    and float(f['balance_amount'] or 0) > 0
                ]

                status = "overdue" if overdue_fees else "pending" if total_due > 0 else "clear"
                recommendation = (
                    f"URGENT: {len(overdue_fees)} fee(s) overdue."           if overdue_fees
                    else f"PENDING: Rs.{total_due:,.2f} fees pending."       if total_due > 0
                    else "All fees cleared."
                )

                return to_json({
                    "query_type": "individual",
                    "fees": fees,
                    "recent_payments": recent_payments,
                    "summary": {
                        "total_fees": total_fees,
                        "total_paid": total_paid,
                        "total_due": total_due,
                        "payment_percentage": (
                            round((total_paid / total_fees) * 100, 1) if total_fees > 0 else 0
                        )
                    },
                    "overdue": {
                        "count": len(overdue_fees),
                        "amount": sum(float(f['balance_amount']) for f in overdue_fees)
                    },
                    "status": status,
                    "recommendation": recommendation
                })

            # AGGREGATE MODE (school or class)
            else:
                conditions = []
                params = {}
                if school_id:
                    conditions.append("s.school_id = :school_id")
                    params["school_id"] = school_id
                if class_id:
                    conditions.append("s.current_class_id = :class_id")
                    params["class_id"] = class_id
                where_clause = " AND ".join(conditions) if conditions else "1=1"

                students_result = connection.execute(
                    text(f"""
                        SELECT
                            s.id,
                            s.first_name,
                            s.last_name,
                            s.admission_number,
                            c.name AS class_name,
                            sch.name AS school_name,
                            COALESCE(SUM(sf.total_amount), 0)   AS total_fees,
                            COALESCE(SUM(sf.paid_amount), 0)    AS total_paid,
                            COALESCE(SUM(sf.balance_amount), 0) AS total_due
                        FROM students s
                        JOIN schools sch ON s.school_id = sch.id
                        LEFT JOIN classes c ON s.current_class_id = c.id
                        LEFT JOIN student_fees sf ON s.id = sf.student_id
                        WHERE {where_clause}
                        GROUP BY s.id, s.first_name, s.last_name, s.admission_number,
                                 c.name, sch.name
                        ORDER BY sch.name, c.name, s.last_name, s.first_name
                    """),
                    params
                )
                students = _rows_to_dicts(students_result)

                # Compute status and payment percentage for each student
                today = date.today()
                for student in students:
                    total_f = float(student['total_fees'] or 0)
                    total_p = float(student['total_paid'] or 0)
                    total_d = float(student['total_due']  or 0)

                    student['payment_percentage'] = (
                        round((total_p / total_f) * 100, 1) if total_f > 0 else 0
                    )

                    # Check for overdue — need to query individual fees
                    overdue_check = connection.execute(
                        text("""
                            SELECT COUNT(*)
                            FROM student_fees
                            WHERE student_id = :student_id
                              AND balance_amount > 0
                              AND due_date < :today
                        """),
                        {"student_id": student['id'], "today": today}
                    ).scalar()

                    student['status'] = (
                        "overdue" if overdue_check > 0
                        else "pending" if total_d > 0
                        else "clear"
                    )

                # Overall summary
                grand_total_fees = sum(float(s['total_fees'] or 0) for s in students)
                grand_total_paid = sum(float(s['total_paid'] or 0) for s in students)
                grand_total_due  = sum(float(s['total_due']  or 0) for s in students)

                return to_json({
                    "query_type": "aggregate",
                    "total_students": len(students),
                    "students": students,
                    "summary": {
                        "total_fees": grand_total_fees,
                        "total_paid": grand_total_paid,
                        "total_due": grand_total_due,
                        "collection_percentage": (
                            round((grand_total_paid / grand_total_fees) * 100, 1)
                            if grand_total_fees > 0 else 0
                        ),
                        "students_clear": len([s for s in students if s['status'] == 'clear']),
                        "students_pending": len([s for s in students if s['status'] == 'pending']),
                        "students_overdue": len([s for s in students if s['status'] == 'overdue'])
                    }
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
    
    if(class_id is not None and not validate_uuid(class_id)):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid class_id. Must be UUID. "
            "Use run_sql_query to fetch ID first by select * from classes **WITHOUT WHERE CLAUSE** and use it to call the tool again (CRITICAL)."
        )

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
    Generate Academic report with rankings and subject-wise analysis.

    Args:
        class_id: Filter by class UUID (optional)
        school_id: Filter by school UUID (optional)
        exam_id: Filter by exam UUID (optional)

    Returns:
        JSON with summary (total students, overall avg), top 10 performers,
        subject-wise stats, and school-wise comparison stats.

    Use when: User asks for academic reports, exam results, rankings, or top students
    Example triggers: "Academic report", "Exam results", "Top students", "Class rankings"
    """
    
    if ((class_id is not None and not validate_uuid(class_id)) or
        (school_id is not None and not validate_uuid(school_id)) or
        (exam_id is not None and not validate_uuid(exam_id))
    ):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid class_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )

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
                FROM students s
                JOIN marks m ON s.id = m.student_id
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN classes c ON s.current_class_id = c.id
                WHERE {where_clause}
                GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name
                ORDER BY percentage DESC
                LIMIT 10
            """))]

            subject_stats = [dict(zip(['subject', 'students', 'avg_percentage', 'highest', 'lowest', 'passed', 'failed'], row)) for row in connection.execute(text(f"""
                SELECT sub.name,
                    COUNT(DISTINCT m.student_id),
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_percentage,
                    ROUND(MAX((m.marks_obtained / es.max_marks) * 100), 1),
                    ROUND(MIN((m.marks_obtained / es.max_marks) * 100), 1),
                    SUM(CASE WHEN (m.marks_obtained / es.max_marks) * 100 >= 40 THEN 1 ELSE 0 END),
                    SUM(CASE WHEN (m.marks_obtained / es.max_marks) * 100 < 40  THEN 1 ELSE 0 END)
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN subjects sub ON es.subject_id = sub.id
                JOIN students s ON m.student_id = s.id
                WHERE {where_clause}
                GROUP BY sub.name
                ORDER BY avg_percentage DESC
            """))]

            school_stats = [dict(zip([
                'school_name', 'school_code', 'total_students',
                'avg_percentage', 'highest', 'lowest', 'passed', 'failed'
            ], row)) for row in connection.execute(text(f"""
                SELECT sch.name,
                    sch.school_code,
                    COUNT(DISTINCT s.id),
                    ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1) as avg_percentage,
                    ROUND(MAX((m.marks_obtained / es.max_marks) * 100), 1),
                    ROUND(MIN((m.marks_obtained / es.max_marks) * 100), 1),
                    SUM(CASE WHEN (m.marks_obtained / es.max_marks) * 100 >= 40 THEN 1 ELSE 0 END),
                    SUM(CASE WHEN (m.marks_obtained / es.max_marks) * 100 < 40  THEN 1 ELSE 0 END)
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN students s ON m.student_id = s.id
                JOIN schools sch ON s.school_id = sch.id
                WHERE {where_clause}
                GROUP BY sch.id, sch.name, sch.school_code
                ORDER BY avg_percentage DESC
            """))]

            overall = connection.execute(text(f"""
                SELECT COUNT(DISTINCT m.student_id),
                       ROUND(AVG((m.marks_obtained / es.max_marks) * 100), 1)
                FROM marks m
                JOIN exam_schedule es ON m.exam_schedule_id = es.id
                JOIN students s ON m.student_id = s.id
                WHERE {where_clause}
            """)).fetchone()

            return to_json({
                "summary": {
                    "total_students": overall[0] if overall else 0,
                    "overall_average": float(overall[1] or 0) if overall else 0
                },
                "top_10_performers": top_students,
                "subject_analysis": subject_stats,
                "school_comparison": school_stats
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

    if ((class_id is not None and not validate_uuid(class_id)) or
        (school_id is not None and not validate_uuid(school_id)) or
        (teacher_id is not None and not validate_uuid(teacher_id))
    ):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid class_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )

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


def get_holidays(school_id: str = None, month: int = None, year: int = None) -> str:
    """
    Get holiday and event calendar for a school.

    Args:
        school_id: UUID of the school (optional)
        month: Filter by month 1-12 (optional)
        year: Filter by year (optional)

    Returns:
        JSON with total count, holiday list with dates/types,
        and holidays grouped by type

    Use when: User asks about holidays, vacations, or school events
    Example triggers: "Holidays", "School events", "Is there a holiday on...?", "Vacation dates"
    """

    if(school_id is not None and not validate_uuid(school_id)):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid class_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )

    try:
        with engine.connect() as connection:
            filters = []
            if school_id:
                filters = [f"school_id = '{school_id}'"]
            elif month and year:
                filters.append(f"EXTRACT(MONTH FROM holiday_date) = {month}")
                filters.append(f"EXTRACT(YEAR FROM holiday_date) = {year}")
            elif year:
                filters.append(f"EXTRACT(YEAR FROM holiday_date) = {year}")
            elif month:
                filters.append(f"EXTRACT(MONTH FROM holiday_date) = {month}")
                filters.append(f"EXTRACT(YEAR FROM holiday_date) = EXTRACT(YEAR FROM CURRENT_DATE)")
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


def get_notifications(school_id: str = None, class_id: str = None, user_id: str = None, limit: int = 50) -> str:
    """
    Retrieve notifications with optional filters.

    Args:
        school_id: Filter by school UUID (optional)
        class_id: Filter by class UUID (optional)
        user_id: Filter by recipient user UUID - shows read/unread status (optional)

    Returns:
        JSON with total count, unread count (if user_id provided),
        and list of notifications with details

    Use when: User asks to view notifications, announcements, or messages
    Example triggers: 
        - "Show my notifications" / "Any new announcements?"
        - "Notifications for Class 10" / "School announcements"
        - "Unread messages" / "Fee reminders"
    """
    if ((class_id is not None and not validate_uuid(class_id)) or
        (school_id is not None and not validate_uuid(school_id)) or
        (user_id is not None and not validate_uuid(user_id))
    ):
        import time
        time.sleep(2)
        raise ValueError(
            "Invalid class_id. Must be UUID. "
            "Use run_sql_query to fetch ID first and use it to call the tool again (CRITICAL)."
        )

    try:
        def _rows_to_dicts(result) -> list[dict]:
                columns = list(result.keys())
                return [dict(zip(columns, row)) for row in result]

        with engine.connect() as connection:
            conditions = []
            params = {}

            if school_id:
                conditions.append("n.school_id = :school_id")
                params["school_id"] = school_id
            if class_id:
                conditions.append("n.class_id = :class_id")
                params["class_id"] = class_id

            where_clause = " AND ".join(conditions) if conditions else "1=1"

            if user_id:
                params["user_id"] = user_id
                result = connection.execute(
                    text(f"""
                        SELECT
                            n.id,
                            n.title,
                            n.message,
                            n.notification_type,
                            n.target_audience,
                            n.created_at,
                            sch.name AS school_name,
                            c.name AS class_name,
                            CONCAT(st.first_name, ' ', st.last_name) AS sent_by_name,
                            nr.is_read,
                            nr.read_at
                        FROM notifications n
                        JOIN schools sch ON n.school_id = sch.id
                        LEFT JOIN classes c ON n.class_id = c.id
                        LEFT JOIN staff st ON n.sent_by = st.user_id
                        LEFT JOIN notification_recipients nr 
                            ON n.id = nr.notification_id AND nr.user_id = :user_id
                        WHERE {where_clause}
                        ORDER BY n.created_at DESC
                        LIMIT :limit
                    """),
                    {**params, "limit": limit}
                )
            else:
                result = connection.execute(
                    text(f"""
                        SELECT
                            n.id,
                            n.title,
                            n.message,
                            n.notification_type,
                            n.target_audience,
                            n.created_at,
                            sch.name AS school_name,
                            c.name AS class_name,
                            CONCAT(st.first_name, ' ', st.last_name) AS sent_by_name
                        FROM notifications n
                        JOIN schools sch ON n.school_id = sch.id
                        LEFT JOIN classes c ON n.class_id = c.id
                        LEFT JOIN staff st ON n.sent_by = st.user_id
                        WHERE {where_clause}
                        ORDER BY n.created_at DESC
                        LIMIT :limit
                    """),
                    {**params, "limit": limit}
                )

            notifications = _rows_to_dicts(result)

            unread_count = None
            if user_id:
                unread_result = connection.execute(
                    text(f"""
                        SELECT COUNT(*)
                        FROM notifications n
                        LEFT JOIN notification_recipients nr 
                            ON n.id = nr.notification_id AND nr.user_id = :user_id
                        WHERE {where_clause}
                          AND (nr.is_read IS NULL OR nr.is_read = false)
                    """),
                    params
                ).scalar()
                unread_count = int(unread_result or 0)

            response = {
                "total": len(notifications),
                "notifications": notifications
            }

            if unread_count is not None:
                response["unread_count"] = unread_count

            return to_json(response)
    except Exception as e:
        return f"Error: {str(e)}"


def get_teacher_instruct(teacher_id: str) -> str:
    try:
        with engine.connect() as connection:
            query = text(f"""
                SELECT 
                    (SELECT class_id FROM class_subjects WHERE teacher_id = '{teacher_id}'),
                    (SELECT school_id FROM staff WHERE id = '{teacher_id}')
            """)
            result = connection.execute(query)
            rows = [dict(row._mapping) for row in result]

            return to_json(rows)
    except Exception as e:
        return f"Error: {str(e)}"
    

def get_principal_instruct(principal_id: str) -> str:
    try:
        with engine.connect() as connection:
            query = text(f"""
                SELECT id FROM schools WHERE principal_id = '{principal_id}'
            """)
            result = connection.execute(query)
            rows = [dict(row._mapping) for row in result]

            return to_json(rows)
    except Exception as e:
        return f"Error: {str(e)}"


def get_parent_instruct(parent_id: str) -> str:
    try:
        with engine.connect() as connection:
            query = text(f"""
                SELECT student_id FROM student_parents WHERE parent_id = '{parent_id}'
            """)
            result = connection.execute(query)
            rows = [dict(row._mapping) for row in result]

            return to_json(rows)
    except Exception as e:
        return f"Error: {str(e)}"
