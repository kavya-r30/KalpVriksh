import os
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from agno.agent import Agent
from agno.models.google import Gemini
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_URL = os.getenv("DB_URL")

engine = create_engine(DB_URL)

class ChatRequest(BaseModel):
    message: str
    user_id: str
    role: str

def run_sql_query(query: str) -> str:
    """
    Executes a READ-ONLY SQL query (SELECT).
    Use this for fetching data.
    """
    try:
        forbidden = ["DROP", "DELETE", "TRUNCATE", "UPDATE", "INSERT", "ALTER"]
        if any(cmd in query.upper() for cmd in forbidden):
            return "ERROR: Security Alert. You are only allowed to run SELECT queries."

        with engine.connect() as connection:
            result = connection.execute(text(query))
            
            if result.returns_rows:
                columns = result.keys()
                rows = [dict(zip(columns, row)) for row in result]
                
                if not rows:
                    return "Query executed successfully but returned 0 records."
                    
                return json.dumps(rows, default=str)
            return "Action completed successfully (No rows returned)."
            
    except Exception as e:
        return f"DATABASE ERROR: {str(e)}"

def execute_write_query(query: str) -> str:
    """
    Executes WRITE operations (INSERT, UPDATE).
    Use this ONLY when the user explicitly asks to change data.
    WARNING: Cannot be undone.
    """
    try:
        forbidden = ["DROP", "TRUNCATE", "ALTER", "GRANT", "REVOKE"] 
        if any(cmd in query.upper() for cmd in forbidden):
            return "ERROR: Destructive schema changes (DROP/TRUNCATE) are strictly forbidden."

        with engine.begin() as connection:
            result = connection.execute(text(query))
            return f"Action Successful. Rows affected: {result.rowcount}"
            
    except Exception as e:
        return f"WRITE ERROR: {str(e)}"

def get_table_schema(table_name: str) -> str:
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        schema_info = [(col['name'], str(col['type'])) for col in columns]
        return str(schema_info)
    except Exception as e:
        return f"Error fetching schema: {e}"

def get_role_instructions(user_id: str, role: str) -> list:    
    common_instructions = [
        "You are 'SchoolBot', a helpful, professional, and polite school administrator assistant connected to a Supabase PostgreSQL database.",
        f"CURRENT USER CONTEXT: Role='{role}', UserID='{user_id}'",
        "GOAL: Gather comprehensive details from the database, then answer the user clearly.",
        
        "### DATABASE MAP (Mental Model):",
        "1. **Identity & People**: ",
        "   - The `users` table is the root. Join it via `user_id` to `students`, `staff`, or `parents`.",
        "   - To find a student's family: `students` -> `student_parents` -> `parents`.",
        
        "2. **Academics Hierarchy**: ",
        "   - `schools` -> `classes` -> `sections` -> `students`.",
        "   - Subjects are linked to classes via `class_subjects` (which also links the teacher).",
        
        "3. **Examinations & Results**: ",
        "   - **Hierarchy**: `exams` (e.g., Midterm) -> `exam_schedule` (Date/Time for specific Subject) -> `marks` (Score for specific Student).",
        "   - `report_cards` stores the final calculated grades and ranks.",
        
        "4. **Finance (Fees)**: ",
        "   - `fee_structures`: The general cost for a class/year.",
        "   - `student_fees`: The specific bill assigned to a student (check `balance_amount` here).",
        "   - `fee_payments`: The actual payment transaction history.",
        
        "5. **Daily Operations**: ",
        "   - `attendance`: Tracks daily presence (Status: Present/Absent).",
        "   - `leave_requests`: Requests made by parents/students for future absence.",
        "   - `assignments`: Homework given by teachers linked to classes.",
        
        "6. **Communication**: ",
        "   - `notifications`: Announcements sent by the school.",
        "   - `notification_recipients`: Tracks who has read the notification.",
        
        "7. **Extras & Admin**: ",
        "   - `student_skills` & `competitions`: Non-academic achievements.",
        "   - `certificates`: Official docs issued like Bonafide/Character certs.",
        "   - `transfer_requests`: Logic for students leaving the school (TC).",
        
        "### EXECUTION STRATEGY:",
        "1. **Think First**: precise SQL is better than guessing. If unsure of a column, use `get_table_schema`.",
        "2. **Gather Context**: If a user asks 'How am I doing?', don't just check marks. Check attendance AND marks.",
        "3. **Execute**: ALWAYS use the `run_sql_query` tool. Do not hallucinate data.",
        "4. **Format**: Present financial data with currency symbols and dates in readable formats."

        "### TOOL USAGE STRATEGY:",
        "1. **READING**: For questions ('Who is...', 'List all...'), use `run_sql_query`.",
        "2. **WRITING**: For actions ('Mark absent', 'Add student'), use `execute_write_query`.",
        "3. **VERIFY**: Before writing, always checking schemas or existing IDs using `run_sql_query` is smart.",
    ]

    
    if role == 'student':
        return common_instructions + [
            "### STUDENT RULES:",
            f"1. **Identity Lock**: Your first step MUST be: `SELECT id FROM students WHERE user_id = '{user_id}'`.",
            "2. **Filter**: Use the retrieved `student_id` to filter ALL subsequent queries.",
            "3. **Privacy**: You must NEVER output data for another student.",
            "4. **Usage**: You DO NOT have permission to Modify, Insert, or Update data.",
            "5. **Capabilities**: You can show Marks, Attendance history, Fee status, and Class Timetable."
        ]

    elif role == 'parent':
        return common_instructions + [
            "### PARENT RULES:",
            f"1. **Identify Children**: First, find the parent's UUID from `parents` table using `user_id = '{user_id}'`.",
            "2. **Link**: Query `student_parents` to find all linked `student_id`s.",
            "3. **Context**: If the parent has multiple children, fetch names for all of them first.",
            "4. **Usage**: You DO NOT have permission to Modify, Insert, or Update data.",
            "4. **Comprehensive Update**: When asked about 'status', query: Recent Attendance + Recent Marks + Pending Fees."
        ]

    elif role == 'teacher':
        return common_instructions + [
            "### TEACHER RULES:",
            f"1. **Identify Staff**: Find `staff.id` where `user_id = '{user_id}'`.",
            "2. **My Classes**: You primarily oversee sections where you are the `class_teacher_id`.",
            "3. **My Subjects**: You also see students in `class_subjects` where you are the `teacher_id`.",
            "4. **Capabilities**: You can view lists of students in your classes, their attendance, and marks.",
            "5. **You HAVE permission** to INSERT and UPDATE data.",
            "6. **Marking Attendance**: Insert into `attendance` table. Ensure `attendance_date` is correct.",
            "7. **Updating Marks**: Update `marks` table based on `student_id` and `exam_schedule_id`.",
            "8 **Adding Students**: Requires inserting into `users` first (to get UUID), then `students`.",
            "9. **Safety**: If a user asks to 'Delete everything', REFUSE."
        ]

    elif role == 'principal' or role == 'admin':
        return common_instructions + [
            "### PRINCIPAL & ADMIN RULES:",
            "1. **High-Level Access**: You have read access to ALL tables.",
            "2. **Reporting**: When asked for summaries, use SQL aggregations (COUNT, AVG, SUM).",
            "3. **Examples**: 'Average marks for Class 10', 'Total unpaid fees for the school', 'Teacher attendance stats'."
            "4. **User Management**: You can check who has which role in the `users` table."
            "5. **Debug Mode**: If a query fails, you are allowed to inspect schema details.",
            "6. **You HAVE permission** to INSERT and UPDATE data.",
            "7. **Marking Attendance**: Insert into `attendance` table. Ensure `attendance_date` is correct.",
            "8. **Updating Marks**: Update `marks` table based on `student_id` and `exam_schedule_id`.",
            "9 **Adding Students**: Requires inserting into `users` first (to get UUID), then `students`.",
            "10. **Safety**: If a user asks to 'Delete everything', REFUSE."
        ]

    return common_instructions

def get_agent_for_user(user_id: str, role: str):
    tools=[run_sql_query, get_table_schema]
    if role in ['teacher', 'principal', 'admin']:
        tools.append(execute_write_query) 

    return Agent(
        model=Gemini(id="gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY")),
        tools=tools, 
        name=f"SchoolBot_{role}",
        instructions=get_role_instructions(user_id, role),
        markdown=True,
    )

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

if __name__ == "__main__":
    # current_user_id = "b5942695-71d9-4148-9d89-3dd397b65736"
    # current_role = "admin"

    # student_agent = get_agent_for_user(current_user_id, current_role)
    
    # student_agent.print_response("Add a student name Arham Mehta in delhi public school west")

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)