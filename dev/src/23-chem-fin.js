// ======================================================================
// 23. More chemistry and finance: elements and electron configurations, empirical / molecular formulas, stoichiometry and limiting
//     reagents, weak acids and bases, buffers, dilution, gas laws, radioactive decay; amortization, bonds, depreciation, growth rates,
//     payback and modified IRR.
// ======================================================================
const EL_NAMES = 'Hydrogen|Helium|Lithium|Beryllium|Boron|Carbon|Nitrogen|Oxygen|Fluorine|Neon|Sodium|Magnesium|Aluminum|Silicon|Phosphorus|Sulfur|Chlorine|Argon|Potassium|Calcium|Scandium|Titanium|Vanadium|Chromium|Manganese|Iron|Cobalt|Nickel|Copper|Zinc|Gallium|Germanium|Arsenic|Selenium|Bromine|Krypton|Rubidium|Strontium|Yttrium|Zirconium|Niobium|Molybdenum|Technetium|Ruthenium|Rhodium|Palladium|Silver|Cadmium|Indium|Tin|Antimony|Tellurium|Iodine|Xenon|Cesium|Barium|Lanthanum|Cerium|Praseodymium|Neodymium|Promethium|Samarium|Europium|Gadolinium|Terbium|Dysprosium|Holmium|Erbium|Thulium|Ytterbium|Lutetium|Hafnium|Tantalum|Tungsten|Rhenium|Osmium|Iridium|Platinum|Gold|Mercury|Thallium|Lead|Bismuth|Polonium|Astatine|Radon|Francium|Radium|Actinium|Thorium|Protactinium|Uranium|Neptunium|Plutonium|Americium|Curium|Berkelium|Californium|Einsteinium|Fermium|Mendelevium|Nobelium|Lawrencium|Rutherfordium|Dubnium|Seaborgium|Bohrium|Hassium|Meitnerium|Darmstadtium|Roentgenium|Copernicium|Nihonium|Flerovium|Moscovium|Livermorium|Tennessine|Oganesson'.split('|');
const EL_SYMBOLS = ELEMENTS.map((e) => e.split(' ')[0]);
const EL_ALT = { aluminium: 'Aluminum', caesium: 'Cesium', sulphur: 'Sulfur' };
const chemArgText = (node, what) => {
  const s = CHEM_ARGS[Number(intArg(node))];
  if (s === undefined) throw new MathError('write ' + what + ' directly, e.g. ' + what);
  return s;
};
/** Zero-based index of an element given as a symbol, a name or an atomic number. */
function elementIndex(text) {
  const t = text.trim();
  if (/^\d+$/.test(t)) {
    const z = Number(t);
    if (z >= 1 && z <= 118) return z - 1;
    throw new MathError('atomic numbers run from 1 to 118');
  }
  if (t.length <= 3) {
    const k = EL_SYMBOLS.indexOf(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
    if (k >= 0) return k;
  }
  const low = t.toLowerCase();
  const nm = EL_ALT[low] || null;
  const k = EL_NAMES.findIndex((e) => e.toLowerCase() === low || (nm && e === nm));
  if (k >= 0) return k;
  throw new MathError('"' + t + '" is not an element symbol, name or atomic number');
}

// ---- electron configurations ----------------------------------------------------------------------------------------------------------
const MADELUNG = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'];
const SUB_CAP = { s: 2, p: 6, d: 10, f: 14 };
const ECONF_OVERRIDE = {
  24: '3d5 4s1', 29: '3d10 4s1', 41: '4d4 5s1', 42: '4d5 5s1', 44: '4d7 5s1', 45: '4d8 5s1', 46: '4d10 5s0', 47: '4d10 5s1',
  57: '4f0 5d1 6s2', 58: '4f1 5d1 6s2', 64: '4f7 5d1 6s2', 78: '5d9 6s1', 79: '5d10 6s1',
  89: '5f0 6d1 7s2', 90: '5f0 6d2 7s2', 91: '5f2 6d1 7s2', 92: '5f3 6d1 7s2', 93: '5f4 6d1 7s2', 96: '5f7 6d1 7s2', 103: '6d0 7p1',
};
const NOBLE_Z = [[86, 'Rn'], [54, 'Xe'], [36, 'Kr'], [18, 'Ar'], [10, 'Ne'], [2, 'He']];
/** Map subshell -> electrons for the neutral atom with Z electrons (aufbau order plus the known exceptions). */
function econfOfZ(z) {
  const conf = new Map();
  let left = z;
  for (const sub of MADELUNG) {
    if (left <= 0) break;
    const put = Math.min(SUB_CAP[sub[1]], left);
    conf.set(sub, put);
    left -= put;
  }
  if (ECONF_OVERRIDE[z]) ECONF_OVERRIDE[z].split(' ').forEach((tok) => conf.set(tok.slice(0, 2), Number(tok.slice(2))));
  return conf;
}
const subOrder = (a, b) => Number(a[0]) - Number(b[0]) || 'spdf'.indexOf(a[1]) - 'spdf'.indexOf(b[1]);
const confText = (conf) => Array.from(conf.keys()).filter((k) => conf.get(k) > 0).sort(subOrder).map((k) => k + conf.get(k));
const unpairedIn = (conf) => {
  let u = 0;
  conf.forEach((e, sub) => {
    const orb = SUB_CAP[sub[1]] / 2;
    u += e <= orb ? e : 2 * orb - e;
  });
  return u;
};
function superscript(s) {
  const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
  return s.split('').map((c) => map[c] || c).join('');
}
/** "Fe", "Fe3+", "Fe^3+", "Cl-", "O2-", "Cu(+)" -> { z, charge }. */
function parseIon(text) {
  const t = text.trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
  let m = /^([A-Za-z]+?)(?:\^?\(?(\d*)([+-])\)?|\^?\(?([+-])(\d+)\)?)$/.exec(t);
  if (m && m[3] !== undefined) {
    const mag = m[2] === '' ? 1 : Number(m[2]);
    return { idx: elementIndex(m[1]), charge: m[3] === '+' ? mag : -mag };
  }
  if (m && m[4] !== undefined) return { idx: elementIndex(m[1]), charge: m[4] === '+' ? Number(m[5]) : -Number(m[5]) };
  return { idx: elementIndex(t), charge: 0 };
}
function ionConfig(idx, charge) {
  const z = idx + 1;
  if (charge <= 0) return econfOfZ(z - charge);
  const conf = econfOfZ(z);
  let remove = charge;
  if (remove >= z) throw new MathError('that ion would have no electrons');
  const order = Array.from(conf.keys()).filter((k) => conf.get(k) > 0).sort((a, b) => subOrder(b, a));
  // electrons leave the highest principal shell first, and within it the highest sub-shell (p before s, d before s of a lower shell is handled by n)
  while (remove > 0) {
    const sub = order.find((k) => conf.get(k) > 0);
    conf.set(sub, conf.get(sub) - 1);
    remove--;
  }
  return conf;
}
function elementBlock(idx) {
  const z = idx + 1;
  if (z === 2) return 's';
  // La and Ac head group 3 (d-block); the 14 elements after each are the f-block
  if ((z >= 58 && z <= 71) || (z >= 90 && z <= 103)) return 'f';
  if (z === 57 || z === 89) return 'd';
  let last = null;
  const conf = econfOfZ(z);
  MADELUNG.forEach((sub) => { if (conf.get(sub) > 0) last = sub; });
  return last ? last[1] : 's';
}
function elementGroup(idx) {
  const z = idx + 1;
  if (z === 1) return 1;
  if (z === 2) return 18;
  if ((z >= 58 && z <= 71) || (z >= 90 && z <= 103)) return null;
  const conf = econfOfZ(z);
  const per = elementPeriod(idx);
  const get = (k) => conf.get(k) || 0;
  const blk = elementBlock(idx);
  if (blk === 's') return get(per + 's');
  if (blk === 'p') return 12 + get(per + 'p');
  return get(per + 's') + get(per - 1 + 'd');
}
function elementPeriod(idx) {
  const z = idx + 1;
  const edges = [2, 10, 18, 36, 54, 86, 118];
  return edges.findIndex((e) => z <= e) + 1;
}
function elementCategory(z) {
  const in_ = (list) => list.includes(z);
  if (in_([3, 11, 19, 37, 55, 87])) return 'alkali metal';
  if (in_([4, 12, 20, 38, 56, 88])) return 'alkaline earth metal';
  if (in_([9, 17, 35, 53, 85, 117])) return 'halogen';
  if (in_([2, 10, 18, 36, 54, 86, 118])) return 'noble gas';
  if (in_([5, 14, 32, 33, 51, 52])) return 'metalloid';
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  if (in_([1, 6, 7, 8, 15, 16, 34])) return 'nonmetal';
  if (in_([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116])) return 'post-transition metal';
  return 'transition metal';
}
function configOutput(out, idx, charge) {
  const conf = ionConfig(idx, charge);
  const z = idx + 1;
  const electrons = z - charge;
  const full = confText(conf).join(' ');
  const nobles = NOBLE_Z.find(([nz]) => nz < electrons && (() => { const nc = econfOfZ(nz); return Array.from(nc.keys()).every((k) => (conf.get(k) || 0) >= nc.get(k)); })());
  let short = full;
  if (nobles) {
    const nc = econfOfZ(nobles[0]);
    const rest = new Map();
    conf.forEach((e, sub) => { const r = e - (nc.get(sub) || 0); if (r > 0) rest.set(sub, r); });
    short = '[' + nobles[1] + '] ' + confText(rest).join(' ');
  }
  const label = EL_SYMBOLS[idx] + (charge ? superscript((Math.abs(charge) > 1 ? String(Math.abs(charge)) : '') + (charge > 0 ? '+' : '-')) : '');
  out.answer.push(label + ': ' + short);
  out.work.push('full configuration: ' + full + '  (' + electrons + ' electrons)');
  const u = unpairedIn(conf);
  out.work.push('unpaired electrons: ' + u + (u ? ' (paramagnetic)' : ' (diamagnetic)'));
  return { conf, u };
}
defCmd('electronconfig electronconfiguration econfig', (n) => {
  needArgs(n, 1, 1, 'an element symbol, name or atomic number, e.g. electronconfig(Fe)');
  const { idx, charge } = parseIon(chemArgText(n.args[0], 'electronconfig(Fe)'));
  const out = newOut();
  const { conf } = configOutput(out, idx, charge);
  const maxN = Math.max(...Array.from(conf.keys()).filter((k) => conf.get(k) > 0).map((k) => Number(k[0])));
  let outer = 0;
  conf.forEach((e, sub) => { if (Number(sub[0]) === maxN) outer += e; });
  out.work.push('electrons in the outermost shell (n = ' + maxN + '): ' + outer);
  return out;
});
COMMANDS.electronconfig.show = (n) => 'electron configuration of ' + CHEM_ARGS[Number(intArg(n.args[0]))];
defCmd('element elementinfo periodic', (n) => {
  needArgs(n, 1, 1, 'an element symbol, name or atomic number, e.g. element(Fe)');
  const idx = elementIndex(chemArgText(n.args[0], 'element(Fe)'));
  const z = idx + 1;
  const out = newOut();
  const mass = ATOM[EL_SYMBOLS[idx]].m;
  const g = elementGroup(idx);
  out.answer.push(EL_NAMES[idx] + ' (' + EL_SYMBOLS[idx] + '), atomic number ' + z + ', atomic mass ' + mass.toNumber() + ' u');
  out.work.push('period ' + elementPeriod(idx) + ', ' + (g === null ? 'f-block (lanthanide / actinide series)' : 'group ' + g) + ', ' + elementBlock(idx) + '-block; ' + elementCategory(z));
  const conf = econfOfZ(z);
  const nobles = NOBLE_Z.find(([nz]) => nz < z);
  let short = confText(conf).join(' ');
  if (nobles) {
    const nc = econfOfZ(nobles[0]);
    const rest = new Map();
    conf.forEach((e, sub) => { const r = e - (nc.get(sub) || 0); if (r > 0) rest.set(sub, r); });
    short = '[' + nobles[1] + '] ' + confText(rest).join(' ');
  }
  out.work.push('electron configuration: ' + short);
  out.value = { q: mass };
  return out;
});
COMMANDS.element.show = (n) => 'element ' + CHEM_ARGS[Number(intArg(n.args[0]))];

// ---- empirical and molecular formulas ------------------------------------------------------------------------------------------------
function formulaText(entries) {
  return entries.map(([e, k]) => e + (k === 1 ? '' : k)).join('');
}
defCmd('empirical empiricalformula', (n) => {
  needArgs(n, 1, 1, 'percentages or masses of the elements, e.g. empirical(C 40, H 6.7, O 53.3)');
  const spec = chemArgText(n.args[0], 'empirical(C 40, H 6.7, O 53.3)');
  const parts = spec.split(';');
  const items = [];
  const re = /([A-Z][a-z]?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(%|g|grams?|mol)?|(\d+(?:\.\d+)?)\s*(%|g|grams?|mol)?\s*(?:of\s+)?([A-Z][a-z]?)/g;
  let m;
  while ((m = re.exec(parts[0]))) {
    const sym = m[1] || m[6];
    const val = Number(m[2] || m[4]);
    const unit = m[3] || m[5] || '';
    if (!ATOM[sym]) throw new MathError('"' + sym + '" is not an element symbol');
    const ex = items.find((it) => it.sym === sym);
    const moles = /^mol/.test(unit) ? val : val / ATOM[sym].m.toNumber();
    if (ex) ex.moles += moles;
    else items.push({ sym, val, unit, moles });
  }
  if (items.length < 2) throw new MathError('give at least two elements with their percentages or masses, e.g. empirical(C 40, H 6.7, O 53.3)');
  const lo = Math.min(...items.map((it) => it.moles));
  if (!(lo > 0)) throw new MathError('every amount must be positive');
  const ratios = items.map((it) => it.moles / lo);
  let k = 0;
  for (let t = 1; t <= 12 && !k; t++) if (ratios.every((r) => Math.abs(r * t - Math.round(r * t)) <= 0.1)) k = t;
  const out = newOut();
  out.work.push('moles of each element = amount / atomic mass: ' + items.map((it, i) => it.sym + ' ' + fmtNum(it.moles) + ' mol').join(', '));
  out.work.push('divide by the smallest: ' + items.map((it, i) => it.sym + ' ' + fmtNum(ratios[i])).join(', ') + (k > 1 ? ';  multiply by ' + k + ' to get whole numbers' : ''));
  if (!k) {
    out.answer.push('the mole ratios ' + items.map((it, i) => it.sym + ' ' + fmtNum(ratios[i])).join(' : ') + ' are not close to small whole numbers; check the data');
    return out;
  }
  const entries = items.map((it, i) => [it.sym, Math.round(ratios[i] * k)]);
  const emp = formulaText(entries);
  out.answer.push('empirical formula ' + emp);
  const eMass = entries.reduce((s, [e, c]) => s + c * ATOM[e].m.toNumber(), 0);
  out.work.push('empirical formula mass = ' + fmtNum(eMass) + ' g/mol');
  if (parts[1] !== undefined) {
    const mm = Number(parts[1].replace(/[^0-9.]/g, ''));
    if (mm > 0) {
      const mult = Math.round(mm / eMass);
      if (mult >= 1 && Math.abs(mm / eMass - mult) <= 0.1 * mult + 0.05) out.answer.push('molecular formula ' + formulaText(entries.map(([e, c]) => [e, c * mult])) + '  (molar mass ' + mm + ' / empirical mass ' + fmtNum(eMass) + ' ≈ ' + mult + ')');
      else out.answer.push('the molar mass ' + mm + ' is not a whole-number multiple of the empirical formula mass ' + fmtNum(eMass));
    }
  }
  return out;
});
COMMANDS.empirical.show = (n) => 'empirical formula from ' + CHEM_ARGS[Number(intArg(n.args[0]))];
defCmd('molecular molecularformula', (n) => {
  needArgs(n, 2, 2, 'the empirical formula and the molar mass, e.g. molecular(CH2O, 180)');
  const f = chemArgText(n.args[0], 'molecular(CH2O, 180)');
  const mm = numArg(n.args[1]);
  const cnt = parseFormula(f);
  const eMass = Array.from(cnt).reduce((s, [e, c]) => s + c * ATOM[e].m.toNumber(), 0);
  const mult = Math.round(mm / eMass);
  const out = newOut();
  if (mult < 1 || Math.abs(mm / eMass - mult) > 0.1 * mult + 0.05) {
    out.answer.push('the molar mass ' + fmtNum(mm) + ' is not a whole-number multiple of the empirical formula mass ' + fmtNum(eMass));
    return out;
  }
  out.answer.push('molecular formula ' + formulaText(Array.from(cnt).map(([e, c]) => [e, c * mult])));
  out.work.push('empirical formula mass ' + fmtNum(eMass) + ' g/mol;  ' + fmtNum(mm) + ' / ' + fmtNum(eMass) + ' ≈ ' + mult);
  return out;
});
COMMANDS.molecular.show = (n) => 'molecular formula from ' + CHEM_ARGS[Number(intArg(n.args[0]))] + ' and molar mass ' + showRaw(n.args[1]);

// ---- stoichiometry ---------------------------------------------------------------------------------------------------------------------------
/** Balance "A + B -> C + D": { left, right, coef (left then right), counts }. */
function chemBalance(rxn) {
  const sides = rxn.split(/->|=>|→|⟶|⇌|=/);
  if (sides.length !== 2) throw new MathError('the reaction needs one arrow, e.g. H2 + O2 -> H2O');
  const split = (t) => t.split(/\s+\+\s+|\s*\+\s*(?=[0-9]*[A-Z(])/).map((x) => x.trim().replace(/^\d+(?=[A-Z(])/, '')).filter(Boolean);
  const left = split(sides[0]);
  const right = split(sides[1]);
  if (!left.length || !right.length) throw new MathError('there must be something on both sides of the arrow');
  const species = left.concat(right);
  const counts = species.map(parseFormula);
  const elements = Array.from(new Set(counts.flatMap((c) => Array.from(c.keys()))));
  const rows = elements.map((e) => species.map((_, j) => qInt(counts[j].get(e) || 0).mul(j < left.length ? Q1 : qInt(-1))));
  const basis = mNullspace(rows);
  if (basis.length !== 1) throw new MathError(basis.length ? 'this reaction can be balanced in several independent ways' : 'this reaction cannot be balanced with these formulas');
  let v = primitiveVector(basis[0]);
  if (v.some((q) => q.sign() < 0)) v = v.map((q) => q.neg());
  if (v.some((q) => q.sign() <= 0) || v.some((q) => !q.isInt())) throw new MathError('no balance with positive whole-number coefficients exists for these formulas');
  return { left, right, coef: v.map((q) => Number(q.n)), species };
}
const rxnText = (b) => {
  const term = (name, c) => (c === 1 ? '' : c) + name;
  return b.left.map((s, j) => term(s, b.coef[j])).join(' + ') + ' → ' + b.right.map((s, j) => term(s, b.coef[b.left.length + j])).join(' + ');
};
const molarMassOf = (f) => molarOf(parseFormula(f)).toNumber();
/** "4 g H2", "0.5 mol O2", "2 kg Fe" -> { moles, mass, formula, text } */
function parseAmount(text) {
  const m = /^\s*(\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*(kg|mg|g|grams?|mmol|mol|moles?)?\s*(?:of\s+)?([A-Z][A-Za-z0-9()\[\]·.*]*)\s*$/.exec(text);
  if (!m) throw new MathError('write each amount like 4 g H2 or 0.5 mol O2 (number, unit g / kg / mg / mol, formula)');
  const val = Number(m[1]);
  const unit = (m[2] || 'g').toLowerCase();
  const f = m[3];
  const M = molarMassOf(f);
  let moles;
  if (unit === 'kg') moles = (val * 1000) / M;
  else if (unit === 'mg') moles = val / 1000 / M;
  else if (unit === 'mmol') moles = val / 1000;
  else if (/^mol/.test(unit)) moles = val;
  else moles = val / M;
  return { f, moles, M, text: m[1] + ' ' + (m[2] || 'g') + ' ' + f };
}
function chemSplitArgs(s) {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}
defCmd('limiting limitingreagent', (n) => {
  needArgs(n, 1, 1, 'a reaction and the amounts, e.g. limiting(H2 + O2 -> H2O, 4 g H2, 32 g O2)');
  const parts = chemSplitArgs(chemArgText(n.args[0], 'limiting(H2 + O2 -> H2O, 4 g H2, 32 g O2)'));
  const b = chemBalance(parts[0]);
  const given = parts.slice(1).map(parseAmount);
  if (given.length < 2) throw new MathError('give the amount of each reactant, e.g. limiting(H2 + O2 -> H2O, 4 g H2, 32 g O2)');
  given.forEach((g) => {
    if (!b.left.includes(g.f)) throw new MathError(g.f + ' is not a reactant of ' + parts[0]);
  });
  const out = newOut();
  out.work.push('balanced: ' + rxnText(b));
  const extents = given.map((g) => ({ g, ext: g.moles / b.coef[b.left.indexOf(g.f)] }));
  extents.forEach((e) => out.work.push(e.g.text + ' = ' + fmtNum(e.g.moles) + ' mol; moles ÷ coefficient = ' + fmtNum(e.ext)));
  const lim = extents.reduce((p, q) => (q.ext < p.ext ? q : p));
  const ties = extents.filter((e) => Math.abs(e.ext - lim.ext) <= 1e-9 * Math.max(1, lim.ext));
  out.answer.push(ties.length > 1 ? 'no limiting reagent: the reactants are in exactly the stoichiometric ratio' : 'limiting reagent: ' + lim.g.f);
  b.right.forEach((p, j) => {
    const mol = lim.ext * b.coef[b.left.length + j];
    out.answer.push('theoretical yield of ' + p + ': ' + fmtNum(mol) + ' mol = ' + fmtNum(mol * molarMassOf(p)) + ' g');
  });
  extents.forEach((e) => {
    if (e.g === lim.g) return;
    const used = lim.ext * b.coef[b.left.indexOf(e.g.f)];
    const left = e.g.moles - used;
    if (left > 1e-12 * Math.max(1, e.g.moles)) out.answer.push('excess ' + e.g.f + ' left over: ' + fmtNum(left) + ' mol = ' + fmtNum(left * e.g.M) + ' g');
  });
  return out;
});
COMMANDS.limiting.show = (n) => 'limiting reagent: ' + CHEM_ARGS[Number(intArg(n.args[0]))];
defCmd('stoich stoichiometry', (n) => {
  needArgs(n, 1, 1, 'a reaction, a given amount and the wanted substance, e.g. stoich(H2 + O2 -> H2O, 4 g H2, H2O)');
  const parts = chemSplitArgs(chemArgText(n.args[0], 'stoich(H2 + O2 -> H2O, 4 g H2, H2O)'));
  if (parts.length !== 3) throw new MathError('use stoich(reaction, amount of one substance, wanted substance)');
  const b = chemBalance(parts[0]);
  const g = parseAmount(parts[1]);
  const target = parts[2].trim();
  const all = b.left.concat(b.right);
  const gi = all.indexOf(g.f);
  const ti = all.indexOf(target);
  if (gi < 0) throw new MathError(g.f + ' does not appear in the reaction');
  if (ti < 0) throw new MathError(target + ' does not appear in the reaction');
  const mol = (g.moles * b.coef[ti]) / b.coef[gi];
  const out = newOut();
  out.work.push('balanced: ' + rxnText(b));
  out.work.push(g.text + ' = ' + fmtNum(g.moles) + ' mol ' + g.f + ';  mole ratio ' + target + ' : ' + g.f + ' = ' + b.coef[ti] + ' : ' + b.coef[gi]);
  out.answer.push(fmtNum(mol) + ' mol of ' + target + ' = ' + fmtNum(mol * molarMassOf(target)) + ' g');
  return out;
});
COMMANDS.stoich.show = (n) => 'stoichiometry: ' + CHEM_ARGS[Number(intArg(n.args[0]))];
defCmd('percentyield', (n) => {
  needArgs(n, 2, 2, 'the actual and the theoretical yield');
  const a = numArg(n.args[0]);
  const t = numArg(n.args[1]);
  if (!(t > 0)) throw new MathError('the theoretical yield must be positive');
  return numOut(newOut(), (a / t) * 100, 'percent yield (%)');
});

// ---- acids, bases, solutions, gases, decay ---------------------------------------------------------------------------------------
defCmd('weakacid', (n) => {
  needArgs(n, 2, 2, 'Ka and the concentration in mol/L, e.g. weakacid(1.8e-5, 0.10)');
  const ka = numArg(n.args[0]);
  const c = numArg(n.args[1]);
  if (!(ka > 0) || !(c > 0) || !isFinite(ka) || !isFinite(c)) throw new MathError('Ka and the concentration must be positive numbers');
  const x = (-ka + Math.sqrt(ka * ka + 4 * ka * c)) / 2;
  const out = newOut();
  out.answer.push('[H⁺] = ' + fmtNum(x) + ' mol/L,  pH = ' + fmtNum(-Math.log10(x)));
  out.answer.push('percent ionization = ' + fmtNum((x / c) * 100) + ' %');
  out.work.push('HA ⇌ H⁺ + A⁻:  Ka = x²/(C − x)  →  x² + Ka·x − Ka·C = 0  →  x = (−Ka + √(Ka² + 4·Ka·C))/2   (exact quadratic, no approximation)');
  out.work.push('shortcut x ≈ √(Ka·C) = ' + fmtNum(Math.sqrt(ka * c)) + (x / c < 0.05 ? ' (valid: ionization below 5 %)' : ' (not valid: ionization above 5 %)') + ';  pKa = ' + fmtNum(-Math.log10(ka)));
  out.value = { num: -Math.log10(x) };
  return out;
});
defCmd('weakbase', (n) => {
  needArgs(n, 2, 2, 'Kb and the concentration in mol/L, e.g. weakbase(1.8e-5, 0.10)');
  const kb = numArg(n.args[0]);
  const c = numArg(n.args[1]);
  if (!(kb > 0) || !(c > 0)) throw new MathError('Kb and the concentration must be positive');
  const x = (-kb + Math.sqrt(kb * kb + 4 * kb * c)) / 2;
  const out = newOut();
  out.answer.push('[OH⁻] = ' + fmtNum(x) + ' mol/L,  pOH = ' + fmtNum(-Math.log10(x)) + ',  pH = ' + fmtNum(14 + Math.log10(x)));
  out.answer.push('percent ionization = ' + fmtNum((x / c) * 100) + ' %');
  out.work.push('B + H₂O ⇌ BH⁺ + OH⁻:  Kb = x²/(C − x)  →  x = (−Kb + √(Kb² + 4·Kb·C))/2;  pH = 14 − pOH (25 °C)');
  out.value = { num: 14 + Math.log10(x) };
  return out;
});
defCmd('buffer hendersonhasselbalch', (n) => {
  needArgs(n, 3, 3, 'pKa (or Ka), the base [A⁻] and the acid [HA] concentrations, e.g. buffer(4.76, 0.20, 0.10)');
  let pka = numArg(n.args[0]);
  const base = numArg(n.args[1]);
  const acid = numArg(n.args[2]);
  if (!(base > 0) || !(acid > 0)) throw new MathError('both concentrations must be positive');
  const out = newOut();
  if (pka > 0 && pka < 1) {
    out.work.push('the first number is below 1, so it is taken as Ka: pKa = −log₁₀(Ka) = ' + fmtNum(-Math.log10(pka)));
    pka = -Math.log10(pka);
  }
  const ph = pka + Math.log10(base / acid);
  out.work.push('Henderson–Hasselbalch: pH = pKa + log₁₀([A⁻]/[HA]) = ' + fmtNum(pka) + ' + log₁₀(' + fmtNum(base) + '/' + fmtNum(acid) + ')');
  return numOut(out, ph, 'pH');
});
/** The unknown of a formula given as the letter x (or ?) among its arguments, or null. */
const unknownIndex = (args) => args.findIndex((a) => a.t === 'var' && (a.name === 'x' || a.name === 'X'));
defCmd('dilution', (n) => {
  needArgs(n, 4, 4, 'C1, V1, C2, V2 with the unknown written as x, e.g. dilution(12, 25, 0.5, x)');
  const k = unknownIndex(n.args);
  if (k < 0) throw new MathError('write the unknown as x, e.g. dilution(12, 25, 0.5, x)');
  const v = n.args.map((a, i) => (i === k ? NaN : numArg(a)));
  const [c1, v1, c2, v2] = v;
  let res;
  if (k === 0) res = (c2 * v2) / v1;
  else if (k === 1) res = (c2 * v2) / c1;
  else if (k === 2) res = (c1 * v1) / v2;
  else res = (c1 * v1) / c2;
  const names = ['C1', 'V1', 'C2', 'V2'];
  const out = newOut();
  out.work.push('C1·V1 = C2·V2  →  ' + names[k] + ' = ' + (k === 0 ? 'C2·V2/V1' : k === 1 ? 'C2·V2/C1' : k === 2 ? 'C1·V1/V2' : 'C1·V1/C2'));
  if (k === 3) out.work.push('solvent to add = V2 − V1 = ' + fmtNum(res - v1));
  return numOut(out, res, names[k]);
});
defCmd('molarity', (n) => {
  needArgs(n, 2, 3, 'moles and liters, or grams, a formula and liters: molarity(0.5, 2) or molarity(5.85, NaCl, 0.5)');
  const out = newOut();
  if (n.args.length === 2) {
    const mol = numArg(n.args[0]);
    const L = numArg(n.args[1]);
    if (!(L > 0)) throw new MathError('the volume must be positive');
    out.work.push('M = moles / liters');
    return numOut(out, mol / L, 'molarity (mol/L)');
  }
  const g = numArg(n.args[0]);
  const f = chemArgText(n.args[1], 'molarity(5.85, NaCl, 0.5)');
  const L = numArg(n.args[2]);
  if (!(L > 0)) throw new MathError('the volume must be positive');
  const M = molarMassOf(f);
  out.work.push('moles = ' + g + ' g / ' + molText(qFromFloat(M)) + ' g/mol = ' + fmtNum(g / M) + ' mol;  M = moles / liters');
  return numOut(out, g / M / L, 'molarity of ' + f + ' (mol/L)');
});
COMMANDS.molarity.show = (n) => 'molarity ' + n.args.map((a, i) => (n.args.length === 3 && i === 1 ? CHEM_ARGS[Number(intArg(a))] : showRaw(a))).join(', ');
const qFromFloat = (x) => new Q(BigInt(Math.round(x * 1e6)), 1000000n);
const GAS_R = 0.082057366;
defCmd('idealgas gaslaw', (n) => {
  needArgs(n, 4, 4, 'P (atm), V (L), n (mol), T (K) with the unknown written as x, e.g. idealgas(x, 22.4, 1, 273.15)');
  const k = unknownIndex(n.args);
  if (k < 0) throw new MathError('write the unknown as x, e.g. idealgas(x, 22.4, 1, 273.15)');
  const [P, V, nn, T] = n.args.map((a, i) => (i === k ? NaN : numArg(a)));
  const res = [(nn * GAS_R * T) / V, (nn * GAS_R * T) / P, (P * V) / (GAS_R * T), (P * V) / (nn * GAS_R)][k];
  const names = ['P (atm)', 'V (L)', 'n (mol)', 'T (K)'];
  const out = newOut();
  out.work.push('PV = nRT with R = 0.082057366 L·atm/(mol·K); P in atm, V in liters, n in moles, T in kelvin');
  return numOut(out, res, names[k]);
});
defCmd('combinedgas', (n) => {
  needArgs(n, 6, 6, 'P1, V1, T1, P2, V2, T2 with the unknown written as x, e.g. combinedgas(1, 2, 300, x, 1, 350)');
  const k = unknownIndex(n.args);
  if (k < 0) throw new MathError('write the unknown as x');
  const v = n.args.map((a, i) => (i === k ? NaN : numArg(a)));
  const [P1, V1, T1, P2, V2, T2] = v;
  const res = [
    (P2 * V2 * T1) / (T2 * V1),
    (P2 * V2 * T1) / (T2 * P1),
    (P1 * V1 * T2) / (P2 * V2),
    (P1 * V1 * T2) / (T1 * V2),
    (P1 * V1 * T2) / (T1 * P2),
    (P2 * V2 * T1) / (P1 * V1),
  ][k];
  const names = ['P1', 'V1', 'T1 (K)', 'P2', 'V2', 'T2 (K)'];
  const out = newOut();
  out.work.push('P1·V1/T1 = P2·V2/T2 (temperatures in kelvin)');
  return numOut(out, res, names[k]);
});
const fractionArg = (node) => {
  const v = numArg(node);
  return node.t === 'pct' ? v : v > 1 ? v / 100 : v;
};
defCmd('halflife', (n) => {
  needArgs(n, 2, 3, 'the half-life, the elapsed time and optionally the starting amount, e.g. halflife(5730, 10000, 100)');
  const th = numArg(n.args[0]);
  const t = numArg(n.args[1]);
  if (!(th > 0) || t < 0) throw new MathError('the half-life must be positive and the time not negative');
  const f = Math.pow(2, -t / th);
  const out = newOut();
  out.answer.push('fraction remaining = ' + fmtNum(f) + ' (' + fmtNum(f * 100) + ' %) after ' + fmtNum(t / th) + ' half-lives');
  if (n.args[2]) {
    const n0 = numArg(n.args[2]);
    out.answer.push('amount remaining = ' + fmtNum(n0 * f) + ' (of ' + fmtNum(n0) + ')');
    out.value = { num: n0 * f };
  } else out.value = { num: f };
  out.work.push('N = N₀·(1/2)^(t/t½);  decay constant λ = ln 2 / t½ = ' + fmtNum(Math.LN2 / th) + ',  mean life 1/λ = ' + fmtNum(th / Math.LN2));
  return out;
});
defCmd('decaytime', (n) => {
  needArgs(n, 2, 2, 'the half-life and the fraction remaining, e.g. decaytime(5730, 0.25)');
  const th = numArg(n.args[0]);
  const f = fractionArg(n.args[1]);
  if (!(th > 0) || !(f > 0) || f >= 1) throw new MathError('the half-life must be positive and the fraction remaining between 0 and 1');
  const out = newOut();
  out.work.push('t = t½ · log₂(1/fraction) = ' + fmtNum(th) + ' · ' + fmtNum(Math.log2(1 / f)));
  return numOut(out, th * Math.log2(1 / f), 'time');
});

// ======================================================================
// Finance
// ======================================================================
const fmtMoney = (x) => (x < 0 ? '-' : '') + Math.abs(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const finRate = (node) => rateOf(node).toNumber();
function finTable(rows, head) {
  const cells = [head].concat(rows);
  const w = head.map((_, j) => Math.max(...cells.map((r) => String(r[j]).length)));
  return cells.map((r) => r.map((c, j) => String(c).padStart(w[j])).join('  '));
}
function loanParams(n, who) {
  const P = numArg(n.args[0]);
  const rate = finRate(n.args[1]);
  const years = numArg(n.args[2]);
  const m = n.args[3] ? numArg(n.args[3]) : 12;
  if (!(P > 0) || !(years > 0) || !(m >= 1)) throw new MathError(who + ': the amount, the years and the payments per year must be positive');
  const N = Math.round(years * m);
  if (N < 1 || N > 1200) throw new MathError('the number of payments must be between 1 and 1200');
  const r = rate / m;
  const pay = r === 0 ? P / N : (P * r) / (1 - Math.pow(1 + r, -N));
  return { P, rate, m, N, r, pay };
}
defCmd('amortization amortize schedule', (n) => {
  needArgs(n, 3, 5, 'amount, annual rate, years, optional payments per year and rows shown, e.g. amortization(200000, 6%, 30)');
  const { P, rate, m, N, r, pay } = loanParams(n, 'amortization');
  const show = Math.min(N, n.args[4] ? Math.max(1, Math.round(numArg(n.args[4]))) : 6);
  let bal = P;
  const rows = [];
  let totalInt = 0;
  for (let k = 1; k <= N; k++) {
    const intr = bal * r;
    const prin = pay - intr;
    bal -= prin;
    totalInt += intr;
    if (k <= show) rows.push([k, fmtMoney(pay), fmtMoney(intr), fmtMoney(prin), fmtMoney(Math.abs(bal) < 1e-7 ? 0 : bal)]);
  }
  const out = newOut();
  out.answer.push('payment = ' + fmtMoney(pay) + ' per period (' + N + ' payments), total interest = ' + fmtMoney(totalInt) + ', total paid = ' + fmtMoney(pay * N));
  finTable(rows, ['#', 'payment', 'interest', 'principal', 'balance']).forEach((l) => out.work.push(l));
  out.work.push('payment = P·r/(1 − (1 + r)^−N) with r = ' + fmtNum(rate) + '/' + m + ' per period; interest = balance × r; principal = payment − interest');
  out.value = { num: pay };
  return out;
});
defCmd('loanbalance remainingbalance', (n) => {
  needArgs(n, 4, 5, 'amount, annual rate, years, number of payments made and optionally payments per year');
  const k = numArg(n.args[3]);
  const { P, m, N, r, pay } = loanParams({ args: [n.args[0], n.args[1], n.args[2], n.args[4]] }, 'loanbalance');
  if (k < 0 || k > N) throw new MathError('the number of payments made must be between 0 and ' + N);
  const bal = r === 0 ? P - pay * k : P * Math.pow(1 + r, k) - (pay * (Math.pow(1 + r, k) - 1)) / r;
  const out = newOut();
  out.work.push('payment = ' + fmtMoney(pay) + ';  balance after k payments = P(1+r)^k − pay·((1+r)^k − 1)/r;  interest paid so far = ' + fmtMoney(pay * k - (P - bal)));
  out.value = { num: bal };
  void m;
  out.answer.push('balance after ' + k + ' payments = ' + fmtMoney(Math.abs(bal) < 1e-7 ? 0 : bal));
  return out;
});
defCmd('payoff', (n) => {
  needArgs(n, 3, 4, 'amount, annual rate, payment per period and optionally payments per year, e.g. payoff(10000, 8%, 300)');
  const P = numArg(n.args[0]);
  const rate = finRate(n.args[1]);
  const pay = numArg(n.args[2]);
  const m = n.args[3] ? numArg(n.args[3]) : 12;
  const r = rate / m;
  if (!(P > 0) || !(pay > 0)) throw new MathError('the amount and the payment must be positive');
  if (!(m >= 1) || !isFinite(r) || r <= -1) throw new MathError('the rate and the number of payments per year must be sensible (at least 1 payment a year)');
  const out = newOut();
  if (r * P >= pay) {
    out.answer.push('the payment ' + fmtMoney(pay) + ' does not even cover the interest ' + fmtMoney(r * P) + ' per period, so the loan is never paid off');
    return out;
  }
  const N = r === 0 ? P / pay : -Math.log(1 - (r * P) / pay) / Math.log(1 + r);
  out.answer.push('number of payments = ' + fmtNum(N) + ' (about ' + Math.ceil(N - 1e-9) + ' payments, ' + fmtNum(N / m) + ' years)');
  out.work.push('N = −ln(1 − r·P/pay) / ln(1 + r) with r = ' + fmtNum(r) + ' per period');
  out.value = { num: N };
  return out;
});
defCmd('bond bondprice', (n) => {
  needArgs(n, 4, 5, 'face value, annual coupon rate, annual yield, years and optional payments per year, e.g. bond(1000, 5%, 6%, 10, 2)');
  const F = numArg(n.args[0]);
  const cr = finRate(n.args[1]);
  const y = finRate(n.args[2]);
  const years = numArg(n.args[3]);
  const f = n.args[4] ? numArg(n.args[4]) : 2;
  const N = Math.round(years * f);
  if (!(F > 0) || N < 1 || N > 2400 || !(f >= 1)) throw new MathError('check the face value, the years and the payments per year');
  const c = (F * cr) / f;
  const i = y / f;
  let price = 0;
  let wsum = 0;
  let convex = 0;
  for (let t = 1; t <= N; t++) {
    const cf = c + (t === N ? F : 0);
    const pv = cf / Math.pow(1 + i, t);
    price += pv;
    wsum += (t / f) * pv;
    convex += (t * (t + 1) * pv) / Math.pow(1 + i, 2) / (f * f);
  }
  const out = newOut();
  out.answer.push('price = ' + fmtMoney(price) + ' (' + (Math.abs(price - F) < 0.005 ? 'at par' : price > F ? 'at a premium: coupon rate above the yield' : 'at a discount: coupon rate below the yield') + ')');
  const mac = wsum / price;
  out.answer.push('Macaulay duration = ' + fmtNum(mac) + ' years');
  out.answer.push('modified duration = ' + fmtNum(mac / (1 + i)) + ',  convexity = ' + fmtNum(convex / price));
  out.answer.push('current yield = ' + fmtNum(((F * cr) / price) * 100) + ' %');
  out.work.push('price = Σ coupon/(1 + y/f)^t + face/(1 + y/f)^N with ' + N + ' periods, coupon ' + fmtMoney(c) + ' per period, periodic yield ' + fmtNum(i));
  out.value = { num: price };
  return out;
});
function depTable(out, rows, dep, cost, salvage) {
  finTable(rows, ['year', 'depreciation', 'accumulated', 'book value']).forEach((l) => out.work.push(l));
  out.answer.push('depreciable amount ' + fmtMoney(cost - salvage) + ';  ' + dep);
}
defCmd('straightline', (n) => {
  needArgs(n, 3, 3, 'cost, salvage value and life in years, e.g. straightline(10000, 1000, 5)');
  const cost = numArg(n.args[0]);
  const salvage = numArg(n.args[1]);
  const life = Math.round(numArg(n.args[2]));
  if (!(cost > 0) || salvage < 0 || salvage >= cost || life < 1 || life > 100) throw new MathError('check the cost, the salvage value (below the cost) and the life (1–100 years)');
  const d = (cost - salvage) / life;
  const rows = [];
  for (let y = 1; y <= life; y++) rows.push([y, fmtMoney(d), fmtMoney(d * y), fmtMoney(cost - d * y)]);
  const out = newOut();
  depTable(out, rows, 'straight-line depreciation = ' + fmtMoney(d) + ' per year', cost, salvage);
  out.value = { num: d };
  return out;
});
defCmd('decliningbalance doubledeclining ddb', (n) => {
  needArgs(n, 3, 4, 'cost, salvage value, life in years and optionally the factor (2 = double declining), e.g. decliningbalance(10000, 1000, 5)');
  const cost = numArg(n.args[0]);
  const salvage = numArg(n.args[1]);
  const life = Math.round(numArg(n.args[2]));
  const factor = n.args[3] ? numArg(n.args[3]) : 2;
  if (!(cost > 0) || salvage < 0 || salvage >= cost || life < 1 || life > 100 || !(factor > 0)) throw new MathError('check the cost, the salvage value (below the cost), the life (1–100 years) and the factor');
  let book = cost;
  const rows = [];
  let acc = 0;
  for (let y = 1; y <= life; y++) {
    const d = Math.max(0, Math.min((book * factor) / life, book - salvage));
    acc += d;
    book -= d;
    rows.push([y, fmtMoney(d), fmtMoney(acc), fmtMoney(book)]);
  }
  const out = newOut();
  depTable(out, rows, 'first-year depreciation = ' + fmtMoney(Number(rows[0][1].replace(/,/g, ''))) + ' (rate ' + fmtNum((factor / life) * 100) + ' % of the book value; never below the salvage value)', cost, salvage);
  out.value = { num: Number(rows[0][1].replace(/,/g, '')) };
  return out;
});
defCmd('sumofyears syd', (n) => {
  needArgs(n, 3, 3, 'cost, salvage value and life in years, e.g. sumofyears(10000, 1000, 5)');
  const cost = numArg(n.args[0]);
  const salvage = numArg(n.args[1]);
  const life = Math.round(numArg(n.args[2]));
  if (!(cost > 0) || salvage < 0 || salvage >= cost || life < 1 || life > 100) throw new MathError('check the cost, the salvage value (below the cost) and the life (1–100 years)');
  const sum = (life * (life + 1)) / 2;
  const rows = [];
  let acc = 0;
  for (let y = 1; y <= life; y++) {
    const d = ((cost - salvage) * (life - y + 1)) / sum;
    acc += d;
    rows.push([y, fmtMoney(d), fmtMoney(acc), fmtMoney(cost - acc)]);
  }
  const out = newOut();
  depTable(out, rows, 'sum-of-the-years-digits: year k gets (life − k + 1)/' + sum + ' of the depreciable amount', cost, salvage);
  out.value = { num: ((cost - salvage) * life) / sum };
  return out;
});
defCmd('cagr', (n) => {
  needArgs(n, 3, 3, 'the starting value, the ending value and the years, e.g. cagr(1000, 1800, 5)');
  const a = numArg(n.args[0]);
  const b = numArg(n.args[1]);
  const t = numArg(n.args[2]);
  if (!(a > 0) || !(b > 0) || !(t > 0)) throw new MathError('the values and the years must be positive');
  const g = Math.pow(b / a, 1 / t) - 1;
  const out = newOut();
  out.work.push('CAGR = (end/start)^(1/years) − 1 = (' + fmtNum(b) + '/' + fmtNum(a) + ')^(1/' + fmtNum(t) + ') − 1');
  return numOut(out, g * 100, 'compound annual growth rate (%)');
});
defCmd('rule72 ruleof72', (n) => {
  needArgs(n, 1, 1, 'an annual rate in percent, e.g. rule72(6)');
  const r = finRate(n.args[0]);
  if (!(r > 0)) throw new MathError('the rate must be positive');
  const out = newOut();
  out.answer.push('about ' + fmtNum(72 / (r * 100)) + ' years to double (rule of 72); exactly ln 2 / ln(1 + r) = ' + fmtNum(Math.log(2) / Math.log(1 + r)) + ' years');
  out.value = { num: Math.log(2) / Math.log(1 + r) };
  return out;
});
defCmd('realrate fisher', (n) => {
  needArgs(n, 2, 2, 'the nominal rate and the inflation rate, e.g. realrate(5%, 2%)');
  const nom = finRate(n.args[0]);
  const inf = finRate(n.args[1]);
  const real = (1 + nom) / (1 + inf) - 1;
  const out = newOut();
  out.work.push('Fisher equation: 1 + real = (1 + nominal)/(1 + inflation);  the approximation nominal − inflation = ' + fmtNum((nom - inf) * 100) + ' %');
  return numOut(out, real * 100, 'real rate (%)');
});
defCmd('mirr', (n) => {
  needArgs(n, 3, 3, 'the cash flows in a list, the finance rate and the reinvestment rate, e.g. mirr([-1000, 300, 400, 500], 10%, 12%)');
  const cf = listArg(n.args[0], 'mirr').map((q) => q.toNumber());
  const fr = finRate(n.args[1]);
  const rr = finRate(n.args[2]);
  const N = cf.length;
  if (N < 2) throw new MathError('give at least two cash flows');
  let pvNeg = 0;
  let fvPos = 0;
  cf.forEach((c, t) => {
    if (c < 0) pvNeg += c / Math.pow(1 + fr, t);
    else fvPos += c * Math.pow(1 + rr, N - 1 - t);
  });
  if (pvNeg === 0 || fvPos === 0) throw new MathError('the cash flows need at least one outflow (negative) and one inflow (positive)');
  const m = Math.pow(fvPos / -pvNeg, 1 / (N - 1)) - 1;
  const out = newOut();
  out.work.push('MIRR = (FV of inflows at the reinvestment rate / PV of outflows at the finance rate)^(1/(n−1)) − 1 = (' + fmtNum(fvPos) + ' / ' + fmtNum(-pvNeg) + ')^(1/' + (N - 1) + ') − 1');
  return numOut(out, m * 100, 'modified IRR (%)');
});
defCmd('payback paybackperiod', (n) => {
  needArgs(n, 1, 2, 'the cash flows in a list and optionally a discount rate, e.g. payback([-1000, 300, 400, 500])');
  const cf = listArg(n.args[0], 'payback').map((q) => q.toNumber());
  const rate = n.args[1] ? finRate(n.args[1]) : 0;
  let cum = 0;
  let res = null;
  const out = newOut();
  const flows = cf.map((c, t) => c / Math.pow(1 + rate, t));
  for (let t = 0; t < flows.length; t++) {
    const prev = cum;
    cum += flows[t];
    if (t > 0 && prev < 0 && cum >= 0) {
      res = t - 1 + -prev / flows[t];
      break;
    }
  }
  out.work.push((rate ? 'discounted ' : '') + 'cumulative cash flow: ' + flows.map((_, t) => fmtNum(flows.slice(0, t + 1).reduce((s, v) => s + v, 0))).join(', '));
  if (res === null) {
    out.answer.push('the investment is not paid back within ' + (cf.length - 1) + ' periods');
    return out;
  }
  out.answer.push((rate ? 'discounted payback' : 'payback') + ' period = ' + fmtNum(res) + ' periods');
  out.value = { num: res };
  return out;
});
defCmd('breakeven', (n) => {
  needArgs(n, 3, 3, 'fixed costs, price per unit and variable cost per unit, e.g. breakeven(5000, 25, 15)');
  const fc = numArg(n.args[0]);
  const p = numArg(n.args[1]);
  const v = numArg(n.args[2]);
  if (!(p > v)) throw new MathError('the price must be larger than the variable cost per unit');
  const units = fc / (p - v);
  const out = newOut();
  out.answer.push('break-even quantity = ' + fmtNum(units) + ' units (' + Math.ceil(units - 1e-9) + ' whole units), revenue ' + fmtMoney(units * p));
  out.work.push('contribution margin per unit = ' + fmtMoney(p - v) + ';  units = fixed costs / contribution margin');
  out.value = { num: units };
  return out;
});

// ---- text pre-pass: chemistry commands written in words or with formula arguments -------------------------------------------------
function convertChem2(s) {
  if (!/[A-Za-z]/.test(s)) return s;
  const enc = (name, inner) => name + '(' + chemIndex(inner.trim()) + ')';
  s = replaceCalls(s, ['empirical', 'empiricalformula'], (name, inner) => (/[A-Z]/.test(inner) && /\d/.test(inner) ? enc(name, inner) : null));
  s = replaceCalls(s, ['limiting', 'limitingreagent', 'stoich', 'stoichiometry'], (name, inner) => (/->|=>|→|⟶|⇌/.test(inner) ? enc(name, inner) : null));
  s = replaceCalls(s, ['electronconfig', 'electronconfiguration', 'econfig', 'element', 'elementinfo', 'periodic'], (name, inner) => (/^\s*[A-Za-z]+[A-Za-z0-9^+\-−()\s]*$/.test(inner) || /^\s*\d{1,3}\s*$/.test(inner) ? enc(name, inner) : null));
  s = replaceCalls(s, ['molecular', 'molecularformula'], (name, inner) => {
    const k = inner.indexOf(',');
    if (k < 0 || !/^\s*[A-Z][A-Za-z0-9()\[\]]*\s*$/.test(inner.slice(0, k))) return null;
    return name + '(' + chemIndex(inner.slice(0, k).trim()) + ',' + inner.slice(k + 1) + ')';
  });
  s = replaceCalls(s, ['molarity'], (name, inner) => {
    const parts = inner.split(',');
    if (parts.length !== 3 || !/^\s*[A-Z][A-Za-z0-9()\[\]·.*]*\s*$/.test(parts[1])) return null;
    return name + '(' + parts[0] + ',' + chemIndex(parts[1].trim()) + ',' + parts[2] + ')';
  });
  // words
  s = s.replace(/\belectron\s+configuration\s+(?:of|for)\s+([A-Za-z][A-Za-z0-9^+\-−()]*)/gi, (m, el) => 'electronconfig(' + chemIndex(el) + ')');
  s = s.replace(/\bempirical\s+formula\s+(?:of|for|from)?\s*:?\s*([A-Za-z0-9.%,;\s]+?)\s*$/i, (m, spec) => (/[A-Z]/.test(spec) && /\d/.test(spec) ? 'empirical(' + chemIndex(spec) + ')' : m));
  return s;
}
