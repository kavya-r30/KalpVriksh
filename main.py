from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.tools import *
from backend.agent import *

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.endpoints import router
app.include_router(router)

if __name__ == "__main__":
    # current_user_id = "1cce599c-0d57-4881-8bae-f0d76aa5760b"
    # current_role = "teacher"

    # agent = get_agent_for_user(current_user_id, current_role)
    # agent.print_response("Show attendance for my class", debug_mode=False)   
    # agent.print_response("Give Class Analytics of my class", debug_mode=False)   
    # agent.print_response("Get Timetable for Monday", debug_mode=False)   
    # agent.print_response("Get my Timetable", debug_mode=False)   

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
