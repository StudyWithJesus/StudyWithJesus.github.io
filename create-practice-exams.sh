#!/bin/bash

# Create practice exam files for each section
# Each exam has 100 questions and a 50-minute (3000 second) timer

create_practice_exam() {
  local module_num="$1"
  local section_name="$2"
  local filename="practice-exams/${module_num} - ${section_name} Practice Exam.html"
  
  cat > "$filename" << 'HTML_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MODULE_NUM - SECTION_NAME Practice Exam</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="../style.css">
  <script src="../config/firebase.config.js"></script>
  <script src="../assets/js/leaderboard-firebase.js"></script>
  <script src="../assets/js/leaderboard.js"></script>
  <script src="../assets/whitelist-fingerprint.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
  <script src="../assets/fingerprint-logger.js"></script>
</head>
<body>

  <div id="loading-overlay">
    <div class="spinner"></div>
  </div>

  <header class="site-header site-header--hero">
    <div class="header-fog"></div>
    <div class="header-particles"></div>
    <div class="header-content">
      <h1>SECTION_NAME</h1>
      <p>MODULE_NUM Practice Exam - 100 Questions</p>
    </div>
  </header>

  <div class="exam-progress">
    <div class="exam-progress-bar">
      <div id="exam-progress-fill" class="exam-progress-fill"></div>
    </div>
    <div id="exam-progress-text" class="exam-progress-text">
      0 / 100 answered
    </div>
  </div>

  <main class="page-content">
    <div class="back-link">
      <a href="../index.html">&larr; Back to home</a>
    </div>

    <section class="quiz-page-header">
      <h2>Module MODULE_NUM Practice Exam &mdash; SECTION_NAME</h2>
      <p>
        100-question practice exam covering all topics in SECTION_NAME. Timer: 50 minutes (30 seconds per question).
      </p>
    </section>

    <form id="quiz-form" class="exam-form" data-module="MODULE_NUM" data-exam="practice" data-timer-duration="3000">
QUESTIONS_PLACEHOLDER
      <div class="exam-actions" id="exam-actions-top">
        <button type="button" id="submit-btn-top" class="btn-submit disabled" disabled>Submit Answers</button>
      </div>
    </form>
  </main>

  <script src="../script.js"></script>
</body>
</html>
HTML_EOF

  # Replace placeholders
  sed -i "s/MODULE_NUM/$module_num/g" "$filename"
  sed -i "s/SECTION_NAME/$section_name/g" "$filename"
  
  # Generate 100 placeholder questions
  questions=""
  for i in {1..100}; do
    questions+="      <div class=\"question\">
        <p class=\"question-text\">
          <strong>Question $i:</strong> [Placeholder question text - add your question here]
        </p>
        <div class=\"answers\">
          <label><input type=\"radio\" name=\"q$i\" value=\"A\"> A) [Option A]</label>
          <label><input type=\"radio\" name=\"q$i\" value=\"B\"> B) [Option B]</label>
          <label><input type=\"radio\" name=\"q$i\" value=\"C\"> C) [Option C]</label>
          <label><input type=\"radio\" name=\"q$i\" value=\"D\"> D) [Option D]</label>
        </div>
        <div class=\"answer-feedback\" data-correct=\"A\"></div>
      </div>

"
  done
  
  # Insert questions
  sed -i "s|QUESTIONS_PLACEHOLDER|$questions|" "$filename"
  
  echo "Created: $filename"
}

# Create all 4 practice exams
create_practice_exam "270201" "Engines and Related Systems"
create_practice_exam "270202" "Power Train"
create_practice_exam "270203" "Hydraulics, Steering, Suspension and Air Brakes"
create_practice_exam "270204" "Electrical, Autobody, Agriculture and Mobile Industrial Equipment"

echo "✅ All practice exams created!"
