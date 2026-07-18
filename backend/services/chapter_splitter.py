import re

HEADING_PATTERN = re.compile(
    # Chapter / Section / Part N (with optional title)
    r'^(?:chapter|section|part)\s+\d+[^\n]*$'
    # 1. / 1.1 / 1.1.1 style (with capital letter title)
    r'|^\d+(?:\.\d+)*\.?\s+[A-Z][^\n]{0,80}$'
    # ALL CAPS headings (at least 4 chars, short line, no trailing punctuation)
    r'|^[A-Z][A-Z\s]{3,59}[A-Z]$'
    # Indented headings: 2+ leading spaces, capital start, short, no trailing punctuation
    r'|^\s{2,}[A-Z][^\n.,:;]{3,60}$',
    re.MULTILINE
)

def _is_likely_heading(text: str) -> bool:
    t = text.strip()
    if len(t) < 3 or len(t) > 100:
        return False
    if t[-1] in '.,:;':
        return False
    return True

def split_chapters(text: str) -> list[dict]:
    matches = [m for m in HEADING_PATTERN.finditer(text) if _is_likely_heading(m.group())]

    if not matches:
        chunk_size = 3000
        chunks = [text[i:i+chunk_size].strip() for i in range(0, len(text), chunk_size)]
        return [{"title": f"Part {i+1}", "content": c} for i, c in enumerate(chunks) if c]

    chapters = []

    before = text[:matches[0].start()].strip()
    if before:
        chapters.append({"title": "Introduction", "content": before})

    for i, match in enumerate(matches):
        title = match.group().strip()
        start = match.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        content = text[start:end].strip()
        if content:
            chapters.append({"title": title, "content": content})

    return chapters if chapters else [{"title": "Full Text", "content": text.strip()}]
