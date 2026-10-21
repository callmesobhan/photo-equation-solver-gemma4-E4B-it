# Random integer polynomials with numpy.roots as an independent oracle.
import json, random, sys
import numpy as np
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
out = []
for _ in range(int(sys.argv[2]) if len(sys.argv) > 2 else 300):
    deg = random.randint(1, 8)
    while True:
        c = [random.randint(-9, 9) for _ in range(deg + 1)]   # c[0] = leading
        if c[0] != 0 and any(c):
            break
    r = np.roots(c)
    out.append({"coef_high_to_low": c, "roots": [[float(z.real), float(z.imag)] for z in r]})
print(json.dumps(out))
