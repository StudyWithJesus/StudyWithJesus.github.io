// =====================================================
// Global script for exam pages + index pages
// - Floating progress bar
// - 20-minute exam timer
// - Autosave answers
// - Submit / Retake buttons (review mode auto-activates on submit)
// - Last score per exam (ILM) for index pages
// =====================================================

// Timer duration in seconds (20 minutes)
const EXAM_TIMER_DURATION = 20 * 60;

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
  initUsernameSetup();
}

// ----------------------
// Exam page behaviour
// ----------------------
function initExamPage() {
  const form = document.querySelector(".exam-form, #quiz-form");
  if (!form) return; // not on an exam page

  // Check if username is set before allowing the exam
  const username = getStoredUsername();
  if (!username) {
    showUsernameRequiredOverlay(form);
    return; // Don't initialize exam until username is set
  }

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

  // Find or create the retry wrong answers button
  let retryBtn = form.querySelector("#retry-btn");
  if (!retryBtn) {
    retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.id = "retry-btn";
    retryBtn.className = "exam-button retry";
    retryBtn.innerHTML = '<span class="dot"></span><span>Retry Wrong Answers</span>';
    retryBtn.style.display = "none"; // Hidden by default
    actions.appendChild(retryBtn);
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

  const topRetryBtn = document.createElement("button");
  topRetryBtn.type = "button";
  topRetryBtn.id = "retry-btn-top";
  topRetryBtn.className = "exam-button retry";
  topRetryBtn.innerHTML = '<span class="dot"></span><span>Retry Wrong Answers</span>';
  topRetryBtn.style.display = "none"; // Hidden by default
  topActions.appendChild(topRetryBtn);
  
  // Insert top actions before the question container
  questionContainer.parentElement.insertBefore(topActions, questionContainer);

  // ----------------------
  // 20-minute Timer Setup
  // ----------------------
  const timerKey = "examTimer:" + window.location.pathname;
  let timerInterval = null;
  let remainingSeconds = EXAM_TIMER_DURATION;
  let timerStarted = false;

  // Create timer display element in the progress bar area
  const progressBar = document.querySelector(".exam-progress");
  let timerDisplay = document.getElementById("exam-timer");
  if (!timerDisplay && progressBar) {
    timerDisplay = document.createElement("div");
    timerDisplay.id = "exam-timer";
    timerDisplay.className = "exam-timer";
    timerDisplay.innerHTML = '<span class="timer-icon">⏱</span><span class="timer-text">20:00</span>';
    progressBar.appendChild(timerDisplay);
  }

  // Format seconds as MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  // Update timer display
  function updateTimerDisplay() {
    if (timerDisplay) {
      const timerText = timerDisplay.querySelector('.timer-text');
      if (timerText) {
        timerText.textContent = formatTime(remainingSeconds);
      }
      // Add warning class when less than 2 minutes remain
      if (remainingSeconds <= 120) {
        timerDisplay.classList.add('timer-warning');
      }
      // Add critical class when less than 30 seconds remain
      if (remainingSeconds <= 30) {
        timerDisplay.classList.add('timer-critical');
      }
    }
  }

  // Save timer state to localStorage
  function saveTimerState() {
    try {
      localStorage.setItem(timerKey, JSON.stringify({
        remaining: remainingSeconds,
        timestamp: Date.now(),
        started: timerStarted
      }));
    } catch {}
  }

  // Load timer state from localStorage
  function loadTimerState() {
    try {
      const saved = JSON.parse(localStorage.getItem(timerKey) || "null");
      if (saved && saved.started) {
        // Calculate elapsed time since last save
        const elapsed = Math.floor((Date.now() - saved.timestamp) / 1000);
        remainingSeconds = Math.max(0, saved.remaining - elapsed);
        timerStarted = true;
        return true;
      }
    } catch {}
    return false;
  }

  // Start the timer
  function startTimer() {
    if (timerInterval) return; // Already running
    timerStarted = true;
    timerInterval = setInterval(function() {
      remainingSeconds--;
      updateTimerDisplay();
      saveTimerState();
      
      if (remainingSeconds <= 0) {
        stopTimer();
        // Auto-submit when time runs out
        if (!document.body.classList.contains("submitted-mode")) {
          handleSubmit();
        }
      }
    }, 1000);
  }

  // Stop the timer
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Reset the timer
  function resetTimer() {
    stopTimer();
    remainingSeconds = EXAM_TIMER_DURATION;
    timerStarted = false;
    if (timerDisplay) {
      timerDisplay.classList.remove('timer-warning', 'timer-critical');
    }
    updateTimerDisplay();
    try {
      localStorage.removeItem(timerKey);
    } catch {}
  }

  // Load any saved timer state
  if (loadTimerState()) {
    updateTimerDisplay();
    if (remainingSeconds > 0 && !document.body.classList.contains("submitted-mode")) {
      startTimer();
    }
  }

  // ----------------------
  // Timer Pause Functionality
  // ----------------------
  let isPaused = false;
  let pauseOverlay = null;

  // Create pause overlay
  function createPauseOverlay() {
    if (pauseOverlay) return pauseOverlay;
    
    pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'timer-pause-overlay';
    pauseOverlay.className = 'timer-pause-overlay';
    pauseOverlay.innerHTML = `
      <div class="pause-content">
        <div class="pause-icon">⏸</div>
        <h2>Test Paused</h2>
        <p>Click anywhere to resume</p>
        <div class="pause-timer">
          <span class="pause-timer-icon">⏱</span>
          <span class="pause-timer-text">${formatTime(remainingSeconds)}</span>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.id = 'pause-overlay-styles';
    style.textContent = `
      .timer-pause-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.98);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        animation: pauseOverlayFadeIn 0.3s ease-out;
        cursor: pointer;
      }
      
      @keyframes pauseOverlayFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .pause-content {
        text-align: center;
        color: white;
        animation: pauseContentSlide 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      @keyframes pauseContentSlide {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .pause-icon {
        font-size: 80px;
        margin-bottom: 24px;
        animation: pauseIconPulse 2s ease-in-out infinite;
      }
      
      @keyframes pauseIconPulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
      }
      
      .pause-content h2 {
        font-size: 36px;
        font-weight: 700;
        margin: 0 0 16px 0;
        color: #f1f5f9;
      }
      
      .pause-content p {
        font-size: 18px;
        color: #cbd5e1;
        margin: 0 0 32px 0;
      }
      
      .pause-timer {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 16px 32px;
        background: rgba(59, 130, 246, 0.1);
        border: 2px solid rgba(59, 130, 246, 0.3);
        border-radius: 12px;
        font-size: 32px;
        font-weight: 700;
        color: #60a5fa;
        font-variant-numeric: tabular-nums;
      }
      
      .pause-timer-icon {
        font-size: 32px;
      }
      
      @media (max-width: 768px) {
        .pause-icon {
          font-size: 60px;
        }
        
        .pause-content h2 {
          font-size: 28px;
        }
        
        .pause-content p {
          font-size: 16px;
        }
        
        .pause-timer {
          font-size: 28px;
          padding: 14px 28px;
        }
        
        .pause-timer-icon {
          font-size: 28px;
        }
      }
    `;
    
    if (!document.getElementById('pause-overlay-styles')) {
      document.head.appendChild(style);
    }
    
    // Click anywhere to resume
    pauseOverlay.addEventListener('click', function() {
      resumeTimer();
    });
    
    return pauseOverlay;
  }

  // Pause the timer
  function pauseTimer() {
    if (isPaused || !timerStarted || document.body.classList.contains("submitted-mode")) return;
    
    isPaused = true;
    stopTimer();
    
    // Create and show overlay
    const overlay = createPauseOverlay();
    document.body.appendChild(overlay);
    
    // Update timer display to show pause icon
    if (timerDisplay) {
      timerDisplay.classList.add('timer-paused');
      const timerIcon = timerDisplay.querySelector('.timer-icon');
      if (timerIcon) {
        timerIcon.textContent = '⏸';
      }
    }
  }

  // Resume the timer
  function resumeTimer() {
    if (!isPaused) return;
    
    isPaused = false;
    
    // Remove overlay
    if (pauseOverlay && pauseOverlay.parentNode) {
      pauseOverlay.style.animation = 'pauseOverlayFadeIn 0.3s ease-out reverse';
      setTimeout(() => {
        if (pauseOverlay && pauseOverlay.parentNode) {
          pauseOverlay.parentNode.removeChild(pauseOverlay);
        }
      }, 300);
    }
    
    // Resume timer
    startTimer();
    
    // Update timer display to show normal icon
    if (timerDisplay) {
      timerDisplay.classList.remove('timer-paused');
      const timerIcon = timerDisplay.querySelector('.timer-icon');
      if (timerIcon) {
        timerIcon.textContent = '⏱';
      }
    }
  }

  // Add click handler to timer display for pause/resume
  if (timerDisplay) {
    timerDisplay.style.cursor = 'pointer';
    timerDisplay.title = 'Click to pause/resume timer';
    timerDisplay.addEventListener('click', function(e) {
      e.stopPropagation();
      if (isPaused) {
        resumeTimer();
      } else if (timerStarted && !document.body.classList.contains("submitted-mode")) {
        pauseTimer();
      }
    });
  }

  // Add keyboard shortcut for pause/resume (Space or P key)
  document.addEventListener('keydown', function(e) {
    // Only activate if we're on an exam page and not typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Don't interfere with Konami code
    if (e.code === 'KeyB' || e.code === 'KeyA') return;
    
    if (e.code === 'Space' || e.code === 'KeyP') {
      e.preventDefault();
      if (isPaused) {
        resumeTimer();
      } else if (timerStarted && !document.body.classList.contains("submitted-mode")) {
        pauseTimer();
      }
    }
  });

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
    
    // Start timer on first answer
    if (!timerStarted && !document.body.classList.contains("submitted-mode")) {
      startTimer();
    }
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
    
    // Stop the timer when submitting
    stopTimer();
    
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

    // Show retry button if there are incorrect answers
    const retryBtn = form.querySelector("#retry-btn");
    const topRetryBtn = form.querySelector("#retry-btn-top");
    if (result.incorrect > 0) {
      if (retryBtn) retryBtn.style.display = "inline-block";
      if (topRetryBtn) topRetryBtn.style.display = "inline-block";
    } else {
      if (retryBtn) retryBtn.style.display = "none";
      if (topRetryBtn) topRetryBtn.style.display = "none";
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
      
      // Submit to leaderboard if available
      submitToLeaderboard(examId, score);
    }
  }

  // Submit score to leaderboard
  function submitToLeaderboard(examId, score) {
    // Check if Leaderboard module is available
    if (typeof window.Leaderboard === 'undefined' || !window.Leaderboard.submitAttempt) {
      console.info('Leaderboard module not loaded. Score saved locally only.');
      return;
    }

    // Get username
    const username = localStorage.getItem('leaderboard_username');
    if (!username || username.trim() === '') {
      console.info('No username set. Score saved locally but not submitted to leaderboard.');
      return;
    }

    // Determine moduleId from examId (e.g., "270201b" -> "270201")
    // Expected format: 6 digits optionally followed by letters
    const moduleIdMatch = examId.match(/^(\d{6})/);
    const moduleId = moduleIdMatch ? moduleIdMatch[1] : null;
    
    if (!moduleId) {
      console.warn('Could not determine module ID from exam ID:', examId, '- Expected format: 6 digits (e.g., 270201)');
      return;
    }

    // Prepare attempt data
    const attempt = {
      username: username,
      moduleId: moduleId,
      examId: examId,
      score: score,
      timestamp: new Date().toISOString()
    };

    // Submit to leaderboard
    window.Leaderboard.submitAttempt(attempt)
      .then(function(success) {
        if (success) {
          console.info('Score submitted to leaderboard successfully!');
          // Show subtle success indicator
          showLeaderboardSubmissionFeedback(true);
        } else {
          console.warn('Failed to submit score to leaderboard.');
          showLeaderboardSubmissionFeedback(false);
        }
      })
      .catch(function(error) {
        console.error('Error submitting to leaderboard:', error);
        showLeaderboardSubmissionFeedback(false);
      });
  }

  // Show feedback after leaderboard submission
  function showLeaderboardSubmissionFeedback(success) {
    const banner = resultBanner;
    if (!banner) return;

    const feedbackEl = document.createElement('div');
    feedbackEl.style.cssText = 'margin-top: 10px; font-size: 0.9rem; opacity: 0.8;';
    
    if (success) {
      feedbackEl.innerHTML = '✅ Score submitted to leaderboard!';
      feedbackEl.style.color = '#28a745';
    } else {
      feedbackEl.innerHTML = 'ℹ️ Score saved locally. Check leaderboard configuration.';
      feedbackEl.style.color = '#6c757d';
    }

    banner.appendChild(feedbackEl);

    // Remove after 5 seconds
    setTimeout(function() {
      if (feedbackEl && feedbackEl.parentNode) {
        feedbackEl.parentNode.removeChild(feedbackEl);
      }
    }, 5000);
  }

  // Retake logic (clear + reshuffle)
  function handleRetake() {
    // Reset the timer on retake
    resetTimer();
    
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
    
    // Hide retry buttons
    const retryBtn = form.querySelector("#retry-btn");
    const topRetryBtn = form.querySelector("#retry-btn-top");
    if (retryBtn) retryBtn.style.display = "none";
    if (topRetryBtn) topRetryBtn.style.display = "none";
    
    try {
      localStorage.removeItem(examKey);
      localStorage.removeItem(examKey + ":lastScore");
      localStorage.removeItem(orderKey);
    } catch {}
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Retry wrong answers only (keep correct answers locked)
  function handleRetryWrong() {
    // Clear only incorrect question states and unlock only those
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Only process incorrect questions
      if (q.classList.contains("incorrect")) {
        // Clear labels
        const labels = q.querySelectorAll("label");
        for (let j = 0; j < labels.length; j++) {
          labels[j].classList.remove("correct", "incorrect");
        }
        
        // Clear selection
        const inputs = q.querySelectorAll('input[type="radio"]');
        for (let j = 0; j < inputs.length; j++) {
          inputs[j].checked = false;
          inputs[j].disabled = false; // Unlock incorrect questions
        }
        
        // Remove incorrect class so it's not marked anymore
        q.classList.remove("incorrect");
        q.classList.remove("answered");
      } else if (q.classList.contains("correct")) {
        // Keep correct answers locked
        const inputs = q.querySelectorAll('input[type="radio"]');
        for (let j = 0; j < inputs.length; j++) {
          inputs[j].disabled = true; // Keep correct answers locked
        }
      }
    }

    // Clear result banners
    resultBanner.classList.remove("visible");
    resultBanner.textContent = "";
    topResultBanner.classList.remove("visible");
    topResultBanner.textContent = "";

    // Exit submitted mode but stay in review mode
    document.body.classList.remove("submitted-mode");
    
    // Hide retry buttons
    const retryBtn = form.querySelector("#retry-btn");
    const topRetryBtn = form.querySelector("#retry-btn-top");
    if (retryBtn) retryBtn.style.display = "none";
    if (topRetryBtn) topRetryBtn.style.display = "none";

    updateProgress(questions, progressFill, progressText);
    
    // Update submit button state
    updateSubmitButtonState();
    
    // Scroll to first question that needs to be answered
    const firstUnanswered = questions.find(q => !q.classList.contains("correct") && !q.classList.contains("answered"));
    if (firstUnanswered) {
      firstUnanswered.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  // Attach retry handlers to both buttons
  retryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleRetryWrong();
  });

  topRetryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleRetryWrong();
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
// Username Setup for Leaderboard (index page)
// ----------------------
function initUsernameSetup() {
  const setupSection = document.getElementById('username-setup-section');
  const setupForm = document.getElementById('username-setup-form');
  const usernameInput = document.getElementById('setup-username-input');
  const currentDisplay = document.getElementById('username-current-display');
  
  // Only run on pages with the username setup section
  if (!setupSection || !setupForm) return;
  
  // Set username in localStorage
  function setUsername(name) {
    try {
      const sanitized = name.trim().substring(0, 30).replace(/[<>'"&]/g, '');
      if (sanitized) {
        localStorage.setItem('leaderboard_username', sanitized);
        return sanitized;
      }
    } catch {}
    return null;
  }
  
  // Update the display of the current username
  function updateDisplay() {
    const current = getStoredUsername();
    if (current) {
      currentDisplay.innerHTML = 'Your name: <strong class="username-highlight">' + escapeHtml(current) + '</strong> <button type="button" id="change-name-btn" class="change-name-link">(change)</button>';
      usernameInput.placeholder = 'Change your display name';
      setupSection.classList.add('has-username');
      
      // Add event listener for change button
      const changeBtn = document.getElementById('change-name-btn');
      if (changeBtn) {
        changeBtn.addEventListener('click', function() {
          usernameInput.focus();
        });
      }
    } else {
      currentDisplay.innerHTML = '<span class="username-warning">⚠️ Please set your display name to track your scores!</span>';
      setupSection.classList.remove('has-username');
    }
  }
  
  // Simple HTML escape
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Handle form submission
  setupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const newName = usernameInput.value.trim();
    if (newName) {
      const saved = setUsername(newName);
      if (saved) {
        usernameInput.value = '';
        updateDisplay();
        
        // Show a brief success message
        const originalPlaceholder = usernameInput.placeholder;
        usernameInput.placeholder = '✓ Name saved!';
        usernameInput.classList.add('input-success');
        setTimeout(function() {
          usernameInput.placeholder = originalPlaceholder;
          usernameInput.classList.remove('input-success');
        }, 2000);
      }
    }
  });
  
  // Initialize display
  updateDisplay();
}

// ----------------------
// Username check helper functions for exam pages
// ----------------------

// Get stored username from localStorage
function getStoredUsername() {
  try {
    return localStorage.getItem('leaderboard_username') || null;
  } catch {
    return null;
  }
}

// Get base path for navigation (handles subdirectories)
function getBasePathForNav() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(p => p && !p.includes('.html'));
  if (parts.length === 0) return '';
  return '../'.repeat(parts.length);
}

// Show overlay requiring username to be set
function showUsernameRequiredOverlay(form) {
  // Hide the form content
  form.style.display = 'none';
  
  // Hide the progress bar
  const progressBar = document.querySelector('.exam-progress');
  if (progressBar) {
    progressBar.style.display = 'none';
  }
  
  // Create the username required message
  const overlay = document.createElement('div');
  overlay.id = 'username-required-overlay';
  overlay.className = 'username-required-overlay';
  
  const basePath = getBasePathForNav();
  
  overlay.innerHTML = `
    <div class="username-required-card">
      <div class="username-required-icon">👋</div>
      <h2>Set Your Display Name First</h2>
      <p>Please set a display name before taking the test. Your name will be used to track your scores on the leaderboard.</p>
      <a href="${basePath}index.html#username-setup-section" class="username-required-btn">
        Go to Set Display Name
      </a>
    </div>
  `;
  
  // Add styles for the overlay
  const style = document.createElement('style');
  style.id = 'username-required-styles';
  style.textContent = `
    .username-required-overlay {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: var(--space-8) var(--space-4);
      min-height: 50vh;
    }
    
    .username-required-card {
      background: var(--color-surface-card, rgba(17, 24, 39, 0.95));
      border: 1px solid var(--color-gray-700, #334155);
      border-radius: var(--radius-xl, 1rem);
      padding: var(--space-8, 2rem);
      max-width: 500px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }
    
    .username-required-icon {
      font-size: 3rem;
      margin-bottom: var(--space-4, 1rem);
    }
    
    .username-required-card h2 {
      color: var(--color-text-primary, #f1f5f9);
      font-size: var(--font-size-2xl, 1.5rem);
      font-weight: var(--font-weight-semibold, 600);
      margin-bottom: var(--space-4, 1rem);
    }
    
    .username-required-card p {
      color: var(--color-text-secondary, #cbd5e1);
      font-size: var(--font-size-base, 1rem);
      line-height: var(--line-height-relaxed, 1.625);
      margin-bottom: var(--space-6, 1.5rem);
    }
    
    .username-required-btn {
      display: inline-block;
      background: linear-gradient(135deg, var(--color-primary, #3b9ece), var(--color-primary-dark, #2a7da8));
      color: white;
      font-weight: var(--font-weight-semibold, 600);
      padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
      border-radius: var(--radius-lg, 0.75rem);
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .username-required-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(59, 158, 206, 0.4);
    }
    
    .username-required-btn:active {
      transform: translateY(0);
    }
  `;
  
  document.head.appendChild(style);
  
  // Insert the overlay after the form (in the page content area)
  const pageContent = document.querySelector('.page-content') || form.parentElement;
  pageContent.insertBefore(overlay, form);
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
  
  // Delay to prevent mobile touch events from immediately triggering overlay close
  const MOBILE_TOUCH_DELAY = 300; // milliseconds
  
  // Achievement counter
  let konamiTriggerCount = 0;
  try {
    konamiTriggerCount = parseInt(localStorage.getItem('konami_trigger_count') || '0', 10);
  } catch {}
  
  // Team America quotes
  const teamAmericaQuotes = [
    "America, F*** YEAH!",
    "Freedom is the only way, yeah!",
    "Coming again to save the motherf***ing day, yeah!",
    "Freedom costs a buck o' five",
    "Terrorists, your game is through",
    "So lick my butt and suck on my balls!",
    "America, F*** YEAH! What you gonna do?",
    "Books!",
    "Bed Bath & Beyond! F*** YEAH!"
  ];
  
  // Show progress indicator (mobile only)
  function showProgress(current, total, isMobile) {
    // Only show on mobile devices (screen width <= 768px)
    if (window.innerWidth > 768) return;
    
    const existing = document.getElementById('konami-progress-indicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.id = 'konami-progress-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 15px;
      right: 15px;
      background: rgba(220, 38, 38, 0.9);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 11px;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      animation: konamiProgressPulse 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 100%;
      height: 2px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 1px;
      margin-top: 4px;
      overflow: hidden;
    `;
    
    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      width: ${(current / total) * 100}%;
      height: 100%;
      background: white;
      border-radius: 1px;
      transition: width 0.3s ease-out;
    `;
    
    progressBar.appendChild(progressFill);
    indicator.innerHTML = `<div style="display: flex; align-items: center; gap: 4px;">
      <span style="font-size: 10px;">🦅</span>
      <span>${current}/${total}</span>
      ${current === total ? '<span style="font-size: 10px;">✓</span>' : ''}
    </div>`;
    indicator.appendChild(progressBar);
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.animation = 'konamiProgressFadeOut 0.3s ease-out';
        setTimeout(() => indicator.remove(), 300);
      }
    }, current === total ? 500 : 1500);
  }
  
  // Add progress animation styles
  const progressStyles = document.createElement('style');
  progressStyles.textContent = `
    @keyframes konamiProgressPulse {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes konamiProgressFadeOut {
      to { opacity: 0; transform: translateY(10px); }
    }
  `;
  document.head.appendChild(progressStyles);
  
  // Desktop keyboard listener
  document.addEventListener('keydown', function(e) {
    const key = e.code;
    
    if (key === konamiSequence[konamiIndex]) {
      konamiIndex++;
      showProgress(konamiIndex, konamiSequence.length, false);
      if (konamiIndex === konamiSequence.length) {
        konamiIndex = 0;
        triggerEasterEgg();
      }
    } else {
      konamiIndex = 0;
      // Check if the pressed key matches the start of the sequence
      if (key === konamiSequence[0]) {
        konamiIndex = 1;
        showProgress(1, konamiSequence.length, false);
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
    const minSwipeDistance = 30; // Reduced from 50 for easier detection
    const tapThreshold = 15; // Reduced from 25 for more sensitive tap detection
    
    let gesture = null;
    
    // Determine if it's a swipe or tap
    if (Math.abs(deltaX) < tapThreshold && Math.abs(deltaY) < tapThreshold) {
      // It's a tap
      gesture = 'tap';
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        gesture = deltaX > 0 ? 'right' : 'left';
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        gesture = deltaY > 0 ? 'down' : 'up';
      }
    }
    
    if (gesture) {
      lastGestureTime = Date.now();
      
      // Clear previous timeout and set new one
      if (patternTimeout) clearTimeout(patternTimeout);
      patternTimeout = setTimeout(function() {
        mobilePattern = [];
      }, 5000); // Increased from 4000 to give more time
      
      // Check if gesture matches the next expected one
      if (gesture === mobileSequence[mobilePattern.length]) {
        mobilePattern.push(gesture);
        showProgress(mobilePattern.length, mobileSequence.length, true);
        
        if (mobilePattern.length === mobileSequence.length) {
          mobilePattern = [];
          if (patternTimeout) clearTimeout(patternTimeout);
          triggerEasterEgg();
        }
      } else {
        // Reset pattern, but allow starting fresh
        mobilePattern = [];
        // Check if this gesture starts the sequence
        if (gesture === mobileSequence[0]) {
          mobilePattern.push(gesture);
          showProgress(1, mobileSequence.length, true);
        }
      }
    }
  }, { passive: true });
  
  // Get base path for image (handles subdirectories)
  function getBasePath() {
    const path = window.location.pathname;
    // Count directory depth
    const parts = path.split('/').filter(p => p && !p.includes('.html'));
    if (parts.length === 0) return '';
    return '../'.repeat(parts.length);
  }
  
  function triggerEasterEgg() {
    // Increment and save trigger count
    konamiTriggerCount++;
    try {
      localStorage.setItem('konami_trigger_count', konamiTriggerCount.toString());
    } catch {}
    
    // Play a triumphant beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 523.25; // C5 note
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // Audio API not supported, silently fail
    }
    
    // Pick a random quote
    const randomQuote = teamAmericaQuotes[Math.floor(Math.random() * teamAmericaQuotes.length)];
    
    // Create overlay for Team America GIFs with center image
    const overlay = document.createElement('div');
    overlay.id = 'konami-overlay';
    overlay.innerHTML = `
      <div class="konami-center-content">
        <img src="/bftb.png" alt="Easter Egg" class="konami-center-image">
        <div class="konami-quote">${randomQuote}</div>
        <div class="konami-achievement">🏆 Triggered ${konamiTriggerCount} time${konamiTriggerCount !== 1 ? 's' : ''}!</div>
        <button class="konami-close" aria-label="Close">&times;</button>
      </div>
      <div class="america-gifs-container"></div>
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
        background: rgba(0, 0, 0, 0.85);
        z-index: 10000;
        animation: konamiFadeIn 0.3s ease-out;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      @keyframes konamiFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .konami-center-content {
        position: relative;
        z-index: 10001;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .konami-center-image {
        max-width: 80vw;
        max-height: 50vh;
        border-radius: 12px;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
        animation: konamiImagePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      .konami-quote {
        margin-top: 24px;
        font-size: 28px;
        font-weight: 900;
        color: #fff;
        text-shadow: 
          3px 3px 0 #dc2626,
          -1px -1px 0 #1e40af,
          1px -1px 0 #1e40af,
          -1px 1px 0 #1e40af,
          1px 1px 0 #1e40af,
          0 0 20px rgba(220, 38, 38, 0.8);
        text-align: center;
        max-width: 90vw;
        animation: konamiQuoteBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s backwards;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      
      .konami-achievement {
        margin-top: 16px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #78350f;
        border-radius: 24px;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.5);
        animation: konamiAchievementSlide 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s backwards;
      }
      
      @keyframes konamiImagePop {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes konamiQuoteBounce {
        0% { transform: translateY(-30px) scale(0.8); opacity: 0; }
        60% { transform: translateY(5px) scale(1.05); }
        100% { transform: translateY(0) scale(1); opacity: 1; }
      }
      
      @keyframes konamiAchievementSlide {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .america-gifs-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
      }
      
      .america-gif-collage {
        position: absolute;
        transform: translate(-50%, -50%);
        opacity: 0;
        animation: gifFadeIn 0.5s ease-out forwards, gifFloat 3s ease-in-out infinite;
        filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
        z-index: 9999;
      }
      
      .america-gif-collage.loaded {
        opacity: 1;
      }
      
      .america-gif-collage img {
        width: 120px;
        height: 120px;
        object-fit: cover;
        border-radius: 8px;
        border: 2px solid rgba(255, 215, 0, 0.6);
      }
      
      @keyframes gifFadeIn {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      
      @keyframes gifFloat {
        0%, 100% {
          transform: translate(-50%, -50%) translateY(0) rotate(0deg);
        }
        50% {
          transform: translate(-50%, -50%) translateY(-10px) rotate(2deg);
        }
      }
      
      .konami-close {
        position: absolute;
        top: -15px;
        right: -15px;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffd700, #ffb800);
        color: #333;
        font-size: 26px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
        z-index: 10002;
        transition: transform 0.2s;
      }
      
      .konami-close:hover {
        transform: scale(1.1);
      }
      
      @media (max-width: 768px) {
        .konami-center-image {
          max-width: 90vw;
          max-height: 40vh;
        }
        
        .konami-quote {
          font-size: 20px;
          margin-top: 16px;
          padding: 0 16px;
        }
        
        .konami-achievement {
          font-size: 14px;
          padding: 10px 20px;
          margin-top: 12px;
        }
        
        .america-gif-collage img {
          width: 80px;
          height: 80px;
        }
        
        .konami-close {
          width: 38px;
          height: 38px;
          font-size: 22px;
          top: -10px;
          right: -10px;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    // Team America: World Police GIFs - 50 local GIF files
    // We select 24 random ones to display in a collage around the center image
    // Total GIF count: 50 unique local files
    // Files should be located in /assets/gifs/ as america-01.gif through america-50.gif
    const americaGifs = Array.from({ length: 50 }, (_, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `/assets/gifs/america-${num}.gif`;
    });
    
    const gifsContainer = overlay.querySelector('.america-gifs-container');
    
    // Select 24 random GIFs from the pool of 50 for the collage using Fisher-Yates shuffle
    function shuffleArray(array) {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    
    const shuffledGifs = shuffleArray(americaGifs).slice(0, 24);
    
    // Create collage layout with 24 GIFs positioned around the center
    // Positions array has exactly 24 positions to match shuffledGifs.slice(0, 24)
    // Layout: 6 on top, 6 on right, 6 on bottom, 6 on left
    function createCollageGifs() {
      const positions = [
        // Top row (6 GIFs)
        { top: '5%', left: '15%' },
        { top: '5%', left: '28%' },
        { top: '5%', left: '41%' },
        { top: '5%', left: '54%' },
        { top: '5%', left: '67%' },
        { top: '5%', left: '80%' },
        
        // Right side (6 GIFs)
        { top: '18%', left: '88%' },
        { top: '31%', left: '88%' },
        { top: '44%', left: '88%' },
        { top: '57%', left: '88%' },
        { top: '70%', left: '88%' },
        { top: '83%', left: '88%' },
        
        // Bottom row (6 GIFs)
        { top: '90%', left: '80%' },
        { top: '90%', left: '67%' },
        { top: '90%', left: '54%' },
        { top: '90%', left: '41%' },
        { top: '90%', left: '28%' },
        { top: '90%', left: '15%' },
        
        // Left side (6 GIFs)
        { top: '83%', left: '5%' },
        { top: '70%', left: '5%' },
        { top: '57%', left: '5%' },
        { top: '44%', left: '5%' },
        { top: '31%', left: '5%' },
        { top: '18%', left: '5%' }
      ];
      
      // Concurrency control: limit simultaneous GIF loads
      const MAX_CONCURRENT_LOADS = 6;
      let activeLoads = 0;
      const loadQueue = [];
      
      function loadGifWithConcurrency(gifUrl, img, gif) {
        return new Promise((resolve) => {
          function attemptLoad() {
            if (activeLoads >= MAX_CONCURRENT_LOADS) {
              loadQueue.push(attemptLoad);
              return;
            }
            
            activeLoads++;
            
            // Set up error handler first
            img.onerror = function() {
              // Failed to load GIF - using fallback image silently
              // Use fallback image
              img.src = '/assets/images/gif-fallback.svg';
              // Still mark as loaded so it appears
              gif.classList.add('loaded');
              completeLoad();
            };
            
            // Set up success handler
            img.onload = function() {
              gif.classList.add('loaded');
              completeLoad();
            };
            
            // Start loading
            img.src = gifUrl;
          }
          
          function completeLoad() {
            activeLoads--;
            resolve();
            // Process next in queue
            if (loadQueue.length > 0) {
              const nextLoad = loadQueue.shift();
              nextLoad();
            }
          }
          
          attemptLoad();
        });
      }
      
      // Create all GIF elements
      const loadPromises = shuffledGifs.map((gifUrl, index) => {
        const gif = document.createElement('div');
        gif.className = 'america-gif-collage';
        
        const img = document.createElement('img');
        img.alt = 'Team America GIF';
        img.loading = 'eager'; // Load immediately for better Easter egg UX
        
        gif.appendChild(img);
        
        // Position the GIF
        const pos = positions[index];
        gif.style.top = pos.top;
        gif.style.left = pos.left;
        
        // Add staggered animation delay for cascade effect
        gif.style.animationDelay = (index * 0.05) + 's';
        
        gifsContainer.appendChild(gif);
        
        // Start loading with concurrency control
        return loadGifWithConcurrency(gifUrl, img, gif);
      });
      
      // Konami code GIF collage loading complete
    });
    }
    
    // Create the collage
    createCollageGifs();
    
    // Close on button click
    overlay.querySelector('.konami-close').addEventListener('click', closeEasterEgg);
    
    // Close on overlay click (outside GIFs)
    // Add a delay to prevent immediate closure from the final tap on mobile
    setTimeout(function() {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          closeEasterEgg();
        }
      });
    }, MOBILE_TOUCH_DELAY);
    
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
})();
