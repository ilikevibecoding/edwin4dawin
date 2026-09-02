#!/usr/bin/env python3
"""Exact weighted edge-pair lift and rank-7 relaxed-cone obstructions.

The negative witnesses certified here are points of the retained coefficient
relaxation.  They are NOT asserted to be independence data of any tree.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from itertools import combinations
from math import comb
from pathlib import Path

import sympy as sp

from prove_rank7_terminal_broom_delta0_large import normalized_low


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank7_delta0_weighted_edge_pair_lower_b_obstructions_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceil_fraction(value: Fraction) -> int:
    return -(-value.numerator // value.denominator)


def local_forest_rows() -> list[dict]:
    possible = tuple(combinations(range(5), 2))
    rows = {}
    forest_count = 0
    for mask in range(1 << len(possible)):
        edges = tuple(possible[index] for index in range(10) if mask & (1 << index))
        parent = list(range(5))

        def find(v: int) -> int:
            while parent[v] != v:
                parent[v] = parent[parent[v]]
                v = parent[v]
            return v

        is_forest = True
        for u, v in edges:
            ru, rv = find(u), find(v)
            if ru == rv:
                is_forest = False
                break
            parent[ru] = rv
        if not is_forest:
            continue
        forest_count += 1
        if not edges:
            continue
        degrees = tuple(sorted((sum(v in edge for edge in edges) for v in range(5)), reverse=True))
        adjacent = sum(len({*left, *right}) == 3 for left, right in combinations(edges, 2))
        disjoint = comb(len(edges), 2) - adjacent
        bad4 = 0
        for omitted in range(5):
            retained = set(range(5)) - {omitted}
            bad4 += any(u in retained and v in retained for u, v in edges)
        delta = bad4 - 3
        rhs = Fraction(disjoint, 2) + Fraction(adjacent, 6)
        assert Fraction(delta) >= rhs
        key = (len(edges), degrees)
        data = {
            "edges": len(edges),
            "degree_sequence": list(degrees),
            "delta": delta,
            "disjoint_edge_pairs": disjoint,
            "adjacent_edge_pairs": adjacent,
            "weighted_rhs": str(rhs),
            "margin": str(Fraction(delta) - rhs),
        }
        if key in rows:
            assert rows[key] == data
        rows[key] = data
    assert forest_count == 291
    assert len(rows) == 9
    return [rows[key] for key in sorted(rows)]


def direct_d_floor(m: int, a: int) -> dict:
    bad4 = comb(m, 4) - a
    edge_floor = ceil_fraction(Fraction(bad4, comb(m - 2, 2)))
    adjacent_floor = max(0, 2 * edge_floor - m)
    # This is the disjoint count in the minimizing algebraic decomposition at
    # (e,A)=(edge_floor,adjacent_floor), not a standalone lower bound on the
    # actual number of disjoint pairs.  Validity uses beta>=alpha below.
    baseline_disjoint = comb(edge_floor, 2) - adjacent_floor
    alpha = Fraction(m - 4, 2)
    beta = Fraction(comb(m - 3, 2), 6)
    assert beta >= alpha
    raw = alpha * baseline_disjoint + beta * adjacent_floor
    raw_ceiling = ceil_fraction(raw)
    residue = ((m - 4) * bad4) % 3
    exact_floor = raw_ceiling + (residue - raw_ceiling) % 3
    b_floor = (exact_floor - 2 * comb(m, 5) + (m - 4) * a) // 3
    assert exact_floor >= raw and exact_floor % 3 == residue
    assert 3 * b_floor == exact_floor - 2 * comb(m, 5) + (m - 4) * a
    return {
        "bad_four_sets": bad4,
        "edge_floor": edge_floor,
        "adjacent_edge_pair_floor": adjacent_floor,
        "baseline_disjoint_pairs_at_minimizer": baseline_disjoint,
        "raw_weighted_D_floor": str(raw),
        "D_mod_3": residue,
        "strongest_congruent_D_floor": exact_floor,
        "resulting_i5_floor": b_floor,
    }


def ratio_floor(m: int, a: int) -> tuple[Fraction, int]:
    raw = Fraction((m - 7) * (m - 8) * a, 5 * (m - 3))
    return raw, ceil_fraction(raw)


def exact_witness(n: int, m: int, a: int, b: int) -> dict:
    expression, (x, y, z, q, s, d) = normalized_low(0)
    c5 = sp.Integer(comb(n - 4, 5))
    z_value = sp.Rational(6, n - 6)
    tn = sp.Rational((n - 7) * (n - 8), n - 3)
    z_upper = sp.factor(1 / ((tn - 3 + 2 / tn) / 6))
    q_value = (2 + z_value) / 14
    s_value = 1 - sp.Rational(a, c5)
    d_value = 1 - sp.Rational(b, c5) * z_value
    objective = sp.factor(
        expression.subs(
            {x: 1, y: 1, z: z_value, q: q_value, s: s_value, d: d_value},
            simultaneous=True,
        )
    )
    lift = direct_d_floor(m, a)
    ratio_raw, ratio_integer = ratio_floor(m, a)
    assert b == max(0, lift["resulting_i5_floor"], ratio_integer)
    constraints = {
        "a_nonnegative": sp.Integer(a),
        "literal_i4_ceiling": sp.Integer(comb(m, 4) - a),
        "b_nonnegative": sp.Integer(b),
        "literal_i5_ceiling": sp.Integer(comb(m, 5) - b),
        "path_c5_floor": c5 - comb(n - 4, 5),
        "literal_c5_ceiling": sp.Integer(comb(n, 5)) - c5,
        "connected_z_lower": z_value - sp.Rational(6, n - 6),
        "selected_degree_z_upper": z_upper - z_value,
        "containment_upper": c5 - a - b,
        "extension_upper_times_5": sp.Integer((m - 4) * a - 5 * b),
        "half_retention": sp.factor(c5 - 2 * b * z_value),
        "c6_ceiling": sp.factor(sp.Integer(comb(n, 6)) * z_value - c5),
        "weighted_i5_floor": sp.Integer(b - lift["resulting_i5_floor"]),
        "integer_ratio_floor": sp.Integer(b - ratio_integer),
        "raw_ratio_lower": sp.factor(sp.Rational(b) - sp.Rational(ratio_raw.numerator, ratio_raw.denominator)),
    }
    assert all(value >= 0 for value in constraints.values())
    assert objective < 0
    c6_derived = sp.factor(c5 / z_value)
    nonrealizability_note = (
        "The displayed c6 is nonintegral, so this coefficient tuple cannot be a tree."
        if c6_derived.q != 1
        else (
            "Although the displayed scalar coefficients are integral, the relaxation does "
            "not assert that i4(J), i5(J), c5, and c6 are simultaneously realizable by a tree."
        )
    )
    return {
        "classification": "RELAXED_COEFFICIENT_CONE_OBSTRUCTION_NOT_TREE_COUNTEREXAMPLE",
        "n": n,
        "m": m,
        "i4_J": a,
        "i5_J_lower_endpoint": b,
        "c5": str(c5),
        "z": str(z_value),
        "derived_c6": str(c6_derived),
        "q_lower": str(q_value),
        "s": str(s_value),
        "d": str(d_value),
        "weighted_lift": lift,
        "ratio_lower_raw": str(ratio_raw),
        "ratio_lower_integer_ceiling": ratio_integer,
        "constraint_residuals": {name: str(value) for name, value in constraints.items()},
        "normalized_objective": str(objective),
        "normalized_objective_decimal": str(sp.N(objective, 25)),
        "why_not_a_tree_counterexample": nonrealizability_note,
    }


def main() -> int:
    rows = local_forest_rows()
    witnesses = [
        exact_witness(27, 24, 6820, 17668),
        exact_witness(28, 25, 8245, 22937),
    ]
    report = {
        "schema": "rank7-delta0-weighted-edge-pair-lower-b-obstruction-v1",
        "status": "EXACT_WEIGHTED_LIFT_PROVED_RELAXED_CONE_OBSTRUCTIONS_SURVIVE",
        "local_inequality": {
            "statement": "delta=t(S)-3 >= disjoint_edge_pairs/2 + adjacent_edge_pairs/6",
            "five_vertex_forest_type_rows": rows,
            "exhaustive_labelled_forest_count": 291,
        },
        "global_lift": {
            "definitions": [
                "B4=C(m,4)-i4(J)",
                "B5=C(m,5)-i5(J)",
                "D=(m-4)B4-3B5",
                "e0=ceil(B4/C(m-2,2))",
                "A0=max(0,2e0-m)",
            ],
            "raw_bound": (
                "D >= ((m-4)/2)*(C(e0,2)-A0) "
                "+ (C(m-3,2)/6)*A0"
            ),
            "strongest_direct_integer_bound": (
                "Round the raw bound upward to the least integer congruent to "
                "(m-4)B4 modulo 3."
            ),
            "monotonicity_scope": (
                "For m>=18 both the total-pair and adjacent-pair coefficients "
                "are positive, so e=e0 and A=A0 minimize the direct lift."
            ),
        },
        "witnesses": witnesses,
        "conclusion": (
            "The weighted lift is rigorous and strictly strengthens the unweighted "
            "pair-incidence lift on disjoint pairs, but it does not eliminate the "
            "n=27 or n=28 hard lower-b/q-lower coefficient relaxations."
        ),
        "scope_warning": (
            "These witnesses obstruct this coefficient enclosure only. They are not "
            "trees and are not counterexamples to the target theorem."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    for witness in witnesses:
        print(witness["n"], witness["m"], witness["normalized_objective"])
    print("report", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
