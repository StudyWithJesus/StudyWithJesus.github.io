document.addEventListener('DOMContentLoaded', () => {
  /* ========== LOADING OVERLAY ========== */
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 250);
  }

  /* ========== BANNER PARALLAX ========== */
  const header = document.querySelector('.site-header');
  if (header) {
    const baseX = 48;
    const baseY = 34;
    header.style.backgroundPosition = `${baseX}% ${baseY}%`;

    window.addEventListener('scroll', () => {
      if (window.innerWidth <= 768) return;
      const scrolled = window.scrollY || window.pageYOffset || 0;
      const offset = scrolled * 0.03;
      const y = baseY + offset;
      header.style.backgroundPosition = `${baseX}% ${y}%`;
    });
  }

  /* ========== QUIZ LOGIC ========== */
  const btn = document.getElementById('submit-btn');
  const form = document.getElementById('quiz-form');
  const banner = document.getElementById('result-banner');

  const progressFill = document.getElementById('exam-progress-fill');
  const progressText = document.getElementById('exam-progress-text');

  if (!btn || !form || !window.ANSWERS) return;

  const STORAGE_KEY = 'quiz:' + window.location.pathname;
  const LAYOUT_KEY = STORAGE_KEY + ':layout';
  const SUBMIT_KEY = STORAGE_KEY + ':submitted';

  let submitted = false;
  const lockedQuestions = new Set(); // which questions are "locked" after first pick

  /* ----- helpers ----- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function saveLayout(layout) {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch (_) {}
  }

  function loadLayout() {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearLayout() {
    try {
      localStorage.removeItem(LAYOUT_KEY);
    } catch (_) {}
  }

  function getSavedAnswers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function saveState() {
    const state = {};
    form.querySelectorAll('input[type="radio"]').forEach(input => {
      if (input.checked) state[input.name] = input.value;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SUBMIT_KEY);
    } catch (_) {}
  }

  function lockGroup(qName) {
    lockedQuestions.add(qName);
    const anyInput = form.querySelector(`input[name="${qName}"]`);
    if (anyInput) {
      const qBox = anyInput.closest('.question');
      if (qBox) qBox.classList.add('locked');
    }
  }

  function unlockAllGroups() {
    lockedQuestions.clear();
    form.querySelectorAll('.question').forEach(q => q.classList.remove('locked'));
  }

  /* ----- progress bar ----- */
  function updateProgress() {
    if (!progressFill || !progressText) return;

    const total = Object.keys(window.ANSWERS).length;
    const seen = new Set();
    let answered = 0;

    form.querySelectorAll('input[type="radio"]').forEach(input => {
      if (seen.has(input.name)) return;
      seen.add(input.name);
      const anyChecked = form.querySelector(
        `input[name="${input.name}"]:checked`
      );
      if (anyChecked) answered++;
    });

    const pct = total ? (answered / total) * 100 : 0;
    progressFill.style.width = pct + '%';
    progressText.textContent = `${answered} / ${total} answered`;
  }

  /* ----- layout (shuffle / restore) ----- */
  function applyLayout(layout) {
    if (!layout || !layout.order || !layout.options) return;

    const questions = Array.from(form.querySelectorAll('.question'));
    if (!questions.length) return;

    const actions = form.querySelector('.exam-actions');
    const map = {};

    questions.forEach(q => {
      const firstInput = q.querySelector('input[type="radio"]');
      if (!firstInput) return;
      map[firstInput.name] = q;
    });

    layout.order.forEach(name => {
      const q = map[name];
      if (q) form.insertBefore(q, actions);
    });

    Object.keys(layout.options).forEach(name => {
      const q = map[name];
      if (!q) return;
      const labels = Array.from(q.querySelectorAll('label'));
      const byValue = {};
      labels.forEach(label => {
        const input = label.querySelector('input[type="radio"]');
        if (!input) return;
        byValue[input.value] = label;
      });
      layout.options[name].forEach(val => {
        const label = byValue[val];
        if (label) q.appendChild(label);
      });
    });
  }

  function randomizeLayout() {
    const questions = Array.from(form.querySelectorAll('.question'));
    if (!questions.length) return;

    const actions = form.querySelector('.exam-actions');
    const order = [];
    const optionsLayout = {};

    shuffle(questions);

    questions.forEach(q => {
      const firstInput = q.querySelector('input[type="radio"]');
      if (!firstInput) return;
      const name = firstInput.name;
      order.push(name);

      const labels = Array.from(q.querySelectorAll('label'));
      shuffle(labels);
      optionsLayout[name] = [];
      labels.forEach(label => {
        const input = label.querySelector('input[type="radio"]');
        if (!input) return;
        optionsLayout[name].push(input.value);
        q.appendChild(label);
      });

      form.insertBefore(q, actions);
    });

    saveLayout({ order, options: optionsLayout });
  }

  /* ----- marking & restore ----- */
  function markQuestion(qName) {
    const anyInput = form.querySelector(`input[name="${qName}"]`);
    if (!anyInput) return;

    const box = anyInput.closest('.question');
    const selected = form.querySelector(
      `input[name="${qName}"]:checked`
    );

    box.classList.remove('correct', 'incorrect');
    if (!selected) return;

    if (selected.value === window.ANSWERS[qName]) {
      box.classList.add('correct');
    } else {
      box.classList.add('incorrect');
    }
  }

  function loadStateIntoForm() {
    let state = null;
    try {
      state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (_) {
      state = null;
    }
    if (!state) {
      updateProgress();
      return;
    }

    Object.keys(state).forEach(qName => {
      const val = state[qName];
      const input = form.querySelector(
        `input[name="${qName}"][value="${val}"]`
      );
      if (input) {
        input.checked = true;
        markQuestion(qName);
        lockGroup(qName); // mark as locked
      }
    });

    updateProgress();
  }

  /* ----- grading & reset ----- */
  function grade() {
    let score = 0;
    const questions = Array.from(form.querySelectorAll('.question'));

    questions.forEach(q => {
      const firstInput = q.querySelector('input[type="radio"]');
      if (!firstInput) return;
      const qName = firstInput.name;
      const selected = form.querySelector(
        `input[name="${qName}"]:checked`
      );

      q.classList.remove('correct', 'incorrect');

      if (!selected) return;

      if (selected.value === window.ANSWERS[qName]) {
        score++;
        q.classList.add('correct');
      } else {
        q.classList.add('incorrect');
      }
    });

    const total = Object.keys(window.ANSWERS).length;
    const pct = total ? (score / total) * 100 : 0;
    const pass = pct >= 70;

    if (banner) {
      banner.className = '';
      banner.classList.add(pass ? 'pass' : 'fail');
      banner.textContent =
        `Score: ${score}/${total} (${pct.toFixed(
          0
        )}%). ` + (pass ? 'PASS' : 'REVIEW RECOMMENDED');
      banner.style.display = 'block';
    }

    if (progressFill) {
      progressFill.classList.remove('pass', 'fail');
      progressFill.classList.add(pass ? 'pass' : 'fail');
    }

    submitted = true;
    try {
      localStorage.setItem(SUBMIT_KEY, '1');
    } catch (_) {}
    btn.textContent = 'Retake Test';
    btn.classList.add('submitted');
  }

  function reset() {
    form.querySelectorAll('.question').forEach(q => {
      q.classList.remove('correct', 'incorrect', 'locked');
    });

    form.querySelectorAll('input[type="radio"]').forEach(i => {
      i.checked = false;
    });

    if (banner) {
      banner.style.display = 'none';
      banner.textContent = '';
      banner.className = '';
    }

    clearState();
    clearLayout();
    if (progressFill) {
      progressFill.classList.remove('pass', 'fail');
      progressFill.style.width = '0%';
    }

    submitted = false;
    btn.textContent = 'Submit Answers';
    btn.classList.remove('submitted');
    unlockAllGroups();

    randomizeLayout();
    updateProgress();
  }

  /* ----- initial layout decision ----- */
  const savedAnswers = getSavedAnswers();
  const hasProgress =
    savedAnswers && Object.keys(savedAnswers).length > 0;
  const wasSubmitted =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem(SUBMIT_KEY) === '1';

  if (!wasSubmitted && hasProgress) {
    const layout = loadLayout();
    if (layout) {
      applyLayout(layout);
    } else {
      randomizeLayout();
    }
  } else {
    clearState();
    clearLayout();
    randomizeLayout();
  }

  // restore answers & update progress
  loadStateIntoForm();

  /* ----- radio change events ----- */
  form.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (submitted) return;

      const qName = radio.name;

      // If this question is already locked, snap back to the original answer
      if (lockedQuestions.has(qName)) {
        const state = getSavedAnswers() || {};
        const prev = state[qName];
        form.querySelectorAll(`input[name="${qName}"]`).forEach(i => {
          i.checked = (i.value === prev);
        });
        return;
      }

      // First time answering this question
      markQuestion(qName);
      lockGroup(qName);
      saveState();
      updateProgress();
    });
  });

  btn.addEventListener('click', () => {
    if (!submitted) {
      grade();
    } else {
      reset();
    }
  });
});
