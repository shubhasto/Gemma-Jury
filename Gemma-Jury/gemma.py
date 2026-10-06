import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMMA_API_KEY"))

language = input("Programming language: ")
task = input("What should the code do? ")

print("Paste your code. Type END when finished:")

lines = []

while True:
    line = input()

    if line.strip() == "END":
        break

    lines.append(line)

code = "\n".join(lines)

prompt = (
    "You are a code reviewer.\n\n"
    + "Language: " + language + "\n\n"
    + "Task: " + task + "\n\n"
    + "Code:\n" + code + "\n\n"
    + "Find bugs in the code. "
    + "Explain each bug simply. "
    + "If the code is correct, say that clearly."
)

response = client.models.generate_content(
    model="gemma-4-26b-a4b-it",
    contents=prompt
)

print("\n===== GEMMA 4 REVIEW =====\n")
print(response.text)