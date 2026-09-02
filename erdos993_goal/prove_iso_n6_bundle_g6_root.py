#!/usr/bin/env python3
"""Prove the rank-six whole-bundle coefficient g6 universally.

This certificate partitions the four C rows by whether an independent set
contains neither, exactly one, or both marked vertices.  It rewrites the
exact symbolic g6 as a positive polynomial plus elementary double-counting,
forest-edge, and induced-subgraph slacks.  The n=2 boundary is handled
directly; the displayed decomposition applies for n>=3.

Only g6 is proved here.  The lower coefficients and all-N6 remain open.
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
OUTPUT = HERE / "iso_n6_bundle_g6_exact_root_20260830.json"

UPSTREAM = {
    "algebra_source": (
        "derive_iso_n6_bundle_polynomial_root.py",
        "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    ),
    "algebra_report": (
        "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    ),
    "g7_source": (
        "prove_iso_n6_bundle_g7_root.py",
        "047016067AD2E941AA488F248CC6F0A450A5BDB8776E9357F891812EAF5FF198",
    ),
    "g7_report": (
        "iso_n6_bundle_g7_exact_root_20260830.json",
        "7C457382F29BA910D68282CD34ECA8CF770515C3447DC27C341D33485669D830",
    ),
    "g7_audit_source": (
        "audit_iso_n6_bundle_g7_g2_transfer_audit.py",
        "1340B33DF04DD30F127D23CB213F3F71E1A927C6E463C1230A0ACF21C8660D49",
    ),
    "g7_audit_report": (
        "iso_n6_bundle_g7_independent_audit_exact_g2_transfer_audit_20260830.json",
        "FA52C732E4A38828E5EFBD6E57B086772C864102DC02BE80A2BA0CA554BF382C",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, expected in UPSTREAM.values():
        assert sha256(HERE / name) == expected
    assert json.loads((HERE / UPSTREAM["g7_audit_report"][0]).read_text())[
        "marker"
    ] == "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G7_G2_TRANSFER_AUDIT"

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

    w2, w3, w4 = sp.symbols("W2 W3 W4", integer=True, nonnegative=True)
    a2, a3, a4 = sp.symbols("A2 A3 A4", integer=True, nonnegative=True)
    b2, b3, b4 = sp.symbols("B2 B3 B4", integer=True, nonnegative=True)
    z2, z3, z4 = sp.symbols("Z2 Z3 Z4", integer=True, nonnegative=True)
    du3, dv3, dw2, dw3 = sp.symbols(
        "DU3 DV3 DW2 DW3", integer=True, nonnegative=True
    )
    marked_partition = {
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
        sp.Symbol("dU3"): du3,
        sp.Symbol("dV3"): dv3,
        sp.Symbol("dW2"): dw2,
        sp.Symbol("dW3"): dw3,
    }
    partitioned = sp.factor(g6.subs(marked_partition))

    slack_a4 = (n - 4) * a3 - 3 * a4
    slack_b4 = (n - 4) * b3 - 3 * b4
    slack_z4 = (n - 3) * z3 - 2 * z4
    slack_w4 = (n - 5) * w3 - 4 * w4
    slack_w3 = (n - 4) * w2 - 3 * w3
    forest_pair_floor = (n - 3) * (n - 4) / 2
    slack_w2 = w2 - forest_pair_floor
    slack_du3 = n * (n - 1) * (n - 2) / 6 - du3
    slack_dv3 = n * (n - 1) * (n - 2) / 6 - dv3
    slack_dw2 = n * (n - 1) / 2 - dw2

    strict_lower_bound = (
        259 * n**3 + 123 * n**2 + 1088 * n + 5448
    ) / 6
    decomposition = sp.expand(
        strict_lower_bound
        + 30 * a2 * b2
        + 28 * (a2 + b2) * w2
        + (170 * n + 10) * (a2 + b2)
        + (14 * n - 4) * (a3 + b3)
        + 14 * (slack_a4 + slack_b4)
        + (80 * n + 60) * z2
        + (29 * n + 23) * z3
        + slack_z4
        + 2 * w2 * (1 - z2)
        + 14 * (n + 3) * slack_w3
        + 28 * slack_w4
        + slack_w2 * (28 * slack_w2 + 14 * n**2 + 286)
        + 7 * (slack_du3 + slack_dv3)
        + (7 * n + 2) * slack_dw2
        + 12 * dw3
    )
    assert sp.expand(partitioned - decomposition) == 0

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
        du3: 0,
        dv3: 0,
        dw2: 0,
        dw3: 0,
    }
    n2_value = sp.factor(partitioned.subs(n2_substitution))
    assert sp.expand(n2_value - (1400 + 220 * z2)) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_G6_ROOT",
        "rank": rank,
        "coefficient": "g6",
        "raw_first_face": str(g6),
        "partitioned_coefficient": str(partitioned),
        "marked_partition": {
            "Wk": "i_k(B-{u,v})",
            "Ak": "sets containing v but not u",
            "Bk": "sets containing u but not v",
            "Zk": "sets containing both marks; in particular Z2 is 0 or 1",
            "DU3_DV3_DW2_DW3": "the indicated independence counts in D minors",
        },
        "n_at_least_3": {
            "strict_lower_bound": str(sp.factor(strict_lower_bound)),
            "exact_nonnegative_decomposition": str(sp.factor(decomposition)),
            "slacks": {
                "S_A4": str(slack_a4),
                "S_B4": str(slack_b4),
                "S_Z4": str(slack_z4),
                "S_W4": str(slack_w4),
                "S_W3": str(slack_w3),
                "S_W2": str(slack_w2),
                "S_DU3": str(slack_du3),
                "S_DV3": str(slack_dv3),
                "S_DW2": str(slack_dw2),
            },
        },
        "n_equals_2": {
            "exact_value": str(n2_value),
            "minimum": 1400,
            "reason": (
                "W is empty; A and B have no size-2 sets; D-U and D-V have "
                "order at most one; D-W is empty; Z2 is the 0/1 indicator "
                "that the two marks are nonadjacent."
            ),
        },
        "slack_proofs": {
            "S_A4_S_B4": (
                "Triple-to-pair double count in the available graph beside "
                "one mark: 3*A4<=(n-4)*A3, and symmetrically for B."
            ),
            "S_Z4": (
                "When both marks can occur, Z3 is the available order and Z4 "
                "its independent-pair count: 2*Z4<=(n-3)*Z3."
            ),
            "S_W4_S_W3": (
                "W has n-2 vertices. Consecutive independent-set double "
                "counts give 4*W4<=(n-5)*W3 and 3*W3<=(n-4)*W2."
            ),
            "S_W2": (
                "A forest on n-2>=1 vertices has at most n-3 edges, so "
                "W2>=binom(n-2,2)-(n-3)=(n-3)(n-4)/2."
            ),
            "S_D": (
                "Every D minor is an induced simple graph on at most n "
                "vertices, hence DU3,DV3<=binom(n,3) and DW2<=binom(n,2)."
            ),
            "remaining_factors": (
                "For n>=3 all displayed coefficients are positive; all set "
                "counts and DW3 are nonnegative; 1-Z2 is nonnegative."
            ),
        },
        "upstream_sha256": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Universal exact nonnegativity only for rank-six bundle g6. "
            "Coefficients g1,...,g5, the complete Bundle Payment Lemma, all-N6, "
            "and Erdos Problem 993 remain open."
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
