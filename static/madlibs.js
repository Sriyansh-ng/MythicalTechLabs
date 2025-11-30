// Mad Libs: require full words in each category (no single-letter shortcuts)
(function () {
  function init() {
    const fields = {
      adj: document.getElementById('mlAdj'),
      noun: document.getElementById('mlNoun'),
      verbPast: document.getElementById('mlVerbPast'),
      adverb: document.getElementById('mlAdverb'),
      plural: document.getElementById('mlPlural'),
      exclaim: document.getElementById('mlExclaim'),
      body: document.getElementById('mlBody'),
      place: document.getElementById('mlPlace'),
      number: document.getElementById('mlNumber')
    };

    // If the panel isn't present yet, do nothing
    if (!fields.adj || !fields.noun) return;

    const btnGen = document.getElementById('madlibsGenerate');
    const btnClear = document.getElementById('madlibsClear');
    const errorEl = document.getElementById('madlibsError');
    const resultWrap = document.getElementById('madlibsResult');
    const storyEl = document.getElementById('madlibsStory');

    // Ensure the Mad Libs panel is fully interactive (no accidental overlays/disabled states)
    (function ensureInteractable() {
      try {
        // Inject a scoped CSS fix once
        if (!document.getElementById('madlibsFixStyles')) {
          const st = document.createElement('style');
          st.id = 'madlibsFixStyles';
          st.type = 'text/css';
          st.appendChild(document.createTextNode(`
            #madlibs, #madlibs * { pointer-events: auto !important; }
            #madlibs input.qr-input, #madlibs button { z-index: 1; position: relative; }
          `));
          document.head.appendChild(st);
        }
        const panel = document.getElementById('madlibs');
        if (panel) {
          panel.style.pointerEvents = 'auto';
          panel.style.position = panel.style.position || 'relative';
          // Make sure all controls are enabled
          panel.querySelectorAll('input, button, select, textarea').forEach(function (el) {
            el.disabled = false;
            el.readOnly = false;
            if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
            el.style.pointerEvents = 'auto';
          });
        }
        // Focus the first field when visible
        setTimeout(function () {
          try { fields.adj && fields.adj.focus(); } catch (_) {}
        }, 0);
      } catch (_) {}
    })();

    // Stop global game key handlers from eating typing inside Mad Libs inputs
    (function guardTyping() {
      function isInMadLibsInput(target) {
        if (!target) return false;
        const tag = (target.tagName || '').toLowerCase();
        const editable = target.isContentEditable;
        if (!(tag === 'input' || tag === 'textarea' || editable)) return false;
        const panel = document.getElementById('madlibs');
        return !!(panel && panel.contains(target));
      }
      function shouldBlockKey(k) {
        return k === 'a' || k === 'A' ||
               k === 'd' || k === 'D' ||
               k === 's' || k === 'S' ||
               k === 'w' || k === 'W' ||
               k === 'ArrowUp' || k === 'ArrowDown' ||
               k === 'ArrowLeft' || k === 'ArrowRight' ||
               k === ' ' || k === 'Spacebar' ||
               k === 'Backspace' || k === 'Delete';
      }
      function insertChar(el, ch) {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? start;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        el.value = before + ch + after;
        const pos = start + ch.length;
        try { el.setSelectionRange(pos, pos); } catch (_) {}
        // Fire input event for any listeners
        try {
          el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
        } catch (_) {
          const evt = document.createEvent('Event'); evt.initEvent('input', true, true); el.dispatchEvent(evt);
        }
      }
      function deleteOne(el, forward) {
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? start;
        if (start !== end) {
          // Delete selection
          const before = el.value.slice(0, start);
          const after = el.value.slice(end);
          el.value = before + after;
          try { el.setSelectionRange(start, start); } catch (_) {}
        } else {
          if (forward) {
            if (start >= el.value.length) return;
            const before = el.value.slice(0, start);
            const after = el.value.slice(start + 1);
            el.value = before + after;
            try { el.setSelectionRange(start, start); } catch (_) {}
          } else {
            if (start <= 0) return;
            const before = el.value.slice(0, start - 1);
            const after = el.value.slice(start);
            el.value = before + after;
            try { el.setSelectionRange(start - 1, start - 1); } catch (_) {}
          }
        }
        try {
          el.dispatchEvent(new InputEvent('input', { bubbles: true, data: null, inputType: 'deleteContentBackward' }));
        } catch (_) {
          const evt = document.createEvent('Event'); evt.initEvent('input', true, true); el.dispatchEvent(evt);
        }
      }
      function moveCaret(el, dir) {
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? start;
        let pos = dir < 0 ? Math.max(0, Math.min(start, end) - 1) : Math.min(el.value.length, Math.max(start, end) + 1);
        try { el.setSelectionRange(pos, pos); } catch (_) {}
      }
      function onInputKey(e) {
        const el = e.currentTarget;
        if (!isInMadLibsInput(el)) return;
        const k = e.key;
        const printable = k && k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        const blocked = shouldBlockKey(k) || e.defaultPrevented;

        // If this is a printable char that gets blocked, insert it manually
        if (printable && blocked) {
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); else e.stopPropagation();
          e.preventDefault();
          insertChar(el, k);
          return;
        }

        // Handle backspace/delete when blocked
        if ((k === 'Backspace' || k === 'Delete') && blocked) {
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); else e.stopPropagation();
          e.preventDefault();
          deleteOne(el, k === 'Delete');
          return;
        }

        // Allow caret movement but stop propagation to games; if already prevented, move ourselves
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
          e.stopPropagation();
          if (e.defaultPrevented) {
            e.preventDefault();
            moveCaret(el, k === 'ArrowLeft' ? -1 : 1);
          }
          return;
        }
        if (k === 'ArrowUp' || k === 'ArrowDown') {
          e.stopPropagation(); // Let default handle (or do nothing)
          return;
        }

        // Space key: if blocked, insert space
        if ((k === ' ' || k === 'Spacebar') && blocked) {
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); else e.stopPropagation();
          e.preventDefault();
          insertChar(el, ' ');
          return;
        }
      }

      // Capture phase on window and document to beat bubble-phase game listeners
      function intercept(e) {
        const active = document.activeElement || e.target;
        if (!isInMadLibsInput(active)) return;
        if (shouldBlockKey(e.key)) {
          e.cancelBubble = true;
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          else e.stopPropagation();
          // Do not preventDefault here; let target-level handler decide insertion/caret
        }
      }
      window.addEventListener('keydown', intercept, true);
      window.addEventListener('keypress', intercept, true);
      window.addEventListener('keyup', intercept, true);
      document.addEventListener('keydown', intercept, true);
      document.addEventListener('keypress', intercept, true);
      document.addEventListener('keyup', intercept, true);

      // Bind robust handlers on each input (capture + bubble) to force typing
      const panel = document.getElementById('madlibs');
      if (panel) {
        panel.querySelectorAll('input,textarea,[contenteditable="true"]').forEach(function (el) {
          el.addEventListener('keydown', onInputKey, true);
          el.addEventListener('keydown', onInputKey, false);
        });
      }
    })();

    // Stop global click handlers from swallowing clicks inside Mad Libs and ensure buttons work
    (function guardClicksAndDelegate() {
      const panel = document.getElementById('madlibs');

      function stopIfInside(e) {
        if (panel && panel.contains(e.target)) {
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          else e.stopPropagation();
        }
      }

      // Capture-phase guards
      window.addEventListener('pointerdown', stopIfInside, true);
      window.addEventListener('click', stopIfInside, true);
      document.addEventListener('pointerdown', stopIfInside, true);
      document.addEventListener('click', stopIfInside, true);

      // Direct, robust handlers on the buttons (capture + bubble)
      if (panel) {
        const gen = document.getElementById('madlibsGenerate');
        const clr = document.getElementById('madlibsClear');
        const callGen = function (e) { try { generate(); } catch (_) {} };
        const callClr = function (e) { try { clearAll(); } catch (_) {} };

        if (gen) {
          ['pointerdown','pointerup','mousedown','mouseup','click'].forEach(function (ev) {
            gen.addEventListener(ev, function (e) {
              // Keep the event local and ensure action fires
              if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); else e.stopPropagation();
              // Don't block default focus, but always run our action on 'click' and 'pointerup'
              if (ev === 'click' || ev === 'pointerup' || ev === 'mouseup') callGen(e);
            }, true);
            gen.addEventListener(ev, function (e) {
              if (ev === 'click') callGen(e);
            }, false);
          });
        }
        if (clr) {
          ['pointerdown','pointerup','mousedown','mouseup','click'].forEach(function (ev) {
            clr.addEventListener(ev, function (e) {
              if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); else e.stopPropagation();
              if (ev === 'click' || ev === 'pointerup' || ev === 'mouseup') callClr(e);
            }, true);
            clr.addEventListener(ev, function (e) {
              if (ev === 'click') callClr(e);
            }, false);
          });
        }
      }

      // Delegated backup in capture (in case buttons are re-rendered)
      function delegate(e) {
        if (!panel || !panel.contains(e.target)) return;
        const t = e.target;
        const isGen = t.id === 'madlibsGenerate' || (t.closest && t.closest('#madlibsGenerate'));
        const isClear = t.id === 'madlibsClear' || (t.closest && t.closest('#madlibsClear'));
        if (isGen) {
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); else e.stopPropagation();
          try { generate(); } catch (_) {}
        } else if (isClear) {
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); else e.stopPropagation();
          try { clearAll(); } catch (_) {}
        }
      }
      document.addEventListener('click', delegate, true);
    })();

    function setError(msg) {
      if (errorEl) errorEl.textContent = msg || '';
    }
