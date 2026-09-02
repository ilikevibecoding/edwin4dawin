#!/usr/bin/env python3
"""Exact audit of the edge-survival ratio candidate.

For a forest F, put

    E_q = sum_{K in I_q(F)} e(F-N[K]),
    S_q = (q+1) i_{q+1}(F).

The candidate E_{q+1}/S_{q+1} <= E_q/S_q is equivalent to z<=x
in the edge-survival reduction of the denominator-free payment.
It also says that the average token-slide degree per token decreases
with the number of tokens.

This script supplies evidence and negative controls; it does not claim
an arbitrary-order proof.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_payment_tree_dp import (
    Jet,
    jet_multiply,
    tree_moment_jet,
)
from verify_edge_survival_payment_reduction import galvin_tree


def forest_moment_jet(forest: nx.Graph) -> Jet:
    """Combine the exact tree jets of the components of a forest."""
    if not nx.is_forest(forest):
        raise ValueError("input must be a forest")
    result: Jet = {0: (1, 0, 0, 0, 0, 0)}
    for vertices in nx.connected_components(forest):
        component = forest.subgraph(vertices).copy()
        if len(component) == 1:
            # The one-vertex tree is supported by the same DP.
            component = nx.convert_node_labels_to_integers(component)
        result = jet_multiply(result, tree_moment_jet(component))
    return result


def audit_jet(jet: Jet) -> tuple[int, list[dict], dict | None]:
    """Return comparisons, failures, and the minimum exact slack."""
    comparisons = 0
    failures: list[dict] = []
    minimum: tuple[Fraction, int, int, int] | None = None
    for q in sorted(jet):
        if q + 1 not in jet:
            continue
        s_q = jet[q][1]
        s_next = jet[q + 1][1]
        e_q = jet[q][4]
        e_next = jet[q + 1][4]
        if not s_q or not s_next:
            continue
        # t_q-t_{q+1}; the harmless common factor 2 is retained.
        numerator = 2 * (e_q * s_next - e_next * s_q)
        denominator = s_q * s_next
        slack = Fraction(numerator, denominator)
        comparisons += 1
        record = {
            "rank_q": q,
            "cross_product": numerator // 2,
            "exact_t_drop": str(slack),
            "decimal_t_drop": float(slack),
        }
        if numerator < 0:
            failures.append(record)
        if minimum is None or slack < minimum[0]:
            minimum = (slack, q, numerator, denominator)
    minimum_record = None
    if minimum is not None:
        minimum_record = {
            "rank_q": minimum[1],
            "cross_product_twice": minimum[2],
            "denominator": minimum[3],
            "exact_t_drop": str(minimum[0]),
            "decimal_t_drop": float(minimum[0]),
        }
    return comparisons, failures, minimum_record


def stronger_covariance_failures(jet: Jet) -> list[dict]:
    """Audit the tempting but false Cov(h, token-degree)<=0 lemma.

    For k=q+1, its exact gap is

      (k+1)i_{k+1} E_{k-1} - i_k(k E_k + W_{k-1}),

    where 2W_{k-1}=HE_{k-1}-kE_k-2E_{k-1}.
    """
    failures = []
    for q in sorted(jet):
        k = q + 1
        if q not in jet or k not in jet or k + 1 not in jet:
            continue
        i_k = jet[k][0]
        i_next = jet[k + 1][0]
        e_prev = jet[q][4]
        e_k = jet[k][4]
        he_prev = jet[q][5]
        wedge_twice = he_prev - k * e_k - 2 * e_prev
        if wedge_twice < 0 or wedge_twice % 2:
            raise AssertionError(("invalid wedge recovery", q, wedge_twice))
        wedges = wedge_twice // 2
        gap = (k + 1) * i_next * e_prev - i_k * (
            k * e_k + wedges
        )
        if gap < 0:
            failures.append(
                {
                    "independent_set_size_k": k,
                    "covariance_gap": gap,
                    "residual_wedge_sum": wedges,
                }
            )
    return failures


def random_forest(
    rng: random.Random, minimum_order: int, maximum_order: int
) -> nx.Graph:
    order = rng.randint(minimum_order, maximum_order)
    component_count = rng.randint(1, min(8, order))
    cuts = sorted(rng.sample(range(1, order), component_count - 1))
    sizes = []
    previous = 0
    for cut in cuts + [order]:
        sizes.append(cut - previous)
        previous = cut
    components = []
    for size in sizes:
        if size == 1:
            components.append(nx.empty_graph(1))
        elif size == 2:
            components.append(nx.path_graph(2))
        else:
            components.append(
                nx.from_prufer_sequence(
                    [rng.randrange(size) for _ in range(size - 2)]
                )
            )
    return nx.disjoint_union_all(components)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exhaustive-order", type=int, default=15)
    parser.add_argument("--random-forests", type=int, default=400)
    parser.add_argument("--random-minimum-order", type=int, default=12)
    parser.add_argument("--random-maximum-order", type=int, default=80)
    parser.add_argument("--seed", type=int, default=993729)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "edge_survival_ratio_dominance_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_trees = checked_forests = comparisons = 0
    failures: list[dict] = []
    global_minimum: dict | None = None

    def audit(graph: nx.Graph, family: str, parameters: dict) -> Jet:
        nonlocal checked_trees, checked_forests, comparisons, global_minimum
        jet = (
            tree_moment_jet(graph)
            if nx.is_tree(graph)
            else forest_moment_jet(graph)
        )
        count, local_failures, minimum = audit_jet(jet)
        comparisons += count
        if nx.is_tree(graph):
            checked_trees += 1
        else:
            checked_forests += 1
        for failure in local_failures:
            failures.append(
                {
                    "family": family,
                    "parameters": parameters,
                    **failure,
                }
            )
        if minimum is not None and (
            global_minimum is None
            or Fraction(minimum["exact_t_drop"])
            < Fraction(global_minimum["exact_t_drop"])
        ):
            global_minimum = {
                "family": family,
                "parameters": parameters,
                **minimum,
            }
        return jet

    for order in range(2, args.exhaustive_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            audit(tree, "unlabeled_tree", {"order": order})

    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(
            rng,
            args.random_minimum_order,
            args.random_maximum_order,
        )
        audit(
            forest,
            "random_forest",
            {
                "sample": sample,
                "order": len(forest),
                "components": nx.number_connected_components(forest),
            },
        )

    hard_families = [(14, 8), (21, 11), (15, 7), (40, 20)]
    hard_records = []
    for branches, arms in hard_families:
        tree = galvin_tree(branches, arms)
        jet = audit(
            tree,
            "galvin_tree",
            {
                "branches": branches,
                "arms": arms,
                "order": len(tree),
            },
        )
        covariance_failures = stronger_covariance_failures(jet)
        hard_records.append(
            {
                "branches": branches,
                "arms": arms,
                "order": len(tree),
                "stronger_covariance_failure_count": len(
                    covariance_failures
                ),
                "first_stronger_covariance_failures": (
                    covariance_failures[:5]
                ),
            }
        )

    report = {
        "status": (
            "PASS_CANDIDATE_NO_COUNTEREXAMPLE"
            if not failures
            else "FAIL_CANDIDATE_COUNTEREXAMPLE_FOUND"
        ),
        "candidate": (
            "E_(q+1)/((q+2)i_(q+2)) "
            "<= E_q/((q+1)i_(q+1))"
        ),
        "equivalent_ratio_form": "z<=x",
        "equivalent_token_form": (
            "average token-slide degree per token is nonincreasing "
            "with independent-set size"
        ),
        "checked_unlabeled_trees": checked_trees,
        "checked_random_disconnected_forests": checked_forests,
        "exact_rank_comparisons": comparisons,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_exact_t_drop": global_minimum,
        "hard_family_controls": hard_records,
        "warning": (
            "This is a finite exact audit, not an arbitrary-order proof. "
            "The stronger covariance shortcut is explicitly false on "
            "some Galvin trees."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
