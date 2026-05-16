import chromadb
import openai

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("math_knowledge")

ds_client = openai.OpenAI(
    api_key="sk-f44fc5b039514ad285d0211c2592c26a",
    base_url="https://api.deepseek.com"
)

def ask(question):
    results = collection.query(query_texts=[question], n_results=3)
    context = "\n".join(results["documents"][0])
    
    prompt = f"""你是一个高等数学助教，根据以下知识库内容回答问题。
    
知识库内容：
{context}

问题：{question}

请用清晰易懂的中文回答。"""

    response = ds_client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    while True:
        q = input("\n请输入问题（输入q退出）：")
        if q == "q":
            break
        print("\n回答：", ask(q))