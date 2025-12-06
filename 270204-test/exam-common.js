// =====================================================
// Exam Common Script for 270201/270203/270204 format
// - Handles #question-container based exam pages
// - Progress tracking, autosave, grading, review mode
// =====================================================

;(function() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExam);
  } else {
    initExam();
  }
})();

function initExam() {
  const container = document.getElementById('question-container');
  if (!container) return;

  const questions = Array.from(container.querySelectorAll('.question'));
  if (!questions.length) return;

  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  const examKey = 'examState:' + window.location.pathname;
  const orderKey = 'examOrder:' + window.location.pathname;

  // Initially hide questions until Start is clicked (optional - can be removed)
  // For now, we'll show all questions immediately and Start will scroll to top

  // Create result banner if it doesn't exist
  let resultBanner = document.getElementById('result-banner');
  if (!resultBanner) {
    resultBanner = document.createElement('div');
    resultBanner.id = 'result-banner';
    resultBanner.className = 'result-banner';
    container.parentNode.insertBefore(resultBanner, container.nextSibling);
  }

  // Add back link if it doesn't exist
  let backLink = document.querySelector('.back-to-index');
  if (!backLink) {
    backLink = document.createElement('div');
    backLink.className = 'back-to-index';
    backLink.innerHTML = '<a href="index.html">← Back to module selection</a>';
    container.parentNode.insertBefore(backLink, container);
  }

  // Check for saved state
  let hasSavedAnswers = false;
  let hasSavedOrder = false;
  try {
    const savedState = JSON.parse(localStorage.getItem(examKey) || 'null');
    if (savedState && Array.isArray(savedState)) {
      hasSavedAnswers = savedState.some(entry => entry && entry.value != null);
    }
    const savedOrder = JSON.parse(localStorage.getItem(orderKey) || 'null');
    hasSavedOrder = savedOrder && savedOrder.questions && Array.isArray(savedOrder.questions);
  } catch {}

  // Shuffle or restore order
  if (!hasSavedAnswers) {
    shuffleQuestions(container, questions, orderKey);
  } else if (hasSavedOrder) {
    restoreOrder(container, questions, orderKey);
  }

  // Restore saved answers
  restoreState(questions, examKey);

  // Update progress
  updateProgress();

  // Event delegation for answer changes
  container.addEventListener('change', function(e) {
    if (e.target.type === 'radio') {
      const q = e.target.closest('.question');
      if (q && !q.classList.contains('answered')) {
        q.classList.add('answered');
      }
      updateProgress();
      saveState(questions, examKey);
    }
  });

  // Button handlers
  if (btnStart) {
    btnStart.addEventListener('click', function() {
      window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', handleRetake);
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', handleSubmit);
  }

  // Hide prev/next if they exist (show all questions at once)
  if (btnPrev) btnPrev.style.display = 'none';
  if (btnNext) btnNext.style.display = 'none';

  function updateProgress() {
    const total = questions.length;
    let answered = 0;
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].querySelector('input[type="radio"]:checked')) {
        answered++;
      }
    }
    const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
    
    if (progressBar) {
      progressBar.style.setProperty('--progress', pct + '%');
    }
    if (progressText) {
      progressText.textContent = answered + ' / ' + total;
    }
  }

  function handleSubmit() {
    if (document.body.classList.contains('review-mode')) return;

    const result = gradeExam(questions);
    const total = questions.length;
    const score = Math.round((result.correct / total) * 100);

    resultBanner.innerHTML = '<strong>' + score + '%</strong> — ' + 
      result.correct + ' correct, ' + 
      result.incorrect + ' incorrect, ' + 
      result.unanswered + ' unanswered.';
    resultBanner.classList.add('visible');

    document.body.classList.add('review-mode');

    // Disable inputs
    const allInputs = container.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < allInputs.length; i++) {
      allInputs[i].disabled = true;
    }

    // Save score
    try {
      localStorage.setItem(examKey + ':lastScore', String(score));
      const examId = getExamIdFromTitle();
      if (examId) {
        localStorage.setItem('examScore:' + examId, String(score));
      }
    } catch {}

    // Scroll to first incorrect or top
    const firstIncorrect = container.querySelector('.question.incorrect');
    if (firstIncorrect) {
      firstIncorrect.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleRetake() {
    // Clear question states
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      q.classList.remove('correct', 'incorrect', 'answered');
      const labels = q.querySelectorAll('label');
      for (let j = 0; j < labels.length; j++) {
        labels[j].classList.remove('correct', 'incorrect');
      }
      const inputs = q.querySelectorAll('input[type="radio"]');
      for (let j = 0; j < inputs.length; j++) {
        inputs[j].checked = false;
        inputs[j].disabled = false;
      }
    }

    resultBanner.classList.remove('visible');
    resultBanner.textContent = '';
    document.body.classList.remove('review-mode');

    // Shuffle
    shuffleQuestions(container, questions, orderKey);
    updateProgress();

    try {
      localStorage.removeItem(examKey);
      localStorage.removeItem(examKey + ':lastScore');
      localStorage.removeItem(orderKey);
    } catch {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function gradeExam(questions) {
    const answerMap = window.ANSWERS || {};
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      q.classList.remove('correct', 'incorrect');

      const labels = q.querySelectorAll('label');
      for (let j = 0; j < labels.length; j++) {
        labels[j].classList.remove('correct', 'incorrect');
      }

      const anyRadio = q.querySelector('input[type="radio"]');
      if (!anyRadio) {
        unanswered++;
        continue;
      }

      const name = anyRadio.name;
      const chosen = q.querySelector('input[type="radio"]:checked');
      
      // Handle both "q1" -> "1" and "q1" -> "q1" answer key formats
      const numericKey = name.replace(/^q/, '');
      const correctVal = answerMap[numericKey] || answerMap[name];
      
      if (!correctVal) {
        // No answer key found
        unanswered++;
        continue;
      }

      // Find the correct input (case-insensitive)
      const correctInput = findCorrectInput(q, name, correctVal);

      if (!chosen) {
        unanswered++;
        if (correctInput) {
          const correctLabel = correctInput.closest('label');
          if (correctLabel) correctLabel.classList.add('correct');
        }
        continue;
      }

      if (correctInput && chosen.value.toUpperCase() === correctVal.toUpperCase()) {
        correct++;
        q.classList.add('correct');
        const label = chosen.closest('label');
        if (label) label.classList.add('correct');
      } else {
        incorrect++;
        q.classList.add('incorrect');
        
        // Mark the user's choice as incorrect
        const chosenLabel = chosen.closest('label');
        if (chosenLabel) chosenLabel.classList.add('incorrect');
        
        // Mark the correct answer
        if (correctInput) {
          const correctLabel = correctInput.closest('label');
          if (correctLabel) correctLabel.classList.add('correct');
        }
      }
    }

    return { correct, incorrect, unanswered };
  }

  function findCorrectInput(q, name, correctVal) {
    const inputs = q.querySelectorAll('input[type="radio"][name="' + CSS.escape(name) + '"]');
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].value.toUpperCase() === correctVal.toUpperCase()) {
        return inputs[i];
      }
    }
    return null;
  }

  function saveState(questions, key) {
    const state = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const radio = q.querySelector('input[type="radio"]');
      if (!radio) continue;
      const name = radio.name;
      const checked = q.querySelector('input[type="radio"]:checked');
      state.push({ name: name, value: checked ? checked.value : null });
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }

  function restoreState(questions, key) {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      saved = null;
    }
    if (!saved || !Array.isArray(saved)) return;

    const savedByName = {};
    for (let i = 0; i < saved.length; i++) {
      if (saved[i] && saved[i].name) {
        savedByName[saved[i].name] = saved[i].value;
      }
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const firstRadio = q.querySelector('input[type="radio"]');
      if (!firstRadio) continue;

      const name = firstRadio.name;
      const value = savedByName[name];
      if (!value) continue;

      const match = q.querySelector('input[type="radio"][name="' + CSS.escape(name) + '"][value="' + CSS.escape(value) + '"]');
      if (match) {
        match.checked = true;
        q.classList.add('answered');
      }
    }
  }

  function shuffleQuestions(container, questions, orderKey) {
    const shuffled = questions.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      var temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    const fragment = document.createDocumentFragment();
    const orderData = { questions: [], options: {} };

    for (let i = 0; i < shuffled.length; i++) {
      const q = shuffled[i];
      fragment.appendChild(q);

      const firstRadio = q.querySelector('input[type="radio"]');
      const qName = firstRadio ? firstRadio.name : null;
      if (qName) {
        orderData.questions.push(qName);
      }

      // Shuffle options within question
      const labels = Array.from(q.querySelectorAll('label'));
      if (labels.length > 0) {
        const parent = labels[0].parentElement;
        for (let j = labels.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          var tempLabel = labels[j];
          labels[j] = labels[k];
          labels[k] = tempLabel;
        }

        if (qName) {
          orderData.options[qName] = labels.map(function(label) {
            var radio = label.querySelector('input[type="radio"]');
            return radio ? radio.value : null;
          }).filter(function(v) { return v != null; });
        }

        const labelFragment = document.createDocumentFragment();
        for (let j = 0; j < labels.length; j++) {
          labelFragment.appendChild(labels[j]);
        }
        parent.appendChild(labelFragment);
      }
    }

    container.appendChild(fragment);

    if (orderKey) {
      try {
        localStorage.setItem(orderKey, JSON.stringify(orderData));
      } catch {}
    }
  }

  function restoreOrder(container, questions, orderKey) {
    let savedOrder;
    try {
      savedOrder = JSON.parse(localStorage.getItem(orderKey) || 'null');
    } catch {
      return;
    }

    if (!savedOrder || !savedOrder.questions || !Array.isArray(savedOrder.questions)) {
      return;
    }

    const questionsByName = {};
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const firstRadio = q.querySelector('input[type="radio"]');
      if (firstRadio) {
        questionsByName[firstRadio.name] = q;
      }
    }

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < savedOrder.questions.length; i++) {
      const qName = savedOrder.questions[i];
      const q = questionsByName[qName];
      if (q) {
        fragment.appendChild(q);
        delete questionsByName[qName];
      }
    }

    // Append remaining
    for (var key in questionsByName) {
      fragment.appendChild(questionsByName[key]);
    }

    container.appendChild(fragment);

    // Restore option order
    if (savedOrder.options) {
      for (let i = 0; i < savedOrder.questions.length; i++) {
        const qName = savedOrder.questions[i];
        const q = container.querySelector('.question input[name="' + CSS.escape(qName) + '"]');
        if (!q) continue;
        const qElement = q.closest('.question');
        if (!qElement) continue;

        const optionOrder = savedOrder.options[qName];
        if (!optionOrder || !Array.isArray(optionOrder)) continue;

        const labels = qElement.querySelectorAll('label');
        if (!labels.length) continue;

        const parent = labels[0].parentElement;
        const labelsByValue = {};
        for (let j = 0; j < labels.length; j++) {
          const radio = labels[j].querySelector('input[type="radio"]');
          if (radio) {
            labelsByValue[radio.value] = labels[j];
          }
        }

        const labelFragment = document.createDocumentFragment();
        for (let j = 0; j < optionOrder.length; j++) {
          const value = optionOrder[j];
          const label = labelsByValue[value];
          if (label) {
            labelFragment.appendChild(label);
            delete labelsByValue[value];
          }
        }

        for (var val in labelsByValue) {
          labelFragment.appendChild(labelsByValue[val]);
        }

        parent.appendChild(labelFragment);
      }
    }
  }

  function getExamIdFromTitle() {
    const title = document.title || '';
    const match = title.match(/^(27\d{3}[0-9A-Za-z]*)/);
    return match ? match[1] : null;
  }
}
