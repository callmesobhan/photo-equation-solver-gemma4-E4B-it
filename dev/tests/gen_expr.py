# Random arithmetic expressions with exact Fraction results (independent oracle).
import json, random, sys
from fractions import Fraction

random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 1)

def gen(depth):
    """returns (text, Fraction) ; text uses our syntax, python precedence agrees"""
    if depth == 0 or random.random() < 0.25:
        k = random.random()
        if k < 0.7:
            n = random.randint(0, 20)
            return str(n), Fraction(n)
        d = random.randint(1, 3)
        n = random.randint(0, 99)
        txt = f"{n / 10 ** d:.{d}f}"
        return txt, Fraction(txt)
    op = random.choice(['+', '-', '*', '/', '^', 'neg', 'paren', '+', '-', '*'])
    a_t, a_v = gen(depth - 1)
    if op == 'neg':
        return f"-({a_t})", -a_v
    if op == 'paren':
        return f"({a_t})", a_v
    b_t, b_v = gen(depth - 1)
    if op == '^':
        e = random.randint(-3, 4)
        if a_v == 0 and e <= 0:
            return a_t, a_v
        return f"({a_t})^{'(' + str(e) + ')' if e < 0 else e}", a_v ** e
    # wrap operands that are not atoms so precedence is explicit sometimes, implicit other times
    def w(t, force):
        return f"({t})" if (force or random.random() < 0.5) else t
    if op == '+':
        return f"{a_t} + {b_t}", a_v + b_v
    if op == '-':
        return f"{a_t} - ({b_t})", a_v - b_v
    if op == '*':
        return f"({a_t}) * ({b_t})", a_v * b_v
    if b_v == 0:
        return a_t, a_v
    return f"({a_t}) / ({b_t})", a_v / b_v

out = []
for _ in range(int(sys.argv[2]) if len(sys.argv) > 2 else 300):
    t, v = gen(random.randint(1, 4))
    out.append({"text": t, "num": str(v.numerator), "den": str(v.denominator)})
print(json.dumps(out))
