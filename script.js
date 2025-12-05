// =====================================================
// Global script for exam pages + index pages
// - Floating progress bar
// - Autosave answers
// - Submit / Retake / Review wrong answers
// - Last score per exam (ILM) for index pages
// =====================================================

// Run immediately on load (handles scripts at bottom of body)
;(function() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();

function initAll() {
  initExamPage();
  initExamIndexScores();
}

// ----------------------
// Exam page behaviour
// ----------------------
function initExamPage() {
  const form = document.querySelector(".exam-form, #quiz-form");
  if (!form) return; // not on an exam page

  // Collect all question blocks
  const questionNodes = Array.from(form.querySelectorAll(".question"));
  if (!questionNodes.length) return;

  // Ensure all questions live inside a dedicated container so we can shuffle
  let questionContainer = form.querySelector(".question-list");
  if (!questionContainer) {
    questionContainer = document.createElement("div");
    questionContainer.className = "question-list";
    const firstQuestion = questionNodes[0];
    const parent = firstQuestion.parentElement;
    parent.insertBefore(questionContainer, firstQuestion);
    questionNodes.forEach(q => questionContainer.appendChild(q));
  }

  const questions = Array.from(questionContainer.querySelectorAll(".question"));

  const progressFill = document.querySelector(".exam-progress-fill, #exam-progress-fill");
  const progressText = document.querySelector(".exam-progress-text, #exam-progress-text");

  // Remove any pre-existing top actions bars; we'll manage them in JS
  form.querySelectorAll(".exam-actions-top").forEach(el => el.remove());

  // Ensure we have a single bottom actions container and ordered buttons
  let actions = form.querySelector(".exam-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "exam-actions";
  }

  // Find or create the main buttons
  let submitBtn = form.querySelector("#submit-btn");
  if (!submitBtn) {
    submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.id = "submit-btn";
    submitBtn.className = "exam-button";
    submitBtn.innerHTML = '<span class="dot"></span><span>Submit Answers</span>';
  }

  let retakeBtn = form.querySelector("#retake-btn");
  if (!retakeBtn) {
    retakeBtn = document.createElement("button");
    retakeBtn.type = "button";
    retakeBtn.id = "retake-btn";
    retakeBtn.className = "exam-button secondary";
    retakeBtn.innerHTML = '<span class="dot"></span><span>Retake &amp; Scramble</span>';
  }

  let reviewBtn = form.querySelector("#review-btn");
  if (!reviewBtn) {
    reviewBtn = document.createElement("button");
    reviewBtn.type = "button";
    reviewBtn.id = "review-btn";
    reviewBtn.className = "exam-button ghost";
    reviewBtn.textContent = "Review wrong answers";
  }

  // Place the actions container directly after the questions container
  const qParent = questionContainer.parentElement;
  qParent.insertBefore(actions, questionContainer.nextSibling);

  // Ensure actions only has these three, in order
  actions.innerHTML = "";
  actions.appendChild(submitBtn);
  actions.appendChild(retakeBtn);
  actions.appendChild(reviewBtn);

  // Ensure result banner exists just after actions
  let resultBanner = document.getElementById("result-banner");
  if (!resultBanner) {
    resultBanner = document.createElement("div");
    resultBanner.id = "result-banner";
    resultBanner.className = "result-banner";
  }
  if (resultBanner.parentElement !== form) {
    form.appendChild(resultBanner);
  }
  if (resultBanner.previousElementSibling !== actions) {
    actions.insertAdjacentElement("afterend", resultBanner);
  }

  const examKey = "examState:" + window.location.pathname;
  const shuffleEnabled = true; // scramble enabled with dedicated container

  // Shuffle questions & choices on first load if enabled
  if (shuffleEnabled) {
    shuffleQuestions(questionContainer, questions);
  }
  // Restore saved answers
  restoreState(questions, examKey);

  // Hook question change using event delegation for better performance
  questionContainer.addEventListener("change", (e) => {
    const q = e.target.closest(".question");
    if (q && !q.classList.contains("answered")) {
      q.classList.add("answered");
    }
    updateProgress(questions, progressFill, progressText);
    saveState(questions, examKey);
  });

  updateProgress(questions, progressFill, progressText);

  // Submit handler
  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const result = gradeExam(questions);
    const total = questions.length;
    const score = Math.round((result.correct / total) * 100);

    resultBanner.innerHTML =
      `<strong>${score}%</strong> — ${result.correct} correct, ${result.incorrect} incorrect, ${result.unanswered} unanswered.`;
    resultBanner.classList.add("visible");

    document.body.classList.remove("review-mode");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Persist last score for this exam
    try {
      localStorage.setItem(examKey + ":lastScore", String(score));
    } catch {}

    const examId = getExamIdFromTitle();
    if (examId) {
      try {
        localStorage.setItem("examScore:" + examId, String(score));
      } catch {}
    }
  });

  // Retake handler (clear + reshuffle)
  retakeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // Cache labels and inputs for each question to avoid repeated queries
    questions.forEach(q => {
      q.classList.remove("correct", "incorrect", "answered");
      const labels = q.querySelectorAll("label");
      for (let i = 0; i < labels.length; i++) {
        labels[i].classList.remove("correct", "incorrect");
      }
      const inputs = q.querySelectorAll('input[type="radio"]');
      for (let i = 0; i < inputs.length; i++) {
        inputs[i].checked = false;
      }
    });

    resultBanner.classList.remove("visible");
    resultBanner.textContent = "";

    document.body.classList.remove("review-mode");

    // Re-shuffle on every retake if enabled
    if (shuffleEnabled) {
      const qs = Array.from(questionContainer.querySelectorAll(".question"));
      shuffleQuestions(questionContainer, qs);
    }

    updateProgress(questions, progressFill, progressText);
    try {
      localStorage.removeItem(examKey);
      localStorage.removeItem(examKey + ":lastScore");
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Review wrong answers handler
  reviewBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // Toggle review mode
    const isActive = document.body.classList.toggle("review-mode");
    if (isActive) {
      const firstIncorrect = questions.find(q => q.classList.contains("incorrect"));
      if (firstIncorrect) {
        firstIncorrect.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  // Create a mirrored TOP actions bar that proxies to the bottom buttons
  let topActions = form.querySelector(".exam-actions-top");
  if (!topActions) {
    topActions = document.createElement("div");
    topActions.className = "exam-actions exam-actions-top";

    const topSubmit = document.createElement("button");
    topSubmit.type = "button";
    topSubmit.className = "exam-button";
    topSubmit.innerHTML = '<span class="dot"></span><span>Submit Answers</span>';

    const topRetake = document.createElement("button");
    topRetake.type = "button";
    topRetake.className = "exam-button secondary";
    topRetake.innerHTML = '<span class="dot"></span><span>Retake &amp; Scramble</span>';

    const topReview = document.createElement("button");
    topReview.type = "button";
    topReview.className = "exam-button ghost";
    topReview.textContent = "Review wrong answers";

    topActions.appendChild(topSubmit);
    topActions.appendChild(topRetake);
    topActions.appendChild(topReview);

    const parent = questionContainer.parentElement;
    parent.insertBefore(topActions, questionContainer);

    topSubmit.addEventListener("click", () => submitBtn.click());
    topRetake.addEventListener("click", () => retakeBtn.click());
    topReview.addEventListener("click", () => reviewBtn.click());
  }
}

function updateProgress(questions, progressFill, progressText) {
  if (!progressFill || !progressText) return;
  const total = questions.length;
  // Use for loop instead of reduce for better performance
  let answered = 0;
  for (let i = 0; i < total; i++) {
    if (questions[i].querySelector('input[type="radio"]:checked')) {
      answered++;
    }
  }
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  progressFill.style.width = pct + "%";
  progressText.textContent = `${answered} / ${total} answered`;
}

// Uses window.ANSWERS mapping for correctness
function gradeExam(questions) {
  const answerMap = (window.ANSWERS || {});
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    q.classList.remove("correct", "incorrect");
    
    // Use for loop for labels instead of forEach
    const labels = q.querySelectorAll("label");
    for (let j = 0; j < labels.length; j++) {
      labels[j].classList.remove("correct", "incorrect");
    }

    const anyRadio = q.querySelector('input[type="radio"]');
    if (!anyRadio) {
      unanswered++;
      continue;
    }
    
    const name = anyRadio.name;
    const chosen = q.querySelector('input[type="radio"]:checked');
    const correctVal = answerMap[name];
    
    // Cache CSS.escape results
    const escapedName = CSS.escape(name);
    const correctInput = correctVal != null
      ? q.querySelector(`input[type="radio"][name="${escapedName}"][value="${CSS.escape(correctVal)}"]`)
      : null;

    if (!chosen) {
      unanswered++;
      continue;
    }

    if (correctInput && chosen === correctInput) {
      correct++;
      q.classList.add("correct");
      const label = correctInput.closest("label");
      if (label) label.classList.add("correct");
    } else {
      incorrect++;
      q.classList.add("incorrect");
      if (correctInput) {
        const correctLabel = correctInput.closest("label");
        if (correctLabel) correctLabel.classList.add("correct");
      }
      const chosenLabel = chosen.closest("label");
      if (chosenLabel) chosenLabel.classList.add("incorrect");
    }
  }

  return { correct, incorrect, unanswered };
}

function saveState(questions, key) {
  const state = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const radio = q.querySelector('input[type="radio"]');
    if (!radio) continue;
    const name = radio.name;
    const checked = q.querySelector('input[type="radio"]:checked');
    state.push({ name, value: checked ? checked.value : null });
  }

  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn("Unable to save exam state", e);
  }
}

function restoreState(questions, key) {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    saved = null;
  }
  if (!saved || !Array.isArray(saved)) return;

  // Build lookup map for saved answers
  const savedByName = new Map();
  for (let i = 0; i < saved.length; i++) {
    const entry = saved[i];
    if (entry && entry.name) savedByName.set(entry.name, entry.value);
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const firstRadio = q.querySelector('input[type="radio"]');
    if (!firstRadio) continue;
    
    const name = firstRadio.name;
    const value = savedByName.get(name);
    if (!value) continue;
    
    // Cache CSS.escape results
    const match = q.querySelector(`input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`);
    if (match) {
      match.checked = true;
      q.classList.add("answered");
    }
  }
}

// Fisher–Yates shuffle for questions + labels
function shuffleQuestions(container, questions) {
  // Shuffle question blocks using Fisher-Yates algorithm
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Use DocumentFragment for batch DOM updates
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < shuffled.length; i++) {
    fragment.appendChild(shuffled[i]);
  }
  container.appendChild(fragment);

  // Shuffle options within each question
  for (let i = 0; i < shuffled.length; i++) {
    const q = shuffled[i];
    const labels = q.querySelectorAll("label");
    if (!labels.length) continue;
    
    const parent = labels[0].parentElement;
    const shuffledLabels = Array.from(labels);
    
    // Fisher-Yates shuffle for labels
    for (let j = shuffledLabels.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffledLabels[j], shuffledLabels[k]] = [shuffledLabels[k], shuffledLabels[j]];
    }
    
    // Use DocumentFragment for batch label updates
    const labelFragment = document.createDocumentFragment();
    for (let j = 0; j < shuffledLabels.length; j++) {
      labelFragment.appendChild(shuffledLabels[j]);
    }
    parent.appendChild(labelFragment);
  }
}

// Try to derive exam id like "270202a" or "270202eA" from the page title
function getExamIdFromTitle() {
  const title = document.title || "";
  const match = title.match(/^(27\d{3}[0-9A-Za-z]*)\s*-/);
  return match ? match[1] : null;
}

// ----------------------
// Exam index pages: last score per ILM
// ----------------------
function initExamIndexScores() {
  const cards = document.querySelectorAll(".exam-card[data-exam-id]");
  if (!cards.length) return;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const examId = card.getAttribute("data-exam-id");
    const span = card.querySelector("[data-exam-score]");
    if (!examId || !span) continue;
    
    let score = null;
    try {
      const stored = localStorage.getItem("examScore:" + examId);
      if (stored != null) score = parseInt(stored, 10);
    } catch {}
    
    span.textContent = (score != null && !Number.isNaN(score)) ? `${score}%` : "No attempts yet";
  }
}
