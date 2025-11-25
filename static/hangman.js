// Hangman game for Game Hub: real words list, letters-only input, mobile keyboard
(function () {
  let initialized = false;

  function init() {
    if (initialized) return;
    const canvas = document.getElementById('hangmanCanvas');
    if (!canvas) return;
    initialized = true;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Curated list of real words
    const WORDS = [
      'apple','planet','galaxy','python','wizard','castle','ocean','forest','guitar','mountain',
      'rocket','dragon','bridge','puzzle','switch','silver','golden','thunder','autumn','winter',
      'spring','summer','desert','island','animal','flower','garden','future','energy',
      'music','artist','family','friend','school','doctor','engine','window','pillow',
      'butter','honey','breeze','shadow','whisper','basket','candle','mirror','jungle','valley',
      'river','comet','meteor','nebula','oxygen','carbon','hydrogen','diamond','emerald','sapphire',
      'pearl','banana','orange','grapes','peanut','walnut','coffee','cocoa','cookie','brownie',
      'muffin','donuts','pepper','tomato','potato','onions','carrot','celery','ginger','garlic',
      'violet','indigo','purple','yellow','orange','crimson','scarlet','magenta','turquoise','teal'
    ];

    // Game state
    let secretWord = '';
    let revealed = [];           // boolean per letter
    let guessed = new Set();     // guessed letters
    let wrongLetters = [];
    let wrongCount = 0;
    const maxWrong = 6;
    let gameOver = false;

    // Elements
    const elMasked = document.getElementById('hangmanMasked');
    const elWrong = document.getElementById('hangmanWrong');
    const elMsg = document.getElementById('hangmanMessage');
    const kb = document.getElementById('hangmanKeyboard');
    const guessInput = document.getElementById('hangmanWordGuess');

    function randWord() {
      return WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
    }

    function drawBase() {
      // background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // gallows
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // base
      ctx.moveTo(W * 0.15, H * 0.85);
      ctx.lineTo(W * 0.55, H * 0.85);
      // pole
      ctx.moveTo(W * 0.25, H * 0.85);
      ctx.lineTo(W * 0.25, H * 0.15);
      // top
      ctx.lineTo(W * 0.55, H * 0.15);
      // rope
      ctx.lineTo(W * 0.55, H * 0.28);
      ctx.stroke();
    }

    function drawMan(stage) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      // Head
      if (stage >= 1) {
        ctx.beginPath();
        ctx.arc(W * 0.55, H * 0.34, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Body
      if (stage >= 2) {
        ctx.beginPath();
        ctx.moveTo(W * 0.55, H * 0.34 + 16);
        ctx.lineTo(W * 0.55, H * 0.34 + 16 + 44);
        ctx.stroke();
      }
      // Left arm
      if (stage >= 3) {
        ctx.beginPath();
        ctx.moveTo(W * 0.55, H * 0.34 + 24);
        ctx.lineTo(W * 0.55 - 22, H * 0.34 + 36);
        ctx.stroke();
      }
      // Right arm
      if (stage >= 4) {
        ctx.beginPath();
        ctx.moveTo(W * 0.55, H * 0.34 + 24);
        ctx.lineTo(W * 0.55 + 22, H * 0.34 + 36);
        ctx.stroke();
      }
      // Left leg
      if (stage >= 5) {
        ctx.beginPath();
        ctx.moveTo(W * 0.55, H * 0.34 + 60);
        ctx.lineTo(W * 0.55 - 18, H * 0.34 + 88);
        ctx.stroke();
      }
      // Right leg
      if (stage >= 6) {
        ctx.beginPath();
        ctx.moveTo(W * 0.55, H * 0.34 + 60);
        ctx.lineTo(W * 0.55 + 18, H * 0.34 + 88);
        ctx.stroke();
      }
    }

    function render() {
      drawBase();
      drawMan(wrongCount);
    }

    function maskedWord() {
      return secretWord.split('').map((ch, i) => (revealed[i] ? ch : '_')).join(' ');
    }

    function updateUI() {
      if (elMasked) elMasked.textContent = maskedWord();
      if (elWrong) elWrong.textContent = wrongLetters.length ? 'Wrong: ' + wrongLetters.join(', ') : 'Wrong: –';

      // Update keyboard buttons
      if (kb && kb.children && kb.children.length) {
        for (const btn of kb.children) {
          const letter = btn.getAttribute('data-letter');
          if (!letter) continue;
          const used = guessed.has(letter);
          btn.disabled = used || gameOver;
          btn.classList.toggle('btn-outline', !used);
          btn.classList.toggle('btn-gold', false);
        }
      }
    }

    function checkEnd() {
      const won = revealed.every(Boolean);
      if (won) {
        gameOver = true;
        if (elMsg) elMsg.textContent = 'You win! The word was: ' + secretWord;
      } else if (wrongCount >= maxWrong) {
        gameOver = true;
        if (elMsg) elMsg.textContent = 'You lose! The word was: ' + secretWord;
      }
    }

    function guessLetter(letter) {
      if (gameOver) return;
      const L = letter.toUpperCase();
      if (!/^[A-Z]$/.test(L)) return;
      if (guessed.has(L)) return;
      guessed.add(L);

      let hit = false;
      for (let i = 0; i < secretWord.length; i++) {
        if (secretWord[i] === L) {
          revealed[i] = true;
          hit = true;
        }
      }
      if (!hit) {
        wrongCount++;
        wrongLetters.push(L);
      }
      render();
      updateUI();
      checkEnd();
    }

    function guessWholeWord(word) {
      if (gameOver) return;
      const clean = (word || '').toUpperCase().trim();
      if (!/^[A-Z]+$/.test(clean)) {
        if (elMsg) elMsg.textContent = 'Please enter letters only (A–Z).';
        return;
      }
      if (clean === secretWord) {
        // Reveal all
        for (let i = 0; i < secretWord.length; i++) revealed[i] = true;
        render();
        updateUI();
        checkEnd();
      } else {
        // Penalize a wrong full-word guess by +2 strikes
        wrongCount = Math.min(maxWrong, wrongCount + 2);
        if (elMsg) elMsg.textContent = 'Not quite! Try guessing letters.';
        render();
        updateUI();
        checkEnd();
      }
    }

    function buildKeyboard() {
      if (!kb) return;
      kb.innerHTML = '';
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (const ch of letters) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = ch;
        btn.className = 'btn-outline';
        btn.setAttribute('data-letter', ch);
        btn.addEventListener('click', () => guessLetter(ch));
        kb.appendChild(btn);
      }
    }

    function newGame() {
      secretWord = randWord();
      revealed = Array(secretWord.length).fill(false);
      guessed.clear();
      wrongLetters = [];
      wrongCount = 0;
      gameOver = false;
      if (elMsg) elMsg.textContent = '';
      if (guessInput) guessInput.value = '';
      render();
      updateUI();
    }

    // Public API
    window.hangmanNewGame = newGame;
    window.hangmanGuess = guessLetter;
    window.hangmanGuessWord = function () {
      if (!guessInput) return;
      guessWholeWord(guessInput.value || '');
      guessInput.value = '';
      guessInput.focus();
    };

    // Keyboard input (desktop)
    function onKeyDown(e) {
      if (gameOver) return;
      const key = e.key || '';
      if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();
        guessLetter(key.toUpperCase());
      } else if (key === 'Enter') {
        if (guessInput && guessInput.value) {
          e.preventDefault();
          window.hangmanGuessWord();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // Initialize UI and start first game
    buildKeyboard();
    newGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
  window.addEventListener('load', function () { setTimeout(init, 0); });
})();
