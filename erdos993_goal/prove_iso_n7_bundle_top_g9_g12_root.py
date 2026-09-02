#!/usr/bin/env python3
"""Prove the top four rank-seven whole-bundle coefficients universally.

The exact degree-twelve rank-seven bundle polynomial has top coefficients
g9,g10,g11,g12.  This solver-free certificate proves them by a marked-set
partition, elementary consecutive independent-set double counts, and the
quadratic forest-count formulas.

The lower coefficients g1,...,g8 and all-N7 remain open.
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
OUTPUT = HERE / "iso_n7_bundle_top_g9_g12_exact_root_20260830.json"

UPSTREAM = {
    "algebra_source": (
        "derive_iso_n7_bundle_polynomial_root.py",
        "65501B253483CBAB80DBB442285DCD21EEF80372601864C8E3C1056222B2905B",
    ),
    "algebra_report": (
        "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json",
        "266694256F63EA12F512F56CF765B56B56B71BFB1618599CC36CA2BBE4375D8C",
    ),
    "finite_source": (
        "probe_iso_n7_bundle_finite_root.py",
        "4CE45144F9A1FA1B749FA49C1FB51AAB5C61A5F98A27FA3604DE247F80A726D8",
    ),
    "finite_report": (
        "iso_n7_bundle_finite_probe_root_20260830.json",
        "EC5A384BF8F2F1384E8D55EBE402581353DB91D23FD7500476A2B75359A49F50",
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
    assert json.loads((HERE / UPSTREAM["finite_audit_report"][0]).read_text())[
        "marker"
    ] == "PASS_INDEPENDENT_DIAGNOSTIC_EXACT_ISO_N7_BUNDLE_ALGEBRA_FINITE_G2_TRANSFER_AUDIT"

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
    assert len(coefficients) == 13

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

    g12 = sp.factor(coefficients[12].subs(structural))
    g11 = sp.factor(coefficients[11].subs(structural))
    g10_first_face = sp.factor(coefficients[10].subs(structural))
    g9_first_face = sp.factor(coefficients[9].subs(structural))

    edge_count, degree_u, degree_v, adjacent = sp.symbols(
        "edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
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
    g10 = sp.factor(g10_first_face.subs(second_face_counts))
    g10_lower = 6 * (308 * n + 715)
    g10_remainder = 6 * (
        44 * edge_count
        + 66 * (n - degree_u - degree_v)
        + 60 * adjacent
    )
    assert sp.expand(g10 - g10_lower - g10_remainder) == 0

    w2, w3 = sp.symbols("W2 W3", integer=True, nonnegative=True)
    a2, a3 = sp.symbols("A2 A3", integer=True, nonnegative=True)
    b2, b3 = sp.symbols("B2 B3", integer=True, nonnegative=True)
    z2, z3 = sp.symbols("Z2 Z3", integer=True, nonnegative=True)
    partition = {
        sp.Symbol("cW2"): w2,
        sp.Symbol("cU2"): w2 + a2,
        sp.Symbol("cV2"): w2 + b2,
        sp.Symbol("cE2"): w2 + a2 + b2 + z2,
        sp.Symbol("cW3"): w3,
        sp.Symbol("cU3"): w3 + a3,
        sp.Symbol("cV3"): w3 + b3,
        sp.Symbol("cE3"): w3 + a3 + b3 + z3,
    }
    g9_partitioned = sp.factor(g9_first_face.subs(partition))
    slack_w = (n - 4) * w2 - 3 * w3
    slack_a = (n - 3) * a2 - 2 * a3
    slack_b = (n - 3) * b2 - 2 * b3
    g9_lower = 2 * (399 * n**2 + 1302 * n + 2226)
    g9_decomposition = sp.expand(
        g9_lower
        + 48 * w2
        + 132 * slack_w
        + 2 * (75 * n + 279) * (a2 + b2)
        + 18 * (slack_a + slack_b)
        + 2 * (42 * n + 266) * z2
        + 84 * z3
    )
    assert sp.expand(g9_partitioned - g9_decomposition) == 0
    assert sp.expand(g12) == 0
    assert sp.expand(g11 - 2244) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N7_BUNDLE_TOP_G9_G12_ROOT",
        "theorem": (
            "For every genuine marked rank-seven sibling-bundle cell over a "
            "finite forest with distinct marks, g9,g10,g11,g12 are nonnegative."
        ),
        "rank": rank,
        "degree_in_M": sp.Poly(gamma, m).degree(),
        "proved_coefficients": {
            "g9": {
                "first_face": str(g9_first_face),
                "partitioned": str(g9_partitioned),
                "lower_bound": str(sp.factor(g9_lower)),
                "nonnegative_decomposition": str(sp.factor(g9_decomposition)),
                "slacks": [str(slack_w), str(slack_a), str(slack_b)],
            },
            "g10": {
                "first_face": str(g10_first_face),
                "forest_counts": str(g10),
                "lower_bound": str(sp.factor(g10_lower)),
                "nonnegative_remainder": str(sp.factor(g10_remainder)),
            },
            "g11": str(g11),
            "g12": str(g12),
        },
        "facts_used": [
            "For W on n-2 vertices, 3*W3<=(n-4)*W2.",
            "For the available graph beside one mark, 2*A3<=(n-3)*A2, and symmetrically for B.",
            "The marked partition counts W,A,B,Z are nonnegative.",
            "For two distinct vertices in a forest, degree_u+degree_v<=n; edge_count and adjacent are nonnegative.",
        ],
        "upstream_sha256": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Universal exact rank-seven bundle signs only for g9,...,g12. "
            "Coefficients g1,...,g8, the lower all-N6 payment, terminal N7, "
            "all-N7, and Erdos Problem 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "g9_lower_bound": report["proved_coefficients"]["g9"]["lower_bound"],
                "g10_lower_bound": report["proved_coefficients"]["g10"]["lower_bound"],
                "g11": report["proved_coefficients"]["g11"],
                "g12": report["proved_coefficients"]["g12"],
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
