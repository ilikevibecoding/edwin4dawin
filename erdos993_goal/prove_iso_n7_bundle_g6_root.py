#!/usr/bin/env python3
"""Prove the rank-seven whole-bundle coefficient g6 universally.

Orders 2..10 are supplied by an exact exhaustive forest/parent census.  For
n>=11, the marked-row partition admits an explicit nonnegative decomposition:
A/B/Z high ranks are paid by consecutive-set slacks, the W block is expanded
about forest lower floors for W2 and W3, and the D block is paid by complete-
graph caps.  The two ranges join without a gap.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import (
    add_xd,
    binomial_basis,
    isolate_multiply,
    nested_rank,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g6_exact_root_20260830.json"

UPSTREAM = {
    "algebra_source": (
        "derive_iso_n7_bundle_polynomial_root.py",
        "65501B253483CBAB80DBB442285DCD21EEF80372601864C8E3C1056222B2905B",
    ),
    "algebra_report": (
        "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json",
        "266694256F63EA12F512F56CF765B56B56B71BFB1618599CC36CA2BBE4375D8C",
    ),
    "g7_source": (
        "prove_iso_n7_bundle_g7_root.py",
        "EAEC7529572514FDCE5658C7ACFCCA77BD88D13DFE0A37CB63E6A12ACD17B1AF",
    ),
    "g7_report": (
        "iso_n7_bundle_g7_exact_root_20260830.json",
        "48CB9EF1C42F3EBBAB7017CF30C57F2897F3CE8B7067DAB81D5DECD8B412E67F",
    ),
    "finite_source": (
        "census_iso_n7_bundle_g6_finite_n2_10_root.py",
        "9D885EB9955EB9B67B0F4B5DBE1EFA5A8F515357C8EC66FE67233A90B5B37E6C",
    ),
    "finite_report": (
        "iso_n7_bundle_g6_finite_n2_10_exact_root_20260830.json",
        "EB6E8BA8CA9D92BFD1E05A321FC5ED231F2A89F1EDBED0FCD903947057E832F4",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(order: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(order - offset for offset in range(rank)) / sp.factorial(rank)


def main() -> None:
    for name, expected in UPSTREAM.values():
        assert sha256(HERE / name) == expected
    finite = json.loads((HERE / UPSTREAM["finite_report"][0]).read_text())
    assert finite["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G6_FINITE_N2_10_ROOT"
    assert finite["orders"] == [2, 10] and finite["negative_g6"] == 0

    rank = 7
    maximum = rank + 1
    mvar, tvar = sp.symbols("M t", integer=True, nonnegative=True)
    names = "EUVW"
    crows = tuple(tuple(sp.symbols(f"c{name}0:{maximum + 1}")) for name in names)
    drows = tuple(tuple(sp.symbols(f"d{name}0:{maximum + 1}")) for name in names)
    bundled = add_xd(isolate_multiply(crows, mvar, maximum), drows)
    base = add_xd(crows, drows)
    isolated_c = isolate_multiply(crows, tvar, rank)
    lower = nested_rank(isolated_c, rank - 1)
    lower_polynomial = sp.Poly(lower, tvar)
    lower_sum = sp.expand(
        sum(
            coefficient
            * (sp.bernoulli(power + 1, mvar) - sp.bernoulli(power + 1, 0))
            / (power + 1)
            for (power,), coefficient in lower_polynomial.terms()
        )
    )
    gamma = sp.expand(
        nested_rank(bundled, rank) - nested_rank(base, rank) - lower_sum
    )
    coefficients = binomial_basis(gamma, mvar)

    n, q, epsilon_u, epsilon_v = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {}
    for name in names:
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update(
        {
            sp.Symbol("cE1"): n,
            sp.Symbol("cU1"): n - 1,
            sp.Symbol("cV1"): n - 1,
            sp.Symbol("cW1"): n - 2,
            sp.Symbol("dE1"): q,
            sp.Symbol("dU1"): q - epsilon_u,
            sp.Symbol("dV1"): q - epsilon_v,
            sp.Symbol("dW1"): q - epsilon_u - epsilon_v,
        }
    )
    g6 = sp.factor(coefficients[6].subs(structural))

    w2, w3, w4, w5, w6 = sp.symbols(
        "W2 W3 W4 W5 W6", integer=True, nonnegative=True
    )
    a2, a3, a4, a5, a6 = sp.symbols(
        "A2 A3 A4 A5 A6", integer=True, nonnegative=True
    )
    b2, b3, b4, b5, b6 = sp.symbols(
        "B2 B3 B4 B5 B6", integer=True, nonnegative=True
    )
    z2, z3, z4, z5, z6 = sp.symbols(
        "Z2 Z3 Z4 Z5 Z6", integer=True, nonnegative=True
    )
    de5, du4, du5, dv4, dv5, dw3, dw4, dw5 = sp.symbols(
        "DE5 DU4 DU5 DV4 DV5 DW3 DW4 DW5",
        integer=True,
        nonnegative=True,
    )
    partition = {}
    for index, (wk, ak, bk, zk) in enumerate(
        zip((w2, w3, w4, w5, w6), (a2, a3, a4, a5, a6),
            (b2, b3, b4, b5, b6), (z2, z3, z4, z5, z6)),
        start=2,
    ):
        partition.update(
            {
                sp.Symbol(f"cW{index}"): wk,
                sp.Symbol(f"cU{index}"): wk + ak,
                sp.Symbol(f"cV{index}"): wk + bk,
                sp.Symbol(f"cE{index}"): wk + ak + bk + zk,
            }
        )
    partition.update(
        {
            sp.Symbol("dE5"): de5,
            sp.Symbol("dU4"): du4,
            sp.Symbol("dU5"): du5,
            sp.Symbol("dV4"): dv4,
            sp.Symbol("dV5"): dv5,
            sp.Symbol("dW3"): dw3,
            sp.Symbol("dW4"): dw4,
            sp.Symbol("dW5"): dw5,
        }
    )
    partitioned = sp.factor(g6.subs(partition))

    order_w = n - 2
    floor_w2 = (n - 3) * (n - 4) / 2
    floor_w3 = (n - 3) * (n - 4) * (n - 8) / 6
    sx = w2 - floor_w2
    sy = w3 - floor_w3
    slack_w4 = (n - 5) * w3 - 4 * w4
    slack_w5 = (n - 6) * w4 - 5 * w5
    slack_w6 = (n - 7) * w5 - 6 * w6
    slack_dw_in_w = w3 - dw3
    slack_a5 = (n - 5) * a4 - 4 * a5
    slack_a6 = (n - 6) * a5 - 5 * a6
    slack_b5 = (n - 5) * b4 - 4 * b5
    slack_b6 = (n - 6) * b5 - 5 * b6
    slack_z5 = (n - 4) * z4 - 3 * z5
    slack_z6 = (n - 5) * z5 - 4 * z6

    binom_n3 = choose_polynomial(n, 3)
    binom_n4 = choose_polynomial(n, 4)
    binom_n5 = choose_polynomial(n, 5)
    slack_de5 = binom_n5 - de5
    slack_du4 = binom_n4 - du4
    slack_dv4 = binom_n4 - dv4
    slack_dw3 = binom_n3 - dw3
    slack_dw5 = binom_n5 - dw5

    k_a4 = (33 * n**2 - 403 * n + 475) / 5
    k_z4 = (19 * n**2 - 76 * n + 162) / 3
    gradient_x = 42 * n**3 - 285 * n**2 + 1141 * n - 622
    gradient_y = 7 * n**3 - 90 * n**2 + 419 * n - 419
    k_w4 = 7 * n**2 + 20 * n + 63
    strict_lower_bound = (
        51 * n**5
        + 1345 * n**4
        - 15500 * n**3
        + 68615 * n**2
        - 131431 * n
        + 123870
    ) / 30
    cone_lower_bound = sp.expand(
        strict_lower_bound - 8 * floor_w2 * floor_w3
    )
    cone_gradient_x = sp.expand(gradient_x - 8 * floor_w3)
    cone_gradient_y = sp.expand(gradient_y - 8 * floor_w2)

    q_a2 = 42 * w4 + 8 * dw3
    d_lower_slacks = sp.expand(
        8 * (slack_de5 + slack_dw5)
        + (8 * n - 7) * (slack_du4 + slack_dv4)
        + (2 * n - 4) * slack_dw3
        + 14 * (du5 + dv5)
        + (14 * n + 4) * dw4
    )
    decomposition = sp.expand(
        cone_lower_bound
        + 260 * a2 * b2
        + 105 * (a2 * b3 + a3 * b2)
        + 2 * (a2 * b4 + a4 * b2)
        + 40 * a3 * b3
        + (a2 + b2) * (320 * w2 + 18 * w3 + 480 * n - 450)
        + (2 * order_w - a2 - b2) * q_a2
        + order_w * (21 * slack_w4 + 16 * slack_dw_in_w)
        + (a3 + b3) * (220 * w2 + 42 * w3 + 320 * n - 435)
        + (a4 + b4) * (42 * sx + k_a4)
        + 2 * (36 * n + 59) * (slack_a5 + slack_b5) / 5
        + 78 * (slack_a6 + slack_b6) / 5
        + (11 * n + 44) * w3 * (1 - z2)
        + z2 * (11 * slack_w4 + 8 * slack_dw_in_w)
        + z2 * (35 * w2 + 220 * n - 240)
        + z3 * (105 * w2 + 260 * n - 300)
        + 2 * w3 * z3
        + z4 * (40 * sx + k_z4)
        + (32 * n**2 - 33 * n + 193) * z4 / 3
        + (3 * n + sp.Rational(40, 3)) * slack_z5
        + 11 * slack_z6
        + cone_gradient_x * sx
        + cone_gradient_y * sy
        + 345 * sx**2
        + 244 * sx * sy
        + 42 * sy**2
        + 8 * w2 * slack_dw_in_w
        + k_w4 * slack_w4
        + (28 * n + 38) * slack_w5
        + 20 * slack_w6
        + d_lower_slacks
    )
    residual = sp.factor(sp.expand(partitioned - decomposition))
    if residual != 0:
        print("decomposition residual (factored):", residual)
    assert residual == 0

    r = sp.Symbol("r", integer=True, nonnegative=True)
    shifted_lower_numerator = sp.expand((30 * cone_lower_bound).subs(n, r + 11))
    shifted_checks = {
        "lower": shifted_lower_numerator,
        "gradient_x": sp.expand(cone_gradient_x.subs(n, r + 11)),
        "gradient_y": sp.expand(cone_gradient_y.subs(n, r + 11)),
        "5_k_a4": sp.expand((5 * k_a4).subs(n, r + 11)),
        "3_k_z4": sp.expand((3 * k_z4).subs(n, r + 11)),
    }
    assert all(
        all(coefficient >= 0 for coefficient in sp.Poly(value, r).all_coeffs())
        for value in shifted_checks.values()
    )

    report = {
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_G6_ROOT",
        "theorem": (
            "For every genuine marked rank-seven sibling-bundle cell over a "
            "finite forest with distinct marks, the binomial coefficient g6 "
            "is nonnegative."
        ),
        "rank": rank,
        "coefficient": "g6",
        "finite_join": {
            "orders": finite["orders"],
            "unlabeled_forests": finite["unlabeled_forests"],
            "ordered_mark_pairs": finite["ordered_mark_pairs"],
            "parent_cells": finite["parent_cells"],
            "minimum": finite["minimum"],
            "negative_g6": finite["negative_g6"],
            "stream_sha256": finite["ordered_stream_sha256"],
        },
        "n_at_least_11": {
            "strict_lower_bound": str(sp.factor(cone_lower_bound)),
            "shifted_positive_checks": {
                key: str(value) for key, value in shifted_checks.items()
            },
            "exact_nonnegative_decomposition": str(sp.factor(decomposition)),
            "forest_floors": {
                "W2": str(floor_w2),
                "W3": str(floor_w3),
            },
        },
        "slacks": [
            str(sx), str(sy), str(slack_w4), str(slack_w5), str(slack_w6),
            str(slack_dw_in_w), str(slack_a5), str(slack_a6),
            str(slack_b5), str(slack_b6), str(slack_z5), str(slack_z6),
            str(slack_de5), str(slack_du4), str(slack_dv4),
            str(slack_dw3), str(slack_dw5),
        ],
        "facts_used": [
            "Consecutive independent-set double counts in A, B, Z, and W.",
            "For forest W on n-2 vertices: W2>=(n-3)(n-4)/2 and W3>=(n-3)(n-4)(n-8)/6.",
            "D-W is induced inside W, so dW3<=W3; A2,B2<=n-2; Z2 is 0 or 1.",
            "The remaining D rows are induced graphs on at most n vertices and obey complete-graph caps.",
            "Every shifted coefficient displayed for r=n-11 is nonnegative.",
        ],
        "upstream_sha256": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Universal exact rank-seven bundle sign only for g6, in addition "
            "to separately pinned g7,...,g12. Coefficients g1,...,g5, all-N6, "
            "terminal N7, all-N7, and Problem 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "finite_parent_cells": finite["parent_cells"],
                "finite_minimum": finite["minimum"],
                "large_n_lower_bound": report["n_at_least_11"][
                    "strict_lower_bound"
                ],
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
