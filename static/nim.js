// Nim 21: Only 21 numbered buttons. Player clicks the next number 1–3 times per turn.
// Turn auto-ends after 1s of inactivity or when 3 numbers are selected. AI uses mixed strategy.
(function () {
  let initialized = false;

  function init() {
    if (initialized) return;
    const grid = document.getElementById('nim21Grid');
    if (!grid) return; // Initialize only when panel exists
    initialized = true;

    const statusEl = document.getElementById('nimStatus');

    // State
    const MAX_NUM = 21;
    let nextNumber = 1;      // next untaken number (1..21)
    let playerTurn = true;   // player starts
    let gameOver = false;

    // Player turn click tracking
    let turnClicks = 0;
    let turnTimer = null;

    const buttons = [];

    function setStatus(text) {
      if (statusEl) statusEl.textContent = text;
    }

    function clearTurnTimer() {
      if (turnTimer) {
        clearTimeout(turnTimer);
        turnTimer = null;
      }
    }

    function startOrResetTurnTimer() {
      clearTurnTimer();
      // Auto-end player's turn after 1s without clicking another number
      turnTimer = setTimeout(endPlayerTurn, 1000);
    }

    function buildGrid() {
      grid.innerHTML = '';
      for (let i = 1; i <= MAX_NUM; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = String(i);
        btn.className = 'btn-outline';
        btn.style.minWidth = '44px';
        btn.style.padding = '8px 0';
        btn.disabled = i !== nextNumber; // Only the next number is clickable
        btn.addEventListener('click', function () {
          onPlayerClick(i);
        });
        grid.appendChild(btn);
        buttons[i] = btn; // store by number
      }
      updateGrid();
    }

    function updateGrid() {
      for (let i = 1; i <= MAX_NUM; i++) {
        const btn = buttons[i];
        const taken = i < nextNumber;
        btn.disabled = taken || i !== nextNumber || !playerTurn || gameOver;
        btn.style.opacity = taken ? '0.5' : '1';
        btn.classList.toggle('btn-outline', !taken);
        btn.classList.toggle('btn-gold', false);
      }
    }

    function applyTake(who, count) {
      const remaining = MAX_NUM - (nextNumber - 1);
      const n = Math.max(1, Math.min(3, Math.min(count | 0, remaining)));
      for (let k = 0; k < n; k++) {
        const num = nextNumber++;
        const btn = buttons[num];
        if (btn) {
          btn.disabled = true;
          btn.style.opacity = '0.5';
        }
      }

      if (nextNumber > MAX_NUM) {
        // Last number (21) was just taken
        gameOver = true;
        setStatus(who === 'player' ? 'You took 21. You win!' : 'AI took 21. AI wins!');
      }
      updateGrid();
      return n;
    }

    function onPlayerClick(n) {
      if (gameOver) return;
      if (!playerTurn) {
        setStatus('Please wait. It’s the AI’s turn.');
        return;
      }
      if (n !== nextNumber) {
        setStatus('You must press the next number: ' + nextNumber + '.');
        return;
      }

      applyTake('player', 1);
      turnClicks += 1;

      if (gameOver) return;

      if (turnClicks >= 3) {
        endPlayerTurn();
      } else {
        setStatus('You may press up to ' + (3 - turnClicks) + ' more ' + (3 - turnClicks === 1 ? 'time' : 'times') + '...');
        startOrResetTurnTimer();
        updateGrid();
      }
    }

    function endPlayerTurn() {
      clearTurnTimer();
      if (gameOver) return;
      playerTurn = false;
      turnClicks = 0;
      setStatus('AI is thinking...');
      updateGrid();
      setTimeout(aiTurn, 450);
    }

    function optimalTake() {
      // Aim to end the AI's move with total taken ≡ 1 (mod 4)
      const total = nextNumber - 1; // already taken
      let n = (1 - (total % 4) + 4) % 4;
      if (n === 0) n = 1;
      n = Math.max(1, Math.min(3, n));
      const remaining = MAX_NUM - (nextNumber - 1);
      if (n > remaining) n = Math.max(1, Math.min(3, remaining));
      return n;
    }

    function aiTurn() {
      if (gameOver) return;

      // Mixed AI: mostly optimal, sometimes random so it doesn't always win
      const remaining = MAX_NUM - (nextNumber - 1);
      let toTake;
      if (Math.random() < 0.7) {
        toTake = optimalTake();
      } else {
        toTake = 1 + Math.floor(Math.random() * Math.min(3, remaining));
      }

      setStatus('AI takes ' + toTake + (toTake === 1 ? ' number...' : ' numbers...'));

      // Animate AI pressing numbers with small delay between presses
      let count = toTake;
      (function step() {
        if (count <= 0 || gameOver) {
          if (!gameOver) {
            playerTurn = true;
            setStatus('Your turn. Click the next number (you can take up to 3).');
            updateGrid();
          }
          return;
        }
        applyTake('ai', 1);
        count -= 1;
        if (!gameOver) {
          setTimeout(step, 220);
        }
      })();
    }

    function newGame() {
      nextNumber = 1;
      playerTurn = true;
      gameOver = false;
      turnClicks = 0;
      clearTurnTimer();
      buildGrid();
      setStatus('Your turn. Click the next number (you can take up to 3).');
    }

    // Expose only for potential reuse (no extra UI buttons required)
    window.nim21NewGame = newGame;

    // Start
    newGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
  window.addEventListener('load', function () { setTimeout(init, 0); });
})();
