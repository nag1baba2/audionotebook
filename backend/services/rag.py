from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from groq import Groq
import os

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def build_index(chapters: list[dict], index_path: str):
    texts = [f"{ch['title']}\n{ch['content']}" for ch in chapters]
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    docs = splitter.create_documents(texts)
    db = FAISS.from_documents(docs, embeddings)
    db.save_local(index_path)

def query_index(index_path: str, question: str) -> str:
    db = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
    docs = db.similarity_search(question, k=3)
    context = "\n\n".join([d.page_content for d in docs])

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Answer the question using only the provided context from the book. Be concise and accurate."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]
    )
    return response.choices[0].message.content
