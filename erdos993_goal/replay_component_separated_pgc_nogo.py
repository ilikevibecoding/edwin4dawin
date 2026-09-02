#!/usr/bin/env python3
"""Exact replay for the component-separated PGC reduction and nested PF no-go."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
x = sp.symbols("x")


def coefficients(poly: sp.Expr) -> list[int]:
    p = sp.Poly(sp.expand(poly), x)
    return [int(p.nth(j)) for j in range(p.degree() + 1)]


def h(poly: sp.Expr, k: int) -> sp.Rational:
    p = sp.Poly(sp.expand(poly), x)
    g = k * p.nth(k) ** 2 + p.nth(k - 1) * p.nth(k) - (k + 1) * p.nth(k - 1) * p.nth(k + 1)
    return sp.factor(k * g / p.nth(k - 1))


def q(a: int, b: int = 1) -> sp.Rational:
    return sp.Rational(a, b)


def isolate(poly: sp.Expr, intervals: list[tuple[sp.Rational, sp.Rational]]) -> list[list[str]]:
    p = sp.Poly(poly, x)
    assert sum(int(p.count_roots(a, b)) for a, b in intervals) == p.degree()
    assert all(p.count_roots(a, b) == 1 for a, b in intervals)
    assert all(b < 0 for _a, b in intervals)
    return [[str(a), str(b)] for a, b in intervals]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    B = sp.expand((1 + 344 * x) * (1 + 8 * x + 4 * x**2))
    C = 1 + 33 * x + 67 * x**2
    A = sp.expand(B + x * C)
    P = sp.expand(A + x * B)

    assert coefficients(B) == [1, 352, 2756, 1376]
    assert coefficients(C) == [1, 33, 67]
    assert coefficients(A) == [1, 353, 2789, 1443]
    assert coefficients(P) == [1, 354, 3141, 4199, 1376]
    assert sp.expand(A - B - x * C) == 0
    assert sp.expand(P - A - x * B) == 0
    assert sp.expand(P - (1 + x) * B - x * C) == 0

    intervals = {
        "C": isolate(C, [(q(-1, 2), q(-2, 5)), (q(-1, 25), q(-3, 100))]),
        "B": isolate(B, [(q(-189, 100), q(-9, 5)), (q(-1341, 10000), q(-267, 2000)), (q(-291, 100000), q(-2905, 1000000))]),
        "A": isolate(A, [(q(-9, 5), q(-179, 100)), (q(-134, 1000), q(-132, 1000)), (q(-29, 10000), q(-289, 100000))]),
        "P": isolate(P, [(q(-2), q(-19, 10)), (q(-1), q(-9, 10)), (q(-133, 1000), q(-1328, 10000)), (q(-29, 10000), q(-289, 100000))]),
    }

    # The disjoint isolators certify C strictly interlaces B and B strictly
    # interlaces P, in increasing root order.
    c_boxes = [(q(-1, 2), q(-2, 5)), (q(-1, 25), q(-3, 100))]
    b_boxes = [(q(-189, 100), q(-9, 5)), (q(-1341, 10000), q(-267, 2000)), (q(-291, 100000), q(-2905, 1000000))]
    p_boxes = [(q(-2), q(-19, 10)), (q(-1), q(-9, 10)), (q(-133, 1000), q(-1328, 10000)), (q(-29, 10000), q(-289, 100000))]
    assert b_boxes[0][1] < c_boxes[0][0] < c_boxes[0][1] < b_boxes[1][0]
    assert b_boxes[1][1] < c_boxes[1][0] < c_boxes[1][1] < b_boxes[2][0]
    for j, box in enumerate(b_boxes):
        assert p_boxes[j][1] < box[0] < box[1] < p_boxes[j + 1][0]

    H2P, H1B = h(P, 2), h(B, 1)
    gap = sp.factor(H2P - H1B)
    assert H2P == sp.Rational(5461446, 59)
    assert H1B == 118744
    assert gap == sp.Rational(-1544450, 59) < 0
    assert 2 < (2 * sp.degree(P, x) + 1) // 3

    forest_bounds = {}
    for name, poly in (("B", B), ("C", C), ("A", A), ("P", P)):
        cs = coefficients(poly)
        lower = comb(cs[1] - 1, 2)
        forest_bounds[name] = {"i1": cs[1], "i2": cs[2], "forest_lower_bound": lower}
        assert cs[2] < lower

    census = ROOT / "pgc_all_forest_polynomials_n16_20260726.json"
    census_data = json.loads(census.read_text(encoding="utf-8"))
    assert census_data["status"] == "PASS_NOT_PROOF"
    assert census_data["coverage"]["pair_instances"] == 332799
    assert census_data["coverage"]["rank_checks"] == 1511925
    assert census_data["failure"] is None
    assert sha256(census) == "A1CA67D843BAB10D95DC0DC4A924A8E26C25466633F26FAFA6177677EB9C837A"

    report = {
        "status": "PASS_EXACT_NOGO_NOT_FOREST_COUNTEREXAMPLE_NOT_PGC_PROOF",
        "identities": {"B": coefficients(B), "C": coefficients(C), "A": coefficients(A), "P": coefficients(P)},
        "negative_real_root_isolators": intervals,
        "strict_interlacing": ["C interlaces B", "B interlaces P"],
        "discriminants": {name: int(sp.discriminant(poly, x)) for name, poly in (("C", C), ("B", B), ("A", A), ("P", P))},
        "pgc_rank": 2,
        "H2_P": str(H2P),
        "H1_B": str(H1B),
        "gap": str(gap),
        "not_forest_realizable": forest_bounds,
        "finite_forest_evidence": {
            "artifact": census.name,
            "sha256": sha256(census),
            "pair_instances": census_data["coverage"]["pair_instances"],
            "rank_checks": census_data["coverage"]["rank_checks"],
            "failure": None,
            "scope": "finite evidence only",
        },
    }
    output = ROOT / "component_separated_pgc_nogo_exact_20260813.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_COMPONENT_SEPARATED_PGC_NOGO")
    print(output.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
