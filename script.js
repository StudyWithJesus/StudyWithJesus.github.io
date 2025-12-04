document.addEventListener('DOMContentLoaded', () => {
  // Hide loader on all pages
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    // small delay so you actually see the spinner on fast loads
    setTimeout(() => loader.classList.add('hidden'), 250);
  }

  const btn = document.getElementById('submit-btn');
  const form = document.getElementById('quiz-form');
  const banner = document.getElementById('result-banner');

  // If this page doesn't have a quiz, stop here (banner and exam logic won't run on the home page)
  if (!btn || !form || !window.ANSWERS) return;

  const STORAGE_KEY = 'quiz:' + location.pathname;
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
    shuffle(qs);
    const actions = form.querySelector('.exam-actions');
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
    } catch (e) {}
  }

  function loadState() {
    let state = null;
    try {
      state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) { state = null; }
    if (!state) return;
    Object.keys(state).forEach(qName => {
      const val = state[qName];
      const input = form.querySelector(`input[name="${qName}"][value="${val}"]`);
      if (input) {
        input.checked = true;
        mark(qName);
      }
    });
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function mark(qName) {
    const any = form.querySelector(`input[name="${qName}"]`);
    if (!any) return;
    const box = any.closest('.question');
    const selected = form.querySelector(`input[name="${qName}"]:checked`);
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
      const selected = form.querySelector(`input[name="${qName}"]:checked`);
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
      banner.textContent = `Score: ${score}/${total} (${pct.toFixed(0)}%). ` +
        (pass ? 'PASS' : 'REVIEW RECOMMENDED');
      banner.style.display = 'block';
    }

    submitted = true;
    btn.textContent = 'Retake Test';
    btn.classList.add('submitted');
  }

  function reset() {
    form.querySelectorAll('.question').forEach(q => q.classList.remove('correct', 'incorrect'));
    form.querySelectorAll('input[type="radio"]').forEach(i => { i.checked = false; });
    if (banner) {
      banner.style.display = 'none';
      banner.textContent = '';
      banner.className = '';
    }
    clearState();
    shuffleQuestions();
    shuffleAnswers();
    submitted = false;
    btn.textContent = 'Submit Answers';
    btn.classList.remove('submitted');
  }

  form.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!submitted) mark(radio.name);
      saveState();
    });
  });

  btn.addEventListener('click', () => {
    if (!submitted) grade();
    else reset();
  });

  loadState();
});
