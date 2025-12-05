// Main behaviour for exams: progress, scoring, review mode, autosave, banner parallax
document.addEventListener("DOMContentLoaded", () => {
  initExamLogic();
  initHeaderParallax();
});

function initExamLogic() {
  const form = document.querySelector(".exam-form");
  const questions = form ? Array.from(form.querySelectorAll(".question")) : [];
  if (!form || questions.length === 0) return;

  const progressFill = document.querySelector(".exam-progress-fill");
  const progressText = document.querySelector(".exam-progress-text");
  const submitBtn = document.getElementById("submit-btn");
  const retakeBtn = document.getElementById("retake-btn");
  const reviewBtn = document.getElementById("review-btn");
  const resultBanner = document.getElementById("result-banner");

  const examKey = "examState:" + (document.body.dataset.examId || window.location.pathname);

  // Optional: shuffle questions/options if data-shuffle="true" on form
  if (form.dataset.shuffle === "true") {
    shuffleQuestions(form, questions);
  }

  // Restore saved answers
  restoreState(questions, examKey);

  // Hook radio changes
  questions.forEach(q => {
    q.addEventListener("change", () => {
      q.classList.add("answered");
      updateProgress(questions, progressFill, progressText);
      saveState(questions, examKey);
    });
  });

  updateProgress(questions, progressFill, progressText);

  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const { correct, incorrect, unanswered } = gradeExam(questions);
      const total = questions.length;
      const score = Math.round((correct / total) * 100);
      if (resultBanner) {
        resultBanner.innerHTML =
          `<strong>${score}%</strong> — ${correct} correct, ${incorrect} incorrect, ${unanswered} unanswered.`;
        resultBanner.classList.add("visible");
      }
      document.body.classList.remove("review-mode");
      window.scrollTo({ top: 0, behavior: "smooth" });
      try {
        localStorage.setItem(examKey + ":lastScore", String(score));
      } catch {}
    });
  }

  if (retakeBtn) {
    retakeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      questions.forEach(q => {
        q.classList.remove("correct", "incorrect", "answered");
        q.querySelectorAll("label").forEach(label => {
          label.classList.remove("correct", "incorrect");
        });
        q.querySelectorAll('input[type="radio"]').forEach(input => {
          input.checked = false;
        });
      });
      if (resultBanner) {
        resultBanner.classList.remove("visible");
        resultBanner.textContent = "";
      }
      document.body.classList.remove("review-mode");
      updateProgress(questions, progressFill, progressText);
      try {
        localStorage.removeItem(examKey);
        localStorage.removeItem(examKey + ":lastScore");
      } catch {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (reviewBtn) {
    reviewBtn.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.toggle("review-mode");
      const firstIncorrect = questions.find(q => q.classList.contains("incorrect"));
      if (document.body.classList.contains("review-mode") && firstIncorrect) {
        firstIncorrect.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
}

function updateProgress(questions, progressFill, progressText) {
  if (!progressFill || !progressText) return;
  const total = questions.length;
  const answered = questions.reduce((count, q) => {
    const checked = q.querySelector('input[type="radio"]:checked');
    return count + (checked ? 1 : 0);
  }, 0);
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  progressFill.style.width = pct + "%";
  const bar = progressFill.parentElement;
  if (bar) {
    bar.classList.remove("progress-animate");
    void bar.offsetWidth;
    bar.classList.add("progress-animate");
  }
  progressText.textContent = `${answered} / ${total} answered`;
}

function gradeExam(questions) {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  questions.forEach(q => {
    q.classList.remove("correct", "incorrect");
    q.querySelectorAll("label").forEach(l => l.classList.remove("correct", "incorrect"));

    const chosen = q.querySelector('input[type="radio"]:checked');
    const correctInput = q.querySelector('input[type="radio"][data-correct="true"]');

    if (!chosen) {
      unanswered++;
      return;
    }

    if (chosen && chosen.dataset.correct === "true") {
      correct++;
      q.classList.add("correct");
      if (correctInput) {
        const label = correctInput.closest("label");
        if (label) label.classList.add("correct");
      }
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
  });

  return { correct, incorrect, unanswered };
}

function saveState(questions, key) {
  const state = questions.map(q => {
    const radio = q.querySelector('input[type="radio"]');
    if (!radio) return null;
    const name = radio.name;
    const checked = q.querySelector('input[type="radio"]:checked');
    return { name, value: checked ? checked.value : null };
  }).filter(Boolean);

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

  const savedByName = new Map();
  saved.forEach(entry => {
    if (entry && entry.name) savedByName.set(entry.name, entry.value);
  });

  questions.forEach(q => {
    const radios = Array.from(q.querySelectorAll('input[type="radio"]'));
    if (radios.length === 0) return;
    const name = radios[0].name;
    const value = savedByName.get(name);
    if (!value) return;
    const match = q.querySelector(`input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`);
    if (match) {
      match.checked = true;
      q.classList.add("answered");
    }
  });
}

function shuffleQuestions(form, questions) {
  const container = form.querySelector(".exam-form") || form;
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.forEach(q => container.appendChild(q));

  // shuffle options in each question too
  shuffled.forEach(q => {
    const labels = Array.from(q.querySelectorAll("label"));
    const parent = labels[0] ? labels[0].parentElement : null;
    if (!parent) return;
    const shuffledLabels = [...labels];
    for (let i = shuffledLabels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledLabels[i], shuffledLabels[j]] = [shuffledLabels[j], shuffledLabels[i]];
    }
    shuffledLabels.forEach(l => parent.appendChild(l));
  });
}

/* ===== Parallax for header ===== */
function initHeaderParallax() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  let ticking = false;

  function applyParallax(xPercent, yPercent) {
    const maxTilt = 4;
    const rotateY = maxTilt * xPercent;
    const rotateX = -maxTilt * yPercent;
    header.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  function handlePointer(e) {
    const rect = header.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    if (!ticking) {
      window.requestAnimationFrame(() => {
        applyParallax(x, y);
        ticking = false;
      });
      ticking = true;
    }
  }

  header.addEventListener("mousemove", handlePointer);

  header.addEventListener("mouseleave", () => {
    header.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  });

  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", (event) => {
      const beta = event.beta || 0;
      const gamma = event.gamma || 0;
      const xPercent = Math.max(-0.5, Math.min(0.5, gamma / 45));
      const yPercent = Math.max(-0.5, Math.min(0.5, beta / 45));
      applyParallax(xPercent, yPercent);
    });
  }
}
