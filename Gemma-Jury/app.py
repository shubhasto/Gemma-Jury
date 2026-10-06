import os
import time
import concurrent.futures
from dotenv import load_dotenv
from google import genai
from flask import Flask, render_template, request, jsonify

load_dotenv()

app = Flask(__name__)

client = genai.Client(
    api_key=os.getenv("GEMMA_API_KEY")
)

MODEL = "gemma-4-26b-a4b-it"


ROLES = [
    {
        "name": "CORRECTNESS JUDGE",
        "description": "Checks whether the code correctly solves the given task."
    },
    {
        "name": "SKEPTIC JUDGE",
        "description": "Tries to find hidden bugs and challenge the solution."
    },
    {
        "name": "EDGE-CASE JUDGE",
        "description": "Checks boundary, unusual, empty and large inputs."
    },
    {
        "name": "QUALITY JUDGE",
        "description": "Checks performance, safety and code quality."
    }
]


def ask_gemma(prompt):

    for attempt in range(3):

        try:

            response = client.models.generate_content(
                model=MODEL,
                contents=prompt
            )

            return response.text

        except Exception as e:

            if attempt == 2:
                return "Judge unavailable because of API error."

            time.sleep(2)


def evaluate_judge_role(role, language, task, code):

    prompt = (
        "You are the " + role["name"] + ".\n"
        + role["description"] + "\n\n"

        + "IMPORTANT RULES:\n"
        + "Judge ONLY according to the requirements explicitly stated in the task.\n"
        + "Do NOT invent extra requirements.\n"
        + "Do NOT assume that user input is required unless the task says so.\n"
        + "A hardcoded example is NOT a bug unless the task requires general input.\n"
        + "Separate actual bugs from optional improvements or style suggestions.\n\n"

        + "Language: " + language + "\n"
        + "Task: " + task + "\n"
        + "Code:\n" + code + "\n\n"

        + "Give a concise review.\n"
        + "Clearly state:\n"
        + "1. Problem Found: YES or NO\n"
        + "2. Main Finding\n"
        + "3. Severity: Critical, Major, Minor, or None"
    )

    review = ask_gemma(prompt)

    return {
        "role": role["name"],
        "review": review
    }


def run_judges(language, task, code):

    # Run the 4 independent judges concurrently in parallel threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(ROLES)) as executor:
        futures = [
            executor.submit(evaluate_judge_role, role, language, task, code)
            for role in ROLES
        ]
        return [f.result() for f in futures]


def run_verifier_and_final_judge(language, task, code, reviews):

    review_text = ""

    for review in reviews:

        review_text += (
            "\n\n--- "
            + review["role"]
            + " ---\n"
            + review["review"]
        )

    prompt = (
        "You are the VERIFIER and FINAL JUDGE of a multi-judge code review system.\n\n"

        + "Your job is to examine the original task, code, and findings from multiple independent judges.\n\n"

        + "IMPORTANT RULES:\n"
        + "1. Cross-examine the judges: Do not blindly trust them. Check whether each claimed problem is actually supported by the task. Reject false positives and keep valid findings.\n"
        + "2. Deliver the final decision: Do not invent requirements. Do not treat optional improvements as actual bugs.\n\n"

        + "Language: " + language + "\n"
        + "Task: " + task + "\n"
        + "Code:\n" + code + "\n\n"

        + "JUDGE FINDINGS:"
        + review_text

        + "\n\n"
        + "Return your output in this format:\n\n"
        + "VERIFIER REPORT:\n"
        + "<Concise verification report examining claims, explaining valid findings and rejected false positives>\n\n"
        + "FINAL VERDICT: CORRECT or INCORRECT\n"
        + "CONFIDENCE: HIGH, MEDIUM or LOW\n"
        + "REASON:\n"
        + "<Clear summary reasoning>\n"
        + "KEY ISSUES:\n"
        + "<Bullet points of actual bugs, or None>\n"
    )

    result = ask_gemma(prompt)

    verification = result
    final_result = result

    if "FINAL VERDICT:" in result:
        parts = result.split("FINAL VERDICT:", 1)
        v_part = parts[0].replace("VERIFIER REPORT:", "").strip()
        f_part = "FINAL VERDICT:" + parts[1]
        if v_part:
            verification = v_part
        if f_part:
            final_result = f_part

    return verification, final_result


@app.route("/")
def home():

    return render_template("index.html")


@app.route("/review", methods=["POST"])
def review():

    data = request.get_json()

    language = data.get("language", "")
    task = data.get("task", "")
    code = data.get("code", "")

    if not language or not task or not code:

        return jsonify({
            "error": "Please provide language, task and code."
        }), 400

    reviews = run_judges(
        language,
        task,
        code
    )

    verification, final_result = run_verifier_and_final_judge(
        language,
        task,
        code,
        reviews
    )

    return jsonify({
        "reviews": reviews,
        "verification": verification,
        "final": final_result
    })


if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )