import json
import csv
import io
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from sqlalchemy import text

from .models import ChatRequest, NotificationRequest
from .agent import get_agent_for_user
from .database import engine
from .tools import (
    get_attendance_analysis,
    get_performance_insights,
    get_fee_status,
    get_class_analytics,
    get_academic_report,
    get_timetable,
    get_holidays,
    identify_at_risk_students,
    send_notification
)

router = APIRouter()

# ===========================================
# CHAT ENDPOINT
# ===========================================

@router.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint for AI agent interaction."""
    try:
        agent = get_agent_for_user(request.user_id, request.role)
        response = agent.run(request.message)
        return {"reply": response.content}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================================
# ANALYSIS ENDPOINTS
# ===========================================

@router.post("/api/agent/analyze-student")
async def analyze_student(student_id: str, analysis_type: str = "comprehensive"):
    """Comprehensive student analysis."""
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


@router.post("/api/agent/class-analytics")
async def class_analytics_endpoint(class_id: str):
    """Class-level analytics."""
    try:
        return json.loads(get_class_analytics(class_id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/agent/academic-report")
async def academic_report_endpoint(class_id: str = None, school_id: str = None, exam_id: str = None):
    """Academic report with rankings."""
    try:
        return json.loads(get_academic_report(class_id, school_id, exam_id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/agent/at-risk-students")
async def at_risk_students_endpoint(school_id: str, class_id: str = None):
    """Identify at-risk students."""
    try:
        return json.loads(identify_at_risk_students(school_id, class_id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/agent/timetable")
async def timetable_endpoint(school_id: str = None, class_id: str = None, teacher_id: str = None, day_of_week: int = None):
    """Get timetable information."""
    try:
        return json.loads(get_timetable(class_id, teacher_id, school_id, day_of_week))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/agent/holidays")
async def holidays_endpoint(school_id: str, month: int = None, year: int = None):
    """Get holiday calendar."""
    try:
        return json.loads(get_holidays(school_id, month, year))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================================
# NOTIFICATION ENDPOINT
# ===========================================

@router.post("/api/notifications/send")
async def send_notification_endpoint(request: NotificationRequest):
    """Send a notification."""
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


# ===========================================
# DATA INGESTION ENDPOINTS
# ===========================================

@router.post("/api/data-ingestion/csv")
async def ingest_csv_data(
    file: UploadFile = File(...),
    data_type: str = Form(...),
    school_id: str = Form(...)
):
    """Ingest data from CSV file."""
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
                            errors.append(f"Row {i+1}: Student not found")

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
                except Exception as row_error:
                    errors.append(f"Row {i+1}: {str(row_error)}")

        return {
            "success": True,
            "inserted": inserted,
            "total_records": len(records),
            "errors": errors[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/data-ingestion/image")
async def ingest_image_data(
    file: UploadFile = File(...),
    data_type: str = Form(...),
    school_id: str = Form(...)
):
    """Extract and ingest data from image using Gemini Vision."""
    try:
        import google.genai as genai
        import PIL.Image

        content = await file.read()
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = f"""
        Analyze this image containing {data_type} data.
        Extract all data as JSON array.
        For attendance: student_name/admission_number, date, status
        For marks: student_name/admission_number, subject, marks_obtained, max_marks
        For fees: student_name/admission_number, amount, payment_date
        Return ONLY valid JSON array.
        """

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
            return {"success": False, "message": "Could not parse extracted data"}

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
                        AND school_id = '{school_id}' LIMIT 1
                    """)
                    student = connection.execute(student_query).fetchone()

                    if not student:
                        errors.append(f"Record {i+1}: Student not found")
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
                            ORDER BY es.exam_date DESC LIMIT 1
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


# ===========================================
# HEALTH CHECK
# ===========================================

@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
