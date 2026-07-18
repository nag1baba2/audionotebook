import os
import uuid
import json
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from services.pdf_extractor import extract_text
from services.chapter_splitter import split_chapters
from services.ai_processor import init_model, process_chapter
from services.tts_generator import generate_audio
from services.rag import build_index, query_index

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
async def upload_pdf(
    file: UploadFile = File(...),
    mode: str = Form(default="story"),
    language: str = Form(default="en"),
    tone: str = Form(default="neutral"),
):
    job_id = str(uuid.uuid4())
    job_dir = UPLOADS_DIR / job_id
    job_dir.mkdir(parents=True)
    (job_dir / "audio").mkdir()

    with open(job_dir / "input.pdf", "wb") as f:
        f.write(await file.read())

    with open(job_dir / "config.json", "w") as f:
        json.dump({"mode": mode, "language": language, "tone": tone}, f)

    return {"job_id": job_id}


@app.get("/process/{job_id}")
async def process(job_id: str):
    job_dir = UPLOADS_DIR / job_id

    async def event_stream():
        def send(msg):
            return f"data: {json.dumps(msg)}\n\n"

        try:
            config = json.loads((job_dir / "config.json").read_text())
            mode = config.get("mode", "story")
            language = config.get("language", "en")
            tone = config.get("tone", "neutral")

            yield send({"step": "extract", "message": "Extracting text from PDF..."})
            text = extract_text(str(job_dir / "input.pdf"))

            yield send({"step": "split", "message": "Detecting chapters..."})
            chapters = split_chapters(text)
            total = len(chapters)
            yield send({"step": "split", "message": f"Found {total} chapter(s)", "total": total})

            yield send({"step": "ai", "message": "Initializing AI model..."})
            model = init_model()

            results = []
            for i, ch in enumerate(chapters):
                yield send({"step": "ai", "message": f"AI processing chapter {i+1}/{total}: {ch['title']}", "current": i+1, "total": total})
                processed = process_chapter(model, ch["title"], ch["content"], mode=mode, tone=tone, language=language)

                yield send({"step": "tts", "message": f"Generating audio for chapter {i+1}/{total}...", "current": i+1, "total": total})
                audio_filename = f"chapter_{i+1}.mp3"
                await generate_audio(processed["script"], str(job_dir / "audio" / audio_filename), language=language)

                results.append({
                    "index": i + 1,
                    "title": ch["title"],
                    "summary": processed["summary"],
                    "audio_url": f"/audio/{job_id}/audio/{audio_filename}"
                })

            with open(job_dir / "chapters.json", "w") as f:
                json.dump(results, f)

            yield send({"step": "rag", "message": "Building knowledge index for chat..."})
            build_index(chapters, str(job_dir / "faiss_index"))

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


class ChatRequest(BaseModel):
    question: str

@app.post("/chat/{job_id}")
async def chat(job_id: str, req: ChatRequest):
    index_path = str(UPLOADS_DIR / job_id / "faiss_index")
    try:
        answer = query_index(index_path, req.question)
        return {"answer": answer}
    except Exception as e:
        return {"answer": f"Error: {str(e)}"}
