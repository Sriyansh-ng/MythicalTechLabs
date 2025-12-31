// Math Quiz: Grade 1–3
(function () {
  const els = {
    setup: document.getElementById('mathQuizSetup'),
    grade: document.getElementById('mathGradeSelect'),
    start: document.getElementById('mathStartQuizBtn'),

    container: document.getElementById('mathQuizContainer'),
    progress: document.getElementById('mathQuizProgress'),
    question: document.getElementById('mathQuizQuestion'),
    options: document.getElementById('mathQuizOptions'),
    submit: document.getElementById('mathQuizSubmitBtn'),

    result: document.getElementById('mathQuizResult'),
    score: document.getElementById('mathQuizScore'),
    review: document.getElementById('mathQuizReview'),
    playAgain: document.getElementById('mathQuizPlayAgain'),
    changeGrade: document.getElementById('mathQuizChangeGrade'),
  };

  if (!els.start) return;

  const TOTAL_QUESTIONS = 5;

  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function uniqueChoices(correct, genFn, count = 4) {
    const set = new Set([correct]);
    let guard = 0;
    const MAX_TRIES = 100;
    while (set.size < count && guard < MAX_TRIES) {
      set.add(genFn());
      guard++;
    }
    // Deterministic backfill if randomness didn't produce enough uniques
    if (set.size < count) {
      const base = Number(correct);
      const fallbacks = [
        base + 1, base - 1, base + 2, base - 2, base + 3, base - 3,
        base + 4, base - 4, base + 5, base - 5
      ];
      for (const v of fallbacks) {
        set.add(String(v));
        if (set.size >= count) break;
      }
    }
    return Array.from(set).slice(0, count);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Generate a single math question based on grade
  function generateQuestion(grade) {
    let a, b, op, text, answer, expl;

    if (grade === 'grade1') {
      // Within 0-20, only + or - (non-negative results)
      op = Math.random() < 0.5 ? '+' : '-';
      if (op === '+') {
        a = randInt(0, 10); b = randInt(0, 10); answer = a + b;
      } else {
        a = randInt(0, 20); b = randInt(0, a); answer = a - b;
      }
    } else if (grade === 'grade2') {
      // + or - up to 100, and some easy x up to 10x10
      const t = randInt(1, 3);
      if (t === 1) { // addition
        a = randInt(10, 99); b = randInt(10, 99); op = '+'; answer = a + b;
      } else if (t === 2) { // subtraction non-negative
        a = randInt(20, 99); b = randInt(0, a); op = '-'; answer = a - b;
      } else { // multiplication small
        a = randInt(2, 10); b = randInt(2, 10); op = '×'; answer = a * b;
      }
    } else {
      // grade3: × and ÷ (integer results), some +/-
      const t = randInt(1, 4);
      if (t === 1) { // multiplication
        a = randInt(3, 12); b = randInt(3, 12); op = '×'; answer = a * b;
      } else if (t === 2) { // division with exact result
        b = randInt(2, 12);
        const q = randInt(2, 12);
        a = b * q;
        op = '÷'; answer = q;
      } else if (t === 3) {
        a = randInt(50, 199); b = randInt(10, 99); op = '+'; answer = a + b;
      } else {
        a = randInt(50, 199); b = randInt(10, a); op = '-'; answer = a - b;
      }
    }

    text = `${a} ${op} ${b} = ?`;
    expl = `Because ${a} ${op} ${b} = ${answer}.`;

    // Build options
    const distractorFn = () => {
      const delta = randInt(-10, 10) || 1;
      return answer + delta;
    };
    const opts = shuffle(uniqueChoices(answer, distractorFn, 4)).map(String);

    return { text, answer: String(answer), options: opts, explanation: expl };
  }

  function generateQuiz(grade) {
    const qs = [];
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      qs.push(generateQuestion(grade));
    }
    return qs;
  }

  const state = {
    grade: '',
    questions: [],
    index: 0,
    score: 0,
    answers: [], // {selected, correct, text}
  };

  function renderOptions(options) {
    els.options.innerHTML = '';
    options.forEach((opt, idx) => {
      const id = `mathOpt_${state.index}_${idx}`;
      const label = document.createElement('label');
      label.className = 'quiz-option';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '10px';
      label.style.margin = '6px 0';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'mathOption';
      input.value = opt;
      input.id = id;

      const span = document.createElement('span');
      span.textContent = opt;

      label.appendChild(input);
      label.appendChild(span);
      els.options.appendChild(label);

      input.addEventListener('change', () => {
        els.submit.disabled = false;
      });
    });
    els.submit.disabled = true;
  }

  function renderQuestion() {
    const q = state.questions[state.index];
    els.progress.textContent = `Question ${state.index + 1} of ${TOTAL_QUESTIONS}`;
    els.question.textContent = q.text;
    renderOptions(q.options);
  }

  function showReview() {
    els.review.innerHTML = '';
    els.review.style.display = 'block';
    const list = document.createElement('ol');
    list.style.margin = '8px 0';
    state.answers.forEach((a, i) => {
      const li = document.createElement('li');
      li.style.margin = '6px 0';
      const correct = a.selected === a.correct;
      li.innerHTML = `
        <div><strong>Q${i + 1}:</strong> ${a.text}</div>
        <div>Your answer: <strong style="color:${correct ? '#10b981' : '#ef4444'}">${a.selected}</strong>
        ${correct ? '✓' : ` (Correct: ${a.correct})`}</div>
      `;
      list.appendChild(li);
    });
    els.review.appendChild(list);
  }

  function showResult() {
    els.container.style.display = 'none';
    els.result.style.display = 'block';
    els.score.textContent = `You scored ${state.score} out of ${TOTAL_QUESTIONS}.`;
    showReview();
  }

  function nextOrFinish() {
    if (state.index + 1 < TOTAL_QUESTIONS) {
      state.index += 1;
      renderQuestion();
    } else {
      showResult();
    }
  }

  function startQuiz(grade) {
    state.grade = grade;
    state.questions = generateQuiz(grade);
    state.index = 0;
    state.score = 0;
    state.answers = [];

    els.setup.style.display = 'none';
    els.result.style.display = 'none';
    els.container.style.display = 'block';
    renderQuestion();
  }

  els.start.addEventListener('click', () => {
    const grade = els.grade?.value || '';
    if (!grade) {
      alert('Please choose a grade to start.');
      return;
    }
    startQuiz(grade);
  });

  els.submit.addEventListener('click', () => {
    const chosen = els.options.querySelector('input[name="mathOption"]:checked');
    if (!chosen) return;
    const q = state.questions[state.index];
    const selected = chosen.value;
    const correct = q.answer;
    if (selected === correct) state.score += 1;

    state.answers.push({
      selected,
      correct,
      text: q.text,
    });

    nextOrFinish();
  });

  els.playAgain.addEventListener('click', () => {
    if (!state.grade) {
      els.setup.style.display = 'block';
      els.container.style.display = 'none';
      els.result.style.display = 'none';
      return;
    }
    startQuiz(state.grade);
  });

  els.changeGrade.addEventListener('click', () => {
    els.setup.style.display = 'block';
    els.container.style.display = 'none';
    els.result.style.display = 'none';
  });
})();
