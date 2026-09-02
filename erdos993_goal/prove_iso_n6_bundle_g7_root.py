#!/usr/bin/env python3
"""Prove the rank-six whole-bundle coefficient g7 universally.

The proof rewrites the exact symbolic coefficient in terms of independence
counts in ``W=B-{u,v}``, the sets containing exactly one or both marks, and
the quadratic row of ``D``.  Three elementary double-counting slacks then
give a strictly positive lower bound for every finite forest with distinct
marks.

No claim is made here about g1,...,g6 or the complete all-N6 induction.
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
OUTPUT = HERE / "iso_n6_bundle_g7_exact_root_20260830.json"

UPSTREAM = {
    "algebra_source": (
        "derive_iso_n6_bundle_polynomial_root.py",
        "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    ),
    "algebra_report": (
        "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    ),
    "top_source": (
        "prove_iso_n6_bundle_top_coefficients_root.py",
        "D66274CD4E4F1D7B681662DDAA68B97985E2684B16588234C287B4115D12A970",
    ),
    "top_report": (
        "iso_n6_bundle_top_coefficients_exact_root_20260830.json",
        "628BFD655335BF703C031687B73F32824D368466E57241E745FD48C6E82FC4BF",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, expected in UPSTREAM.values():
        assert sha256(HERE / name) == expected
    assert json.loads((HERE / UPSTREAM["top_report"][0]).read_text())["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_TOP_COEFFICIENTS_ROOT"
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

    w2, w3 = sp.symbols("W2 W3", integer=True, nonnegative=True)
    a2, a3 = sp.symbols("A2 A3", integer=True, nonnegative=True)
    b2, b3 = sp.symbols("B2 B3", integer=True, nonnegative=True)
    z2, z3 = sp.symbols("Z2 Z3", integer=True, nonnegative=True)
    d2 = sp.symbols("D2", integer=True, nonnegative=True)
    marked_partition = {
        sp.Symbol("cW2"): w2,
        sp.Symbol("cU2"): w2 + a2,
        sp.Symbol("cV2"): w2 + b2,
        sp.Symbol("cE2"): w2 + a2 + b2 + z2,
        sp.Symbol("cW3"): w3,
        sp.Symbol("cU3"): w3 + a3,
        sp.Symbol("cV3"): w3 + b3,
        sp.Symbol("cE3"): w3 + a3 + b3 + z3,
        sp.Symbol("dW2"): d2,
    }
    partitioned = sp.factor(g7.subs(marked_partition))

    slack_w = (n - 4) * w2 - 3 * w3
    slack_a = (n - 3) * a2 - 2 * a3
    slack_b = (n - 3) * b2 - 2 * b3
    slack_d = n * (n - 1) / 2 - d2
    lower_bound = (413 * n**2 + 959 * n + 1526) / 2
    decomposition = sp.expand(
        lower_bound
        + 14 * w2
        + 42 * slack_w
        + (49 * n + 133) * (a2 + b2)
        + 7 * (slack_a + slack_b)
        + (28 * n + 134) * z2
        + 28 * z3
        + 7 * slack_d
    )
    assert sp.expand(partitioned - decomposition) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_G7_ROOT",
        "rank": rank,
        "coefficient": "g7",
        "raw_first_face": str(g7),
        "marked_partition": {
            "Wk": "i_k(B-{u,v})",
            "Ak": "i_k(B-u)-i_k(B-{u,v}); sets containing v but not u",
            "Bk": "i_k(B-v)-i_k(B-{u,v}); sets containing u but not v",
            "Zk": (
                "i_k(B)-i_k(B-u)-i_k(B-v)+i_k(B-{u,v}); "
                "sets containing both marks"
            ),
            "D2": "dW2, the independent-pair count in the W row of D",
        },
        "partitioned_coefficient": str(partitioned),
        "nonnegative_decomposition": str(sp.factor(decomposition)),
        "strict_lower_bound": str(sp.factor(lower_bound)),
        "slacks": {
            "S_W": str(slack_w),
            "S_A": str(slack_a),
            "S_B": str(slack_b),
            "S_D": str(slack_d),
        },
        "slack_proofs": {
            "S_W": (
                "W has n-2 vertices. Double-count an independent triple and "
                "one of its three pairs: 3*W3 <= (n-4)*W2."
            ),
            "S_A": (
                "A2 is the order of the induced graph available beside v, "
                "and A3 is its independent-pair count. Since A2<=n-2, "
                "2*A3<=A2*(A2-1)<=(n-3)*A2."
            ),
            "S_B": "The same argument as S_A with the marks exchanged.",
            "S_D": (
                "The W row of D is an induced simple graph on at most n "
                "vertices, so D2<=binom(n,2)."
            ),
            "partition_counts": (
                "A2,A3,B2,B3,Z2,Z3,W2,W3 are cardinalities of disjoint "
                "classes of independent sets and hence nonnegative."
            ),
        },
        "upstream_sha256": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Universal exact nonnegativity only for rank-six bundle g7, "
            "in addition to separately pinned g8,g9,g10. Coefficients g1,...,g6, "
            "the full Bundle Payment Lemma, all-N6, and Problem 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "strict_lower_bound": report["strict_lower_bound"],
                "slacks": report["slacks"],
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
