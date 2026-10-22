// ======================================================================
// 15. Built-in help:  {"equation": "help"}  or  "help calculus"  - the full command list, offline.
//     (SKILL.md stays short; the model asks for the details only when it needs them.)
// ======================================================================
const HELP = {};
HELP.index = [
  'PHOTO MATH SOLVER - help topics (ask with  help <topic>):',
  '  syntax      how to write the math (digits, letters, ^, sqrt, fractions, matrices, units)',
  '  equations   equations, systems, inequalities, formulas ("solve for t"), complex numbers',
  '  calculus    integrate, diff, limit, taylor, sum, product, tangent lines, curve study, areas and volumes',
  '  ode         differential equations (first order, linear of any order, systems) and Laplace transforms',
  '  logic       truth tables, tautologies, equivalent formulas, minimal forms;  graph theory (degrees, paths, spanning trees, flows, colouring);  recurrence relations',
  '  curves      parametric and polar curves (slope, length, area), curvature, velocity, line integrals, potential functions, coordinate systems',
  '  numerical   Euler / Runge-Kutta, trapezoid / Simpson rules, bisection / secant, interpolation, splines, curve fitting',
  '  algebra     factor, expand, simplify, apart, gcd, lcm, divide, complex numbers',
  '  matrix      determinant, inverse, eigenvalues, rank, systems, vectors',
  '  number      primes, divisors, modular arithmetic, counting, sequences, sets, number bases',
  '  stats       mean, standard deviation, regression, binomial/normal/t/chi-square, tests',
  '  multivar    partial derivatives, gradient, Hessian, double integrals, critical points of f(x, y), Lagrange multipliers\n  optimize    linear programming (maximize ... subject to ...), maxima and minima, Newton\'s method',
  '  geometry    shapes, triangles, coordinates, conic sections; planes, lines, spheres and quadric surfaces in space',
  '  units       unit conversion;  physics formulas\n  chemistry   molar mass, balancing, stoichiometry, limiting reagent, empirical formulas, pH, buffers, gases, elements, electron configurations\n  finance     interest, loans and amortization, bonds, depreciation, NPV / IRR / MIRR, growth rates',
  '  plot        graphs of functions, parametric and polar curves, implicit curves, inequality regions, contour maps, slope fields, scatter plots, histograms, box plots, shaded distributions',
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
  '  tangent(f, x, a)                   tangent and normal line at x = a',
  '  critical(f, x)  critical(f, x, a, b)   critical points with max/min classification; with [a, b] also the absolute max and min',
  '  inflection(f, x)   analyze(f, x)       full study: domain, intercepts, asymptotes, increasing/decreasing, extrema, inflection, concavity',
  '  domain(f, x)   inversefunction(f, x)   compose(f, g, x)   implicit(x^2 + y^2 - 25)  (dy/dx and d2y/dx2)   newton(f, x, x0)',
  '  areabetween(f, g, x)  or  areabetween(f, g, x, a, b)   volumerev(f, x, a, b)  volumerev(f, g, x, a, b)  (about the x-axis)',
  '  shells(f, x, a, b)  (about the y-axis)   arclength(f, x, a, b)   surfacearea of revolution: surfacearearev(f, x, a, b)   avgvalue(f, x, a, b)',
  '  differential equations and Laplace transforms:  help ode',
].join('\n');
HELP.logic = [
  'LOGIC AND GRAPHS',
  '  truth tables:  truth table of p and (q or not r)   p -> q   (p and q) or not r   p xor q   (connectives: and or not xor -> <-> nand nor, or the symbols ∧ ∨ ¬ ⊕ → ↔)',
  '                 not (p and q) equivalent to (not p) or (not q)    tells whether two formulas are equivalent;  also tautology / contradiction, normal forms and the simplest sum of products',
  '  graphs are lists of edges:  graphinfo([[1,2],[2,3],[3,1],[3,4]]) [graphtheory]  (degrees, components, bipartite, Euler path)   digraph(edges)',
  '     weighted:  shortestpath([[a,b,4],[a,c,1],[c,b,2]], a, b) [dijkstra]   mst([[a,b,4],[a,c,1],[c,b,2]]) [kruskal]   maxflow([[s,a,10],[a,t,7]], s, t)',
  '     coloring(edges) [chromatic]   topsort(directed edges) [topologicalsort]   bfs(edges, start)   dfs(edges, start)',
  '  recurrence relations: see  help number',
].join('\n');
HELP.curves = [
  'PARAMETRIC AND POLAR CURVES, MOTION IN SPACE, LINE INTEGRALS',
  '  parametric:  paramdiff(x(t), y(t), t, t0)  (dy/dx, d²y/dx², tangent line)   paramlength(x(t), y(t), t, a, b)  or  paramlength([x(t), y(t), z(t)], t, a, b)   paramarea(x(t), y(t), t, a, b)',
  '  polar:  polararea(r, t, a, b)   polarlength(r, t, a, b)   polarslope(r, t, t0)      e.g. polararea(1 + cos(t), t, 0, 2*pi)    (t stands for the angle θ)',
  '  coordinates:  topolar(x, y)  torect(r, θ)  tocylindrical(x, y, z)  fromcylindrical(r, θ, z)  tospherical(x, y, z)  fromspherical(ρ, φ, θ)',
  '  motion:  velocity([x(t), y(t), z(t)], t, t0) [acceleration, speed]   curvature([x(t), y(t)], t, t0)  or  curvature(f, x, x0)   tnb([x(t), y(t), z(t)], t, t0)  (T, N, B, curvature, torsion)',
  '  fields:  lineintegral([P, Q], [x(t), y(t)], t, a, b)  (∫F·dr)   lineintegral(f, [x(t), y(t)], t, a, b)  (∫f ds)   potential([P, Q, R])  (conservative? potential function)',
  '  see also: grad, curl, divergence in  help multivar;  arclength(f, x, a, b)  for y = f(x)',
].join('\n');
HELP.numerical = [
  'NUMERICAL METHODS (the iterations are done in exact fractions while the numbers stay rational)',
  "  ODE y' = f(x, y):  euler(f, x0, y0, h, xend)   heun(...) [improvedeuler]   rk2(...) [midpointmethod]   rk4(...) [rungekutta]   e.g. euler(x + y, 0, 1, 0.1, 0.5)",
  '  integrals:  trapezoid(f, a, b, n) [trapezoidrule, trapezoidal]  simpson(f, a, b, n)  midpointrule(f, a, b, n)  leftsum / rightsum(f, a, b, n)  riemann(f, a, b, n, left|right|mid)   (also the exact value, the error and the error bound)',
  '              trapezoidn(f, a, b, tol)  simpsonn(f, a, b, tol)  midpointn(f, a, b, tol)   smallest n that guarantees an error below tol',
  '  roots:  bisection(f, a, b, steps)  secant(f, x0, x1, steps)  falseposition(f, a, b, steps)  fixedpoint(g, x0, steps)  newton(f, x, x0, steps)',
  '  data:  interpolate([0,1,2], [1,3,7], 1.5) [newtoninterp]  polyfit(xs, ys, degree, x0)  spline(xs, ys, x0) [naturalspline]  difftable([1,4,9,16])  numdiff(f, x0, h) [finitedifference]',
].join('\n');
HELP.ode = [
  'DIFFERENTIAL EQUATIONS (write the equation as it is; add initial conditions after a comma or semicolon: y(0) = 1, y\'(0) = 0)',
  '  first order:  y\' = 3y   y\' + 2y = e^x   y\' = x*y   y\' = y(1 - y)   y\' - y/x = x^2   y\' + y = x*y^3 (Bernoulli)   y\' = (x + y)/x (homogeneous)',
  '                (x + y) dx + (x - y) dy = 0   or   M dx + N dy = 0   (exact equations and integrating factors depending on x or y only)',
  '  linear, constant coefficients, any order:  y\'\' - 3y\' + 2y = 0   y\'\' + y = sin(x)   y\'\'\' - y = e^(2x)   y\'\' + 4y = tan(2x)   (forcing: polynomials, exponentials, sin, cos, sinh, cosh, products; order 2 also tan, sec, ln, 1/x ... by variation of parameters)',
  '  Euler-Cauchy:  x^2*y\'\' + x*y\' + y = ln(x)         systems:  x\' = 3x + y; y\' = x + 3y; x(0) = 1, y(0) = 0   (2 or 3 equations, constant coefficients)',
  '  laplace(f, t)   laplace(f, t, s)   ilaplace(F, s)   ilaplace(F, s, t)       e.g. laplace(t^2*e^(-3t) + sin(2t), t),  ilaplace((s+1)/(s^2+2s+5), s)',
  '  every solution is checked by substituting it back into the equation',
].join('\n');
HELP.multivar = [
  'SEVERAL VARIABLES',
  '  partial derivatives: diff(x^2*y, y)   grad(f, x, y)   grad(f, [x, y], [1, 2])  (gradient at a point)   hessian(f, x, y)   laplacian(f, x, y, z)',
  '  jacobian([f, g], [x, y])   divergence([P, Q, R], [x, y, z])   curl([P, Q, R], [x, y, z])   directional(f, [x, y], [a, b], [u, v])   tangentplane(f, x, y, a, b)',
  '  critical points of f(x, y) (and f(x, y, z)) with the second-derivative test:   critical(x^3 - 3*x*y + y^3, x, y)',
  '  Lagrange multipliers:   lagrange(x*y, x + y, 10, x, y)   (maximise/minimise f on g = c);  lagrange(f, g, x, y) means g = 0',
  '  double and triple integrals are nested:   integrate(integrate(x*y, y, 0, x), x, 0, 2)   (inner limits may contain the outer variable)',
].join('\n');
HELP.optimize = [
  'OPTIMISATION',
  '  linear programming, written as in the book (up to 4 variables, exact):',
  '     maximize 3x + 2y subject to x + y <= 4, x <= 3, x, y >= 0',
  '     minimize 2x + 3y subject to x + y >= 4, x + 3y >= 6, x, y >= 0          add "x and y are integers" for integer programs',
  '     answers: the optimum, every corner point of the feasible region, "unbounded" or "no feasible solution"',
  '  one variable: critical(f, x)   critical(f, x, a, b)  (absolute max/min on [a, b])   analyze(f, x)   newton(f, x, x0)',
  '  two variables: critical(f, x, y)   lagrange(f, g, c, x, y)',
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
  '  det(A) inv(A) transpose(A) trace(A) rank(A) rref(A) nullspace(A) [kernel] colspace(A) [columnspace] charpoly(A)',
  '  eigen(A) [eig]  (eigenvalues + eigenvectors)   diagonalize(A)   lu(A)   linsolve(A, b)   A*B   A^3   A^-1   2A + B',
  '  dot(u, v) cross(u, v) norm(v) [magnitude, length] normalize(v) angle(u, v) proj(u, v) [projection]',
  '  gramschmidt([1,1,0],[1,0,1],[0,1,1])  [orthogonalize, orthonormalize]   orthogonal and orthonormal basis (rows of a matrix also work)',
  '  qr(A) [qrdecomposition]  Q (orthonormal columns) and R (upper triangular), exact radicals   cholesky(A) [choleskydecomposition, ldl]  A = G Gᵀ and the rational L D Lᵀ',
  '  definite(A) [posdef, positivedefinite, definiteness, classifymatrix]  positive / negative (semi)definite or indefinite, with minors and eigenvalue signs',
  '  pinv(A) [pseudoinverse, moorepenrose]  exact Moore-Penrose inverse   leastsquares(A, b) [lstsq, normalequations]  x̂, fitted values, residual (minimum-norm when rank-deficient)',
  '  svd(A) [singularvalues]  singular values (exact when possible), rank, norm, condition number, U and V as decimals',
  '  expm(A) [matrixexp, matrixexponential]  e^A   expm(A, t)  e^(At) exactly when the eigenvalues are rational or A is 2×2   jordan(A) [jordanform]  Jordan form J and P with A = P J P⁻¹ (rational eigenvalues)',
  '  A system  2x + y = 5; x - y = 1  can also be written directly as equations.',
].join('\n');
HELP.number = [
  'NUMBER THEORY, COUNTING, SEQUENCES, SETS',
  '  isprime(n) nextprime(n) prevprime(n) primes(a, b) primepi(n) factor(n) divisors(n) totient(n) sigma(n) numdivisors(n) mobius(n) radical(n) digitsum(n)',
  '  mod(a, m)  or  17 mod 5       modinv(a, m)   modpow(b, e, m)   orderof(a, m)   primitiveroot(p)   legendre(a, p)',
  '  crt([2,3],[3,5])  or  x ≡ 2 (mod 3), x ≡ 3 (mod 5)       3x ≡ 4 (mod 7)  =  congruence(3x, 4, 7) [solvecongruence]       diophantine(3x + 5y, 1)  (3x+5y=1 in integers)',
  '  factorial(n)  ncr(n, k)  (or 5 choose 2, C(5,2), 5C2)   npr(n, k)   multiset(n, k)   multinomial(2,3,1)   catalan(n)',
  '  fibonacci(n) lucas(n) derangements(n) stirling1(n,k) stirling2(n,k) bell(n) partitions(n)',
  '  dice(2, 6)  dice(3, 6, 10)  (distribution / P(sum = 10) of 3 six-sided dice)   anagrams of MISSISSIPPI  (distinct arrangements of the letters)   birthday(23)   pascal(6)   circular(8)',
  '  sequence(2, 6, 12, 20)   next terms + general term (arithmetic, geometric, polynomial, Fibonacci-type)',
  '  arith(a1, d, n)  nth term and sum;   geom(a1, r, n)  nth term and sum (infinite sum when |r| < 1)',
  '  union([1,2],[2,3]) intersection(A, B) setdiff(A, B) symdiff(A, B) powerset(n)',
  '  euclid(252, 105) [bezout]  gcd steps and Bézout coefficients   cfrac(355/113), cfrac(sqrt(7)), cfrac(pi, 8) [continuedfraction]   pell(61) pell(13, -1)   collatz(27)   egyptian(4/13)   sum2sq(65)   farey(5)   hanoi(4)   josephus(7, 3)   polygonal(5, 10) [figurate, triangular]',
  '  recurrences:  a_n = 5a_(n-1) - 6a_(n-2), a_0 = 1, a_1 = 0   (closed form + first terms)   or  linrec([5, -6], 0, [1, 0], 10)  for a(n) = 5a(n−1) − 6a(n−2) + f(n) [recurrence]',
  '  binary(10) octal(64) hex(255) tobase(n, b) frombase(1011, 2);   0xFF, 0b101, 1011_2, (ff)_16 are understood',
].join('\n');
HELP.stats = [
  'STATISTICS (data as a list: mean([2,4,4,5]) or mean(2,4,4,5))',
  '  mean median mode variance (sample) popvariance stdev (sample) popstdev iqr quartiles percentile(list, p) summary(list) datarange(list) [spread] zscore(x, mean, sd) max min',
  '  correlation(xs, ys)   covariance(xs, ys)   linreg(xs, ys)   linreg(xs, ys, x0) predicts y at x0',
  '  expect([values], [probabilities])   bayes(P(A), P(B|A), P(B|not A))',
  '  binompdf(n, p, k) binomcdf(n, p, k)  (binomcdf(n, p, a, b) = P(a <= X <= b))   poissonpdf(lambda, k) poissoncdf   geometpdf(p, k) geometcdf   hyperpdf(N, K, n, k)',
  '  normalcdf(x)  normalcdf(x, mean, sd)  normalcdf(a, b, mean, sd)  (use oo for infinity)   normalpdf   invnorm(p, mean, sd)   zcrit(95)',
  '  tcdf(t, df) invt(p, df) tcrit(0.95, df)   chi2cdf(x, df) invchi2(p, df)   fcdf(f, d1, d2)   expcdf(rate, x) [exponentialcdf]',
  '  zinterval(mean, sigma, n, 0.95)   tinterval(mean, s, n, 0.95)  or tinterval([data], 0.95)   propinterval(x, n, 0.95)',
  '  more distributions (pdf / cdf):  unifpdf unifcdf(x, a, b)  exppdf(x, rate) invexp(p, rate)  gammapdf gammacdf(x, shape, scale) invgamma  betapdf betacdf(x, a, b) invbeta  weibullpdf weibullcdf(x, k, lambda)  lognormpdf lognormcdf(x, mu, sigma)  tpdf chi2pdf fpdf  invf(p, d1, d2)  negbinpdf negbincdf(k, r, p)',
  '  two samples:  ttest2(m1, s1, n1, m2, s2, n2)  or  ttest2([data1], [data2])  (Welch)   ttest2pooled(...)   tinterval2(..., 0.95) tinterval2pooled   pairedt([before], [after])   ztest2(m1, s1, n1, m2, s2, n2)   prop2test(x1, n1, x2, n2)   prop2interval(x1, n1, x2, n2, 0.95)',
  '  other tests:  anova([g1], [g2], [g3])   corrtest(xs, ys)   vartest(s, n, sigma0)   ftest2(s1, n1, s2, n2)   varinterval(s, n, 0.95)   samplesize(sigma, E, conf)   samplesizeprop(E, conf, p)   clt(mu, sigma, n, x)   binomnormal(n, p, k)',
  '  descriptive:  outliers(list)  fivenum  mad  skewness  kurtosis  geomean  harmean  rms  cv  wmean([values], [weights])  zscores  percentrank(list, x)  freqtable(list, width)  stemleaf(list)  grouped([midpoints], [freqs])  ranks  spearman(xs, ys)  kendall(xs, ys)',
  '  regression:  multireg([[x1, x2], ...], [y...], [x1, x2])   expreg  powerreg  logreg (xs, ys, x0)     Markov chains: markov([[0.9,0.1],[0.5,0.5]], 3, [1,0])     coupon(n)',
  '  ztest(mean, mu0, sigma, n)   ttest(mean, s, n, mu0)  or ttest([data], mu0)   proptest(x, n, p0)   chisqtest([[10,20],[30,40]])  or  chisqtest(observed, expected)',
].join('\n');
HELP.geometry = [
  'GEOMETRY',
  '  circle(r) circle(d=10)  sphere(r)  cylinder(r, h)  cone(r, h)  box(l, w, h)  cube(s)  pyramid(B, h)  rectangle(w, h)  square(s)',
  '  trapezoid(a, b, h) [trapezium]  parallelogram(b, h)  rhombus(p, q)  ellipse(a, b)  sector(r, degrees)  polygon(n, side)  hypotenuse(a, b)  leg(c, a)',
  '  triangle(a, b, c)  or named parts  triangle(a=3, b=4, C=60)  (sides a b c, angles A B C in degrees; SSS SAS ASA AAS SSA)',
  '  righttriangle(a=3, b=4)   righttriangle(c=10, A=30)',
  '  distance([1,2],[4,6])  midpoint(P, Q)  slope(P, Q)  line(P, Q)  pointlinedistance(x0, y0, a, b, c)  polygonarea([0,0],[4,0],[4,3])  centroid(P, Q, R)',
  '  conic sections: just write the equation:  x^2 + y^2 - 6x + 4y - 12 = 0,  x^2/9 + y^2/4 = 1,  y = x^2 - 4x + 3',
  '                  (circle, ellipse, parabola, hyperbola: center, radius, foci, vertices, directrix, asymptotes)',
  'SPACE (3-D)   points and vectors [x, y, z];  a plane is [a, b, c, d] for ax + by + cz = d, or just the equation 2x + 3y - z = 5;  a line is a point and a direction',
  '  plane(P, Q, R) [planeinfo]  through three points   plane(P, normal)   plane(2x + 3y - z = 5)  normal, intercepts, distance from the origin   line3d(P, Q) [line3]  vector, parametric and symmetric form',
  '  pointplane(P, plane) [planedist]  distance and foot   pointline3d(P, A, d)  distance from P to the line through A with direction d   skewlines(A, d1, B, d2) [linedistance]  distance, intersection or parallel',
  '  lineplane(A, d, plane)  intersection point and angle   planeangle(p1, p2)   planeintersect(p1, p2)  line of intersection   (planes may be written as equations: planeangle(x + y + z = 3, x - y = 0))',
  '  triplescalar(u, v, w) [tripleproduct, parallelepiped]   tetrahedron(A, B, C, D) volume   trianglearea3d(A, B, C)   dircos(v) [directioncosines]   angle(u, v)   distance(P, Q)   midpoint   centroid',
  '  sphere([1,2,3], 5)  equation of a sphere from centre and radius   sphere(A, B)  from a diameter   sphere(A, B, C, D)  through four points   sphere(3)  volume and area',
  '  surfaces: write the equation  x^2/4 + y^2/9 + z^2 = 1,  z = x^2 + y^2,  x^2 + y^2 - z^2 = 1  [quadric(...), surface(...), sphereinfo(...)]  ellipsoid / sphere, hyperboloid, cone, paraboloid, cylinder, planes, with centre and standard form',
].join('\n');
HELP.units = [
  'UNITS AND PHYSICS',
  '  convert 5 km to miles    72 °F to °C    60 mph to km/h    2.5 GB to MB    1 atm to psi   (length, mass, time, area, volume, speed, force, pressure, energy, power, data, angle, temperature)',
  '  pctchange(old, new)   pctof(part, whole)   ratio(12, 18, 30)   sci(12345.678)   sigfigs(x, n)',
  '  suvat(u=0, a=9.8, t=3)  (give 3 of s u v a t)   projectile(20, 30)  (speed, angle in degrees)   freefall(45)',
  '  any physics formula: write it as an equation and solve for a letter  (F = m*a;  v^2 = u^2 + 2*a*s solve for s)',
  '  (chemistry and finance have their own topics: help chemistry, help finance)',
].join('\n');
HELP.chemistry = [
  'CHEMISTRY   (formulas are written as usual: Ca(OH)2, CuSO4·5H2O, Fe2(SO4)3)',
  '  molarmass(Ca(OH)2)   percentcomp(C6H12O6)   moles(18, H2O)   grams(2, NaCl)   molarity(0.5, 2)  molarity(5.85, NaCl, 0.5)',
  '  balance H2 + O2 -> H2O   (a bare reaction "H2 + O2 -> H2O" is balanced too)',
  '  stoich(H2 + O2 -> H2O, 4 g H2, H2O)  [stoichiometry]   grams / moles of a wanted substance;   limiting(H2 + O2 -> H2O, 4 g H2, 32 g O2)  [limitingreagent]   limiting reagent, theoretical yield, excess left   percentyield(actual, theoretical)',
  '  empirical(C 40, H 6.7, O 53.3)  [empiricalformula]  from percentages or masses (add ; 180 for a molar mass: molecular formula too)   molecular(CH2O, 180.16)  [molecularformula]',
  '  ph(0.001) poh(x) hconc(pH)   weakacid(1.8e-5, 0.10)  pH and percent ionization of a weak acid (exact quadratic)   weakbase(Kb, C)   buffer(4.76, 0.20, 0.10)  [hendersonhasselbalch]  pH from pKa (or Ka), [A-] and [HA]',
  '  dilution(12, 25, 0.5, x)  C1 V1 = C2 V2, the unknown written as x   idealgas(x, 22.4, 1, 273.15)  P (atm) V (L) n (mol) T (K) [gaslaw]   combinedgas(1, 2, 300, x, 1, 350)',
  '  halflife(5730, 10000, 100)  fraction / amount left after a time   decaytime(5730, 25%)  time to fall to a fraction',
  '  element(Fe)  element(26)  element(iron)  [elementinfo, periodic]   name, mass, period, group, block, configuration   electronconfig(Fe3+)  [electronconfiguration, econfig]  or  electron configuration of Cu',
].join('\n');
HELP.finance = [
  'FINANCE   (rates may be written 5%, 5 or 0.05)',
  '  compound(1000, 5%, 10)  compound(P, r, years, n per year)   continuous(P, r, t)   simpleinterest(P, r, t)   effrate(r, n)   doubletime(r)   rule72(6%)  [ruleof72]',
  '  loan(200000, 6.5, 30)  (monthly payment)   amortization(200000, 6%, 30)  [amortize, schedule]  payment, total interest and the first rows of the schedule: amortization(P, r, years, per year, rows)',
  '  loanbalance(200000, 6%, 30, 120)  [remainingbalance]  balance after 120 payments   payoff(10000, 8%, 300)  payments needed with a given payment',
  '  annuityfv(pmt, rate, N)   annuitypv(pmt, rate, N)   npv(rate, cf0, cf1, ...)   irr(cf0, cf1, ...)   mirr([-1000, 300, 400, 500], 10%, 12%)   payback([-1000, 300, 400, 500])  [paybackperiod]',
  '  bond(1000, 5%, 6%, 10, 2)  [bondprice]  price, current yield, duration, convexity   (face, coupon rate, yield, years, coupons per year)',
  '  straightline(10000, 1000, 5)   decliningbalance(10000, 1000, 5)  [doubledeclining, ddb]  (optional 4th argument: factor)   sumofyears(10000, 1000, 5)  [syd]   depreciation tables for cost, salvage value, life',
  '  cagr(1000, 1800, 5)   realrate(5%, 2%)  [fisher]   breakeven(5000, 25, 15)  (fixed costs, price, variable cost)   pctchange(old, new)',
].join('\n');
HELP.plot = [
  'PLOTS (the picture is returned to the chat; zeros, extrema and the y-intercept are listed)',
  '  plot(sin(x), x, -2*pi, 2*pi)     plot(x^2, 2x+3, x, -3, 4)  (up to 6 functions)     plot y = x^2 - 4',
  '  plotparam(cos(t), sin(2t), t, 0, 2*pi)       plotpolar(1 + cos(t), t, 0, 2*pi)',
  '  plotimplicit(x^2 + y^2 = 4)  [implicitplot]  any curve F(x, y) = 0, window optional: plotimplicit(x*y - 1, x, -4, 4, y, -4, 4)   contour(x^2 - y^2, x, -3, 3, y, -3, 3)  [contourplot, levelcurves]  level curves',
  '  plotregion(y > x^2, x + y < 3, x, -3, 3, y, -3, 5)  [region, shaderegion, feasibleregion]  shaded solution set of inequalities (exact corner points and area when the boundaries are lines);  or just write the inequalities:  x >= 0, y >= 0, x + y <= 4',
  '  slopefield(x - y, x, -3, 3, y, -3, 3, 0, 1)  [directionfield]  slope field of y\' = f(x, y) with solution curves through the given points (x0, y0, ...)',
  '  scatter([1,2,3,4],[2,4,5,8])  [scatterplot]  points with the least-squares line;  scatter(xs, ys, 2)  with a parabola (degree 0 = no fit)',
  '  histogram([2,3,3,4,5,7,8,9], 2)  [hist]  class width 2 (an optional 3rd number is the first class start);  histogram(data)  automatic number of bins;  histbins(data, 4)  4 equal bins',
  '  boxplot([2,3,3,4,5,7,40])  [boxwhisker]  five-number summary, fences, whiskers and outliers;  boxplot(list1, list2)  side by side',
  '  normalshade(0, 1, -1.96, 1.96)  [shadenormal]  shaded normal curve and its area (oo = infinity)   tshade(10, -2.228, 2.228)  [shadet]   chisqshade(4, 9.488, oo)  [shadechisq]',
].join('\n');
const HELP_ALIAS = {
  '': 'index', help: 'index', commands: 'index', all: 'index', topics: 'index', input: 'syntax', notation: 'syntax', solve: 'equations', inequalities: 'equations', systems: 'equations', formulas: 'equations',
  diffeq: 'ode', differential: 'ode', odes: 'ode', 'differential equations': 'ode', laplace: 'ode', transforms: 'ode', boolean: 'logic', graph: 'logic', graphs: 'logic', networks: 'logic', truthtable: 'logic', 'truth tables': 'logic', propositional: 'logic', recurrence: 'number', recurrences: 'number', parametric: 'curves', polar: 'curves', motion: 'curves', vectorfields: 'curves', lineintegrals: 'curves', coordinates: 'curves', numerics: 'numerical', numericalmethods: 'numerical', 'numerical methods': 'numerical', euler: 'numerical', rungekutta: 'numerical', quadrature: 'numerical', integration: 'calculus', interpolation: 'numerical', rootfinding: 'numerical', splines: 'numerical', lp: 'optimize', optimization: 'optimize', lagrange: 'multivar', multivariable: 'multivar', vectorcalculus: 'multivar', integrals: 'calculus', derivatives: 'calculus', limits: 'calculus', series: 'calculus', complex: 'algebra', matrices: 'matrix', vectors: 'matrix', linear: 'matrix', 'linear algebra': 'matrix',
  discrete: 'number', counting: 'number', probability: 'stats', statistics: 'stats', geometry: 'geometry', conic: 'geometry', conics: 'geometry', triangles: 'geometry',
  finance: 'finance', money: 'finance', loans: 'finance', interest: 'finance', chem: 'chemistry', chemistry: 'chemistry', stoichiometry: 'chemistry', acids: 'chemistry', elements: 'chemistry', physics: 'units', conversion: 'units', 'graph theory': 'logic', graphtheory: 'logic', graph: 'plot', plots: 'plot', plotting: 'plot', graphs: 'plot',
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
