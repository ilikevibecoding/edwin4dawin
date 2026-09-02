#!/usr/bin/env python3
"""Verify the variance-bridge form of the rooted Gamma quantity.

For a rooted forest (H,v), put G=H-v and R=H-N_H[v].  At rank q use

    A=f_q(H), B=f_(q+1)(H), C=f_(q+2)(H), X=g_(q+2)(H),
    a=f_(q-1)(G), b=f_q(G), c=f_(q+1)(G), e=g_(q+1)(G),
    r=f_q(R).

Let Theta_H be the q!^2-scaled sharp-Lambda surplus of I_q(H).
Let Theta_A be the same surplus for I_q(H) when its residual
statistics are instead measured after a new leaf is attached at v.
Let Theta_G be the (q-1)!^2-scaled surplus of I_(q-1)(G).  Then

    Theta_H = (q-3)A^2 - AC - 3AX + B^2,

    Theta_A = Theta_H + 2Bb + b^2 - 2Ac - 3Ar,

    Theta_G = (q-4)a^2 - ac - 3ae + b^2.

The mean residual orders of the two cross families are

    mu_A = (B+b)/A,       mu_G = b/a.

The rooted cross quantity Gamma has the exact identity

    Gamma/(Aa)
      = Theta_A/A^2 + Theta_G/a^2
        + 1 - (mu_A-mu_G)^2.

Equivalently, with Delta=a(B+b)-Ab,

    Aa Gamma
      = a^2 Theta_A + A^2 Theta_G + A^2 a^2 - Delta^2.

This script proves the identity symbolically and independently audits
the factorial substitutions on finite forests.  The identity is a
lemma; the nonnegativity of its right-hand side remains a proof
obligation.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_edge_survival_ratio_dominance import random_forest
from scan_rooted_cross_W6_lambda_pruning import rooted_quantities
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


def symbolic_verification() -> dict[str, str]:
    q = sp.symbols("q")
    A, B, C, X, a, b, c, e, r = sp.symbols(
        "A B C X a b c e r"
    )
    theta_h = (q - 3) * A**2 - A * C - 3 * A * X + B**2
    absent = 2 * B * b + b**2 - 2 * A * c - 3 * A * r
    theta_a = theta_h + absent
    theta_g = (q - 4) * a**2 - a * c - 3 * a * e + b**2
    delta = a * (B + b) - A * b
    gamma = (
        2 * A * a * q
        - 6 * A * a
        - A * c
        - 3 * A * e
        + 2 * B * b
        - C * a
        - 3 * X * a
        - 2 * a * c
        - 3 * a * r
        + 2 * b**2
    )
    cleared = sp.expand(
        A * a * gamma
        - (
            a**2 * theta_a
            + A**2 * theta_g
            + A**2 * a**2
            - delta**2
        )
    )
    assert cleared == 0
    w6 = 6 * gamma + 2 * absent
    assert sp.expand(w6 / 2 - (3 * gamma + theta_a - theta_h)) == 0
    return {
        "Theta_H": str(theta_h),
        "Theta_A": str(sp.expand(theta_a)),
        "Theta_G": str(theta_g),
        "Delta": str(delta),
        "cleared_bridge": (
            "A*a*Gamma = a^2*Theta_A + A^2*Theta_G "
            "+ A^2*a^2 - Delta^2"
        ),
        "normalized_bridge": (
            "Gamma/(A*a) = Theta_A/A^2 + Theta_G/a^2 "
            "+ 1 - (mu_A-mu_G)^2"
        ),
        "W6_companion": "W6/2 = 3*Gamma + Theta_A - Theta_H",
    }


def audit_instance(
    forest: nx.Graph, root: int, family: str, parameters: dict
) -> dict:
    deleted = forest.subgraph(set(forest) - {root}).copy()
    residual = forest.subgraph(
        set(forest) - {root} - set(forest[root])
    ).copy()
    f_h, g_h = factorial_sequences(forest)
    f_g, g_g = factorial_sequences(deleted)
    f_r, _ = factorial_sequences(residual)
    gamma_values, w6_values, _ = rooted_quantities(forest, root)

    checks = 0
    identity_failures: list[dict] = []
    gamma_failures: list[dict] = []
    theta_a_failures: list[dict] = []
    equality_examples: list[dict] = []
    for q, gamma in gamma_values.items():
        A = at(f_h, q)
        a = at(f_g, q - 1)
        if A == 0 or a == 0:
            continue
        B = at(f_h, q + 1)
        C = at(f_h, q + 2)
        X = at(g_h, q + 2)
        b = at(f_g, q)
        c = at(f_g, q + 1)
        e = at(g_g, q + 1)
        r = at(f_r, q)
        theta_h = (
            (q - 3) * A * A - A * C - 3 * A * X + B * B
        )
        theta_a = (
            theta_h + 2 * B * b + b * b - 2 * A * c - 3 * A * r
        )
        theta_g = (
            (q - 4) * a * a - a * c - 3 * a * e + b * b
        )
        delta = a * (B + b) - A * b
        left = A * a * gamma
        right = (
            a * a * theta_a
            + A * A * theta_g
            + A * A * a * a
            - delta * delta
        )
        record = {
            "family": family,
            "parameters": parameters,
            "root": root,
            "rank_q": q,
            "Gamma": gamma,
            "W6": w6_values[q],
            "Theta_H": theta_h,
            "Theta_A": theta_a,
            "Theta_G": theta_g,
            "cleared_mean_gap": delta,
        }
        if left != right:
            identity_failures.append({**record, "left": left, "right": right})
        if gamma < 0:
            gamma_failures.append(record)
        if theta_a < 0:
            theta_a_failures.append(record)
        if (
            w6_values[q] == 0
            and gamma > 0
            and theta_h - theta_a == 3 * gamma
            and len(equality_examples) < 10
        ):
            equality_examples.append(record)
        checks += 1
    return {
        "checks": checks,
        "identity_failures": identity_failures,
        "gamma_failures": gamma_failures,
        "theta_a_failures": theta_a_failures,
        "equality_examples": equality_examples,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-tree-order", type=int, default=9)
    parser.add_argument("--atlas-forest-order", type=int, default=7)
    parser.add_argument("--random-forests", type=int, default=100)
    parser.add_argument("--random-maximum-order", type=int, default=100)
    parser.add_argument("--seed", type=int, default=993614)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "rooted_gamma_variance_bridge_identity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic = symbolic_verification()
    checks = rooted_instances = 0
    identity_failures: list[dict] = []
    gamma_failures: list[dict] = []
    theta_a_failures: list[dict] = []
    equality_examples: list[dict] = []

    def consume(result: dict) -> None:
        nonlocal checks, rooted_instances
        checks += result["checks"]
        identity_failures.extend(result["identity_failures"])
        gamma_failures.extend(result["gamma_failures"])
        theta_a_failures.extend(result["theta_a_failures"])
        if len(equality_examples) < 10:
            equality_examples.extend(
                result["equality_examples"][: 10 - len(equality_examples)]
            )
        rooted_instances += 1

    for order in range(2, args.maximum_tree_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                consume(
                    audit_instance(
                        tree,
                        root,
                        "unlabeled_tree",
                        {"order": order, "graph6": code},
                    )
                )

    for forest0 in nx.graph_atlas_g():
        order = len(forest0)
        if (
            order < 2
            or order > args.atlas_forest_order
            or not nx.is_forest(forest0)
            or nx.is_tree(forest0)
        ):
            continue
        forest = nx.convert_node_labels_to_integers(forest0)
        code = nx.to_graph6_bytes(
            forest, header=False
        ).decode("ascii").strip()
        for root in forest:
            consume(
                audit_instance(
                    forest,
                    root,
                    "atlas_disconnected_forest",
                    {"order": order, "graph6": code},
                )
            )

    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(rng, 2, args.random_maximum_order)
        root = rng.choice(list(forest))
        consume(
            audit_instance(
                forest,
                root,
                "random_forest",
                {
                    "sample": sample,
                    "order": len(forest),
                    "components": nx.number_connected_components(forest),
                },
            )
        )

    report = {
        "status": (
            "PASS_ROOTED_GAMMA_VARIANCE_BRIDGE_IDENTITY"
            if not identity_failures
            else "FAIL_ROOTED_GAMMA_VARIANCE_BRIDGE_IDENTITY"
        ),
        "symbolic_identity": symbolic,
        "checked_rooted_instances": rooted_instances,
        "checked_ranks": checks,
        "identity_failure_count": len(identity_failures),
        "identity_failures": identity_failures[:20],
        "finite_evidence_Gamma_negative_count": len(gamma_failures),
        "finite_evidence_Gamma_negative_examples": gamma_failures[:20],
        "finite_evidence_Theta_A_negative_count": len(theta_a_failures),
        "finite_evidence_Theta_A_negative_examples": theta_a_failures[:20],
        "sharp_W6_equality_examples": equality_examples,
        "logical_reduction": (
            "For A,a>0, Gamma>=0 is exactly the mean-gap bound "
            "(mu_A-mu_G)^2 <= 1+Theta_A/A^2+Theta_G/a^2."
        ),
        "warning": (
            "The bridge identity is proved. The displayed mean-gap "
            "inequality and the nonnegativity evidence are not yet proofs."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
