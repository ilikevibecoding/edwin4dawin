#!/usr/bin/env python3
"""Exact quantitative rank-five payment on the small-core and star branches.

For a rooted tree C with H=C-root and C_s=sK_1 union C, let

    d_s=i_3(C_s), e_s=i_4(C_s), f_s=i_5(C_s),
    h=i_3(H), k=i_4(H), a_s=e_s+h, b_s=f_s+k.

This verifier proves, for every rooted C of order at most 12 and every
integer s>=1,

    M(a_s,b_s,d_s,e_s,f_s) >= (7/5)d_s e_s^3.

It also verifies the exact nonnegative factorization for the remaining
star-center branch.  The infinite small-core assertion is certified by
the Newton forward-difference basis: the residue has degree at most 15,
its value at s=1 and its first 15 differences at s=0 are nonnegative,
and its sixteenth difference vanishes.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from scan_fixed_rank_leaf_curvature_fast import all_root_states
from scan_rank4_three_halves_leaf_finite import trees_of_order
from verify_rank5_leaf_induction_reduction import rooted_payment


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank5_quantitative_small_core_star_exact_root_20260823.json"
EXPECTED = {
    "verify_rank5_leaf_induction_reduction.py":
        "8E8175FBDCDF9CDACF027380A3193F822E6A3FCB83570D9BC802560A890CDE0D",
    "scan_fixed_rank_leaf_curvature_fast.py":
        "827FCF52A4AB91E51661D41CE4BC910DBE3E1ABCD396ADD3D1DA2E1A52BA36A0",
    "scan_rank4_three_halves_leaf_finite.py":
        "7C6BA4A0D06DE53BD2E837BA5C6FDB53D3E0A0A7D0490ED00BF930C307426C76",
}
ROOTED_COUNTS = {
    1: 1,
    2: 2,
    3: 3,
    4: 8,
    5: 15,
    6: 36,
    7: 77,
    8: 184,
    9: 423,
    10: 1060,
    11: 2585,
    12: 6612,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient(polynomial, rank: int) -> int:
    return polynomial[rank] if rank < len(polynomial) else 0


def smooth_coefficient(core, smoothing: int, rank: int) -> int:
    return sum(
        math.comb(smoothing, offset) * coefficient(core, rank - offset)
        for offset in range(min(smoothing, rank) + 1)
    )


def residue5_values(core, deleted, count: int = 17) -> list[int]:
    """Return 5M_s-7d_s e_s^3 at s=0,...,count-1."""
    h = coefficient(deleted, 3)
    k = coefficient(deleted, 4)
    values = []
    for smoothing in range(count):
        d = smooth_coefficient(core, smoothing, 3)
        e = smooth_coefficient(core, smoothing, 4)
        f = smooth_coefficient(core, smoothing, 5)
        payment = rooted_payment(e + h, f + k, d, e, f)
        values.append(5 * payment - 7 * d * e**3)
    return values


def difference_heads(values: list[int]) -> list[int]:
    heads = []
    row = values
    while len(row) > 1:
        row = [right - left for left, right in zip(row, row[1:])]
        heads.append(row[0])
    return heads


def star_identity() -> str:
    leaves = sp.symbols("leaves", integer=True, nonnegative=True)

    def choose(rank: int):
        return sp.prod(leaves - j for j in range(rank)) / sp.factorial(rank)

    d, e, f = choose(3), choose(4), choose(5)
    residue = sp.factor(rooted_payment(e, f, d, e, f) - sp.Rational(7, 5) * d * e**3)
    expected = (
        leaves**4 * (leaves - 3) ** 2 * (leaves - 2) ** 4
        * (leaves - 1) ** 4 * (9 * leaves + 23) / 207_360
    )
    assert sp.factor(residue - expected) == 0
    return str(sp.factor(expected))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    star_factorization = star_identity()

    total = 0
    per_order = []
    global_minimum_difference5 = [None] * 15
    for order in range(1, 13):
        rooted = 0
        minimum_f1_5 = None
        minimum_differences5 = [None] * 15
        maximum_abs_difference16 = 0
        for tree in trees_of_order(order):
            deleted_by_root, core = all_root_states(tree, 5)
            for deleted in deleted_by_root.values():
                rooted += 1
                values = residue5_values(core, deleted)
                heads = difference_heads(values)
                assert len(heads) == 16
                f1_5 = values[1]
                minimum_f1_5 = f1_5 if minimum_f1_5 is None else min(minimum_f1_5, f1_5)
                for difference_order in range(15):
                    value = heads[difference_order]
                    current = minimum_differences5[difference_order]
                    minimum_differences5[difference_order] = (
                        value if current is None else min(current, value)
                    )
                    global_current = global_minimum_difference5[difference_order]
                    global_minimum_difference5[difference_order] = (
                        value if global_current is None else min(global_current, value)
                    )
                maximum_abs_difference16 = max(maximum_abs_difference16, abs(heads[15]))

        assert rooted == ROOTED_COUNTS[order]
        assert minimum_f1_5 is not None and minimum_f1_5 >= 0
        assert all(value is not None and value >= 0 for value in minimum_differences5)
        assert maximum_abs_difference16 == 0
        total += rooted
        row = {
            "core_order": order,
            "rooted_cores": rooted,
            "minimum_5F_at_s1": str(minimum_f1_5),
            "minimum_F_at_s1": str(sp.Rational(minimum_f1_5, 5)),
            "minimum_forward_differences_1_through_15_of_5F_at_s0": [
                str(value) for value in minimum_differences5
            ],
            "maximum_absolute_forward_difference_16": 0,
        }
        per_order.append(row)
        print(
            f"PASS core_n={order} rooted={rooted:,} "
            f"min_F1={row['minimum_F_at_s1']}",
            flush=True,
        )

    payload = {
        "schema": "rank5-quantitative-small-core-star-root-v1",
        "status": "PASS_EXACT_RANK5_QUANTITATIVE_SMALL_CORE_AND_STAR",
        "quantitative_inequality": "M_s >= 7*d_s*e_s^3/5",
        "small_core_domain": (
            "Every rooted tree core C of order 1 through 12 and every integer "
            "number s>=1 of added isolated vertices."
        ),
        "proof": (
            "For each of the 11,006 rooted cores, 5F_s=5M_s-7d_s e_s^3 "
            "has degree at most 15. Exact evaluation gives F_1>=0, all first "
            "15 forward differences at s=0 nonnegative, and Delta^16(5F)=0. "
            "Newton's formula based at s=1 proves F_s>=0 for every integer s>=1."
        ),
        "rooted_cores": total,
        "per_order": per_order,
        "global_minimum_forward_differences_1_through_15_of_5F_at_s0": [
            str(value) for value in global_minimum_difference5
        ],
        "star_center_factorization": star_factorization,
        "star_center_nonnegative_for": "every integer leaves>=0",
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This seals only the small-core-isolate and star-center branches of "
            "the rank-five terminal proof. The separate large-core isolate branch "
            "must also preserve the quantitative inequality."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
