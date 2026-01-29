import os
from agno.agent import Agent
from agno.models.groq import Groq

from .instructions import get_role_instructions
from .tools import (
    run_sql_query,
    execute_write_query,
    get_table_schema,
    get_attendance_analysis,
    get_performance_insights,
    get_fee_status,
    get_class_analytics,
    get_academic_report,
    get_timetable,
    get_holidays,
    get_certificate_requests,
    send_notification,
    identify_at_risk_students
)


def get_agent_for_user(user_id: str, role: str) -> Agent:
    """
    Create an agent with appropriate tools based on user role.

    Args:
        user_id: The user's ID
        role: User role (student, parent, teacher, principal, admin)

    Returns:
        Configured Agent instance
    """
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

    # Additional tools for privileged roles
    if role in ['teacher', 'principal', 'admin']:
        tools.extend([
            execute_write_query,
            get_class_analytics,
            get_academic_report,
            send_notification,
            identify_at_risk_students
        ])

    return Agent(
        model=Groq(
            id="meta-llama/llama-4-scout-17b-16e-instruct",
            api_key=os.getenv("GROQ_API_KEY")
        ),
        tools=tools,
        name=f"SchoolBot_{role}",
        instructions=get_role_instructions(user_id, role),
        markdown=True
    )
