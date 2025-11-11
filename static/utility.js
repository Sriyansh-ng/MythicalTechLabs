// Utility Hub: QR Code Generator
(function () {
  const els = {
    data: document.getElementById('qrData'),
    size: document.getElementById('qrSize'),
    gen: document.getElementById('qrGenerateBtn'),
    dl: document.getElementById('qrDownloadBtn'),
    out: document.getElementById('qrOutput'),
    img: document.getElementById('qrImage')
  };

  function buildQrUrl(text, size) {
    const s = `${size}x${size}`;
    const encoded = encodeURIComponent(text);
    // Public QR generator image API
    return `https://api.qrserver.com/v1/create-qr-code/?size=${s}&data=${encoded}&margin=2`;
  }

  function generate() {
    const text = (els.data?.value || '').trim();
    const size = els.size?.value || '256';
    if (!text) {
      alert('Please enter text or a URL to generate a QR code.');
      return;
    }
    const url = buildQrUrl(text, size);
    if (els.img) {
      els.img.src = url;
      els.img.alt = `QR code for: ${text}`;
    }
    if (els.dl) {
      els.dl.href = url;
      els.dl.setAttribute('download', 'qr.png');
    }
    if (els.out) els.out.style.display = 'block';
  }

  if (els.gen) els.gen.addEventListener('click', generate);

  // Optional: regenerate on Enter key in input
  if (els.data) {
    els.data.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        generate();
      }
    });
  }
})();

// ===== Utility Hub: Pomodoro Timer + Study Music =====
(function () {
  function buildPomodoroUI(target) {
    var card = document.createElement('section');
    card.className = 'card';
    card.innerHTML = [
      '<h3>⏱️ Pomodoro Timer</h3>',
      '<div class="row" style="flex-wrap: wrap; gap: 12px;">',
      '  <label>Focus (min): <input type="number" id="pm-focus" min="1" max="180" value="25"></label>',
      '  <label>Short Break (min): <input type="number" id="pm-short" min="1" max="60" value="5"></label>',
      '  <label>Long Break (min): <input type="number" id="pm-long" min="1" max="90" value="15"></label>',
      '  <label>Intervals before long break: <input type="number" id="pm-intervals" min="1" max="12" value="4"></label>',
      '</div>',
      '<div class="row" style="align-items:center; gap: 12px; margin-top: 10px;">',
      '  <div><strong id="pm-phase">Focus</strong> — <span id="pm-time">25:00</span></div>',
      '  <button id="pm-start" class="button">Start</button>',
      '  <button id="pm-pause" class="button">Pause</button>',
      '  <button id="pm-reset" class="button">Reset</button>',
      '</div>',
      '<div class="muted" id="pm-status" style="margin-top:8px;"></div>'
    ].join('');
    target.appendChild(card);

    // State
    var focusInput = card.querySelector('#pm-focus');
    var shortInput = card.querySelector('#pm-short');
    var longInput = card.querySelector('#pm-long');
    var intervalsInput = card.querySelector('#pm-intervals');
    var phaseEl = card.querySelector('#pm-phase');
    var timeEl = card.querySelector('#pm-time');
    var statusEl = card.querySelector('#pm-status');

    var startBtn = card.querySelector('#pm-start');
    var pauseBtn = card.querySelector('#pm-pause');
    var resetBtn = card.querySelector('#pm-reset');

    var timer = null;
    var remaining = 0; // seconds
    var phase = 'focus'; // 'focus' | 'short' | 'long'
    var completedFocus = 0;

    function fmt(s) {
      var m = Math.floor(s / 60);
      var ss = String(s % 60).padStart(2, '0');
      return m + ':' + ss;
    }

    function updateDisplay() {
      var label = phase === 'focus' ? 'Focus' : (phase === 'short' ? 'Short Break' : 'Long Break');
      phaseEl.textContent = label;
      timeEl.textContent = fmt(Math.max(0, remaining));
      statusEl.textContent = 'Completed focus sessions: ' + completedFocus;
    }

    function beep() {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        o.start();
        setTimeout(function () {
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
          o.stop(ctx.currentTime + 0.21);
          ctx.close();
        }, 200);
      } catch (_) {}
    }

    function setPhase(nextPhase) {
      phase = nextPhase;
      var mins = phase === 'focus'
        ? parseInt(focusInput.value || '25', 10)
        : phase === 'short'
          ? parseInt(shortInput.value || '5', 10)
          : parseInt(longInput.value || '15', 10);
      remaining = Math.max(1, mins) * 60;
      updateDisplay();
    }

    function tick() {
      if (remaining > 0) {
        remaining -= 1;
        updateDisplay();
        return;
      }
      // Transition
      beep();
      if (phase === 'focus') {
        completedFocus += 1;
        var n = parseInt(intervalsInput.value || '4', 10);
        if (completedFocus % Math.max(1, n) === 0) {
          setPhase('long');
        } else {
          setPhase('short');
        }
      } else {
        setPhase('focus');
      }
    }

    function start() {
      if (timer) return;
      if (remaining <= 0) {
        // If first start or after reset, initialize current phase time
        setPhase(phase);
      }
      timer = setInterval(tick, 1000);
    }
    function pause() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function reset() {
      pause();
      completedFocus = 0;
      setPhase('focus');
    }

    startBtn.addEventListener('click', start);
    pauseBtn.addEventListener('click', pause);
    resetBtn.addEventListener('click', reset);

    // Initialize
    setPhase('focus');

    // Update remaining time preview when inputs change (if paused)
    [focusInput, shortInput, longInput].forEach(function (inp) {
      inp.addEventListener('change', function () {
        if (!timer) updateDisplay();
      });
    });
  }

  function buildMusicUI(target) {
    var card = document.createElement('section');
    card.className = 'card';
    card.innerHTML = [
      '<h3>🎵 Study Music</h3>',
      '<p class="muted">Preloaded with an Interstellar soundtrack embed. You can replace the link below with any YouTube embed URL you prefer.</p>',
      '<div style="max-width: 720px;">',
      '  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.2);">',
      '    <iframe id="study-yt" style="position:absolute;top:0;left:0;width:100%;height:100%;" ',
      '      src="https://www.youtube.com/embed/UDVtMYqUAyw?rel=0" title="Interstellar Soundtrack" frameborder="0" ',
      '      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
      '  </div>',
      '  <div class="row" style="margin-top: 8px; gap: 8px;">',
      '    <input id="yt-url" type="text" placeholder="Paste a YouTube embed URL (https://www.youtube.com/embed/VIDEOID)" style="flex:1;">',
      '    <button id="yt-apply" class="button">Load</button>',
      '  </div>',
      '</div>'
    ].join('');
    target.appendChild(card);

    var input = card.querySelector('#yt-url');
    var apply = card.querySelector('#yt-apply');
    var iframe = card.querySelector('#study-yt');

    apply.addEventListener('click', function () {
      var url = (input.value || '').trim();
      if (!url) return;
      // Basic safety: only allow embed URLs
      if (!/^https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]+/.test(url)) {
        alert('Please provide a valid YouTube embed URL (https://www.youtube.com/embed/VIDEOID)');
        return;
      }
      iframe.src = url + (url.indexOf('?') === -1 ? '?rel=0' : '');
    });
  }

  function ensureUtilities() {
    var hub = document.getElementById('utilityhub');
    if (!hub || hub.__pomodoro_music_initialized) return;

    // Ensure inner tabs exist for Utility Hub
    var tabs = hub.querySelector('.inner-tabs');
    if (!tabs) {
      tabs = document.createElement('nav');
      tabs.className = 'inner-tabs';
      hub.prepend(tabs);
    }

    // Add Pomodoro inner-tab button named exactly "Pomodoro" and place it next to Color Palette
    var btn = document.createElement('button');
    btn.className = 'tablink gold';
    btn.textContent = 'Pomodoro';
    btn.setAttribute('onclick', "openInnerTab('pomodoro-tab')");

    // Try to find the Color Palette tab button and insert right after it
    var inserted = false;
    try {
      var candidates = tabs.querySelectorAll('.tablink');
      var colorBtn = null;
      candidates.forEach(function (b) {
        var txt = (b.textContent || '').trim().toLowerCase();
        var onclick = (b.getAttribute('onclick') || '').toLowerCase();
        var target = (b.dataset && (b.dataset.target || '')).toLowerCase();

        if (
          txt === 'color palette' ||
          onclick.indexOf("openinnertab('color-palette')") !== -1 ||
          target === 'color-palette'
        ) {
          colorBtn = b;
        }
      });
      if (colorBtn && colorBtn.parentNode) {
        // Insert after Color Palette button
        if (colorBtn.nextSibling) {
          colorBtn.parentNode.insertBefore(btn, colorBtn.nextSibling);
        } else {
          colorBtn.parentNode.appendChild(btn);
        }
        inserted = true;
      }
    } catch (_) {}

    // Fallback: append at the end if we couldn't place it after Color Palette
    if (!inserted) {
      tabs.appendChild(btn);
    }

    // Create Pomodoro inner-tab content
    var panel = document.createElement('section');
    panel.className = 'inner-tabcontent';
    panel.id = 'pomodoro-tab';
    panel.style.display = 'none'; // hidden until clicked

    var container = document.createElement('div');
    container.className = 'row';
    container.style.gap = '16px';
    container.style.flexWrap = 'wrap';
    buildPomodoroUI(container);
    panel.appendChild(container);
    hub.appendChild(panel);

    // Keep Study Music available in Utility Hub (outside the Pomodoro tab)
    var musicWrap = document.createElement('div');
    musicWrap.className = 'row';
    musicWrap.style.gap = '16px';
    musicWrap.style.flexWrap = 'wrap';
    buildMusicUI(musicWrap);
    hub.appendChild(musicWrap);

    // ===== Add Random Number Generator as an inner sub-tab (same aesthetics) =====
    // Create RNG tab button and place it right after the Pomodoro button
    var rngBtn = document.createElement('button');
    rngBtn.className = 'tablink gold';
    rngBtn.textContent = '🎲 Random Number';
    rngBtn.setAttribute('onclick', "openInnerTab('random-tab')");
    try {
      // Insert after the just-created Pomodoro button, else append
      if (btn && btn.parentNode) {
        if (btn.nextSibling) btn.parentNode.insertBefore(rngBtn, btn.nextSibling);
        else btn.parentNode.appendChild(rngBtn);
      } else {
        tabs.appendChild(rngBtn);
      }
    } catch (_) {
      tabs.appendChild(rngBtn);
    }

    // RNG inner-tab content
    var rngPanel = document.createElement('section');
    rngPanel.className = 'inner-tabcontent';
    rngPanel.id = 'random-tab';
    rngPanel.style.display = 'none';

    var rngCard = document.createElement('section');
    rngCard.className = 'card';
    rngCard.innerHTML = [
      '<h3>🎲 Random Number Generator</h3>',
      '<div class="row" style="flex-wrap: wrap; gap: 12px;">',
      '  <label>Min: <input type="number" id="rng-min" value="1" step="1"></label>',
      '  <label>Max: <input type="number" id="rng-max" value="100" step="1"></label>',
      '  <label>Count: <input type="number" id="rng-count" value="1" min="1" max="10000" step="1"></label>',
      '  <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="rng-unique"> Unique</label>',
      '</div>',
      '<div class="row" style="align-items:center; gap: 12px; margin-top: 10px;">',
      '  <button id="rng-generate" class="button">Generate</button>',
      '  <button id="rng-copy" class="button">Copy Results</button>',
      '  <button id="rng-clear" class="button">Clear</button>',
      '</div>',
      '<div class="muted" id="rng-status" style="margin-top:8px;"></div>',
      '<textarea id="rng-output" rows="6" style="width:100%;margin-top:8px;" readonly placeholder="Results will appear here..."></textarea>'
    ].join('');
    rngPanel.appendChild(rngCard);
    hub.appendChild(rngPanel);

    // RNG logic
    (function wireRng() {
      var minEl = rngCard.querySelector('#rng-min');
      var maxEl = rngCard.querySelector('#rng-max');
      var countEl = rngCard.querySelector('#rng-count');
      var uniqueEl = rngCard.querySelector('#rng-unique');
      var genBtn = rngCard.querySelector('#rng-generate');
      var copyBtn = rngCard.querySelector('#rng-copy');
      var clearBtn = rngCard.querySelector('#rng-clear');
      var statusEl = rngCard.querySelector('#rng-status');
      var outEl = rngCard.querySelector('#rng-output');

      function beep() {
        try {
          var ctx = new (window.AudioContext || window.webkitAudioContext)();
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.value = 720;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
          o.start();
          setTimeout(function () {
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
            o.stop(ctx.currentTime + 0.16);
            ctx.close();
          }, 160);
        } catch (_) {}
      }

      function crand() {
        // cryptographically strong uniform [0, 1)
        if (window.crypto && window.crypto.getRandomValues) {
          var arr = new Uint32Array(1);
          window.crypto.getRandomValues(arr);
          return arr[0] / 0x100000000;
        }
        return Math.random();
      }

      function randintInclusive(min, max) {
        return Math.floor(crand() * (max - min + 1)) + min;
      }

      function generate() {
        var min = parseInt(minEl.value, 10);
        var max = parseInt(maxEl.value, 10);
        var count = parseInt(countEl.value, 10);
        var unique = !!uniqueEl.checked;

        if (isNaN(min) || isNaN(max)) {
          alert('Please enter valid numeric Min and Max.');
          return;
        }
        if (min > max) {
          var t = min; min = max; max = t;
          minEl.value = String(min);
          maxEl.value = String(max);
        }
        if (!count || count < 1) {
          alert('Count must be at least 1.');
          return;
        }
        var range = max - min + 1;
        if (unique && count > range) {
          alert('Count cannot exceed the size of the range when Unique is selected.');
          return;
        }

        statusEl.textContent = 'Generating...';
        var res = [];
        if (unique) {
          // Reservoir-like simple unique sampling for moderate sizes
          var used = new Set();
          while (res.length < count) {
            var n = randintInclusive(min, max);
            if (!used.has(n)) {
              used.add(n);
              res.push(n);
            }
          }
        } else {
          for (var i = 0; i < count; i++) {
            res.push(randintInclusive(min, max));
          }
        }

        // Present results
        outEl.value = res.join(', ');
        statusEl.textContent = 'Generated ' + res.length + ' number' + (res.length !== 1 ? 's' : '') +
          ' in range [' + min + ', ' + max + ']' + (unique ? ' (unique)' : '');
        beep();
      }

      function copyOut() {
        var text = outEl.value || '';
        if (!text) {
          statusEl.textContent = 'Nothing to copy.';
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            statusEl.textContent = 'Copied to clipboard.';
          }, function () {
            statusEl.textContent = 'Copy failed. You can copy manually.';
            outEl.select();
          });
        } else {
          // Fallback
          try {
            outEl.select();
            document.execCommand('copy');
            statusEl.textContent = 'Copied to clipboard.';
          } catch (_) {
            statusEl.textContent = 'Copy failed. You can copy manually.';
          }
        }
      }

      function clearOut() {
        outEl.value = '';
        statusEl.textContent = 'Cleared.';
      }

      genBtn.addEventListener('click', generate);
      copyBtn.addEventListener('click', copyOut);
      clearBtn.addEventListener('click', clearOut);
    })();

    hub.__pomodoro_music_initialized = true;
  }

  function maybeInit() {
    var hub = document.getElementById('utilityhub');
    if (!hub) return;
    ensureUtilities();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeInit);
  } else {
    setTimeout(maybeInit, 0);
  }
  window.addEventListener('load', function () { setTimeout(maybeInit, 0); });
})();

// ===== News Hub: History Today (Wikipedia On This Day feed) =====
(function () {
  function ensureHistoryTodayUI() {
    var hub = document.getElementById('newshub');
    if (!hub || hub.__history_today_initialized) return;

    // Create inner tabs container if missing
    var tabs = hub.querySelector('.inner-tabs');
    if (!tabs) {
      tabs = document.createElement('nav');
      tabs.className = 'inner-tabs';
      hub.prepend(tabs);
    }

    // History Today tab button
    var btn = document.createElement('button');
    btn.className = 'tablink gold';
    btn.textContent = '📜 History Today';
    btn.setAttribute('onclick', "openInnerTab('history-today')");

    // Try to position alongside known News sub-tabs (Sports, Politics, Finance)
    (function placeButton() {
      try {
        var candidates = Array.from(tabs.querySelectorAll('.tablink'));
        // Prefer placing after Politics, else Finance, else Sports, else append
        var priority = [
          { id: 'politics', text: 'politics' },
          { id: 'finance', text: 'finance' },
          { id: 'sports', text: 'sports' }
        ];
        var anchor = null;
        candidates.forEach(function (b) {
          var txt = (b.textContent || '').trim().toLowerCase();
          var onclick = ((b.getAttribute && b.getAttribute('onclick')) || '').toLowerCase();
          var dataTarget = (b.dataset && (b.dataset.target || '').toLowerCase()) || '';
          priority.forEach(function (p) {
            if (anchor) return;
            var hit =
              txt.indexOf(p.text) !== -1 ||
              onclick.indexOf("openinnertab('" + p.id + "')") !== -1 ||
              dataTarget === p.id;
            if (hit) anchor = b;
          });
        });
        if (anchor && anchor.parentNode) {
          if (anchor.nextSibling) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
          else anchor.parentNode.appendChild(btn);
        } else {
          tabs.appendChild(btn);
        }
      } catch (_) {
        tabs.appendChild(btn);
      }
    })();

    // History Today content panel
    var panel = document.createElement('section');
    panel.className = 'inner-tabcontent';
    panel.id = 'history-today';
    panel.style.display = 'none'; // hidden until the sub-tab is clicked

    panel.innerHTML = [
      '<div class="card">',
      '  <div class="row" style="gap: 12px; align-items: center;">',
      '    <label for="ht-date"><strong>Select date:</strong></label>',
      '    <input type="date" id="ht-date" />',
      '    <button id="ht-refresh" class="button">Refresh</button>',
      '  </div>',
      '  <div id="ht-status" class="muted" style="margin-top: 8px;">Loading...</div>',
      '  <ul id="ht-list" class="list" style="margin-top: 8px;"></ul>',
      '</div>'
    ].join('');

    hub.appendChild(panel);

    // Default date = today
    var dateInput = panel.querySelector('#ht-date');
    var statusEl = panel.querySelector('#ht-status');
    var listEl = panel.querySelector('#ht-list');
    var refreshBtn = panel.querySelector('#ht-refresh');

    function toInputDate(d) {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + dd;
    }
    dateInput.value = toInputDate(new Date());

    function fetchOnThisDay(dateStr) {
      // Wikipedia REST On This Day: /events/{mm}/{dd}
      try {
        var parts = dateStr.split('-'); // yyyy-mm-dd
        var mm = String(parseInt(parts[1], 10));
        var dd = String(parseInt(parts[2], 10));
        var url = 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/' + mm + '/' + dd;

        statusEl.textContent = 'Loading events...';
        listEl.innerHTML = '';

        fetch(url, { headers: { 'Accept': 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (data) {
            var events = (data && Array.isArray(data.events)) ? data.events : [];
            if (!events.length) {
              statusEl.textContent = 'No events found for this date.';
              return;
            }
            statusEl.textContent = 'Found ' + events.length + ' events';
            var frag = document.createDocumentFragment();
            events.forEach(function (ev) {
              var li = document.createElement('li');
              var year = ev.year != null ? ev.year : '';
              var text = (ev.text || '').replace(/\s+/g, ' ').trim();
              var link = (ev.pages && ev.pages[0] && ev.pages[0].content_urls && ev.pages[0].content_urls.desktop && ev.pages[0].content_urls.desktop.page) ? ev.pages[0].content_urls.desktop.page : null;

              li.innerHTML = '<strong>' + year + '</strong> — ' + text +
                (link ? ' <a href="' + link + '" target="_blank" rel="noopener">Read more</a>' : '');
              frag.appendChild(li);
            });
            listEl.appendChild(frag);
          })
          .catch(function () {
            statusEl.textContent = 'Failed to load events. Please try again.';
          });
      } catch (e) {
        statusEl.textContent = 'Invalid date.';
      }
    }

    // Lazy load: fetch only when the sub-tab is opened or user requests
    var loadedOnce = false;
    function ensureLoaded() {
      if (loadedOnce) return;
      loadedOnce = true;
      fetchOnThisDay(dateInput.value);
    }

    // Clicking the History Today button should load data if not loaded yet
    try {
      btn.addEventListener('click', ensureLoaded);
    } catch (_) {}

    // Manual refresh or date change
    refreshBtn.addEventListener('click', function () {
      ensureLoaded();
      fetchOnThisDay(dateInput.value);
    });
    dateInput.addEventListener('change', function () {
      ensureLoaded();
      fetchOnThisDay(dateInput.value);
    });

    // Do not auto-open; keep it consistent with other sub-tabs
    hub.__history_today_initialized = true;
  }

  // Initialize when the news hub becomes visible or on load
  function maybeInit() {
    var hub = document.getElementById('newshub');
    if (!hub) return;
    ensureHistoryTodayUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeInit);
  } else {
    setTimeout(maybeInit, 0);
  }
  window.addEventListener('load', function () { setTimeout(maybeInit, 0); });
})();
