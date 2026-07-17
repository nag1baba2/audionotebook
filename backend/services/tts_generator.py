import edge_tts
import asyncio

VOICE = "en-US-AriaNeural"

async def generate_audio(text: str, output_path: str):
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(output_path)
