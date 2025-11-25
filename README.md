<nav class="inner-tabs">
        <button class="tablink gold" onclick="openInnerTab('snake')">Snake Game</button>
        <button class="tablink gold" onclick="openInnerTab('tictactoe')">Tic-Tac-Toe</button>
        <button class="tablink gold" onclick="openInnerTab('pacman')">Pac-Man</button>
        <!-- ... existing code ... -->
        <!-- Pong tab button -->
        <button class="tablink gold" onclick="openInnerTab('pong')">Pong</button>
      </nav>
      <!-- ... existing code ... -->
      <section id="snake" class="inner-tabcontent">
        <h2>Snake</h2>
        <canvas id="snake-canvas" width="600" height="400"></canvas>
        <p class="hint">Use arrow keys to move.</p>
      </section>
      <!-- ... existing code ... -->
      <!-- Pong panel -->
      <section id="pong" class="inner-tabcontent">
        <h2>Pong</h2>
        <canvas id="pong-canvas" width="640" height="400" style="max-width: 100%; display: block; margin: 0 auto; border: 2px solid #FFD700; background:#111;"></canvas>
        <p class="hint" style="text-align:center">
          Left: W/S keys • Right: ↑/↓ keys
        </p>
      </section>
      <!-- ... existing code ... -->
  <script defer src="{{ url_for('static', filename='tabs-inner.js') }}"></script>
  <!-- ... existing code ... -->
  <script>
// Minimal Pong that matches the site's gold-on-dark aesthetic
(function () {
  const GOLD = '#FFD700';
  const FG = '#EEE';
  const BG = '#111';

  const canvas = document.getElementById('pong-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const paddleW = 12, paddleH = 70, paddleInset = 18, ballSize = 10;
  const left = { x: paddleInset, y: (H - paddleH) / 2, vy: 0, score: 0 };
  const right = { x: W - paddleInset - paddleW, y: (H - paddleH) / 2, vy: 0, score: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 4, vy: 2.5, s: ballSize };
  const keys = { w: false, s: false, up: false, down: false };

  let lastTime = 0;
  let running = true;

  function resetBall(dir = 1) {
    ball.x = W / 2; ball.y = H / 2;
    const speed = 4 + Math.random() * 2;
    const angle = (Math.random() * 0.7 - 0.35);
    ball.vx = speed * dir;
    ball.vy = speed * angle;
  }

  function drawCourt() {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
  }

  function drawPaddles() {
    ctx.fillStyle = FG;
    ctx.fillRect(left.x, left.y, paddleW, paddleH);
    ctx.fillRect(right.x, right.y, paddleW, paddleH);
  }

  function drawBall() {
    ctx.fillStyle = FG;
    ctx.fillRect(ball.x - ball.s / 2, ball.y - ball.s / 2, ball.s, ball.s);
  }

  function drawScore() {
    ctx.fillStyle = GOLD;
    ctx.font = '24px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(left.score, W * 0.25, 34);
    ctx.fillText(right.score, W * 0.75, 34);
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function update(dt) {
    const speed = 260;

    left.vy = (keys.w ? -speed : 0) + (keys.s ? speed : 0);
    right.vy = (keys.up ? -speed : 0) + (keys.down ? speed : 0);

    left.y = clamp(left.y + left.vy * dt, 0, H - paddleH);
    right.y = clamp(right.y + right.vy * dt, 0, H - paddleH);

    ball.x += ball.vx; ball.y += ball.vy;

    if (ball.y - ball.s / 2 <= 0 && ball.vy < 0) { ball.y = ball.s / 2; ball.vy *= -1; }
    if (ball.y + ball.s / 2 >= H && ball.vy > 0) { ball.y = H - ball.s / 2; ball.vy *= -1; }

    if (ball.vx < 0 &&
        ball.x - ball.s / 2 <= left.x + paddleW &&
        ball.y + ball.s / 2 >= left.y &&
        ball.y - ball.s / 2 <= left.y + paddleH) {
      ball.x = left.x + paddleW + ball.s / 2;
      ball.vx *= -1.05;
      const hit = (ball.y - (left.y + paddleH / 2)) / (paddleH / 2);
      ball.vy = Math.max(-6, Math.min(6, ball.vy + hit * 2.2));
    }

    if (ball.vx > 0 &&
        ball.x + ball.s / 2 >= right.x &&
        ball.y + ball.s / 2 >= right.y &&
        ball.y - ball.s / 2 <= right.y + paddleH) {
      ball.x = right.x - ball.s / 2;
      ball.vx *= -1.05;
      const hit = (ball.y - (right.y + paddleH / 2)) / (paddleH / 2);
      ball.vy = Math.max(-6, Math.min(6, ball.vy + hit * 2.2));
    }

    if (ball.x < -ball.s) { right.score++; resetBall(1); }
    if (ball.x > W + ball.s) { left.score++; resetBall(-1); }
  }

  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0.016);
    lastTime = ts;

    const panel = canvas.closest('.inner-tabcontent');
    const visible = panel && panel.offsetParent !== null;
    if (visible) {
      update(dt);
      drawCourt(); drawPaddles(); drawBall(); drawScore();
    }
    requestAnimationFrame(frame);
  }

  function onKey(e, down) {
    if (e.code === 'KeyW') keys.w = down;
    if (e.code === 'KeyS') keys.s = down;
    if (e.code === 'ArrowUp') keys.up = down;
    if (e.code === 'ArrowDown') keys.down = down;
  }

  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  resetBall(Math.random() < 0.5 ? -1 : 1);
  requestAnimationFrame((t) => { lastTime = t; requestAnimationFrame(frame); });

  window.addEventListener('beforeunload', () => { running = false; });
})();
  </script>
