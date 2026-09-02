#!/usr/bin/env python3
"""Exact all-order connected-nonadjacent M5 theorem on r=-1.

In the connected-nonadjacent geometry, r=|B|+|C|-|A|=-1 forces A,
B,C to be edgeless and D empty.  This source substitutes their binomial
independence rows into the exact five-block M5 residual and proves the
resulting symmetric polynomial nonnegative for every pair of orders.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_connected_nonadjacent_m5_rminus1_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_RMINUS1_G1_BERNSTEIN"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def at(row, rank):
    return row[rank] if rank < len(row) else 0


def hm(a):
    return (
        2*at(a, 1)*at(a, 4) - 2*at(a, 1)*at(a, 5) - 6*at(a, 1)*at(a, 6)
        + 6*at(a, 2)*at(a, 3) - 8*at(a, 2)*at(a, 5)
        + 2*at(a, 3)**2 + 6*at(a, 3)*at(a, 4)
    )


def lm(a, b):
    return (
        2*at(a, 1)*at(b, 3) - at(a, 1)*at(b, 4) - 6*at(a, 1)*at(b, 5)
        + 4*at(a, 2)*at(b, 2) + at(a, 2)*at(b, 3) - 2*at(a, 2)*at(b, 4)
        + 2*at(a, 3)*at(b, 1) + at(a, 3)*at(b, 2) + 8*at(a, 3)*at(b, 3)
        - at(a, 4)*at(b, 1) - 2*at(a, 4)*at(b, 2) - 6*at(a, 5)*at(b, 1)
    )


def km(b, c):
    return (
        2*at(b, 1)*at(c, 2) - 6*at(b, 1)*at(c, 4)
        + 2*at(b, 2)*at(c, 1) + 4*at(b, 2)*at(c, 3)
        + 4*at(b, 3)*at(c, 2) - 6*at(b, 4)*at(c, 1)
    )


def main() -> None:
    b, c, p, q, t = sp.symbols("b c p q t", integer=True, nonnegative=True)
    arow = tuple(choose(b + c + 1, rank) for rank in range(7))
    brow = tuple(choose(b, rank) for rank in range(6))
    crow = tuple(choose(c, rank) for rank in range(6))
    drow = (sp.Integer(1),)
    value = sp.factor(hm(arow) + lm(arow, brow) + lm(arow, crow) + km(brow, crow) + km(arow, drow))
    numerator, denominator = sp.fraction(value)
    assert denominator == 360
    assert sp.expand(value - value.xreplace({b: c, c: b})) == 0

    # By symmetry order b<=c.  The interior b>=1 is a positive power cone.
    interior = sp.Poly(sp.expand(value.subs({b: 1 + p, c: 1 + p + q})), p, q)
    assert all(coefficient > 0 for coefficient in interior.coeffs())

    # The only remaining ordered boundary is b=0.
    boundary = sp.factor(value.subs(b, 0))
    expected_boundary = sp.factor(
        c * (c - 1) * (c + 1) * (70*c**3 + 318*c**2 + 155*c + 78) / 360
    )
    assert sp.expand(boundary - expected_boundary) == 0
    assert boundary.subs(c, 0) == boundary.subs(c, 1) == 0
    tail = sp.Poly(sp.expand(boundary.subs(c, 2 + t)), t)
    assert all(coefficient > 0 for coefficient in tail.coeffs())

    report = {
        "marker": MARKER,
        "theorem": (
            "For every connected-nonadjacent forest cell with r=-1, the exact "
            "rank-five residual M5 is nonnegative."
        ),
        "geometry": (
            "r=-1 forces e(A)=0 and no unmarked A-component; A is edgeless, "
            "D is empty, and after swapping marks |A|=b+c+1 with 0<=b<=c."
        ),
        "exact_M5": str(value),
        "positive_cones": {
            "interior_substitution": "b=1+p, c=1+p+q",
            "interior_power_terms": len(interior.terms()),
            "interior_minimum_scalar_coefficient": str(min(interior.coeffs())),
            "boundary_b_zero": str(boundary),
            "boundary_sign": "zero for c=0,1 and strictly positive for every integer c>=2",
            "boundary_shift_terms": len(tail.terms()),
            "boundary_shift_minimum_scalar_coefficient": str(min(tail.coeffs())),
        },
        "dependencies_sha256": {
            "derive_iso_n5_g1_connected_nonadjacent_m5_residual_g1_bernstein.py": sha256(
                HERE / "derive_iso_n5_g1_connected_nonadjacent_m5_residual_g1_bernstein.py"
            ),
            "prove_iso_n5_c5_connected_nonadjacent_all_forest_g1_nonadjacent.py": sha256(
                HERE / "prove_iso_n5_c5_connected_nonadjacent_all_forest_g1_nonadjacent.py"
            ),
        },
        "coverage": "all r=-1 orders; no finite extrapolation",
        "remaining_connected_nonadjacent_M5_gate": "r>=0 with |A|>=13",
        "scope": (
            "Connected-nonadjacent M5 on the exceptional r=-1 family only. "
            "This does not prove r>=0, all connected-nonadjacent M5, g1, all N5, "
            "or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "positive_cones": report["positive_cones"],
        "remaining_connected_nonadjacent_M5_gate": report["remaining_connected_nonadjacent_M5_gate"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
