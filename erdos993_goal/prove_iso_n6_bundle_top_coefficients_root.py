#!/usr/bin/env python3
"""Prove the top three rank-six whole-bundle coefficients universally.

Starting from the exact rank-six bundle telescope, this certificate expands
the binomial coefficients ``g_8,g_9,g_10`` and then substitutes the constant,
linear, and quadratic independence counts of a marked forest ``B``.  The
result uses only elementary forest facts and is solver-free.

This is deliberately a top-coefficient theorem only.  It does not assert the
signs of ``g_1,...,g_7`` or an all-forest ``N_6`` theorem.
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
OUTPUT = HERE / "iso_n6_bundle_top_coefficients_exact_root_20260830.json"

UPSTREAM = {
    "source": (
        "derive_iso_n6_bundle_polynomial_root.py",
        "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    ),
    "report": (
        "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, expected in UPSTREAM.values():
        assert sha256(HERE / name) == expected
    upstream_report = json.loads((HERE / UPSTREAM["report"][0]).read_text())
    assert (
        upstream_report["marker"]
        == "DERIVED_EXACT_ISO_N6_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    )

    rank = 6
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
    assert len(coefficients) == 11

    n, q, epsilon_u, epsilon_v = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    edge_count, degree_u, degree_v, adjacent = sp.symbols(
        "edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
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
    second_face_counts = {
        sp.Symbol("cE2"): n * (n - 1) / 2 - edge_count,
        sp.Symbol("cU2"): (
            (n - 1) * (n - 2) / 2 - (edge_count - degree_u)
        ),
        sp.Symbol("cV2"): (
            (n - 1) * (n - 2) / 2 - (edge_count - degree_v)
        ),
        sp.Symbol("cW2"): (
            (n - 2) * (n - 3) / 2
            - (edge_count - degree_u - degree_v + adjacent)
        ),
    }

    g10 = sp.factor(coefficients[10].subs(structural))
    g9 = sp.factor(coefficients[9].subs(structural))
    g8_first_face = sp.factor(coefficients[8].subs(structural))
    g8 = sp.factor(g8_first_face.subs(second_face_counts))

    expected_g8 = 14 * (
        6 * edge_count
        - 9 * (degree_u + degree_v)
        + 8 * adjacent
        + 45 * n
        + 63
    )
    lower_bound_g8 = 14 * (36 * n + 63)
    nonnegative_remainder_g8 = 14 * (
        6 * edge_count
        + 9 * (n - degree_u - degree_v)
        + 8 * adjacent
    )
    assert sp.expand(g10) == 0
    assert sp.expand(g9 - 630) == 0
    assert sp.expand(g8 - expected_g8) == 0
    assert sp.expand(g8 - lower_bound_g8 - nonnegative_remainder_g8) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_TOP_COEFFICIENTS_ROOT",
        "identity": (
            "Gamma_M=N6((1+x)^M C+xD)-N6(C+xD)-"
            "sum_(t=0)^(M-1)N5((1+x)^t C)"
        ),
        "rank": rank,
        "degree_in_M": sp.Poly(gamma, m).degree(),
        "proved_top_coefficients": {
            "g10": str(g10),
            "g9": str(g9),
            "g8_first_face": str(g8_first_face),
            "g8_forest_counts": str(g8),
            "g8_lower_bound": str(lower_bound_g8),
            "g8_nonnegative_remainder": str(nonnegative_remainder_g8),
            "forest_facts_used": (
                "edge_count>=0; degree_u+degree_v<=n for two marked vertices "
                "in a forest; adjacent>=0"
            ),
        },
        "structural_substitution": (
            "The four C rows are the independence rows of B, B-u, B-v, "
            "and B-{u,v}; all constant counts equal one; their linear counts "
            "are n,n-1,n-1,n-2; their quadratic counts are total vertex "
            "pairs minus the corresponding surviving forest edges."
        ),
        "upstream_sha256": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Universal exact signs only for rank-six bundle coefficients "
            "g8,g9,g10. Coefficients g1,...,g7, the complete rank-six Bundle "
            "Payment Lemma, all-N6, and Erdos Problem 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "g8": report["proved_top_coefficients"]["g8_forest_counts"],
                "g8_lower_bound": report["proved_top_coefficients"][
                    "g8_lower_bound"
                ],
                "g9": report["proved_top_coefficients"]["g9"],
                "g10": report["proved_top_coefficients"]["g10"],
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
