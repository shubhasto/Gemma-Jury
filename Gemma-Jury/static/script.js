/**
 * ==========================================================================
 * GEMMA JURY - MULTI-JUDGE AI CODE REVIEW SYSTEM
 * Client-Side Application Controller
 * ==========================================================================
 */

// Preset scenarios for immediate testing
const PRESET_SCENARIOS = {
  binary_search_bug: {
    name: "Off-by-One Binary Search",
    type: "Buggy",
    language: "Python",
    task: "Implement binary search to find target index in a sorted list. Return -1 if not found.",
    code: `def binary_search(nums, target):
    left = 0
    # BUG: right should be len(nums) - 1, causes IndexError or out-of-bounds
    right = len(nums)

    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
            
    return -1`
  },

  sql_injection_bug: {
    name: "SQL Injection Query",
    type: "Buggy",
    language: "JavaScript",
    task: "Fetch user profile by username safely from the database.",
    code: `async function getUserProfile(db, username) {
    // BUG: Vulnerable to SQL injection via raw string concatenation
    const query = "SELECT id, username, email FROM users WHERE username = '" + username + "'";
    const result = await db.query(query);
    return result.rows[0] || null;
}`
  },

  zero_division_bug: {
    name: "Zero Division in Average",
    type: "Buggy",
    language: "Python",
    task: "Calculate the average score of students from a list of test numbers.",
    code: `def calculate_average(scores):
    # BUG: Fails with ZeroDivisionError when scores list is empty []
    total = sum(scores)
    return total / len(scores)`
  },

  correct_palindrome: {
    name: "Robust Palindrome",
    type: "Correct",
    language: "Python",
    task: "Determine if a string is a palindrome, considering only alphanumeric characters and ignoring cases.",
    code: `def is_palindrome(s: str) -> bool:
    left, right = 0, len(s) - 1
    
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
            
        if s[left].lower() != s[right].lower():
            return False
            
        left += 1
        right -= 1
        
    return True`
  },

  correct_lru: {
    name: "Correct Fibonacci (DP)",
    type: "Correct",
    language: "Python",
    task: "Compute the n-th Fibonacci number efficiently for n >= 0 with O(n) time and O(1) space.",
    code: `def fibonacci(n: int) -> int:
    if n < 0:
        raise ValueError("n must be non-negative")
    if n in (0, 1):
        return n
        
    prev2, prev1 = 0, 1
    for _ in range(2, n + 1):
        curr = prev1 + prev2
        prev2 = prev1
        prev1 = curr
        
    return prev1`
  }
};

// Application State
const GemmaJury = {
  isDeliberating: false,
  timerInterval: null,
  startTime: null,
  currentPreset: null,

  init() {
    this.bindElements();
    this.attachEvents();
    this.initTheme();
    this.updateLineNumbers();
    this.loadPreset('binary_search_bug'); // Set default demo
  },

  initTheme() {
    const savedTheme = localStorage.getItem("gemma_jury_theme") || "gold";
    this.setTheme(savedTheme);

    document.querySelectorAll(".btn-theme-dot").forEach(btn => {
      btn.addEventListener("click", () => {
        const theme = btn.dataset.theme;
        this.setTheme(theme);
      });
    });
  },

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gemma_jury_theme", theme);
    document.querySelectorAll(".btn-theme-dot").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.theme === theme);
    });
  },

  bindElements() {
    this.langInput = document.getElementById("language");
    this.taskInput = document.getElementById("task");
    this.codeInput = document.getElementById("code");
    this.lineNumbers = document.getElementById("lineNumbers");
    this.editorStats = document.getElementById("editorStats");
    this.reviewBtn = document.getElementById("reviewButton");
    this.clearBtn = document.getElementById("clearButton");
    this.copyCodeBtn = document.getElementById("copyCodeButton");
    this.errorBanner = document.getElementById("errorBanner");
    this.errorMessage = document.getElementById("errorMessage");
    this.loadingBox = document.getElementById("loadingBox");
    this.resultsContainer = document.getElementById("results");
    this.deliberationTimer = document.getElementById("deliberationTimer");
  },

  attachEvents() {
    // Line numbers & syntax text tracking
    this.codeInput.addEventListener("input", () => {
      this.updateLineNumbers();
      this.updateStats();
    });

    this.codeInput.addEventListener("scroll", () => {
      this.lineNumbers.scrollTop = this.codeInput.scrollTop;
    });

    // Tab key support in code textarea
    this.codeInput.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.codeInput.selectionStart;
        const end = this.codeInput.selectionEnd;
        const indent = "    ";
        this.codeInput.value = this.codeInput.value.substring(0, start) + indent + this.codeInput.value.substring(end);
        this.codeInput.selectionStart = this.codeInput.selectionEnd = start + indent.length;
        this.updateLineNumbers();
        this.updateStats();
      }

      // Keyboard shortcut: Ctrl + Enter or Cmd + Enter to run
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.startReview();
      }
    });

    // Language pills quick selection
    document.querySelectorAll(".lang-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        const lang = pill.dataset.lang;
        this.langInput.value = lang;
        document.querySelectorAll(".lang-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.updateEditorTab(lang);
      });
    });

    this.langInput.addEventListener("input", () => {
      this.updateEditorTab(this.langInput.value.trim());
    });

    // Preset scenarios
    document.querySelectorAll(".btn-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        const presetKey = btn.dataset.preset;
        this.loadPreset(presetKey);
      });
    });

    // Action buttons
    this.reviewBtn.addEventListener("click", () => this.startReview());
    this.clearBtn.addEventListener("click", () => this.clearWorkbench());
    this.copyCodeBtn.addEventListener("click", () => this.copyCodeToClipboard());
  },

  updateEditorTab(lang) {
    const tabEl = document.getElementById("editorTabLabel");
    if (!tabEl) return;
    const l = (lang || "code").toLowerCase();
    let ext = "txt";
    if (l.includes("python")) ext = "py";
    else if (l.includes("javascript")) ext = "js";
    else if (l.includes("typescript")) ext = "ts";
    else if (l.includes("c++") || l.includes("cpp")) ext = "cpp";
    else if (l.includes("java")) ext = "java";
    else if (l.includes("rust")) ext = "rs";
    else if (l.includes("go")) ext = "go";
    tabEl.textContent = `solution.${ext}`;
  },

  loadPreset(key) {
    const preset = PRESET_SCENARIOS[key];
    if (!preset) return;

    this.langInput.value = preset.language;
    this.taskInput.value = preset.task;
    this.codeInput.value = preset.code;

    // Highlight active pill
    document.querySelectorAll(".lang-pill").forEach(pill => {
      pill.classList.toggle("active", pill.dataset.lang.toLowerCase() === preset.language.toLowerCase());
    });

    // Highlight active preset button
    document.querySelectorAll(".btn-preset").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === key);
    });

    this.updateEditorTab(preset.language);
    this.updateLineNumbers();
    this.updateStats();
    this.hideError();
  },

  updateLineNumbers() {
    const lines = this.codeInput.value.split("\n");
    const count = Math.max(lines.length, 1);
    let html = "";
    for (let i = 1; i <= count; i++) {
      html += `<div>${i}</div>`;
    }
    this.lineNumbers.innerHTML = html;
  },

  updateStats() {
    const lines = this.codeInput.value.split("\n").length;
    const chars = this.codeInput.value.length;
    if (this.editorStats) {
      this.editorStats.textContent = `${lines} lines • ${chars} chars`;
    }
  },

  clearWorkbench() {
    this.langInput.value = "";
    this.taskInput.value = "";
    this.codeInput.value = "";
    this.updateLineNumbers();
    this.updateStats();
    this.hideError();
    document.querySelectorAll(".lang-pill, .btn-preset").forEach(el => el.classList.remove("active"));
  },

  copyCodeToClipboard() {
    if (!this.codeInput.value) return;
    navigator.clipboard.writeText(this.codeInput.value).then(() => {
      const origText = this.copyCodeBtn.innerHTML;
      this.copyCodeBtn.innerHTML = "✓ Copied";
      setTimeout(() => {
        this.copyCodeBtn.innerHTML = origText;
      }, 1800);
    });
  },

  showError(msg) {
    this.errorMessage.textContent = msg;
    this.errorBanner.classList.add("show");
  },

  hideError() {
    this.errorBanner.classList.remove("show");
  },

  startDeliberationAnimation() {
    this.isDeliberating = true;
    this.startTime = Date.now();
    this.loadingBox.classList.add("show");
    this.deliberationTimer.textContent = "00:00s";

    const steps = [
      { id: "step-correctness", delay: 0, text: "Verifying task requirements & logic paths..." },
      { id: "step-skeptic", delay: 6500, text: "Probing adversarial flaws & edge traps..." },
      { id: "step-edgecase", delay: 13000, text: "Stress testing boundaries & scale extremes..." },
      { id: "step-quality", delay: 19500, text: "Auditing complexity, performance & idioms..." },
      { id: "step-verifier", delay: 26000, text: "Cross-examining findings & pruning false alarms..." },
      { id: "step-final", delay: 33000, text: "Synthesizing consensus & final gavel verdict..." }
    ];

    // Reset steps
    steps.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        el.className = "pipeline-step";
        const statusEl = el.querySelector(".step-status");
        if (statusEl) statusEl.textContent = "Pending";
      }
    });

    // Animate steps based on elapsed timer
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const seconds = (elapsed / 1000).toFixed(1);
      this.deliberationTimer.textContent = `${seconds < 10 ? '0' : ''}${seconds}s`;

      steps.forEach((s, idx) => {
        const el = document.getElementById(s.id);
        if (!el) return;
        const statusEl = el.querySelector(".step-status");

        if (elapsed >= s.delay && (idx === steps.length - 1 || elapsed < steps[idx + 1].delay)) {
          el.className = "pipeline-step active";
          if (statusEl) statusEl.textContent = s.text;
        } else if (elapsed > s.delay) {
          el.className = "pipeline-step completed";
          if (statusEl) statusEl.textContent = "Completed ✓";
        }
      });
    }, 100);
  },

  stopDeliberationAnimation() {
    this.isDeliberating = false;
    clearInterval(this.timerInterval);
    this.loadingBox.classList.remove("show");
  },

  async startReview() {
    const language = this.langInput.value.trim();
    const task = this.taskInput.value.trim();
    const code = this.codeInput.value.trim();

    if (!language || !task || !code) {
      this.showError("Please fill out all fields: Programming Language, Task, and Code.");
      return;
    }

    this.hideError();
    this.reviewBtn.disabled = true;
    this.reviewBtn.innerHTML = `<span>⚖️</span> Gemma Judges Deliberating...`;
    this.resultsContainer.classList.remove("show");

    const emptyState = document.getElementById("emptyState");
    if (emptyState) emptyState.style.display = "none";

    this.startDeliberationAnimation();

    try {
      const response = await fetch("/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          language: language,
          task: task,
          code: code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server returned error (${response.status})`);
      }

      this.renderResults(data);
      this.resultsContainer.classList.add("show");

      // Smooth scroll to results on smaller screens
      if (window.innerWidth < 1200) {
        this.resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      }

    } catch (err) {
      console.error("Gemma Jury Review Error:", err);
      this.showError(err.message || "Failed to connect to Gemma backend. Please ensure Flask is running.");
      if (emptyState) emptyState.style.display = "block";
    } finally {
      this.stopDeliberationAnimation();
      this.reviewBtn.disabled = false;
      this.reviewBtn.innerHTML = `<span>⚖️</span> Convene the Jury`;
    }
  },

  renderResults(data) {
    this.renderFinalVerdict(data.final || "");
    this.renderVerifier(data.verification || "");
    this.renderJudges(data.reviews || []);
  },

  renderFinalVerdict(finalText) {
    const verdictHero = document.getElementById("verdictHero");
    const verdictTitle = document.getElementById("verdictTitle");
    const verdictGavel = document.getElementById("verdictGavelIcon");
    const confidenceVal = document.getElementById("confidenceValue");
    const reasonContainer = document.getElementById("verdictReason");
    const issuesContainer = document.getElementById("verdictKeyIssues");
    const rawContainer = document.getElementById("verdictRawContent");

    // Clean text
    rawContainer.textContent = finalText;

    // Detect Verdict: CORRECT vs INCORRECT accurately
    let isCorrect = false;
    let isIncorrect = false;

    const verdictMatch = finalText.match(/FINAL\s*VERDICT\s*:\s*(CORRECT|INCORRECT)/i);
    if (verdictMatch) {
      if (verdictMatch[1].toUpperCase() === "CORRECT") {
        isCorrect = true;
      } else {
        isIncorrect = true;
      }
    } else {
      // Fallback heuristics if prompt structure deviates slightly
      if (/\bINCORRECT\b/i.test(finalText)) {
        isIncorrect = true;
      } else if (/\bCORRECT\b/i.test(finalText)) {
        isCorrect = true;
      }
    }

    verdictHero.className = "verdict-hero";

    if (isCorrect) {
      verdictHero.classList.add("correct");
      verdictGavel.textContent = "✅";
      verdictTitle.textContent = "PASSED: CORRECT";
    } else if (isIncorrect) {
      verdictHero.classList.add("incorrect");
      verdictGavel.textContent = "❌";
      verdictTitle.textContent = "REJECTED: INCORRECT";
    } else {
      verdictHero.classList.add("neutral");
      verdictGavel.textContent = "⚖️";
      verdictTitle.textContent = "INCONCLUSIVE / MIXED";
    }

    // Detect Confidence: HIGH, MEDIUM, LOW
    let confidence = "HIGH";
    const confMatch = finalText.match(/CONFIDENCE\s*:\s*(HIGH|MEDIUM|LOW)/i);
    if (confMatch) {
      confidence = confMatch[1].toUpperCase();
    }

    confidenceVal.textContent = confidence;
    confidenceVal.className = `confidence-val ${confidence.toLowerCase()}`;

    // Extract Reason
    let reasonText = "";
    const reasonMatch = finalText.match(/REASON\s*:\s*([\s\S]*?)(?=(KEY ISSUES|$))/i);
    if (reasonMatch && reasonMatch[1].trim()) {
      reasonText = reasonMatch[1].trim();
    } else {
      reasonText = finalText.split("\n")[0] || "Evaluation completed across all independent judges.";
    }
    reasonContainer.innerHTML = this.formatMarkdown(reasonText);

    // Extract Key Issues
    let issuesText = "";
    const issuesMatch = finalText.match(/KEY ISSUES\s*:\s*([\s\S]*)$/i);
    if (issuesMatch && issuesMatch[1].trim()) {
      issuesText = issuesMatch[1].trim();
    }
    if (issuesText && issuesText !== "None" && issuesText !== "None." && issuesText !== "N/A") {
      issuesContainer.style.display = "block";
      issuesContainer.innerHTML = `<strong>Key Issues Identified:</strong><br>${this.formatMarkdown(issuesText)}`;
    } else {
      issuesContainer.style.display = "none";
    }
  },

  renderVerifier(verificationText) {
    const verifierBody = document.getElementById("verificationBody");
    if (!verifierBody) return;
    verifierBody.innerHTML = this.formatMarkdown(verificationText);
  },

  renderJudges(reviews) {
    const judgesGrid = document.getElementById("judgesGrid");
    const countBadge = document.getElementById("judgesCountBadge");
    if (!judgesGrid) return;

    judgesGrid.innerHTML = "";
    countBadge.textContent = `${reviews.length} Active Judges`;

    // Role definitions for styling and icons
    const roleMeta = {
      "CORRECTNESS JUDGE": {
        icon: "🎯",
        class: "role-correctness",
        sub: "Requirements & Logic Verification"
      },
      "SKEPTIC JUDGE": {
        icon: "🕵️",
        class: "role-skeptic",
        sub: "Adversarial Flaw & Bug Discovery"
      },
      "EDGE-CASE JUDGE": {
        icon: "⚡",
        class: "role-edge-case",
        sub: "Boundary & Extreme Input Stress Test"
      },
      "QUALITY JUDGE": {
        icon: "💎",
        class: "role-quality",
        sub: "Safety, Performance & Code Standards"
      }
    };

    reviews.forEach((item, index) => {
      const roleUpper = (item.role || "").toUpperCase();
      const meta = roleMeta[roleUpper] || {
        icon: "⚖️",
        class: "role-custom",
        sub: "Independent Reviewer"
      };

      const reviewText = item.review || "";

      // Parse Problem Found: YES or NO
      let problemStatus = "unknown";
      let problemText = "Finding";
      if (/Problem\s*Found\s*:\s*YES/i.test(reviewText)) {
        problemStatus = "yes";
        problemText = "Problem Found: YES";
      } else if (/Problem\s*Found\s*:\s*NO/i.test(reviewText)) {
        problemStatus = "no";
        problemText = "Problem Found: NO";
      }

      // Parse Severity: Critical, Major, Minor, None
      let severity = "none";
      const sevMatch = reviewText.match(/Severity\s*:\s*(Critical|Major|Minor|None)/i);
      if (sevMatch) {
        severity = sevMatch[1].toLowerCase();
      }

      const card = document.createElement("div");
      card.className = `judge-card ${meta.class}`;

      card.innerHTML = `
        <div class="judge-card-header">
          <div class="judge-identity">
            <div class="judge-avatar">${meta.icon}</div>
            <div class="judge-info-text">
              <span class="judge-number">Judge #${index + 1}</span>
              <h4 class="judge-title">${this.escapeHtml(item.role)}</h4>
            </div>
          </div>
          <div class="judge-status-chips">
            <span class="problem-chip ${problemStatus}">
              ${problemStatus === 'yes' ? '⚠️' : problemStatus === 'no' ? '✓' : '•'} ${problemText}
            </span>
            <span class="severity-chip ${severity}">
              ${severity} severity
            </span>
          </div>
        </div>
        <div class="judge-card-body formatted-content">
          ${this.formatMarkdown(reviewText)}
        </div>
      `;

      judgesGrid.appendChild(card);
    });
  },

  // Lightweight markdown & safe HTML formatter
  formatMarkdown(text) {
    if (!text) return "";

    let escaped = this.escapeHtml(text);

    // Format headers
    escaped = escaped.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h2>$1</h2>');

    // Bold & italic
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks (with or without language specifier)
    escaped = escaped.replace(/```(?:[a-zA-Z0-9_\-+]*)\s*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Numbered & bullet list items
    escaped = escaped.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    escaped = escaped.replace(/^\s*(\d+\.)\s+(.*$)/gim, '<li><strong>$1</strong> $2</li>');

    // Wrap consecutive <li> into <ul>
    escaped = escaped.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    escaped = escaped.replace(/<\/ul>\s*<ul>/g, '');

    // Convert newlines not already part of lists or block elements into line breaks
    escaped = escaped.replace(/\n\n/g, '<br><br>');
    escaped = escaped.replace(/(?<!(>|\n))\n(?!(<|\n))/g, '<br>');

    return escaped;
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  toggleRawVerdict() {
    const rawBox = document.getElementById("verdictRawContent");
    const toggleBtn = document.getElementById("btnToggleRaw");
    if (!rawBox) return;

    if (rawBox.style.display === "block") {
      rawBox.style.display = "none";
      if (toggleBtn) toggleBtn.innerHTML = `<span>👁️</span> Show Raw Gavel Decision`;
    } else {
      rawBox.style.display = "block";
      if (toggleBtn) toggleBtn.innerHTML = `<span>Hide Raw Gavel Decision</span>`;
    }
  }
};

// Global initializer
window.addEventListener("DOMContentLoaded", () => {
  GemmaJury.init();
});
