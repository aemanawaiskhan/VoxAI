
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai

load_dotenv(override=True)
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="VoxAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini setup
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

# History file stored beside main.py
HISTORY_FILE = Path(__file__).with_name("history.json")


class Question(BaseModel):
    question: str


def load_history():
    """Read saved conversation history."""
    if not HISTORY_FILE.exists():
        return []

    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as file:
            history = json.load(file)

        return history if isinstance(history, list) else []

    except (json.JSONDecodeError, OSError):
        logging.exception("Could not read history file")
        return []


def save_history(question, answer):
    """Save a question and its answer."""
    history = load_history()

    history.append({
        "question": question,
        "answer": answer,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    with open(HISTORY_FILE, "w", encoding="utf-8") as file:
        json.dump(history, file, indent=4, ensure_ascii=False)


@app.get("/")
def home():
    return {"message": "VoxAI backend is running!"}


@app.post("/ask")
def ask_ai(data: Question):
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing from the .env file."
        )

    question_text = data.question.strip()

    if not question_text:
        raise HTTPException(
            status_code=400,
            detail="Please enter a question."
        )

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=(
                "You are VoxAI, a helpful AI assistant. "
                "Introduce yourself as VoxAI when asked who you are. "
                "Answer the user's question clearly.\n\n"
                f"User: {question_text}"
            )
        )

        answer = response.text

        if not answer:
            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty answer."
            )

        # Save the successful conversation
        try:
            save_history(question_text, answer)
        except OSError:
            logging.exception("Could not save conversation history")

        return {"answer": answer}

    except HTTPException:
        raise

    except Exception as e:
        logging.exception("Gemini API request failed")
        raise HTTPException(
            status_code=502,
            detail=f"{type(e).__name__}: {str(e)}"
        )


@app.get("/history")
def get_history():
    """Return all saved conversations."""
    return {
        "total": len(load_history()),
        "history": load_history()
    }


@app.delete("/history")
def clear_history():
    """Delete all saved conversations."""
    with open(HISTORY_FILE, "w", encoding="utf-8") as file:
        json.dump([], file)

    return {"message": "Conversation history cleared."}
