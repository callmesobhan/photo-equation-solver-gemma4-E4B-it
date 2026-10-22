# Oracle cases for the series commands: the convergence class of every case is known from theory (p-series, geometric, ratio and root
# families, alternating series, log series); sympy's Sum.is_convergent is used as a cross-check of that knowledge where it can decide.
import json, sys, random, math
from fractions import Fraction as Fr
import sympy as sp
import signal
class _TO(Exception): pass
def _alarm(*a): raise _TO()
signal.signal(signal.SIGALRM, _alarm)

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
n = sp.symbols('n', positive=True, integer=True)
def add(term, expect, start=1, note='', sym=None):
    # expect: 'abs' | 'cond' | 'div'
    cases.append(dict(kind='conv', cmd='convergence(%s, n, %d)' % (term, start), expect=expect, term=term, start=start, note=note))
def ptxt(p):
    p = Fr(p).limit_denominator(1000)
    return str(p.numerator) if p.denominator == 1 else '(%d/%d)' % (p.numerator, p.denominator)

# p-series and shifts
for _ in range(10):
    p = rnd.choice([Fr(1, 2), Fr(2, 3), Fr(1), Fr(5, 4), Fr(3, 2), Fr(2), Fr(3), Fr(4, 3), Fr(7, 2), Fr(1, 3), Fr(11, 10)])
    a, b = rnd.randint(1, 4), rnd.randint(0, 5)
    base = 'n' if (a, b) == (1, 0) else '(%dn+%d)' % (a, b) if b else '(%d*n)' % a
    add('1/%s^%s' % (base, ptxt(p)), 'abs' if p > 1 else 'div')
# geometric
for _ in range(8):
    r = rnd.choice([Fr(1, 2), Fr(2, 3), Fr(-1, 3), Fr(3, 4), Fr(3, 2), Fr(2), Fr(-2), Fr(1), Fr(-3, 2), Fr(5, 4)])
    c = rnd.choice([1, 2, 5, 3])
    t = '%d*(%s)^n' % (c, ptxt(r))
    add(t, 'abs' if abs(r) < 1 else 'div', 0)
# ratio test families
for _ in range(10):
    a = rnd.choice([1, 2, 3, 5]); b = rnd.choice([2, 3, 4, 5, 10])
    add('n^%d/%d^n' % (a, b), 'abs')
    add('%d^n/n!' % b, 'abs', 1)
    add('n!/%d^n' % b, 'div')
    add('%d^n/n^%d' % (b, a), 'div')
for t, e in [('n!/n^n', 'abs'), ('(2*n)!/(n!)^2', 'div'), ('n^n/n!', 'div'), ('n!/(2*n)!', 'abs'), ('(n!)^2/(2*n)!', 'abs'), ('2^n*n!/n^n', 'abs'), ('3^n*n!/n^n', 'div'), ('n^2*(2/3)^n', 'abs'), ('n*(3/4)^n', 'abs'), ('n^3/3^n', 'abs'), ('(2*n)!/(3^n*(n!)^2)', 'div'), ('n!/(3*n)!', 'abs')]:
    add(t, e)
# root test families
for t, e in [('(n/(2*n+1))^n', 'abs'), ('(n/(n+1))^(n^2)', 'abs'), ('(1-1/n)^(n^2)', 'abs'), ('((n+1)/n)^(n^2)/3^n', 'abs'), ('((n+1)/n)^(n^2)/2^n', 'div'), ('(2*n/(n+1))^n', 'div'), ('(n/(3*n+1))^n', 'abs'), ('(3*n/(2*n+1))^n', 'div'), ('((2*n+1)/(3*n+2))^n', 'abs')]:
    add(t, e)
# rational functions: converges iff degree(den) - degree(num) >= 2
for _ in range(10):
    dn = rnd.randint(0, 3); dd = rnd.randint(1, 4)
    num = ' + '.join(['%d*n^%d' % (rnd.randint(1, 4), dn)] + ([str(rnd.randint(1, 5))] if rnd.random() < 0.5 else []))
    den = ' + '.join(['%d*n^%d' % (rnd.randint(1, 4), dd)] + (['n^%d' % (dd - 1)] if dd > 1 and rnd.random() < 0.5 else []) + ([str(rnd.randint(1, 5))] if rnd.random() < 0.5 else []))
    add('(%s)/(%s)' % (num, den), 'abs' if dd - dn >= 2 else 'div')
for t in [('1/(n^2+n)', 'abs'), ('1/(n*(n+1)*(n+2))', 'abs'), ('(sqrt(n+1)-sqrt(n))', 'div'), ('(sqrt(n+1)-sqrt(n))/n', 'abs'), ('1/sqrt(n^3+1)', 'abs'), ('1/sqrt(n^2+1)', 'div'), ('n/sqrt(n^5+2)', 'abs'), ('1/(n^(1+1/n))', 'div'), ('1/(n*sqrt(n))', 'abs'), ('sqrt(n)/(n^2+1)', 'abs'), ('sqrt(n)/(n+1)', 'div'), ('(n+1)/(n^3+n)', 'abs'), ('n/(n+1)', 'div'), ('(1+1/n)^n', 'div'), ('1/(1+1/n)^n', 'div'), ('n*sin(1/n)', 'div'), ('sin(1/n)', 'div'), ('1-cos(1/n)', 'abs'), ('1/n*sin(1/n)', 'abs'), ('arctan(1/n^2)', 'abs'), ('arctan(n)/n^2', 'abs'), ('(arctan(n))^2/n^2', 'abs'), ('ln(n)/n^2', 'abs', 2), ('ln(n)/n', 'div', 2), ('1/ln(n)', 'div', 2), ('1/(n*ln(n))', 'div', 2), ('1/(n*ln(n)^2)', 'abs', 2), ('1/(n*ln(n)^(3/2))', 'abs', 2), ('1/(n*ln(n)^(1/2))', 'div', 2), ('1/(n^(3/2)*ln(n))', 'abs', 2), ('ln(n)/n^(3/2)', 'abs', 2), ('1/(n*ln(n)*ln(ln(n)))', 'div', 3), ('n*e^(-n^2)', 'abs'), ('e^(-n)*n^3', 'abs'), ('n^2*e^(-n)', 'abs'), ('1/(2^n+1)', 'abs'), ('(2^n+3^n)/6^n', 'abs'), ('(2^n+3^n)/5^n', 'abs'), ('(2^n+3^n)/3^n', 'div'), ('(n+1)/2^n', 'abs'), ('cos(n)/n^2', 'abs'), ('sin(n)/n^3', 'abs'), ('(sin(n))^2/n^2', 'abs'), ('cos(n*pi)/n^2', 'abs')]:
    add(t[0], t[1], t[2] if len(t) > 2 else 1)
# alternating series
for _ in range(8):
    p = rnd.choice([Fr(1, 3), Fr(1, 2), Fr(1), Fr(3, 2), Fr(2), Fr(3)])
    add('(-1)^n/n^%s' % ptxt(p), 'abs' if p > 1 else 'cond')
    add('(-1)^n/(n+%d)^%s' % (rnd.randint(1, 4), ptxt(p)), 'abs' if p > 1 else 'cond')
for t, e, s0 in [('(-1)^n/ln(n)', 'cond', 2), ('(-1)^n*n/(n^2+1)', 'cond', 1), ('(-1)^n*n/(n+1)', 'div', 1), ('(-1)^n*(1+1/n)', 'div', 1), ('(-1)^(n+1)/sqrt(n)', 'cond', 1), ('(-1)^n/(n*ln(n))', 'cond', 2), ('(-1)^n*ln(n)/n', 'cond', 3), ('(-1)^n*n^2/(n^3+1)', 'cond', 1), ('(-1)^n/n!', 'abs', 0), ('(-1)^n*2^n/n!', 'abs', 0), ('(-2)^n/n', 'div', 1), ('(-1)^n*n/2^n', 'abs', 1), ('(-1)^n*sin(1/n)', 'cond', 1), ('(-1)^n/sqrt(n^2+1)', 'cond', 1)]:
    add(t, e, s0)

# radius and interval of convergence: R and the behaviour at both ends are known from theory
def lin(k, m):
    if (k, m) == (1, 0): return 'x'
    kx = 'x' if k == 1 else '-x' if k == -1 else '%dx' % k
    return '(%s%s)' % (kx, ('%+d' % m) if m else '')
for _ in range(14):
    a = rnd.choice([-2, -1, Fr(-1, 2), 0, 1, 2]); B = rnd.choice([1, 2, 3, 4]); k = rnd.choice([1, 1, 2, 3, -1]); m = rnd.choice([0, 0, 1, -1, 2, -3])
    base = lin(k, m)
    coef = '' if a == 0 else 'n*' if a == 1 else 'n^%s*' % ptxt(a)
    t = '%s%s^n' % (coef, base) + ('/%d^n' % B if B != 1 else '')
    centre = Fr(-m, k)
    R = Fr(B, abs(k))
    conv_plus = a < -1; conv_minus = a < 0
    left_is_minus = k > 0   # the left end of the x-interval corresponds to b = -B when k > 0
    left_conv = conv_minus if left_is_minus else conv_plus
    right_conv = conv_plus if left_is_minus else conv_minus
    cases.append(dict(kind='radius', cmd='radius(%s, n, x, 1)' % t, R=float(R), centre=float(centre), left=float(centre - R), right=float(centre + R), lc=left_conv, rc=right_conv))
for _ in range(6):
    a = rnd.choice([-2, -1, 0, 1]); B = rnd.choice([1, 2, 3, 4, 9]); j = rnd.choice([2, 3])
    coef = 'n^%d' % a if a not in (0, 1) else ('n' if a == 1 else '1')
    t = '%s*x^(%d*n)/%d^n' % (coef, j, B) if B != 1 else '%s*x^(%d*n)' % (coef, j)
    if coef == '1': t = t[2:]
    R = B ** (1 / j)
    conv = a < -1
    left = (a < 0) if j % 2 == 1 else conv      # an odd power turns the left end into the alternating series sum (-1)^n n^a
    cases.append(dict(kind='radius', cmd='radius(%s, n, x, 1)' % t, R=R, centre=0.0, left=-R, right=R, lc=left, rc=conv))
for t, R in [('x^n/n!', -1), ('3^n*x^n/n!', -1), ('x^(2*n)/(2*n)!', -1), ('n!*x^n', 0.0), ('n^n*x^n', 0.0), ('x^n/n^n', -1), ('(n!)^2*x^n/(2*n)!', 4.0)]:
    cases.append(dict(kind='radius', cmd='radius(%s, n, x, 0)' % t, R=R, centre=0.0, left=None, right=None, lc=None, rc=None))
# improper integrals over [a, oo): theory decides convergence; the value of convergent ones is checked with sympy
x = sp.symbols('x', positive=True)
def imp(text, expr, a, conv):
    val = None
    if conv:
        signal.alarm(2)
        try:
            val = float(sp.N(sp.integrate(expr, (x, a, sp.oo))))
        except BaseException:
            val = None
        finally:
            signal.alarm(0)
    cases.append(dict(kind='improper', cmd='integrate(%s, x, %s, oo)' % (text, a), conv=bool(conv), val=val))
for _ in range(10):
    p = rnd.choice([sp.Rational(1, 2), sp.Rational(9, 10), 1, sp.Rational(101, 100), sp.Rational(11, 10), sp.Rational(5, 4), sp.Rational(3, 2), 2, 3])
    a = rnd.choice([1, 2, 3])
    imp('1/x^%s' % ptxt(p), x ** (-p), a, p > 1)
    c, d = rnd.randint(1, 3), rnd.randint(1, 4)
    imp('1/(%d*x+%d)^%s' % (c, d, ptxt(p)), (c * x + d) ** (-p), a, p > 1)
for q in [sp.Rational(1, 2), 1, sp.Rational(3, 2), 2, 3]:
    imp('1/(x*ln(x)^%s)' % ptxt(q), 1 / (x * sp.log(x) ** q), 2, q > 1)
for k in (1, 2, 3):
    for p in (sp.Rational(3, 2), 2, sp.Rational(11, 10), sp.Rational(21, 20), 1, sp.Rational(9, 10)):
        imp('ln(x)^%d/x^%s' % (k, ptxt(p)), sp.log(x) ** k / x ** p, 2, p > 1)
for text, e, a, c in [('e^(-x)', sp.exp(-x), 0, True), ('x*e^(-x)', x * sp.exp(-x), 0, True), ('x^3*e^(-2*x)', x ** 3 * sp.exp(-2 * x), 0, True), ('1/(1+x^2)', 1 / (1 + x ** 2), 0, True), ('x/(1+x^2)', x / (1 + x ** 2), 0, False),
                      ('x/(1+x^3)', x / (1 + x ** 3), 0, True), ('1/sqrt(1+x^2)', 1 / sp.sqrt(1 + x ** 2), 0, False), ('x/(1+x^2)^2', x / (1 + x ** 2) ** 2, 0, True), ('e^x/x', sp.exp(x) / x, 1, False),
                      ('e^(-sqrt(x))', sp.exp(-sp.sqrt(x)), 0, True), ('1/(x^2+x)', 1 / (x ** 2 + x), 1, True), ('ln(x)/x^2', sp.log(x) / x ** 2, 1, True), ('ln(x)', sp.log(x), 2, False), ('1/ln(x)', 1 / sp.log(x), 2, False),
                      ('1/(x*ln(x))', 1 / (x * sp.log(x)), 2, False), ('1/(x*ln(x)*ln(ln(x)))', 1 / (x * sp.log(x) * sp.log(sp.log(x))), 3, False), ('atan(x)/x^2', sp.atan(x) / x ** 2, 1, True), ('x^2/(x^4+1)', x ** 2 / (x ** 4 + 1), 0, True)]:
    imp(text, e, a, c)
print(json.dumps(cases))
