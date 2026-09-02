#!/usr/bin/env python3
"""
Adversarial local search for prefix violations of WR_r / ISO_r on forests
(Erdős Problem #993 project; see forest_indep.py for the framework).

Target of the project:  for every forest and every prefix index
1 <= r <= L(alpha) - 1,   L(alpha) = ceil((2 alpha - 1)/3),

    WR_r :  p_{r-1} <= r p_r
    ISO_r:  Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0,
            i.e.  rho_r := (r p_r^2 + p_{r-1}^2) / ((r+1) p_{r-1} p_{r+1}) >= 1.

This script tries to FIND a counterexample by minimising rho_r (and the
normalised WR slack (r p_r - p_{r-1}) / p_{r-1}) with simulated annealing
over trees of fixed order (moves: leaf move, prune-and-regraft, subtree
swap) and over forests of fixed order (additionally: detach a subtree into
a new component, attach a component under a vertex of another one), from
seeded starts (random Prüfer trees, stars, spiders, caterpillars, brooms,
double stars, KLYM (left,k,k) trees, Galvin T_{m,t,1}, random forests,
matchings, star forests, preferential-attachment trees).  Per prefix index
r (and per "top" index r = L-1, "top1" index r = L-2) it records the
smallest exact rho_r ever seen together with the forest achieving it.

Exactness policy
----------------
* Every independence polynomial is computed exactly with Python integers.
  The hot loop uses the same f/g rooted-tree DP as
  forest_indep.indep_poly_tree, with each polynomial packed into a single
  integer (Kronecker substitution, B = n+1 bits per coefficient).  Packing
  is exact: every intermediate polynomial is the independence polynomial of
  a sub-forest on <= n vertices (times x at most), so its coefficient sum is
  <= 2^n < 2^B and no chunk can ever carry into its neighbour.  The packed
  DP is checked against forest_indep.indep_poly_from_edges on random forests
  at start-up.
* Violation verdicts (Q_r < 0 or r p_r - p_{r-1} < 0) are made with exact
  integer arithmetic on EVERY evaluated forest.  A violation stops the
  search; the forest is then re-verified with indep_poly_from_edges, with
  indep_poly_bruteforce when n <= 20, and with an independent recurrence
  I(G) = I(G - v) + x I(G - N[v]) otherwise.
* Floats are used only to steer the annealer (energy = log(rho_r - 1)) and
  as a pre-filter for record updates (a candidate is compared exactly, as a
  Fraction, whenever its float is within 1e-9 relative of the record).
  Every stored record value is an exact Fraction and every record
  comparison is exact.
* At the end every recorded extremal forest is recomputed from its edge
  list with forest_indep.indep_poly_from_edges (which also validates
  acyclicity) and its ratios are recomputed from that polynomial.

Usage
-----
    python3 adversarial_iso_search.py                # full plan (~25 min)
    python3 adversarial_iso_search.py --scale 0.05   # quick smoke test
    python3 adversarial_iso_search.py --phases tree:20,forest:20 --scale 0.2

Output: results/adversarial_iso_search.json (all records, exact fractions
as strings "num/den", approximate decimals labelled *_approx) and a
Markdown table dump in /tmp/adversarial_iso_tables.md.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
from collections import Counter
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import forest_indep as FI  # noqa: E402

INF = float("inf")
FLOAT_FILTER = 1e-9   # relative slack of the float pre-filter (see docstring)

# ---------------------------------------------------------------------------
# Exact independence polynomial of a rooted forest (packed-integer f/g DP)
# ---------------------------------------------------------------------------


def packed_poly(n, parent, order):
    """Packed independence polynomial (B = n+1 bits per coefficient) of the
    rooted forest ``parent``; ``order`` lists every vertex with parents
    before children.  f[v] = I(subtree(v) - v), g[v] = x * I(subtree(v) - N[v])."""
    X = 1 << (n + 1)
    f = [1] * n
    g = [X] * n
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            f[p] *= f[v] + g[v]
            g[p] *= f[v]
    total = 1
    for v in range(n):
        if parent[v] < 0:
            total *= f[v] + g[v]
    return total


def unpack_poly(P, B):
    mask = (1 << B) - 1
    out = []
    while P:
        out.append(P & mask)
        P >>= B
    return out


class Forest:
    """Rooted forest on vertices 0..n-1 as a parent array (-1 = root)."""

    __slots__ = ("n", "parent", "children", "allow_forest")

    def __init__(self, n, parent, allow_forest):
        self.n = n
        self.parent = list(parent)
        self.children = [[] for _ in range(n)]
        for v, p in enumerate(self.parent):
            if p >= 0:
                self.children[p].append(v)
        self.allow_forest = allow_forest

    def bfs_order(self):
        par = self.parent
        order = [v for v in range(self.n) if par[v] < 0]
        ch = self.children
        i = 0
        while i < len(order):
            order.extend(ch[order[i]])
            i += 1
        return order

    def poly(self):
        return unpack_poly(packed_poly(self.n, self.parent, self.bfs_order()),
                           self.n + 1)

    def in_subtree(self, v, w):
        """True iff w lies in the subtree rooted at v."""
        par = self.parent
        while w >= 0:
            if w == v:
                return True
            w = par[w]
        return False

    def set_parent(self, v, w):
        old = self.parent[v]
        if old >= 0:
            self.children[old].remove(v)
        self.parent[v] = w
        if w >= 0:
            self.children[w].append(v)
        return old

    def undo(self, undo_list):
        for v, old in reversed(undo_list):
            self.set_parent(v, old)

    def edges(self):
        return [(p, v) for v, p in enumerate(self.parent) if p >= 0]

    def n_components(self):
        return sum(1 for p in self.parent if p < 0)


# ---------------------------------------------------------------------------
# Moves (every move keeps a forest; in tree mode also a single tree)
# ---------------------------------------------------------------------------


def propose(F: Forest, rng: random.Random):
    """Apply one random move in place; return the undo list or None."""
    n = F.n
    par = F.parent
    ch = F.children
    forest = F.allow_forest
    u = rng.random()
    if u < 0.40:
        # ---- leaf move: detach a (non-root) leaf and hang it elsewhere
        for _ in range(24):
            v = rng.randrange(n)
            if par[v] >= 0 and not ch[v]:
                break
        else:
            return None
        if forest and rng.random() < 0.08:
            w = -1                                  # split off as isolated vertex
        elif rng.random() < 0.5:
            w = rng.randrange(n)                    # uniform target
        else:
            x = rng.randrange(n)                    # degree-biased target
            w = par[x] if par[x] >= 0 else x
        if w == v or w == par[v]:
            return None
        return [(v, F.set_parent(v, w))]
    if u < 0.75:
        # ---- prune a subtree and regraft it (in forest mode the subtree may
        #      be a whole component, or be cut off into a new component)
        for _ in range(24):
            v = rng.randrange(n)
            if par[v] >= 0 or forest:
                break
        else:
            return None
        if forest and par[v] >= 0 and rng.random() < 0.10:
            w = -1
        else:
            for _ in range(24):
                w = rng.randrange(n)
                if not F.in_subtree(v, w):
                    break
            else:
                return None
        if w == par[v]:
            return None
        return [(v, F.set_parent(v, w))]
    # ---- swap two subtrees (neither an ancestor of the other)
    for _ in range(24):
        a = rng.randrange(n)
        b = rng.randrange(n)
        if a != b and par[a] >= 0 and par[b] >= 0 and par[a] != par[b] \
                and not F.in_subtree(a, b) and not F.in_subtree(b, a):
            break
    else:
        return None
    pa, pb = par[a], par[b]
    F.set_parent(a, pb)
    F.set_parent(b, pa)
    return [(a, pa), (b, pb)]


# ---------------------------------------------------------------------------
# Exact prefix data / energies
# ---------------------------------------------------------------------------


def prefix_rows(p):
    """alpha, L and exact rows (r, a, b, c, Q_r, D_r, W_r) for r = 1..L-1,
    with a = p_{r-1}, b = p_r, c = p_{r+1}, D_r = (r+1) a c,
    Q_r = r b^2 + a^2 - D_r  (rho_r = 1 + Q_r/D_r),  W_r = r b - a."""
    alpha = len(p) - 1
    L = FI.L_cutoff(alpha) if alpha >= 1 else 0
    rows = []
    for r in range(1, L):
        a = p[r - 1]
        b = p[r]
        c = p[r + 1]
        D = (r + 1) * a * c
        rows.append((r, a, b, c, r * b * b + a * a - D, D, r * b - a))
    return alpha, L, rows


def target_index(target, L):
    """Prefix index addressed by a target, or None if undefined for this L."""
    if target == "top":
        r = L - 1
    elif target == "top1":
        r = L - 2
    elif target.startswith("r="):
        r = int(target[2:])
    else:
        return None
    return r if 1 <= r <= L - 1 else None


def energy(rows, L, target):
    """Float energy (smaller = tighter); INF when the target is undefined."""
    if target == "min":
        best = INF
        for row in rows:
            x = row[4] / row[5]
            if x < best:
                best = x
        return math.log(best) if best > 0 else -INF
    if target == "wr":
        best = INF
        for row in rows:
            x = row[6] / row[1]
            if x < best:
                best = x
        return math.log(best) if best > 0 else -INF
    r = target_index(target, L)
    if r is None:
        return INF
    row = rows[r - 1]
    x = row[4] / row[5]
    return math.log(x) if x > 0 else -INF


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------


class Recorder:
    def __init__(self):
        self.rho = {}      # (mode, n) -> {key: record}
        self.wr = {}
        self.rho_f = {}    # (mode, n) -> {key: float excess of the record}
        self.wr_f = {}
        self.evals = 0
        self.violations = []
        self.tight = []
        self.ctx = None    # current run context (dict)

    def begin(self, mode, n, ctx):
        key0 = (mode, n)
        self.rho.setdefault(key0, {})
        self.wr.setdefault(key0, {})
        self.rho_f.setdefault(key0, {})
        self.wr_f.setdefault(key0, {})
        ctx = dict(ctx)
        ctx["mode"] = mode
        ctx["n"] = n
        self.ctx = ctx
        self._rr = self.rho[key0]
        self._wr = self.wr[key0]
        self._rf = self.rho_f[key0]
        self._wf = self.wr_f[key0]

    def _record(self, F, p, alpha, L, r, row, kind):
        rec = {
            "mode": self.ctx["mode"], "n": self.ctx["n"], "r": r,
            "alpha": alpha, "L": L, "edges": F.edges(), "poly": list(p),
            "target": self.ctx["target"], "seed": self.ctx["seed"],
            "run": self.ctx["run"], "eval": self.evals, "kind": kind,
        }
        _, a, b, c, Q, D, W = row
        rec["Q"] = Q
        rec["D"] = D
        rec["W"] = W
        return rec

    def update(self, F, p, alpha, L, rows):
        """Exact violation check + record update.  Returns True on violation."""
        self.evals += 1
        rr, wr_, rf, wf = self._rr, self._wr, self._rf, self._wf
        for row in rows:
            r, a, b, c, Q, D, W = row
            if Q < 0 or W < 0:
                rec = self._record(F, p, alpha, L, r, row, "VIOLATION")
                rec["which"] = ("ISO" if Q < 0 else "") + ("WR" if W < 0 else "")
                self.violations.append(rec)
                return True
            if Q == 0 or W == 0:
                rec = self._record(F, p, alpha, L, r, row, "TIGHT")
                self.tight.append(rec)
            x = Q / D
            keys = (r,)
            if r == L - 1:
                keys = (r, "top")
            elif r == L - 2:
                keys = (r, "top1")
            for key in keys:
                if x < rf.get(key, INF) * (1 + FLOAT_FILTER):
                    ex = Fraction(Q, D)
                    cur = rr.get(key)
                    if cur is None or ex < cur["excess"]:
                        rec = self._record(F, p, alpha, L, r, row, "rho")
                        rec["excess"] = ex
                        rr[key] = rec
                        rf[key] = x
            y = W / a
            for key in keys:
                if y < wf.get(key, INF) * (1 + FLOAT_FILTER):
                    ex = Fraction(W, a)
                    cur = wr_.get(key)
                    if cur is None or ex < cur["excess"]:
                        rec = self._record(F, p, alpha, L, r, row, "wr")
                        rec["excess"] = ex
                        wr_[key] = rec
                        wf[key] = y
        return False


# ---------------------------------------------------------------------------
# Seeds
# ---------------------------------------------------------------------------


def edges_to_parent(n, edges):
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    parent = [-2] * n
    for s in range(n):
        if parent[s] != -2:
            continue
        parent[s] = -1
        stack = [s]
        while stack:
            v = stack.pop()
            for w in adj[v]:
                if parent[w] == -2:
                    parent[w] = v
                    stack.append(w)
    return parent


def pad_to(parent, n):
    """Attach missing vertices as leaves of the first root (the centre)."""
    while len(parent) < n:
        parent.append(0)
    return parent


def seed_star(n):
    return [-1] + [0] * (n - 1)


def seed_path(n):
    return [-1] + list(range(n - 1))


def seed_spider(n, rng, maxleg):
    parent = [-1]
    remaining = n - 1
    while remaining > 0:
        leg = min(remaining, rng.randint(1, maxleg))
        prev = 0
        for _ in range(leg):
            parent.append(prev)
            prev = len(parent) - 1
        remaining -= leg
    return parent


def seed_subdivided_star(n):
    parent = [-1]
    remaining = n - 1
    while remaining >= 2:
        parent.append(0)
        parent.append(len(parent) - 1)
        remaining -= 2
    if remaining == 1:
        parent.append(0)
    return parent


def seed_caterpillar(n, rng):
    s = rng.randint(2, max(2, n // 2))
    parent = [-1] + list(range(s - 1))
    for _ in range(s, n):
        parent.append(rng.randrange(s))
    return parent


def seed_double_star(n, a):
    return [-1, 0] + [0] * a + [1] * (n - 2 - a)


def seed_broom(n, h):
    """Path on h vertices with n-h pendant leaves at its last vertex."""
    return [-1] + list(range(h - 1)) + [h - 1] * (n - h)


def seed_klym(n):
    """KLYM (left,k,k) tree of order <= n (left = 3 when possible), padded."""
    choice = None
    for left in (3, 2, 4, 1, 5, 6, 7, 8):
        rem = (n - 4) // 2 - left
        if rem >= 2 and rem % 2 == 0:
            choice = (left, rem // 2)
            break
    if choice is None:
        for left in range(1, n):
            k = ((n - 4) // 2 - left) // 2
            if k >= 1:
                choice = (left, k)
                break
    left, k = choice
    m, edges = FI.klym_3kk_tree(k, left=left)
    return pad_to(edges_to_parent(m, edges), n), f"klym(left={left},k={k})"


def seed_galvin(n):
    """Galvin T_{m,t,1}: root, m children, each with t children, each with
    one child; (m,t) with t >= 2 chosen to minimise padding, padded."""
    best = None
    for t in (2, 3, 4, 5):
        m = (n - 1) // (1 + 2 * t)
        if m < 2:
            continue
        pad = n - (1 + m * (1 + 2 * t))
        cand = (pad, -t, m, t)
        if best is None or cand < best:
            best = cand
    if best is None:
        return seed_spider(n, random.Random(0), 3), "spider3"
    _, _, m, t = best
    parent = [-1]
    for _ in range(m):
        parent.append(0)
        c = len(parent) - 1
        for _ in range(t):
            parent.append(c)
            d = len(parent) - 1
            parent.append(d)
    return pad_to(parent, n), f"galvin(m={m},t={t})"


def seed_prufer(n, rng):
    seq = [rng.randrange(n) for _ in range(n - 2)]
    return edges_to_parent(n, FI.prufer_to_edges(seq, n))


def seed_pref_attach(n, rng):
    parent = [-1]
    bag = [0]
    for v in range(1, n):
        u = rng.choice(bag)
        parent.append(u)
        bag.append(u)
        bag.append(v)
    return parent


def seed_random_forest(n, rng, edge_prob=0.85):
    parent = [-1]
    for v in range(1, n):
        parent.append(rng.randrange(v) if rng.random() < edge_prob else -1)
    return parent


def seed_matching(n):
    parent = []
    for i in range(n // 2):
        parent += [-1, 2 * i]
    if n % 2:
        parent.append(-1)
    return parent


def seed_star_forest(n, rng):
    k = rng.randint(2, 4)
    cuts = sorted(rng.sample(range(2, n - 1), k - 1)) if n > k + 2 else []
    sizes = [b - a for a, b in zip([0] + cuts, cuts + [n])]
    parent = []
    for s in sizes:
        base = len(parent)
        parent.append(-1)
        parent += [base] * (s - 1)
    return parent


STRUCTURED_TREE = ["star", "spider2", "caterpillar", "klym", "galvin", "double_star",
                   "subdivided_star", "spider3", "broom", "pref_attach", "path"]
STRUCTURED_FOREST = ["star", "matching", "star_forest", "klym", "galvin",
                     "subdivided_star", "caterpillar", "path"]


def build_seed(name, n, rng):
    if name == "star":
        return seed_star(n), "star"
    if name == "path":
        return seed_path(n), "path"
    if name == "spider2":
        return seed_spider(n, rng, 2), "spider(legs<=2)"
    if name == "spider3":
        return seed_spider(n, rng, 3), "spider(legs<=3)"
    if name == "caterpillar":
        return seed_caterpillar(n, rng), "caterpillar"
    if name == "klym":
        return seed_klym(n)
    if name == "galvin":
        return seed_galvin(n)
    if name == "double_star":
        a = rng.randint(1, n - 3)
        return seed_double_star(n, a), f"double_star({a},{n - 2 - a})"
    if name == "subdivided_star":
        return seed_subdivided_star(n), "subdivided_star"
    if name == "broom":
        h = rng.randint(2, n - 2)
        return seed_broom(n, h), f"broom(h={h})"
    if name == "pref_attach":
        return seed_pref_attach(n, rng), "pref_attach"
    if name == "prufer":
        return seed_prufer(n, rng), "prufer"
    if name == "matching":
        return seed_matching(n), "matching"
    if name == "star_forest":
        return seed_star_forest(n, rng), "star_forest"
    if name == "random_forest":
        return seed_random_forest(n, rng), "random_forest"
    raise ValueError(name)


def make_seed(mode, n, restart, ti, rng, target, fam_best):
    """restart 0: random start; restart 1: best member of the exact family
    scan for this target (falls back to a structured seed); restart 2:
    structured seed from a fixed cycle."""
    cycle = STRUCTURED_TREE if mode == "tree" else STRUCTURED_FOREST
    if restart == 0:
        return build_seed("prufer" if mode == "tree" else "random_forest", n, rng)
    if restart == 1:
        key = target_index(target, 10 ** 9) if target.startswith("r=") else target
        if key in fam_best:
            _, name, _, parent = fam_best[key]
            return list(parent), "family:" + name
        if mode == "tree":
            return build_seed("pref_attach", n, rng)
        return build_seed("star_forest", n, rng)
    return build_seed(cycle[ti % len(cycle)], n, rng)


# ---------------------------------------------------------------------------
# Simulated annealing
# ---------------------------------------------------------------------------


def sa_run(mode, n, target, seed_name, parent, budget_s, rng, rec, run_id,
           T0=0.6, T1=0.008):
    F = Forest(n, parent, mode == "forest")
    rec.begin(mode, n, {"target": target, "seed": seed_name, "run": run_id})
    p = F.poly()
    alpha, L, rows = prefix_rows(p)
    if rec.update(F, p, alpha, L, rows):
        return {"status": "VIOLATION", "target": target, "seed": seed_name}
    cur = energy(rows, L, target)
    if cur == INF:
        # seed does not reach the requested prefix index: fall back to a star
        F = Forest(n, seed_star(n), mode == "forest")
        seed_name = seed_name + "->star"
        rec.begin(mode, n, {"target": target, "seed": seed_name, "run": run_id})
        p = F.poly()
        alpha, L, rows = prefix_rows(p)
        if rec.update(F, p, alpha, L, rows):
            return {"status": "VIOLATION", "target": target, "seed": seed_name}
        cur = energy(rows, L, target)
        if cur == INF:
            return {"status": "infeasible", "target": target, "seed": seed_name}
    best = cur
    best_parent = list(F.parent)
    evals = accepted = 0
    logratio = math.log(T1 / T0)
    t0 = time.perf_counter()
    while True:
        frac = (time.perf_counter() - t0) / budget_s
        if frac >= 1.0:
            break
        T = T0 * math.exp(logratio * frac)
        undo = propose(F, rng)
        if undo is None:
            continue
        p = F.poly()
        alpha, L, rows = prefix_rows(p)
        evals += 1
        if rec.update(F, p, alpha, L, rows):
            return {"status": "VIOLATION", "target": target, "seed": seed_name}
        E = energy(rows, L, target)
        if E <= cur or (E < INF and rng.random() < math.exp((cur - E) / T)):
            cur = E
            accepted += 1
            if E < best:
                best = E
                best_parent = list(F.parent)
        else:
            F.undo(undo)
    return {"status": "ok", "mode": mode, "n": n, "target": target, "seed": seed_name,
            "run": run_id, "evals": evals, "accepted": accepted,
            "seconds": round(time.perf_counter() - t0, 2),
            "best_excess_approx": (math.exp(best) if best > -INF else 0.0),
            "best_parent": best_parent}


def targets_for(mode, n):
    t = ["min", "top", "top1", "r=3", "r=4", "r=5", "r=6", "wr"]
    if n >= 40:
        t += ["r=8", "r=10"]
    if n >= 60:
        t += ["r=13", "r=16"]
    if n >= 100:
        t += ["r=20", "r=28"]
    return t


def restarts_for(target, n):
    if target == "wr":
        return 1
    if target in ("top", "top1"):
        return 2
    return 3


def run_phase(mode, n, budget_s, rec, base_seed, log, runs_out, fam_best, targets_override=None):
    targets = targets_override or targets_for(mode, n)
    total_runs = sum(restarts_for(t, n) for t in targets)
    per_run = budget_s / total_runs
    log(f"=== phase {mode} n={n}: {total_runs} SA runs x {per_run:.1f}s "
        f"(targets {targets})")
    run_id = 0
    t_phase = time.perf_counter()
    for ti, target in enumerate(targets):
        for k in range(restarts_for(target, n)):
            seed_int = (base_seed * 1_000_003 + n * 7919 + ti * 104_729 + k * 15_485_863
                        + (0 if mode == "tree" else 982_451_653))
            rng = random.Random(seed_int)
            parent, seed_name = make_seed(mode, n, k, ti, rng, target, fam_best)
            res = sa_run(mode, n, target, seed_name, parent, per_run, rng, rec, run_id)
            res["rng_seed"] = seed_int
            run_id += 1
            runs_out.append(res)
            if res["status"] == "VIOLATION":
                log("!!! VIOLATION FOUND -- stopping optimisation")
                return True
            if res["status"] == "ok":
                log(f"  run {run_id:3d} {target:5s} seed={seed_name:28s} evals={res['evals']:7d} "
                    f"acc={res['accepted']:6d} best excess ~{res['best_excess_approx']:.3e}")
            else:
                log(f"  run {run_id:3d} {target:5s} seed={seed_name}: {res['status']}")
    log(f"=== phase {mode} n={n} done in {time.perf_counter() - t_phase:.1f}s; "
        f"total evaluations so far {rec.evals}")
    return False


# ---------------------------------------------------------------------------
# Structure descriptions
# ---------------------------------------------------------------------------


def _components(n, edges):
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    seen = [False] * n
    comps = []
    for s in range(n):
        if seen[s]:
            continue
        comp = [s]
        seen[s] = True
        i = 0
        while i < len(comp):
            for w in adj[comp[i]]:
                if not seen[w]:
                    seen[w] = True
                    comp.append(w)
            i += 1
        comps.append(comp)
    return adj, comps


def _diameter(comp, adj):
    def far(s):
        dist = {s: 0}
        q = [s]
        i = 0
        while i < len(q):
            v = q[i]
            i += 1
            for w in adj[v]:
                if w not in dist:
                    dist[w] = dist[v] + 1
                    q.append(w)
        v = max(dist, key=dist.get)
        return v, dist[v]
    v, _ = far(comp[0])
    _, d = far(v)
    return d


def _hist(values):
    c = Counter(values)
    return " ".join(f"{k}^{c[k]}" if c[k] > 1 else f"{k}" for k in sorted(c, reverse=True))


def describe_component(comp, adj):
    k = len(comp)
    if k == 1:
        return "K1"
    if k == 2:
        return "K2"
    deg = {v: len(adj[v]) for v in comp}
    maxdeg = max(deg.values())
    branch = [v for v in comp if deg[v] >= 3]
    leaves = sum(1 for v in comp if deg[v] == 1)
    diam = _diameter(comp, adj)
    if maxdeg <= 2:
        return f"P{k} (path)"
    if len(branch) == 1:
        c = branch[0]
        if deg[c] == k - 1:
            return f"K_{{1,{k - 1}}} (star)"
        legs = []
        for w in adj[c]:
            length, prev, cur = 1, c, w
            while deg[cur] == 2:
                nxt = adj[cur][0] if adj[cur][0] != prev else adj[cur][1]
                prev, cur = cur, nxt
                length += 1
            legs.append(length)
        return f"spider(k={k}, centre deg {deg[c]}, legs {_hist(legs)})"
    inner = [v for v in comp if deg[v] >= 2]
    inner_set = set(inner)
    if all(sum(1 for w in adj[v] if w in inner_set) <= 2 for v in inner):
        # walk the spine from one end so the degrees are listed in spine order
        ends = [v for v in inner if sum(1 for w in adj[v] if w in inner_set) <= 1]
        walk, prev, cur = [], None, ends[0]
        while cur is not None:
            walk.append(cur)
            nxt = [w for w in adj[cur] if w in inner_set and w != prev]
            prev, cur = cur, (nxt[0] if nxt else None)
        seq = [deg[v] for v in walk]
        seq = max(seq, seq[::-1])
        pend = "-".join(str(x) for x in seq)
        if len(inner) == 2:
            return f"double_star(k={k}, centre degrees {pend})"
        return f"caterpillar(k={k}, spine degrees {pend}, {leaves} leaves)"
    # pendant K2 count: leaves whose neighbour has degree 2
    pend2 = sum(1 for v in comp if deg[v] == 1 and deg[adj[v][0]] == 2)
    return (f"tree(k={k}, maxdeg {maxdeg}, {leaves} leaves, {len(branch)} branch vertices "
            f"with degrees {_hist(deg[v] for v in branch)}, {pend2} pendant K2s, diameter {diam})")


def describe(n, edges):
    adj, comps = _components(n, edges)
    comps.sort(key=len, reverse=True)
    parts = [describe_component(c, adj) for c in comps]
    cnt = Counter(parts)
    summary = " + ".join(f"{c}x {s}" if c > 1 else s for s, c in cnt.items())
    forms = []
    for c in comps:
        idx = {v: i for i, v in enumerate(c)}
        sub = [(idx[a], idx[b]) for a, b in edges if a in idx and b in idx]
        forms.append(FI.tree_canonical_form(len(c), sub))
    canon = "|".join(sorted(forms))
    return {"summary": summary, "components": len(comps),
            "component_sizes": [len(c) for c in comps],
            "degree_histogram": _hist(len(adj[v]) for v in range(n)),
            "canonical_form": canon}


# ---------------------------------------------------------------------------
# Independent recomputations (used only for violations / headline)
# ---------------------------------------------------------------------------


def indep_poly_recurrence(n, edges, max_states=3_000_000):
    """I(G) = I(G - v) + x I(G - N[v]) on bitmasks, splitting into connected
    components, memoised.  Independent of the tree DP."""
    nb = [0] * n
    for a, b in edges:
        nb[a] |= 1 << b
        nb[b] |= 1 << a
    memo = {}

    def comps(mask):
        out = []
        while mask:
            s = mask & -mask
            comp = s
            frontier = s
            while frontier:
                v = (frontier & -frontier).bit_length() - 1
                frontier &= frontier - 1
                new = nb[v] & mask & ~comp
                comp |= new
                frontier |= new
            out.append(comp)
            mask &= ~comp
        return out

    def I(mask):
        if mask == 0:
            return [1]
        got = memo.get(mask)
        if got is not None:
            return got
        if len(memo) > max_states:
            raise RuntimeError("recurrence state cap exceeded")
        cs = comps(mask)
        if len(cs) > 1:
            res = [1]
            for c in cs:
                res = FI.poly_mul(res, I(c))
        else:
            # pick the vertex of maximum degree inside mask
            best_v, best_d = -1, -1
            m = mask
            while m:
                v = (m & -m).bit_length() - 1
                m &= m - 1
                d = bin(nb[v] & mask).count("1")
                if d > best_d:
                    best_v, best_d = v, d
            if best_d == 0:
                res = [1, 1]
            else:
                res = FI.poly_add(I(mask & ~(1 << best_v)),
                                  [0] + I(mask & ~(nb[best_v] | (1 << best_v))))
        memo[mask] = res
        return res

    return FI.poly_strip(I((1 << n) - 1))


def verify_record(rec):
    """Recompute the record from its edge list with the core library."""
    n = rec["n"]
    edges = rec["edges"]
    P = FI.indep_poly_from_edges(n, edges)
    ok = (P == rec["poly"])
    r = rec["r"]
    a, b, c = P[r - 1], P[r], P[r + 1]
    alpha = len(P) - 1
    L = FI.L_cutoff(alpha)
    ok = ok and (alpha == rec["alpha"]) and (L == rec["L"]) and (1 <= r <= L - 1)
    if rec["kind"] in ("rho", "VIOLATION", "TIGHT"):
        ok = ok and Fraction(FI.Q_iso(P, r), (r + 1) * a * c) == Fraction(rec["Q"], rec["D"])
    if rec["kind"] == "wr":
        ok = ok and Fraction(FI.wr_slack(P, r), a) == Fraction(rec["W"], a)
    if rec["mode"] == "tree":
        ok = ok and len(edges) == n - 1
    return ok


# ---------------------------------------------------------------------------
# Exact scan of named families (reference values, no search)
# ---------------------------------------------------------------------------


def family_members(mode, n):
    yield "star", seed_star(n)
    yield "path", seed_path(n)
    for a in range(1, (n - 2) // 2 + 1):
        yield f"double_star({a},{n - 2 - a})", seed_double_star(n, a)
    for j in range(1, (n - 1) // 2 + 1):
        parent = [-1]
        for _ in range(j):
            parent.append(0)
            parent.append(len(parent) - 1)
        parent += [0] * (n - 1 - 2 * j)
        yield f"spider(legs 2^{j} 1^{n - 1 - 2 * j})", parent
    for j in range(1, (n - 1) // 3 + 1):
        parent = [-1]
        for _ in range(j):
            parent.append(0)
            parent.append(len(parent) - 1)
            parent.append(len(parent) - 1)
        parent += [0] * (n - 1 - 3 * j)
        yield f"spider(legs 3^{j} 1^{n - 1 - 3 * j})", parent
    for h in range(2, n - 1):
        yield f"broom(h={h})", seed_broom(n, h)
    # triple stars: spine u-v-w with a, b, c pendant leaves (a <= c)
    for a in range(0, n - 3):
        for c in range(a, n - 3 - a):
            b = n - 3 - a - c
            if b < 0:
                break
            yield f"triple_star({a},{b},{c})", [-1, 0, 1] + [0] * a + [1] * b + [2] * c
    # two stars joined through a degree-2 vertex: K_{1,a} - v - K_{1,b}
    for a in range(1, (n - 3) // 2 + 1):
        b = n - 3 - a
        yield f"bistar_subdivided({a},{b})", [-1, 0, 1] + [0] * a + [2] * b
    # three stars joined through degree-2 vertices: K_{1,a} - v - K_{1,b} - w - K_{1,c}
    for a in range(0, n - 5):
        for c in range(a, n - 5 - a):
            b = n - 5 - a - c
            if b < 0:
                break
            yield (f"tristar_subdivided({a},{b},{c})",
                   [-1, 0, 1, 2, 3] + [0] * a + [2] * b + [4] * c)
    parent, name = seed_klym(n)
    yield name, parent
    parent, name = seed_galvin(n)
    yield name, parent
    if mode == "forest":
        yield "edgeless", [-1] * n
        yield "matching", seed_matching(n)
        for s in range(1, n - 2):
            yield f"star K_{{1,{n - 1 - s}}} + {s} K1", seed_star(n - s) + [-1] * s
        for s in range(1, (n - 2) // 2 + 1):
            parent = seed_star(n - 2 * s)
            for _ in range(s):
                parent += [-1, len(parent)]
            yield f"star K_{{1,{n - 1 - 2 * s}}} + {s} K2", parent
        for a in range(1, (n - 2) // 2 + 1):
            b = n - 2 - a
            yield f"K_{{1,{a}}} + K_{{1,{b}}}", seed_star(a + 1) + [-1] + [a + 1] * (b)
        for s in range(1, n - 4):
            m = n - s
            for a in range(1, (m - 2) // 2 + 1):
                yield f"double_star({a},{m - 2 - a}) + {s} K1", seed_double_star(m, a) + [-1] * s


def scan_families(mode, n):
    """Exact per-key minimum of rho over the named families; keys are the
    prefix indices r plus 'top' (r = L-1), 'top1' (r = L-2), 'min'.
    Returns {key: (excess, name, alpha, parent)} and the star's rows."""
    best = {}
    star_rows = None
    violations = []
    for name, parent in family_members(mode, n):
        F = Forest(n, parent, True)
        p = F.poly()
        alpha, L, rows = prefix_rows(p)
        if name == "star":
            star_rows = (alpha, L, rows)
        for r, a, b, c, Q, D, W in rows:
            if Q < 0 or W < 0:   # exact verdict
                violations.append({"mode": mode, "n": n, "family_member": name, "r": r,
                                   "alpha": alpha, "L": L, "edges": F.edges(), "poly": list(p),
                                   "Q": Q, "D": D, "W": W, "kind": "VIOLATION",
                                   "which": ("ISO" if Q < 0 else "") + ("WR" if W < 0 else ""),
                                   "target": "family_scan", "seed": name, "run": -1, "eval": -1})
                continue
            ex = Fraction(Q, D)
            keys = [r, "min"]
            if r == L - 1:
                keys.append("top")
            elif r == L - 2:
                keys.append("top1")
            for key in keys:
                cur = best.get(key)
                if cur is None or ex < cur[0]:
                    best[key] = (ex, name, alpha, list(parent))
    return best, star_rows, violations


# ---------------------------------------------------------------------------
# Reporting helpers
# ---------------------------------------------------------------------------


def frac_str(x: Fraction) -> str:
    return f"{x.numerator}/{x.denominator}"


def rec_json(rec, verified):
    if rec["kind"] == "wr":
        ex = Fraction(rec["W"], rec["poly"][rec["r"] - 1])
    else:
        ex = Fraction(rec["Q"], rec["D"])
    out = {
        "mode": rec["mode"], "n": rec["n"], "r": rec["r"], "alpha": rec["alpha"],
        "L": rec["L"], "kind": rec["kind"],
        "target": rec["target"], "seed": rec["seed"], "run": rec["run"], "eval": rec["eval"],
        "edges": rec["edges"], "poly": rec["poly"], "verified_with_core": verified,
        "structure": describe(rec["n"], rec["edges"]),
    }
    if rec["kind"] == "wr":
        out["wr_slack_normalised_exact"] = frac_str(ex)
        out["wr_slack_normalised_approx"] = float(ex)
        out["wr_slack_exact_int"] = rec["W"]
    else:
        out["rho_exact"] = frac_str(1 + ex)
        out["rho_approx"] = float(1 + ex)
        out["rho_minus_1_exact"] = frac_str(ex)
        out["rho_minus_1_approx"] = float(ex)
        out["Q_exact_int"] = rec["Q"]
    if "which" in rec:
        out["which"] = rec["which"]
    return out


def star_rho2(n):
    m = n - 1
    return 1 + Fraction(2 * (2 * m * m + m + 1), (m + 1) * m * (m - 1) * (m - 2))


def fit_exponent(ns, xs):
    """Least-squares slope of log(x) against log(n) (approximate)."""
    if len(ns) < 2:
        return None
    lx = [math.log(x) for x in xs]
    ln = [math.log(v) for v in ns]
    mn = sum(ln) / len(ln)
    mx = sum(lx) / len(lx)
    num = sum((a - mn) * (b - mx) for a, b in zip(ln, lx))
    den = sum((a - mn) ** 2 for a in ln)
    return num / den if den else None


# ---------------------------------------------------------------------------
# Exhaustive certification for one small order (all nonisomorphic trees)
# ---------------------------------------------------------------------------


def exhaustive_trees(n, log):
    """Exact minimum of rho_r (and of the normalised WR slack) over ALL
    nonisomorphic trees of order n, per prefix index; also an exact check
    that no tree of order n violates WR_r / ISO_r in the prefix."""
    t0 = time.perf_counter()
    best, best_f, bwr, bwr_f = {}, {}, {}, {}
    violations = []
    count = 0
    for seq in FI.tree_level_sequences(n):
        parent = FI.level_sequence_to_parent(seq)
        p = unpack_poly(packed_poly(n, parent, range(n)), n + 1)
        alpha, L, rows = prefix_rows(p)
        count += 1
        for r, a, b, c, Q, D, W in rows:
            if Q < 0 or W < 0:
                violations.append({"parent": list(parent), "r": r, "Q": Q, "W": W, "poly": p})
                continue
            keys = (r,) if r < L - 2 else ((r, "top") if r == L - 1 else (r, "top1"))
            x = Q / D
            y = W / a
            for key in keys:
                if x < best_f.get(key, INF) * (1 + FLOAT_FILTER):
                    ex = Fraction(Q, D)
                    if key not in best or ex < best[key][0]:
                        best[key] = (ex, list(parent), alpha, L, r, list(p))
                        best_f[key] = x
                if y < bwr_f.get(key, INF) * (1 + FLOAT_FILTER):
                    ey = Fraction(W, a)
                    if key not in bwr or ey < bwr[key][0]:
                        bwr[key] = (ey, list(parent), alpha, L, r, list(p))
                        bwr_f[key] = y
    assert count == FI.count_trees(n), (count, FI.count_trees(n))
    log(f"exhaustive trees n={n}: {count} trees in {time.perf_counter() - t0:.1f}s, "
        f"{len(violations)} prefix violations")
    return {"n": n, "trees": count, "seconds": round(time.perf_counter() - t0, 1),
            "violations": violations, "best_rho": best, "best_wr": bwr}


def family_record(mode, n, key, name, parent):
    """JSON record (same layout as rec_json) for a family-scan member,
    computed from scratch with the core library."""
    edges = FI.parent_to_edges(parent)
    P = FI.indep_poly_from_edges(n, edges)
    alpha, L, rows = prefix_rows(P)
    r = key if isinstance(key, int) else (L - 1 if key == "top" else L - 2)
    row = rows[r - 1]
    _, a, b, c, Q, D, W = row
    ex = Fraction(Q, D)
    return {"mode": mode, "n": n, "r": r, "alpha": alpha, "L": L, "kind": "rho",
            "target": "family_scan", "seed": name, "run": -1, "eval": -1,
            "edges": edges, "poly": P, "verified_with_core": True,
            "structure": describe(n, edges), "key": str(key),
            "rho_exact": frac_str(1 + ex), "rho_approx": float(1 + ex),
            "rho_minus_1_exact": frac_str(ex), "rho_minus_1_approx": float(ex),
            "Q_exact_int": Q}


def recompute_derived(result):
    """Recompute scaling, family table, star comparison and the headline
    minimum from the (possibly merged) records."""
    recs = {}
    for j in result["rho_records"]:
        recs.setdefault((j["mode"], j["n"]), {})[j["key"]] = j
    plan = result["meta"]["plan"]
    scaling = {}
    for mode in ("tree", "forest"):
        ns = sorted({p["n"] for p in plan if p["mode"] == mode})
        for r in range(1, 11):
            pts = [(n, Fraction(recs[(mode, n)][str(r)]["rho_minus_1_exact"]))
                   for n in ns if (mode, n) in recs and str(r) in recs[(mode, n)]]
            if len(pts) >= 2:
                scaling[f"{mode}:r={r}"] = {
                    "points": [{"n": n, "rho_minus_1_exact": frac_str(ex),
                                "rho_minus_1_approx": float(ex),
                                "times_n_approx": float(ex) * n,
                                "times_n2_approx": float(ex) * n * n} for n, ex in pts],
                    "loglog_slope_approx": fit_exponent([n for n, _ in pts], [float(ex) for _, ex in pts]),
                }
    result["scaling"] = scaling
    for key0, d in recs.items():
        mode, n = key0
        if "2" in d:
            ex = Fraction(d["2"]["rho_minus_1_exact"])
            s = star_rho2(n) - 1
            result["star_comparison_r2"][f"{mode}:{n}"] = {
                "best_found_rho2_minus_1_exact": frac_str(ex),
                "star_rho2_minus_1_exact": frac_str(s),
                "relation": ("equal to star" if ex == s else ("BELOW star" if ex < s else "above star")),
                "structure": d["2"]["structure"]["summary"],
            }
    overall = None
    for j in result["rho_records"]:
        if not j["key"].startswith("top"):
            ex = Fraction(j["rho_minus_1_exact"])
            if overall is None or ex < overall[0]:
                overall = (ex, j)
    if overall:
        oj = dict(overall[1])
        oj["recurrence_recomputation_agrees"] = (
            indep_poly_recurrence(oj["n"], [tuple(e) for e in oj["edges"]]) == oj["poly"])
        if oj["n"] <= 20:
            oj["bruteforce_recomputation_agrees"] = (
                FI.indep_poly_bruteforce(oj["n"], [tuple(e) for e in oj["edges"]]) == oj["poly"])
        result["headline"]["min_rho_prefix_overall"] = oj


def merge_exhaustive(path, n, log):
    with open(path) as fh:
        result = json.load(fh)
    # refresh the structure summaries with the current describe()
    for j in result["rho_records"] + result["wr_records"] + result["headline"]["violations"]:
        j["structure"] = describe(j["n"], [tuple(e) for e in j["edges"]])
    for k in ("min_rho_prefix_overall", "min_wr_normalised_slack_overall"):
        j = result["headline"].get(k)
        if j:
            j["structure"] = describe(j["n"], [tuple(e) for e in j["edges"]])
    # merge the (possibly extended) exact family scan into the records
    merged = []
    for p in result["meta"]["plan"]:
        mode, nn = p["mode"], p["n"]
        best, star_rows, viol = scan_families(mode, nn)
        assert not viol, viol
        fam = {}
        for key in sorted(best, key=lambda k: (isinstance(k, str), k)):
            ex, name, alpha, parent = best[key]
            fam[str(key)] = {"family_member": name, "alpha": alpha,
                             "rho_minus_1_exact": frac_str(ex), "rho_minus_1_approx": float(ex)}
            if key == "min":
                continue
            cur = [j for j in result["rho_records"] if j["mode"] == mode and j["n"] == nn and j["key"] == str(key)]
            if cur and Fraction(cur[0]["rho_minus_1_exact"]) <= ex:
                continue
            rec = family_record(mode, nn, key, name, parent)
            assert Fraction(rec["rho_minus_1_exact"]) == ex
            if cur:
                result["rho_records"].remove(cur[0])
            result["rho_records"].append(rec)
            merged.append((mode, nn, key, name, float(ex), (float(Fraction(cur[0]["rho_minus_1_exact"])) if cur else None)))
        result["family_scan"][f"{mode}:{nn}"]["best_per_r"] = fam
    result["rho_records"].sort(key=lambda j: (j["mode"], j["n"], j["key"].startswith("top"),
                                              int(j["key"]) if not j["key"].startswith("top") else j["key"]))
    result["family_scan_merged_into_records"] = [
        {"mode": m, "n": nn, "key": str(k), "family_member": name, "rho_minus_1_approx": ex,
         "sa_record_rho_minus_1_approx": old} for m, nn, k, name, ex, old in merged]
    for m, nn, k, name, ex, old in merged:
        log(f"  family scan beats SA record at {m} n={nn} key={k}: {name} {ex:.6e} (SA {old})")
    recompute_derived(result)
    ex = exhaustive_trees(n, log)
    sa = {j["key"]: j for j in result["rho_records"] if j["mode"] == "tree" and j["n"] == n}
    sa_wr = {j["key"]: j for j in result["wr_records"] if j["mode"] == "tree" and j["n"] == n}
    out = {"trees_enumerated": ex["trees"], "seconds": ex["seconds"],
           "prefix_violations": len(ex["violations"]),
           "violation_details": ex["violations"], "per_key": {}, "per_key_wr": {}}
    for key in sorted(ex["best_rho"], key=lambda k: (isinstance(k, str), k)):
        exc, parent, alpha, L, r, p = ex["best_rho"][key]
        edges = FI.parent_to_edges(parent)
        assert FI.indep_poly_from_edges(n, edges) == p
        srec = sa.get(str(key))
        sa_exc = Fraction(srec["rho_minus_1_exact"]) if srec else None
        out["per_key"][str(key)] = {
            "r": r, "alpha": alpha, "L": L,
            "rho_minus_1_exact": frac_str(exc), "rho_minus_1_approx": float(exc),
            "rho_exact": frac_str(1 + exc), "edges": edges, "poly": p,
            "structure": describe(n, edges)["summary"],
            "sa_best_rho_minus_1_exact": (frac_str(sa_exc) if sa_exc is not None else None),
            "sa_found_exact_optimum": (sa_exc == exc) if sa_exc is not None else None,
        }
        log(f"  exhaustive n={n} key={key}: r={r} rho-1={float(exc):.6e} "
            f"[{describe(n, edges)['summary']}]  SA: "
            f"{'same' if sa_exc == exc else ('SA worse' if sa_exc is not None and sa_exc > exc else 'SA BETTER?!' if sa_exc is not None else 'n/a')}")
    for key in sorted(ex["best_wr"], key=lambda k: (isinstance(k, str), k)):
        exc, parent, alpha, L, r, p = ex["best_wr"][key]
        edges = FI.parent_to_edges(parent)
        srec = sa_wr.get(str(key))
        sa_exc = Fraction(srec["wr_slack_normalised_exact"]) if srec else None
        out["per_key_wr"][str(key)] = {
            "r": r, "alpha": alpha, "L": L,
            "wr_slack_normalised_exact": frac_str(exc), "wr_slack_normalised_approx": float(exc),
            "edges": edges, "structure": describe(n, edges)["summary"],
            "sa_best_exact": (frac_str(sa_exc) if sa_exc is not None else None),
            "sa_found_exact_optimum": (sa_exc == exc) if sa_exc is not None else None,
        }
    result.setdefault("exhaustive_trees", {})[str(n)] = out
    result["meta"]["total_seconds"] = round(result["meta"]["total_seconds"] + ex["seconds"], 1)
    result["log"] = result.get("log", []) + [f"exhaustive trees n={n} merged"]
    with open(path, "w") as fh:
        json.dump(result, fh, indent=1)
    log(f"merged exhaustive n={n} into {path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

DEFAULT_PLAN = [("tree", 20, 120), ("tree", 26, 130), ("tree", 30, 140), ("tree", 40, 170),
                ("tree", 60, 210), ("tree", 100, 280),
                ("forest", 20, 90), ("forest", 30, 120), ("forest", 50, 170)]


def selfcheck_packed(log):
    rng = random.Random(993)
    for _ in range(300):
        n = rng.randint(1, 45)
        parent = seed_random_forest(n, rng, rng.choice([0.5, 0.85, 1.0]))
        F = Forest(n, parent, True)
        p = F.poly()
        q = FI.indep_poly_from_edges(n, F.edges())
        assert p == q, (n, parent, p, q)
        # exercise moves and check the result is still consistent
        for _ in range(20):
            propose(F, rng)
        assert F.poly() == FI.indep_poly_from_edges(n, F.edges())
        if not F.allow_forest:
            assert F.n_components() == 1
    for _ in range(100):
        n = rng.randint(3, 40)
        F = Forest(n, seed_prufer(n, rng), False)
        for _ in range(50):
            propose(F, rng)
        assert F.n_components() == 1 and len(F.edges()) == n - 1
        assert F.poly() == FI.indep_poly_from_edges(n, F.edges())
    n, edges = FI.klym_3kk_tree(4)
    assert Forest(n, edges_to_parent(n, edges), False).poly() == FI.KLYM_T1_POLY
    log("self-check: packed DP == forest_indep on 300 random forests, moves keep forests/trees, "
        "KLYM T1 reproduced")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scale", type=float, default=1.0, help="scale all phase budgets")
    ap.add_argument("--phases", type=str, default="",
                    help="comma list like tree:20,forest:30 (default: full plan)")
    ap.add_argument("--seed", type=int, default=993)
    ap.add_argument("--out", type=str, default=os.path.join(HERE, "results", "adversarial_iso_search.json"))
    ap.add_argument("--tables", type=str, default="/tmp/adversarial_iso_tables.md")
    ap.add_argument("--exhaustive-trees", type=int, default=0,
                    help="instead of searching: enumerate all trees of this order and merge "
                         "the exact per-r minima into the existing --out JSON")
    ap.add_argument("--targets", type=str, default="",
                    help="override the SA target list, e.g. r=3,r=4,r=7 (supplementary runs)")
    ap.add_argument("--merge", action="store_true",
                    help="merge the new records into the existing --out JSON (keep the better "
                         "record per (mode, n, key)) instead of overwriting it")
    args = ap.parse_args()

    t_start = time.time()
    log_lines = []

    def log(msg):
        print(msg, flush=True)
        log_lines.append(msg)

    if args.exhaustive_trees:
        merge_exhaustive(args.out, args.exhaustive_trees, log)
        return 0

    plan = DEFAULT_PLAN
    if args.phases:
        wanted = {(s.split(":")[0], int(s.split(":")[1])) for s in args.phases.split(",")}
        plan = [ph for ph in plan if (ph[0], ph[1]) in wanted]
    plan = [(m, n, b * args.scale) for m, n, b in plan]

    selfcheck_packed(log)

    # exact scan of the named families first (reference values and SA seeds)
    fam_scan = {}
    rec = Recorder()
    t_scan = time.perf_counter()
    for mode, n, _ in plan:
        fam_scan[(mode, n)] = scan_families(mode, n)
        best = fam_scan[(mode, n)][0]
        rec.violations.extend(fam_scan[(mode, n)][2])
        log(f"family scan {mode} n={n}: min rho-1 = {float(best['min'][0]):.4e} ({best['min'][1]})"
            + (f"  !!! {len(fam_scan[(mode, n)][2])} VIOLATIONS" if fam_scan[(mode, n)][2] else ""))
    log(f"family scan took {time.perf_counter() - t_scan:.1f}s")

    runs = []
    violation = bool(rec.violations)
    targets_override = [t for t in args.targets.split(",") if t] or None
    for mode, n, budget in plan:
        if violation:
            log("!!! violation already found in the family scan -- skipping SA")
            break
        if run_phase(mode, n, budget, rec, args.seed, log, runs, fam_scan[(mode, n)][0],
                     targets_override):
            violation = True
            break
        # interim dump of the per-r table for this phase
        for key in sorted(rec.rho[(mode, n)], key=lambda k: (isinstance(k, str), k)):
            r_ = rec.rho[(mode, n)][key]
            ex = Fraction(r_["Q"], r_["D"])
            log(f"    best rho[{key}] (r={r_['r']}, alpha={r_['alpha']}, L={r_['L']}) = "
                f"1 + {float(ex):.4e}  via {r_['target']}/{r_['seed']}  "
                f"{describe(n, r_['edges'])['summary'][:70]}")

    search_seconds = time.time() - t_start

    # ------------------------------------------------------------- verification
    log("verifying every record with forest_indep.indep_poly_from_edges ...")
    rho_records, wr_records = [], []
    for key0 in sorted(rec.rho):
        for key in sorted(rec.rho[key0], key=lambda k: (isinstance(k, str), k)):
            r_ = rec.rho[key0][key]
            ok = verify_record(r_)
            j = rec_json(r_, ok)
            j["key"] = str(key)
            rho_records.append(j)
        for key in sorted(rec.wr[key0], key=lambda k: (isinstance(k, str), k)):
            r_ = rec.wr[key0][key]
            ok = verify_record(r_)
            j = rec_json(r_, ok)
            j["key"] = str(key)
            wr_records.append(j)
    all_verified = all(j["verified_with_core"] for j in rho_records + wr_records)
    log(f"records: {len(rho_records)} rho, {len(wr_records)} wr; all verified: {all_verified}")

    if args.merge and os.path.exists(args.out):
        with open(args.out) as fh:
            existing = json.load(fh)
        improved = []
        for new, coll, field in ((rho_records, "rho_records", "rho_minus_1_exact"),
                                 (wr_records, "wr_records", "wr_slack_normalised_exact")):
            for j in new:
                old = [o for o in existing[coll]
                       if o["mode"] == j["mode"] and o["n"] == j["n"] and o["key"] == j["key"]]
                if old and Fraction(old[0][field]) <= Fraction(j[field]):
                    continue
                if old:
                    existing[coll].remove(old[0])
                existing[coll].append(j)
                improved.append({"collection": coll, "mode": j["mode"], "n": j["n"], "key": j["key"],
                                 "new": j[field], "old": (old[0][field] if old else None),
                                 "new_structure": j["structure"]["summary"]})
        existing["rho_records"].sort(key=lambda j: (j["mode"], j["n"], j["key"].startswith("top"),
                                                    int(j["key"]) if not j["key"].startswith("top") else j["key"]))
        for v in rec.violations:
            existing["headline"]["violations"].append(rec_json(v, verify_record(v)))
            existing["headline"]["violation_found"] = True
        existing["headline"]["exactly_tight_cases"] += [rec_json(v, verify_record(v)) for v in rec.tight]
        existing["headline"]["all_records_verified_with_core"] = (
            existing["headline"]["all_records_verified_with_core"] and all_verified)
        existing["runs"] += [dict({k: v for k, v in r_.items() if k != "best_parent"}, supplementary=True)
                             for r_ in runs]
        existing["meta"].setdefault("supplementary_passes", []).append({
            "plan": [{"mode": m, "n": n, "budget_s": b} for m, n, b in plan],
            "targets": targets_override, "base_seed": args.seed,
            "search_seconds": round(search_seconds, 1), "evaluations": rec.evals,
            "improved_records": improved})
        existing["meta"]["total_seconds"] = round(existing["meta"]["total_seconds"] + time.time() - t_start, 1)
        existing["meta"]["total_evaluations"] += rec.evals
        existing["log"] += log_lines
        recompute_derived(existing)
        with open(args.out, "w") as fh:
            json.dump(existing, fh, indent=1)
        for imp in improved:
            log(f"  improved {imp['collection']} {imp['mode']} n={imp['n']} key={imp['key']}: "
                f"{imp['old']} -> {imp['new']}  [{imp['new_structure']}]")
        log(f"merged {len(improved)} improved records into {args.out}; violation found: {bool(rec.violations)}")
        return 0

    viol_json = []
    for v in rec.violations:
        j = rec_json(v, verify_record(v))
        j["bruteforce_poly"] = (FI.indep_poly_bruteforce(v["n"], v["edges"]) if v["n"] <= 20 else None)
        try:
            j["recurrence_poly"] = indep_poly_recurrence(v["n"], v["edges"])
        except RuntimeError as e:  # pragma: no cover
            j["recurrence_poly"] = str(e)
        j["bruteforce_agrees"] = (j["bruteforce_poly"] == v["poly"]) if j["bruteforce_poly"] is not None else None
        j["recurrence_agrees"] = (j["recurrence_poly"] == v["poly"])
        viol_json.append(j)
    tight_json = [rec_json(v, verify_record(v)) for v in rec.tight]

    # overall minimum rho in the prefix over everything evaluated
    overall = None
    for j in rho_records:
        if j["kind"] == "rho" and not j["key"].startswith("top"):
            ex = Fraction(j["rho_minus_1_exact"])
            if overall is None or ex < overall[0]:
                overall = (ex, j)
    overall_wr = None
    for j in wr_records:
        if not j["key"].startswith("top"):
            ex = Fraction(j["wr_slack_normalised_exact"])
            if overall_wr is None or ex < overall_wr[0]:
                overall_wr = (ex, j)
    headline_extra = {}
    if overall is not None:
        oj = overall[1]
        rec_poly = indep_poly_recurrence(oj["n"], oj["edges"])
        headline_extra["recurrence_recomputation_agrees"] = (rec_poly == oj["poly"])
        if oj["n"] <= 20:
            headline_extra["bruteforce_recomputation_agrees"] = (
                FI.indep_poly_bruteforce(oj["n"], oj["edges"]) == oj["poly"])

    # ------------------------------------------------------------- family scan
    families = {}
    for mode in ("tree", "forest"):
        for n in sorted({n for m, n, _ in plan if m == mode}):
            best, star_rows, _ = fam_scan[(mode, n)]
            fam = {}
            for r in sorted(best, key=lambda k: (isinstance(k, str), k)):
                ex, name, alpha, _ = best[r]
                fam[str(r)] = {"family_member": name, "alpha": alpha,
                               "rho_minus_1_exact": frac_str(ex), "rho_minus_1_approx": float(ex)}
            star = {}
            if star_rows:
                for r, a, b, c, Q, D, W in star_rows[2]:
                    star[str(r)] = {"rho_minus_1_exact": frac_str(Fraction(Q, D)),
                                    "rho_minus_1_approx": Q / D}
            families[f"{mode}:{n}"] = {"best_per_r": fam, "star_per_r": star}

    # ------------------------------------------------------------- scaling
    scaling = {}
    for mode in ("tree", "forest"):
        ns = sorted({n for m, n, _ in plan if m == mode})
        for r in range(1, 11):
            pts = []
            for n in ns:
                d = rec.rho.get((mode, n), {})
                if r in d:
                    ex = Fraction(d[r]["Q"], d[r]["D"])
                    pts.append((n, ex))
            if len(pts) >= 2:
                expo = fit_exponent([n for n, _ in pts], [float(ex) for _, ex in pts])
                scaling[f"{mode}:r={r}"] = {
                    "points": [{"n": n, "rho_minus_1_exact": frac_str(ex),
                                "rho_minus_1_approx": float(ex),
                                "times_n_approx": float(ex) * n,
                                "times_n2_approx": float(ex) * n * n} for n, ex in pts],
                    "loglog_slope_approx": expo,
                }

    star_base = {str(n): {"rho2_exact": frac_str(star_rho2(n)), "rho2_approx": float(star_rho2(n)),
                          "rho2_minus_1_approx": float(star_rho2(n) - 1)}
                 for n in sorted({n for _, n, _ in plan})}

    # star comparison at r = 2 for each (mode, n)
    star_cmp = {}
    for key0 in sorted(rec.rho):
        mode, n = key0
        d = rec.rho[key0]
        if 2 in d:
            ex = Fraction(d[2]["Q"], d[2]["D"])
            s = star_rho2(n) - 1
            star_cmp[f"{mode}:{n}"] = {
                "best_found_rho2_minus_1_exact": frac_str(ex),
                "star_rho2_minus_1_exact": frac_str(s),
                "relation": ("equal to star" if ex == s else ("BELOW star" if ex < s else "above star")),
                "structure": describe(n, d[2]["edges"])["summary"],
            }

    result = {
        "meta": {
            "script": "adversarial_iso_search.py",
            "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t_start)),
            "search_seconds": round(search_seconds, 1),
            "total_seconds": None,
            "plan": [{"mode": m, "n": n, "budget_s": b} for m, n, b in plan],
            "base_seed": args.seed, "python": sys.version.split()[0],
            "total_evaluations": rec.evals,
            "exactness": ("all polynomials exact (packed-integer f/g DP, cross-checked with "
                          "forest_indep.indep_poly_from_edges); violation verdicts exact on every "
                          "evaluated forest; records exact Fractions; floats only steer the "
                          "annealer and pre-filter record updates"),
            "note_on_json_ints": "polynomial coefficients and Q/W are exact JSON integers (Python round-trips them exactly)",
        },
        "headline": {
            "violation_found": bool(rec.violations),
            "violations": viol_json,
            "exactly_tight_cases": tight_json,
            "min_rho_prefix_overall": (dict(overall[1], **headline_extra) if overall else None),
            "min_wr_normalised_slack_overall": (overall_wr[1] if overall_wr else None),
            "all_records_verified_with_core": all_verified,
        },
        "star_baseline_r2": star_base,
        "star_comparison_r2": star_cmp,
        "rho_records": rho_records,
        "wr_records": wr_records,
        "family_scan": families,
        "scaling": scaling,
        "runs": [{k: v for k, v in r_.items() if k != "best_parent"} for r_ in runs],
        "log": log_lines,
    }
    result["meta"]["total_seconds"] = round(time.time() - t_start, 1)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as fh:
        json.dump(result, fh, indent=1)
    log(f"wrote {args.out}")

    # ------------------------------------------------------------- tables
    lines = []
    lines.append("## Best exact rho_r found per (mode, n, r)\n")
    for key0 in sorted(rec.rho):
        mode, n = key0
        lines.append(f"### {mode} n={n}\n")
        lines.append("| key | r | alpha | L | rho_r - 1 (exact) | approx | (rho-1)*n | (rho-1)*n^2 | found by | structure |")
        lines.append("|---|---|---|---|---|---|---|---|---|---|")
        for key in sorted(rec.rho[key0], key=lambda k: (isinstance(k, str), k)):
            r_ = rec.rho[key0][key]
            ex = Fraction(r_["Q"], r_["D"])
            fx = float(ex)
            exs = frac_str(ex)
            if len(exs) > 40:
                exs = exs[:18] + "..." + exs[-18:]
            lines.append(f"| {key} | {r_['r']} | {r_['alpha']} | {r_['L']} | {exs} | {fx:.4e} | "
                         f"{fx * n:.3f} | {fx * n * n:.2f} | {r_['target']}/{r_['seed']} | "
                         f"{describe(n, r_['edges'])['summary']} |")
        lines.append("")
        lines.append("| key | r | WR slack normalised (exact) | approx | structure |")
        lines.append("|---|---|---|---|---|")
        for key in sorted(rec.wr[key0], key=lambda k: (isinstance(k, str), k)):
            r_ = rec.wr[key0][key]
            ex = Fraction(r_["W"], r_["poly"][r_["r"] - 1])
            lines.append(f"| {key} | {r_['r']} | {frac_str(ex)} | {float(ex):.4f} | "
                         f"{describe(n, r_['edges'])['summary']} |")
        lines.append("")
    lines.append("## Family scan (exact, no search)\n")
    for k, fam in families.items():
        lines.append(f"### {k}\n")
        lines.append("| r | best family member | alpha | rho_r - 1 (exact) | approx | star rho_r - 1 approx |")
        lines.append("|---|---|---|---|---|---|")
        for r, d in fam["best_per_r"].items():
            s = fam["star_per_r"].get(r, {}).get("rho_minus_1_approx")
            exs = d["rho_minus_1_exact"]
            if len(exs) > 40:
                exs = exs[:18] + "..." + exs[-18:]
            lines.append(f"| {r} | {d['family_member']} | {d['alpha']} | {exs} | {d['rho_minus_1_approx']:.4e} | "
                         f"{'' if s is None else f'{s:.4e}'} |")
        lines.append("")
    lines.append("## Scaling\n")
    for k, d in scaling.items():
        pts = ", ".join(f"n={p['n']}: {p['rho_minus_1_approx']:.3e} (x n = {p['times_n_approx']:.3f}, "
                        f"x n^2 = {p['times_n2_approx']:.2f})" for p in d["points"])
        lines.append(f"- {k}: log-log slope ~ {d['loglog_slope_approx']:.3f}; {pts}")
    with open(args.tables, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    log(f"wrote {args.tables}")
    log(f"VIOLATION FOUND: {bool(rec.violations)};  total evaluations {rec.evals};  "
        f"total time {result['meta']['total_seconds']}s")
    if overall:
        oj = overall[1]
        log(f"overall min rho in prefix: {oj['mode']} n={oj['n']} r={oj['r']} rho = {oj['rho_exact']} "
            f"~ {oj['rho_approx']:.8f}  [{oj['structure']['summary']}]  {headline_extra}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
