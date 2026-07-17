import os
import uuid
import json
import asyncio
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from services.pdf_extractor import extract_text
from services.chapter_splitter import split_chapters
from services.ai_processor import init_gemini, process_chapter
from services.tts_generator import generate_audio

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/audio", StaticFiles(directory="uploads"), name="audio")


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    job_dir = UPLOADS_DIR / job_id
    job_dir.mkdir(parents=True)
    audio_dir = job_dir / "audio"
    audio_dir.mkdir()

    pdf_path = job_dir / "input.pdf"
    with open(pdf_path, "wb") as f:
        f.write(await file.read())

    # Save initial status
    with open(job_dir / "status.json", "w") as f:
        json.dump({"status": "uploaded", "step": 0, "total": 0}, f)

    return {"job_id": job_id}


@app.get("/process/{job_id}")
async def process(job_id: str):
    job_dir = UPLOADS_DIR / job_id
    status_file = job_dir / "status.json"

    async def event_stream():
        def send(msg):
            return f"data: {json.dumps(msg)}\n\n"

        try:
            yield send({"step": "extract", "message": "Extracting text from PDF..."})
            text = extract_text(str(job_dir / "input.pdf"))

            yield send({"step": "split", "message": "Detecting chapters..."})
            chapters = split_chapters(text)
            total = len(chapters)
            yield send({"step": "split", "message": f"Found {total} chapter(s)", "total": total})

            yield send({"step": "ai", "message": "Initializing AI model..."})
            model = init_gemini()

            results = []
            for i, ch in enumerate(chapters):
                yield send({"step": "ai", "message": f"AI processing chapter {i+1}/{total}: {ch['title']}", "current": i+1, "total": total})
                processed = process_chapter(model, ch["title"], ch["content"])

                yield send({"step": "tts", "message": f"Generating audio for chapter {i+1}/{total}...", "current": i+1, "total": total})
                audio_filename = f"chapter_{i+1}.mp3"
                audio_path = job_dir / "audio" / audio_filename
                await generate_audio(processed["script"], str(audio_path))

                results.append({
                    "index": i + 1,
                    "title": ch["title"],
                    "summary": processed["summary"],
                    "audio_url": f"/audio/{job_id}/audio/{audio_filename}"
                })

            with open(job_dir / "chapters.json", "w") as f:
                json.dump(results, f)

            yield send({"step": "done", "message": "Audiobook ready!", "job_id": job_id})

        except Exception as e:
            yield send({"step": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/player/{job_id}")
async def get_player_data(job_id: str):
    chapters_file = UPLOADS_DIR / job_id / "chapters.json"
    if not chapters_file.exists():
        return {"error": "Not found"}
    with open(chapters_file) as f:
        return {"chapters": json.load(f)}
