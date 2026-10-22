# Oracle cases for the chemistry and finance extras: periodictable / mendeleev / numpy-financial / scipy and plain re-derivations.
import json, sys, random, math, re
from fractions import Fraction
import numpy as np
import numpy_financial as npf
import periodictable as pt
import os
# element data (names, groups, periods, blocks, ground-state configurations) cached from the mendeleev package
_DATA = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'elements-oracle.json')))
class _E:
    def __init__(self, d): self.__dict__.update(d); self.group_id = d['group']
def mend(z): return _E(_DATA[str(z)])

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))

def norm_conf(s):
    toks = s.split()
    core = ''
    out = []
    for t in toks:
        if t.startswith('['): core = t; continue
        out.append(t if re.search(r'\d$', t) else t + '1')
    return core, out
NOBLE = {'He': 2, 'Ne': 10, 'Ar': 18, 'Kr': 36, 'Xe': 54, 'Rn': 86}
def expand(s):
    core, toks = norm_conf(s)
    occ = {}
    if core:
        sym = core.strip('[]')
        for t in norm_conf(mend(NOBLE[sym]).econf)[1] if False else []: pass
    return core, toks
def full_occ(z):
    # occupations of the neutral atom from mendeleev, with the noble-gas core expanded recursively
    s = mend(z).econf
    core, toks = norm_conf(s)
    occ = {}
    if core:
        for t in full_occ(NOBLE[core.strip('[]')]).items(): occ[t[0]] = t[1]
    for t in toks: occ[t[:2]] = int(t[2:])
    return occ
def unpaired(occ):
    u = 0
    for sub, e in occ.items():
        orb = {'s': 1, 'p': 3, 'd': 5, 'f': 7}[sub[1]]
        u += e if e <= orb else 2 * orb - e
    return u

# elements: name, symbol, mass, period, group, block, configuration
zs = list(range(1, 104)) + rnd.sample(range(104, 119), 3)
for z in rnd.sample(zs, 40):
    e = mend(z); p = pt.elements[z]
    occ = full_occ(z) if z <= 103 else None
    form = rnd.choice(['num', 'sym', 'name'])
    arg = {'num': str(z), 'sym': e.symbol, 'name': e.name.lower()}[form]
    add('element', 'element(%s)' % arg, z=z, name=p.name.capitalize() if False else e.name, symbol=p.symbol, mass=float(p.mass), period=e.period, group=e.group_id, block=e.block)
for z in rnd.sample(range(1, 104), 40):
    e = mend(z)
    occ = full_occ(z)
    add('econf', 'electronconfig(%s)' % e.symbol, z=z, occ=occ, unpaired=unpaired(occ))
for sp_, want in [('Fe3+', '[Ar] 3d5'), ('Fe2+', '[Ar] 3d6'), ('Cu+', '[Ar] 3d10'), ('Cu2+', '[Ar] 3d9'), ('Zn2+', '[Ar] 3d10'), ('Mn2+', '[Ar] 3d5'),
                  ('Cr3+', '[Ar] 3d3'), ('Ni2+', '[Ar] 3d8'), ('Cl-', '[Ne] 3s2 3p6'), ('O2-', '[He] 2s2 2p6'), ('Na+', '[He] 2s2 2p6'), ('Mg2+', '[He] 2s2 2p6'),
                  ('Al3+', '[He] 2s2 2p6'), ('Ca2+', '[Ne] 3s2 3p6'), ('Pb2+', '[Xe] 4f14 5d10 6s2'), ('Sn4+', '[Kr] 4d10'), ('Ag+', '[Kr] 4d10'), ('Co3+', '[Ar] 3d6'),
                  ('Ti2+', '[Ar] 3d2'), ('V3+', '[Ar] 3d2'), ('N3-', '[He] 2s2 2p6'), ('S2-', '[Ne] 3s2 3p6'), ('Br-', '[Ar] 3d10 4s2 4p6'), ('Fe(3+)', '[Ar] 3d5')]:
    add('econfion', 'electronconfig(%s)' % sp_, want=want)

# empirical formulas from rounded mass percentages
EL = ['C', 'H', 'O', 'N', 'S', 'P', 'Cl', 'Fe', 'Na', 'Al', 'Ca', 'K', 'Mg', 'Br', 'Cu', 'Zn']
for _ in range(25):
    k = rnd.randint(2, 4)
    els = rnd.sample(EL, k)
    if rnd.random() < 0.5:
        els = [e for e in ['C', 'H', 'O', 'N'] if rnd.random() < 0.8] or els
        if len(els) < 2: els = ['C', 'H']
    subs = [rnd.randint(1, 6) for _ in els]
    g = math.gcd(*subs)
    subs = [s // g for s in subs]
    if max(subs) > 6: continue
    masses = [pt.elements.symbol(e).mass * s for e, s in zip(els, subs)]
    tot = sum(masses)
    unit = rnd.choice(['%', ' g'])
    spec = ', '.join('%s %.2f%s' % (e, 100 * m / tot, '' if unit == '%' else '') for e, m in zip(els, masses))
    mode = rnd.choice(['plain', 'pct'])
    if mode == 'pct': spec = ', '.join('%.2f%% %s' % (100 * m / tot, e) for e, m in zip(els, masses))
    expected = ''.join(e + (str(s) if s > 1 else '') for e, s in zip(els, subs))
    mult = rnd.choice([1, 1, 2, 3, 4, 6])
    if rnd.random() < 0.4:
        mm = tot * mult
        add('empirical', 'empirical(%s; %.1f)' % (spec, mm), expected=expected, molecular=''.join(e + (str(s * mult) if s * mult > 1 else '') for e, s in zip(els, subs)))
    else:
        add('empirical', 'empirical(%s)' % spec, expected=expected, molecular=None)
REACTIONS = [
    ('H2 + O2 -> H2O', ['H2', 'O2'], ['H2O'], [2, 1, 2]), ('N2 + H2 -> NH3', ['N2', 'H2'], ['NH3'], [1, 3, 2]),
    ('CH4 + O2 -> CO2 + H2O', ['CH4', 'O2'], ['CO2', 'H2O'], [1, 2, 1, 2]), ('C3H8 + O2 -> CO2 + H2O', ['C3H8', 'O2'], ['CO2', 'H2O'], [1, 5, 3, 4]),
    ('Fe + O2 -> Fe2O3', ['Fe', 'O2'], ['Fe2O3'], [4, 3, 2]), ('Al + HCl -> AlCl3 + H2', ['Al', 'HCl'], ['AlCl3', 'H2'], [2, 6, 2, 3]),
    ('Na + Cl2 -> NaCl', ['Na', 'Cl2'], ['NaCl'], [2, 1, 2]), ('C6H12O6 + O2 -> CO2 + H2O', ['C6H12O6', 'O2'], ['CO2', 'H2O'], [1, 6, 6, 6]),
    ('Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O', ['Ca(OH)2', 'H3PO4'], ['Ca3(PO4)2', 'H2O'], [3, 2, 1, 6]), ('Mg + O2 -> MgO', ['Mg', 'O2'], ['MgO'], [2, 1, 2]),
]
def mm(f):
    return float(pt.formula(f.replace('·', '.')).mass)
for _ in range(20):
    rx, L, R, co = rnd.choice(REACTIONS)
    grams = [round(rnd.uniform(0.5, 80), 1) for _ in L]
    moles = [g / mm(f) for g, f in zip(grams, L)]
    ext = [m / co[i] for i, m in enumerate(moles)]
    lim = min(range(len(L)), key=lambda i: ext[i])
    yields = {p: ext[lim] * co[len(L) + j] for j, p in enumerate(R)}
    left = {L[i]: moles[i] - ext[lim] * co[i] for i in range(len(L)) if i != lim}
    add('limiting', 'limiting(%s, %s)' % (rx, ', '.join('%s g %s' % (g, f) for g, f in zip(grams, L))), lim=L[lim], yields={p: [y, y * mm(p)] for p, y in yields.items()}, left={f: [v, v * mm(f)] for f, v in left.items()})
    i = rnd.randrange(len(L)); j = rnd.randrange(len(R))
    target = R[j]
    add('stoich', 'stoich(%s, %s g %s, %s)' % (rx, grams[i], L[i], target), mol=moles[i] * co[len(L) + j] / co[i], g=moles[i] * co[len(L) + j] / co[i] * mm(target))
# solutions, gases, decay
for _ in range(12):
    ka = 10 ** rnd.uniform(-9, -2); c = 10 ** rnd.uniform(-3, 0)
    x = (-ka + math.sqrt(ka * ka + 4 * ka * c)) / 2
    add('weakacid', 'weakacid(%.3e, %.4g)' % (ka, c), ph=-math.log10(x), pct=100 * x / c) if False else None
    ka = float('%.3e' % ka); c = float('%.4g' % c)
    x = (-ka + math.sqrt(ka * ka + 4 * ka * c)) / 2
    add('weakacid', 'weakacid(%s, %s)' % (repr(ka), repr(c)), ph=-math.log10(x), pct=100 * x / c)
    add('weakbase', 'weakbase(%s, %s)' % (repr(ka), repr(c)), ph=14 + math.log10(x), pct=100 * x / c)
for _ in range(8):
    pka = round(rnd.uniform(2, 11), 2); b = round(rnd.uniform(0.01, 1), 3); a = round(rnd.uniform(0.01, 1), 3)
    add('buffer', 'buffer(%s, %s, %s)' % (pka, b, a), ph=pka + math.log10(b / a))
for _ in range(8):
    c1, v1, c2, v2 = [round(rnd.uniform(0.1, 20), 2) for _ in range(4)]
    k = rnd.randrange(4)
    args = [c1, v1, c2, v2]
    val = [c2 * v2 / v1, c2 * v2 / c1, c1 * v1 / v2, c1 * v1 / c2][k]
    args[k] = 'x'
    add('dilution', 'dilution(%s)' % ', '.join(map(str, args)), val=val)
R = 0.082057366
for _ in range(10):
    P, V, n, T = round(rnd.uniform(0.2, 5), 2), round(rnd.uniform(1, 50), 2), round(rnd.uniform(0.1, 4), 2), round(rnd.uniform(200, 500), 1)
    k = rnd.randrange(4)
    args = [P, V, n, T]
    val = [n * R * T / V, n * R * T / P, P * V / (R * T), P * V / (n * R)][k]
    args[k] = 'x'
    add('idealgas', 'idealgas(%s)' % ', '.join(map(str, args)), val=val)
for _ in range(8):
    th = round(rnd.uniform(1, 9000), 1); t = round(rnd.uniform(0, 30000), 1); n0 = round(rnd.uniform(1, 500), 1)
    add('halflife', 'halflife(%s, %s, %s)' % (th, t, n0), frac=2 ** (-t / th), amount=n0 * 2 ** (-t / th))
    f = round(rnd.uniform(0.01, 0.95), 3)
    add('decaytime', 'decaytime(%s, %s)' % (th, f), t=th * math.log2(1 / f))
# finance
for _ in range(10):
    P = rnd.randint(1000, 500000); r = rnd.choice([0.03, 0.045, 0.05, 0.065, 0.08, 0.1]); years = rnd.randint(1, 30); m = rnd.choice([12, 12, 4, 2, 1, 26])
    N = round(years * m); i = r / m
    pmt = -npf.pmt(i, N, P)
    show = min(N, 8)
    rows = [[k, -npf.pmt(i, N, P), -npf.ipmt(i, k, N, P), -npf.ppmt(i, k, N, P)] for k in range(1, show + 1)]
    bal = []
    b = P
    for k in range(1, show + 1):
        b -= rows[k - 1][3]; bal.append(b)
    add('amort', 'amortization(%d, %s, %d, %d, %d)' % (P, repr(r * 100) + '%', years, m, show), pay=pmt, N=N, total_int=pmt * N - P, rows=rows, bal=bal)
    kk = rnd.randint(0, N)
    bal_k = P - sum(-npf.ppmt(i, k, N, P) for k in range(1, kk + 1))
    add('loanbalance', 'loanbalance(%d, %s, %d, %d, %d)' % (P, repr(r * 100) + '%', years, kk, m), bal=bal_k)
    pay = round(pmt * rnd.uniform(1.0, 1.8), 2)
    n_ = npf.nper(i, -pay, P)
    add('payoff', 'payoff(%d, %s, %.2f, %d)' % (P, repr(r * 100) + '%', pay, m), n=float(n_))
for _ in range(10):
    F = rnd.choice([100, 1000, 5000]); cr = rnd.choice([0.02, 0.04, 0.05, 0.07]); y = rnd.choice([0.03, 0.05, 0.06, 0.09]); yrs = rnd.randint(1, 20); f = rnd.choice([1, 2, 4])
    N = yrs * f
    price = -npf.pv(y / f, N, F * cr / f, F)
    # Macaulay duration
    cfs = [F * cr / f] * N; cfs[-1] += F
    pvs = [c / (1 + y / f) ** (t + 1) for t, c in enumerate(cfs)]
    mac = sum((t + 1) / f * p for t, p in enumerate(pvs)) / sum(pvs)
    add('bond', 'bond(%d, %s, %s, %d, %d)' % (F, repr(cr * 100) + '%', repr(y * 100) + '%', yrs, f), price=price, mac=mac, mod=mac / (1 + y / f), cy=100 * F * cr / price)
for _ in range(8):
    cost = rnd.randint(1000, 90000); salv = rnd.randint(0, cost // 3); life = rnd.randint(2, 12)
    d = (cost - salv) / life
    add('sl', 'straightline(%d, %d, %d)' % (cost, salv, life), dep=[d] * life)
    fac = rnd.choice([2, 1.5, 2.5])
    book = cost; dd = []
    for y in range(life):
        x = max(0, min(book * fac / life, book - salv)); dd.append(x); book -= x
    add('ddb', 'decliningbalance(%d, %d, %d, %s)' % (cost, salv, life, fac), dep=dd)
    s = life * (life + 1) / 2
    add('syd', 'sumofyears(%d, %d, %d)' % (cost, salv, life), dep=[(cost - salv) * (life - y) / s for y in range(life)])
for _ in range(8):
    a = rnd.randint(100, 5000); b = rnd.randint(100, 9000); t = rnd.randint(1, 20)
    add('cagr', 'cagr(%d, %d, %d)' % (a, b, t), val=100 * ((b / a) ** (1 / t) - 1))
    r = rnd.choice([1, 2, 3, 4, 5, 6, 8, 9, 12])
    add('rule72', 'rule72(%d%%)' % r, val=math.log(2) / math.log(1 + r / 100), approx=72 / r)
    nom, inf = rnd.choice([3, 4, 5, 7, 10]), rnd.choice([1, 2, 3, 4])
    add('realrate', 'realrate(%d%%, %d%%)' % (nom, inf), val=100 * ((1 + nom / 100) / (1 + inf / 100) - 1))
    n = rnd.randint(3, 6)
    cf = [-rnd.randint(500, 2000)] + [rnd.randint(100, 900) for _ in range(n)]
    fr, rr = rnd.choice([5, 8, 10]), rnd.choice([6, 9, 12])
    add('mirr', 'mirr([%s], %d%%, %d%%)' % (', '.join(map(str, cf)), fr, rr), val=100 * float(npf.mirr(cf, fr / 100, rr / 100)))
    cum = 0; pb = None
    for t_, c in enumerate(cf):
        prev = cum; cum += c
        if t_ > 0 and prev < 0 and cum >= 0: pb = t_ - 1 + (-prev) / c; break
    add('payback', 'payback([%s])' % ', '.join(map(str, cf)), val=pb)
    fc, p, v = rnd.randint(1000, 50000), rnd.randint(20, 90), rnd.randint(5, 19)
    add('breakeven', 'breakeven(%d, %d, %d)' % (fc, p, v), val=fc / (p - v))
print(json.dumps(cases))
