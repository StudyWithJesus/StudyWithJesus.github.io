// =====================================================
// Global script for exam pages + index pages
// - Floating progress bar
// - Autosave answers
// - Submit / Retake buttons (review mode auto-activates on submit)
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

  // Get questions from container after they've been moved
  const questions = Array.from(questionContainer.querySelectorAll(".question"));

  const progressFill = document.querySelector(".exam-progress-fill, #exam-progress-fill");
  const progressText = document.querySelector(".exam-progress-text, #exam-progress-text");

  // Remove any pre-existing top actions bars
  form.querySelectorAll(".exam-actions-top").forEach(el => el.remove());

  // Find or create the bottom actions container
  let actions = form.querySelector(".exam-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "exam-actions";
    form.appendChild(actions);
  }

  // Find or create the submit button
  let submitBtn = form.querySelector("#submit-btn");
  if (!submitBtn) {
    submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.id = "submit-btn";
    submitBtn.className = "exam-button";
    submitBtn.innerHTML = '<span class="dot"></span><span>Submit Answers</span>';
    actions.appendChild(submitBtn);
  }

  // Find or create the retake button
  let retakeBtn = form.querySelector("#retake-btn");
  if (!retakeBtn) {
    retakeBtn = document.createElement("button");
    retakeBtn.type = "button";
    retakeBtn.id = "retake-btn";
    retakeBtn.className = "exam-button secondary";
    retakeBtn.innerHTML = '<span class="dot"></span><span>Retake &amp; Scramble</span>';
    actions.appendChild(retakeBtn);
  }

  // Create top action buttons (above first question)
  const topActions = document.createElement("div");
  topActions.className = "exam-actions exam-actions-top";
  
  const topSubmitBtn = document.createElement("button");
  topSubmitBtn.type = "button";
  topSubmitBtn.id = "submit-btn-top";
  topSubmitBtn.className = "exam-button";
  topSubmitBtn.innerHTML = '<span class="dot"></span><span>Submit Answers</span>';
  topActions.appendChild(topSubmitBtn);
  
  const topRetakeBtn = document.createElement("button");
  topRetakeBtn.type = "button";
  topRetakeBtn.id = "retake-btn-top";
  topRetakeBtn.className = "exam-button secondary";
  topRetakeBtn.innerHTML = '<span class="dot"></span><span>Retake &amp; Scramble</span>';
  topActions.appendChild(topRetakeBtn);
  
  // Insert top actions before the question container
  questionContainer.parentElement.insertBefore(topActions, questionContainer);

  // Ensure result banner exists
  let resultBanner = document.getElementById("result-banner");
  if (!resultBanner) {
    resultBanner = document.createElement("div");
    resultBanner.id = "result-banner";
    resultBanner.className = "result-banner";
    form.appendChild(resultBanner);
  }

  const examKey = "examState:" + window.location.pathname;
  const shuffleEnabled = true;

  // Shuffle questions & choices on first load if enabled
  if (shuffleEnabled) {
    shuffleQuestions(questionContainer, questions);
  }

  // Restore saved answers
  restoreState(questions, examKey);

  // Update progress bar initially
  updateProgress(questions, progressFill, progressText);

  // Hook question change using event delegation for better performance
  questionContainer.addEventListener("change", (e) => {
    const q = e.target.closest(".question");
    if (q && !q.classList.contains("answered")) {
      q.classList.add("answered");
    }
    updateProgress(questions, progressFill, progressText);
    updateSubmitButtonState();
    saveState(questions, examKey);
  });

  // Function to update submit button state based on answered questions
  function updateSubmitButtonState() {
    const hasAnsweredQuestion = questions.some(q => q.querySelector('input[type="radio"]:checked'));
    const isSubmitted = document.body.classList.contains("submitted-mode");
    
    if (isSubmitted || !hasAnsweredQuestion) {
      submitBtn.disabled = true;
      submitBtn.classList.add("disabled");
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove("disabled");
    }
    
    // Also update top submit button if it exists
    const topSubmitBtnElement = form.querySelector("#submit-btn-top");
    if (topSubmitBtnElement) {
      topSubmitBtnElement.disabled = submitBtn.disabled;
      if (submitBtn.disabled) {
        topSubmitBtnElement.classList.add("disabled");
      } else {
        topSubmitBtnElement.classList.remove("disabled");
      }
    }
  }

  // Function to lock/unlock radio inputs
  function setInputsLocked(locked) {
    const allInputs = form.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < allInputs.length; i++) {
      allInputs[i].disabled = locked;
    }
  }

  // Initially disable submit button (no questions answered yet)
  updateSubmitButtonState();

  // Submit logic - grades exam without showing correct answers
  function handleSubmit() {
    // Prevent submission if already submitted
    if (document.body.classList.contains("submitted-mode")) {
      return;
    }
    
    const result = gradeExam(questions, false); // false = don't show correct answers
    const total = questions.length;
    const score = Math.round((result.correct / total) * 100);

    resultBanner.innerHTML =
      `<strong>${score}%</strong> — ${result.correct} correct, ${result.incorrect} incorrect, ${result.unanswered} unanswered.`;
    resultBanner.classList.add("visible");

    // Enter submitted mode (locks answers, disables submit)
    document.body.classList.add("submitted-mode");
    document.body.classList.add("review-mode");
    
    // Lock all radio inputs
    setInputsLocked(true);
    
    // Disable submit button
    updateSubmitButtonState();
    
    // Scroll to first incorrect question if any
    const firstIncorrect = questions.find(q => q.classList.contains("incorrect"));
    if (firstIncorrect) {
      firstIncorrect.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

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
  }

  // Retake logic (clear + reshuffle)
  function handleRetake() {
    // Clear all question states
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      q.classList.remove("correct", "incorrect", "answered");
      const labels = q.querySelectorAll("label");
      for (let j = 0; j < labels.length; j++) {
        labels[j].classList.remove("correct", "incorrect");
      }
      const inputs = q.querySelectorAll('input[type="radio"]');
      for (let j = 0; j < inputs.length; j++) {
        inputs[j].checked = false;
      }
    }

    resultBanner.classList.remove("visible");
    resultBanner.textContent = "";

    document.body.classList.remove("review-mode");
    document.body.classList.remove("submitted-mode");
    
    // Unlock all radio inputs
    setInputsLocked(false);

    // Re-shuffle on every retake
    if (shuffleEnabled) {
      shuffleQuestions(questionContainer, questions);
    }

    updateProgress(questions, progressFill, progressText);
    
    // Update submit button state (will be disabled since no answers selected)
    updateSubmitButtonState();
    
    try {
      localStorage.removeItem(examKey);
      localStorage.removeItem(examKey + ":lastScore");
    } catch {}
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Attach submit handlers to both buttons
  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleSubmit();
  });

  topSubmitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleSubmit();
  });

  // Attach retake handlers to both buttons
  retakeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleRetake();
  });

  topRetakeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleRetake();
  });
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
// showCorrectAnswers: if false, don't highlight correct labels (for practice mode)
function gradeExam(questions, showCorrectAnswers = true) {
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
      if (showCorrectAnswers) {
        const label = correctInput.closest("label");
        if (label) label.classList.add("correct");
      }
    } else {
      incorrect++;
      q.classList.add("incorrect");
      // Only show the correct answer label if showCorrectAnswers is true
      if (showCorrectAnswers && correctInput) {
        const correctLabel = correctInput.closest("label");
        if (correctLabel) correctLabel.classList.add("correct");
      }
      // Always show the user's incorrect selection
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
