#!/usr/bin/env python3
"""Prove the rank-seven whole-bundle coefficient g8 universally.

The proof partitions the marked C rows into W/A/B/Z classes, pays the A/B
four-set terms and the W four-set/triple terms by consecutive-set double
counts, uses the forest lower bound for W2, and bounds the single negative D
term by the complete-graph triple count.  The n=2 boundary is exact.
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
OUTPUT = HERE / "iso_n7_bundle_g8_exact_root_20260830.json"

UPSTREAM = {
    "algebra_source": (
        "derive_iso_n7_bundle_polynomial_root.py",
        "65501B253483CBAB80DBB442285DCD21EEF80372601864C8E3C1056222B2905B",
    ),
    "algebra_report": (
        "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json",
        "266694256F63EA12F512F56CF765B56B56B71BFB1618599CC36CA2BBE4375D8C",
    ),
    "top_source": (
        "prove_iso_n7_bundle_top_g9_g12_root.py",
        "ED82AAA863A013567D84A4B50415D263EF5C04B433C442B2684D9C8296D6D5D5",
    ),
    "top_report": (
        "iso_n7_bundle_top_g9_g12_exact_root_20260830.json",
        "FA87562DB050D8BFCDCC2391BF53A7AA3E508D65D22F736AC076F053D72A6386",
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


def main() -> None:
    for name, expected in UPSTREAM.values():
        assert sha256(HERE / name) == expected
    assert json.loads((HERE / UPSTREAM["top_report"][0]).read_text())["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_TOP_G9_G12_ROOT"
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
    g8 = sp.factor(coefficients[8].subs(structural))

    w2, w3, w4 = sp.symbols("W2 W3 W4", integer=True, nonnegative=True)
    a2, a3, a4 = sp.symbols("A2 A3 A4", integer=True, nonnegative=True)
    b2, b3, b4 = sp.symbols("B2 B3 B4", integer=True, nonnegative=True)
    z2, z3, z4 = sp.symbols("Z2 Z3 Z4", integer=True, nonnegative=True)
    dw3 = sp.Symbol("DW3", integer=True, nonnegative=True)
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
        sp.Symbol("dW3"): dw3,
    }
    partitioned = sp.factor(g8.subs(partition))

    slack_a = (n - 4) * a3 - 3 * a4
    slack_b = (n - 4) * b3 - 3 * b4
    slack_w4 = (n - 5) * w3 - 4 * w4
    slack_w3 = (n - 4) * w2 - 3 * w3
    forest_pair_floor = (n - 3) * (n - 4) / 2
    slack_w2 = w2 - forest_pair_floor
    complete_triples = n * (n - 1) * (n - 2) / 6
    slack_d = complete_triples - dw3

    strict_lower_bound = (
        608 * n**3 + 861 * n**2 + 4585 * n + 14703
    ) / 3
    decomposition = sp.expand(
        strict_lower_bound
        + 84 * a2 * b2
        + 84 * (a2 + b2) * w2
        + (644 * n + 350) * (a2 + b2)
        + (44 * n + 20) * (a3 + b3)
        + 40 * (slack_a + slack_b)
        + (308 * n + 434) * z2
        + (84 * n + 140) * z3
        + 6 * (7 * n + 30) * slack_w3
        + 90 * slack_w4
        + slack_w2 * (84 * slack_w2 + 42 * n**2 + 114 * n + 1070)
        + 8 * slack_d
    )
    assert sp.expand(partitioned - decomposition) == 0

    shifted = sp.Symbol("r", integer=True, nonnegative=True)
    shifted_numerator = sp.expand((3 * strict_lower_bound).subs(n, shifted + 3))
    assert shifted_numerator == (
        608 * shifted**3
        + 6333 * shifted**2
        + 26167 * shifted
        + 52623
    )

    n2_substitution = {
        n: 2,
        w2: 0,
        w3: 0,
        w4: 0,
        a2: 0,
        a3: 0,
        a4: 0,
        b2: 0,
        b3: 0,
        b4: 0,
        z3: 0,
        z4: 0,
        dw3: 0,
    }
    n2_value = sp.factor(partitioned.subs(n2_substitution))
    assert sp.expand(n2_value - (9345 + 1050 * z2)) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_G8_ROOT",
        "rank": rank,
        "coefficient": "g8",
        "raw_first_face": str(g8),
        "partitioned_coefficient": str(partitioned),
        "n_at_least_3": {
            "strict_lower_bound": str(sp.factor(strict_lower_bound)),
            "positive_shifted_numerator": str(shifted_numerator),
            "exact_nonnegative_decomposition": str(sp.factor(decomposition)),
        },
        "n_equals_2": {
            "exact_value": str(n2_value),
            "minimum": 9345,
        },
        "slacks": [
            str(slack_a),
            str(slack_b),
            str(slack_w4),
            str(slack_w3),
            str(slack_w2),
            str(slack_d),
        ],
        "facts_used": [
            "Consecutive independent-set double counts in the A, B, and W induced graphs.",
            "A forest W on n-2>=1 vertices has W2>=(n-3)(n-4)/2.",
            "The D-W row has at most binom(n,3) independent triples.",
            "All marked partition counts are nonnegative.",
        ],
        "upstream_sha256": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Universal exact rank-seven bundle sign only for g8, in addition "
            "to the separately pinned g9,...,g12 theorem. Coefficients g1,...,g7, "
            "all-N6, terminal N7, all-N7, and Problem 993 remain open."
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
