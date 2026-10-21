# Oracle cases for the extra discrete-mathematics commands (sympy, networkx, brute force).
import json, sys, random, math, itertools
from fractions import Fraction as Fr
import sympy as sp
import networkx as nx
from sympy.solvers.diophantine.diophantine import diop_DN
from sympy.logic.boolalg import SOPform

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))

# Euclid / Bezout
for _ in range(10):
    a, b = rnd.randint(1, 5000), rnd.randint(1, 5000)
    add('euclid', 'euclid(%d, %d)' % (a, b), a=a, b=b, g=math.gcd(a, b))
# continued fractions
for _ in range(8):
    p, q = rnd.randint(1, 3000), rnd.randint(1, 3000)
    terms = [int(t) for t in sp.continued_fraction(sp.Rational(p, q))]
    add('cfrac', 'cfrac(%d/%d)' % (p, q), terms=terms)
for d in rnd.sample([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 19, 21, 22, 23, 29, 31, 37, 41, 61, 97], 8):
    a0, per = sp.continued_fraction_periodic(0, 1, d)
    add('cfsqrt', 'cfrac(sqrt(%d))' % d, a0=int(a0), period=[int(x) for x in per[0]] if isinstance(per[0], list) else [int(x) for x in per])
# Pell
for d in rnd.sample([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 19, 21, 22, 23, 29, 31, 37, 41, 43, 53, 61, 67, 79, 97], 10):
    x, y = diop_DN(d, 1)[0]
    add('pell', 'pell(%d)' % d, d=d, x=int(x), y=int(y))
for d in [2, 5, 10, 13, 17, 26, 29, 37, 41]:
    sol = diop_DN(d, -1)
    add('pellneg', 'pell(%d, -1)' % d, d=d, solvable=bool(sol), x=int(sol[0][0]) if sol else 0, y=int(sol[0][1]) if sol else 0)
# misc number theory
for _ in range(6):
    n = rnd.randint(1, 3000)
    x, steps, peak = n, 0, n
    while x != 1:
        x = x // 2 if x % 2 == 0 else 3 * x + 1; steps += 1; peak = max(peak, x)
    add('collatz', 'collatz(%d)' % n, steps=steps, peak=peak)
for _ in range(6):
    p, q = rnd.randint(1, 30), rnd.randint(2, 40)
    add('egyptian', 'egyptian(%d/%d)' % (p, q), value=str(Fr(p, q)))
for _ in range(8):
    n = rnd.randint(1, 600)
    reps = sorted({tuple(sorted((a, b), reverse=True)) for a in range(0, 30) for b in range(0, 30) if a * a + b * b == n})
    add('sum2sq', 'sum2sq(%d)' % n, count=len(reps))
for n in [3, 5, 7, 10]:
    add('farey', 'farey(%d)' % n, n=n, length=len(list(sp.ntheory.farey_sequence(n))) if hasattr(sp.ntheory, 'farey_sequence') else 1 + sum(sp.totient(k) for k in range(1, n + 1)))
for _ in range(6):
    n, k = rnd.randint(2, 40), rnd.randint(1, 7)
    ring = list(range(1, n + 1)); idx = 0
    while len(ring) > 1:
        idx = (idx + k - 1) % len(ring); ring.pop(idx)
    add('josephus', 'josephus(%d, %d)' % (n, k), survivor=ring[0])
for _ in range(5):
    s, n = rnd.randint(3, 9), rnd.randint(1, 40)
    add('polygonal', 'polygonal(%d, %d)' % (s, n), value=n * ((s - 2) * n - (s - 4)) // 2)
# linear recurrences
def rec_case():
    k = rnd.choice([1, 1, 2, 2, 3])
    cs = [rnd.randint(-3, 3) for _ in range(k)]
    if cs[-1] == 0: cs[-1] = rnd.choice([1, 2, -1])
    forcing = rnd.choice([('0', lambda n: 0), ('5', lambda n: 5), ('n', lambda n: n), ('n^2', lambda n: n * n), ('2^n', lambda n: 2 ** n), ('3*n + 1', lambda n: 3 * n + 1), ('n*2^n', lambda n: n * 2 ** n), ('3^n', lambda n: 3 ** n)])
    inits = [rnd.randint(-3, 5) for _ in range(k)]
    seq = list(inits)
    for n in range(k, 20):
        seq.append(sum(c * seq[n - 1 - j] for j, c in enumerate(cs)) + forcing[1](n))
    return cs, forcing, inits, seq
for _ in range(25):
    cs, forcing, inits, seq = rec_case()
    terms = ' + '.join('%d*a_(n-%d)' % (c, j + 1) for j, c in enumerate(cs) if c != 0) or '0'
    text = 'a_n = %s%s; %s' % (terms, '' if forcing[0] == '0' else ' + ' + forcing[0], '; '.join('a_%d = %d' % (i, v) for i, v in enumerate(inits)))
    add('rec', text, seq=seq)
# logic
VARS = ['p', 'q', 'r']
def rnd_formula(depth):
    if depth == 0 or rnd.random() < 0.25: return rnd.choice(VARS[:rnd.choice([2, 3])])
    op = rnd.choice(['and', 'or', 'imp', 'iff', 'xor', 'not'])
    if op == 'not': return ('not', rnd_formula(depth - 1))
    return (op, rnd_formula(depth - 1), rnd_formula(depth - 1))
def show(f):
    if isinstance(f, str): return f
    if f[0] == 'not': return 'not ' + show(f[1]) if isinstance(f[1], str) else 'not (' + show(f[1]) + ')'
    sym = {'and': ' and ', 'or': ' or ', 'imp': ' -> ', 'iff': ' <-> ', 'xor': ' xor '}[f[0]]
    return '(' + show(f[1]) + sym + show(f[2]) + ')'
def ev(f, env):
    if isinstance(f, str): return env[f]
    if f[0] == 'not': return not ev(f[1], env)
    a, b = ev(f[1], env), ev(f[2], env)
    return {'and': a and b, 'or': a or b, 'imp': (not a) or b, 'iff': a == b, 'xor': a != b}[f[0]]
def vars_of(f): return {f} if isinstance(f, str) else set().union(*[vars_of(x) for x in f[1:]])
for _ in range(20):
    f = rnd_formula(3)
    vs = sorted(vars_of(f))
    rows = []
    for bits in itertools.product([False, True], repeat=len(vs)):
        env = dict(zip(vs, bits)); rows.append(ev(f, env))
    ones = [i for i, r in enumerate(rows) if r]
    sop = SOPform([sp.Symbol(v) for v in vs], ones) if 0 < len(ones) < len(rows) else None
    lits = len(sp.sympify(sop).atoms(sp.Symbol)) if False else None
    sop_lits = None
    if sop is not None:
        e = sop
        terms = e.args if isinstance(e, sp.Or) else [e]
        sop_lits = sum(len(t.args) if isinstance(t, sp.And) else 1 for t in terms)
    add('logic', 'truth table of ' + show(f), vars=vs, rows=rows, soplits=sop_lits)
for _ in range(10):
    f, g = rnd_formula(3), rnd_formula(3)
    vs = sorted(vars_of(f) | vars_of(g))
    same = all(ev(f, dict(zip(vs, b))) == ev(g, dict(zip(vs, b))) for b in itertools.product([False, True], repeat=len(vs)))
    add('equiv', show(f) + ' equivalent to ' + show(g), same=same)
# graphs
def rnd_graph(directed=False, weighted=False, nmax=7):
    n = rnd.randint(4, nmax)
    edges = set()
    for _ in range(rnd.randint(n - 1, n * 2)):
        u, v = rnd.sample(range(1, n + 1), 2)
        if not directed and (v, u) in edges: continue
        edges.add((u, v))
    return n, sorted(edges)
for _ in range(12):
    n, edges = rnd_graph()
    G = nx.Graph(); G.add_nodes_from(sorted({x for e in edges for x in e})); G.add_edges_from(edges)
    deg = dict(G.degree())
    comps = nx.number_connected_components(G)
    bip = nx.is_bipartite(G)
    odd = sum(1 for d in deg.values() if d % 2)
    connected_edges = nx.number_connected_components(G.subgraph([v for v in G if deg[v] > 0])) <= 1
    euler = 'circuit' if connected_edges and odd == 0 else 'path' if connected_edges and odd == 2 else 'none'
    add('graph', 'graphinfo(%s)' % json.dumps([list(e) for e in edges]), degrees=[deg[v] for v in sorted(G)], comps=comps, bip=bip, euler=euler, V=G.number_of_nodes(), E=G.number_of_edges())
for _ in range(12):
    n, edges = rnd_graph()
    W = [(u, v, rnd.randint(1, 9)) for u, v in edges]
    G = nx.Graph(); G.add_weighted_edges_from(W)
    if not nx.is_connected(G): continue
    s, t = rnd.sample(sorted(G), 2)
    add('dijkstra', 'shortestpath(%s, %d, %d)' % (json.dumps([list(e) for e in W]), s, t), length=nx.dijkstra_path_length(G, s, t))
    add('mst', 'mst(%s)' % json.dumps([list(e) for e in W]), weight=sum(d['weight'] for _, _, d in nx.minimum_spanning_edges(G, data=True)))
for _ in range(10):
    n, edges = rnd_graph(directed=True)
    D = nx.DiGraph()
    for u, v in edges: D.add_edge(u, v, capacity=rnd.randint(1, 9))
    nodes = sorted(D)
    s, t = nodes[0], nodes[-1]
    if s == t or not nx.has_path(D, s, t): continue
    W = [[u, v, D[u][v]['capacity']] for u, v in D.edges]
    add('maxflow', 'maxflow(%s, %d, %d)' % (json.dumps(W), s, t), value=nx.maximum_flow_value(D, s, t))
for _ in range(8):
    n, edges = rnd_graph(nmax=6)
    G = nx.Graph(); G.add_edges_from(edges)
    nodes = sorted(G); best = None
    for k in range(1, len(nodes) + 1):
        for col in itertools.product(range(k), repeat=len(nodes)):
            m = dict(zip(nodes, col))
            if all(m[u] != m[v] for u, v in G.edges): best = k; break
        if best: break
    add('coloring', 'coloring(%s)' % json.dumps([list(e) for e in edges]), chi=best)
for _ in range(6):
    n = rnd.randint(4, 8)
    edges = sorted({(u, v) for u in range(1, n + 1) for v in range(u + 1, n + 1) if rnd.random() < 0.4})
    if not edges: continue
    add('topsort', 'topsort(%s)' % json.dumps([list(e) for e in edges]), edges=[list(e) for e in edges])
print(json.dumps(cases, default=int))
