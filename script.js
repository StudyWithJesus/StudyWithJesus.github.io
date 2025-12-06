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

  // Ensure result banner exists at the bottom
  let resultBanner = document.getElementById("result-banner");
  if (!resultBanner) {
    resultBanner = document.createElement("div");
    resultBanner.id = "result-banner";
    resultBanner.className = "result-banner";
    form.appendChild(resultBanner);
  }

  // Create a top result banner (above the first question)
  let topResultBanner = document.getElementById("result-banner-top");
  if (!topResultBanner) {
    topResultBanner = document.createElement("div");
    topResultBanner.id = "result-banner-top";
    topResultBanner.className = "result-banner result-banner-top";
    topActions.parentElement.insertBefore(topResultBanner, topActions);
  }

  const examKey = "examState:" + window.location.pathname;
  const orderKey = "examOrder:" + window.location.pathname;

  // Check if there are any saved answers before shuffling
  // Only shuffle on initial load if NO answers have been saved
  let hasSavedAnswers = false;
  let hasSavedOrder = false;
  try {
    const savedState = JSON.parse(localStorage.getItem(examKey) || "null");
    if (savedState && Array.isArray(savedState)) {
      hasSavedAnswers = savedState.some(entry => entry && entry.value != null);
    }
    const savedOrder = JSON.parse(localStorage.getItem(orderKey) || "null");
    hasSavedOrder = savedOrder && savedOrder.questions && Array.isArray(savedOrder.questions);
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded, etc.)
    // Proceed with shuffling as if no saved answers exist
  }

  // Only shuffle if no answers have been saved (fresh start)
  // If there are saved answers AND a saved order, restore the saved order
  if (!hasSavedAnswers) {
    shuffleQuestions(questionContainer, questions, orderKey);
  } else if (hasSavedOrder) {
    // Restore the saved question and option order
    restoreOrder(questionContainer, questions, orderKey);
  }
  // If hasSavedAnswers but no saved order, questions stay in HTML order (fallback)

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

    const scoreHtml = `<strong>${score}%</strong> — ${result.correct} correct, ${result.incorrect} incorrect, ${result.unanswered} unanswered.`;
    
    // Show result in both banners (top and bottom)
    resultBanner.innerHTML = scoreHtml;
    resultBanner.classList.add("visible");
    
    topResultBanner.innerHTML = scoreHtml;
    topResultBanner.classList.add("visible");

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

    // Clear both result banners
    resultBanner.classList.remove("visible");
    resultBanner.textContent = "";
    topResultBanner.classList.remove("visible");
    topResultBanner.textContent = "";

    document.body.classList.remove("review-mode");
    document.body.classList.remove("submitted-mode");
    
    // Unlock all radio inputs
    setInputsLocked(false);

    // Shuffle on retake (user explicitly requested scramble)
    shuffleQuestions(questionContainer, questions, orderKey);

    updateProgress(questions, progressFill, progressText);
    
    // Update submit button state (will be disabled since no answers selected)
    updateSubmitButtonState();
    
    try {
      localStorage.removeItem(examKey);
      localStorage.removeItem(examKey + ":lastScore");
      localStorage.removeItem(orderKey);
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
// Also saves the order to localStorage if orderKey is provided
function shuffleQuestions(container, questions, orderKey) {
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

  // Track the order for saving
  const orderData = { questions: [], options: {} };

  // Shuffle options within each question
  for (let i = 0; i < shuffled.length; i++) {
    const q = shuffled[i];
    const firstRadio = q.querySelector('input[type="radio"]');
    const qName = firstRadio ? firstRadio.name : null;
    
    if (qName) {
      orderData.questions.push(qName);
    }
    
    const labels = q.querySelectorAll("label");
    if (!labels.length) continue;
    
    const parent = labels[0].parentElement;
    const shuffledLabels = Array.from(labels);
    
    // Fisher-Yates shuffle for labels
    for (let j = shuffledLabels.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffledLabels[j], shuffledLabels[k]] = [shuffledLabels[k], shuffledLabels[j]];
    }
    
    // Track option order
    if (qName) {
      orderData.options[qName] = shuffledLabels.map(label => {
        const radio = label.querySelector('input[type="radio"]');
        return radio ? radio.value : null;
      }).filter(v => v != null);
    }
    
    // Use DocumentFragment for batch label updates
    const labelFragment = document.createDocumentFragment();
    for (let j = 0; j < shuffledLabels.length; j++) {
      labelFragment.appendChild(shuffledLabels[j]);
    }
    parent.appendChild(labelFragment);
  }
  
  // Save the order to localStorage
  if (orderKey) {
    try {
      localStorage.setItem(orderKey, JSON.stringify(orderData));
    } catch {
      // localStorage may be unavailable
    }
  }
}

// Restore question and option order from localStorage
function restoreOrder(container, questions, orderKey) {
  let savedOrder;
  try {
    savedOrder = JSON.parse(localStorage.getItem(orderKey) || "null");
  } catch {
    return; // Can't restore if localStorage is unavailable
  }
  
  if (!savedOrder || !savedOrder.questions || !Array.isArray(savedOrder.questions)) {
    return;
  }
  
  // Build a map from question name to question element
  const questionsByName = new Map();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const firstRadio = q.querySelector('input[type="radio"]');
    if (firstRadio) {
      questionsByName.set(firstRadio.name, q);
    }
  }
  
  // Reorder questions according to saved order
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < savedOrder.questions.length; i++) {
    const qName = savedOrder.questions[i];
    const q = questionsByName.get(qName);
    if (q) {
      fragment.appendChild(q);
      questionsByName.delete(qName); // Mark as used
    }
  }
  
  // Append any questions not in the saved order (shouldn't happen, but just in case)
  if (questionsByName.size > 0) {
    console.warn('restoreOrder: Some questions were not in saved order, appending at end');
  }
  questionsByName.forEach(q => fragment.appendChild(q));
  
  container.appendChild(fragment);
  
  // Build a map from question name to question element for option restoration
  const questionsMap = new Map();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const firstRadio = q.querySelector('input[type="radio"]');
    if (firstRadio) {
      questionsMap.set(firstRadio.name, q);
    }
  }
  
  // Restore option order within each question (iterate through saved order for consistency)
  if (savedOrder.options) {
    for (let i = 0; i < savedOrder.questions.length; i++) {
      const qName = savedOrder.questions[i];
      const q = questionsMap.get(qName);
      if (!q) continue;
      
      const optionOrder = savedOrder.options[qName];
      if (!optionOrder || !Array.isArray(optionOrder)) continue;
      
      const labels = q.querySelectorAll("label");
      if (!labels.length) continue;
      
      const parent = labels[0].parentElement;
      
      // Build a map from option value to label
      const labelsByValue = new Map();
      for (let j = 0; j < labels.length; j++) {
        const label = labels[j];
        const radio = label.querySelector('input[type="radio"]');
        if (radio) {
          labelsByValue.set(radio.value, label);
        }
      }
      
      // Reorder labels according to saved order
      const labelFragment = document.createDocumentFragment();
      for (let j = 0; j < optionOrder.length; j++) {
        const value = optionOrder[j];
        const label = labelsByValue.get(value);
        if (label) {
          labelFragment.appendChild(label);
          labelsByValue.delete(value);
        }
      }
      
      // Append any labels not in the saved order
      labelsByValue.forEach(label => labelFragment.appendChild(label));
      
      parent.appendChild(labelFragment);
    }
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

// ----------------------
// Konami Code Easter Egg
// ↑ ↑ ↓ ↓ ← → ← → B A
// Works on both desktop (keyboard) and mobile (swipe/tap pattern)
// ----------------------
;(function initKonamiCode() {
  const konamiSequence = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ];
  
  let konamiIndex = 0;
  let mobilePattern = [];
  const mobileSequence = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'tap', 'tap'];
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTapTime = 0;
  
  // Desktop keyboard listener
  document.addEventListener('keydown', function(e) {
    const key = e.code;
    
    if (key === konamiSequence[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiSequence.length) {
        konamiIndex = 0;
        triggerEasterEgg();
      }
    } else {
      konamiIndex = 0;
      // Check if the pressed key matches the start of the sequence
      if (key === konamiSequence[0]) {
        konamiIndex = 1;
      }
    }
  });
  
  // Mobile touch listeners for swipe detection
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  
  document.addEventListener('touchend', function(e) {
    if (e.changedTouches.length !== 1) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50;
    
    let gesture = null;
    
    // Determine if it's a swipe or tap
    if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
      // It's a tap
      const now = Date.now();
      if (now - lastTapTime < 500) {
        gesture = 'tap';
      } else {
        gesture = 'tap';
      }
      lastTapTime = now;
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      gesture = deltaX > minSwipeDistance ? 'right' : (deltaX < -minSwipeDistance ? 'left' : null);
    } else {
      // Vertical swipe
      gesture = deltaY > minSwipeDistance ? 'down' : (deltaY < -minSwipeDistance ? 'up' : null);
    }
    
    if (gesture) {
      if (gesture === mobileSequence[mobilePattern.length]) {
        mobilePattern.push(gesture);
        if (mobilePattern.length === mobileSequence.length) {
          mobilePattern = [];
          triggerEasterEgg();
        }
      } else {
        mobilePattern = [];
        // Check if this gesture starts the sequence
        if (gesture === mobileSequence[0]) {
          mobilePattern.push(gesture);
        }
      }
    }
    
    // Reset pattern after 3 seconds of inactivity
    setTimeout(function() {
      if (mobilePattern.length > 0 && Date.now() - lastTapTime > 3000) {
        mobilePattern = [];
      }
    }, 3500);
  }, { passive: true });
  
  function triggerEasterEgg() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'konami-overlay';
    overlay.innerHTML = `
      <div class="konami-content">
        <div class="konami-flame-border">
          <img src="${getBasePath()}bftb.png" alt="Easter Egg" class="konami-image">
        </div>
        <button class="konami-close" aria-label="Close">&times;</button>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.id = 'konami-styles';
    style.textContent = `
      #konami-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: konamiFadeIn 0.5s ease-out;
      }
      
      @keyframes konamiFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .konami-content {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .konami-flame-border {
        position: relative;
        padding: 20px;
        border-radius: 16px;
        background: linear-gradient(45deg, #ff6b35, #f7c800, #ff6b35, #ff4500, #f7c800);
        background-size: 400% 400%;
        animation: flameGradient 1s ease infinite, flamePulse 0.5s ease-in-out infinite alternate;
        box-shadow: 
          0 0 20px rgba(255, 107, 53, 0.8),
          0 0 40px rgba(247, 200, 0, 0.6),
          0 0 60px rgba(255, 69, 0, 0.4),
          0 0 80px rgba(255, 107, 53, 0.3),
          inset 0 0 20px rgba(255, 200, 0, 0.2);
      }
      
      .konami-flame-border::before {
        content: '';
        position: absolute;
        top: -3px;
        left: -3px;
        right: -3px;
        bottom: -3px;
        border-radius: 18px;
        background: linear-gradient(45deg, 
          transparent, 
          rgba(255, 200, 0, 0.5), 
          transparent, 
          rgba(255, 69, 0, 0.5), 
          transparent);
        background-size: 400% 400%;
        animation: flameOuter 1.5s ease infinite;
        z-index: -1;
        filter: blur(8px);
      }
      
      .konami-flame-border::after {
        content: '';
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        border-radius: 22px;
        background: radial-gradient(ellipse at center, 
          rgba(255, 107, 53, 0.4) 0%, 
          rgba(247, 200, 0, 0.2) 30%, 
          transparent 70%);
        animation: flameGlow 0.8s ease-in-out infinite alternate;
        z-index: -2;
        filter: blur(12px);
      }
      
      @keyframes flameGradient {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      @keyframes flamePulse {
        from { 
          box-shadow: 
            0 0 20px rgba(255, 107, 53, 0.8),
            0 0 40px rgba(247, 200, 0, 0.6),
            0 0 60px rgba(255, 69, 0, 0.4),
            0 0 80px rgba(255, 107, 53, 0.3),
            inset 0 0 20px rgba(255, 200, 0, 0.2);
        }
        to { 
          box-shadow: 
            0 0 30px rgba(255, 107, 53, 1),
            0 0 50px rgba(247, 200, 0, 0.8),
            0 0 70px rgba(255, 69, 0, 0.6),
            0 0 100px rgba(255, 107, 53, 0.5),
            inset 0 0 30px rgba(255, 200, 0, 0.3);
        }
      }
      
      @keyframes flameOuter {
        0%, 100% { background-position: 0% 50%; opacity: 0.7; }
        50% { background-position: 100% 50%; opacity: 1; }
      }
      
      @keyframes flameGlow {
        from { opacity: 0.5; transform: scale(1); }
        to { opacity: 1; transform: scale(1.1); }
      }
      
      .konami-image {
        display: block;
        max-width: 80vw;
        max-height: 70vh;
        border-radius: 8px;
        animation: konamiImagePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      @keyframes konamiImagePop {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      .konami-close {
        position: absolute;
        top: -15px;
        right: -15px;
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff6b35, #ff4500);
        color: white;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(255, 69, 0, 0.5);
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 10001;
      }
      
      .konami-close:hover {
        transform: scale(1.1) rotate(90deg);
        box-shadow: 0 6px 20px rgba(255, 69, 0, 0.7);
      }
      
      @media (max-width: 768px) {
        .konami-flame-border {
          padding: 12px;
        }
        
        .konami-image {
          max-width: 90vw;
          max-height: 60vh;
        }
        
        .konami-close {
          width: 36px;
          height: 36px;
          font-size: 20px;
          top: -10px;
          right: -10px;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    // Close on button click
    overlay.querySelector('.konami-close').addEventListener('click', closeEasterEgg);
    
    // Close on overlay click (outside image)
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeEasterEgg();
      }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeEasterEgg();
        document.removeEventListener('keydown', escHandler);
      }
    });
    
    function closeEasterEgg() {
      overlay.style.animation = 'konamiFadeIn 0.3s ease-out reverse';
      setTimeout(function() {
        overlay.remove();
        style.remove();
      }, 280);
    }
  }
  
  // Get base path for image (handles subdirectories)
  function getBasePath() {
    const path = window.location.pathname;
    // Count directory depth
    const parts = path.split('/').filter(p => p && !p.includes('.html'));
    if (parts.length === 0) return '';
    return '../'.repeat(parts.length);
  }
})();
