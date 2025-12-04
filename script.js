document.addEventListener('DOMContentLoaded', () => {
  /* ============================================
     LOADING OVERLAY
     ============================================ */
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    // small delay so you actually see the spinner on fast loads
    setTimeout(() => loader.classList.add('hidden'), 250);
  }

  /* ============================================
     BANNER PARALLAX (HOME PAGE)
     ============================================ */
  const header = document.querySelector('.site-header');
  if (header) {
    // these match your CSS background-position: 48% 34%;
    const baseX = 48;
    const baseY = 34;

    // set initial position explicitly so JS & CSS agree
    header.style.backgroundPosition = `${baseX}% ${baseY}%`;

    window.addEventListener('scroll', () => {
      // only do parallax on wider screens (desktop / tablet)
      if (window.innerWidth <= 768) return;

      const scrolled = window.scrollY || window.pageYOffset || 0;
      const offset = scrolled * 0.03; // tiny factor for slow movement
      const y = baseY + offset;
      header.style.backgroundPosition = `${baseX}% ${y}%`;
    });
  }

  /* ============================================
     QUIZ / EXAM LOGIC
     (only runs on pages that actually have a quiz)
     ============================================ */
  const btn = document.getElementById('submit-btn');
  const form = document.getElementById('quiz-form');
  const banner = document.getElementById('result-banner');

  // If this page doesn't have a quiz, stop here
  if (!btn || !form || !window.ANSWERS) return;

  const STORAGE_KEY = 'quiz:' + window.location.pathname;
  let submitted = false;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function shuffleQuestions() {
    const qs = Array.from(form.querySelectorAll('.question'));
    if (!qs.length) return;
    const actions = form.querySelector('.exam-actions');
    shuffle(qs);
    qs.forEach(q => form.insertBefore(q, actions));
  }

  function shuffleAnswers() {
    const qs = Array.from(form.querySelectorAll('.question'));
    qs.forEach(q => {
      const labels = Array.from(q.querySelectorAll('label'));
      if (labels.length <= 1) return;
      shuffle(labels);
      labels.forEach(l => q.appendChild(l));
    });
  }

  function saveState() {
    const state = {};
    form.querySelectorAll('input[type="radio"]').forEach(i => {
      if (i.checked) state[i.name] = i.value;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore storage errors
    }
  }

  function loadState() {
    let state = null;
    try {
      state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      state = null;
    }
    if (!state) return;

    Object.keys(state).forEach(qName => {
      const val = state[qName];
      const input = form.querySelector(
        `input[name="${qName}"][value="${val}"]`
      );
      if (input) {
        input.checked = true;
        mark(qName); // re-mark for hybrid mode
      }
    });
  }

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }

  function mark(qName) {
    const any = form.querySelector(`input[name="${qName}"]`);
    if (!any) return;
    const box = any.closest('.question');
    const selected = form.querySelector(
      `input[name="${qName}"]:checked`
    );

    box.classList.remove('correct', 'incorrect');
    if (!selected) return;

    if (selected.value === ANSWERS[qName]) {
      box.classList.add('correct');
    } else {
      box.classList.add('incorrect');
    }
  }

  function grade() {
    let score = 0;
    const qs = Array.from(form.querySelectorAll('.question'));

    qs.forEach(q => {
      const firstInput = q.querySelector('input[type="radio"]');
      if (!firstInput) return;

      const qName = firstInput.name;
      const selected = form.querySelector(
        `input[name="${qName}"]:checked`
      );

      q.classList.remove('correct', 'incorrect');

      if (!selected) return;

      if (selected.value === ANSWERS[qName]) {
        score++;
        q.classList.add('correct');
      } else {
        q.classList.add('incorrect');
      }
    });

    const total = Object.keys(ANSWERS).length;
    const pct = total ? (score / total) * 100 : 0;
    const pass = pct >= 70;

    if (banner) {
      banner.className = '';
      banner.classList.add(pass ? 'pass' : 'fail');
      banner.textContent =
        `Score: ${score}/${total} (${pct.toFixed(0)}%). ` +
        (pass ? 'PASS' : 'REVIEW RECOMMENDED');
      banner.style.display = 'block';
    }

    submitted = true;
    btn.textContent = 'Retake Test';
    btn.classList.add('submitted');
  }

  function reset() {
    form
      .querySelectorAll('.question')
      .forEach(q => q.classList.remove('correct', 'incorrect'));

    form
      .querySelectorAll('input[type="radio"]')
      .forEach(i => {
        i.checked = false;
      });

    if (banner) {
      banner.style.display = 'none';
      banner.textContent = '';
      banner.className = '';
    }

    clearState();

    // Scramble questions and answers on every retake
    shuffleQuestions();
    shuffleAnswers();

    submitted = false;
    btn.textContent = 'Submit Answers';
    btn.classList.remove('submitted');
  }

  // Instant per-question feedback + autosave
  form.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!submitted) mark(radio.name);
      saveState();
    });
  });

  // Submit / Retake button
  btn.addEventListener('click', () => {
    if (!submitted) {
      grade();
    } else {
      reset();
    }
  });

  // Load saved answers (if any)
  loadState();
});
