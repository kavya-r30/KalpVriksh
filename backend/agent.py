import os
from agno.agent import Agent
from agno.models.groq import Groq
from agno.models.mistral import MistralChat

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
    get_notifications,
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
        # run_sql_query,
        # get_table_schema,
        # get_attendance_analysis,
        # get_performance_insights,
        get_timetable,
        get_holidays,
        get_fee_status,
        # get_certificate_requests
    ]

    if role in ['student', 'parent']:
        tools.extend([
            get_performance_insights,
            get_attendance_analysis,
            get_notifications,
            # get_fee_status,
            run_sql_query,
        ])

    if role in ['teacher']:
        tools.extend([
            get_attendance_analysis
        ])

    if role in ['teacher', 'principal', 'admin']:
        tools.extend([
            execute_write_query,
            get_class_analytics,
            get_academic_report,
            run_sql_query,
            send_notification,
            # identify_at_risk_students
        ])

    return Agent(
        model=MistralChat(
            id="mistral-medium",
            api_key=os.getenv("MISTRAL_API_KEY"),
            temperature=0
        ),
        tools=tools,
        name=f"SchoolBot_{role}",
        instructions=get_role_instructions(user_id, role),
        markdown=True,
        retries=3,
        delay_between_retries=4,
    )
