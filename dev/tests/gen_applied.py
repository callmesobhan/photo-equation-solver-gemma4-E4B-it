# Oracle for geometry, triangles, units, chemistry, finance and complex numbers:
# pint, periodictable, numpy-financial, Python complex and plain formulas.
import json, math, random, sys, cmath
import numpy as np
import pint, periodictable as pt
import numpy_financial as nf

random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 3)
ur = pint.UnitRegistry()
ur.define('iacre = 4046.8564224 * meter ** 2')  # the international acre (newer pint versions default to the US survey acre)
T = []
def add(cmd, t, v, **kw): T.append(dict(cmd=cmd, t=t, v=v, **kw))
R = random.randint
U = random.uniform

# ---------------- units
GROUPS = {
  'length': {'m': 'meter', 'km': 'kilometer', 'cm': 'centimeter', 'mm': 'millimeter', 'mi': 'mile', 'yd': 'yard', 'ft': 'foot', 'in': 'inch', 'nmi': 'nautical_mile'},
  'mass': {'kg': 'kilogram', 'g': 'gram', 'mg': 'milligram', 'lb': 'pound', 'oz': 'ounce', 'st': 'stone', 'ton': 'ton', 'tonne': 'metric_ton'},
  'time': {'s': 'second', 'ms': 'millisecond', 'min': 'minute', 'h': 'hour', 'day': 'day', 'wk': 'week', 'yr': 'year'},
  'volume': {'L': 'liter', 'mL': 'milliliter', 'gal': 'gallon', 'qt': 'quart', 'pt': 'pint', 'cup': 'cup', 'floz': 'fluid_ounce', 'tbsp': 'tablespoon', 'tsp': 'teaspoon'},
  'area': {'acre': 'iacre', 'ha': 'hectare', 'm2': 'meter**2', 'km2': 'kilometer**2', 'cm2': 'centimeter**2', 'ft2': 'foot**2', 'in2': 'inch**2', 'mi2': 'mile**2'},
  'speed': {'mph': 'mph', 'km/h': 'kilometer/hour', 'm/s': 'meter/second', 'kn': 'knot', 'ft/s': 'foot/second'},
  'pressure': {'Pa': 'pascal', 'kPa': 'kilopascal', 'bar': 'bar', 'atm': 'atmosphere', 'psi': 'psi', 'mmHg': 'mmHg', 'torr': 'torr'},
  'energy': {'J': 'joule', 'kJ': 'kilojoule', 'cal': 'calorie', 'kcal': 'kilocalorie', 'Wh': 'watt_hour', 'kWh': 'kilowatt_hour', 'eV': 'electron_volt', 'BTU': 'BTU'},
  'power': {'W': 'watt', 'kW': 'kilowatt', 'hp': 'horsepower'},
  'force': {'N': 'newton', 'lbf': 'pound_force', 'kgf': 'kilogram_force'},
  'data': {'B': 'byte', 'bit': 'bit', 'GB': '8e9*bit', 'MB': '8e6*bit', 'KiB': '8192*bit', 'MiB': '8388608*bit'},
  'angle': {'deg': 'degree', 'rad': 'radian', 'turn': 'turn', 'grad': 'gradian'},
}
for g, units in GROUPS.items():
    keys = list(units)
    for _ in range(14):
        a, b = random.sample(keys, 2)
        v = round(U(0.1, 900), 2)
        try:
            q = ur.Quantity(v, ur.parse_units(units[a]) if '*' not in units[a] else 1) if '*' not in units[a] else v * ur.Quantity(eval(units[a].split('*')[0]), ur.bit)
            if '*' in units[b]:
                tgt = ur.Quantity(eval(units[b].split('*')[0]), ur.bit)
                want = (q.to('bit').magnitude) / tgt.to('bit').magnitude
            else:
                want = q.to(units[b]).magnitude
        except Exception as e:
            continue
        add(f'convert {v} {a} to {b}', 'num', float(want), tol=2e-6)
for _ in range(25):
    c = round(U(-100, 500), 1)
    add(f'convert {c} °C to °F', 'num', c * 9 / 5 + 32, tol=1e-6)
    add(f'convert {c} °C to K', 'num', c + 273.15, tol=1e-6)
    f = round(U(-100, 500), 1)
    add(f'convert {f} °F to °C', 'num', (f - 32) * 5 / 9, tol=1e-6)
# ---------------- shapes
for _ in range(15):
    r = round(U(0.5, 20), 1); h = round(U(0.5, 20), 1); w = round(U(0.5, 20), 1)
    add(f'circle({r})', 'labelled', {'area': math.pi * r * r, 'circumference': 2 * math.pi * r})
    add(f'sphere({r})', 'labelled', {'volume': 4 / 3 * math.pi * r ** 3, 'surface area': 4 * math.pi * r * r})
    add(f'cylinder({r}, {h})', 'labelled', {'volume': math.pi * r * r * h, 'total surface': 2 * math.pi * r * (r + h)})
    add(f'cone({r}, {h})', 'labelled', {'volume': math.pi * r * r * h / 3, 'slant height': math.hypot(r, h), 'total surface': math.pi * r * (r + math.hypot(r, h))})
    add(f'box({r}, {h}, {w})', 'labelled', {'volume': r * h * w, 'surface area': 2 * (r * h + r * w + h * w), 'space diagonal': math.sqrt(r * r + h * h + w * w)})
    add(f'rectangle({r}, {h})', 'labelled', {'area': r * h, 'perimeter': 2 * (r + h), 'diagonal': math.hypot(r, h)})
    add(f'trapezoid({r}, {h}, {w})', 'labelled', {'area': (r + h) / 2 * w})
    ang = R(5, 350)
    add(f'sector({r}, {ang})', 'labelled', {'arc length': r * math.radians(ang), 'sector area': r * r * math.radians(ang) / 2})
    n = R(3, 12)
    add(f'polygon({n}, {r})', 'labelled', {'area': n * r * r / (4 * math.tan(math.pi / n)), 'perimeter': n * r})
# ---------------- triangles
def tri_from_sides():
    while True:
        a, b, c = [round(U(1, 20), 1) for _ in range(3)]
        if a + b > c + 0.5 and a + c > b + 0.5 and b + c > a + 0.5: return a, b, c
def angles(a, b, c):
    A = math.acos((b*b + c*c - a*a) / (2*b*c)); B = math.acos((a*a + c*c - b*b) / (2*a*c)); return A, B, math.pi - A - B
for _ in range(25):
    a, b, c = tri_from_sides(); A, B, C = angles(a, b, c)
    full = dict(a=a, b=b, c=c, A=math.degrees(A), B=math.degrees(B), C=math.degrees(C))
    add(f'triangle({a}, {b}, {c})', 'tri', [full])
    add(f'triangle(a={a}, b={b}, C={round(full["C"], 6)})', 'tri', [full], tol=1e-4)
    add(f'triangle(A={round(full["A"], 6)}, B={round(full["B"], 6)}, c={c})', 'tri', [full], tol=1e-4)
    add(f'triangle(A={round(full["A"], 6)}, C={round(full["C"], 6)}, b={b})', 'tri', [full], tol=1e-4)
    # SSA: a, b and angle A -> up to two triangles
    sols = []
    sinB = b * math.sin(A) / a
    if sinB <= 1:
        for Bc in {math.asin(sinB), math.pi - math.asin(sinB)}:
            Cc = math.pi - A - Bc
            if Cc > 1e-9:
                cc = a * math.sin(Cc) / math.sin(A)
                sols.append(dict(a=a, b=b, c=cc, A=math.degrees(A), B=math.degrees(Bc), C=math.degrees(Cc)))
    add(f'triangle(a={a}, b={b}, A={round(full["A"], 6)})', 'tri', sols, tol=1e-4, any=True)
# ---------------- chemistry
FORMULAS = ['H2O', 'CO2', 'C6H12O6', 'Ca(OH)2', 'Al2(SO4)3', 'NaHCO3', 'KMnO4', 'Fe2O3', 'H2SO4', 'NH4NO3', 'Mg(NO3)2', 'C2H5OH', 'Ca3(PO4)2', 'Na2CO3', 'Cu(NO3)2', 'NaCl', 'C12H22O11', 'HCl', 'NH3', 'CH3COOH', 'Fe(OH)3', 'K4Fe(CN)6', 'Pb(NO3)2', 'C8H18', 'Zn3(PO4)2']
for f in FORMULAS:
    add(f'molarmass({f})', 'num', float(pt.formula(f).mass), tol=3e-4)
BAL = {
  'H2 + O2 -> H2O': '2H2 + O2 → 2H2O', 'Fe + O2 -> Fe2O3': '4Fe + 3O2 → 2Fe2O3', 'C3H8 + O2 -> CO2 + H2O': 'C3H8 + 5O2 → 3CO2 + 4H2O',
  'Al + HCl -> AlCl3 + H2': '2Al + 6HCl → 2AlCl3 + 3H2', 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2': '2KMnO4 + 16HCl → 2KCl + 2MnCl2 + 8H2O + 5Cl2',
  'C6H12O6 + O2 -> CO2 + H2O': 'C6H12O6 + 6O2 → 6CO2 + 6H2O', 'N2 + H2 -> NH3': 'N2 + 3H2 → 2NH3', 'Na + H2O -> NaOH + H2': '2Na + 2H2O → 2NaOH + H2',
  'CH4 + O2 -> CO2 + H2O': 'CH4 + 2O2 → CO2 + 2H2O', 'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O': '3Ca(OH)2 + 2H3PO4 → Ca3(PO4)2 + 6H2O', 'C2H6 + O2 -> CO2 + H2O': '2C2H6 + 7O2 → 4CO2 + 6H2O',
  'Fe2O3 + CO -> Fe + CO2': 'Fe2O3 + 3CO → 2Fe + 3CO2', 'Al2(SO4)3 + NaOH -> Al(OH)3 + Na2SO4': 'Al2(SO4)3 + 6NaOH → 2Al(OH)3 + 3Na2SO4', 'NH3 + O2 -> NO + H2O': '4NH3 + 5O2 → 4NO + 6H2O',
}
for k, v in BAL.items(): add('balance ' + k, 'has', v)
# ---------------- finance
for _ in range(15):
    P = R(500, 50000); r = R(10, 120) / 10; yrs = R(1, 30); m = random.choice([1, 2, 4, 12])
    A = P * (1 + r / 100 / m) ** (m * yrs)
    add(f'compound({P}, {r}%, {yrs}, {m})', 'labelled', {'final amount A': round(A, 2)}, tol=1e-6)
    pm = -nf.pmt(r / 100 / 12, yrs * 12, P)
    add(f'loan({P}, {r}, {yrs})', 'labelled', {'payment per period': round(pm, 2), 'total paid': round(pm * yrs * 12, 2)}, tol=1e-4)
    pmt = R(10, 2000)
    add(f'annuityfv({pmt}, {r / 100 / 12}, {yrs * 12})', 'labelled', {'future value': round(nf.fv(r / 100 / 12, yrs * 12, -pmt, 0), 2)}, tol=1e-5)
    add(f'annuitypv({pmt}, {r / 100 / 12}, {yrs * 12})', 'labelled', {'present value': round(nf.pv(r / 100 / 12, yrs * 12, -pmt, 0), 2)}, tol=1e-5)
for _ in range(10):
    cf = [-R(500, 5000)] + [R(100, 2500) for _ in range(R(3, 6))]
    rate = R(1, 20)
    add('npv(' + f'{rate}%, ' + ', '.join(map(str, cf)) + ')', 'num', float(nf.npv(rate / 100, cf)), tol=1e-6)
    irr = nf.irr(cf)
    if irr == irr: add('irr(' + ', '.join(map(str, cf)) + ')', 'num', float(irr * 100), tol=1e-6)
# ---------------- complex numbers
def cstr(z): return f'({int(z.real)}{"+" if z.imag >= 0 else "-"}{abs(int(z.imag))}i)'
for _ in range(60):
    z = complex(R(-9, 9), R(-9, 9)); w = complex(R(-9, 9), R(-9, 9))
    if z == 0 or w == 0: continue
    add(f'{cstr(z)}*{cstr(w)}', 'cplx', z * w)
    add(f'{cstr(z)}+{cstr(w)}', 'cplx', z + w)
    add(f'{cstr(z)}/{cstr(w)}', 'cplx', z / w)
    n = R(2, 8)
    add(f'{cstr(z)}^{n}', 'cplx', z ** n)
    add(f'conj{cstr(z)}'.replace('conj(', 'conj(') if False else f'conj{cstr(z)}', 'cplx', z.conjugate())
    add(f'abs{cstr(z)}', 'real', abs(z))
    add(f'sqrt{cstr(z)}', 'cplx', cmath.sqrt(z))
    add(f'arg{cstr(z)}', 'real', cmath.phase(z))
    add(f'{cstr(z)}^(1/2)', 'cplx', z ** 0.5)
    add(f'e^{cstr(z)}', 'cplx', cmath.exp(z))
    add(f'ln{cstr(z)}', 'cplx', cmath.log(z))
for t in T:
    if t['t'] == 'cplx': t['v'] = [t['v'].real, t['v'].imag]
json.dump(T, sys.stdout)
