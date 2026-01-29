import os
import json
from contextlib import contextmanager
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
engine = create_engine(DB_URL)


def load_schema() -> dict:
    """Load database schema from JSON file."""
    schema_path = os.path.join(os.path.dirname(__file__), "..", "schema.json")
    with open(schema_path, "r") as f:
        return json.load(f)


DATABASE_SCHEMA = load_schema()


@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    connection = engine.connect()
    try:
        yield connection
    finally:
        connection.close()


@contextmanager
def get_db_transaction():
    """Context manager for database transactions."""
    with engine.begin() as connection:
        yield connection
