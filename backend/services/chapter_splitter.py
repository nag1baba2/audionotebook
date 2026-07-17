import re

HEADING_PATTERN = re.compile(
    r'^(?:chapter|section|part)\s+\d+[^\n]*$|^\d+\.\s+[A-Z][^\n]+$',
    re.IGNORECASE | re.MULTILINE
)

def split_chapters(text: str) -> list[dict]:
    matches = list(HEADING_PATTERN.finditer(text))

    if not matches:
        # No headings — split into ~3000 char chunks
        chunk_size = 3000
        chunks = [text[i:i+chunk_size].strip() for i in range(0, len(text), chunk_size)]
        return [{"title": f"Part {i+1}", "content": c} for i, c in enumerate(chunks) if c]

    chapters = []

    # Text before first heading
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
