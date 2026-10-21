# Oracle for the calculus battery: sympy (coverage, limits, sums) and scipy (definite integrals).
import json, sys, signal, math, warnings
import numpy as np
import sympy as sp
from scipy import integrate as si
warnings.filterwarnings('ignore')
x, k, n = sp.symbols('x k n')
LOCAL = {'x': x, 'k': k, 'n': n, 'e': sp.E, 'pi': sp.pi, 'ln': sp.log, 'abs': sp.Abs, 'asin': sp.asin, 'acos': sp.acos,
         'atan': sp.atan, 'sinh': sp.sinh, 'cosh': sp.cosh, 'tanh': sp.tanh, 'sqrt': sp.sqrt, 'oo': sp.oo, 'cot': sp.cot,
         'sec': sp.sec, 'csc': sp.csc, 'exp': sp.exp}
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
T = standard_transformations + (implicit_multiplication_application, convert_xor)
def P(s): return parse_expr(s, local_dict=LOCAL, transformations=T)

class TO(Exception): pass
def _h(sig, frm): raise TO()
signal.signal(signal.SIGALRM, _h)
def timed(fn, secs=8):
    signal.alarm(secs)
    try: return fn()
    except TO: return None
    except Exception: return None
    finally: signal.alarm(0)

job = json.load(sys.stdin)
res = {}
res['integrals'] = []
for s in job['integrals']:
    f = P(s)
    r = timed(lambda: sp.integrate(f, x))
    res['integrals'].append({'expr': s, 'sympy_solved': bool(r is not None and not r.has(sp.Integral))})

res['definite'] = []
for s, a, b in job['definite']:
    fa = sp.lambdify(x, P(s), 'numpy')
    lo = -np.inf if a == '-oo' else (np.inf if a == 'oo' else float(P(a)))
    hi = np.inf if b == 'oo' else (-np.inf if b == '-oo' else float(P(b)))
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            v, err = si.quad(fa, lo, hi, limit=400)
        ok = math.isfinite(v) and err < 1e-6 * max(1, abs(v))
        # divergence guard (scipy returns big numbers / large errors for divergent integrals)
        res['definite'].append({'expr': s, 'a': a, 'b': b, 'value': v if ok else None})
    except Exception:
        res['definite'].append({'expr': s, 'a': a, 'b': b, 'value': None})

res['limits'] = []
for s, pt, d in job['limits']:
    f = P(s)
    p = P(pt)
    r = timed(lambda: sp.limit(f, x, p, d))
    if r is None: val = 'unknown'
    elif r == sp.oo: val = 'inf'
    elif r == -sp.oo: val = '-inf'
    elif r.has(sp.nan) or r.has(sp.AccumBounds): val = 'dne'
    else:
        try: val = float(sp.N(r))
        except Exception: val = 'unknown'
    res['limits'].append({'expr': s, 'pt': pt, 'dir': d, 'value': val})

res['sums'] = []
for s, a, b in job['sums']:
    f = P(s)
    r = timed(lambda: sp.summation(f, (k, P(a), P(b))))
    if r is None: val = 'unknown'
    elif r == sp.oo: val = 'inf'
    else:
        try: val = float(sp.N(r))
        except Exception: val = 'unknown'
    res['sums'].append({'expr': s, 'a': a, 'b': b, 'value': val})
print(json.dumps(res))
