// Classic Pong for Game Hub with 3 stages and imperfect AI
(function () {
  let initialized = false;

  function init() {
    if (initialized) return;
    const canvas = document.getElementById('pongCanvas');
    if (!canvas) return; // Safe no-op until the tab is present
    initialized = true;

    const ctx = canvas.getContext('2d');

    // Dimensions and gameplay constants scaled from canvas size
    const W = canvas.width;
    const H = canvas.height;

    const PADDLE_W = Math.max(8, Math.round(W * 0.015));
    const PADDLE_H = Math.round(H * 0.22);
    const MARGIN = Math.round(W * 0.03);
    const BASE_SPEED = Math.max(5, Math.round(H * 0.012));
    const BALL_R = Math.max(5, Math.round(Math.min(W, H) * 0.015));

    const player = { x: W - MARGIN - PADDLE_W, y: H / 2 - PADDLE_H / 2, dy: 0 };
    const ai = { x: MARGIN, y: H / 2 - PADDLE_H / 2, dy: 0 };
    const ball = { x: W / 2, y: H / 2, dx: 0, dy: 0, speed: BASE_SPEED + 1 };

    let playerScore = 0;
    let aiScore = 0;

    // Stage handling: 1 (easy), 2 (medium), 3 (hard but beatable)
    let stage = 1;
    const STAGES = {
      1: { aiSpeedMul: 0.65, reactionMs: 140, jitter: 28, mistakeProb: 0.12, mistakeDurMs: 550, maxBallSpeedMul: 1.7 },
      2: { aiSpeedMul: 0.85, reactionMs: 100, jitter: 14, mistakeProb: 0.08, mistakeDurMs: 450, maxBallSpeedMul: 1.9 },
      3: { aiSpeedMul: 1.05, reactionMs:  80, jitter:  8, mistakeProb: 0.05, mistakeDurMs: 380, maxBallSpeedMul: 2.0 }
    };

    let aiAimY = ai.y;                // AI's aimed top position for paddle
    let nextReactAt = performance.now(); // Next time AI updates target
    let mistakeUntil = 0;             // If > now, AI is in a "mistake" window

    function cfg() { return STAGES[stage] || STAGES[1]; }

    function updateScoreText() {
      const el = document.getElementById('pongScore');
      if (el) el.textContent = `Player: ${playerScore} — AI: ${aiScore}`;
    }

    function updateStageUI() {
      const label = document.getElementById('pongStageLabel');
      if (label) label.textContent = `Stage: ${stage}`;
      for (let i = 1; i <= 3; i++) {
        const b = document.getElementById('pongStage' + i);
        if (b) {
          const pressed = i === stage;
          b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
          if (pressed) b.classList.add('active'); else b.classList.remove('active');
        }
      }
    }

    function clamp(v, min, max) {
      return v < min ? min : v > max ? max : v;
    }

    function serve(toRight) {
      ball.x = W / 2;
      ball.y = H / 2;
      const angle = (Math.random() * 0.6 - 0.3); // -0.3..0.3
      const dir = toRight ? 1 : -1;
      ball.speed = BASE_SPEED + 1;
      ball.dx = dir * ball.speed;
      ball.dy = ball.speed * angle;
    }

    updateScoreText();
    updateStageUI();
    serve(Math.random() < 0.5);

    // Input handling
    let keyUp = false;
    let keyDown = false;

    function onKeyDown(e) {
      if (e.key === 'ArrowUp') { keyUp = true; e.preventDefault(); }
      if (e.key === 'ArrowDown') { keyDown = true; e.preventDefault(); }
    }
    function onKeyUp(e) {
      if (e.key === 'ArrowUp') { keyUp = false; e.preventDefault(); }
      if (e.key === 'ArrowDown') { keyDown = false; e.preventDefault(); }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Expose D‑Pad helpers for mobile
    window.pongHold = function (dir) {
      if (dir === 'UP') { keyUp = true; keyDown = false; }
      else if (dir === 'DOWN') { keyDown = true; keyUp = false; }
    };
    window.pongStop = function () {
      keyUp = false; keyDown = false;
    };
    window.restartPong = function () {
      playerScore = 0;
      aiScore = 0;
      player.y = H / 2 - PADDLE_H / 2;
      ai.y = H / 2 - PADDLE_H / 2;
      updateScoreText();
      serve(Math.random() < 0.5);
    };
    window.setPongStage = function (n) {
      const s = (n | 0);
      stage = s < 1 ? 1 : (s > 3 ? 3 : s);
      updateStageUI();
      // Neutral restart of the rally (do not change scores)
      serve(Math.random() < 0.5);
    };

    function drawNet() {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      const dash = 8, gap = 12;
      let y = 0;
      ctx.beginPath();
      while (y < H) {
        ctx.moveTo(W / 2, y);
        ctx.lineTo(W / 2, Math.min(H, y + dash));
        y += dash + gap;
      }
      ctx.stroke();
    }

    function draw() {
      // Background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      drawNet();

      // Paddles
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ai.x, ai.y, PADDLE_W, PADDLE_H);
      ctx.fillRect(player.x, player.y, PADDLE_W, PADDLE_H);

      // Ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    function resetAfterScore(scoredByPlayer) {
      if (scoredByPlayer) playerScore++; else aiScore++;
      updateScoreText();
      serve(!scoredByPlayer); // Serve towards the player who lost the point
    }

    function updateAI(now) {
      const c = cfg();

      // Update AI aim with a reaction interval and some jitter
      if (now >= nextReactAt) {
        nextReactAt = now + c.reactionMs;

        // Base aim: center the ball on paddle with jitter error
        aiAimY = ball.y - PADDLE_H / 2 + (Math.random() * 2 - 1) * c.jitter;

        // Occasional "mistake" window where aim is notably off and slower
        if (Math.random() < c.mistakeProb) {
          mistakeUntil = now + c.mistakeDurMs;
          aiAimY += (Math.random() * 2 - 1) * (c.jitter * 4 + 50);
        }

        // If ball is moving very fast, make the AI hesitate slightly more
        const bs = Math.hypot(ball.dx, ball.dy);
        if (bs > BASE_SPEED * 1.6) {
          nextReactAt += 30;
        }
      }

      // Speed according to stage, slower during mistake window
      let aiSpeed = BASE_SPEED * c.aiSpeedMul;
      if (now < mistakeUntil) aiSpeed *= 0.6;

      // Move AI toward its aimed Y, clamped by its speed
      const delta = clamp(aiAimY - ai.y, -aiSpeed, aiSpeed);
      ai.y = clamp(ai.y + delta, 0, H - PADDLE_H);
    }

    function update() {
      const now = performance.now();

      // Player movement
      player.dy = (keyUp ? -BASE_SPEED : 0) + (keyDown ? BASE_SPEED : 0);
      player.y = clamp(player.y + player.dy, 0, H - PADDLE_H);

      // AI movement
      updateAI(now);

      // Move ball
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Wall collision (top/bottom)
      if (ball.y - BALL_R <= 0 && ball.dy < 0) {
        ball.y = BALL_R;
        ball.dy *= -1;
      }
      if (ball.y + BALL_R >= H && ball.dy > 0) {
        ball.y = H - BALL_R;
        ball.dy *= -1;
      }

      // Paddle collisions
      const c = cfg();

      // Left (AI)
      if (ball.x - BALL_R <= ai.x + PADDLE_W &&
          ball.y >= ai.y &&
          ball.y <= ai.y + PADDLE_H &&
          ball.dx < 0) {
        ball.x = ai.x + PADDLE_W + BALL_R;
        const intersect = (ball.y - (ai.y + PADDLE_H / 2)) / (PADDLE_H / 2);
        // Add a touch of randomness so AI returns aren't perfect
        const noise = (Math.random() * 2 - 1) * 0.25;
        ball.dx = Math.abs(ball.dx) + 0.35; // small speed up
        ball.dy = clamp((ball.speed * (intersect + noise)), -ball.speed * 1.2, ball.speed * 1.2);

        // Normalize and cap
        const s = Math.hypot(ball.dx, ball.dy);
        const ns = Math.min(ball.speed + 0.35, BASE_SPEED * c.maxBallSpeedMul);
        ball.dx = (ball.dx / s) * ns;
        ball.dy = (ball.dy / s) * ns;
        if (ball.dx < 0) ball.dx *= -1; // ensure moving right
        ball.speed = Math.hypot(ball.dx, ball.dy);
      }

      // Right (Player)
      if (ball.x + BALL_R >= player.x &&
          ball.y >= player.y &&
          ball.y <= player.y + PADDLE_H &&
          ball.dx > 0) {
        ball.x = player.x - BALL_R;
        const intersect = (ball.y - (player.y + PADDLE_H / 2)) / (PADDLE_H / 2);
        ball.dx = -Math.abs(ball.dx) - 0.35; // reflect and small speed up
        ball.dy = clamp(ball.speed * intersect, -ball.speed * 1.2, ball.speed * 1.2);

        // Normalize and cap
        const s = Math.hypot(ball.dx, ball.dy);
        const ns = Math.min(ball.speed + 0.35, BASE_SPEED * c.maxBallSpeedMul);
        ball.dx = (ball.dx / s) * ns;
        ball.dy = (ball.dy / s) * ns;
        if (ball.dx > 0) ball.dx *= -1; // ensure moving left
        ball.speed = Math.hypot(ball.dx, ball.dy);
      }

      // Scoring
      if (ball.x < -BALL_R * 2) {
        resetAfterScore(true);  // Player scored
      } else if (ball.x > W + BALL_R * 2) {
        resetAfterScore(false); // AI scored
      }
    }

    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
  window.addEventListener('load', function () { setTimeout(init, 0); });
})();
