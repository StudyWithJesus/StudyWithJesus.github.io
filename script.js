document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('submit-btn');
  const form = document.getElementById('quiz-form');
  const resultDiv = document.getElementById('result');

  if (!btn || !form || !window.ANSWERS) return;

  btn.addEventListener('click', () => {
    let score = 0;
    const questions = form.querySelectorAll('.question');
    const total = Object.keys(ANSWERS).length;

    questions.forEach((questionDiv, index) => {
      const qName = 'q' + (index + 1);
      const selected = form.querySelector(`input[name="${qName}"]:checked`);

      questionDiv.classList.remove('correct', 'incorrect');

      if (!selected) return;

      if (selected.value === ANSWERS[qName]) {
        score++;
        questionDiv.classList.add('correct');
      } else {
        questionDiv.classList.add('incorrect');
      }
    });

    resultDiv.textContent = `You scored ${score} / ${total}`;
  });
});
