#!/usr/bin/env python3
"""Prove the rank-six whole-bundle coefficient g5 universally.

The exact g5 factor is partitioned by marked-set membership.  For n>=3 it
is expressed as a strictly positive quartic plus nonnegative consecutive-set
double-counting slacks, the forest pair floor in W=B-{u,v}, containment of
the D-W row inside W, and coarse induced-subgraph bounds for the remaining D
rows.  The two-vertex boundary is evaluated directly.

This certificate proves g5 only; g1,...,g4 and all-N6 remain open.
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
OUTPUT = HERE / "iso_n6_bundle_g5_exact_root_20260830.json"

UPSTREAM = {
    "algebra_source": (
        "derive_iso_n6_bundle_polynomial_root.py",
        "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    ),
    "algebra_report": (
        "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    ),
    "all_n5_source": (
        "assemble_iso_all_forest_n5_bundle_induction_g2_structure_nonadjacent.py",
        "9906E66E28717A80F1215DBCF75ADE913AFC5EE1911D1A08FD08317F6589AC38",
    ),
    "all_n5_report": (
        "iso_all_forest_n5_bundle_induction_exact_g2_structure_nonadjacent_20260830.json",
        "7F2845A77504828349E100371FEE2591CFDE70AF87E2504A91EE5D121357B3CB",
    ),
    "all_n5_audit_source": (
        "audit_iso_all_forest_n5_bundle_induction_g2_transfer_audit.py",
        "4484285A467773D4C800C91D0E47542072AF6A71AC2C5BA15677BD9BC7EFD363",
    ),
    "all_n5_audit_report": (
        "iso_all_forest_n5_bundle_induction_independent_audit_g2_transfer_audit_20260830.json",
        "761A6AEA3C4ED2E16178DA1B5B5CC41ABAD4DFAFD1F993463E1682FC19456C87",
    ),
    "g6_source": (
        "prove_iso_n6_bundle_g6_root.py",
        "2ECF76862B1FB6C6C84DBD393C41601369F31506DA2AA4A44267FE37FC2594BD",
    ),
    "g6_report": (
        "iso_n6_bundle_g6_exact_root_20260830.json",
        "2304848451FB6A2E6740EDCFA080452141A70692939AC2E2477520786574B77A",
    ),
    "g6_audit_source": (
        "audit_iso_n6_bundle_g6_g2_transfer_audit.py",
        "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
    ),
    "g6_audit_report": (
        "iso_n6_bundle_g6_independent_audit_exact_g2_transfer_audit_20260830.json",
        "1284A8D96FB8F5E4A619EE5C60C5BD93DA67A06BB15F52DB4298B13D0C1E3F3A",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(order: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(order - offset for offset in range(rank)) / sp.factorial(rank)


def main() -> None:
    for name, expected in UPSTREAM.values():
        assert sha256(HERE / name) == expected
    all_n5 = json.loads((HERE / UPSTREAM["all_n5_report"][0]).read_text())
    assert all_n5["marker"] == (
        "PASS_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT"
    )
    assert json.loads((HERE / UPSTREAM["g6_audit_report"][0]).read_text())[
        "marker"
    ] == "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G6_G2_TRANSFER_AUDIT"

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
    g5 = sp.factor(coefficients[5].subs(structural))

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
    de4, du3, du4, dv3, dv4, dw2, dw3, dw4 = sp.symbols(
        "DE4 DU3 DU4 DV3 DV4 DW2 DW3 DW4",
        integer=True,
        nonnegative=True,
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
        sp.Symbol("cW5"): w5,
        sp.Symbol("cU5"): w5 + a5,
        sp.Symbol("cV5"): w5 + b5,
        sp.Symbol("cE5"): w5 + a5 + b5 + z5,
        sp.Symbol("dE4"): de4,
        sp.Symbol("dU3"): du3,
        sp.Symbol("dU4"): du4,
        sp.Symbol("dV3"): dv3,
        sp.Symbol("dV4"): dv4,
        sp.Symbol("dW2"): dw2,
        sp.Symbol("dW3"): dw3,
        sp.Symbol("dW4"): dw4,
    }
    partitioned = sp.factor(g5.subs(marked_partition))

    binom_w3 = choose_polynomial(n - 2, 3)
    binom_n2 = choose_polynomial(n, 2)
    binom_n3 = choose_polynomial(n, 3)
    binom_n4 = choose_polynomial(n, 4)
    forest_pair_floor = (n - 3) * (n - 4) / 2

    slack_w2 = w2 - forest_pair_floor
    slack_w3 = (n - 4) * w2 - 3 * w3
    slack_w4 = (n - 5) * w3 - 4 * w4
    slack_w5 = (n - 6) * w4 - 5 * w5
    slack_a4 = (n - 4) * a3 - 3 * a4
    slack_a5 = (n - 5) * a4 - 4 * a5
    slack_b4 = (n - 4) * b3 - 3 * b4
    slack_b5 = (n - 5) * b4 - 4 * b5
    slack_z5 = (n - 4) * z4 - 3 * z5
    slack_w3_cap = binom_w3 - w3
    slack_dw_in_w = w2 - dw2
    slack_a2_cap = n - 2 - a2
    slack_b2_cap = n - 2 - b2
    slack_de4 = binom_n4 - de4
    slack_du3 = binom_n3 - du3
    slack_dv3 = binom_n3 - dv3
    slack_dw2 = binom_n2 - dw2
    slack_dw4 = binom_n4 - dw4

    k3 = 11 * n**2 - 30 * n + 113
    q_w2 = 53 * n**2 - 198 * n + 544
    strict_lower_bound = (
        71 * n**4
        - 332 * n**3
        + 1759 * n**2
        - 4174 * n
        + 10212
    ) / 12

    q_ab = 2 * w3 + 7 * dw2
    decomposition = sp.expand(
        strict_lower_bound
        + 68 * a2 * b2
        + 15 * a2 * b3
        + 15 * a3 * b2
        + (a2 + b2) * (70 * w2 + 168 * n - 124)
        + (a3 + b3) * (30 * slack_w2 + k3)
        + (4 * n + 11) * (slack_a4 + slack_b4)
        + 10 * (slack_a5 + slack_b5)
        + (slack_a2_cap + slack_b2_cap) * q_ab
        + 4 * (n - 2) * slack_w3_cap
        + 14 * (n - 2) * slack_dw_in_w
        + 3 * w2 * (1 - z2)
        + 17 * w3 * (1 - z2)
        + 7 * slack_dw_in_w
        + 7 * dw2 * (1 - z2)
        + (76 * n - 52) * z2
        + (15 * w2 + 68 * n - 60) * z3
        + (28 * n - 31) * z4 / 3
        + 17 * slack_z5 / 3
        + 7 * w2 * slack_dw_in_w
        + 28 * slack_w2 * w3
        + (15 * n - 12) * slack_w3
        + 7 * (2 * n + 3) * slack_w4
        + 14 * slack_w5
        + slack_w2 * (68 * slack_w2 + q_w2)
        + 7 * (slack_de4 + slack_dw4)
        + (7 * n - 6) * (slack_du3 + slack_dv3)
        + (2 * n - 4) * slack_dw2
        + 12 * (du4 + dv4)
        + (12 * n + 4) * dw3
    )
    assert sp.expand(partitioned - decomposition) == 0

    shifted = sp.Symbol("r", integer=True, nonnegative=True)
    shifted_numerator = sp.expand((12 * strict_lower_bound).subs(n, shifted + 3))
    assert shifted_numerator == (
        71 * shifted**4
        + 520 * shifted**3
        + 2605 * shifted**2
        + 5084 * shifted
        + 10308
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
        de4: 0,
        du3: 0,
        du4: 0,
        dv3: 0,
        dv4: 0,
        dw2: 0,
        dw3: 0,
        dw4: 0,
    }
    n2_value = sp.factor(partitioned.subs(n2_substitution))
    assert sp.expand(n2_value - (323 + 100 * z2)) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_G5_ROOT",
        "rank": rank,
        "coefficient": "g5",
        "raw_first_face": str(g5),
        "partitioned_coefficient": str(partitioned),
        "n_at_least_3": {
            "strict_lower_bound": str(sp.factor(strict_lower_bound)),
            "positive_shifted_numerator": str(shifted_numerator),
            "exact_nonnegative_decomposition": str(sp.factor(decomposition)),
        },
        "n_equals_2": {
            "exact_value": str(n2_value),
            "minimum": 323,
        },
        "slacks": {
            "consecutive_W": [str(slack_w3), str(slack_w4), str(slack_w5)],
            "consecutive_A": [str(slack_a4), str(slack_a5)],
            "consecutive_B": [str(slack_b4), str(slack_b5)],
            "consecutive_Z": str(slack_z5),
            "forest_pair_floor": str(slack_w2),
            "W3_complete_graph_cap": str(slack_w3_cap),
            "D_W_containment": str(slack_dw_in_w),
            "A2_B2_order_caps": [str(slack_a2_cap), str(slack_b2_cap)],
            "D_induced_caps": [
                str(slack_de4),
                str(slack_du3),
                str(slack_dv3),
                str(slack_dw2),
                str(slack_dw4),
            ],
        },
        "slack_proofs": {
            "consecutive_counts": (
                "Double-count an independent (k+1)-set together with one of "
                "its k-subsets in graphs of the indicated orders."
            ),
            "forest_pair_floor": (
                "W is a forest on n-2>=1 vertices and has at most n-3 edges."
            ),
            "D_W_containment": (
                "D-W is an induced subgraph of W, so its independent pairs "
                "form a subset of the independent pairs of W."
            ),
            "marked_caps": (
                "A2 and B2 are orders of induced graphs on subsets of the "
                "n-2 unmarked vertices; Z2 is the 0/1 nonadjacency indicator."
            ),
            "D_induced_caps": (
                "Each indicated D row is a simple induced graph on at most n "
                "vertices, so its k-set count is at most binom(n,k)."
            ),
            "positive_coefficients": (
                "For n>=3, k3=11*n^2-30*n+113 and "
                "q_w2=53*n^2-198*n+544 are positive; every other displayed "
                "multiplier is visibly nonnegative."
            ),
        },
        "upstream_sha256": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Universal exact nonnegativity only for rank-six bundle g5. "
            "Coefficients g1,...,g4, the complete Bundle Payment Lemma, all-N6, "
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
