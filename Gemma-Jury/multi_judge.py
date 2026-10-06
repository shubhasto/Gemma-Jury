import os
import time
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMMA_API_KEY"))

language = input("Programming Language: ")
task = input("Task: ")
code = input("Code: ")

roles = [
    {
        "name": "CORRECTNESS JUDGE",
        "icon": "[1]",
        "job": "Checks whether the code correctly solves the task."
    },
    {
        "name": "SKEPTIC JUDGE",
        "icon": "[2]",
        "job": "Tries to find hidden bugs and challenge the solution."
    },
    {
        "name": "EDGE-CASE JUDGE",
        "icon": "[3]",
        "job": "Checks boundary, unusual, empty, and large inputs."
    },
    {
        "name": "QUALITY JUDGE",
        "icon": "[4]",
        "job": "Checks performance, safety, and code quality."
    }
]

reviews = []

print("\n")
print("=" * 70)
print("                 GEMMA JURY")
print("             MULTI-JUDGE REVIEW")
print("=" * 70)

print("\nTASK")
print("-" * 70)
print(task)

print("\nCODE")
print("-" * 70)
print(code)

print("\n")
print("=" * 70)
print("              INDEPENDENT JUDGES")
print("=" * 70)


for i, role in enumerate(roles):

    print("\n")
    print("┌" + "─" * 68 + "┐")
    print(f"│  {role['icon']}  {role['name']:<58}│")
    print("├" + "─" * 68 + "┤")
    print(f"│  ROLE: {role['job']:<59}│")
    print("└" + "─" * 68 + "┘")

    prompt = (
        "You are the " + role["name"] + ".\n"
        + role["job"] + "\n\n"

        + "IMPORTANT RULES:\n"
        + "Judge ONLY according to the requirements explicitly stated in the task.\n"
        + "Do NOT invent extra requirements.\n"
        + "Do NOT assume that user input is required unless the task says so.\n"
        + "A hardcoded example is NOT a bug unless the task requires general input.\n"
        + "Separate actual bugs from optional improvements or style suggestions.\n\n"

        + "Language: " + language + "\n"
        + "Task: " + task + "\n"
        + "Code: " + code + "\n\n"

        + "Give a concise review.\n"
        + "Clearly state:\n"
        + "1. Problem Found: YES or NO\n"
        + "2. Main Finding\n"
        + "3. Severity: Critical, Major, Minor, or None"
    )

    success = False

    for attempt in range(3):

        try:

            print("\n  → Gemma 4 is analyzing...")

            response = client.models.generate_content(
                model="gemma-4-26b-a4b-it",
                contents=prompt
            )

            print("\n  RESULT")
            print("  " + "-" * 60)

            for line in response.text.splitlines():
                print("  " + line)

            reviews.append(response.text)

            print("\n  ✓ Judge completed")
            success = True
            break

        except Exception:

            print(f"  ⚠ API error. Retrying ({attempt + 1}/3)...")
            time.sleep(2)

    if not success:

        print("  ✗ Judge unavailable")
        reviews.append("Judge unavailable.")


print("\n")
print("=" * 70)
print("                    REVIEW COMPLETE")
print("=" * 70)

successful = sum(
    review != "Judge unavailable."
    for review in reviews
)

print(f"\nJudges completed: {successful}/4")
print("=" * 70)