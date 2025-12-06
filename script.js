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
// Desktop: ↑ ↑ ↓ ↓ ← → ← → B A (keyboard)
// Mobile: Swipe up up down down left right left right, then tap tap
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
  // Mobile: swipe directions + tap tap at the end (instead of B A)
  const mobileSequence = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'tap', 'tap'];
  let touchStartX = 0;
  let touchStartY = 0;
  let lastGestureTime = 0;
  let patternTimeout = null;
  
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
    if (Math.abs(deltaX) < 25 && Math.abs(deltaY) < 25) {
      // It's a tap
      gesture = 'tap';
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      gesture = deltaX > minSwipeDistance ? 'right' : (deltaX < -minSwipeDistance ? 'left' : null);
    } else {
      // Vertical swipe
      gesture = deltaY > minSwipeDistance ? 'down' : (deltaY < -minSwipeDistance ? 'up' : null);
    }
    
    if (gesture) {
      lastGestureTime = Date.now();
      
      // Clear previous timeout and set new one
      if (patternTimeout) clearTimeout(patternTimeout);
      patternTimeout = setTimeout(function() {
        mobilePattern = [];
      }, 4000); // Reset after 4 seconds of inactivity
      
      if (gesture === mobileSequence[mobilePattern.length]) {
        mobilePattern.push(gesture);
        if (mobilePattern.length === mobileSequence.length) {
          mobilePattern = [];
          if (patternTimeout) clearTimeout(patternTimeout);
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
  }, { passive: true });
  
  function triggerEasterEgg() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'konami-overlay';
    overlay.innerHTML = `
      <div class="konami-content">
        <div class="konami-flame-border">
          <div class="konami-flame-glow"></div>
          <img src="${getBasePath()}bftb.png" alt="Easter Egg" class="konami-image">
        </div>
        <button class="konami-close" aria-label="Close">&times;</button>
      </div>
      <div class="flying-cats-container"></div>
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
        background: rgba(0, 0, 0, 0.92);
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
        padding: 15px;
        border-radius: 12px;
        background: #1a0a00;
        z-index: 1;
      }
      
      /* Main fire glow container */
      .konami-flame-border::before {
        content: '';
        position: absolute;
        top: -25px;
        left: -25px;
        right: -25px;
        bottom: -25px;
        border-radius: 20px;
        background: 
          radial-gradient(ellipse 80% 50% at 50% 100%, rgba(255, 60, 0, 0.9) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255, 150, 0, 0.8) 0%, transparent 40%),
          radial-gradient(ellipse 100% 60% at 50% 100%, rgba(255, 200, 50, 0.5) 0%, transparent 50%);
        z-index: -2;
        animation: fireBase 0.15s ease-in-out infinite alternate;
        filter: blur(15px);
      }
      
      /* Secondary fire layer - more erratic */
      .konami-flame-border::after {
        content: '';
        position: absolute;
        top: -35px;
        left: -35px;
        right: -35px;
        bottom: -35px;
        border-radius: 25px;
        background: 
          radial-gradient(ellipse 70% 45% at 30% 100%, rgba(255, 80, 0, 0.7) 0%, transparent 45%),
          radial-gradient(ellipse 70% 45% at 70% 100%, rgba(255, 120, 0, 0.6) 0%, transparent 45%),
          radial-gradient(ellipse 50% 35% at 50% 100%, rgba(255, 180, 0, 0.8) 0%, transparent 35%);
        z-index: -3;
        animation: fireFlicker 0.1s ease-in-out infinite;
        filter: blur(20px);
      }
      
      /* Flame particles container */
      .flame-particles {
        position: absolute;
        top: -40px;
        left: -40px;
        right: -40px;
        bottom: -40px;
        pointer-events: none;
        z-index: -1;
        overflow: visible;
      }
      
      .flame-particle {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 200, 50, 1) 0%, rgba(255, 100, 0, 0.8) 50%, transparent 70%);
        filter: blur(2px);
        animation: particleRise linear infinite;
      }
      
      /* Individual flame tongues */
      .flame-tongue {
        position: absolute;
        bottom: -10px;
        width: 30px;
        height: 60px;
        background: linear-gradient(to top, 
          rgba(255, 60, 0, 0.9) 0%,
          rgba(255, 120, 0, 0.7) 30%,
          rgba(255, 180, 50, 0.5) 60%,
          transparent 100%);
        border-radius: 50% 50% 20% 20%;
        filter: blur(3px);
        transform-origin: bottom center;
        z-index: -1;
      }
      
      .flame-tongue:nth-child(1) { left: 10%; animation: flameDance1 0.3s ease-in-out infinite; }
      .flame-tongue:nth-child(2) { left: 25%; animation: flameDance2 0.25s ease-in-out infinite; height: 70px; }
      .flame-tongue:nth-child(3) { left: 40%; animation: flameDance3 0.35s ease-in-out infinite; height: 55px; }
      .flame-tongue:nth-child(4) { left: 55%; animation: flameDance1 0.28s ease-in-out infinite; height: 65px; }
      .flame-tongue:nth-child(5) { left: 70%; animation: flameDance2 0.32s ease-in-out infinite; }
      .flame-tongue:nth-child(6) { left: 85%; animation: flameDance3 0.27s ease-in-out infinite; height: 50px; }
      
      /* Side flames */
      .flame-tongue:nth-child(7) { left: -15px; bottom: 20%; width: 50px; height: 25px; transform: rotate(90deg); animation: flameDance1 0.3s ease-in-out infinite; }
      .flame-tongue:nth-child(8) { left: -15px; bottom: 50%; width: 45px; height: 22px; transform: rotate(90deg); animation: flameDance2 0.28s ease-in-out infinite; }
      .flame-tongue:nth-child(9) { left: -15px; bottom: 80%; width: 40px; height: 20px; transform: rotate(90deg); animation: flameDance3 0.25s ease-in-out infinite; }
      .flame-tongue:nth-child(10) { right: -15px; left: auto; bottom: 20%; width: 50px; height: 25px; transform: rotate(-90deg); animation: flameDance2 0.32s ease-in-out infinite; }
      .flame-tongue:nth-child(11) { right: -15px; left: auto; bottom: 50%; width: 45px; height: 22px; transform: rotate(-90deg); animation: flameDance1 0.29s ease-in-out infinite; }
      .flame-tongue:nth-child(12) { right: -15px; left: auto; bottom: 80%; width: 40px; height: 20px; transform: rotate(-90deg); animation: flameDance3 0.26s ease-in-out infinite; }
      
      /* Top flames */
      .flame-tongue:nth-child(13) { top: -15px; bottom: auto; left: 15%; width: 25px; height: 40px; transform: rotate(180deg); animation: flameDance1 0.31s ease-in-out infinite; }
      .flame-tongue:nth-child(14) { top: -15px; bottom: auto; left: 40%; width: 30px; height: 45px; transform: rotate(180deg); animation: flameDance2 0.27s ease-in-out infinite; }
      .flame-tongue:nth-child(15) { top: -15px; bottom: auto; left: 65%; width: 25px; height: 40px; transform: rotate(180deg); animation: flameDance3 0.33s ease-in-out infinite; }
      
      @keyframes fireBase {
        0% { 
          opacity: 0.8;
          transform: scale(1) translateY(0);
        }
        100% { 
          opacity: 1;
          transform: scale(1.05) translateY(-3px);
        }
      }
      
      @keyframes fireFlicker {
        0%, 100% { 
          opacity: 0.6;
          transform: scale(1) skewX(0deg);
        }
        25% { 
          opacity: 0.8;
          transform: scale(1.02) skewX(2deg);
        }
        50% { 
          opacity: 0.7;
          transform: scale(0.98) skewX(-1deg);
        }
        75% { 
          opacity: 0.9;
          transform: scale(1.03) skewX(1deg);
        }
      }
      
      @keyframes flameDance1 {
        0%, 100% { 
          transform: scaleY(1) scaleX(1) translateX(0) rotate(0deg);
          opacity: 0.8;
        }
        25% { 
          transform: scaleY(1.2) scaleX(0.9) translateX(3px) rotate(3deg);
          opacity: 1;
        }
        50% { 
          transform: scaleY(0.9) scaleX(1.1) translateX(-2px) rotate(-2deg);
          opacity: 0.7;
        }
        75% { 
          transform: scaleY(1.15) scaleX(0.95) translateX(2px) rotate(2deg);
          opacity: 0.9;
        }
      }
      
      @keyframes flameDance2 {
        0%, 100% { 
          transform: scaleY(1) scaleX(1) translateX(0) rotate(0deg);
          opacity: 0.7;
        }
        33% { 
          transform: scaleY(1.25) scaleX(0.85) translateX(-4px) rotate(-4deg);
          opacity: 1;
        }
        66% { 
          transform: scaleY(0.85) scaleX(1.15) translateX(3px) rotate(3deg);
          opacity: 0.8;
        }
      }
      
      @keyframes flameDance3 {
        0%, 100% { 
          transform: scaleY(1) scaleX(1) translateX(0) rotate(0deg);
          opacity: 0.9;
        }
        20% { 
          transform: scaleY(1.1) scaleX(0.95) translateX(2px) rotate(2deg);
          opacity: 0.7;
        }
        40% { 
          transform: scaleY(1.3) scaleX(0.8) translateX(-3px) rotate(-3deg);
          opacity: 1;
        }
        60% { 
          transform: scaleY(0.95) scaleX(1.05) translateX(1px) rotate(1deg);
          opacity: 0.8;
        }
        80% { 
          transform: scaleY(1.15) scaleX(0.9) translateX(-2px) rotate(-2deg);
          opacity: 0.9;
        }
      }
      
      @keyframes particleRise {
        0% {
          transform: translateY(0) translateX(0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateY(-80px) translateX(var(--drift, 10px)) scale(0);
          opacity: 0;
        }
      }
      
      /* Inner glow on the border */
      .konami-flame-glow {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 12px;
        box-shadow: 
          inset 0 0 30px rgba(255, 100, 0, 0.5),
          inset 0 0 60px rgba(255, 50, 0, 0.3),
          0 0 10px rgba(255, 150, 50, 0.8),
          0 0 20px rgba(255, 100, 0, 0.6),
          0 0 40px rgba(255, 60, 0, 0.4);
        animation: innerGlow 0.2s ease-in-out infinite alternate;
        pointer-events: none;
      }
      
      @keyframes innerGlow {
        0% {
          box-shadow: 
            inset 0 0 30px rgba(255, 100, 0, 0.5),
            inset 0 0 60px rgba(255, 50, 0, 0.3),
            0 0 10px rgba(255, 150, 50, 0.8),
            0 0 20px rgba(255, 100, 0, 0.6),
            0 0 40px rgba(255, 60, 0, 0.4);
        }
        100% {
          box-shadow: 
            inset 0 0 35px rgba(255, 120, 0, 0.6),
            inset 0 0 70px rgba(255, 60, 0, 0.4),
            0 0 15px rgba(255, 180, 50, 0.9),
            0 0 30px rgba(255, 120, 0, 0.7),
            0 0 50px rgba(255, 80, 0, 0.5);
        }
      }
      
      .konami-image {
        display: block;
        max-width: 80vw;
        max-height: 70vh;
        border-radius: 8px;
        animation: konamiImagePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        position: relative;
        z-index: 2;
      }
      
      @keyframes konamiImagePop {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      .konami-close {
        position: absolute;
        top: -20px;
        right: -20px;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff6b35, #ff4500, #cc0000);
        color: white;
        font-size: 26px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 
          0 0 10px rgba(255, 69, 0, 0.8),
          0 0 20px rgba(255, 100, 0, 0.5),
          0 4px 15px rgba(0, 0, 0, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 10001;
        animation: closeButtonPulse 1s ease-in-out infinite alternate;
      }
      
      @keyframes closeButtonPulse {
        from {
          box-shadow: 
            0 0 10px rgba(255, 69, 0, 0.8),
            0 0 20px rgba(255, 100, 0, 0.5),
            0 4px 15px rgba(0, 0, 0, 0.4);
        }
        to {
          box-shadow: 
            0 0 15px rgba(255, 69, 0, 1),
            0 0 30px rgba(255, 100, 0, 0.7),
            0 4px 20px rgba(0, 0, 0, 0.5);
        }
      }
      
      .konami-close:hover {
        transform: scale(1.15) rotate(90deg);
        box-shadow: 
          0 0 20px rgba(255, 69, 0, 1),
          0 0 40px rgba(255, 100, 0, 0.8),
          0 6px 25px rgba(0, 0, 0, 0.5);
      }
      
      @media (max-width: 768px) {
        .konami-flame-border {
          padding: 10px;
        }
        
        .konami-flame-border::before {
          top: -20px;
          left: -20px;
          right: -20px;
          bottom: -20px;
        }
        
        .konami-flame-border::after {
          top: -25px;
          left: -25px;
          right: -25px;
          bottom: -25px;
        }
        
        .flame-tongue {
          width: 20px;
          height: 40px;
        }
        
        .konami-image {
          max-width: 90vw;
          max-height: 60vh;
        }
        
        .konami-close {
          width: 38px;
          height: 38px;
          font-size: 22px;
          top: -15px;
          right: -15px;
        }
      }
      
      /* Flying cats */
      .flying-cats-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
      }
      
      .flying-cat {
        position: absolute;
        font-size: 40px;
        animation: flyCat linear infinite;
        filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
        z-index: 9999;
      }
      
      @keyframes flyCat {
        0% {
          transform: translate(var(--startX), var(--startY)) rotate(var(--rotation)) scale(var(--scale));
        }
        100% {
          transform: translate(var(--endX), var(--endY)) rotate(calc(var(--rotation) + 720deg)) scale(var(--scale));
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    // Create flying cats
    const catEmojis = ['🐱', '😺', '😸', '😻', '🙀', '😹', '😼', '🐈', '🐈‍⬛'];
    const catsContainer = overlay.querySelector('.flying-cats-container');
    let catInterval;
    
    function createFlyingCat() {
      const cat = document.createElement('div');
      cat.className = 'flying-cat';
      cat.textContent = catEmojis[Math.floor(Math.random() * catEmojis.length)];
      
      // Random starting position (from edges)
      const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let startX, startY, endX, endY;
      
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      switch(edge) {
        case 0: // top
          startX = Math.random() * vw;
          startY = -50;
          endX = Math.random() * vw;
          endY = vh + 50;
          break;
        case 1: // right
          startX = vw + 50;
          startY = Math.random() * vh;
          endX = -50;
          endY = Math.random() * vh;
          break;
        case 2: // bottom
          startX = Math.random() * vw;
          startY = vh + 50;
          endX = Math.random() * vw;
          endY = -50;
          break;
        case 3: // left
          startX = -50;
          startY = Math.random() * vh;
          endX = vw + 50;
          endY = Math.random() * vh;
          break;
      }
      
      const duration = 2 + Math.random() * 3; // 2-5 seconds
      const scale = 0.5 + Math.random() * 1.5; // 0.5-2x size
      const rotation = Math.random() * 360;
      
      cat.style.setProperty('--startX', startX + 'px');
      cat.style.setProperty('--startY', startY + 'px');
      cat.style.setProperty('--endX', endX + 'px');
      cat.style.setProperty('--endY', endY + 'px');
      cat.style.setProperty('--scale', scale);
      cat.style.setProperty('--rotation', rotation + 'deg');
      cat.style.animationDuration = duration + 's';
      cat.style.fontSize = (30 + Math.random() * 30) + 'px';
      
      catsContainer.appendChild(cat);
      
      // Remove cat after animation
      setTimeout(() => {
        cat.remove();
      }, duration * 1000);
    }
    
    // Spawn cats continuously
    for (let i = 0; i < 8; i++) {
      setTimeout(() => createFlyingCat(), i * 200);
    }
    catInterval = setInterval(createFlyingCat, 300);
    
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
      // Stop spawning cats
      if (catInterval) {
        clearInterval(catInterval);
        catInterval = null;
      }
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
