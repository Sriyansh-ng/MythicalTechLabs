// General Quiz logic: grade selection -> 5-question round -> score + review of incorrect answers

(function () {
  const questionBank = (() => {
    // Utilities for building options and randomness
    function randInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function shuffleLocal(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    function buildOptionsFrom(correct, distractors) {
      // Start with items that are not exactly the correct answer
      let pool = distractors.filter(d => d !== correct);

      // Category-aware filter: if the correct answer belongs to a known set,
      // remove any distractor from that same set so there's only one valid answer.
      try {
        const norm = (s) => String(s || '').trim();
        const CATEGORIES = {
          oceans: new Set(['Pacific','Atlantic','Indian','Arctic','Southern']),
          seas: new Set([
            'Red Sea','Caribbean Sea','Mediterranean Sea','Arabian Sea','Baltic Sea','Black Sea','Bering Sea',
            'Coral Sea','South China Sea','North Sea','Caspian Sea','Aegean Sea','Andaman Sea','Java Sea',
            'Sargasso Sea','Tyrrhenian Sea','Adriatic Sea','Ionian Sea','Norwegian Sea','Barents Sea'
          ])
        };
        const cVal = norm(correct);
        let matchedSet = null;
        for (const key in CATEGORIES) {
          if (CATEGORIES[key].has(cVal)) { matchedSet = CATEGORIES[key]; break; }
        }
        if (matchedSet) {
          pool = pool.filter(d => !matchedSet.has(norm(d)));
        }
      } catch (_) { /* noop */ }

      // Heuristic fallback by keyword (covers cases where values include category words)
      try {
        const lc = (v) => String(v || '').toLowerCase();
        const c = lc(correct);
        const tokens = ['sea','ocean','river','lake','mountain','desert'];
        const hit = tokens.find(t => new RegExp('\\b' + t + '\\b', 'i').test(c));
        if (hit) {
          const re = new RegExp('\\b' + hit + '\\b', 'i');
          pool = pool.filter(d => !re.test(lc(d)));
        }
      } catch (_) { /* noop */ }

      shuffleLocal(pool);
      const chosen = pool.slice(0, 3);
      const options = shuffleLocal([correct, ...chosen]);
      return { options, correctIndex: options.indexOf(correct) };
    }
    function createArithmeticQ(type, min, max) {
      let a, b, q, correct;
      if (type === "add") {
        a = randInt(min, max); b = randInt(min, max);
        correct = a + b; q = `What is ${a} + ${b}?`;
      } else if (type === "sub") {
        a = randInt(min, max); b = randInt(min, a);
        correct = a - b; q = `What is ${a} - ${b}?`;
      } else if (type === "mul") {
        a = randInt(min, max); b = randInt(min, max);
        correct = a * b; q = `What is ${a} × ${b}?`;
      } else { // div
        a = randInt(min, max); b = randInt(min, max);
        const dividend = a * b; correct = a; q = `What is ${dividend} ÷ ${b}?`;
      }
      // Make nearby numerical distractors
      const distractors = [];
      for (let d = -5; d <= 5; d++) {
        const cand = correct + d;
        if (cand !== correct && cand >= 0) distractors.push(String(cand));
      }
      const { options, correctIndex } = buildOptionsFrom(String(correct), distractors.map(String));
      return { q, options, correctIndex };
    }

    // Subject pools per grade (curated)
    const pools = {
      g1: {
        science: [
          { q: "Which animal says 'Moo'?", correct: "Cow", d: ["Dog", "Cat", "Sheep", "Goat", "Horse"] },
          { q: "Which one is a fruit?", correct: "Apple", d: ["Carrot", "Potato", "Onion", "Lettuce", "Celery"] },
          { q: "Which season is the coldest?", correct: "Winter", d: ["Spring", "Summer", "Autumn", "Monsoon"] },
          { q: "What do bees make?", correct: "Honey", d: ["Milk", "Water", "Bread", "Juice"] },
          { q: "Which part helps you see?", correct: "Eyes", d: ["Ears", "Nose", "Tongue", "Hands"] },
          { q: "What do plants need to grow?", correct: "Water", d: ["Sand", "Plastic", "Metal", "Glass"] },
          { q: "Which is a source of light?", correct: "Sun", d: ["Stone", "Leaf", "Book", "Spoon"] },
          { q: "Which animal can fly?", correct: "Bird", d: ["Fish", "Cow", "Snake", "Dog"] }
        ],
        ela: [
          { q: "Choose the noun: The cat runs.", correct: "cat", d: ["runs", "the", "fast", "and"] },
          { q: "Choose the correct article: ___ apple", correct: "an", d: ["a", "the", "no article", "some"] },
          { q: "Pick the opposite of 'hot'", correct: "cold", d: ["warm", "boil", "fire", "sun"] },
          { q: "Choose the noun: Birds sing.", correct: "Birds", d: ["sing", "the", "on", "and"] },
          { q: "Pick the correct spelling", correct: "school", d: ["schol", "skool", "scholll", "scool"] }
        ],
        gk: [
          { q: "What color are bananas when ripe?", correct: "Yellow", d: ["Blue", "Green", "Purple", "Red"] },
          { q: "How many days are in a week?", correct: "7", d: ["5", "6", "8", "9"] },
          { q: "Which shape has 3 sides?", correct: "Triangle", d: ["Square", "Circle", "Rectangle", "Oval"] },
          { q: "Which day comes after Monday?", correct: "Tuesday", d: ["Sunday", "Friday", "Thursday", "Saturday"] },
          { q: "What color is the sky on a clear day?", correct: "Blue", d: ["Green", "Red", "Yellow", "Gray"] }
        ]
      },
      g2: {
        science: [
          { q: "Water turns to ice at ___ °C", correct: "0", d: ["10", "50", "100", "-10"] },
          { q: "We breathe in", correct: "Oxygen", d: ["Carbon dioxide", "Nitrogen", "Hydrogen", "Helium"] },
          { q: "Which is a mammal?", correct: "Whale", d: ["Shark", "Frog", "Eagle", "Lizard"] },
          { q: "Plants make food using", correct: "Sunlight", d: ["Moonlight", "Stones", "Wind", "Sand"] },
          { q: "How many phases does the Moon have?", correct: "8", d: ["4", "6", "10", "12"] }
        ],
        ela: [
          { q: "Pick the synonym of 'big'", correct: "large", d: ["tiny", "thin", "short", "slow"] },
          { q: "Pick the antonym of 'happy'", correct: "sad", d: ["glad", "joyful", "smile", "laugh"] },
          { q: "Choose the correct plural of 'child'", correct: "children", d: ["childs", "childes", "childrens", "childer"] },
          { q: "Pick the correct sentence", correct: "The cat is black.", d: ["the cat is black", "the Cat is black", "The cat is Black", "Cat the is black."] },
          { q: "Which is a verb?", correct: "run", d: ["blue", "happy", "cat", "table"] }
        ],
        gk: [
          { q: "How many continents are there?", correct: "7", d: ["5", "6", "8", "9"] },
          { q: "Which planet do we live on?", correct: "Earth", d: ["Mars", "Venus", "Jupiter", "Mercury"] },
          { q: "How many hours are in a day?", correct: "24", d: ["12", "18", "20", "36"] },
          { q: "What do we use to measure time?", correct: "Clock", d: ["Scale", "Ruler", "Map", "Globe"] },
          { q: "What is the capital letter of 'a'?", correct: "A", d: ["B", "C", "D", "E"] }
        ]
      },
      g3: {
        science: [
          { q: "Which gas do plants take in?", correct: "Carbon dioxide", d: ["Oxygen", "Nitrogen", "Hydrogen", "Helium"] },
          { q: "Photosynthesis mainly happens in the", correct: "Leaves", d: ["Roots", "Stem", "Flower", "Seeds"] },
          { q: "Which is the largest ocean?", correct: "Pacific", d: ["Atlantic", "Indian", "Arctic", "Southern"] },
          { q: "Which organ pumps blood?", correct: "Heart", d: ["Lungs", "Liver", "Stomach", "Brain"] },
          { q: "What is the boiling point of water (°C)?", correct: "100", d: ["50", "75", "90", "120"] }
        ],
        ela: [
          { q: "Pick the synonym of 'brave'", correct: "courageous", d: ["cowardly", "fearful", "timid", "weak"] },
          { q: "Pick the antonym of 'begin'", correct: "end", d: ["start", "open", "launch", "initiate"] },
          { q: "Which word is a noun?", correct: "ocean", d: ["quickly", "green", "running", "very"] },
          { q: "Choose the correctly punctuated sentence", correct: "Where are you?", d: ["Where are you.", "where are you?", "Where are you", "Where are you!"] },
          { q: "Which word is an adjective?", correct: "bright", d: ["jump", "quietly", "forest", "tomorrow"] }
        ],
        gk: [
          { q: "What is the capital of France?", correct: "Paris", d: ["Berlin", "Madrid", "Rome", "Lisbon"] },
          { q: "Which number is a prime?", correct: "11", d: ["4", "6", "9", "12"] },
          { q: "Which continent is Egypt in?", correct: "Africa", d: ["Europe", "Asia", "South America", "Oceania"] },
          { q: "How many states of matter are commonly taught?", correct: "3", d: ["2", "4", "5", "6"] },
          { q: "Which direction is opposite of East?", correct: "West", d: ["North", "South", "Up", "Down"] }
        ]
      }
    };

    // —— Auto-augment pools: add 30 generated questions per category per grade ——
    function randomChoice(arr) { return arr[randInt(0, arr.length - 1)]; }

    // Science generators
    function genScienceItemG1() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const senses = [
          { organ: "Eyes", sense: "see" },
          { organ: "Ears", sense: "hear" },
          { organ: "Nose", sense: "smell" },
          { organ: "Tongue", sense: "taste" },
          { organ: "Skin", sense: "touch" }
        ];
        const pick = randomChoice(senses);
        const allOrgans = senses.map(s => s.organ).concat(["Hands", "Feet"]);
        return { q: `Which body part helps you ${pick.sense}?`, correct: pick.organ, d: allOrgans };
      } else if (mode === 2) {
        const animals = [
          { name: "Fish", habitat: "Water" },
          { name: "Camel", habitat: "Desert" },
          { name: "Penguin", habitat: "Cold regions" },
          { name: "Eagle", habitat: "Sky" },
          { name: "Frog", habitat: "Pond" },
          { name: "Polar bear", habitat: "Arctic" },
          { name: "Duck", habitat: "Lake" }
        ];
        const pick = randomChoice(animals);
        const habitats = Array.from(new Set(animals.map(a => a.habitat).concat(["Forest", "Grassland", "Jungle"])));
        return { q: `Where does a ${pick.name} mainly live?`, correct: pick.habitat, d: habitats };
      } else {
        const lightSources = ["Sun", "Bulb", "Candle"];
        const notLight = ["Stone", "Leaf", "Book", "Spoon", "Plastic"];
        const correct = randomChoice(lightSources);
        return { q: "Which is a source of light?", correct, d: lightSources.concat(notLight) };
      }
    }
    function genScienceItemG2() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const parts = [
          { q: "Which organ pumps blood?", correct: "Heart", d: ["Lungs", "Liver", "Stomach", "Brain", "Kidney"] },
          { q: "Which organ helps you breathe?", correct: "Lungs", d: ["Heart", "Liver", "Stomach", "Brain", "Kidney"] },
          { q: "Which organ helps you think?", correct: "Brain", d: ["Heart", "Lungs", "Stomach", "Liver", "Kidney"] }
        ];
        return randomChoice(parts);
      } else if (mode === 2) {
        const phases = ["New Moon", "Crescent", "Quarter", "Gibbous", "Full Moon"];
        const correct = randomChoice(phases);
        return { q: "Which is a phase of the Moon?", correct, d: phases.concat(["Rainbow", "Storm", "Hurricane"]) };
      } else {
        const states = ["Solid", "Liquid", "Gas"];
        const correct = randomChoice(states);
        return { q: "Which is a state of matter?", correct, d: states.concat(["Plasma ball", "Windmill", "Cloud"]) };
      }
    }
    function genScienceItemG3() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const oceans = ["Pacific", "Atlantic", "Indian", "Arctic", "Southern"];
        const correct = randomChoice(oceans);
        return { q: "Which is an ocean?", correct, d: oceans.concat(["Sahara", "Amazon", "Andes"]) };
      } else if (mode === 2) {
        const processes = [
          { q: "Plants make food by", correct: "Photosynthesis", d: ["Digestion", "Respiration", "Fermentation", "Evaporation"] },
          { q: "Water changing to gas is called", correct: "Evaporation", d: ["Condensation", "Freezing", "Melting", "Sublimation"] }
        ];
        return randomChoice(processes);
      } else {
        const animals = [
          { q: "Which is a reptile?", correct: "Snake", d: ["Frog", "Whale", "Eagle", "Cow", "Ant"] },
          { q: "Which is an amphibian?", correct: "Frog", d: ["Snake", "Whale", "Eagle", "Cow", "Ant"] }
        ];
        return randomChoice(animals);
      }
    }

    // ELA generators
    function genELAItemG1() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const pairs = [
          ["big", "large"], ["small", "tiny"], ["happy", "glad"], ["fast", "quick"], ["smart", "clever"]
        ];
        const [word, syn] = randomChoice(pairs);
        const distractors = pairs.filter(p => p[1] !== syn).map(p => p[1]).concat(["blue", "table", "river"]);
        return { q: `Pick the synonym of '${word}'`, correct: syn, d: distractors };
      } else if (mode === 2) {
        const pairs = [
          ["hot", "cold"], ["up", "down"], ["day", "night"], ["open", "close"], ["happy", "sad"]
        ];
        const [word, ant] = randomChoice(pairs);
        const distractors = pairs.filter(p => p[1] !== ant).map(p => p[1]).concat(["long", "short", "wide"]);
        return { q: `Pick the antonym of '${word}'`, correct: ant, d: distractors };
      } else {
        const nouns = ["cat", "dog", "tree", "ball", "bird"];
        const verbs = ["run", "jump", "sing", "read", "write"];
        const correct = randomChoice(nouns);
        return { q: "Which word is a noun?", correct, d: nouns.concat(verbs) };
      }
    }
    function genELAItemG2() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const pairs = [
          ["begin", "start"], ["silent", "quiet"], ["quick", "rapid"], ["angry", "mad"], ["easy", "simple"]
        ];
        const [word, syn] = randomChoice(pairs);
        const distractors = pairs.filter(p => p[1] !== syn).map(p => p[1]).concat(["green", "table", "river"]);
        return { q: `Pick the synonym of '${word}'`, correct: syn, d: distractors };
      } else if (mode === 2) {
        const pairs = [
          ["empty", "full"], ["arrive", "leave"], ["brave", "cowardly"], ["accept", "reject"], ["early", "late"]
        ];
        const [word, ant] = randomChoice(pairs);
        const distractors = pairs.filter(p => p[1] !== ant).map(p => p[1]).concat(["tall", "short", "wide"]);
        return { q: `Pick the antonym of '${word}'`, correct: ant, d: distractors };
      } else {
        const nouns = ["teacher", "city", "book", "river", "mountain"];
        const verbs = ["climb", "think", "draw", "teach", "swim"];
        const adjs = ["happy", "blue", "tall", "quiet", "bright"];
        const correct = randomChoice(nouns);
        return { q: "Which word is a noun?", correct, d: nouns.concat(verbs, adjs) };
      }
    }
    function genELAItemG3() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const pairs = [
          ["ancient", "old"], ["brave", "courageous"], ["silent", "hushed"], ["swift", "rapid"], ["difficult", "hard"]
        ];
        const [word, syn] = randomChoice(pairs);
        const distractors = pairs.filter(p => p[1] !== syn).map(p => p[1]).concat(["green", "table", "river"]);
        return { q: `Pick the synonym of '${word}'`, correct: syn, d: distractors };
      } else if (mode === 2) {
        const pairs = [
          ["expand", "shrink"], ["victory", "defeat"], ["increase", "decrease"], ["accept", "decline"], ["ancient", "modern"]
        ];
        const [word, ant] = randomChoice(pairs);
        const distractors = pairs.filter(p => p[1] !== ant).map(p => p[1]).concat(["tall", "short", "wide"]);
        return { q: `Pick the antonym of '${word}'`, correct: ant, d: distractors };
      } else {
        const nouns = ["ocean", "government", "energy", "ecosystem", "imagination"];
        const verbs = ["calculate", "imagine", "observe", "construct", "debate"];
        const adjs = ["brilliant", "ancient", "fragile", "massive", "mysterious"];
        const correct = randomChoice(nouns);
        return { q: "Which word is a noun?", correct, d: nouns.concat(verbs, adjs) };
      }
    }

    // GK generators
    function genGKItemG1() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const idx = randInt(0, days.length - 2);
        const correct = days[idx + 1];
        return { q: `Which day comes after ${days[idx]}?`, correct, d: days };
      } else if (mode === 2) {
        const shapes = ["Triangle", "Square", "Circle", "Rectangle", "Pentagon"];
        const correct = randomChoice(shapes);
        return { q: "Which is a shape?", correct, d: shapes.concat(["Banana", "Dog", "Car"]) };
      } else {
        const colors = ["Red", "Blue", "Green", "Yellow", "Purple"];
        const correct = randomChoice(colors);
        return { q: "Which is a color?", correct, d: colors.concat(["Table", "Chair", "Glass"]) };
      }
    }
    function genGKItemG2() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const countries = [
          ["France", "Paris"], ["Germany", "Berlin"], ["Spain", "Madrid"], ["Italy", "Rome"],
          ["UK", "London"], ["USA", "Washington, D.C."], ["Canada", "Ottawa"], ["Japan", "Tokyo"],
          ["India", "New Delhi"], ["Australia", "Canberra"], ["Brazil", "Brasília"], ["Egypt", "Cairo"]
        ];
        const [country, capital] = randomChoice(countries);
        const distractors = countries.filter(c => c[1] !== capital).map(c => c[1]);
        return { q: `What is the capital of ${country}?`, correct: capital, d: distractors };
      } else if (mode === 2) {
        const conts = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"];
        const correct = randomChoice(conts);
        return { q: "Which is a continent?", correct, d: conts.concat(["Sahara", "Amazon", "Baltic Sea"]) };
      } else {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const idx = randInt(0, months.length - 2);
        const correct = months[idx + 1];
        return { q: `Which month comes after ${months[idx]}?`, correct, d: months };
      }
    }
    function genGKItemG3() {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const rivers = ["Nile", "Amazon", "Yangtze", "Mississippi", "Danube"];
        const correct = randomChoice(rivers);
        return { q: "Which is a river?", correct, d: rivers.concat(["Alps", "Sahara", "Pacific"]) };
      } else if (mode === 2) {
        const landmarks = [
          ["India", "Taj Mahal"], ["France", "Eiffel Tower"], ["China", "Great Wall"], ["Egypt", "Pyramids of Giza"]
        ];
        const [country, lm] = randomChoice(landmarks);
        const distractors = landmarks.filter(l => l[1] !== lm).map(l => l[1]).concat(["Statue of Liberty", "Colosseum"]);
        return { q: `Which landmark is in ${country}?`, correct: lm, d: distractors };
      } else {
        const seas = ["Mediterranean Sea", "Caribbean Sea", "Baltic Sea", "Black Sea", "Red Sea"];
        const correct = randomChoice(seas);
        return { q: "Which is a sea?", correct, d: seas.concat(["Himalayas", "Andes", "Sahara"]) };
      }
    }

    function extendPool(arr, gen, count) {
      for (let i = 0; i < count; i++) arr.push(gen());
    }

    // Extend each category by 30 items
    extendPool(pools.g1.science, genScienceItemG1, 30);
    extendPool(pools.g1.ela, genELAItemG1, 30);
    extendPool(pools.g1.gk, genGKItemG1, 30);

    extendPool(pools.g2.science, genScienceItemG2, 30);
    extendPool(pools.g2.ela, genELAItemG2, 30);
    extendPool(pools.g2.gk, genGKItemG2, 30);

    extendPool(pools.g3.science, genScienceItemG3, 30);
    extendPool(pools.g3.ela, genELAItemG3, 30);
    extendPool(pools.g3.gk, genGKItemG3, 30);

    // Per-grade subject generators
    function genMathG1() {
      return createArithmeticQ(Math.random() < 0.5 ? "add" : "sub", 0, 10);
    }
    function genMathG2() {
      return createArithmeticQ(Math.random() < 0.5 ? "add" : "sub", 0, 20);
    }
    function genMathG3() {
      return createArithmeticQ(Math.random() < 0.5 ? "mul" : "div", 2, 12);
    }

    function pickFromPool(item) {
      const { options, correctIndex } = buildOptionsFrom(item.correct, item.d);
      return { q: item.q, options, correctIndex };
    }
    function genScienceG1() { return pickFromPool(pools.g1.science[randInt(0, pools.g1.science.length - 1)]); }
    function genScienceG2() { return pickFromPool(pools.g2.science[randInt(0, pools.g2.science.length - 1)]); }
    function genScienceG3() { return pickFromPool(pools.g3.science[randInt(0, pools.g3.science.length - 1)]); }

    function genELAG1() { return pickFromPool(pools.g1.ela[randInt(0, pools.g1.ela.length - 1)]); }
    function genELAG2() { return pickFromPool(pools.g2.ela[randInt(0, pools.g2.ela.length - 1)]); }
    function genELAG3() { return pickFromPool(pools.g3.ela[randInt(0, pools.g3.ela.length - 1)]); }

    function genGKG1() { return pickFromPool(pools.g1.gk[randInt(0, pools.g1.gk.length - 1)]); }
    function genGKG2() { return pickFromPool(pools.g2.gk[randInt(0, pools.g2.gk.length - 1)]); }
    function genGKG3() { return pickFromPool(pools.g3.gk[randInt(0, pools.g3.gk.length - 1)]); }

    // Curated multi-subject seeds to ensure variety
    const curatedG1 = [
      pickFromPool(pools.g1.science[0]),
      pickFromPool(pools.g1.science[1]),
      pickFromPool(pools.g1.ela[0]),
      pickFromPool(pools.g1.gk[1]),
      pickFromPool(pools.g1.ela[1]),
      pickFromPool(pools.g1.gk[2]),
      pickFromPool(pools.g1.science[3]),
      pickFromPool(pools.g1.ela[3]),
      pickFromPool(pools.g1.gk[4]),
      pickFromPool(pools.g1.science[7])
    ];
    const curatedG2 = [
      pickFromPool(pools.g2.science[0]),
      pickFromPool(pools.g2.gk[0]),
      pickFromPool(pools.g2.ela[0]),
      pickFromPool(pools.g2.ela[2]),
      pickFromPool(pools.g2.science[2]),
      pickFromPool(pools.g2.gk[2]),
      pickFromPool(pools.g2.ela[4]),
      pickFromPool(pools.g2.science[4]),
      pickFromPool(pools.g2.gk[4]),
      pickFromPool(pools.g2.science[3])
    ];
    const curatedG3 = [
      pickFromPool(pools.g3.science[0]),
      pickFromPool(pools.g3.gk[0]),
      pickFromPool(pools.g3.ela[0]),
      pickFromPool(pools.g3.science[1]),
      pickFromPool(pools.g3.ela[3]),
      pickFromPool(pools.g3.gk[2]),
      pickFromPool(pools.g3.ela[4]),
      pickFromPool(pools.g3.science[3]),
      pickFromPool(pools.g3.gk[4]),
      pickFromPool(pools.g3.science[4])
    ];

    function buildBalanced(target, curated, gens) {
      const out = [...curated];
      let i = 0;
      while (out.length < target) {
        const gen = gens[i % gens.length];
        out.push(gen());
        i++;
      }
      return out.slice(0, target);
    }

    return {
      grade1: buildBalanced(50, curatedG1, [genMathG1, genScienceG1, genELAG1, genGKG1]),
      grade2: buildBalanced(50, curatedG2, [genMathG2, genScienceG2, genELAG2, genGKG2]),
      grade3: buildBalanced(50, curatedG3, [genMathG3, genScienceG3, genELAG3, genGKG3])
    };
  })();

  // Auto-extend each grade bank to 50 questions with age-appropriate arithmetic
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function shuffleLocal(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function makeOptions(correct, low, high) {
    const set = new Set([correct]);
    while (set.size < 4) {
      const delta = randInt(-5, 5);
      let cand = correct + delta;
      if (cand === correct || cand < low || cand > high) {
        cand = randInt(low, high);
      }
      if (cand !== correct) set.add(cand);
    }
    const options = shuffleLocal(Array.from(set));
    const correctIndex = options.indexOf(correct);
    return { options, correctIndex };
  }
  function createArithmeticQ(type, min, max) {
    let a, b, q, correct, low = 0, high = 200;
    if (type === "add") {
      a = randInt(min, max); b = randInt(min, max);
      correct = a + b;
      q = `What is ${a} + ${b}?`;
      high = max * 2;
    } else if (type === "sub") {
      a = randInt(min, max); b = randInt(min, a); // ensure non-negative
      correct = a - b;
      q = `What is ${a} - ${b}?`;
      high = max;
    } else if (type === "mul") {
      a = randInt(min, max); b = randInt(min, max);
      correct = a * b;
      q = `What is ${a} × ${b}?`;
      high = max * max;
    } else if (type === "div") {
      a = randInt(min, max); b = randInt(min, max);
      const dividend = a * b;
      correct = a;
      q = `What is ${dividend} ÷ ${b}?`;
      high = Math.max(max, a + 10);
    } else {
      a = randInt(min, max); b = randInt(min, max);
      correct = a + b;
      q = `What is ${a} + ${b}?`;
      high = max * 2;
    }
    const { options, correctIndex } = makeOptions(correct, low, high);
    return { q, options: options.map(String), correctIndex };
  }
  function genGrade1() {
    const op = Math.random() < 0.5 ? "add" : "sub";
    return createArithmeticQ(op, 0, 10);
  }
  function genGrade2() {
    const op = Math.random() < 0.5 ? "add" : "sub";
    return createArithmeticQ(op, 0, 20);
  }
  function genGrade3() {
    const op = Math.random() < 0.5 ? "mul" : "div";
    return createArithmeticQ(op, 2, 12);
  }
  function fillGrade(gradeKey, targetLen, genFn) {
    const arr = questionBank[gradeKey];
    while (arr.length < targetLen) {
      arr.push(genFn());
    }
  }
  fillGrade("grade1", 50, genGrade1);
  fillGrade("grade2", 50, genGrade2);
  fillGrade("grade3", 50, genGrade3);

  const els = {
    setup: document.getElementById("quizSetup"),
    select: document.getElementById("gradeSelect"),
    startBtn: document.getElementById("startQuizBtn"),
    container: document.getElementById("quizContainer"),
    question: document.getElementById("quizQuestion"),
    options: document.getElementById("quizOptions"),
    progress: document.getElementById("quizProgress"),
    submitBtn: document.getElementById("quizSubmitBtn"),
    result: document.getElementById("quizResult"),
    score: document.getElementById("quizScore"),
    review: document.getElementById("quizReview"),
    playAgain: document.getElementById("quizPlayAgain"),
    changeGrade: document.getElementById("quizChangeGrade")
  };

  const state = {
    gradeKey: null,
    questions: [],
    current: 0,
    score: 0,
    answers: [] // store selected answer index per question
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickQuestions(gradeKey) {
    const bank = questionBank[gradeKey] || [];
    return shuffle([...bank]).slice(0, 5);
  }

  function setView({ setup = false, quiz = false, result = false }) {
    els.setup.style.display = setup ? "grid" : "none";
    els.container.style.display = quiz ? "block" : "none";
    els.result.style.display = result ? "block" : "none";
  }

  function renderQuestion() {
    const q = state.questions[state.current];
    if (!q) return;

    els.question.textContent = q.q;
    els.progress.textContent = `Question ${state.current + 1} of ${state.questions.length}`;
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = state.current === state.questions.length - 1 ? "Finish" : "Submit";

    // Build options
    els.options.innerHTML = q.options
      .map((opt, idx) => {
        // Using label wrapper to enable styling via input:checked + span
        return `
          <label class="quiz-option">
            <input type="radio" name="quizChoice" value="${idx}">
            <span>${opt}</span>
          </label>
        `;
      })
      .join("");

    // Enable submit when a choice is selected
    els.options.querySelectorAll('input[name="quizChoice"]').forEach(input => {
      input.addEventListener("change", () => {
        els.submitBtn.disabled = false;
      });
    });
  }

  function startQuiz() {
    const gradeKey = els.select.value;
    if (!gradeKey) {
      alert("Please select a grade to start.");
      return;
    }
    state.gradeKey = gradeKey;
    state.questions = pickQuestions(gradeKey);
    state.current = 0;
    state.score = 0;
    state.answers = [];
    if (els.review) {
      els.review.style.display = "none";
      els.review.innerHTML = "";
    }

    setView({ setup: false, quiz: true, result: false });
    renderQuestion();
  }

  function submitAnswer() {
    const selected = els.options.querySelector('input[name="quizChoice"]:checked');
    if (!selected) return;

    const answerIndex = Number(selected.value);
    const currentQ = state.questions[state.current];

    // store answer
    state.answers[state.current] = answerIndex;

    if (answerIndex === currentQ.correctIndex) {
      state.score += 1;
    }

    state.current += 1;
    if (state.current < state.questions.length) {
      renderQuestion();
    } else {
      showResult();
    }
  }

  function showResult() {
    // Build review of incorrect answers first
    const wrongs = [];
    state.questions.forEach((q, idx) => {
      const userIdx = state.answers[idx];
      if (userIdx !== q.correctIndex) {
        wrongs.push({
          q: q.q,
          correct: q.options[q.correctIndex],
          yours: userIdx != null ? q.options[userIdx] : "(no answer)"
        });
      }
    });

    // Show result view before injecting review to avoid visibility timing issues
    setView({ setup: false, quiz: false, result: true });

    // Update score
    els.score.textContent = `You scored ${state.score} out of ${state.questions.length}.`;

    // Populate review
    if (els.review) {
      // Always clear first
      els.review.innerHTML = "";
      els.review.style.display = "none";

      if (wrongs.length > 0) {
        els.review.innerHTML = `
          <h4>Review incorrect answers</h4>
          ${wrongs
            .map(
              (w, i) => `
            <div class="wrong-item">
              <div class="q">${i + 1}. ${w.q}</div>
              <div class="a"><span class="label">Correct:</span> <span class="correct-answer">${w.correct}</span></div>
              <div class="a"><span class="label">Your answer:</span> <span class="your-answer">${w.yours}</span></div>
            </div>
          `
            )
            .join("")}
        `;
        els.review.style.display = "block";
      }
    }
  }

  function playAgain() {
    // Re-pick 5 new questions from the same grade
    if (!state.gradeKey) return toSetup();
    state.questions = pickQuestions(state.gradeKey);
    state.current = 0;
    state.score = 0;
    state.answers = [];
    if (els.review) {
      els.review.style.display = "none";
      els.review.innerHTML = "";
    }
    setView({ setup: false, quiz: true, result: false });
    renderQuestion();
  }

  function toSetup() {
    // Reset to grade selection
    els.select.value = "";
    if (els.review) {
      els.review.style.display = "none";
      els.review.innerHTML = "";
    }
    setView({ setup: true, quiz: false, result: false });
  }

  // Wire events (once)
  if (els.startBtn) els.startBtn.addEventListener("click", startQuiz);
  if (els.submitBtn) els.submitBtn.addEventListener("click", submitAnswer);
  if (els.playAgain) els.playAgain.addEventListener("click", playAgain);
  if (els.changeGrade) els.changeGrade.addEventListener("click", toSetup);

  // Ensure setup is shown by default when tab opens first time
  setView({ setup: true, quiz: false, result: false });
})();
