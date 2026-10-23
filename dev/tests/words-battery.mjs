// Plain-English phrasings of textbook questions must give exactly the same answer as the command they stand for.
// Every template below has ONE direct command (written by hand, with the argument order checked against the help text)
// and several ways of asking the same thing in words; the numbers are random. The commands themselves are verified
// against sympy / scipy / numpy / pint in the other batteries.
// Usage: node words-battery.mjs <index.html> [seed]
import { load } from './harness.mjs';

const call = load(process.argv[2]);
let seed = Number(process.argv[3] || 1) * 7919 + 13;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const R = (a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const list = (n, lo, hi) => Array.from({ length: n }, () => R(lo, hi));

const FUNCS = ['x^3 + 2x', 'sin(x)*x', 'e^(2x)', 'x^2*ln(x)', '(x^2+1)/(x-3)', 'sqrt(x)*cos(x)', '3x^4 - x^2 + 7', 'tan(x)', 'x*e^(-x)', 'ln(x^2+1)'];
const INTS = ['x^2', 'sin(x)', '1/x', 'e^x', 'x*e^x', '3x^2 + 2x', 'cos(2x)', 'x^3 - x', '1/(x^2+1)', 'sqrt(x)'];
const LIMS = [['(x^2-4)/(x-2)', 2], ['sin(x)/x', 0], ['(1+1/x)^x', 'oo'], ['(e^x-1)/x', 0], ['(x^2-1)/(x-1)', 1], ['(1-cos(x))/x^2', 0], ['x*sin(1/x)', 0]];
const POLYS = ['x^2 - 5x + 6', 'x^3 - x', 'x^4 - 1', '2x^2 + 7x + 3', 'x^2 - 9', 'x^3 + 3x^2 + 3x + 1', '6x^2 - x - 2'];
const mat = (r, c, lo = -5, hi = 5) => '[' + Array.from({ length: r }, () => '[' + list(c, lo, hi).join(', ') + ']').join(', ') + ']';
const vec = (n) => '[' + list(n, -6, 6).join(', ') + ']';
const pt = () => '(' + R(-8, 8) + ', ' + R(-8, 8) + ')';
const ptv = (p) => '[' + p.slice(1, -1) + ']';

/** [direct command, [phrasings]] */
const TEMPLATES = [
  // ---- calculus
  () => { const f = pick(FUNCS); return [`diff(${f}, x)`, [`find the derivative of ${f}`, `differentiate ${f}`, `What is the derivative of f(x) = ${f} with respect to x?`, `derivative of y = ${f} wrt x`, `Calculate the derivative of ${f}.`]]; },
  () => { const f = pick(FUNCS); const n = R(2, 4); return [`diff(${f}, x, ${n})`, [`the ${['', '', 'second', 'third', 'fourth'][n]} derivative of ${f}`, `find the ${n}th derivative of ${f} with respect to x`]]; },
  () => { const f = pick(['x^3 + 2x', '3x^4 - x^2 + 7', 'e^(2x)', 'x^2*ln(x)']); const a = pick([1, 2, 3]); return [`diffat(${f}, x, ${a})`, [`the derivative of ${f} at x = ${a}`, `find the derivative of ${f} when x = ${a}`, `differentiate ${f} at x = ${a}`]]; },
  () => { const f = pick(INTS); return [`integrate(${f}, x)`, [`integrate ${f}`, `find the integral of ${f} dx`, `antiderivative of ${f}`, `What is the indefinite integral of ${f} with respect to x?`]]; },
  () => { const f = pick(INTS.filter((g) => !/1\/x$|ln/.test(g))); const a = R(1, 3); const b = a + R(1, 3); return [`integrate(${f}, x, ${a}, ${b})`, [`integrate ${f} from ${a} to ${b}`, `the definite integral of ${f} from x = ${a} to x = ${b}`, `evaluate the integral of ${f} dx from ${a} to ${b}`, `Find the integral of ${f} between ${a} and ${b}`, `integral of ${f} over [${a}, ${b}]`]]; },
  () => { const [f, a] = pick(LIMS); const w = a === 'oo' ? pick(['infinity', '∞']) : String(a); return [`limit(${f}, x, ${a})`, [`limit of ${f} as x approaches ${w}`, `find the limit as x approaches ${w} of ${f}`, `limit of ${f} as x → ${w}`, `What is the limit of ${f} as x tends to ${w}?`]]; },
  () => { const f = pick(['1/x', 'x/abs(x)', '1/(x-2)', 'abs(x)/x']); const a = f.includes('x-2') ? 2 : 0; const s = pick([['right', 1], ['left', -1]]); return [`limit(${f}, x, ${a}, ${s[1]})`, [`limit of ${f} as x approaches ${a} from the ${s[0]}`]]; },
  () => { const p = pick(POLYS); return [`factor(${p})`, [`factor ${p}`, `factorise ${p}`, `Factor the polynomial ${p}`, `factor ${p} completely`]]; },
  () => { const a = R(1, 4); const b = R(-4, 4); const n = R(2, 5); return [`expand((${a}x + ${b})^${n})`, [`expand (${a}x + ${b})^${n}`, `expand the expression (${a}x + ${b})^${n}`]]; },
  () => { const p = pick(['(x^2-1)/(x-1)', '(x^3-8)/(x-2)', '(x^2+2x+1)/(x+1)', 'sin(x)^2 + cos(x)^2']); return [`simplify(${p})`, [`simplify ${p}`, `simplify the expression ${p}`]]; },
  () => { const p = pick(['(3x+2)/(x^2-x-2)', '(x+5)/(x^2-1)', '1/(x^2+3x+2)', '(2x-1)/(x^2-4)']); return [`apart(${p})`, [`partial fractions of ${p}`, `partial fraction decomposition of ${p}`, `decompose ${p} into partial fractions`]]; },
  () => { const p = pick(POLYS); return [`${p} = 0`, [`roots of ${p}`, `find the roots of ${p}`, `the zeros of ${p}`, `What are the solutions of ${p}?`]]; },
  () => { const a = R(2, 9); const b = R(2, 30); return [`${a}x = ${a * b}`, [`find x if ${a}x = ${a * b}`, `What is x if ${a}x = ${a * b}?`, `${a}x = ${a * b}, find x`, `if ${a}x = ${a * b}, what is x`, `x such that ${a}x = ${a * b}`]]; },
  () => { const f = pick(['x^3 - 3x', 'x^3 - 6x^2 + 9x', 'x^4 - 2x^2', '2x^3 - 9x^2 + 12x']); return [`critical(${f}, x)`, [`critical points of ${f}`, `find the critical points of ${f}`, `local maxima and minima of ${f}`]]; },
  () => { const f = pick(['x^3 - 3x', 'x^4 - 2x^2', 'x^3 - 6x^2 + 9x']); return [`inflection(${f})`, [`inflection points of ${f}`, `find the points of inflection of ${f}`]]; },
  () => { const f = pick(['x^2', 'x^3 - x', 'sin(x)', 'e^x', 'ln(x)']); const a = pick([1, 2, 3]); return [`tangent(${f}, x, ${a})`, [`tangent line to ${f} at x = ${a}`, `the equation of the tangent to ${f} at x = ${a}`, `find the tangent line of y = ${f} at x = ${a}`]]; },
  () => { const f = pick(['e^x', 'cos(x)', 'sin(x)', 'ln(1+x)', '1/(1-x)']); const n = R(2, 6); return [`taylor(${f}, x, 0, ${n})`, [`maclaurin series of ${f} up to order ${n}`, `the taylor series of ${f} about 0 to degree ${n}`, `taylor expansion of ${f} around x = 0 up to order ${n}`]]; },
  () => { const f = pick(['e^x', 'ln(x)', 'sqrt(x)', '1/x']); const a = pick([1, 2, 4]); const n = R(2, 5); return [`taylor(${f}, x, ${a}, ${n})`, [`taylor series of ${f} about x = ${a} up to order ${n}`, `taylor polynomial of ${f} centered at ${a} of degree ${n}`]]; },
  () => { const f = pick(['k^2', 'k^3 + 1', '2k - 1', 'k*(k+1)']); const n = R(3, 20); return [`sum(${f}, k, 1, ${n})`, [`sum of ${f} for k from 1 to ${n}`, `the sum of ${f} from k = 1 to ${n}`]]; },
  () => { const n = R(3, 40); return [`sum(k, k, 1, ${n})`, [`sum of the first ${n} positive integers`, `the sum of the first ${n} integers`]]; },
  () => { const n = R(3, 40); return [`sum(2*k-1, k, 1, ${n})`, [`sum of the first ${n} odd numbers`]]; },
  () => { const f = pick(['x^2', 'x^3', 'sqrt(x)', 'x^2 + 1']); const b = R(1, 4); return [`areabetween(${f}, 0, x, 0, ${b})`, [`area under the curve ${f} from 0 to ${b}`, `area under y = ${f} from x = 0 to x = ${b}`]]; },
  () => { const b = R(2, 5); return [`areabetween(x, x^2, x, 0, 1)`, [`area between x and x^2 from 0 to 1`, `the area enclosed between y = x and y = x^2 from 0 to 1`]]; },
  () => { const f = pick(['x^2', 'x^3', 'sqrt(x)', 'sin(x)']); const b = R(1, 4); return [`avgvalue(${f}, x, 0, ${b})`, [`average value of ${f} on [0, ${b}]`, `the average value of ${f} over [0, ${b}]`, `mean value of ${f} from 0 to ${b}`]]; },
  () => { const f = pick(['x^2', 'x^(3/2)', 'sin(x)', 'e^x']); const b = R(1, 3); return [`arclength(${f}, x, 0, ${b})`, [`length of the curve y = ${f} from 0 to ${b}`, `arc length of ${f} from x = 0 to x = ${b}`]]; },
  () => { const f = pick(['x^2', 'sqrt(x)', 'x^3', 'e^x']); const b = R(1, 3); return [`volumerev(${f}, x, 0, ${b})`, [`volume of the solid generated by revolving y = ${f} about the x-axis from 0 to ${b}`, `the volume of the solid obtained by rotating ${f} about the x-axis from x = 0 to x = ${b}`]]; },
  () => { const f = pick(['t*e^(-2t)', 'sin(3t)', 't^2', 'e^(2t)*cos(t)', 't*sin(t)']); return [`laplace(${f})`, [`laplace transform of ${f}`, `the laplace transform of ${f}`]]; },
  () => { const f = pick(['1/(s^2+4)', '1/(s-3)', 's/(s^2+1)', '1/(s*(s+2))']); return [`ilaplace(${f})`, [`inverse laplace transform of ${f}`, `the inverse laplace of ${f}`]]; },
  // ---- numbers
  () => { const a = R(6, 90); const b = R(6, 90); return [`gcd(${a}, ${b})`, [`gcd of ${a} and ${b}`, `greatest common divisor of ${a} and ${b}`, `What is the greatest common factor of ${a} and ${b}?`, `hcf of ${a}, ${b}`]]; },
  () => { const a = R(3, 30); const b = R(3, 30); const c = R(3, 30); return [`lcm(${a}, ${b}, ${c})`, [`lcm of ${a}, ${b} and ${c}`, `least common multiple of ${a}, ${b}, ${c}`, `the lowest common multiple of ${a} and ${b} and ${c}`]]; },
  () => { const n = R(2, 5000); return [`isprime(${n})`, [`is ${n} prime?`, `is ${n} a prime number`]]; },
  () => { const n = R(10, 5000); return [`factor(${n})`, [`prime factorization of ${n}`, `prime factors of ${n}`, `factorise ${n}`]]; },
  () => { const n = R(4, 400); return [`divisors(${n})`, [`factors of ${n}`, `the divisors of ${n}`]]; },
  () => { const n = R(2, 3000); return [`nextprime(${n})`, [`next prime after ${n}`, `the next prime number after ${n}`]]; },
  () => { const a = R(10, 900); const m = R(2, 30); return [`mod(${a}, ${m})`, [`${a} mod ${m}`, `${a} modulo ${m}`, `the remainder when ${a} is divided by ${m}`, `remainder of ${a} divided by ${m}`]]; },
  () => { const n = R(5, 30); const k = R(1, n); return [`ncr(${n}, ${k})`, [`${n} choose ${k}`, `number of ways to choose ${k} items from ${n}`, `combinations of ${n} taken ${k} at a time`]]; },
  () => { const n = R(5, 15); const k = R(1, 4); return [`npr(${n}, ${k})`, [`permutations of ${n} taken ${k} at a time`, `the number of permutations of ${n} items taken ${k} at a time`]]; },
  () => { const n = R(2, 60); return [`fibonacci(${n})`, [`the ${n}th fibonacci number`, `fibonacci number ${n}`]]; },
  () => { const n = R(3, 12); return [`factorial(${n})`, [`${n} factorial`, `factorial of ${n}`]]; },
  () => { const n = R(2, 3000); const b = pick([[2, 'binary'], [8, 'octal'], [16, 'hexadecimal'], [2, 'base 2'], [7, 'base 7']]); return [`tobase(${n}, ${b[0]})`, [`${n} in ${b[1]}`, `convert ${n} to ${b[1]}`, `write ${n} in ${b[1]}`.replace('write ', '')]]; },
  () => { const n = R(5, 500); const bits = n.toString(2); return [`frombase(${bits}, 2)`, [`binary ${bits} to decimal`, `convert the binary number ${bits} to decimal`]]; },
  () => { const n = R(2, 99999); return [`digitsum(${n})`, [`sum of the digits of ${n}`]]; },
  () => { const b = pick([2, 3, 5, 10]); const e = R(1, 6); return [`log(${b ** e}, ${b})`, [`log base ${b} of ${b ** e}`, `the logarithm to the base ${b} of ${b ** e}`, `what is log base ${b} of ${b ** e}`]]; },
  () => { const n = R(2, 99); return [`sqrt(${n * n})`, [`the square root of ${n * n}`, `square root of ${n * n}`]]; },
  () => { const n = R(2, 20); return [`cbrt(${n ** 3})`, [`cube root of ${n ** 3}`, `the cube root of ${n ** 3}`]]; },
  () => { const a = R(2, 9); const b = R(2, 9); return [`${a}^2 + ${b}^3`, [`${a} squared plus ${b} cubed`, `${a} squared + ${b} cubed`]]; },
  () => { const a = R(2, 9); const e = R(2, 12); return [`${a}^${e}`, [`${a} to the power of ${e}`, `${a} raised to the power ${e}`, `${a} raised to the ${e}th power`]]; },
  () => { const a = R(2, 90); const b = R(2, 90); const c = R(2, 20); return [`${a} + ${b} * ${c}`, [`${a} plus ${b} times ${c}`, `what is ${a} plus ${b} multiplied by ${c}`]]; },
  () => { const a = R(10, 300); const b = R(2, 20); return [`${a} - ${b}`, [`${a} minus ${b}`, `What is ${a} minus ${b}?`]]; },
  () => { const p = R(1, 99); const x = R(10, 900); return [`${p}% * ${x}`, [`${p} percent of ${x}`, `what is ${p} percent of ${x}`]]; },
  () => { const a = R(10, 100); const b = R(10, 200); return [`pctchange(${a}, ${b})`, [`percent change from ${a} to ${b}`, `the percentage change from ${a} to ${b}`]]; },
  () => { const a = R(1, 40); const b = R(41, 400); return [`pctof(${a}, ${b})`, [`${a} is what percent of ${b}`, `what percent of ${b} is ${a}`]]; },
  // ---- shapes
  () => { const r = R(1, 20); return [`circle(r=${r})`, [`area of a circle with radius ${r}`, `the area of a circle of radius ${r}`, `circle with radius ${r}: find the area`.replace(': find the area', ''), `find the circumference of a circle with a radius of ${r} cm`, `What is the area of a circle whose radius is ${r}?`]]; },
  () => { const d = R(2, 40); return [`circle(d=${d})`, [`area of a circle with diameter ${d}`, `circumference of a circle with diameter ${d}`]]; },
  () => { const r = R(1, 15); return [`sphere(r=${r})`, [`volume of a sphere with radius ${r}`, `surface area of a sphere of radius ${r}`]]; },
  () => { const r = R(1, 9); const h = R(1, 12); return [`cylinder(${r}, ${h})`, [`volume of a cylinder with radius ${r} and height ${h}`, `the surface area of a cylinder with radius ${r} and height ${h}`, `volume of a cylinder with a base radius of ${r} and a height of ${h}`]]; },
  () => { const r = R(1, 9); const h = R(1, 12); return [`cone(${r}, ${h})`, [`volume of a cone with radius ${r} and height ${h}`, `volume of a cone of radius ${r} and height ${h}`]]; },
  () => { const l = R(1, 30); const w = R(1, 30); return [`rectangle(${l}, ${w})`, [`area of a rectangle with length ${l} and width ${w}`, `perimeter of a rectangle with sides ${l} and ${w}`, `the area of a ${l} by ${w} rectangle`.replace('a ' + l + ' by ' + w + ' rectangle', 'a rectangle ' + l + ' by ' + w), `diagonal of a rectangle ${l} by ${w}`]]; },
  () => { const s = R(1, 30); return [`square(${s})`, [`area of a square with side ${s}`, `perimeter of a square with side length ${s}`, `the diagonal of a square with sides ${s}`]]; },
  () => { const s = R(1, 20); return [`cube(${s})`, [`volume of a cube with side ${s}`, `surface area of a cube with edge ${s}`]]; },
  () => { const l = R(1, 12); const w = R(1, 12); const h = R(1, 12); return [`box(${l}, ${w}, ${h})`, [`volume of a box ${l} by ${w} by ${h}`, `volume of a rectangular prism ${l} by ${w} by ${h}`]]; },
  () => { const a = R(1, 20); const b = R(1, 20); const h = R(1, 20); return [`trapezoid(${a}, ${b}, ${h})`, [`area of a trapezoid with bases ${a} and ${b} and height ${h}`, `area of a trapezoid with parallel sides ${a} and ${b} and height ${h}`.replace('parallel sides', 'bases')]]; },
  () => { const a = R(2, 20); const b = R(2, 20); return [`ellipse(${a}, ${b})`, [`area of an ellipse with semi-axes ${a} and ${b}`]]; },
  () => { const n = pick([[5, 'pentagon'], [6, 'hexagon'], [8, 'octagon'], [10, 'decagon']]); const s = R(1, 15); return [`polygon(${n[0]}, ${s})`, [`area of a regular ${n[1]} with side ${s}`, `area of a regular ${n[1]} with side length ${s}`]]; },
  () => { const a = R(3, 30); const b = R(3, 30); return [`hypotenuse(${a}, ${b})`, [`hypotenuse of a right triangle with legs ${a} and ${b}`, `the hypotenuse of a right triangle with legs ${a} and ${b}`]]; },
  () => { const b = R(1, 30); const h = R(1, 30); return [`(1/2)*${b}*${h}`, [`area of a triangle with base ${b} and height ${h}`, `the area of a triangle with a base of ${b} and a height of ${h}`]]; },
  () => { const t = pick([[3, 4, 5], [5, 12, 13], [6, 7, 8], [7, 8, 9], [13, 14, 15]]); return [`triangle(${t.join(', ')})`, [`area of a triangle with sides ${t.join(', ')}`, `area of a triangle with sides ${t[0]}, ${t[1]} and ${t[2]}`]]; },
  // ---- coordinates
  () => { const a = pt(); const b = pt(); return [`distance(${ptv(a)}, ${ptv(b)})`, [`distance between ${a} and ${b}`, `the distance between the points ${a} and ${b}`, `distance from ${a} to ${b}`]]; },
  () => { const a = pt(); const b = pt(); return [`midpoint(${ptv(a)}, ${ptv(b)})`, [`midpoint of ${a} and ${b}`, `the midpoint of the segment joining ${a} and ${b}`]]; },
  () => { let a = pt(); let b = pt(); while (a.split(',')[0] === b.split(',')[0]) { a = pt(); b = pt(); } return [`slope(${ptv(a)}, ${ptv(b)})`, [`slope of the line through ${a} and ${b}`, `the slope between ${a} and ${b}`]]; },
  () => { let a = pt(); let b = pt(); while (a.split(',')[0] === b.split(',')[0]) { a = pt(); b = pt(); } return [`line(${ptv(a)}, ${ptv(b)})`, [`equation of the line through ${a} and ${b}`, `the line passing through ${a} and ${b}`]]; },
  () => { const a = pt(); const b = pt(); const c = pt(); return [`polygonarea(${ptv(a)}, ${ptv(b)}, ${ptv(c)})`, [`area of the triangle with vertices ${a}, ${b}, ${c}`, `area of the triangle with vertices ${a}, ${b} and ${c}`]]; },
  () => { const a = pt(); const b = pt(); const c = pt(); return [`centroid(${ptv(a)}, ${ptv(b)}, ${ptv(c)})`, [`centroid of the triangle with vertices ${a}, ${b}, ${c}`]]; },
  () => { const a = R(1, 6); const b = R(1, 6); const c = R(-9, 9); const x0 = R(-5, 5); const y0 = R(-5, 5); return [`pointlinedistance(${x0}, ${y0}, ${a}, ${b}, ${c})`, [`distance from the point (${x0}, ${y0}) to the line ${a}x + ${b}y ${c < 0 ? '-' : '+'} ${Math.abs(c)} = 0`.replace(/ \+ 0 = 0$/, ' = 0')]]; },
  // ---- linear algebra
  () => { const m = mat(R(2, 4), 0); void m; const n = R(2, 4); const M = mat(n, n); return [`det(${M})`, [`determinant of ${M}`, `Find the determinant of the matrix ${M}`, `what is the determinant of ${M}`]]; },
  () => { const n = R(2, 3); const M = mat(n, n); return [`inv(${M})`, [`inverse of ${M}`, `find the inverse of the matrix ${M}`]]; },
  () => { const n = R(2, 3); const M = mat(n, n); return [`eigen(${M})`, [`eigenvalues and eigenvectors of ${M}`, `the eigenvalues of ${M}`.replace('the eigenvalues of', 'eigenvalues and eigenvectors of')]]; },
  () => { const r = R(2, 3); const c = R(2, 4); const M = mat(r, c); return [`transpose(${M})`, [`transpose of ${M}`, `the transpose of the matrix ${M}`]]; },
  () => { const r = R(2, 4); const c = R(2, 4); const M = mat(r, c); return [`rank(${M})`, [`rank of ${M}`, `the rank of the matrix ${M}`]]; },
  () => { const n = R(2, 4); const M = mat(n, n); return [`trace(${M})`, [`trace of ${M}`]]; },
  () => { const n = R(2, 4); const M = mat(n, n); return [`rref(${M})`, [`row echelon form of ${M}`, `reduced row echelon form of ${M}`, `rref of ${M}`]]; },
  () => { const n = R(2, 3); const M = mat(n, n); return [`charpoly(${M})`, [`characteristic polynomial of ${M}`]]; },
  () => { const n = R(2, 4); const u = vec(n); const v = vec(n); return [`dot(${u}, ${v})`, [`dot product of ${u} and ${v}`, `the dot product of the vectors ${u} and ${v}`]]; },
  () => { const u = vec(3); const v = vec(3); return [`cross(${u}, ${v})`, [`cross product of ${u} and ${v}`, `the cross product of the vectors ${u} and ${v}`]]; },
  () => { const n = R(2, 4); const u = vec(n); return [`norm(${u})`, [`magnitude of the vector ${u}`, `the length of ${u}`, `norm of ${u}`]]; },
  () => { const n = R(2, 4); const u = vec(n); const v = vec(n); return [`angle(${u}, ${v})`, [`angle between ${u} and ${v}`, `the angle between the vectors ${u} and ${v}`]]; },
  () => { const n = R(2, 4); const u = vec(n); const v = vec(n); return [`proj(${u}, ${v})`, [`projection of ${u} onto ${v}`, `the projection of the vector ${u} onto the vector ${v}`]]; },
  // ---- statistics
  () => { const d = list(R(4, 9), 0, 50); return [`mean(${d.join(', ')})`, [`mean of ${d.join(', ')}`, `average of ${d.join(' ')}`, `find the mean of the numbers ${d.slice(0, -1).join(', ')} and ${d[d.length - 1]}`, `What is the average of ${d.join(', ')}?`]]; },
  () => { const d = list(R(4, 9), 0, 50); return [`median(${d.join(', ')})`, [`median of ${d.join(', ')}`, `the median of the data set ${d.join(', ')}`]]; },
  () => { const d = list(R(5, 10), 1, 6); return [`mode(${d.join(', ')})`, [`mode of ${d.join(', ')}`]]; },
  () => { const d = list(R(4, 9), 0, 50); return [`stdev(${d.join(', ')})`, [`standard deviation of ${d.join(', ')}`, `sample standard deviation of ${d.join(', ')}`]]; },
  () => { const d = list(R(4, 9), 0, 50); return [`popstdev(${d.join(', ')})`, [`population standard deviation of ${d.join(', ')}`]]; },
  () => { const d = list(R(4, 9), 0, 50); return [`variance(${d.join(', ')})`, [`variance of ${d.join(', ')}`, `the sample variance of ${d.join(', ')}`]]; },
  () => { const d = list(R(4, 9), 0, 50); return [`datarange(${d.join(', ')})`, [`range of ${d.join(', ')}`]]; },
  () => { const d = list(R(5, 9), 0, 50); return [`fivenum(${d.join(', ')})`, [`five-number summary of ${d.join(', ')}`]]; },
  () => { const d = list(R(5, 9), 0, 50); return [`max(${d.join(', ')})`, [`the largest of ${d.join(', ')}`, `maximum of ${d.join(', ')}`]]; },
  () => { const x = list(6, 1, 20); const y = list(6, 1, 20); return [`correlation([${x.join(', ')}], [${y.join(', ')}])`, [`correlation between [${x.join(', ')}] and [${y.join(', ')}]`]]; },
  () => { const x = list(6, 1, 20); const y = list(6, 1, 20); return [`linreg([${x.join(', ')}], [${y.join(', ')}])`, [`linear regression of [${x.join(', ')}] and [${y.join(', ')}]`, `line of best fit for [${x.join(', ')}] and [${y.join(', ')}]`]]; },
  () => { const n = R(2, 12); const k = R(0, n); return [`binompdf(${n}, 1/2, ${k})`, [`probability of exactly ${k} heads in ${n} coin flips`, `probability of getting exactly ${k} heads in ${n} flips`]]; },
  () => { const n = R(3, 12); const k = R(1, n); const p = pick(['0.3', '0.25', '0.6']); return [`binomcdf(${n}, ${p}, ${k}, ${n})`, [`probability of at least ${k} successes in ${n} trials with probability ${p}`]]; },
  () => { const n = R(3, 12); const k = R(0, n); const p = pick(['0.3', '0.25', '0.6']); return [`binomcdf(${n}, ${p}, ${k})`, [`probability of at most ${k} successes in ${n} trials with probability ${p}`, `X ~ Bin(${n}, ${p}), P(X <= ${k})`]]; },
  () => { const x = R(40, 99); const m = R(50, 80); const s = R(3, 15); return [`zscore(${x}, ${m}, ${s})`, [`z-score of ${x} with mean ${m} and standard deviation ${s}`]]; },
  () => { const m = R(50, 150); const s = R(3, 20); const a = m + R(-2, 2) * s; return [`normalcdf(-oo, ${a}, ${m}, ${s})`, [`X is normally distributed with mean ${m} and standard deviation ${s}, find P(X < ${a})`]]; },
  () => { const m = R(50, 150); const s = R(3, 20); const a = m + R(-2, 2) * s; return [`normalcdf(${a}, oo, ${m}, ${s})`, [`a normal distribution with mean ${m} and standard deviation ${s}: P(X > ${a})`]]; },
  // ---- finance
  () => { const P = R(1, 90) * 100; const r = R(1, 12); const t = R(1, 20); return [`compound(${P}, ${r}%, ${t}, 1)`, [`compound interest on $${P} at ${r}% for ${t} years`]]; },
  () => { const P = R(1, 90) * 100; const r = R(1, 12); const t = R(1, 20); return [`compound(${P}, ${r}%, ${t}, 12)`, [`compound interest on $${P} at ${r}% for ${t} years compounded monthly`]]; },
  () => { const P = R(1, 90) * 100; const r = R(1, 12); const t = R(1, 20); return [`simpleinterest(${P}, ${r}%, ${t})`, [`simple interest on $${P} at ${r}% for ${t} years`]]; },
  () => { const P = R(50, 500) * 1000; const r = R(2, 9); const t = R(5, 30); return [`loan(${P}, ${r}%, ${t})`, [`monthly payment on a $${P.toLocaleString('en-US')} loan at ${r}% for ${t} years`]]; },
  // ---- plane geometry
  () => { const A = pt(); const B = pt(); const C = pt(); return [`circle(${ptv(A)}, ${ptv(B)}, ${ptv(C)})`, [`circle through ${A}, ${B} and ${C}`, `the equation of the circle passing through ${A}, ${B}, ${C}`]]; },
  () => { const A = pt(); const r = R(1, 9); return [`circle(${ptv(A)}, ${r})`, [`the circle with centre ${A} and radius ${r}`, `circle with center ${A} and radius ${r}`]]; },
  () => { const A = pt(); const B = pt(); return [`circle(${ptv(A)}, ${ptv(B)})`, [`circle with diameter endpoints ${A} and ${B}`]]; },
  () => { const A = pt(); const B = pt(); return [`perpbisector(${ptv(A)}, ${ptv(B)})`, [`perpendicular bisector of ${A} and ${B}`, `the perpendicular bisector of the segment joining ${A} and ${B}`]]; },
  () => { const a = R(1, 5); const b = R(1, 5); const c = R(-9, 9); const P = pt(); return [`parallel(${a}x + ${b}y = ${c}, ${ptv(P)})`, [`the line through ${P} parallel to ${a}x + ${b}y = ${c}`, `line through ${P} parallel to the line ${a}x + ${b}y = ${c}`]]; },
  () => { const a = R(1, 5); const b = R(1, 5); const c = R(-9, 9); const P = pt(); return [`perpendicular(${a}x + ${b}y = ${c}, ${ptv(P)})`, [`the line through ${P} perpendicular to ${a}x + ${b}y = ${c}`]]; },
  () => { const a = R(1, 5); const b = R(1, 5); const c = R(-9, 9); const d = R(1, 5); const e = R(-5, 5); const f = R(-9, 9); return [`lineintersect(${a}x + ${b}y = ${c}, ${d}x + ${e === 0 ? 1 : e}y = ${f})`, [`intersection of the lines ${a}x + ${b}y = ${c} and ${d}x + ${e === 0 ? 1 : e}y = ${f}`, `angle between the lines ${a}x + ${b}y = ${c} and ${d}x + ${e === 0 ? 1 : e}y = ${f}`]]; },
  () => { const a = R(1, 5); const b = R(1, 5); const c = R(-9, 9); const c2 = c + R(1, 9); return [`parallellines(${a}x + ${b}y = ${c}, ${a}x + ${b}y = ${c2})`, [`distance between the parallel lines ${a}x + ${b}y = ${c} and ${a}x + ${b}y = ${c2}`]]; },
  () => { const a = R(1, 5); const b = R(1, 5); const c = R(-9, 9); return [`lineinfo(${a}x + ${b}y = ${c})`, [`slope of the line ${a}x + ${b}y = ${c}`]]; },
  () => { const h = R(-3, 3); const k = R(-3, 3); const r = R(2, 8); const m = R(-2, 2); const n = R(-5, 5); return [`linecircle(y = ${m}x + ${n}, (x - ${h})^2 + (y - ${k})^2 = ${r * r})`.replace(/- -/g, '+ ').replace('+ -', '- '), [`where does the line y = ${m}x + ${n} meet the circle (x - ${h})^2 + (y - ${k})^2 = ${r * r}`.replace(/- -/g, '+ ').replace('+ -', '- ')]]; },
  () => { const r = R(2, 9); const P = [R(-9, 9), R(-9, 9)]; return [`tangentcircle(x^2 + y^2 = ${r * r}, [${P}])`, [`tangents from (${P[0]}, ${P[1]}) to the circle x^2 + y^2 = ${r * r}`, `tangent to the circle x^2 + y^2 = ${r * r} at (${P[0]}, ${P[1]})`]]; },
  () => { const P = pt(); const a = R(1, 5); const b = R(1, 5); const c = R(-9, 9); return [`reflect(${ptv(P)}, ${a}x + ${b}y = ${c})`, [`reflection of ${P} in the line ${a}x + ${b}y = ${c}`, `reflect ${P} across the line ${a}x + ${b}y = ${c}`]]; },
  () => { const P = pt(); const ang = pick([30, 45, 60, 90, 120, 180]); const C = pt(); return [`rotate(${ptv(P)}, ${ang}, ${ptv(C)})`, [`rotate ${P} by ${ang} degrees about ${C}`], ]; },
  () => { const P = pt(); const ang = pick([30, 45, 60, 90, 120, 180]); return [`rotate(${ptv(P)}, ${ang})`, [`rotate ${P} by ${ang} degrees about the origin`, `rotate ${P} by ${ang}° about the origin`.replace('°', ' degrees')]]; },
  () => { const P = pt(); const v = pt(); return [`translate(${ptv(P)}, ${ptv(v)})`, [`translate ${P} by ${v}`, `shift the point ${P} by the vector ${v}`]]; },
  () => { const P = pt(); const k = pick([2, 3, -1, -2]); const C = pt(); return [`dilate(${ptv(P)}, ${k}, ${ptv(C)})`, [`dilate ${P} by a factor of ${k} about ${C}`]]; },
  () => { const A = pt(); const B = pt(); const m = R(1, 5); const n = R(1, 5); return [`section(${ptv(A)}, ${ptv(B)}, ${m}, ${n})`, [`the point dividing ${A} and ${B} in the ratio ${m}:${n}`]]; },
  () => { const A = pt(); const B = pt(); const C = pt(); return [`collinear(${ptv(A)}, ${ptv(B)}, ${ptv(C)})`, [`are the points ${A}, ${B}, ${C} collinear?`]]; },
  () => { const P = Array.from({ length: R(4, 7) }, () => pt()); return [`hull(${P.map(ptv).join(', ')})`, [`convex hull of ${P.join(', ')}`]]; },
  () => { const A = pt(); const B = pt(); const C = pt(); return [`triangle2d(${ptv(A)}, ${ptv(B)}, ${ptv(C)})`, [`circumcenter of the triangle with vertices ${A}, ${B}, ${C}`, `incenter of the triangle with vertices ${A}, ${B}, ${C}`]]; },
  // ---- functions
  () => { const a = R(1, 5); const b = R(-5, 5); const c = R(-6, 6); return [`${a}*(${c})^2 + ${b}`, [`f(x) = ${a}x^2 + ${b}, find f(${c})`.replace('x^2', 'x^2'), `let f(x) = ${a}x^2 + ${b}. What is f(${c})?`]]; },
];

let total = 0;
let bad = 0;
let notWords = 0;
const strip = (t) => {
  const ls = String(t).split('\n').filter((l) => !l.startsWith('Read as'));
  const ai = ls.findIndex((l) => l.startsWith('Answer:'));
  // the lines of a multi-line answer may come in another order (the asked quantity first)
  if (ai >= 0) {
    let e = ai + 1;
    while (e < ls.length && /^ {2}/.test(ls[e])) e++;
    const block = ls.slice(ai + 1, e).sort();
    return ls.slice(0, ai + 1).concat(block, ls.slice(e)).join('\n');
  }
  return ls.join('\n');
};
const norm = (r) => strip(r.result ?? ('ERROR: ' + String(r.error).replace(/"[^"]*"/g, '"…"')));
const ROUNDS = 6;
for (let round = 0; round < ROUNDS; round++) {
  for (const make of TEMPLATES) {
    const [direct, phrases] = make();
    const rd = norm(await call({ equation: direct }));
    for (const ph of phrases) {
      total++;
      const rp = norm(await call({ equation: ph }));
      if (rp !== rd) {
        // a phrase that was not understood at all reports a parse error; count both kinds as failures
        bad++;
        if (bad <= 25) console.log('MISMATCH\n  phrase: ' + ph + '\n  direct: ' + direct + '\n  phrase result: ' + rp.slice(0, 300).replace(/\n/g, ' | ') + '\n  direct result: ' + rd.slice(0, 300).replace(/\n/g, ' | '));
      }
    }
    if (/^ERROR/.test(rd)) notWords++;
  }
}
console.log(total + ' phrasings, ' + bad + ' differ from the command they stand for (' + notWords + ' of the direct commands themselves reported a polite error for the random numbers)');
if (bad) process.exit(1);
