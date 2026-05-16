import fitz
import os

pdf_folder = "."
output_file = "extracted_text.txt"

with open(output_file, "w", encoding="utf-8") as out:
    for filename in os.listdir(pdf_folder):
        if filename.endswith(".pdf"):
            path = os.path.join(pdf_folder, filename)
            doc = fitz.open(path)
            out.write("\n\n=== " + filename + " ===\n")
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text().strip()
                if text:
                    out.write("\n--- 第" + str(page_num+1) + "页 ---\n")
                    out.write(text + "\n")
            doc.close()

print("提取完成！")