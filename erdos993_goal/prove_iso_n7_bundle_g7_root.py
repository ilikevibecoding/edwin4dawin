#!/usr/bin/env python3
"""Prove the rank-seven whole-bundle coefficient g7 universally.

The marked-row partition reduces g7 to positive A/B/Z blocks, a W block
paid by consecutive-set double counts and the forest pair floor, and a coarse
but sufficient induced-D payment.  The n=2 boundary is evaluated directly.
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
OUTPUT = HERE / "iso_n7_bundle_g7_exact_root_20260830.json"

UPSTREAM = {
    "algebra_source": (
        "derive_iso_n7_bundle_polynomial_root.py",
        "65501B253483CBAB80DBB442285DCD21EEF80372601864C8E3C1056222B2905B",
    ),
    "algebra_report": (
        "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json",
        "266694256F63EA12F512F56CF765B56B56B71BFB1618599CC36CA2BBE4375D8C",
    ),
    "g8_source": (
        "prove_iso_n7_bundle_g8_root.py",
        "6896222A14A78095CA3799C99A417595F4AAAD9FA2BAA3786D6C1EBABC2CC294",
    ),
    "g8_report": (
        "iso_n7_bundle_g8_exact_root_20260830.json",
        "1D40D96DAF13FB19C809E7505A777A5E88D5090A8857592B4E8C8453AC8250A8",
    ),
    "finite_audit_source": (
        "audit_iso_n7_bundle_algebra_finite_g2_transfer_audit.py",
        "063D504FFE6D2D87CE039DC520505969B9FC9BFBA5322EE6E0461C152E1CAB56",
    ),
    "finite_audit_report": (
        "iso_n7_bundle_algebra_finite_independent_audit_exact_g2_transfer_audit_20260830.json",
        "9FA883D4D025BDDE291BC2E32E4DBAB22A6548B85C71C8BD8EB64C85D6CEDAE9",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(order: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(order - offset for offset in range(rank)) / sp.factorial(rank)


def main() -> None:
    for name, expected in UPSTREAM.values():
        assert sha256(HERE / name) == expected
    assert json.loads((HERE / UPSTREAM["g8_report"][0]).read_text())["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G8_ROOT"
    )

    rank = 7
    maximum = rank + 1
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    names = "EUVW"
    crows = tuple(tuple(sp.symbols(f"c{name}0:{maximum + 1}")) for name in names)
    drows = tuple(tuple(sp.symbols(f"d{name}0:{maximum + 1}")) for name in names)
    bundled = add_xd(isolate_multiply(crows, m, maximum), drows)
    base = add_xd(crows, drows)
    isolated_c = isolate_multiply(crows, t, rank)
    lower = nested_rank(isolated_c, rank - 1)
    lower_polynomial = sp.Poly(lower, t)
    lower_sum = sp.expand(
        sum(
            coefficient
            * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0))
            / (power + 1)
            for (power,), coefficient in lower_polynomial.terms()
        )
    )
    gamma = sp.expand(
        nested_rank(bundled, rank) - nested_rank(base, rank) - lower_sum
    )
    coefficients = binomial_basis(gamma, m)

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
    g7 = sp.factor(coefficients[7].subs(structural))

    w2, w3, w4, w5 = sp.symbols(
        "W2 W3 W4 W5", integer=True, nonnegative=True
    )
    a2, a3, a4, a5 = sp.symbols(
        "A2 A3 A4 A5", integer=True, nonnegative=True
    )
    b2, b3, b4, b5 = sp.symbols(
        "B2 B3 B4 B5", integer=True, nonnegative=True
    )
    z2, z3, z4, z5 = sp.symbols(
        "Z2 Z3 Z4 Z5", integer=True, nonnegative=True
    )
    du4, dv4, dw3, dw4 = sp.symbols(
        "DU4 DV4 DW3 DW4", integer=True, nonnegative=True
    )
    partition = {
        sp.Symbol("cW2"): w2,
        sp.Symbol("cU2"): w2 + a2,
        sp.Symbol("cV2"): w2 + b2,
        sp.Symbol("cE2"): w2 + a2 + b2 + z2,
        sp.Symbol("cW3"): w3,
        sp.Symbol("cU3"): w3 + a3,
        sp.Symbol("cV3"): w3 + b3,
        sp.Symbol("cE3"): w3 + a3 + b3 + z3,
        sp.Symbol("cW4"): w4,
        sp.Symbol("cU4"): w4 + a4,
        sp.Symbol("cV4"): w4 + b4,
        sp.Symbol("cE4"): w4 + a4 + b4 + z4,
        sp.Symbol("cW5"): w5,
        sp.Symbol("cU5"): w5 + a5,
        sp.Symbol("cV5"): w5 + b5,
        sp.Symbol("cE5"): w5 + a5 + b5 + z5,
        sp.Symbol("dU4"): du4,
        sp.Symbol("dV4"): dv4,
        sp.Symbol("dW3"): dw3,
        sp.Symbol("dW4"): dw4,
    }
    partitioned = sp.factor(g7.subs(partition))

    slack_a4 = (n - 4) * a3 - 3 * a4
    slack_a5 = (n - 5) * a4 - 4 * a5
    slack_b4 = (n - 4) * b3 - 3 * b4
    slack_b5 = (n - 5) * b4 - 4 * b5
    slack_z5 = (n - 4) * z4 - 3 * z5
    slack_w3 = (n - 4) * w2 - 3 * w3
    slack_w4 = (n - 5) * w3 - 4 * w4
    slack_w5 = (n - 6) * w4 - 5 * w5
    forest_pair_floor = (n - 3) * (n - 4) / 2
    slack_w2 = w2 - forest_pair_floor
    binom_n3 = choose_polynomial(n, 3)
    binom_n4 = choose_polynomial(n, 4)
    slack_du4 = binom_n4 - du4
    slack_dv4 = binom_n4 - dv4
    slack_dw3 = binom_n3 - dw3

    k_a3 = 32 * n**2 - 22 * n + 342
    q_w2 = 242 * n**2 - 722 * n + 2556
    strict_lower_bound = (
        273 * n**4
        - 1028 * n**3
        + 5565 * n**2
        - 9100 * n
        + 30732
    ) / 6
    decomposition = sp.expand(
        strict_lower_bound
        + 250 * a2 * b2
        + 42 * (a2 * b3 + a3 * b2)
        + 280 * (a2 + b2) * w2
        + (860 * n - 350) * (a2 + b2)
        + (a3 + b3) * (84 * slack_w2 + k_a3)
        + 2 * (5 * n + 24) * (slack_a4 + slack_b4)
        + 30 * (slack_a5 + slack_b5)
        + 42 * w3 * (1 - z2)
        + z2 * (16 * w2 + 400 * n - 100)
        + z3 * (42 * w2 + 250 * n - 100)
        + (28 * n - 12) * z4
        + 14 * slack_z5
        + 84 * slack_w2 * w3
        + 2 * (26 * n + 3) * slack_w3
        + (42 * n + 114) * slack_w4
        + 48 * slack_w5
        + slack_w2 * (294 * slack_w2 + q_w2)
        + 8 * (slack_du4 + slack_dv4)
        + (8 * n + 2) * slack_dw3
        + 14 * dw4
    )
    assert sp.expand(partitioned - decomposition) == 0

    shifted = sp.Symbol("r", integer=True, nonnegative=True)
    shifted_numerator = sp.expand((6 * strict_lower_bound).subs(n, shifted + 3))
    assert shifted_numerator == (
        273 * shifted**4
        + 2248 * shifted**3
        + 11055 * shifted**2
        + 26018 * shifted
        + 47874
    )

    n2_substitution = {
        n: 2,
        w2: 0,
        w3: 0,
        w4: 0,
        w5: 0,
        a2: 0,
        a3: 0,
        a4: 0,
        a5: 0,
        b2: 0,
        b3: 0,
        b4: 0,
        b5: 0,
        z3: 0,
        z4: 0,
        z5: 0,
        du4: 0,
        dv4: 0,
        dw3: 0,
        dw4: 0,
    }
    n2_value = sp.factor(partitioned.subs(n2_substitution))
    assert sp.expand(n2_value - (3370 + 700 * z2)) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_G7_ROOT",
        "rank": rank,
        "coefficient": "g7",
        "raw_first_face": str(g7),
        "partitioned_coefficient": str(partitioned),
        "n_at_least_3": {
            "strict_lower_bound": str(sp.factor(strict_lower_bound)),
            "positive_shifted_numerator": str(shifted_numerator),
            "exact_nonnegative_decomposition": str(sp.factor(decomposition)),
        },
        "n_equals_2": {
            "exact_value": str(n2_value),
            "minimum": 3370,
        },
        "slacks": [
            str(slack_a4), str(slack_a5), str(slack_b4), str(slack_b5),
            str(slack_z5), str(slack_w3), str(slack_w4), str(slack_w5),
            str(slack_w2), str(slack_du4), str(slack_dv4), str(slack_dw3),
        ],
        "facts_used": [
            "Consecutive independent-set double counts in A, B, Z, and W.",
            "A forest W on n-2>=1 vertices has W2>=(n-3)(n-4)/2.",
            "The indicated D rows have at most binom(n,4), binom(n,4), and binom(n,3) independent sets.",
            "Z2 is a 0/1 indicator and every marked partition count is nonnegative.",
        ],
        "upstream_sha256": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Universal exact rank-seven bundle sign only for g7, in addition "
            "to separately pinned g8,...,g12. Coefficients g1,...,g6, all-N6, "
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
                "n_at_least_3_lower_bound": report["n_at_least_3"][
                    "strict_lower_bound"
                ],
                "n_equals_2": report["n_equals_2"],
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
