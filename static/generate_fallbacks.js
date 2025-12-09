// Fallbacks to ensure all "Generate" buttons work even if other listeners break.
// Runs late (defer) and binds onclick directly on the buttons.
(function () {
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      setTimeout(fn, 0);
    }
  }

  function bind(el, handler) {
    if (!el) return false;
    try {
      el.disabled = false;
      el.style.pointerEvents = 'auto';
      el.onclick = function (e) {
        try { if (e) e.preventDefault(); handler(); } catch (_) {}
        return false;
      };
      return true;
    } catch (_) { return false; }
  }

  // ===== QR Code Generator =====
  function attachQr() {
    var gen = document.getElementById('qrGenerateBtn');
    bind(gen, function () {
      var data = (document.getElementById('qrData')?.value || '').trim();
      var size = document.getElementById('qrSize')?.value || '256';
      if (!data) { alert('Please enter text or a URL to generate a QR code.'); return; }
      var url = 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(data) + '&margin=2';
      var img = document.getElementById('qrImage');
      if (img) { img.src = url; img.alt = 'QR code for: ' + data; }
      var dl = document.getElementById('qrDownloadBtn');
      if (dl) { dl.href = url; dl.setAttribute('download', 'qr.png'); }
      var out = document.getElementById('qrOutput');
      if (out) out.style.display = 'block';
    });
  }

  // ===== Password Generator =====
  function attachPassword() {
    var gen = document.getElementById('pwGenerateBtn');
    bind(gen, function () {
      var lenEl = document.getElementById('pwLength');
      var lowerEl = document.getElementById('pwLower');
      var upperEl = document.getElementById('pwUpper');
      var numsEl = document.getElementById('pwNumbers');
      var symsEl = document.getElementById('pwSymbols');

      var length = parseInt(lenEl?.value || '16', 10);
      length = isNaN(length) ? 16 : Math.max(4, Math.min(64, length));

      var sets = [];
      if (lowerEl?.checked) sets.push('abcdefghijklmnopqrstuvwxyz');
      if (upperEl?.checked) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      if (numsEl?.checked) sets.push('0123456789');
      if (symsEl?.checked) sets.push('!@#$%^&*()-_=+[]{};:,.<>?/~`|\\');

      if (sets.length === 0) { alert('Select at least one character set.'); return; }

      if (length < sets.length) { length = sets.length; if (lenEl) lenEl.value = String(length); }

      function pick(s) { return s[Math.floor(Math.random() * s.length)]; }
      function shuffle(a) { for (var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; }

      var result = [];
      for (var i = 0; i < sets.length; i++) result.push(pick(sets[i]));
      var all = sets.join('');
      while (result.length < length) result.push(pick(all));
      shuffle(result);
      var pw = result.join('');

      var out = document.getElementById('pwOutput');
      if (out) { out.value = pw; out.setAttribute('aria-label', 'Generated password'); }

      var strengthEl = document.getElementById('pwStrength');
      if (strengthEl) {
        var diversity = sets.length, L = pw.length, s = 'Weak';
        if (L >= 16 && diversity >= 3) s = 'Strong';
        else if (L >= 12 && diversity >= 2) s = 'Good';
        else if (L >= 8 && diversity >= 2) s = 'Fair';
        strengthEl.textContent = 'Strength: ' + s;
      }
    });
  }

  // ===== Color Palette Generator =====
  function attachPalette() {
    var gen = document.getElementById('cpGenerate');
    bind(gen, function () {
      var base = (document.getElementById('cpBase')?.value || '#ffeb3b').trim();
      var count = parseInt(document.getElementById('cpCount')?.value || '5', 10);
      var scheme = (document.getElementById('cpScheme')?.value || 'complementary').toLowerCase();
      count = Math.max(3, Math.min(10, isNaN(count) ? 5 : count));

      function hexToHsl(hex) {
        hex = hex.replace('#','');
        var r = parseInt(hex.substring(0,2),16)/255;
        var g = parseInt(hex.substring(2,4),16)/255;
        var b = parseInt(hex.substring(4,6),16)/255;
        var max=Math.max(r,g,b),min=Math.min(r,g,b),h,s,l=(max+min)/2;
        if(max===min){h=s=0;} else {
          var d=max-min;
          s=l>0.5?d/(2-max-min):d/(max+min);
          switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;}
          h/=6;
        }
        return {h:h*360,s:s*100,l:l*100};
      }
      function hslToHex(h,s,l){
        h/=360; s/=100; l/=100;
        function hue2rgb(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
        var q=l<0.5?l*(1+s):l+s-l*s; var p=2*l-q;
        var r=hue2rgb(p,q,h+1/3), g=hue2rgb(p,q,h), b=hue2rgb(p,q,h-1/3);
        var toHex = function(x){ var v=Math.round(x*255).toString(16).padStart(2,'0'); return v; };
        return '#'+toHex(r)+toHex(g)+toHex(b);
      }

      var hsl = hexToHsl(base);
      var hues = [];
      if (scheme === 'analogous') {
        var step = 360 / count; for (var i=0;i<count;i++) hues.push((hsl.h + i*step) % 360);
      } else if (scheme === 'triadic') {
        hues = [hsl.h, (hsl.h+120)%360, (hsl.h+240)%360];
        while (hues.length < count) hues.push((hsl.h + (hues.length*30))%360);
      } else if (scheme === 'split') {
        hues = [hsl.h, (hsl.h+150)%360, (hsl.h+210)%360];
        while (hues.length < count) hues.push((hsl.h + (hues.length*20))%360);
      } else if (scheme === 'tetradic') {
        hues = [hsl.h, (hsl.h+90)%360, (hsl.h+180)%360, (hsl.h+270)%360];
        while (hues.length < count) hues.push((hsl.h + (hues.length*15))%360);
      } else { // complementary
        hues = [hsl.h, (hsl.h+180)%360];
        while (hues.length < count) hues.push((hsl.h + (hues.length*20))%360);
      }

      var out = document.getElementById('cpOutput');
      if (out) {
        out.innerHTML = '';
        var s = Math.max(35, Math.min(180, Math.floor(600 / Math.max(3, count))));
        for (var i = 0; i < count; i++) {
          var col = hslToHex(hues[i%hues.length], Math.min(100, hsl.s), Math.min(70, Math.max(30, hsl.l)));
          var div = document.createElement('div');
          div.style.height = '96px';
          div.style.borderRadius = '10px';
          div.style.background = col;
          div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
          div.title = col;
          div.textContent = col;
          div.style.display = 'grid';
          div.style.placeItems = 'center';
          div.style.fontWeight = '700';
          out.appendChild(div);
        }
      }
    });
  }

  // ===== Mad Libs Generate =====
  function attachMadLibs() {
    var gen = document.getElementById('madlibsGenerate');
    bind(gen, function () {
      function val(id){ return (document.getElementById(id)?.value || '').trim(); }
      var adj = val('mlAdj'), noun = val('mlNoun'), vp = val('mlVerbPast'), adv = val('mlAdverb'),
          plural = val('mlPlural'), exclaim = val('mlExclaim'), body = val('mlBody'), place = val('mlPlace'),
          numStr = val('mlNumber');
      var error = document.getElementById('madlibsError');
      var storyEl = document.getElementById('madlibsStory');
      var wrap = document.getElementById('madlibsResult');

      function isWord(s){ return /^[A-Za-z][A-Za-z '\-]*$/.test(s); }
      if (![adj,noun,vp,adv,plural,exclaim,body,place,numStr].every(Boolean) || !/^\d+$/.test(numStr) ||
          ![adj,noun,vp,adv,plural,exclaim,body,place].every(isWord)) {
        if (error) error.textContent = 'Please enter full words for all fields and a number.';
        if (wrap) wrap.style.display = 'none';
        if (storyEl) storyEl.textContent = '';
        return;
      }
      var num = parseInt(numStr, 10);
      function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

      var ctx = { adj, noun, vp, adv, plural, exclaim, body, place, num, cap };
      var templates = [
        (c) => `${c.cap(c.exclaim)}! I couldn’t believe my ${c.adj} ${c.noun} ${c.vp} so ${c.adv} at the ${c.place}. Everyone stared at the ${c.plural}, and even my ${c.body} started to tingle. After ${c.num} ${c.num===1?'minute':'minutes'}, we did it again!`,
        (c) => `Yesterday at the ${c.place}, a ${c.adj} ${c.noun} ${c.vp} past me ${c.adv}. "${c.cap(c.exclaim)}!" I shouted as ${c.plural} cheered. We waited ${c.num} ${c.num===1?'minute':'minutes'} to calm down.`,
        (c) => `During lunch, my ${c.adj} ${c.noun} ${c.vp} ${c.adv}. ${c.cap(c.exclaim)}! The ${c.plural} on my ${c.body} almost fell off. Later, we walked to the ${c.place}.`,
        (c) => `At the ${c.place}, ${c.plural} were everywhere. My ${c.adj} ${c.noun} ${c.vp} ${c.adv} until ${c.num} ${c.num===1?'minute':'minutes'} passed. "${c.cap(c.exclaim)}!" we cried in unison.`,
        (c) => `I polished my ${c.adj} ${c.noun} before going to the ${c.place}. ${c.cap(c.exclaim)}! It ${c.vp} so ${c.adv} that my ${c.body} tingled for ${c.num} ${c.num===1?'minute':'minutes'}.`,
        (c) => `We packed ${c.num} snacks and headed to the ${c.place}. A ${c.adj} ${c.noun} ${c.vp} ${c.adv}, startling the ${c.plural}. "${c.cap(c.exclaim)}!" I laughed, holding my ${c.body}.`,
        (c) => `My ${c.body} kept twitching as the ${c.adj} ${c.noun} ${c.vp} ${c.adv}. The ${c.plural} formed a circle at the ${c.place}. "${c.cap(c.exclaim)}!" echoed for ${c.num} ${c.num===1?'minute':'minutes'}.`,
        (c) => `First, the ${c.plural} gathered. Then my ${c.adj} ${c.noun} ${c.vp} ${c.adv} at the ${c.place}. "${c.cap(c.exclaim)}!" we said, waiting ${c.num} ${c.num===1?'minute':'minutes'} for the show to end.`,
        (c) => `On our way to the ${c.place}, a ${c.adj} ${c.noun} suddenly ${c.vp} ${c.adv}. ${c.cap(c.exclaim)}! The ${c.plural} clapped while my ${c.body} tingled for ${c.num} ${c.num===1?'minute':'minutes'}.`,
        (c) => `I borrowed a ${c.adj} ${c.noun} and practiced at the ${c.place}. It ${c.vp} ${c.adv} so well that ${c.plural} stopped to watch. "${c.cap(c.exclaim)}!" I said after ${c.num} ${c.num===1?'minute':'minutes'}.`,
        (c) => `The ${c.place} was buzzing with ${c.plural}. My ${c.adj} ${c.noun} ${c.vp} ${c.adv}, and "${c.cap(c.exclaim)}!" was all I could say. We rested for ${c.num} ${c.num===1?'minute':'minutes'}.`,
        (c) => `We counted ${c.num} steps to the ${c.place}. A ${c.adj} ${c.noun} ${c.vp} ${c.adv}, making my ${c.body} vibrate. "${c.cap(c.exclaim)}!" I yelled as the ${c.plural} waved.`
      ];
      var story = templates[Math.floor(Math.random() * templates.length)](ctx);

      if (error) error.textContent = '';
      if (storyEl) storyEl.textContent = story;
      if (wrap) wrap.style.display = 'block';
    });

    // Restart button clears fields and hides result
    var restart = document.getElementById('madlibsRestart');
    bind(restart, function () {
      var ids = ['mlAdj','mlNoun','mlVerbPast','mlAdverb','mlPlural','mlExclaim','mlBody','mlPlace','mlNumber'];
      ids.forEach(function(id){ var el=document.getElementById(id); if (el) el.value=''; });
      var wrap = document.getElementById('madlibsResult');
      var storyEl = document.getElementById('madlibsStory');
      var error = document.getElementById('madlibsError');
      if (wrap) wrap.style.display = 'none';
      if (storyEl) storyEl.textContent = '';
      if (error) error.textContent = '';
      var first = document.getElementById('mlAdj'); try { first && first.focus(); } catch(_) {}
    });
  }

  onReady(function () {
    attachQr();
    attachPassword();
    attachPalette();
    attachMadLibs();
  });
})();
