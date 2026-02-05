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
    current_user_id = "14195cde-0e7a-4a68-a23a-a1e0bd0ef9aa"
    current_role = "parent"

    agent = get_agent_for_user(current_user_id, current_role)
    agent.print_response("Show me recent notifications", debug_mode=False)   
    agent.print_response("Show me recent notifications", debug_mode=False)   
    agent.print_response("Show me recent notifications", debug_mode=False)   
    agent.print_response("Show me recent notifications", debug_mode=False)   

    # import uvicorn
    # uvicorn.run(app, host="0.0.0.0", port=8000)
