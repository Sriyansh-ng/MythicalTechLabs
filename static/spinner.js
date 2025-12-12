// Wheel Spinner: up to 15 items, animated spin, list editing + in‑wheel editing
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else setTimeout(fn, 0);
  }

  function init() {
    const canvas = document.getElementById('spinnerCanvas');
    const spinBtn = document.getElementById('spinnerSpin');
    const shuffleBtn = document.getElementById('spinnerShuffle');
    const clearBtn = document.getElementById('spinnerClear');
    const addBtn = document.getElementById('spinnerAdd');
    const listEl = document.getElementById('spList');
    const resultEl = document.getElementById('spinnerResult');
    if (!canvas || !spinBtn || !listEl) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const R = Math.min(W, H) * 0.48;
    const center = { x: W / 2, y: H / 2 };

    let items = ['Item 1','Item 2','Item 3','Item 4','Item 5','Item 6'];
    const MAX = 15;

    // Spin state
    let rotation = -Math.PI / 2; // 12 o'clock
    let animId = null;
    let spinning = false;

    function colorAt(i, n) {
      // pleasant loop across hue
      const h = (i * (360 / Math.max(1, n))) % 360;
      return `hsl(${h}, 72%, 52%)`;
    }

    function drawPointer() {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(0);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -R - 2);
      ctx.lineTo(12, -R - 24);
      ctx.lineTo(-12, -R - 24);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawWheel() {
      ctx.clearRect(0, 0, W, H);

      const n = Math.max(2, items.filter(s => (s || '').trim().length > 0).length);
      const labels = items.slice(0, n);
      const aStep = (Math.PI * 2) / n;

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(rotation);

      for (let i = 0; i < n; i++) {
        const a0 = i * aStep;
        const a1 = a0 + aStep;

        // slice
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, a0, a1);
        ctx.closePath();
        ctx.fillStyle = colorAt(i, n);
        ctx.fill();

        // label
        const mid = (a0 + a1) / 2;
        ctx.save();
        ctx.rotate(mid);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#111';
        // rounded pill background for readability
        const text = (labels[i] || '').trim() || `Item ${i + 1}`;
        ctx.font = 'bold 16px Poppins, Segoe UI, sans-serif';
        // draw text slightly inside rim
        const rText = R * 0.65;
        // wrap simple: clip to max width
        const maxW = R * 0.9;
        let t = text;
        if (ctx.measureText(t).width > maxW) {
          while (t.length > 3 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
          t += '…';
        }
        ctx.fillText(t, rText, 0);
        ctx.restore();

        // border line
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a1) * R, Math.sin(a1) * R);
        ctx.stroke();
      }

      ctx.restore();
      drawPointer();
    }

    function renderList() {
      listEl.innerHTML = '';
      for (let i = 0; i < items.length; i++) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = items[i];
        inp.maxLength = 40;
        inp.placeholder = `Item ${i + 1}`;
        inp.addEventListener('input', function () {
          items[i] = inp.value;
          drawWheel();
        });
        listEl.appendChild(inp);
      }
    }

    function clampItems() {
      if (items.length > MAX) items = items.slice(0, MAX);
    }

    function spin() {
      if (spinning) return;
      const n = Math.max(2, items.filter(s => (s || '').trim().length > 0).length);
      const aStep = (Math.PI * 2) / n;

      // Random target segment
      const targetIndex = Math.floor(Math.random() * n);
      // Aim so that target's middle lands at pointer (12 o'clock)
      const targetAngle = -Math.PI / 2 - (targetIndex + 0.5) * aStep;

      // Add spins and slight random offset
      const spins = 4 + Math.floor(Math.random() * 3); // 4..6 spins
      const final = targetAngle + spins * Math.PI * 2;

      const start = rotation;
      const delta = ((final - start) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2) + Math.PI * 2; // ensure positive path
      const dur = 2600 + Math.random() * 900;
      const t0 = performance.now();

      spinning = true;
      cancelAnimationFrame(animId);
      function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
      function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        rotation = start + delta * easeOutCubic(p);
        drawWheel();
        if (p < 1) animId = requestAnimationFrame(step);
        else {
          spinning = false;
          // compute selected
          const rotNorm = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const idx = Math.floor((((-Math.PI / 2) - rotNorm + Math.PI * 2) % (Math.PI * 2)) / aStep);
          const labels = items.slice(0, n);
          const chosen = (labels[idx] || '').trim() || `Item ${idx + 1}`;
          if (resultEl) {
            resultEl.textContent = `Result: ${chosen}`;
          }
        }
      }
      animId = requestAnimationFrame(step);
    }

    function shuffle() {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      renderList();
      drawWheel();
    }

    function clearAll() {
      items = [];
      renderList();
      drawWheel();
      if (resultEl) resultEl.textContent = '';
    }

    function addItem() {
      if (items.length >= MAX) {
        alert('Maximum of 15 items reached.');
        return;
      }
      items.push(`Item ${items.length + 1}`);
      renderList();
      drawWheel();
    }

    // In‑wheel editing: double‑click to edit a segment where you click
    function editAt(x, y) {
      const n = Math.max(2, items.filter(s => (s || '').trim().length > 0).length);
      const aStep = (Math.PI * 2) / n;

      // coords relative to center
      const rx = x - canvas.getBoundingClientRect().left;
      const ry = y - canvas.getBoundingClientRect().top;
      const cx = rx - center.x;
      const cy = ry - center.y;
      const r = Math.hypot(cx, cy);
      if (r > R) return; // outside wheel

      // angle of click in world coords
      let angle = Math.atan2(cy, cx) - rotation;
      angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const idx = Math.floor(angle / aStep);

      // overlay input at click
      const input = document.createElement('input');
      input.type = 'text';
      input.value = items[idx] || `Item ${idx + 1}`;
      input.maxLength = 40;
      input.style.position = 'fixed';
      input.style.left = `${x - input.value.length * 3 - 20}px`;
      input.style.top = `${y - 14}px`;
      input.style.zIndex = 9999;
      input.style.padding = '6px 8px';
      input.style.borderRadius = '8px';
      input.style.border = '1px solid rgba(255,255,255,0.3)';
      input.style.background = 'rgba(0,0,0,0.8)';
      input.style.color = '#fff';
      document.body.appendChild(input);
      input.focus();
      input.select();

      function commit() {
        const v = (input.value || '').trim();
        if (v) items[idx] = v;
        document.body.removeChild(input);
        renderList();
        drawWheel();
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { document.body.removeChild(input); }
      });
    }

    // Wire up controls
    spinBtn.addEventListener('click', function (e) { e.preventDefault(); spin(); });
    shuffleBtn?.addEventListener('click', function (e) { e.preventDefault(); shuffle(); });
    clearBtn?.addEventListener('click', function (e) { e.preventDefault(); clearAll(); });
    addBtn?.addEventListener('click', function (e) { e.preventDefault(); addItem(); });

    canvas.addEventListener('dblclick', function (e) { editAt(e.clientX, e.clientY); });

    // Initial render
    renderList();
    drawWheel();
  }

  ready(init);
})();
