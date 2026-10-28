// The ten test items: the image, what Gemma should send (typed form), and what the answer card must contain.
export const ITEMS = [
  { id: '01-quadratic', typed: '2x^2 - 5x + 3 = 0', card: ['x = 1', 'x = 3/2'] },
  { id: '02-integral', typed: 'integrate(x*e^x, x, 0, 1)', card: ['Answer: 1'] },
  { id: '03-limit', typed: 'limit((1 + 1/x)^x, x, oo)', card: ['Answer: e'] },
  { id: '04-determinant', typed: 'det([[3,1],[2,4]])', card: ['Answer: 10'] },
  { id: '05-radical', typed: 'sqrt(x + 7) = x + 1', card: ['Answer: x = 2'] },
  { id: '06-fraction', typed: '(x+1)/(x-1) = 3', card: ['Answer: x = 2'] },
  { id: '07-decimals', typed: '10x - 3 = 0.5x + 15', card: ['x = 36/19'] },
  { id: '08-logs', typed: 'log_2(x) + log_2(x - 2) = 3', card: ['Answer: x = 4'] },
  { id: '09-system', typed: 'x^2 + y^2 = 25; y = x + 1', card: ['x = -4, y = -3', 'x = 3, y = 4'] },
  { id: '10-bond', typed: 'bond(1000, 5%, 6%, 10, 2)', card: ['price = 925.61', 'Macaulay duration = 7.8949973'] },
];
