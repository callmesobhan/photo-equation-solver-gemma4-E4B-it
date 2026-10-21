// ======================================================================
// 13b. Applied maths: unit conversion, finance, chemistry, physics, misc.
// ======================================================================

// ---- units ----------------------------------------------------------------------------------------------------------------------
// Each unit is a factor to the SI base unit (an exact expression) and a dimension vector
// [length, mass, time, temperature, data, angle].
const UNIT_TABLE = {};
const UNIT_LOWER = {};
function qNum(str) {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(str.trim());
  if (m) {
    let q = new Q(BigInt(m[2] + (m[3] || '')), 10n ** BigInt((m[3] || '').length));
    if (m[4]) q = Number(m[4]) >= 0 ? q.mul(new Q(10n ** BigInt(m[4]))) : q.div(new Q(10n ** BigInt(-Number(m[4]))));
    return m[1] ? q.neg() : q;
  }
  const f = /^(\d+)\/(\d+)$/.exec(str.trim());
  if (f) return new Q(BigInt(f[1]), BigInt(f[2]));
  throw new Error('bad unit factor ' + str);
}
function defUnits(names, factor, dims) {
  const f = typeof factor === 'string' ? sN(qNum(factor)) : factor;
  const d = [0, 0, 0, 0, 0, 0];
  Object.keys(dims || {}).forEach((k) => { d['LMTKBA'.indexOf(k)] = dims[k]; });
  names.split(' ').forEach((nm, i) => {
    UNIT_TABLE[nm] = { f, d };
    if (!UNIT_LOWER[nm.toLowerCase()]) UNIT_LOWER[nm.toLowerCase()] = nm;
  });
}
const PI_OVER = (k) => sDiv(S_PI, sI(k));
// length
defUnits('m meter meters metre metres', '1', { L: 1 });
defUnits('km kilometer kilometers kilometre kilometres', '1000', { L: 1 });
defUnits('cm centimeter centimeters centimetre centimetres', '1/100', { L: 1 });
defUnits('mm millimeter millimeters millimetre millimetres', '1/1000', { L: 1 });
defUnits('um µm micrometer micrometers micron microns', '1e-6', { L: 1 });
defUnits('nm nanometer nanometers', '1e-9', { L: 1 });
defUnits('mi mile miles', '1609.344', { L: 1 });
defUnits('yd yard yards', '0.9144', { L: 1 });
defUnits('ft foot feet', '0.3048', { L: 1 });
defUnits('in inch inches', '0.0254', { L: 1 });
defUnits('nmi nauticalmile nauticalmiles', '1852', { L: 1 });
defUnits('au', '149597870700', { L: 1 });
defUnits('ly lightyear lightyears', '9460730472580800', { L: 1 });
// mass
defUnits('kg kilogram kilograms', '1', { M: 1 });
defUnits('g gram grams', '1/1000', { M: 1 });
defUnits('mg milligram milligrams', '1e-6', { M: 1 });
defUnits('ug µg microgram micrograms', '1e-9', { M: 1 });
defUnits('tonne tonnes metricton', '1000', { M: 1 });
defUnits('lb lbs pound pounds', '0.45359237', { M: 1 });
defUnits('oz ounce ounces', '0.028349523125', { M: 1 });
defUnits('st stone', '6.35029318', { M: 1 });
defUnits('ton tons shortton', '907.18474', { M: 1 });
// time
defUnits('s sec secs second seconds', '1', { T: 1 });
defUnits('ms millisecond milliseconds', '1/1000', { T: 1 });
defUnits('us µs microsecond microseconds', '1e-6', { T: 1 });
defUnits('ns nanosecond nanoseconds', '1e-9', { T: 1 });
defUnits('min mins minute minutes', '60', { T: 1 });
defUnits('h hr hrs hour hours', '3600', { T: 1 });
defUnits('d day days', '86400', { T: 1 });
defUnits('wk week weeks', '604800', { T: 1 });
defUnits('yr year years', '31557600', { T: 1 });
// area and volume
defUnits('ha hectare hectares', '10000', { L: 2 });
defUnits('acre acres', '4046.8564224', { L: 2 });
defUnits('sqft', '0.09290304', { L: 2 });
defUnits('sqm', '1', { L: 2 });
defUnits('sqkm', '1000000', { L: 2 });
defUnits('sqmi', '2589988.110336', { L: 2 });
defUnits('l L liter liters litre litres', '1/1000', { L: 3 });
defUnits('ml mL milliliter milliliters millilitre millilitres cc', '1e-6', { L: 3 });
defUnits('cl cL centiliter', '1e-5', { L: 3 });
defUnits('dl dL deciliter', '1e-4', { L: 3 });
defUnits('gal gallon gallons usgal', '0.003785411784', { L: 3 });
defUnits('ukgal impgal', '0.00454609', { L: 3 });
defUnits('qt quart quarts', '0.000946352946', { L: 3 });
defUnits('pt pint pints', '0.000473176473', { L: 3 });
defUnits('cup cups', '0.0002365882365', { L: 3 });
defUnits('floz', '2.95735295625e-5', { L: 3 });
defUnits('tbsp tablespoon tablespoons', '1.47867647813e-5', { L: 3 });
defUnits('tsp teaspoon teaspoons', '4.92892159375e-6', { L: 3 });
// speed
defUnits('mph', '0.44704', { L: 1, T: -1 });
defUnits('kph kmh', '5/18', { L: 1, T: -1 });
defUnits('kn kt knot knots', '1852/3600', { L: 1, T: -1 });
defUnits('fps', '0.3048', { L: 1, T: -1 });
// force, pressure, energy, power, frequency
defUnits('N newton newtons', '1', { M: 1, L: 1, T: -2 });
defUnits('kN kilonewton', '1000', { M: 1, L: 1, T: -2 });
defUnits('lbf', '4.4482216152605', { M: 1, L: 1, T: -2 });
defUnits('kgf', '9.80665', { M: 1, L: 1, T: -2 });
defUnits('dyn dyne', '1e-5', { M: 1, L: 1, T: -2 });
defUnits('Pa pascal pascals', '1', { M: 1, L: -1, T: -2 });
defUnits('kPa kilopascal', '1000', { M: 1, L: -1, T: -2 });
defUnits('MPa megapascal', '1e6', { M: 1, L: -1, T: -2 });
defUnits('bar', '1e5', { M: 1, L: -1, T: -2 });
defUnits('atm', '101325', { M: 1, L: -1, T: -2 });
defUnits('psi', '6894.757293168', { M: 1, L: -1, T: -2 });
defUnits('mmHg', '133.322387415', { M: 1, L: -1, T: -2 });
defUnits('torr', '101325/760', { M: 1, L: -1, T: -2 });
defUnits('J joule joules', '1', { M: 1, L: 2, T: -2 });
defUnits('kJ kilojoule kilojoules', '1000', { M: 1, L: 2, T: -2 });
defUnits('MJ megajoule', '1e6', { M: 1, L: 2, T: -2 });
defUnits('cal calorie calories', '4.184', { M: 1, L: 2, T: -2 });
defUnits('kcal Cal kilocalorie kilocalories', '4184', { M: 1, L: 2, T: -2 });
defUnits('Wh', '3600', { M: 1, L: 2, T: -2 });
defUnits('kWh', '3.6e6', { M: 1, L: 2, T: -2 });
defUnits('eV electronvolt', '1.602176634e-19', { M: 1, L: 2, T: -2 });
defUnits('BTU btu', '1055.05585262', { M: 1, L: 2, T: -2 });
defUnits('erg', '1e-7', { M: 1, L: 2, T: -2 });
defUnits('W watt watts', '1', { M: 1, L: 2, T: -3 });
defUnits('kW kilowatt kilowatts', '1000', { M: 1, L: 2, T: -3 });
defUnits('MW megawatt', '1e6', { M: 1, L: 2, T: -3 });
defUnits('hp horsepower', '745.69987158227022', { M: 1, L: 2, T: -3 });
defUnits('Hz hertz', '1', { T: -1 });
defUnits('kHz', '1000', { T: -1 });
defUnits('MHz', '1e6', { T: -1 });
defUnits('GHz', '1e9', { T: -1 });
defUnits('rpm', '1/60', { T: -1 });
// data
defUnits('bit bits', '1', { B: 1 });
defUnits('B byte bytes', '8', { B: 1 });
defUnits('kB KB kilobyte kilobytes', '8000', { B: 1 });
defUnits('MB megabyte megabytes', '8e6', { B: 1 });
defUnits('GB gigabyte gigabytes', '8e9', { B: 1 });
defUnits('TB terabyte terabytes', '8e12', { B: 1 });
defUnits('KiB kibibyte', '8192', { B: 1 });
defUnits('MiB mebibyte', '8388608', { B: 1 });
defUnits('GiB gibibyte', '8589934592', { B: 1 });
defUnits('TiB tebibyte', '8796093022208', { B: 1 });
defUnits('kb kbit kilobit kilobits', '1000', { B: 1 });
defUnits('Mb Mbit megabit megabits', '1e6', { B: 1 });
defUnits('Gb Gbit gigabit gigabits', '1e9', { B: 1 });
// angle
defUnits('rad radian radians', '1', { A: 1 });
defUnits('deg degree degrees', PI_OVER(180), { A: 1 });
defUnits('grad gradian gradians', PI_OVER(200), { A: 1 });
defUnits('turn turns revolution revolutions rev', sMul([sI(2), S_PI]), { A: 1 });
defUnits('arcmin', sDiv(S_PI, sI(10800)), { A: 1 });
defUnits('arcsec', sDiv(S_PI, sI(648000)), { A: 1 });
const TEMP_UNITS = { c: 'C', celsius: 'C', degc: 'C', f: 'F', fahrenheit: 'F', degf: 'F', k: 'K', kelvin: 'K', r: 'R', rankine: 'R' };

function lookupUnit(name) {
  let key0 = name;
  if (UNIT_TABLE[key0]) return UNIT_TABLE[key0];
  if (UNIT_LOWER[key0.toLowerCase()]) return UNIT_TABLE[UNIT_LOWER[key0.toLowerCase()]];
  if (/s$/i.test(key0)) {
    const sg = key0.slice(0, -1);
    if (UNIT_TABLE[sg]) return UNIT_TABLE[sg];
    if (UNIT_LOWER[sg.toLowerCase()]) return UNIT_TABLE[UNIT_LOWER[sg.toLowerCase()]];
  }
  return null;
}
/** "km/h", "m/s^2", "ft2", "kg*m/s^2" -> {f, d}; null when a word is not a unit. */
function parseUnit(str) {
  const text = str.replace(/²/g, '^2').replace(/³/g, '^3').replace(/[·.]/g, '*').replace(/\s+/g, '').replace(/per/g, '/');
  if (!text) return null;
  const parts = text.split(/([*/])/);
  let f = S1;
  const d = [0, 0, 0, 0, 0, 0];
  let op = '*';
  for (const part of parts) {
    if (part === '*' || part === '/') {
      op = part;
      continue;
    }
    const m = /^([^\d^]+?)(?:\^?(-?\d+))?$/.exec(part);
    if (!m) return null;
    const u = lookupUnit(m[1]);
    if (!u) return null;
    const e = m[2] ? Number(m[2]) : 1;
    const sign = op === '/' ? -1 : 1;
    f = sMul([f, sPow(u.f, sI(sign * e))]);
    for (let k = 0; k < 6; k++) d[k] += sign * e * u.d[k];
  }
  return { f: simp(f), d };
}
const DIM_NAMES = ['length', 'mass', 'time', 'temperature', 'data', 'angle'];
const sameDims = (a, b) => a.every((v, k) => v === b[k]);
function dimsName(d) {
  const named = {
    '1,0,0,0,0,0': 'length', '2,0,0,0,0,0': 'area', '3,0,0,0,0,0': 'volume', '0,1,0,0,0,0': 'mass', '0,0,1,0,0,0': 'time', '0,0,0,0,1,0': 'data', '0,0,0,0,0,1': 'angle',
    '1,0,-1,0,0,0': 'speed', '1,1,-2,0,0,0': 'force', '-1,1,-2,0,0,0': 'pressure', '2,1,-2,0,0,0': 'energy', '2,1,-3,0,0,0': 'power', '0,0,-1,0,0,0': 'frequency',
  };
  return named[d.join(',')] || 'a different kind of quantity';
}
function tempKind(name) {
  return TEMP_UNITS[name.replace(/^°|^deg/i, '').toLowerCase()] || (/^°?[CFK]$/.test(name) ? name.replace('°', '') : null);
}
const UNIT_ARGS = [];
const unitIndex = (s) => {
  let k = UNIT_ARGS.indexOf(s);
  if (k < 0) {
    UNIT_ARGS.push(s);
    k = UNIT_ARGS.length - 1;
  }
  return k;
};
function convertTemperature(q, from, to) {
  const toK = { C: (x) => x.add(qNum('273.15')), K: (x) => x, F: (x) => x.add(qNum('459.67')).mul(new Q(5n, 9n)), R: (x) => x.mul(new Q(5n, 9n)) };
  const fromK = { C: (x) => x.sub(qNum('273.15')), K: (x) => x, F: (x) => x.mul(new Q(9n, 5n)).sub(qNum('459.67')), R: (x) => x.mul(new Q(9n, 5n)) };
  return fromK[to](toK[from](q));
}
function trimDecimal(x) {
  return fmtNum(x);
}
defCmd('convert', (n) => {
  needArgs(n, 3, 3, 'a value and two units');
  const fromName = UNIT_ARGS[Number(intArg(n.args[1]))];
  const toName = UNIT_ARGS[Number(intArg(n.args[2]))];
  if (fromName === undefined || toName === undefined) throw new MathError('write the conversion as, for example, convert 5 km to miles');
  const S = fromAst(n.args[0]);
  if (varsOfS(S).size) throw new MathError('a number is needed in front of the unit');
  const out = newOut();
  const tf = tempKind(fromName);
  const tt = tempKind(toName);
  if (tf && tt) {
    if (S.k !== 'n') throw new MathError('temperatures must be plain numbers');
    const r = convertTemperature(S.q, tf, tt);
    out.answer.push(S.q.toString() + ' °' + tf + ' = ' + qText(r) + ' °' + tt);
    out.work.push('Temperature scales differ by an offset as well as a factor');
    out.value = { q: r };
    return out;
  }
  const a = parseUnit(fromName);
  const b = parseUnit(toName);
  if (!a) throw new MathError('I do not know the unit "' + fromName + '"');
  if (!b) throw new MathError('I do not know the unit "' + toName + '"');
  if (!sameDims(a.d, b.d)) throw new MathError('cannot convert ' + dimsName(a.d) + ' (' + fromName + ') to ' + dimsName(b.d) + ' (' + toName + ')');
  const factor = simp(sDiv(a.f, b.f));
  const res = simp(sMul([S, factor]));
  const nice = (q) => (q.d <= 100n && babs(q.n) < 10n ** 12n ? qText(q) : fmtNum(q.toNumber()));
  const shown = res.k === 'n' ? nice(res.q) : symText(res);
  out.answer.push(showRaw(n.args[0]) + ' ' + fromName + ' = ' + shown + ' ' + toName);
  out.work.push('1 ' + fromName + ' = ' + (factor.k === 'n' ? (factor.q.d <= 1000n && babs(factor.q.n) < 10n ** 9n ? factor.q.toString() : fmtNum(factor.q.toNumber())) : trimDecimal(numS(factor, {}))) + ' ' + toName);
  out.value = { S: res };
  return out;
});
COMMANDS.convert.show = (n) => {
  const f = UNIT_ARGS[Number(intArg(n.args[1]))];
  const t = UNIT_ARGS[Number(intArg(n.args[2]))];
  return showRaw(n.args[0]) + ' ' + f + ' → ' + t;
};

// ---- chemistry --------------------------------------------------------------------------------------------------------------------
const ELEMENTS = 'H 1.008|He 4.0026|Li 6.94|Be 9.0122|B 10.81|C 12.011|N 14.007|O 15.999|F 18.998|Ne 20.180|Na 22.990|Mg 24.305|Al 26.982|Si 28.085|P 30.974|S 32.06|Cl 35.45|Ar 39.948|K 39.098|Ca 40.078|Sc 44.956|Ti 47.867|V 50.942|Cr 51.996|Mn 54.938|Fe 55.845|Co 58.933|Ni 58.693|Cu 63.546|Zn 65.38|Ga 69.723|Ge 72.630|As 74.922|Se 78.971|Br 79.904|Kr 83.798|Rb 85.468|Sr 87.62|Y 88.906|Zr 91.224|Nb 92.906|Mo 95.95|Tc 98|Ru 101.07|Rh 102.91|Pd 106.42|Ag 107.87|Cd 112.41|In 114.82|Sn 118.71|Sb 121.76|Te 127.60|I 126.90|Xe 131.29|Cs 132.91|Ba 137.33|La 138.91|Ce 140.12|Pr 140.91|Nd 144.24|Pm 145|Sm 150.36|Eu 151.96|Gd 157.25|Tb 158.93|Dy 162.50|Ho 164.93|Er 167.26|Tm 168.93|Yb 173.05|Lu 174.97|Hf 178.49|Ta 180.95|W 183.84|Re 186.21|Os 190.23|Ir 192.22|Pt 195.08|Au 196.97|Hg 200.59|Tl 204.38|Pb 207.2|Bi 208.98|Po 209|At 210|Rn 222|Fr 223|Ra 226|Ac 227|Th 232.04|Pa 231.04|U 238.03|Np 237|Pu 244|Am 243|Cm 247|Bk 247|Cf 251|Es 252|Fm 257|Md 258|No 259|Lr 266|Rf 267|Db 268|Sg 269|Bh 270|Hs 277|Mt 278|Ds 281|Rg 282|Cn 285|Nh 286|Fl 289|Mc 290|Lv 293|Ts 294|Og 294'.split('|');
const ATOM = {};
ELEMENTS.forEach((e, i) => {
  const [sym, mass] = e.split(' ');
  ATOM[sym] = { z: i + 1, m: qNum(mass) };
});
const CHEM_ARGS = [];
const chemIndex = (s) => {
  let k = CHEM_ARGS.indexOf(s);
  if (k < 0) {
    CHEM_ARGS.push(s);
    k = CHEM_ARGS.length - 1;
  }
  return k;
};
/** "Ca(OH)2", "CuSO4·5H2O", "Fe2(SO4)3" -> Map(element -> count). */
function parseFormula(str) {
  const text = str.replace(/\s+/g, '').replace(/\*/g, '·').replace(/\.(?=\d*[A-Z(])/g, '·');
  const chunks = text.split('·');
  const total = new Map();
  chunks.forEach((chunk) => {
    const lead = /^(\d+)(.*)$/.exec(chunk);
    const mult = lead ? Number(lead[1]) : 1;
    const body = lead ? lead[2] : chunk;
    let i = 0;
    const parseGroup = (close) => {
      const counts = new Map();
      while (i < body.length && body[i] !== close) {
        const c = body[i];
        let sub;
        if (c === '(' || c === '[') {
          i++;
          sub = parseGroup(c === '(' ? ')' : ']');
          if (i >= body.length) throw new MathError('unbalanced brackets in the formula ' + str);
          i++;
        } else if (/[A-Z]/.test(c)) {
          let sym = c;
          i++;
          while (i < body.length && /[a-z]/.test(body[i]) && ATOM[sym + body[i]]) { sym += body[i]; i++; }
          if (!ATOM[sym]) throw new MathError('unknown element "' + sym + '" in ' + str);
          sub = new Map([[sym, 1]]);
        } else throw new MathError('cannot read "' + c + '" in the formula ' + str);
        let num = '';
        while (i < body.length && /\d/.test(body[i])) { num += body[i]; i++; }
        const k = num ? Number(num) : 1;
        sub.forEach((v, e) => counts.set(e, (counts.get(e) || 0) + v * k));
      }
      return counts;
    };
    const g = parseGroup(null);
    g.forEach((v, e) => total.set(e, (total.get(e) || 0) + v * mult));
  });
  if (!total.size) throw new MathError('empty formula');
  return total;
}
function formulaArg(node) {
  const f = CHEM_ARGS[Number(intArg(node))];
  if (f === undefined) throw new MathError('write the formula directly, e.g. molarmass(H2O)');
  return f;
}
const molarOf = (cnt) => { let m = Q0; cnt.forEach((v, e) => { m = m.add(ATOM[e].m.mul(new Q(BigInt(v)))); }); return m; };
const molText = (q) => decimalText(q, 3);
defCmd('molarmass', (n) => {
  needArgs(n, 1, 1, 'a chemical formula such as H2O');
  const f = formulaArg(n.args[0]);
  const cnt = parseFormula(f);
  const M = molarOf(cnt);
  const out = newOut();
  out.answer.push('M(' + f + ') = ' + molText(M) + ' g/mol');
  out.work.push(Array.from(cnt).map(([e, v]) => e + ': ' + v + ' × ' + ATOM[e].m.toNumber() + ' = ' + molText(ATOM[e].m.mul(new Q(BigInt(v))))).join(',  '));
  out.value = { q: M };
  return out;
});
COMMANDS.molarmass.show = (n) => 'molar mass of ' + CHEM_ARGS[Number(intArg(n.args[0]))];
defCmd('percentcomp composition masspercent', (n) => {
  needArgs(n, 1, 1, 'a chemical formula such as C6H12O6');
  const f = formulaArg(n.args[0]);
  const cnt = parseFormula(f);
  const M = molarOf(cnt);
  const out = newOut();
  cnt.forEach((v, e) => out.answer.push(e + ': ' + fmtNum((ATOM[e].m.mul(new Q(BigInt(v))).div(M).toNumber()) * 100) + ' %'));
  out.work.push('Molar mass of ' + f + ' = ' + molText(M) + ' g/mol;  percent of an element = (its atoms × atomic mass) / molar mass');
  return out;
});
COMMANDS.percentcomp.show = (n) => 'percent composition of ' + CHEM_ARGS[Number(intArg(n.args[0]))];
defCmd('moles', (n) => {
  needArgs(n, 2, 2, 'grams and a formula');
  const g = constQ(n.args[0]);
  const f = formulaArg(n.args[1]);
  const M = molarOf(parseFormula(f));
  const res = g.div(M);
  const out = newOut();
  out.answer.push(g.toString() + ' g of ' + f + ' = ' + fmtNum(res.toNumber()) + ' mol');
  out.work.push('n = mass / molar mass = ' + g.toString() + ' / ' + molText(M) + ';  ' + fmtNum(res.toNumber() * 6.02214076e23) + ' particles (× 6.02214076×10²³ per mol)');
  out.value = { q: res };
  return out;
});
COMMANDS.moles.show = (n) => showRaw(n.args[0]) + ' g of ' + CHEM_ARGS[Number(intArg(n.args[1]))] + ' → moles';
defCmd('grams', (n) => {
  needArgs(n, 2, 2, 'moles and a formula');
  const mol = constQ(n.args[0]);
  const f = formulaArg(n.args[1]);
  const M = molarOf(parseFormula(f));
  const res = mol.mul(M);
  const out = newOut();
  out.answer.push(mol.toString() + ' mol of ' + f + ' = ' + fmtNum(res.toNumber()) + ' g');
  out.work.push('mass = moles × molar mass = ' + mol.toString() + ' × ' + molText(M));
  out.value = { q: res };
  return out;
});
COMMANDS.grams.show = (n) => showRaw(n.args[0]) + ' mol of ' + CHEM_ARGS[Number(intArg(n.args[1]))] + ' → grams';
defCmd('balance', (n) => {
  needArgs(n, 1, 1, 'a reaction such as H2 + O2 -> H2O');
  const rxn = CHEM_ARGS[Number(intArg(n.args[0]))];
  if (rxn === undefined) throw new MathError('write the reaction as balance H2 + O2 -> H2O');
  const sides = rxn.split(/->|=>|→|⟶|⇌|=|==/);
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
  const out = newOut();
  if (basis.length !== 1) {
    out.answer.push(basis.length ? 'this reaction can be balanced in several independent ways (' + basis.length + ' free choices)' : 'this reaction cannot be balanced with these formulas');
    return out;
  }
  let v = primitiveVector(basis[0]);
  if (v.some((q) => q.sign() < 0)) v = v.map((q) => q.neg());
  if (v.some((q) => q.sign() <= 0) || v.some((q) => !q.isInt())) {
    out.answer.push('no balance with positive whole-number coefficients exists for these formulas');
    return out;
  }
  const term = (name, q) => (q.eq(Q1) ? '' : q.toString()) + name;
  out.answer.push(left.map((s, j) => term(s, v[j])).join(' + ') + ' → ' + right.map((s, j) => term(s, v[left.length + j])).join(' + '));
  out.work.push('Solved the atom-conservation equations for each element (' + elements.join(', ') + ') exactly and took the smallest whole numbers');
  out.check = elements.map((e) => e + ': ' + left.reduce((s, _, j) => s + (counts[j].get(e) || 0) * Number(v[j].n), 0) + ' = ' + right.reduce((s, _, j) => s + (counts[left.length + j].get(e) || 0) * Number(v[left.length + j].n), 0)).join(', ');
  return out;
});
COMMANDS.balance.show = (n) => 'balance ' + CHEM_ARGS[Number(intArg(n.args[0]))];
defCmd('ph', (n) => {
  needArgs(n, 1, 1, 'the hydrogen-ion concentration in mol/L');
  const h = numArg(n.args[0]);
  if (!(h > 0)) throw new MathError('the concentration must be positive');
  const out = newOut();
  out.work.push('pH = −log₁₀[H⁺];  pOH = 14 − pH = ' + fmtNum(14 + Math.log10(h)) + ' (at 25 °C)');
  return numOut(out, -Math.log10(h), 'pH');
});
defCmd('poh', (n) => {
  needArgs(n, 1, 1, 'the hydroxide concentration in mol/L');
  const h = numArg(n.args[0]);
  if (!(h > 0)) throw new MathError('the concentration must be positive');
  const out = newOut();
  out.work.push('pOH = −log₁₀[OH⁻];  pH = 14 − pOH = ' + fmtNum(14 + Math.log10(h)) + ' (at 25 °C)');
  return numOut(out, -Math.log10(h), 'pOH');
});
defCmd('hconc phtoh', (n) => {
  needArgs(n, 1, 1, 'a pH value');
  const p = numArg(n.args[0]);
  return numOut(newOut(), Math.pow(10, -p), '[H⁺] (mol/L)');
});

// ---- finance ------------------------------------------------------------------------------------------------------------------------
/** A rate: 5% or 5 means 5 percent, 0.05 means 5 percent too (values below 1 are taken as fractions). */
function rateOf(node) {
  const S = fromAst(node);
  if (S.k !== 'n') throw new MathError('the interest rate must be a number');
  const q = S.q;
  if (node.t === 'pct') return q;
  return q.abs().sub(Q1).sign() >= 0 ? q.div(qInt(100)) : q;
}
function money(q) {
  return decimalText(roundQ(q, 2), 2);
}
function roundQ(q, d) {
  const scale = qInt(10).pow(d);
  const x = q.mul(scale);
  const r = x.sign() >= 0 ? floorQ(x.add(new Q(1n, 2n))) : floorQ(x.neg().add(new Q(1n, 2n))).neg();
  return r.div(scale);
}
const moneyOut = (out, label, q) => out.answer.push(label + ' = ' + money(q));
defCmd('compound compoundinterest', (n) => {
  needArgs(n, 3, 4, 'principal, rate, years and optionally the compounds per year');
  const P = constQ(n.args[0]);
  const r = rateOf(n.args[1]);
  const t = constQ(n.args[2]);
  const m = n.args[3] ? constQ(n.args[3]) : Q1;
  const nt = m.mul(t);
  if (!nt.isInt() || nt.n > 5000n || nt.sign() < 0) throw new MathError('years × compounds per year must be a whole number up to 5000');
  const A = P.mul(Q1.add(r.div(m)).pow(Number(nt.n)));
  const out = newOut();
  moneyOut(out, 'final amount A', A);
  moneyOut(out, 'interest earned', A.sub(P));
  out.work.push('A = P(1 + r/n)^(n·t) = ' + P.toString() + '·(1 + ' + fmtNum(r.toNumber()) + '/' + m.toString() + ')^' + nt.toString());
  out.value = { q: A };
  return out;
});
defCmd('continuous', (n) => {
  needArgs(n, 3, 3, 'principal, rate and years');
  const P = constQ(n.args[0]);
  const r = rateOf(n.args[1]);
  const t = constQ(n.args[2]);
  const A = P.toNumber() * Math.exp(r.toNumber() * t.toNumber());
  const out = newOut();
  out.answer.push('final amount A = ' + A.toFixed(2));
  out.answer.push('interest earned = ' + (A - P.toNumber()).toFixed(2));
  out.work.push('A = P·e^(r·t) with continuous compounding');
  return out;
});
defCmd('simpleinterest', (n) => {
  needArgs(n, 3, 3, 'principal, rate and years');
  const P = constQ(n.args[0]);
  const r = rateOf(n.args[1]);
  const t = constQ(n.args[2]);
  const I = P.mul(r).mul(t);
  const out = newOut();
  moneyOut(out, 'interest I', I);
  moneyOut(out, 'final amount', P.add(I));
  out.work.push('I = P·r·t');
  out.value = { q: I };
  return out;
});
defCmd('loan payment mortgage', (n) => {
  needArgs(n, 3, 4, 'amount, yearly rate, years and optionally payments per year (default 12)');
  const P = constQ(n.args[0]);
  const r = rateOf(n.args[1]);
  const years = constQ(n.args[2]);
  const m = n.args[3] ? constQ(n.args[3]) : qInt(12);
  const N = years.mul(m);
  if (!N.isInt() || N.n > 5000n || N.sign() <= 0) throw new MathError('years × payments per year must be a whole number up to 5000');
  const i = r.div(m);
  const out = newOut();
  let pay;
  if (i.isZero()) pay = P.div(N);
  else {
    const g = Q1.add(i).pow(Number(N.n));
    pay = P.mul(i).mul(g).div(g.sub(Q1));
  }
  moneyOut(out, 'payment per period', pay);
  moneyOut(out, 'total paid', pay.mul(N));
  moneyOut(out, 'total interest', pay.mul(N).sub(P));
  const int1 = P.mul(i);
  out.work.push('M = P·i / (1 − (1 + i)^(−N)) with i = ' + i.toString() + ' per period and N = ' + N.toString() + ' payments');
  out.work.push('First payment: interest ' + money(int1) + ', principal ' + money(pay.sub(int1)));
  out.value = { q: pay };
  return out;
});
defCmd('annuityfv fvannuity', (n) => {
  needArgs(n, 3, 3, 'payment, rate per period and number of periods');
  const pmt = constQ(n.args[0]);
  const i = rateOf(n.args[1]);
  const N = constQ(n.args[2]);
  if (!N.isInt() || N.n > 5000n || N.sign() <= 0) throw new MathError('the number of periods must be a whole number up to 5000');
  const g = Q1.add(i).pow(Number(N.n));
  const fv = i.isZero() ? pmt.mul(N) : pmt.mul(g.sub(Q1)).div(i);
  const out = newOut();
  moneyOut(out, 'future value', fv);
  out.work.push('FV = pmt·((1 + i)^N − 1)/i  (payments at the end of each period)');
  out.value = { q: fv };
  return out;
});
defCmd('annuitypv pvannuity presentvalue', (n) => {
  needArgs(n, 3, 3, 'payment, rate per period and number of periods');
  const pmt = constQ(n.args[0]);
  const i = rateOf(n.args[1]);
  const N = constQ(n.args[2]);
  if (!N.isInt() || N.n > 5000n || N.sign() <= 0) throw new MathError('the number of periods must be a whole number up to 5000');
  const g = Q1.add(i).pow(Number(N.n));
  const pv = i.isZero() ? pmt.mul(N) : pmt.mul(g.sub(Q1)).div(i.mul(g));
  const out = newOut();
  moneyOut(out, 'present value', pv);
  out.work.push('PV = pmt·(1 − (1 + i)^(−N))/i');
  out.value = { q: pv };
  return out;
});
function cashflows(n, from) {
  const cf = n.args.slice(from).map((a) => (a.t === 'list' ? a.items.map(constQ) : [constQ(a)])).flat();
  if (cf.length < 2) throw new MathError('give at least two cash flows (the first is time 0)');
  return cf.map((q) => q.toNumber());
}
defCmd('npv', (n) => {
  if (n.args.length < 3) throw new MathError('npv(rate, cash flow at time 0, cash flow at time 1, ...)');
  const r = rateOf(n.args[0]).toNumber();
  const cf = cashflows(n, 1);
  const v = cf.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  const out = newOut();
  out.work.push('NPV = Σ CFₜ/(1 + r)ᵗ, with the first cash flow at t = 0');
  return numOut(out, v, 'NPV');
});
defCmd('irr', (n) => {
  const cf = cashflows(n, 0);
  const f = (r) => cf.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  let lo = -0.99;
  let hi = 10;
  let flo = f(lo);
  if (flo * f(hi) > 0) throw new MathError('no internal rate of return was found (the cash flows must change sign)');
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (flo * fm <= 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  const out = newOut();
  out.work.push('The rate at which the net present value is 0');
  out.answer.push('IRR = ' + fmtNum(((lo + hi) / 2) * 100) + ' %');
  out.value = { num: (lo + hi) / 2 };
  return out;
});
defCmd('effrate effectiverate apy', (n) => {
  needArgs(n, 2, 2, 'the nominal yearly rate and the compounds per year');
  const r = rateOf(n.args[0]);
  const m = constQ(n.args[1]);
  if (!m.isInt() || m.n > 5000n || m.n < 1n) throw new MathError('compounds per year must be a whole number');
  const e = Q1.add(r.div(m)).pow(Number(m.n)).sub(Q1);
  const out = newOut();
  out.answer.push('effective annual rate = ' + fmtNum(e.toNumber() * 100) + ' %');
  out.work.push('(1 + r/n)^n − 1');
  out.value = { q: e };
  return out;
});
defCmd('doubletime', (n) => {
  needArgs(n, 1, 1, 'the yearly rate');
  const r = rateOf(n.args[0]).toNumber();
  if (!(r > 0)) throw new MathError('the rate must be positive');
  const out = newOut();
  out.answer.push('doubling time = ' + fmtNum(Math.log(2) / Math.log(1 + r)) + ' years  (rule of 72: ' + fmtNum(72 / (r * 100)) + ')');
  out.work.push('t = ln 2 / ln(1 + r)');
  return out;
});
defCmd('pctchange percentchange', (n) => {
  needArgs(n, 2, 2, 'the old value and the new value');
  const [a, b] = n.args.map(constQ);
  if (a.isZero()) throw new MathError('the old value cannot be 0');
  const ch = b.sub(a).div(a).mul(qInt(100));
  const out = newOut();
  out.answer.push(qText(ch) + ' %  (' + (ch.sign() >= 0 ? 'increase' : 'decrease') + ')');
  out.work.push('(new − old)/old × 100');
  out.value = { q: ch };
  return out;
});
defCmd('pctof percentof', (n) => {
  needArgs(n, 2, 2, 'the part and the whole');
  const [a, b] = n.args.map(constQ);
  if (b.isZero()) throw new MathError('the whole cannot be 0');
  const p = a.div(b).mul(qInt(100));
  const out = newOut();
  out.answer.push(qText(p) + ' %');
  out.value = { q: p };
  return out;
});
defCmd('ratio', (n) => {
  if (n.args.length < 2) throw new MathError('ratio(a, b) or ratio(a, b, c)');
  const vals = n.args.map(constQ);
  const lc = vals.reduce((acc, q) => (acc * q.d) / bgcd(acc, q.d), 1n);
  const ints = vals.map((q) => q.mul(new Q(lc)).n);
  const g = ints.reduce((a, b) => bgcd(a, b), 0n) || 1n;
  const out = newOut();
  out.answer.push(ints.map((x) => x / g).join(' : '));
  out.work.push('Divided every term by their greatest common factor ' + g + (lc > 1n ? ' after clearing fractions' : ''));
  return out;
});
defCmd('sci scientific', (n) => {
  needArgs(n, 1, 1, 'a number');
  const q = constQ(n.args[0]);
  if (q.isZero()) {
    const out0 = newOut();
    out0.answer.push('0');
    return out0;
  }
  const x = q.toNumber();
  let e = Math.floor(Math.log10(Math.abs(x)));
  let m = q.div(qInt(10).pow(Math.abs(e)));
  if (e < 0) m = q.mul(qInt(10).pow(-e));
  if (Math.abs(m.toNumber()) >= 10) {
    m = m.div(qInt(10));
    e++;
  }
  const out = newOut();
  out.answer.push(m.isInt() || m.d <= 1000000n ? decimalOrInt(m) + ' × 10' + toSup(String(e)) : fmtNum(m.toNumber()) + ' × 10' + toSup(String(e)));
  out.work.push('Engineering notation: exponent ' + Math.floor(e / 3) * 3);
  return out;
});
function decimalOrInt(q) {
  if (q.isInt()) return q.toString();
  let d = 1;
  while (d < 15 && !q.mul(qInt(10).pow(d)).isInt()) d++;
  return q.mul(qInt(10).pow(d)).isInt() ? decimalText(q, d) : fmtNum(q.toNumber());
}
defCmd('sigfigs sigfig', (n) => {
  needArgs(n, 2, 2, 'a number and the number of significant figures');
  const x = numArg(n.args[0]);
  const k = Number(intArg(n.args[1]));
  if (k < 1 || k > 15) throw new MathError('between 1 and 15 significant figures');
  const out = newOut();
  out.answer.push(Number(x.toPrecision(k)).toString());
  return out;
});

// ---- physics ------------------------------------------------------------------------------------------------------------------------
defCmd('suvat kinematics', (n) => {
  const { named, pos } = geoArgs(n);
  if (pos.length) throw new MathError('name the known quantities: suvat(u=0, a=9.8, t=3)   (s = distance, u = start speed, v = end speed, a = acceleration, t = time)');
  const K = {};
  named.forEach((node, name) => {
    if (!'suvat'.includes(name) || name.length !== 1) throw new MathError('the letters are s, u, v, a, t; "' + name + '" is not one of them');
    K[name] = numArg(node);
  });
  const given = Object.keys(K);
  if (given.length !== 3) throw new MathError('give exactly three of s, u, v, a, t');
  const eqs = [
    (k) => ({ v: k.u + k.a * k.t, u: k.v - k.a * k.t, a: (k.v - k.u) / k.t, t: (k.v - k.u) / k.a }),
    (k) => ({ s: k.u * k.t + 0.5 * k.a * k.t * k.t, u: (k.s - 0.5 * k.a * k.t * k.t) / k.t, a: (2 * (k.s - k.u * k.t)) / (k.t * k.t) }),
    (k) => ({ v: Math.sqrt(k.u * k.u + 2 * k.a * k.s), u: Math.sqrt(k.v * k.v - 2 * k.a * k.s), a: (k.v * k.v - k.u * k.u) / (2 * k.s), s: (k.v * k.v - k.u * k.u) / (2 * k.a) }),
    (k) => ({ s: ((k.u + k.v) / 2) * k.t, u: (2 * k.s) / k.t - k.v, v: (2 * k.s) / k.t - k.u, t: (2 * k.s) / (k.u + k.v) }),
  ];
  const out = newOut();
  const rounds = [];
  for (let guard = 0; guard < 8 && Object.keys(K).length < 5; guard++) {
    for (const name of 'suvat') {
      if (K[name] !== undefined) continue;
      for (const eq of eqs) {
        let r;
        try {
          r = eq(K)[name];
        } catch (e) {
          r = NaN;
        }
        if (r !== undefined && isFinite(r) && !(Number.isNaN(r))) {
          K[name] = r;
          rounds.push(name);
          break;
        }
      }
    }
  }
  if (Object.keys(K).length < 5) throw new MathError('these three quantities do not determine the motion (try another combination)');
  const label = { s: 'displacement s', u: 'initial speed u', v: 'final speed v', a: 'acceleration a', t: 'time t' };
  'suvat'.split('').forEach((c) => out.answer.push(label[c] + ' = ' + fmtNum(K[c])));
  out.work.push('Equations of constant acceleration: v = u + at,  s = ut + ½at²,  v² = u² + 2as,  s = (u + v)t/2');
  if (rounds.includes('v') || rounds.includes('u')) out.notes.push('A square root can also be negative; this is the positive (forward) case.');
  return out;
});
defCmd('projectile', (n) => {
  const { pos, named } = geoArgs(n);
  const speedNode = pos[0] || named.get('v') || named.get('v0');
  const angNode = pos[1] || named.get('angle') || named.get('theta');
  if (!speedNode || !angNode) throw new MathError('projectile(speed, angle in degrees, g) - for example projectile(20, 30)');
  const v0 = numArg(speedNode);
  const S = fromAst(angNode);
  const ang = key(S).includes('pi') ? numS(S, {}) : numS(S, {}) * RAD;
  const g = pos[2] || named.get('g') ? numArg(pos[2] || named.get('g')) : 9.81;
  const vx = v0 * Math.cos(ang);
  const vy = v0 * Math.sin(ang);
  const T = (2 * vy) / g;
  const out = newOut();
  out.answer.push('time of flight = ' + fmtNum(T) + ' s');
  out.answer.push('range = ' + fmtNum(vx * T));
  out.answer.push('maximum height = ' + fmtNum((vy * vy) / (2 * g)));
  out.work.push('vₓ = v·cos θ = ' + fmtNum(vx) + ',  v_y = v·sin θ = ' + fmtNum(vy) + ';  g = ' + fmtNum(g) + ' (launch and landing at the same height, no air resistance)');
  return out;
});
defCmd('freefall', (n) => {
  needArgs(n, 1, 2, 'the height and optionally g');
  const h = numArg(n.args[0]);
  const g = n.args[1] ? numArg(n.args[1]) : 9.81;
  const t = Math.sqrt((2 * h) / g);
  const out = newOut();
  out.answer.push('time to fall = ' + fmtNum(t) + ' s');
  out.answer.push('impact speed = ' + fmtNum(g * t));
  out.work.push('h = ½gt²,  v = gt  with g = ' + fmtNum(g));
  return out;
});

// ---- text patterns for units and chemistry (run before the text is lowercased) -------------------------------------------
const NUMBER_RE = '(-?\\d[\\d,]*(?:\\.\\d+)?(?:e[+-]?\\d+)?(?:\\s*\\/\\s*\\d+)?)';
const UNIT_RE = '([A-Za-z°µμ][A-Za-z°µμ0-9²³^*\\/·.]*)';
function isUnitWord(u) {
  const t = u.replace(/^°/, '');
  return !!(parseUnit(u) || parseUnit(t) || tempKind(u) || tempKind(t));
}
function cleanNum(s) {
  return s.replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/\s+/g, '');
}
/** Replace name(...) calls (with balanced brackets) using handler(name, inner); null keeps the call unchanged. */
function replaceCalls(s, names, handler) {
  const re = new RegExp('\\b(' + names.join('|') + ')\\s*\\(', 'g');
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1;
    const close = matchBracket(s, open, '(', ')');
    if (close < 0) break;
    const rep = handler(m[1], s.slice(open + 1, close));
    if (rep === null) continue;
    out += s.slice(last, m.index) + rep;
    last = close + 1;
    re.lastIndex = close + 1;
  }
  return out + s.slice(last);
}
function trimFormula(f) {
  let depth = 0;
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '(') depth++;
    else if (f[i] === ')' && --depth < 0) return f.slice(0, i);
  }
  return f;
}
function convertApplied(s) {
  if (!/[A-Za-z]/.test(s)) return s;
  s = convertPlotWords(s);
  // balancing chemical equations and formula commands
  s = s.replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080));
  s = s.replace(/\bbalance\s*(?:the\s+)?(?:equation|reaction)?\s*[:(]?\s*([A-Za-z0-9()\[\]·+ ]+?(?:->|=>|→|⟶|⇌|=)[A-Za-z0-9()\[\]·+ ]+?)\s*(?:\)\s*)?(?=$|[;\n])/gi, (m, rxn) => 'balance(' + chemIndex(rxn.trim().replace(/\)$/, '')) + ')');
  s = s.replace(/\bmolar\s+mass\s+(?:of\s+)?\(?\s*([A-Z][A-Za-z0-9()\[\]·.*]*)/g, (m, f) => 'molarmass(' + chemIndex(trimFormula(f)) + ')');
  s = replaceCalls(s, ['molarmass'], (name, inner) => (/^\s*[A-Z][A-Za-z0-9()\[\]·.*]*\s*$/.test(inner) ? name + '(' + chemIndex(inner.trim()) + ')' : null));
  s = replaceCalls(s, ['percentcomp', 'composition', 'masspercent'], (name, inner) => (/^\s*[A-Z][A-Za-z0-9()\[\]·.*]*\s*$/.test(inner) ? name + '(' + chemIndex(inner.trim()) + ')' : null));
  s = replaceCalls(s, ['moles', 'grams'], (name, inner) => {
    const k = inner.lastIndexOf(',');
    const f = k < 0 ? '' : inner.slice(k + 1).trim();
    return /^[A-Z][A-Za-z0-9()\[\]·.*]*$/.test(f) ? name + '(' + inner.slice(0, k).trim() + ', ' + chemIndex(f) + ')' : null;
  });
  // unit conversions: "convert 5 km to miles", "5 km in miles", "how many ft are in 2 m"
  s = s.replace(new RegExp('how\\s+many\\s+' + UNIT_RE + '\\s+(?:are\\s+|is\\s+)?(?:there\\s+)?in\\s+' + NUMBER_RE + '\\s*' + UNIT_RE, 'gi'), (m, to, num, from) => (isUnitWord(to) && isUnitWord(from) ? 'convert(' + cleanNum(num) + ', ' + unitIndex(from) + ', ' + unitIndex(to) + ')' : m));
  s = s.replace(new RegExp('(convert\\s+)?' + NUMBER_RE + '\\s*' + UNIT_RE + '\\s+(to|into|in|as|->|→)\\s+' + UNIT_RE, 'gi'), (m, kw, num, from, conn, to) => {
    if (!isUnitWord(from) || !isUnitWord(to)) return m;
    // "in" and "as" also occur in ordinary sentences, so without the word "convert" both units must be unmistakable
    const strong = (u, other) => u.length >= 2 && (u.toLowerCase() !== 'in' || (other.length >= 2 && other.toLowerCase() !== 'in'));
    const loose = /^(to|into|->|→)$/i.test(conn);
    if (!kw && !loose && !(strong(from, to) && strong(to, from))) return m;
    return 'convert(' + cleanNum(num) + ', ' + unitIndex(from) + ', ' + unitIndex(to) + ')';
  });
  return s;
}
