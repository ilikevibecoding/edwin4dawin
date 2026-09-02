#!/usr/bin/env python3
"""Extract a quantitative all-order Q4 reserve from the sealed leaf certificate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank4_three_halves_leaf_certificate import (
    check_bernstein_certificate,
    check_monotone_reductions,
    check_star_center,
    reconstruct_normalized_increment,
)
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank4_quantitative_tree_reserve_exact_root_20260823.json"
EXPECTED = {
    "verify_rank4_three_halves_leaf_certificate.py":
        "96CBFFC37EA83C71A5E9B8C79440B00AF00138A67C0FF926DBD3B2FD7BEA1396",
    "explore_rank4_three_halves_grouped.py":
        "0F700C716739ABEF49DB90C9890C3218186F680E7CA71DC81A82249BC9951AFA",
    "RANK4_THREE_HALVES_LEAF_CERTIFICATE_2026-07-27.md":
        "65D25F0F6F7E7BDE888712D5AEEE37D747100AF79BD38531DFE893CB234E4732",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    # Replay the exact monotone reductions and the 108-patch strict Bernstein
    # certificate. Its smallest terminal coefficient is a uniform lower bound
    # for (Q4(T+leaf)-Q4(T))/n^6 on every non-star-center attachment, n>=20.
    raw, symbols = reconstruct_normalized_increment()
    check_monotone_reductions(raw, symbols)
    check_star_center()
    patches, depth, epsilon = check_bernstein_certificate()
    assert patches == 108 and depth == 14
    assert epsilon == sp.Rational(5_006_347, 3_686_400_000)

    n, r, m = sp.symbols("n r m", integer=True, nonnegative=True)
    leaf_sum = sp.factor(sp.summation(m**6, (m, 20, n - 1)))
    shifted_leaf_sum = sp.Poly(sp.expand(leaf_sum.subs(n, r + 20)), r)
    assert leaf_sum.subs(n, 20) == 0
    assert all(value >= 0 for value in shifted_leaf_sum.all_coeffs())
    assert leaf_sum.subs(n, 21) == 20**6

    # The star-center increment in the sealed proof uses ell=n-1 old leaves.
    ell = n - 1
    star_increment = sp.factor(
        ell**2 * (ell - 2) * (ell - 1) ** 2 * (7 * ell - 5) / 144
    )
    star_margin = sp.factor(star_increment - epsilon * n**6)
    shifted_star_numerator = sp.Poly(
        sp.expand(sp.together(star_margin).as_numer_denom()[0].subs(n, r + 20)), r
    )
    assert all(value > 0 for value in shifted_star_numerator.all_coeffs())

    quantitative_q4 = sp.factor(epsilon * leaf_sum)
    c4_ceiling = sp.binomial(n, 4)
    x_floor = sp.Rational(4, 1) / (n - 3)
    d4_low_floor = (2 + x_floor) / 10
    u_floor = sp.factor(
        quantitative_q4
        / (10 * c4_ceiling**2 * (D4_CEILING - d4_low_floor))
    )
    assert sp.factor(D4_CEILING - d4_low_floor).subs(n, 20) > 0
    assert u_floor.subs(n, 20) == 0
    assert u_floor.subs(n, 21) > 0

    sample_orders = [21, 23, 27, 28, 40, 80, 200, 1000]
    samples = []
    for order in sample_orders:
        bound = sp.factor(quantitative_q4.subs(n, order))
        normalized = sp.factor(u_floor.subs(n, order))
        assert bound > 0 and normalized > 0
        samples.append({
            "order": order,
            "Q4_lower_bound": str(bound),
            "rank8_U_lower_bound": str(normalized),
        })

    payload = {
        "schema": "rank4-quantitative-tree-reserve-root-v1",
        "status": "PASS_EXACT_QUANTITATIVE_Q4_TREE_RESERVE_N20_PLUS",
        "theorem": (
            "For every n-vertex tree T with n>=20, Q4(T) is at least "
            "epsilon*sum_{m=20}^{n-1} m^6, where epsilon=5006347/3686400000."
        ),
        "epsilon": str(epsilon),
        "leaf_increment": {
            "nonstar": "Q4(T+leaf)-Q4(T) >= epsilon*n^6 for every old order n>=20",
            "star_center": "the explicit star increment exceeds the same epsilon*n^6 bound",
            "certified_patches": patches,
            "maximum_depth": depth,
        },
        "induction": {
            "base": "Q4(T20)>=0 by the sealed rank-four tree theorem",
            "construction": "delete leaves to an arbitrary 20-vertex subtree and add them back",
            "sum_formula": str(leaf_sum),
            "Q4_lower_bound": str(quantitative_q4),
        },
        "rank8_D4_coordinate_corollary": {
            "definitions": (
                "d4=1-c3*c5/c4^2, x=c3/c4, d4_low=(2+x)/10, "
                "U=(d4-d4_low)/(1559/3575-d4_low)"
            ),
            "identity": "d4-d4_low=Q4/(10*c4^2)",
            "elementary_bounds": [
                "c4<=C(n,4)",
                "4*c4<=(n-3)*c3, hence x>=4/(n-3)",
            ],
            "U_lower_bound": str(u_floor),
            "samples": samples,
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is a quantitative rank-four input only. It does not by itself prove "
            "any pending rank-eight Delta0..Delta3 coefficient or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
