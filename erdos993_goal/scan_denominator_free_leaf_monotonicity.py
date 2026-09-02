#!/usr/bin/env python3
"""Exact audit of the strong denominator-free tree-leaf monotonicity.

Let P_q(F) be the denominator-free component payment and S_q its
down-link mass.  For q>=2, define

    U_q(F) = P_q(F)-2S_q(F)^2.

The candidate is U_q(T)>=U_q(T-l) for every leaf l of a tree T and
q>=2.  If proved, repeated tree-leaf deletion gives
P_q(T)>=2S_q(T)^2 for connected trees.  A separate disjoint-union
closure step is then needed for forests.  The analogous leaf
monotonicity for disconnected forests is false; the script records a
small exact negative control.  Rank q=1 is already covered by the
independently proved sharp rank-three theorem.

The script supplies exact finite evidence and verifies the coefficient
recurrences used in the proposed leaf proof.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_payment_tree_dp import tree_moment_jet
from scan_edge_survival_ratio_dominance import (
    forest_moment_jet,
)
from verify_edge_survival_payment_reduction import galvin_tree


def jet(forest: nx.Graph):
    return (
        tree_moment_jet(forest)
        if nx.is_tree(forest)
        else forest_moment_jet(forest)
    )


def payment_residuals(
    forest: nx.Graph,
) -> tuple[dict[int, int], dict[int, int], dict[int, int]]:
    strong = {}
    one_unit = {}
    masses = {}
    for q, (_, mass, h2, h3, edge0, h_edge) in jet(forest).items():
        if q < 1 or mass == 0:
            continue
        component0 = mass - edge0
        component1 = h2 - h_edge
        payment = (
            (q - 1) * mass * mass
            - mass * h3
            - 3 * mass * component1
            + h2 * h2
            + 4 * h2 * component0
        )
        one_unit[q] = payment - mass * mass
        if q >= 2:
            strong[q] = payment - 2 * mass * mass
        masses[q] = mass
    return strong, one_unit, masses


def independence_and_edge_sequences(forest: nx.Graph) -> tuple[list[int], list[int]]:
    moments = jet(forest)
    maximum = max(moments, default=0)
    independent = [0] * (maximum + 2)
    edge = [0] * (maximum + 2)
    for rank, row in moments.items():
        independent[rank] = row[0]
        edge[rank] = row[4]
    return independent, edge


def verify_leaf_recurrences(forest: nx.Graph, leaf: int) -> int:
    """Verify the exact independence and residual-edge recurrences."""
    if forest.degree(leaf) > 1:
        raise ValueError("chosen vertex is not a leaf or isolate")
    smaller = forest.subgraph(set(forest) - {leaf}).copy()
    if forest.degree(leaf) == 0:
        # Isolate recurrence is checked by the same direct arrays below,
        # but the pendant-specific R minor has no support.
        support = None
        g = smaller.copy()
        r = smaller.copy()
    else:
        support = next(iter(forest[leaf]))
        g = forest.subgraph(set(forest) - {leaf, support}).copy()
        r = smaller.subgraph(
            set(smaller) - {support} - set(smaller[support])
        ).copy()

    def arrays(graph: nx.Graph) -> tuple[list[int], list[int]]:
        if not graph:
            return [1, 0], [0, 0]
        return independence_and_edge_sequences(graph)

    a_f, e_f = arrays(forest)
    a_h, e_h = arrays(smaller)
    a_g, e_g = arrays(g)
    a_r, _ = arrays(r)
    limit = max(len(a_f), len(a_h), len(a_g), len(a_r))

    def at(values: list[int], index: int) -> int:
        return values[index] if 0 <= index < len(values) else 0

    checks = 0
    for q in range(limit):
        if support is None:
            # Adding an isolate: either it is absent or selected.
            assert at(a_f, q) == at(a_h, q) + at(a_h, q - 1)
            # If absent it contributes no edge; if selected it is
            # deleted and leaves the same residual edge count.
            assert at(e_f, q) == at(e_h, q) + at(e_h, q - 1)
        else:
            assert at(a_f, q) == at(a_h, q) + at(a_g, q - 1)
            # If the leaf is absent, its pendant edge survives exactly
            # when the q-set avoids N_H[support].  If selected, the
            # remaining q-1 set lies in G=F-{leaf,support}.
            assert at(e_f, q) == (
                at(e_h, q) + at(a_r, q) + at(e_g, q - 1)
            )
        checks += 1
    return checks


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exhaustive-order", type=int, default=14)
    parser.add_argument("--random-trees", type=int, default=500)
    parser.add_argument("--random-minimum-order", type=int, default=4)
    parser.add_argument("--random-maximum-order", type=int, default=120)
    parser.add_argument("--seed", type=int, default=993733)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "denominator_free_leaf_monotonicity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_forests = checked_deletions = checked_ranks = 0
    recurrence_checks = 0
    failures: list[dict] = []
    recursive_failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None
    recursive_minimum: tuple[Fraction, dict] | None = None

    def audit(
        forest: nx.Graph,
        vertex: int,
        family: str,
        parameters: dict,
        check_recurrence: bool = False,
    ) -> None:
        nonlocal checked_deletions, checked_ranks, recurrence_checks
        nonlocal minimum, recursive_minimum
        if forest.degree(vertex) > 1:
            raise ValueError("audit vertex must have degree at most one")
        full, _, masses = payment_residuals(forest)
        smaller_graph = forest.subgraph(set(forest) - {vertex}).copy()
        smaller, _, _ = (
            payment_residuals(smaller_graph)
            if smaller_graph
            else ({}, {}, {})
        )
        if forest.degree(vertex) == 0:
            lower_graph = smaller_graph
        else:
            support = next(iter(forest[vertex]))
            lower_graph = forest.subgraph(
                set(forest) - {vertex, support}
            ).copy()
        _, lower_one_unit, _ = (
            payment_residuals(lower_graph)
            if lower_graph
            else ({}, {}, {})
        )
        for rank in sorted(set(full) | set(smaller)):
            delta = full.get(rank, 0) - smaller.get(rank, 0)
            lower_reserve = lower_one_unit.get(rank - 1, 0)
            recursive_delta = delta - lower_reserve
            denominator = max(1, masses.get(rank, 1) ** 2)
            normalized = Fraction(delta, denominator)
            normalized_recursive = Fraction(recursive_delta, denominator)
            record = {
                "rank_q": rank,
                "delta": delta,
                "normalized_delta": str(normalized),
                "decimal_normalized_delta": float(normalized),
                "lower_rank_one_unit_reserve": lower_reserve,
                "recursive_delta": recursive_delta,
                "normalized_recursive_delta": str(normalized_recursive),
                "decimal_normalized_recursive_delta": float(
                    normalized_recursive
                ),
            }
            checked_ranks += 1
            if delta < 0:
                failures.append(
                    {
                        "family": family,
                        "parameters": parameters,
                        "deleted_vertex_degree": forest.degree(vertex),
                        **record,
                    }
                )
            if recursive_delta < 0:
                recursive_failures.append(
                    {
                        "family": family,
                        "parameters": parameters,
                        "deleted_vertex_degree": forest.degree(vertex),
                        **record,
                    }
                )
            if minimum is None or normalized < minimum[0]:
                minimum = (
                    normalized,
                    {
                        "family": family,
                        "parameters": parameters,
                        "deleted_vertex_degree": forest.degree(vertex),
                        **record,
                    },
                )
            if (
                recursive_minimum is None
                or normalized_recursive < recursive_minimum[0]
            ):
                recursive_minimum = (
                    normalized_recursive,
                    {
                        "family": family,
                        "parameters": parameters,
                        "deleted_vertex_degree": forest.degree(vertex),
                        **record,
                    },
                )
        checked_deletions += 1
        if check_recurrence:
            recurrence_checks += verify_leaf_recurrences(forest, vertex)

    for order in range(2, args.exhaustive_order + 1):
        order_trees = order_deletions = 0
        for tree0 in nx.nonisomorphic_trees(order):
            order_trees += 1
            tree = nx.convert_node_labels_to_integers(
                tree0, ordering="sorted"
            )
            checked_forests += 1
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for leaf in [v for v in tree if tree.degree(v) == 1]:
                audit(
                    tree,
                    leaf,
                    "unlabeled_tree",
                    {"order": order, "graph6": code, "leaf": leaf},
                    check_recurrence=(order <= 10),
                )
                order_deletions += 1
        print(
            f"order={order} trees={order_trees} "
            f"leaf_deletions={order_deletions} "
            f"rank_checks={checked_ranks} failures={len(failures)}",
            flush=True,
        )

    rng = random.Random(args.seed)
    for sample in range(args.random_trees):
        order = rng.randint(
            args.random_minimum_order, args.random_maximum_order
        )
        forest = nx.from_prufer_sequence(
            [rng.randrange(order) for _ in range(order - 2)]
        )
        checked_forests += 1
        candidates = [v for v in forest if forest.degree(v) == 1]
        vertex = rng.choice(candidates)
        audit(
            forest,
            vertex,
            "random_tree",
            {
                "sample": sample,
                "order": len(forest),
            },
            check_recurrence=(sample < 30),
        )

    # Tree-leaf monotonicity does not extend to disconnected forests.
    # H=2K2+K1 and F=3K2 differ by attaching a leaf to the isolate.
    disconnected_h = nx.Graph()
    disconnected_h.add_nodes_from(range(5))
    disconnected_h.add_edges_from([(0, 1), (2, 3)])
    disconnected_f = disconnected_h.copy()
    disconnected_f.add_edge(4, 5)
    strong_h, _, _ = payment_residuals(disconnected_h)
    strong_f, _, _ = payment_residuals(disconnected_f)
    disconnected_gap = strong_f.get(2, 0) - strong_h.get(2, 0)
    if disconnected_gap != -32:
        raise AssertionError(
            ("disconnected leaf negative control", disconnected_gap)
        )

    hard_records = []
    for branches, arms in [(14, 8), (21, 11), (15, 7), (40, 20)]:
        tree = galvin_tree(branches, arms)
        checked_forests += 1
        leaf = 1 + branches + branches * arms
        before_failures = len(failures)
        before_recursive_failures = len(recursive_failures)
        before_ranks = checked_ranks
        audit(
            tree,
            leaf,
            "galvin_tree",
            {
                "branches": branches,
                "arms": arms,
                "order": len(tree),
            },
        )
        hard_records.append(
            {
                "branches": branches,
                "arms": arms,
                "order": len(tree),
                "rank_checks": checked_ranks - before_ranks,
                "failures": len(failures) - before_failures,
                "recursive_failures": (
                    len(recursive_failures) - before_recursive_failures
                ),
            }
        )

    report = {
        "status": (
            "PASS_RECURSIVE_STRONG_LEAF_CANDIDATE"
            if not failures and not recursive_failures
            else "FAIL_RECURSIVE_STRONG_LEAF_CANDIDATE"
        ),
        "candidate": (
            "U_q=P_q-2*S_q^2 is nondecreasing under "
            "tree-leaf addition, for q>=2"
        ),
        "logical_consequence_if_proved": (
            "Repeated leaf deletion gives P_q(T)>=2*S_q(T)^2 "
            "for every connected tree. A separate disjoint-union "
            "closure is required for arbitrary forests."
        ),
        "disconnected_negative_control": {
            "smaller_forest": "2K2 disjoint_union K1",
            "larger_forest": "3K2",
            "rank_q": 2,
            "leaf_increment": disconnected_gap,
        },
        "checked_forests": checked_forests,
        "checked_deletions": checked_deletions,
        "checked_ranks": checked_ranks,
        "coefficient_recurrence_checks": recurrence_checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "recursive_candidate": (
            "For trees, U_q(F)-U_q(F-l) >= "
            "P_(q-1)(G)-S_(q-1)(G)^2"
        ),
        "recursive_failure_count": len(recursive_failures),
        "recursive_failures": recursive_failures[:20],
        "minimum_normalized_delta": (
            minimum[1] if minimum is not None else None
        ),
        "minimum_normalized_recursive_delta": (
            recursive_minimum[1]
            if recursive_minimum is not None
            else None
        ),
        "hard_family_records": hard_records,
        "warning": (
            "This is an exact finite audit and recurrence check, not an "
            "arbitrary-order proof of tree-leaf monotonicity or the "
            "needed disjoint-union closure."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
