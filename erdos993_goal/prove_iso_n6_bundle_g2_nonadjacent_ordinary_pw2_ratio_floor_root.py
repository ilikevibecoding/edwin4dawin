#!/usr/bin/env python3
"""Exact PW2 positivity and rank-ratio truncation for ordinary-parent G2."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PIN = HERE / "iso_n6_bundle_g2_nonadjacent_no_parent_all_order_exact_root_20260831.json"
PIN_SHA256 = "6A671E41F9E2E98BE68FB9D9968E76D88AD0E6CE6E1F61601C45392F041CCCDA"
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_"
    "20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PW2_RATIO_FLOOR_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def path(value, rank):
    return choose(value - rank + 1, rank)


def integer_choose(order: int, rank: int) -> int:
    return math.comb(order, rank) if 0 <= rank <= order else 0


def integer_path(order: int, rank: int) -> int:
    return integer_choose(order - rank + 1, rank)


def main() -> None:
    assert sha256(PIN) == PIN_SHA256
    n, m, t = sp.symbols("n m t", integer=True, nonnegative=True)

    subset_floor = sp.expand(
        -2 * choose(m, 2) + path(m, 3) + 7 * path(m, 4)
    )
    small_values = [
        -2 * integer_choose(order, 2)
        + integer_path(order, 3)
        + 7 * integer_path(order, 4)
        for order in range(7)
    ]
    assert min(small_values) == -26
    subset_shift = sp.Poly(
        sp.expand((subset_floor + 25).subs(m, t + 7)), t
    )
    assert all(value >= 0 for value in subset_shift.all_coeffs())

    ambient_floor = sp.expand(
        -2 * choose(n, 3) + 2 * path(n, 4) + 7 * path(n, 5)
        - 2 * n - 52
    )
    ambient_shift = sp.Poly(sp.expand(ambient_floor.subs(n, t + 12)), t)
    assert all(value > 0 for value in ambient_shift.all_coeffs())

    # In the pinned ratio simplex,
    #   a4 = a3*(3*N*a2+B*s)/(8*N*a2), B=6*N*a3-4*N*a2,
    # and s=u0+...+u3=1-u4.  The universal forest bounds
    # a2>=P2, a3<=C3, a4>=P4 yield the displayed lower bound for s.
    p2 = choose(n - 1, 2)
    c3 = choose(n, 3)
    p4 = path(n, 4)
    numerator_positive = sp.Poly(
        sp.expand((8 * p4 - 3 * c3).subs(n, t + 19)), t
    )
    assert all(value > 0 for value in numerator_positive.all_coeffs())
    denominator = sp.factor(6 * c3 - 4 * p2)
    assert denominator == (n - 2) ** 2 * (n - 1)
    one_third_gap = sp.expand(
        3 * p2 * (8 * p4 - 3 * c3) - c3 * (6 * c3 - 4 * p2)
    )
    gap_shift = sp.Poly(sp.expand(one_third_gap.subs(n, t + 19)), t)
    assert all(value > 0 for value in gap_shift.all_coeffs())

    report = {
        "marker": MARKER,
        "scope": "nonadjacent ordinary-parent rank-six G2",
        "PW2_sign": {
            "coefficient": (
                "-2*a3+2*a4+7*a5-2*b2+b3+7*b4-2*c2+c3+7*c4-2*d1+7*d3"
            ),
            "subset_floor": str(sp.factor(subset_floor)),
            "orders_0_6": small_values,
            "global_subset_minimum": -26,
            "order_ge_7_shift": str(subset_shift.as_expr()),
            "ambient_shift_N_12": str(ambient_shift.as_expr()),
            "ambient_shift_coefficients": [
                str(value) for value in ambient_shift.all_coeffs()
            ],
            "conclusion": (
                "Using d<=N and two subset floors, K_PW2>0 for every N>=12."
            ),
        },
        "ratio_floor": {
            "simplex_active_mass": "s=u0+u1+u2+u3=1-u4",
            "lower_bound": (
                "s >= P2*(8*P4-3*C3)/(C3*(6*C3-4*P2)) >= 1/3"
            ),
            "valid_for": "N>=19",
            "denominator": str(denominator),
            "numerator_shift_N_19": str(numerator_positive.as_expr()),
            "one_third_gap_shift_N_19": str(gap_shift.as_expr()),
            "one_third_gap_coefficients": [
                str(value) for value in gap_shift.all_coeffs()
            ],
            "covering_parameterization": (
                "u4=2*t/3; ui=(1-2*t/3)*ri for i=0..3; t in [0,1]; "
                "ri>=0 and sum ri=1"
            ),
        },
        "forest_bounds_used": {
            "lower": "i_k(F)>=C(|F|-k+1,k) (path floor)",
            "upper": "i_k(F)<=C(|F|,k) (edgeless ceiling)",
        },
        "pin": {"file": PIN.name, "sha256": PIN_SHA256},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "PW2_ambient_minimum_at_N12": str(ambient_shift.eval(0)),
        "ratio_floor_gap_at_N19": str(gap_shift.eval(0)),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
