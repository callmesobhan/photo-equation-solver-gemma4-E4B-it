// ======================================================================
// 15. Built-in help:  {"equation": "help"}  or  "help calculus"  - the full command list, offline.
//     (SKILL.md stays short; the model asks for the details only when it needs them.)
// ======================================================================
const HELP = {};
HELP.index = [
  'PHOTO MATH SOLVER - help topics (ask with  help <topic>):',
  '  syntax      how to write the math (digits, letters, ^, sqrt, fractions, matrices, units)',
  '  equations   equations, systems, inequalities, formulas ("solve for t"), complex numbers',
  '  calculus    integrate, diff, limit, taylor, sum, product, differential equations',
  '  algebra     factor, expand, simplify, apart, gcd, lcm, divide, complex numbers',
  '  matrix      determinant, inverse, eigenvalues, rank, systems, vectors',
  '  number      primes, divisors, modular arithmetic, counting, sequences, sets, number bases',
  '  stats       mean, standard deviation, regression, binomial/normal/t/chi-square, tests',
  '  geometry    shapes, triangles, coordinates, conic sections',
  '  units       unit conversion;  finance;  chemistry;  physics',
  '  plot        graphs of functions, parametric and polar curves',
  'Write every command as name(arguments). The answer always starts with "Read as:" - check it matches the picture.',
].join('\n');
HELP.syntax = [
  'SYNTAX',
  '  digits and letters:  2x + 3 = 7,  x^2,  x^(1/3),  sqrt(x),  cbrt(x),  root(3, x),  |x|,  pi,  e,  i (imaginary unit)',
  '  fractions: 1/2, (x+1)/(x-1), \\frac{a}{b} is understood;  percent: 15% of 80;  factorial: 5!',
  '  functions: sin cos tan cot sec csc asin acos atan sinh cosh tanh exp ln log (base 10) log(x, base) log2 abs floor ceil round(x, d)',
  '  degrees: 30° is read as 30*pi/180;  letters keep their case (F = m a, E = m c^2 are different from f, e)',
  '  subscripts: x_1, x1 (when x2 also appears), R_1;  derivatives: y\', y\'\', dy/dx, d/dx;  integrals: ∫_a^b f dx;  limits: lim_(x->a);  sums: Σ_(k=1)^n',
  '  several problems: separate with ; or a new line.  Matrices: [[1,2],[3,4]].  Points: [x, y].  Lists: [1, 2, 3].',
  '  commands can be mixed with arithmetic:  ncr(5,2) * 3 + 1,   integrate(x^2, x, 0, 1) + sqrt(2)',
  '  named arguments: triangle(a=3, b=4, C=90),  suvat(u=0, a=9.8, t=3),  circle(d=10)',
  '  the tool field "solve_for" picks the unknown when a formula has several letters.',
].join('\n');
HELP.equations = [
  'EQUATIONS',
  '  one unknown: any polynomial, rational, radical, exponential, logarithmic, trig or absolute-value equation (exact when possible)',
  '  systems: x + y = 10; x - y = 2     (linear exactly, non-linear by search)',
  '  inequalities: x^2 - 5x + 6 < 0,  (x+1)/(x-2) >= 0,  |x - 3| <= 2,  1 < 2x + 1 <= 7',
  '  formulas with several letters:  v = u + a*t, solve for t     d = v*t + a*t^2/2; solve for t     1/f = 1/u + 1/v for v',
  '  complex numbers: (3+4i)(1-2i),  sqrt(-4),  z^2 = 3 + 4i,  (2+i)z = 3 - i,  nthroots(8, 3)   (see help algebra)',
  '  ODEs: y\' = 2y,  y\'\' + y = 0,  y\' + y = x with y(0) = 1',
].join('\n');
HELP.calculus = [
  'CALCULUS',
  '  integrate(f, x)                    indefinite integral (checked by differentiating); also ∫ f dx',
  '  integrate(f, x, a, b)              definite integral, a and b may be oo / -oo (improper)',
  '  diff(f, x)  diff(f, x, n)          derivative, n-th derivative;   f\' and dy/dx also work',
  '  limit(f, x, a)  limit(f, x, a, 1)  limit; the 4th argument 1 or -1 selects the side;  a may be oo',
  '  taylor(f, x, a, n)                 Taylor polynomial of order n around a  (maclaurin for a = 0)',
  '  sum(f, k, a, b)  product(f, k, a, b)   finite and infinite sums (convergence is reported)',
  '  ODEs: y\' = 3y,  y\' + 2y = e^x,  y\'\' - 3y\' + 2y = 0,  y\'\' + y = sin(x),  with initial conditions y(0) = 1, y\'(0) = 0',
].join('\n');
HELP.algebra = [
  'ALGEBRA AND COMPLEX NUMBERS',
  '  factor(x^4 - 1)   factor(360)   expand((x+1)^5)   simplify(sin(x)^2 + cos(x)^2)',
  '  apart((3x+2)/(x^2-x-2))            partial fractions;   divide(x^3+1, x+1)   polynomial division',
  '  gcd(12, 18) gcd(x^2-1, x^2+2x+1)   lcm(4, 6)   (also with 3 or more numbers)',
  '  complex: write i;  (1+i)^10,  1/(2+i),  abs(3+4i),  e^(i*pi),  conj(z),  re(z),  im(z),  arg(z)',
  '           polar(1+i)   rect(r, theta)   cis(theta)   nthroots(z, n)   unityroots(n)',
  '           z^2 + 2z + 5 = 0,  (2+i)z = 3 - i   (equations of degree 1 or 2 with complex coefficients)',
  '  formulas: solve for any letter,  e.g. A = P*e^(r*t), solve for t',
].join('\n');
HELP.matrix = [
  'LINEAR ALGEBRA (exact fractions)   matrix = [[1,2],[3,4]],  vector = [1,2,3]',
  '  det(A) inv(A) transpose(A) trace(A) rank(A) rref(A) nullspace(A) colspace(A) charpoly(A)',
  '  eigen(A)  (eigenvalues + eigenvectors)   diagonalize(A)   lu(A)   linsolve(A, b)   A*B   A^3   A^-1   2A + B',
  '  dot(u, v) cross(u, v) norm(v) normalize(v) angle(u, v) proj(u, v)',
  '  A system  2x + y = 5; x - y = 1  can also be written directly as equations.',
].join('\n');
HELP.number = [
  'NUMBER THEORY, COUNTING, SEQUENCES, SETS',
  '  isprime(n) nextprime(n) prevprime(n) primes(a, b) primepi(n) factor(n) divisors(n) totient(n) sigma(n) numdivisors(n) mobius(n) radical(n) digitsum(n)',
  '  mod(a, m)  or  17 mod 5       modinv(a, m)   modpow(b, e, m)   orderof(a, m)   primitiveroot(p)   legendre(a, p)',
  '  crt([2,3],[3,5])  or  x ≡ 2 (mod 3), x ≡ 3 (mod 5)       3x ≡ 4 (mod 7)       diophantine(3x + 5y, 1)  (3x+5y=1 in integers)',
  '  factorial(n)  ncr(n, k)  (or 5 choose 2, C(5,2), 5C2)   npr(n, k)   multiset(n, k)   multinomial(2,3,1)   catalan(n)',
  '  fibonacci(n) lucas(n) derangements(n) stirling1(n,k) stirling2(n,k) bell(n) partitions(n)',
  '  sequence(2, 6, 12, 20)   next terms + general term (arithmetic, geometric, polynomial, Fibonacci-type)',
  '  arith(a1, d, n)  nth term and sum;   geom(a1, r, n)  nth term and sum (infinite sum when |r| < 1)',
  '  union([1,2],[2,3]) intersection(A, B) setdiff(A, B) symdiff(A, B) powerset(n)',
  '  binary(10) octal(64) hex(255) tobase(n, b) frombase(1011, 2);   0xFF, 0b101, 1011_2, (ff)_16 are understood',
].join('\n');
HELP.stats = [
  'STATISTICS (data as a list: mean([2,4,4,5]) or mean(2,4,4,5))',
  '  mean median mode variance (sample) popvariance stdev (sample) popstdev iqr quartiles percentile(list, p) summary(list) zscore(x, mean, sd) max min',
  '  correlation(xs, ys)   covariance(xs, ys)   linreg(xs, ys)   linreg(xs, ys, x0) predicts y at x0',
  '  expect([values], [probabilities])   bayes(P(A), P(B|A), P(B|not A))',
  '  binompdf(n, p, k) binomcdf(n, p, k)  (binomcdf(n, p, a, b) = P(a <= X <= b))   poissonpdf(lambda, k) poissoncdf   geometpdf(p, k) geometcdf   hyperpdf(N, K, n, k)',
  '  normalcdf(x)  normalcdf(x, mean, sd)  normalcdf(a, b, mean, sd)  (use oo for infinity)   normalpdf   invnorm(p, mean, sd)   zcrit(95)',
  '  tcdf(t, df) invt(p, df) tcrit(0.95, df)   chi2cdf(x, df) invchi2(p, df)   fcdf(f, d1, d2)',
  '  zinterval(mean, sigma, n, 0.95)   tinterval(mean, s, n, 0.95)  or tinterval([data], 0.95)   propinterval(x, n, 0.95)',
  '  ztest(mean, mu0, sigma, n)   ttest(mean, s, n, mu0)  or ttest([data], mu0)   proptest(x, n, p0)   chisqtest([[10,20],[30,40]])  or  chisqtest(observed, expected)',
].join('\n');
HELP.geometry = [
  'GEOMETRY',
  '  circle(r) circle(d=10)  sphere(r)  cylinder(r, h)  cone(r, h)  box(l, w, h)  cube(s)  pyramid(B, h)  rectangle(w, h)  square(s)',
  '  trapezoid(a, b, h)  parallelogram(b, h)  rhombus(p, q)  ellipse(a, b)  sector(r, degrees)  polygon(n, side)  hypotenuse(a, b)  leg(c, a)',
  '  triangle(a, b, c)  or named parts  triangle(a=3, b=4, C=60)  (sides a b c, angles A B C in degrees; SSS SAS ASA AAS SSA)',
  '  righttriangle(a=3, b=4)   righttriangle(c=10, A=30)',
  '  distance([1,2],[4,6])  midpoint(P, Q)  slope(P, Q)  line(P, Q)  pointlinedistance(x0, y0, a, b, c)  polygonarea([0,0],[4,0],[4,3])  centroid(P, Q, R)',
  '  conic sections: just write the equation:  x^2 + y^2 - 6x + 4y - 12 = 0,  x^2/9 + y^2/4 = 1,  y = x^2 - 4x + 3',
  '                  (circle, ellipse, parabola, hyperbola: center, radius, foci, vertices, directrix, asymptotes)',
].join('\n');
HELP.units = [
  'UNITS, FINANCE, CHEMISTRY, PHYSICS',
  '  convert 5 km to miles    72 °F to °C    60 mph to km/h    2.5 GB to MB    1 atm to psi   (length, mass, time, area, volume, speed, force, pressure, energy, power, data, angle, temperature)',
  '  compound(1000, 5%, 10)  compound(P, r, years, n per year)   continuous(P, r, t)   simpleinterest(P, r, t)',
  '  loan(200000, 6.5, 30)  (monthly payment)   annuityfv(pmt, rate, N)   annuitypv(pmt, rate, N)   npv(rate, cf0, cf1, ...)   irr(cf0, cf1, ...)   effrate(r, n)   doubletime(r)',
  '  pctchange(old, new)   pctof(part, whole)   ratio(12, 18, 30)   sci(12345.678)   sigfigs(x, n)',
  '  molarmass(Ca(OH)2)   percentcomp(C6H12O6)   moles(18, H2O)   grams(2, NaCl)   balance H2 + O2 -> H2O   ph(0.001)   poh(x)   hconc(pH)',
  '  suvat(u=0, a=9.8, t=3)  (give 3 of s u v a t)   projectile(20, 30)  (speed, angle in degrees)   freefall(45)',
  '  any physics formula: write it as an equation and solve for a letter  (F = m*a;  v^2 = u^2 + 2*a*s solve for s)',
].join('\n');
HELP.plot = [
  'PLOTS (the picture is returned to the chat; zeros, extrema and the y-intercept are listed)',
  '  plot(sin(x), x, -2*pi, 2*pi)     plot(x^2, 2x+3, x, -3, 4)  (up to 6 functions)     plot y = x^2 - 4',
  '  plotparam(cos(t), sin(2t), t, 0, 2*pi)       plotpolar(1 + cos(t), t, 0, 2*pi)',
].join('\n');
const HELP_ALIAS = {
  '': 'index', help: 'index', commands: 'index', all: 'index', topics: 'index', input: 'syntax', notation: 'syntax', solve: 'equations', inequalities: 'equations', systems: 'equations', formulas: 'equations',
  ode: 'calculus', integrals: 'calculus', derivatives: 'calculus', limits: 'calculus', series: 'calculus', complex: 'algebra', matrices: 'matrix', vectors: 'matrix', linear: 'matrix', 'linear algebra': 'matrix',
  discrete: 'number', counting: 'number', probability: 'stats', statistics: 'stats', geometry: 'geometry', conic: 'geometry', conics: 'geometry', triangles: 'geometry',
  finance: 'units', chemistry: 'units', physics: 'units', conversion: 'units', graph: 'plot', plots: 'plot', plotting: 'plot', graphs: 'plot',
};
/** The help text for a request such as "help", "help calculus" or "commands", else null. */
function helpFor(text) {
  const m = /^\s*(?:please\s+)?(?:help|commands|what\s+can\s+you\s+do|\?)\s*(?:me\s+)?(?:with\s+|on\s+|about\s+|for\s+)?([a-z ]*?)\s*[?.!]*\s*$/i.exec(String(text));
  if (!m) return null;
  const topic = m[1].toLowerCase().trim();
  const key0 = HELP[topic] ? topic : HELP_ALIAS[topic];
  if (!key0 || !HELP[key0]) return HELP.index + '\n(unknown topic "' + topic + '")';
  return HELP[key0];
}
