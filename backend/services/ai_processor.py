from groq import Groq
import os

def init_gemini():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

def process_chapter(model, title: str, content: str) -> dict:
    content = content[:4000]

    prompt = f"""You are preparing an audiobook. Given the chapter below, return two things:

1. SUMMARY: A 2-3 sentence summary of what this chapter is about.
2. SCRIPT: Rewrite the chapter content in a natural, engaging, conversational tone suitable for audio narration. Remove any formatting, footnotes, or references. Make it flow naturally when read aloud. Keep it concise (max 300 words).

Chapter Title: {title}
Chapter Content:
{content}

Respond in this exact format:
SUMMARY: <your summary here>
SCRIPT: <your narration script here>"""

    response = model.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content

    summary = ""
    script = ""

    if "SUMMARY:" in text and "SCRIPT:" in text:
        parts = text.split("SCRIPT:")
        summary = parts[0].replace("SUMMARY:", "").strip()
        script = parts[1].strip()
    else:
        summary = "Summary not available."
        script = content[:500]

    return {"summary": summary, "script": script}
