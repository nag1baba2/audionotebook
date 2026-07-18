from groq import Groq
import os

TONE_INSTRUCTIONS = {
    "calm":     "Use a calm, soothing, and peaceful tone.",
    "excited":  "Use an energetic, enthusiastic, and exciting tone.",
    "serious":  "Use a formal, serious, and professional tone.",
    "friendly": "Use a warm, friendly, and approachable tone.",
    "neutral":  "Use a clear and neutral tone.",
}

MODE_INSTRUCTIONS = {
    "story":     "Rewrite in a narrative, engaging storytelling style suitable for audiobooks. Make it vivid and immersive.",
    "technical": "Simplify complex concepts into plain language. Skip equations, formulas, and references. Focus on key ideas and explain them clearly for a general audience.",
}

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
}

def init_model():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

def process_chapter(model, title: str, content: str, mode: str = "story", tone: str = "neutral", language: str = "en") -> dict:
    content = content[:4000]
    mode_instruction = MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["story"])
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["neutral"])
    lang_name = LANGUAGE_NAMES.get(language, "English")

    if language == "hi":
        lang_instruction = (
            "IMPORTANT: Always keep the labels 'SUMMARY:' and 'SCRIPT:' exactly as written in English.\n"
            "- Write the SUMMARY content in Hinglish (Hindi words spelled with English/Roman letters, e.g. 'Ek bachche ki kahani hai...'). Do NOT use Devanagari.\n"
            "- Write the SCRIPT content in proper Hindi Devanagari script (e.g. 'एक बच्चे की कहानी है...'). This is for text-to-speech."
        )
    else:
        lang_instruction = f"IMPORTANT: Always keep the labels 'SUMMARY:' and 'SCRIPT:' exactly as written in English. Write the content of both entirely in {lang_name}."

    prompt = f"""You are preparing an audiobook. Given the chapter below, return two things:

1. SUMMARY: A 2-3 sentence summary of what this chapter is about.
2. SCRIPT: {mode_instruction} {tone_instruction} Remove any formatting, footnotes, or references. Make it flow naturally when read aloud. Keep it concise (max 300 words).

{lang_instruction}

Chapter Title: {title}
Chapter Content:
{content}

Respond in this EXACT format (keep labels in English):
SUMMARY: <your summary here>
SCRIPT: <your narration script here>"""

    response = model.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content

    if "SUMMARY:" in text and "SCRIPT:" in text:
        parts = text.split("SCRIPT:")
        summary = parts[0].replace("SUMMARY:", "").strip()
        script = parts[1].strip()
    else:
        summary = "Summary not available."
        script = content[:500]

    return {"summary": summary, "script": script}
