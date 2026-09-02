#!/usr/bin/env python3
"""Independent low-memory probe for the weighted edge-pair lower-b lift.

This is a screen, not an exact Bernstein certificate.  It uses the strongest
integer/congruence rounding implied by the weighted local inequality and
labels a negative only as a relaxed-cone obstruction.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
from itertools import combinations
from math import comb

import numpy as np
import sympy as sp

from prove_rank7_terminal_broom_delta0_large import normalized_low


def ceil_fraction(value: Fraction) -> int:
    return -(-value.numerator // value.denominator)


def local_weighted_audit() -> dict:
    possible = tuple(combinations(range(5), 2))
    checked = forests = 0
    minimum_margin = None
    equality_types = set()
    for mask in range(1 << 10):
        edges = tuple(possible[i] for i in range(10) if mask & (1 << i))
        parent = list(range(5))

        def find(v: int) -> int:
            while parent[v] != v:
                parent[v] = parent[parent[v]]
                v = parent[v]
            return v

        good = True
        for u, v in edges:
            ru, rv = find(u), find(v)
            if ru == rv:
                good = False
                break
            parent[ru] = rv
        if not good:
            continue
        forests += 1
        if not edges:
            continue
        checked += 1
        adjacent = sum(len({*left, *right}) == 3 for left, right in combinations(edges, 2))
        disjoint = comb(len(edges), 2) - adjacent
        bad4 = 0
        for omitted in range(5):
            vertices = set(range(5)) - {omitted}
            bad4 += any(u in vertices and v in vertices for u, v in edges)
        delta = bad4 - 3
        rhs = Fraction(disjoint, 2) + Fraction(adjacent, 6)
        margin = Fraction(delta) - rhs
        assert margin >= 0
        if minimum_margin is None or margin < minimum_margin:
            minimum_margin = margin
        if margin == 0:
            degrees = sorted((sum(v in edge for edge in edges) for v in range(5)), reverse=True)
            equality_types.add((len(edges), tuple(degrees)))
    assert forests == 291
    return {
        "labelled_forests": forests,
        "nonempty_forests_checked": checked,
        "minimum_margin": str(minimum_margin),
        "equality_edge_degree_types": sorted(equality_types),
    }


def weighted_d_floor(m: int, a: int) -> dict:
    bad4 = comb(m, 4) - a
    edge_floor = ceil_fraction(Fraction(bad4, comb(m - 2, 2)))
    adjacent_floor = max(0, 2 * edge_floor - m)
    baseline_disjoint = comb(edge_floor, 2) - adjacent_floor
    alpha = Fraction(m - 4, 2)
    beta = Fraction(comb(m - 3, 2), 6)
    assert beta >= alpha
    raw = alpha * baseline_disjoint + beta * adjacent_floor
    raw_ceiling = ceil_fraction(raw)
    residue = ((m - 4) * bad4) % 3
    congruent_floor = raw_ceiling + (residue - raw_ceiling) % 3
    assert congruent_floor >= raw and congruent_floor % 3 == residue
    b_floor = (congruent_floor - 2 * comb(m, 5) + (m - 4) * a) // 3
    assert 3 * b_floor == congruent_floor - 2 * comb(m, 5) + (m - 4) * a
    return {
        "bad4": bad4,
        "edge_floor": edge_floor,
        "adjacent_floor": adjacent_floor,
        "baseline_disjoint_pairs_at_minimizer": baseline_disjoint,
        "raw_d_floor": raw,
        "congruent_d_floor": congruent_floor,
        "b_floor": b_floor,
    }


def ratio_b_floor(m: int, a: int) -> int:
    value = Fraction((m - 7) * (m - 8) * a, 5 * (m - 3))
    return ceil_fraction(value)


def screen(n: int, z_steps: int) -> dict:
    expression, (x, y, z, q, s, d) = normalized_low(0)
    evaluate = sp.lambdify((z, s, d), expression.subs({x: 1, y: 1, q: (2 + z) / 14}), "numpy")
    tn = Fraction((n - 7) * (n - 8), n - 3)
    mu = (tn - 3 + 2 / tn) / 6
    z_low = Fraction(6, n - 6)
    z_high = 1 / mu
    z_grid = np.linspace(float(z_low), float(z_high), z_steps)
    path_floor = comb(n - 4, 5)
    c5_ceiling = comb(n, 5)
    c6_ceiling = comb(n, 6)
    best = None
    feasible_a = 0
    face_counts = {"weighted": 0, "ratio": 0, "tie": 0}
    for m in range(18, n - 1):
        c4j, c5j = comb(m, 4), comb(m, 5)
        for a in range(c4j + 1):
            weighted = weighted_d_floor(m, a)["b_floor"]
            ratio = ratio_b_floor(m, a)
            b = max(0, weighted, ratio)
            if b > c5j or 5 * b > (m - 4) * a:
                continue
            face = "tie" if weighted == ratio == b else "weighted" if weighted == b else "ratio"
            face_counts[face] += 1
            any_feasible = False
            for zv in z_grid:
                lower = max(path_floor, a + b, 2 * b * zv)
                upper = min(c5_ceiling, c6_ceiling * zv)
                if lower > upper:
                    continue
                any_feasible = True
                # Endpoints plus a small interior stencil.  This is deliberately
                # only a numerical obstruction screen.
                for cv in (lower, (3 * lower + upper) / 4, (lower + upper) / 2, (lower + 3 * upper) / 4, upper):
                    sv = 1 - a / cv
                    dv = 1 - b * zv / cv
                    value = float(evaluate(zv, sv, dv))
                    witness = {
                        "n": n,
                        "m": m,
                        "a": a,
                        "b": b,
                        "weighted_b_floor": weighted,
                        "ratio_b_floor": ratio,
                        "active_lower_face": face,
                        "c5": cv,
                        "z": zv,
                        "s": sv,
                        "d": dv,
                        "objective": value,
                    }
                    if best is None or value < best["objective"]:
                        best = witness
            feasible_a += any_feasible
    return {
        "n": n,
        "m_range": [18, n - 2],
        "feasible_integer_a_values": feasible_a,
        "active_face_counts": face_counts,
        "minimum_screen_witness": best,
        "status": "SCREEN_POSITIVE" if best is not None and best["objective"] >= 0 else "RELAXED_CONE_SCREEN_OBSTRUCTION",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--z-steps", type=int, default=41)
    args = parser.parse_args()
    print("local", local_weighted_audit(), flush=True)
    for n in (27, 28):
        print("screen", screen(n, args.z_steps), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
