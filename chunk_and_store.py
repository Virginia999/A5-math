import chromadb
import os

with open("extracted_text.txt", "r", encoding="utf-8") as f:
    text = f.read()

chunks = []
chunk_size = 500
overlap = 50

for i in range(0, len(text), chunk_size - overlap):
    chunk = text[i:i + chunk_size].strip()
    if chunk:
        chunks.append(chunk)

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("math_knowledge")

for i, chunk in enumerate(chunks):
    collection.add(
        documents=[chunk],
        ids=[f"chunk_{i}"]
    )

print(f"存入完成！共 {len(chunks)} 个块")