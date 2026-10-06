# 🧑‍⚖️ Gemma Jury — Multi-Judge AI Code Reviewer

> **Many Tiny Judges × Gemma 4**

Gemma Jury is a multi-perspective AI code review system powered by **Gemma 4**.

Instead of relying on a single AI response, Gemma Jury uses multiple specialized Gemma 4 roles to independently analyze the same code from different perspectives. Their findings are then verified, disagreements are resolved, and a final review is generated.

The project directly addresses the **"Many Tiny Judges"** problem statement by testing whether multiple AI perspectives can produce more reliable results than a single model call.

---

## 🎯 Problem

A single AI model can sometimes:

* Miss important bugs
* Produce false positives
* Ignore edge cases
* Overlook security or quality issues
* Give an incorrect judgment with high confidence

For code review, relying on one AI judgment can therefore be unreliable.

### Our question

> **Can multiple independent Gemma 4 judges reviewing the same code produce a more reliable result than a single Gemma 4 reviewer?**

Instead of assuming the answer is "yes", Gemma Jury measures it experimentally.

---

## 💡 Solution

Gemma Jury assigns different review responsibilities to multiple Gemma 4 roles.

Each judge receives the **same task and code**, but evaluates it from a different perspective.

### 🧠 Expert Judge

Focuses on:

* Logical correctness
* Requirements
* Algorithm
* Functional bugs

### 🔎 Skeptic Judge

Attempts to challenge the solution by looking for:

* Hidden bugs
* Incorrect assumptions
* Counterexamples
* Unsupported conclusions

### 🧪 Edge-Case Judge

Checks:

* Empty inputs
* Boundary conditions
* Duplicate values
* Unexpected inputs
* Large inputs

### 🛡️ Security & Quality Judge

Checks:

* Security weaknesses
* Unsafe practices
* Performance concerns
* Code quality

---

## ⚖️ Verification & Reconciliation

The initial judges work independently.

Their findings are then passed to a **Gemma 4 Verifier**.

The verifier checks whether each reported issue is actually supported by the original task and code.

Each finding can be classified as:

* ✅ Confirmed
* ❌ Rejected
* ⚠️ Uncertain

Similar findings from different judges are also reconciled so the same bug is not counted multiple times.

Finally, a **Gemma 4 Final Judge** generates the consolidated review.

---

## 🏗️ Architecture

```text
                 USER
                  │
                  ▼
             TASK + CODE
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
   🧠 Expert   🔎 Skeptic   🧪 Edge Case
   Gemma 4     Gemma 4      Gemma 4
       │          │             │
       └──────────┼─────────────┘
                  │
                  ▼
        🛡️ Security / Quality
              Gemma 4
                  │
                  ▼
           ⚖️ VERIFIER
              Gemma 4
                  │
        Verify & Reconcile
                  │
                  ▼
           🧑‍⚖️ FINAL JUDGE
              Gemma 4
                  │
                  ▼
             FINAL REVIEW
```

---

## 🔄 How It Works

### 1. User Input

The user provides:

* Programming language
* Problem statement
* Candidate code

### 2. Independent Review

The same input is sent to multiple Gemma 4 roles.

Each role produces structured findings according to its responsibility.

### 3. Finding Collection

The system collects all findings from the judges.

### 4. Verification

The Verifier Gemma checks the findings against the original code and problem.

### 5. Reconciliation

Duplicate, conflicting, rejected, and uncertain findings are identified.

### 6. Final Review

The Final Judge generates a consolidated result containing:

* Overall verdict
* Confirmed issues
* Severity
* Explanation
* Confidence
* Suggested improvements

---

## 🧪 Proving Whether Multiple Judges Help

The project does not assume that more AI calls automatically mean better results.

We compare two approaches:

### Single-Gemma Baseline

```text
Task + Code
     ↓
Gemma 4
     ↓
Code Review
```

### Multi-Judge Approach

```text
Task + Code
     ↓
Multiple Gemma 4 Judges
     ↓
Verifier
     ↓
Final Judge
     ↓
Code Review
```

Both systems are tested on the **same evaluation dataset**.

### Metrics

We evaluate:

* **Bug Detection**
* **Precision**
* **Recall**
* **False Positive Rate**
* **Severity Accuracy**
* **Latency**

This allows us to identify:

> Where multiple perspectives improve code review, and where they do not.

---

## 🧩 Example

### Input

```python
def second_largest(arr):
    arr.sort()
    return arr[-2]
```

### Possible Judge Findings

```text
Expert:
Potential correctness issue with duplicate values.

Skeptic:
Counterexample found: [5, 5, 4]

Edge-Case:
Fails when fewer than two unique values exist.

Security/Quality:
No significant security issue.
```

### Verifier

```text
✓ Duplicate-value issue confirmed
✓ Edge-case issue confirmed
✓ Security finding valid
```

### Final Review

```text
❌ CODE NEEDS FIXES

High:
Duplicate values are not handled correctly.

Medium:
Insufficient unique values are not handled.

Security:
No significant security issue detected.
```

---

## 🛠️ Technology Stack

| Component         | Technology             |
| ----------------- | ---------------------- |
| AI Model          | **Gemma 4**            |
| AI Orchestration  | Python                 |
| Backend           | Python                 |
| Frontend          | Web UI                 |
| Output Processing | Structured JSON        |
| Evaluation        | Python-based benchmark |
| Version Control   | Git + GitHub           |

---

## ⭐ Key Features

* Multiple specialized Gemma 4 judges
* Independent code analysis
* Skeptical review
* Edge-case detection
* Security and quality analysis
* Finding verification
* Disagreement detection
* Finding reconciliation
* Final consolidated review
* Single vs Multi-Judge benchmark
* Confidence and severity reporting

---

## 📊 Why This Approach?

A single model gives one perspective.

Gemma Jury introduces **structured diversity of reasoning**:

```text
One Perspective
      ↓
   Gemma 4
      ↓
One Review
```

versus:

```text
Multiple Perspectives
      ↓
Gemma 4 × Specialized Roles
      ↓
Verification
      ↓
Reconciliation
      ↓
Final Review
```

The goal is not to blindly trust a majority vote.

The goal is to **independently identify issues and then verify the evidence behind those issues**.

---

## ⚠️ Limitations

Gemma Jury also has trade-offs.

* Multiple model calls increase latency.
* Multiple calls increase token/inference usage.
* Different roles still use the same underlying Gemma 4 model.
* Shared model limitations can sometimes lead to shared mistakes.
* AI-generated reviews should not replace human code review for critical software.

Therefore, the benchmark is an important part of the project.

---

## 🚀 Project Status

**Hackathon MVP — In Development**

Current focus:

* [x] Define multi-judge architecture
* [x] Define specialized judging roles
* [ ] Gemma 4 integration
* [ ] Independent judge pipeline
* [ ] Verifier
* [ ] Final Judge
* [ ] Web interface
* [ ] Evaluation dataset
* [ ] Single vs Multi-Judge benchmark
* [ ] Performance analysis

---

## 🔮 Future Improvements

Possible future extensions include:

* Support for more programming languages
* GitHub repository/code integration
* IDE integration
* Automated test generation
* Code execution sandbox
* Historical review tracking
* More specialized judges
* Adaptive judge selection
* Human-in-the-loop verification

---

## 🎓 Problem Statement Alignment

**Problem Statement: Many Tiny Judges**

The project satisfies the core requirements by:

| Requirement                       | Gemma Jury |
| --------------------------------- | ---------- |
| Multiple Gemma roles              | ✅          |
| Same input examined independently | ✅          |
| Different perspectives            | ✅          |
| Disagreement handling             | ✅          |
| Reconciliation                    | ✅          |
| Final response                    | ✅          |
| Compare against single model      | ✅          |
| Measure improvement               | ✅          |

---

## 👨‍💻 Project

**Gemma Jury — Multi-Judge AI Code Reviewer**

Built as a hackathon project exploring whether **multiple lightweight Gemma 4 perspectives can improve the reliability of AI-assisted code review.**

---

## 📜 License

This project is intended for educational and hackathon purposes.
