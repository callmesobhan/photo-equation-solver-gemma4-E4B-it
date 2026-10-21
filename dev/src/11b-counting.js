// ======================================================================
// 11b. Counting and probability extras: dice, letter arrangements, birthday problem, Pascal rows, circular arrangements
// ======================================================================
/** ways[s] = number of ways n dice with `sides` faces add up to s (exact, big integers) */
function diceWays(nDice, sides) {
  let ways = new Map([[0, 1n]]);
  for (let i = 0; i < nDice; i++) {
    const next = new Map();
    ways.forEach((w, s) => {
      for (let f = 1; f <= sides; f++) next.set(s + f, (next.get(s + f) || 0n) + w);
    });
    ways = next;
  }
  return ways;
}
defCmd('dice dicesum diceprob', (n) => {
  needArgs(n, 2, 3, 'the number of dice, the number of faces and optionally the sum, e.g. dice(2, 6, 7)');
  const nd = Number(intArg(n.args[0]));
  const sides = Number(intArg(n.args[1]));
  if (nd < 1 || nd > 60) throw new MathError('between 1 and 60 dice are supported');
  if (sides < 2 || sides > 200) throw new MathError('a die needs between 2 and 200 faces');
  const ways = diceWays(nd, sides);
  const total = BigInt(sides) ** BigInt(nd);
  const out = newOut();
  const P = (w) => new Q(w, total);
  const sums = Array.from(ways.keys()).sort((a, b) => a - b);
  const mean = new Q(BigInt(nd * (sides + 1)), 2n);
  const variance = new Q(BigInt(nd) * BigInt(sides * sides - 1), 12n);
  if (n.args[2]) {
    const t = Number(intArg(n.args[2]));
    const w = ways.get(t) || 0n;
    let le = 0n;
    let ge = 0n;
    ways.forEach((v, s) => {
      if (s <= t) le += v;
      if (s >= t) ge += v;
    });
    out.answer.push('P(sum = ' + t + ') = ' + qText(P(w)) + '   (' + w + ' of the ' + total + ' equally likely outcomes)');
    out.work.push('P(sum ≤ ' + t + ') = ' + qText(P(le)) + ';  P(sum ≥ ' + t + ') = ' + qText(P(ge)));
    out.value = { q: P(w) };
  } else {
    out.answer.push('sums from ' + sums[0] + ' to ' + sums[sums.length - 1] + ';  most likely ' + sums.filter((s) => ways.get(s) === sums.reduce((m, x) => (ways.get(x) > m ? ways.get(x) : m), 0n)).join(' or ') + '  (' + total + ' equally likely outcomes)');
    out.work.push('number of ways for each sum: ' + sums.map((s) => s + ': ' + ways.get(s)).join(', '));
    out.value = { q: mean };
  }
  out.work.push(nd + ' dice with ' + sides + ' faces:  mean sum = ' + qText(mean) + ',  variance = ' + qText(variance));
  return out;
});
COMMANDS.dice.show = (n) => 'dice: ' + n.args.map(showRaw).join(', ') + ' (number of dice, faces' + (n.args[2] ? ', sum' : '') + ')';

// ---- letters of a word: the model writes  arrangements of MISSISSIPPI ----------------------------------------------------------------
const WORD_BASE = 27n;
const encodeWord = (w) => Array.from(w.toUpperCase()).reduce((v, c) => v * WORD_BASE + BigInt(c.charCodeAt(0) - 64), 0n);
function decodeWord(v) {
  let s = '';
  while (v > 0n) {
    s = String.fromCharCode(64 + Number(v % WORD_BASE)) + s;
    v /= WORD_BASE;
  }
  return s;
}
defCmd('anagrams wordperm arrangementsof', (n) => {
  needArgs(n, 1, 1, 'a word');
  const word = decodeWord(intArg(n.args[0]));
  if (word.length < 1 || word.length > 60 || /[^A-Z]/.test(word)) throw new MathError('give a word of letters, for example arrangements of MISSISSIPPI');
  const counts = new Map();
  Array.from(word).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1));
  const total = bigFactorial(BigInt(word.length));
  let div = 1n;
  counts.forEach((k) => { div *= bigFactorial(BigInt(k)); });
  const out = newOut();
  out.work.push('The word ' + word + ' has ' + word.length + ' letters: ' + Array.from(counts).map(([c, k]) => c + ' ×' + k).join(', '));
  out.work.push(word.length + '! / (' + Array.from(counts.values()).map((k) => k + '!').join('·') + ') — repeated letters make some arrangements identical');
  return intOut(out, total / div);
});
COMMANDS.anagrams.show = (n) => 'distinct arrangements of the letters of ' + decodeWord(intArg(n.args[0]));

// ---- birthday problem, Pascal rows, circular arrangements ----------------------------------------------------------------------
defCmd('birthday birthdayproblem', (n) => {
  needArgs(n, 1, 2, 'the number of people (and optionally the number of days, default 365)');
  const people = Number(intArg(n.args[0]));
  const days = n.args[1] ? Number(intArg(n.args[1])) : 365;
  if (people < 1 || people > 5000 || days < 1 || days > 100000) throw new MathError('use at most 5000 people and 100000 days');
  let allDifferent = Q1;
  for (let i = 0; i < people; i++) allDifferent = allDifferent.mul(new Q(BigInt(Math.max(days - i, 0)), BigInt(days)));
  const p = Q1.sub(allDifferent);
  const out = newOut();
  out.answer.push('P(at least two of ' + people + ' people share a birthday) = ' + (p.isInt() ? p.toString() : fmtNum(p.toNumber())));
  out.work.push('P(all different) = ' + Array.from({ length: Math.min(people, 4) }, (_, i) => '(' + (days - i) + '/' + days + ')').join('·') + (people > 4 ? '···' : '') + ' = ' + fmtNum(allDifferent.toNumber()) + ';  the answer is 1 minus that (' + days + ' equally likely days)');
  if (days === 365 && people < 366) {
    let need = 1;
    let q = Q1;
    while (need < 366 && Q1.sub(q).toNumber() < 0.5) {
      q = q.mul(new Q(BigInt(365 - need + 1), 365n));
      need++;
    }
    out.notes.push('With 365 days, ' + (need - 1) + ' or ' + need + ' people is where the chance first passes 50%.');
  }
  out.value = { q: p };
  return out;
});
defCmd('pascal pascalrow', (n) => {
  const [r] = ints(n, 1, 1, 'the row number (row 0 is 1)');
  if (r < 0n || r > 200n) throw new MathError('rows 0 to 200 are supported');
  const row = Array.from({ length: Number(r) + 1 }, (_, k) => binom(r, BigInt(k)));
  const out = newOut();
  out.answer.push(row.join(', '));
  out.work.push('Row ' + r + ' of Pascal\'s triangle: C(' + r + ', k) for k = 0 … ' + r + ';  the entries add up to 2^' + r + ' = ' + 2n ** r);
  return out;
});
defCmd('circular circularperm', (n) => {
  const [r] = ints(n, 1, 1, 'the number of people around the table');
  nonNeg(r, 'circular');
  if (r < 1n) throw new MathError('at least one person is needed');
  return intOut(newOut(), bigFactorial(r - 1n), r + ' people around a round table (rotations count as the same seating): (' + r + ' − 1)!');
});

/** Called by convertDiscrete: "arrangements of MISSISSIPPI" -> anagrams(<encoded word>) */
const WORD_STOP = new Set(['the', 'of', 'a', 'an', 'n', 'objects', 'items', 'people', 'persons', 'letters', 'elements', 'things', 'books', 'balls', 'students', 'digits', 'numbers', 'boys', 'girls', 'men', 'women', 'children', 'cards', 'colors', 'colours', 'flags', 'seats', 'chairs', 'ways', 'all', 'these', 'those', 'them', 'such', 'that', 'this', 'with', 'from', 'size', 'distinct', 'different', 'possible', 'many', 'letter', 'word', 'words']);
function convertWordCounting(s) {
  return s.replace(/\b(?:how\s+many\s+)?(?:(?:distinct|different|possible|unique)\s+)?(?:anagrams?|arrangements?|permutations?|rearrangements?|ways\s+(?:to\s+)?(?:arrange|rearrange))(?:\s+are\s+there)?\s*(?:\(\s*|\s*(?:(?:of|for|from)\s+)?)(?:the\s+)?(?:(?:letters|word|name)\s+(?:of\s+|in\s+)?)?(?:the\s+)?(?:word\s+)?["'“”]?([A-Za-z]{3,})["'“”]?\s*\)?/gi, (m, w) => (WORD_STOP.has(w.toLowerCase()) ? m : 'anagrams(' + encodeWord(w) + ')'));
}
