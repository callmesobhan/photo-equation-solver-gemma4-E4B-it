# Random expressions + sympy as an independent oracle for value, derivative and expansion.
import json, random, sys, warnings
import sympy as sp
warnings.filterwarnings('ignore')
seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
count = int(sys.argv[2]) if len(sys.argv) > 2 else 200
random.seed(seed)
x, y = sp.symbols('x y')
FUNCS = ['sin', 'cos', 'tan', 'atan', 'exp', 'sinh', 'cosh', 'tanh']

def gen(d, vars_):
    """returns (text in our syntax, sympy expr)"""
    if d == 0 or random.random() < 0.22:
        r = random.random()
        if r < 0.5:
            v = random.choice(vars_)
            return v, sp.Symbol(v)
        if r < 0.85:
            n = random.randint(1, 6)
            return str(n), sp.Integer(n)
        return 'pi', sp.pi
    op = random.choice(['+', '-', '*', '/', '^', 'f', 'f', 'ln', 'sqrt', 'neg', '*', '+'])
    a_t, a = gen(d - 1, vars_)
    if op == 'neg':
        return f"-({a_t})", -a
    if op == 'f':
        fn = random.choice(FUNCS)
        return f"{fn}({a_t})", getattr(sp, fn)(a)
    if op == 'ln':   # keep the argument positive
        return f"ln(({a_t})^2+1)", sp.log(a**2 + 1)
    if op == 'sqrt':
        return f"sqrt(({a_t})^2+2)", sp.sqrt(a**2 + 2)
    b_t, b = gen(d - 1, vars_)
    if op == '^':
        e = random.choice([2, 3, -1, -2, 4])
        if e < 0:
            return f"(({a_t})^2+1)^({e})", (a**2 + 1)**e
        return f"({a_t})^{e}", a**e
    if op == '/':
        return f"({a_t})/(({b_t})^2+1)", a / (b**2 + 1)
    sym = {'+': '+', '-': '-', '*': '*'}[op]
    t = f"({a_t}) {sym} ({b_t})"
    return t, {'+': a + b, '-': a - b, '*': a * b}[op]

out = []
multi = random.random() < 0.3
for _ in range(count):
    vars_ = ['x', 'y'] if random.random() < 0.3 else ['x']
    text, e = gen(random.randint(1, 4), vars_)
    import re
    if re.search(r'(exp|sinh|cosh)\(.*(exp|sinh|cosh)\(', text):
        continue   # avoid astronomically large intermediate values
    syms = {'x': x, 'y': y}
    pts = [{'x': random.uniform(0.3, 2.4), 'y': random.uniform(0.3, 2.4)} for _ in range(4)]
    try:
        fv = sp.lambdify((x, y), e, 'math')
        d = sp.diff(e, x)
        dv = sp.lambdify((x, y), d, 'math')
        vals, dvals = [], []
        for p in pts:
            v = complex(fv(p['x'], p['y'])); dd = complex(dv(p['x'], p['y']))
            if abs(v.imag) > 1e-12 or abs(dd.imag) > 1e-12 or abs(v) > 1e8 or abs(dd) > 1e8:
                raise ValueError('bad')
            vals.append(v.real); dvals.append(dd.real)
    except Exception:
        continue
    out.append({'text': text, 'pts': pts, 'val': vals, 'dx': dvals})
print(json.dumps(out))
