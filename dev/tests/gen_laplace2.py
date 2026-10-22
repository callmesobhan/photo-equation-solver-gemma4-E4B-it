# Oracle cases for Laplace transforms with unit steps and impulses and for ODEs with such forcing (numerical quadrature, mpmath's inverse
# Laplace transform and scipy's solve_ivp applied piece by piece).
import json, sys, random, math
import numpy as np
import mpmath as mp
from scipy.integrate import quad, solve_ivp

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
mp.mp.dps = 30

def ftxt(v):
    return '%d' % v if float(v).is_integer() else '(%d/%d)' % (round(v * 2), 2) if abs(v * 2 - round(v * 2)) < 1e-12 else repr(v)
POS = [(1, '1'), (2, '2'), (3, '3'), (0.5, '1/2'), (math.pi, 'pi'), (2.5, '5/2'), (1.5, '3/2')]

# ---- forward transforms --------------------------------------------------------------------------------------------------------------------
SMOOTH = [
    ('1', lambda t: 1.0), ('t', lambda t: t), ('t^2', lambda t: t * t), ('e^(-t)', lambda t: math.exp(-t)), ('e^(2*t)', lambda t: math.exp(2 * t)), ('t*e^(-t)', lambda t: t * math.exp(-t)),
    ('sin(t)', math.sin), ('cos(2*t)', lambda t: math.cos(2 * t)), ('sin(3*t)', lambda t: math.sin(3 * t)), ('e^(-t)*sin(2*t)', lambda t: math.exp(-t) * math.sin(2 * t)),
    ('t*cos(t)', lambda t: t * math.cos(t)), ('sin(t+1)', lambda t: math.sin(t + 1)), ('cos(t+pi/4)', lambda t: math.cos(t + math.pi / 4)), ('sinh(t)', math.sinh), ('t^3', lambda t: t ** 3),
]
SV = [3.5, 5.0, 8.0]
def forward_case():
    comps = []
    for _ in range(rnd.randint(1, 3)):
        c = rnd.choice([1, 2, 3, -1, -2, 5])
        gt, g = rnd.choice(SMOOTH)
        kind = rnd.choice(['step', 'step', 'step', 'window', 'delta', 'plain'])
        if kind == 'step':
            a, at = rnd.choice(POS)
            comps.append((c, gt, g, a, at, 'step'))
        elif kind == 'window':
            a, at = rnd.choice(POS[:4])
            b, bt = rnd.choice([(4, '4'), (5, '5'), (6, '6')])
            comps.append((c, gt, g, a, at, 'step'))
            comps.append((-c, gt, g, b, bt, 'step'))
        elif kind == 'delta':
            a, at = rnd.choice(POS)
            comps.append((c, gt, g, a, at, 'delta'))
        else:
            comps.append((c, gt, g, 0.0, '0', 'plain'))
    text_parts = []
    for c, gt, g, a, at, kind in comps:
        if kind == 'step': fac = '%s*heaviside(t-%s)' % (gt, at) if at != '0' else gt
        elif kind == 'delta': fac = '%s*dirac(t-%s)' % (gt, at)
        else: fac = gt
        text_parts.append('(%s)*%s' % (c, fac) if c != 1 else fac)
    text = ' + '.join(text_parts).replace('+ (-', '- (').replace('(-', '(-')
    vals = []
    for s in SV:
        tot = 0.0
        for c, gt, g, a, at, kind in comps:
            if kind == 'delta': tot += c * g(a) * math.exp(-s * a)
            else:
                f = lambda t: g(t) * math.exp(-s * t)
                v, _ = quad(f, a, 60.0, epsabs=1e-13, epsrel=1e-12, limit=400)  # e^(-1.5 t) at t = 60 is below 1e-39
                tot += c * v
        vals.append(tot)
    return text, vals
for _ in range(40):
    text, vals = forward_case()
    cases.append(dict(kind='forward', cmd='laplace(%s, t)' % text, s=SV, vals=vals))

# ---- inverse transforms: F(s) = sum e^(-a s) R(s) with proper rational R ---------------------------------------------------------------------
RAT = [
    ('1/s', lambda s: 1 / s), ('1/s^2', lambda s: 1 / s ** 2), ('1/(s+1)', lambda s: 1 / (s + 1)), ('1/(s^2+1)', lambda s: 1 / (s ** 2 + 1)), ('s/(s^2+4)', lambda s: s / (s ** 2 + 4)),
    ('1/(s*(s+1))', lambda s: 1 / (s * (s + 1))), ('1/(s^2+2*s+5)', lambda s: 1 / (s ** 2 + 2 * s + 5)), ('(s+3)/((s+1)*(s+2))', lambda s: (s + 3) / ((s + 1) * (s + 2))),
    ('1/(s^2*(s+2))', lambda s: 1 / (s ** 2 * (s + 2))), ('2/(s^3)', lambda s: 2 / s ** 3), ('1/((s+1)^2+4)', lambda s: 1 / ((s + 1) ** 2 + 4)), ('s/(s^2+2*s+2)', lambda s: s / (s ** 2 + 2 * s + 2)),
    ('1/(s*(s^2+1))', lambda s: 1 / (s * (s ** 2 + 1))), ('(2*s+1)/(s^2+3*s+2)', lambda s: (2 * s + 1) / (s ** 2 + 3 * s + 2)), ('1/(s-1)', lambda s: 1 / (s - 1)),
]
for _ in range(30):
    parts = []
    for _ in range(rnd.randint(1, 3)):
        c = rnd.choice([1, 2, -1, 3])
        rt, R = rnd.choice(RAT)
        a, at = rnd.choice(POS + [(0, '0')])
        parts.append((c, rt, R, a, at))
    text = ' + '.join(('(%s)*' % c if c != 1 else '') + ('e^(-%s*s)*' % at if at != '0' else '') + '(%s)' % rt for c, rt, R, a, at in parts).replace('+ (-', '- (')
    ts = [0.4, 1.3, 2.2, 3.7, 5.1, 6.8]
    vals = []
    for t in ts:
        tot = 0.0
        for c, rt, R, a, at in parts:
            if t > a + 1e-9:
                tot += c * float(mp.invertlaplace(lambda s: R(s), t - a, method='talbot'))
        vals.append(tot)
    cases.append(dict(kind='inverse', cmd='ilaplace(%s, s)' % text, t=ts, vals=vals, breaks=[p_[3] for p_ in parts]))
for c0, (a, at) in [(2, POS[0]), (3, POS[2])]:
    cases.append(dict(kind='inverse-delta', cmd='ilaplace(%d*e^(-%s*s), s)' % (c0, at), c=c0, a=at))

# ---- initial value problems -----------------------------------------------------------------------------------------------------------------
def make_ode():
    order = rnd.choice([1, 2, 2])
    if order == 1:
        k = rnd.choice([-2, -1, 1, 2, 3]); coeffs = [k, 1]            # y' + k y
    else:
        b, c = rnd.choice([(3, 2), (2, 1), (2, 5), (0, 1), (0, 4), (4, 3), (1, 6), (5, 6), (2, 2), (-1, -2)])
        coeffs = [c, b, 1]                                              # y'' + b y' + c y
    forcing = []
    for _ in range(rnd.randint(1, 3)):
        kind = rnd.choice(['step', 'step', 'window', 'delta', 'stepsin', 'ramp'])
        a, at = rnd.choice(POS[:5])
        A = rnd.choice([1, 2, 3, -1, 5, 10])
        if kind == 'step': forcing.append(('step', A, a, at, None))
        elif kind == 'window':
            b2, bt = rnd.choice([(4, '4'), (5, '5'), (6, '6')]); forcing.append(('step', A, a, at, None)); forcing.append(('step', -A, b2, bt, None))
        elif kind == 'delta': forcing.append(('delta', A, a, at, None))
        elif kind == 'stepsin': forcing.append(('stepsin', A, a, at, rnd.choice([1, 2, 3])))
        else: forcing.append(('ramp', A, a, at, None))
    ics = [rnd.choice([0, 0, 1, -1, 2]) for _ in range(order)]
    return order, coeffs, forcing, ics
def forcing_value(forcing, t):
    tot = 0.0
    for kind, A, a, at, w in forcing:
        if t <= a: continue
        if kind == 'step': tot += A
        elif kind == 'stepsin': tot += A * math.sin(w * (t - a))
        elif kind == 'ramp': tot += A * (t - a)
    return tot
def solve_piecewise(order, coeffs, forcing, ics, ts):
    bps = sorted(set([0.0] + [a for kind, A, a, at, w in forcing]))
    deltas = {}
    for kind, A, a, at, w in forcing:
        if kind == 'delta': deltas[a] = deltas.get(a, 0) + A
    def rhs(t, y):
        f = forcing_value(forcing, t + 1e-12) if False else None
        return None
    ysol = {}
    state = list(map(float, ics))
    out = {}
    bps_all = bps + [max(ts) + 1]
    t0 = 0.0
    # apply an impulse at t = 0 if any
    for i in range(len(bps_all) - 1):
        lo, hi = bps_all[i], bps_all[i + 1]
        if lo in deltas:
            state[-1] += deltas[lo]      # the highest-order coefficient is 1
        mid = (lo + hi) / 2
        fval = lambda t: forcing_value(forcing, mid if True else t) if False else None
        def f(t, y, forcing=forcing, mid=mid):
            # smooth parts (sin, ramp) need the actual t; the step amplitudes switch at the breakpoints only
            tot = 0.0
            for kind, A, a, at, w in forcing:
                if a > mid: continue
                if kind == 'step': tot += A
                elif kind == 'stepsin': tot += A * math.sin(w * (t - a))
                elif kind == 'ramp': tot += A * (t - a)
            if order == 1: return [tot - coeffs[0] * y[0]]
            return [y[1], tot - coeffs[1] * y[1] - coeffs[0] * y[0]]
        want = [t for t in ts if lo <= t < hi]
        if hi > lo:
            sol = solve_ivp(f, (lo, hi), state, t_eval=want + [hi], rtol=1e-12, atol=1e-13, method='DOP853', dense_output=False)
            for t, yv in zip(want, sol.y[0]): out[t] = float(yv)
            state = [float(v[-1]) for v in sol.y]          # the state at t = hi (the last evaluation point)
    return out
for _ in range(45):
    order, coeffs, forcing, ics = make_ode()
    ts = [0.35, 0.8, 1.45, 2.3, 2.9, 3.6, 4.4, 5.3, 6.7, 8.1]
    bad_t = set()
    for kind, A, a, at, w in forcing: bad_t.add(a)
    ts = [t for t in ts if all(abs(t - a) > 0.05 for a in bad_t)]
    ys = solve_piecewise(order, coeffs, forcing, ics, ts)
    lhs = "y'" if order == 1 else "y'' + %dy' + %dy" % (coeffs[1], coeffs[0]) if coeffs[1] >= 0 else "y'' - %dy' + %dy" % (-coeffs[1], coeffs[0])
    if order == 1: lhs = "y' + %dy" % coeffs[0] if coeffs[0] >= 0 else "y' - %dy" % (-coeffs[0])
    if order == 2:
        c1, c0 = coeffs[1], coeffs[0]
        lhs = "y''" + ((' + %dy\'' % c1) if c1 > 0 else (' - %dy\'' % -c1) if c1 < 0 else '') + ((' + %dy' % c0) if c0 > 0 else (' - %dy' % -c0) if c0 < 0 else '')
    parts = []
    for kind, A, a, at, w in forcing:
        amp = ('(%d)*' % A) if A != 1 else ''
        if kind == 'step': parts.append(amp + 'heaviside(t-%s)' % at)
        elif kind == 'delta': parts.append(amp + 'dirac(t-%s)' % at)
        elif kind == 'stepsin': parts.append(amp + 'heaviside(t-%s)*sin(%d*(t-%s))' % (at, w, at))
        else: parts.append(amp + '(t-%s)*heaviside(t-%s)' % (at, at))
    rhs_text = ' + '.join(parts).replace('+ (-', '- (')
    ic_text = ', '.join(["y(0) = %d" % ics[0]] + ([("y'(0) = %d" % ics[1])] if order == 2 else []))
    cases.append(dict(kind='ode', cmd='%s = %s, %s' % (lhs, rhs_text, ic_text), ts=ts, ys=[ys[t] for t in ts]))
print(json.dumps(cases))
