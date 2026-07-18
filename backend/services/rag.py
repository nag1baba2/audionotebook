from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from groq import Groq
import json, os, numpy as np

def build_index(chapters: list[dict], index_path: str):
    texts = [f"{ch['title']}\n{ch['content']}" for ch in chapters]
    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    matrix = vectorizer.fit_transform(texts)
    os.makedirs(index_path, exist_ok=True)
    np.save(f"{index_path}/matrix.npy", matrix.toarray())
    with open(f"{index_path}/texts.json", "w", encoding="utf-8") as f:
        json.dump(texts, f)
    import pickle
    with open(f"{index_path}/vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)

def query_index(index_path: str, question: str) -> str:
    import pickle
    with open(f"{index_path}/vectorizer.pkl", "rb") as f:
        vectorizer = pickle.load(f)
    with open(f"{index_path}/texts.json", encoding="utf-8") as f:
        texts = json.load(f)
    matrix = np.load(f"{index_path}/matrix.npy")
    q_vec = vectorizer.transform([question]).toarray()
    scores = cosine_similarity(q_vec, matrix)[0]
    top_idx = np.argsort(scores)[-3:][::-1]
    context = "\n\n".join([texts[i] for i in top_idx])
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "Answer the question using only the provided context from the book. Be concise and accurate."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]
    )
    return response.choices[0].message.content
