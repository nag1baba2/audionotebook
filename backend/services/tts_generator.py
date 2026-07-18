import edge_tts

VOICES = {
    "en": "en-US-AriaNeural",
    "hi": "hi-IN-SwaraNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
}

async def generate_audio(text: str, output_path: str, language: str = "en"):
    voice = VOICES.get(language, VOICES["en"])
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
