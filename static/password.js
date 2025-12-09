// Utility Hub: Password Generator
(function () {
  const els = {
    out: document.getElementById('pwOutput'),
    copy: document.getElementById('pwCopyBtn'),
    gen: document.getElementById('pwGenerateBtn'),
    len: document.getElementById('pwLength'),
    lower: document.getElementById('pwLower'),
    upper: document.getElementById('pwUpper'),
    nums: document.getElementById('pwNumbers'),
    syms: document.getElementById('pwSymbols'),
    strength: document.getElementById('pwStrength'),
  };

  // If the section isn't rendered on this page, bail silently.
  if (!els.gen || !els.out) return;

  const SETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    nums: '0123456789',
    syms: '!@#$%^&*()-_=+[]{};:,.<>?/~`|\\',
  };

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function pick(s) {
    return s[randInt(s.length)];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function computeStrength(pw, setsUsed) {
    const len = pw.length;
    const diversity = setsUsed;
    // Very simple heuristic
    if (len >= 16 && diversity >= 3) return 'Strong';
    if (len >= 12 && diversity >= 2) return 'Good';
    if (len >= 8 && diversity >= 2) return 'Fair';
    return 'Weak';
  }

  function buildPassword() {
    let length = parseInt(els.len?.value || '16', 10);
    length = isNaN(length) ? 16 : Math.max(4, Math.min(64, length));

    const selected = [];
    if (els.lower?.checked) selected.push('lower');
    if (els.upper?.checked) selected.push('upper');
    if (els.nums?.checked) selected.push('nums');
    if (els.syms?.checked) selected.push('syms');

    if (selected.length === 0) {
      alert('Select at least one character set.');
      return '';
    }

    // Ensure we can place at least one from each selected set
    if (length < selected.length) {
      length = selected.length;
      if (els.len) els.len.value = String(length);
    }

    // Build combined set (no ambiguous filtering; full sets only)
    const pools = selected.map(key => SETS[key]);
    const all = pools.join('');

    // Ensure at least one from each selected pool
    const result = [];
    for (const pool of pools) {
      if (!pool.length) continue;
      result.push(pick(pool));
    }
    // Fill the rest
    while (result.length < length) {
      result.push(pick(all));
    }
    shuffle(result);
    const pw = result.join('');

    // Strength text
    if (els.strength) {
      const strength = computeStrength(pw, selected.length);
      els.strength.textContent = `Strength: ${strength}`;
    }

    return pw;
  }

  function generate() {
    const pw = buildPassword();
    if (!pw) return;
    if (els.out) {
      els.out.value = pw;
      els.out.setAttribute('aria-label', 'Generated password');
    }
  }

  async function copy() {
    const text = els.out?.value || '';
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback
        els.out.select();
        document.execCommand('copy');
        els.out.blur();
      }
      const original = els.copy.textContent;
      els.copy.textContent = 'Copied!';
      setTimeout(() => (els.copy.textContent = original), 1000);
    } catch (e) {
      alert('Unable to copy. Please copy manually.');
    }
  }

  els.gen.addEventListener('click', generate);
  els.copy.addEventListener('click', copy);

  // Generate a default password on load for convenience
  generate();
})();
