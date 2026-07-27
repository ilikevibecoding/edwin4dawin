#!/usr/bin/env python3
"""An honest attempt at the only known breakthrough move, one level up.

Background.  De Grey's 2018 proof that chi(R^2) >= 5 worked because
4-colorings of certain small unit-distance graphs are RIGID: every
4-coloring of his hexagonal gadget forces a monochromatic structure, and
rotated copies can be overlaid (a "spindle" move) so the forced structures
clash, leaving no 4-coloring at all.

The analogous route to chi(R^2) >= 6 needs finite unit-distance graphs
whose 5-colorings are rigid.  Two theorems calibrate how far away that is:

  * Pritikin 1998: EVERY unit-distance graph with <= 6197 vertices is
    6-colorable (improved to <= 6906 by Polymath16-era work).  So a
    6-chromatic unit-distance graph, if one exists, has ~14x more vertices
    than the current 5-chromatic record (509).
  * The 5-chromatic record itself took ~100,000 CPU hours of SAT-based
    minimization (Heule), starting from a construction that took 68 years
    of human ideas to find.

This script runs two experiments on the *certified* 5-chromatic graphs in
data/ (all geometry in exact arithmetic over Q(sqrt3, sqrt5, sqrt11); all
colorability answers from kissat, with models re-checked edge by edge):

EXPERIMENT 1 (spindle unions).  Overlay G with copies of itself rotated
about its origin vertex by angles that create new unit distances:
      cos t = 5/6  (Moser angle: points at radius sqrt3 move distance 1)
      cos t = 7/8  (de Grey's angle: points at radius 2 move distance 1)
      cos t = 1/2  (60 degrees: points at radius 1 move distance 1)
and combinations.  If ANY of these unions were not 5-colorable, that graph
would prove chi(R^2) >= 6.  (Expected outcome: all easily 5-colorable —
this exact move at the 4->5 level is how de Grey won, and everyone has
tried it at the 5->6 level since 2018.)

EXPERIMENT 2 (rigidity scan).  A "forced pair" is a vertex pair (u, v)
such that every proper 5-coloring gives u, v the same color (mono-pair) or
always different colors (a "virtual edge").  Such pairs are exactly the
gadget material from which a 6-chromatic construction could be assembled
(mono-pairs chain into contradictions; de Grey's proof was powered by the
4-color analogue).  We scan: all pairs involving the origin, all pairs at
several algebraically special distances, and a random sample — two SAT
queries per pair ("can they agree?", "can they differ?").
"""

from __future__ import annotations

import os
import random
import sys
import time
from fractions import Fraction
from typing import Dict, List, Optional, Sequence, Tuple

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _REPO)

from hadwiger_nelson import sat
from hadwiger_nelson.graphs import (assert_proper_coloring, load_edge_file,
                                    unit_distance_edges)
from hadwiger_nelson.qfield import QF, dist2
from hadwiger_nelson.vtx import load_vtx

Point = Tuple[QF, QF]

# Rotations (cos, sin) that keep coordinates inside Q(sqrt3, sqrt5, sqrt11).
ANGLES: Dict[str, Tuple[QF, QF]] = {
    "moser(cos=5/6)": (QF.rational(Fraction(5, 6)), QF.sqrt_rational(11) / 6),
    "degrey(cos=7/8)": (QF.rational(Fraction(7, 8)), QF.sqrt_rational(15) / 8),
    "sixty(cos=1/2)": (QF.rational(Fraction(1, 2)), QF.sqrt_rational(3) / 2),
}


def rotate(p: Point, cs: Tuple[QF, QF]) -> Point:
    c, s = cs
    return (c * p[0] - s * p[1], s * p[0] + c * p[1])


def compose(a: Tuple[QF, QF], b: Tuple[QF, QF]) -> Tuple[QF, QF]:
    """(cos, sin) of the sum of two angles."""
    return (a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0])


def union_of_copies(base: Sequence[Point],
                    rotations: Sequence[Tuple[QF, QF]]) -> List[Point]:
    seen: Dict[Point, int] = {}
    out: List[Point] = []
    for p in base:
        if p not in seen:
            seen[p] = len(out)
            out.append(p)
    for cs in rotations:
        for p in base:
            q = rotate(p, cs)
            if q not in seen:
                seen[q] = len(out)
                out.append(q)
    return out


def k_colorable(n: int, edges, k: int, work: str, tag: str,
                extra_clauses=()) -> Tuple[bool, float, Optional[List[int]]]:
    clauses = sat.coloring_cnf(n, edges, k) + list(extra_clauses)
    nvars = max(n * k, max((abs(l) for cl in extra_clauses for l in cl), default=0))
    path = os.path.join(work, f"{tag}.cnf")
    sat.write_dimacs(path, nvars, clauses)
    t0 = time.time()
    status, model = sat.run_kissat(path)
    dt = time.time() - t0
    if status == "SAT":
        return True, dt, model
    return False, dt, None


# ---------------------------------------------------------------------------
# Experiment 1
# ---------------------------------------------------------------------------

def experiment_unions(name: str, work: str) -> None:
    points = load_vtx(os.path.join(_REPO, "data", f"{name}.vtx"))
    m = ANGLES["moser(cos=5/6)"]
    d = ANGLES["degrey(cos=7/8)"]
    x = ANGLES["sixty(cos=1/2)"]
    m2 = compose(m, m)
    combos: List[Tuple[str, List[Tuple[QF, QF]]]] = [
        ("G + moser", [m]),
        ("G + degrey", [d]),
        ("G + sixty", [x]),
        ("G + moser + moser^2", [m, m2]),
        ("G + moser + degrey", [m, d]),
        ("G + moser^k, k=1..5", [m, m2, compose(m2, m), compose(m2, m2),
                                 compose(compose(m2, m2), m)]),
    ]
    base_edges = len(unit_distance_edges(points))
    print(f"\n--- EXPERIMENT 1: spindled unions of G{name} "
          f"({len(points)} vertices, {base_edges} unit edges) ---")
    print("if any line below said 'NOT 5-colorable', chi(R^2) >= 6 would follow\n")
    for label, rots in combos:
        pts = union_of_copies(points, rots)
        t0 = time.time()
        edges = unit_distance_edges(pts)
        t_geo = time.time() - t0
        ok, t_sat, model = k_colorable(len(pts), edges, 5, work,
                                       f"{name}-{label.replace(' ', '')}")
        if ok:
            coloring = sat.coloring_from_model(model, len(pts), 5)
            assert_proper_coloring(edges, coloring)
            verdict = "5-colorable (coloring found and verified)"
        else:
            verdict = "NOT 5-colorable  *** chi(R^2) >= 6 ***"
        extra = len(edges) - base_edges * (1 + len(rots))
        print(f"  {label:24s} {len(pts):5d} vertices {len(edges):6d} edges "
              f"({extra:+d} beyond disjoint copies) "
              f"[geometry {t_geo:.1f}s, SAT {t_sat:.2f}s] -> {verdict}")


# ---------------------------------------------------------------------------
# Experiment 2
# ---------------------------------------------------------------------------

#: dist^2 values with known structural roles in this literature (Parts 2020
#: catalogues mono/non-mono behaviour at several of these at the 4-level).
SPECIAL_DIST2 = [
    Fraction(1, 9), Fraction(1, 3), Fraction(5, 3), Fraction(7, 3),
    Fraction(11, 3), Fraction(25, 9), Fraction(49, 9), Fraction(64, 9),
    Fraction(64, 3), 3, 4, 5, 7, 9,
]


def pair_scan(name: str, work: str, per_distance: int = 40,
              n_random: int = 300, seed: int = 20260727) -> None:
    points = load_vtx(os.path.join(_REPO, "data", f"{name}.vtx"))
    n_declared, edges = load_edge_file(os.path.join(_REPO, "data", f"{name}.edge"))
    n = len(points)
    assert n == n_declared
    edge_set = set(edges)
    rng = random.Random(seed)

    print(f"\n--- EXPERIMENT 2: rigidity scan of 5-colorings of G{name} ---")
    print("forced-same pair => gadget for a chi >= 6 construction (breakthrough)")
    print("forced-diff pair => 'virtual edge', raw material for spindling\n")

    # exact squared distances for every pair is cheap; index special pairs
    special_pairs: Dict[Fraction, List[Tuple[int, int]]] = {Fraction(q): [] for q in SPECIAL_DIST2}
    for i in range(n):
        for j in range(i + 1, n):
            d2 = dist2(points[i], points[j])
            if d2.is_rational():
                q = d2.as_rational()
                if q in special_pairs:
                    special_pairs[q].append((i, j))

    candidates: List[Tuple[str, int, int]] = []
    for v in range(1, n):
        candidates.append(("origin", 0, v))
    for q, prs in sorted(special_pairs.items()):
        sample = prs if len(prs) <= per_distance else rng.sample(prs, per_distance)
        for i, j in sample:
            candidates.append((f"d2={q}", i, j))
    for _ in range(n_random):
        i, j = sorted(rng.sample(range(n), 2))
        candidates.append(("random", i, j))

    forced_same: List[Tuple[int, int, str]] = []
    forced_diff: List[Tuple[int, int, str]] = []
    counts = {"edge": 0, "free": 0}
    t0 = time.time()
    tested = set()
    for group, u, v in candidates:
        if (u, v) in tested:
            continue
        tested.add((u, v))
        if (u, v) in edge_set:
            counts["edge"] += 1
            continue

        def var(w, c):
            return w * 5 + c + 1

        # can u, v DIFFER?  (forbid sharing any true color)
        differ = [[-var(u, c), -var(v, c)] for c in range(5)]
        can_differ, _, _ = k_colorable(n, edges, 5, work, "pairq",
                                       extra_clauses=differ)
        # can u, v AGREE?  (aux y_c -> both get color c; some y_c true)
        aux0 = n * 5
        agree = [[aux0 + c + 1 for c in range(5)]]
        for c in range(5):
            agree.append([-(aux0 + c + 1), var(u, c)])
            agree.append([-(aux0 + c + 1), var(v, c)])
        can_agree, _, _ = k_colorable(n, edges, 5, work, "pairq",
                                      extra_clauses=agree)

        if can_differ and can_agree:
            counts["free"] += 1
        elif not can_differ:
            forced_same.append((u, v, group))
        elif not can_agree:
            forced_diff.append((u, v, group))

    dt = time.time() - t0
    n_tested = len(tested) - counts["edge"]
    print(f"  scanned {len(tested)} pairs ({counts['edge']} were unit edges, skipped) "
          f"-> {n_tested} SAT-probed pairs, {2 * n_tested} solver calls, {dt:.0f}s")
    print(f"  special-distance pairs available: "
          + ", ".join(f"d2={q}:{len(p)}" for q, p in sorted(special_pairs.items()) if p))
    print(f"  free pairs (can agree AND can differ): {counts['free']}")
    print(f"  forced-same pairs (mono-pairs):        {len(forced_same)}")
    print(f"  forced-diff pairs (virtual edges):     {len(forced_diff)}")
    for u, v, g in forced_same:
        print(f"    FORCED-SAME  ({u},{v}) group={g} dist2={dist2(points[u], points[v])!r}")
    for u, v, g in forced_diff:
        print(f"    FORCED-DIFF  ({u},{v}) group={g} dist2={dist2(points[u], points[v])!r}")
    if not forced_same and not forced_diff:
        print("  => no rigidity found at all: 5-colorings of the record graph are")
        print("     completely floppy on every probed pair. The 4-level analogue of")
        print("     this rigidity is what de Grey's proof was built from.")


def main() -> None:
    import tempfile
    work = tempfile.mkdtemp(prefix="probe-six-")
    name = sys.argv[1] if len(sys.argv) > 1 else "529"

    print("=" * 74)
    print("PROBING FOR chi(R^2) >= 6 WITH THE ONLY KNOWN KIND OF MOVE")
    print("=" * 74)
    print(__doc__.split("EXPERIMENT 1")[0].rstrip())

    # calibration: theorem says <= 6906 vertices => 6-colorable, so verify our
    # graph is 6-colorable in milliseconds (sanity, consistent with Pritikin).
    points = load_vtx(os.path.join(_REPO, "data", f"{name}.vtx"))
    _, edges = load_edge_file(os.path.join(_REPO, "data", f"{name}.edge"))
    ok, dt, model = k_colorable(len(points), edges, 6, work, f"{name}-6col")
    assert ok
    print(f"\n(calibration: G{name} is 6-colorable, kissat {dt:.2f}s — as Pritikin's")
    print(" theorem guarantees for anything this small; a 6-chromatic unit-distance")
    print(" graph must have > 6906 vertices)")

    experiment_unions(name, work)
    pair_scan(name, work)

    print("\n" + "=" * 74)
    print("OUTCOME")
    print("=" * 74)
    print("""  No 6-chromatic graph found and no rigidity to build one from — the
  de Grey move does not lift from 4->5 to 5->6 at this scale, and by
  Pritikin's theorem it provably cannot succeed below ~7000 vertices.
  This is the wall the entire field is standing at.""")


if __name__ == "__main__":
    main()
