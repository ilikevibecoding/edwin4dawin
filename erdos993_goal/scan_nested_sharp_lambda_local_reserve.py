#!/usr/bin/env python3
"""Audit a local-Lambda reserve in nested sharp-Lambda pruning.

Use the rooted representation in which Ehat_q(H,v) is q!^2 times the
sharp-Lambda remainder obtained by attaching a designated new leaf at
root v.  Let w != v have degree at most one in H.

If w is isolated, put Q=H-w.  If w is a leaf with support u != v, put
Q=H-{w,u}.  When u=v the lower E term is absent and put Q=H-w only for
the reserve graph below.  In every case put J=Q-v.

After the lower-rank sharp remainder is subtracted, define

    Nhat_q =
      Ehat_q(H,v) - Ehat_q(H-w,v)
      - q^2 Ehat_(q-1)(Q,v),

with the final term omitted when u=v.  The candidate local reserve is
the uniform bound

    Nhat_q >= q^2 Lambdahat_(q-1)(J),

where Lambdahat is scaled by (q-1)!^2.  An earlier geometry-dependent
coefficient two for sibling and distance-two cases is false: the
sibling bound already fails on P_13 at q=3.

For disconnected forests, arbitrary external leaves are not valid:
the deterministic adaptive rule from the Gamma/W6 audit is required.
This script checks every nonroot leaf in connected trees, every
adaptive tie in the disconnected atlas census, and targeted random
adaptive choices.  The computations are exact finite evidence, not a
proof.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx

from scan_edge_survival_ratio_dominance import random_forest
from scan_rooted_cross_W6_lambda_pruning import (
    adaptive_vertices,
    pruning_lower,
    rooted_quantities,
)
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


ROOTED_CACHE: dict[
    tuple[tuple[int, ...], tuple[tuple[int, int], ...], int],
    tuple[dict[int, int], dict[int, int], dict[int, int]],
] = {}
LAMBDA_CACHE: dict[
    tuple[tuple[int, ...], tuple[tuple[int, int], ...], int], int
] = {}


def graph_signature(
    forest: nx.Graph,
) -> tuple[tuple[int, ...], tuple[tuple[int, int], ...]]:
    return (
        tuple(sorted(forest)),
        tuple(
            sorted(
                (min(left, right), max(left, right))
                for left, right in forest.edges()
            )
        ),
    )


def cached_rooted_quantities(
    forest: nx.Graph, root: int
) -> tuple[dict[int, int], dict[int, int], dict[int, int]]:
    nodes, edges = graph_signature(forest)
    key = (nodes, edges, root)
    if key not in ROOTED_CACHE:
        ROOTED_CACHE[key] = rooted_quantities(forest, root)
    return ROOTED_CACHE[key]


def lower_lambda(forest: nx.Graph, rank_q: int) -> int:
    """Return (q-1)!^2 Lambda_(q-1)(forest)."""
    nodes, edges = graph_signature(forest)
    key = (nodes, edges, rank_q)
    if key in LAMBDA_CACHE:
        return LAMBDA_CACHE[key]
    f, g = factorial_sequences(forest)
    a = at(f, rank_q - 1)
    b = at(f, rank_q)
    c = at(f, rank_q + 1)
    e = at(g, rank_q + 1)
    value = (
        (rank_q - 3) * a * a - a * c - 3 * a * e + b * b
    )
    LAMBDA_CACHE[key] = value
    return value


def geometry(
    forest: nx.Graph, root: int, removed: int
) -> tuple[str, int]:
    if forest.degree(removed) == 0:
        return "isolate", 1
    support = next(iter(forest[removed]))
    if support == root:
        return "sibling", 1
    if forest.has_edge(support, root):
        return "distance_two", 1
    return "separated", 1


def audit_pair(
    forest: nx.Graph,
    root: int,
    removed: int,
    family: str,
    parameters: dict,
    adaptive_rule: str,
) -> dict:
    smaller_graph = forest.subgraph(
        set(forest) - {removed}
    ).copy()
    lower_graph = pruning_lower(forest, root, removed)
    _, _, sharp_large = cached_rooted_quantities(forest, root)
    _, _, sharp_smaller = cached_rooted_quantities(
        smaller_graph, root
    )
    sharp_lower = (
        cached_rooted_quantities(lower_graph, root)[2]
        if lower_graph is not None
        else {}
    )

    case, coefficient = geometry(forest, root, removed)
    # In the sibling case the lower sharp remainder is absent, but the
    # reserve graph is still H-{w,v}.
    reserve_parent = (
        lower_graph if lower_graph is not None else smaller_graph
    )
    reserve_graph = reserve_parent.subgraph(
        set(reserve_parent) - {root}
    ).copy()

    checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    ranks = set(sharp_large) | set(sharp_smaller) | {
        rank + 1 for rank in sharp_lower
    }
    for q in ranks:
        if q < 3:
            continue
        scaled_lower_sharp = (
            q * q * sharp_lower.get(q - 1, 0)
            if lower_graph is not None
            else 0
        )
        nested = (
            sharp_large.get(q, 0)
            - sharp_smaller.get(q, 0)
            - scaled_lower_sharp
        )
        lam = lower_lambda(reserve_graph, q)
        reserve = coefficient * q * q * lam
        value = nested - reserve
        record = {
            "family": family,
            "parameters": parameters,
            "adaptive_rule": adaptive_rule,
            "geometry": case,
            "reserve_coefficient": coefficient,
            "root": root,
            "removed": removed,
            "rank_q": q,
            "nested_strong_remainder": nested,
            "scaled_lower_sharp_remainder": scaled_lower_sharp,
            "scaled_lower_Lambda": lam,
            "local_reserve": reserve,
            "reserve_margin": value,
        }
        if value < 0:
            failures.append(record)
        if minimum is None or value < minimum[0]:
            minimum = (value, record)
        checks += 1
    return {
        "checks": checks,
        "failures": failures,
        "minimum": minimum[1] if minimum is not None else None,
        "geometry": case,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-tree-order", type=int, default=10)
    parser.add_argument("--atlas-forest-order", type=int, default=7)
    parser.add_argument("--random-forests", type=int, default=100)
    parser.add_argument("--random-maximum-order", type=int, default=100)
    parser.add_argument("--seed", type=int, default=993784)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "nested_sharp_lambda_local_reserve_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    pairs = checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    case_counts: dict[str, int] = {}
    rule_counts: dict[str, int] = {}

    def consume(result: dict) -> None:
        nonlocal pairs, checks, minimum
        pairs += 1
        checks += result["checks"]
        failures.extend(result["failures"])
        case = result["geometry"]
        case_counts[case] = case_counts.get(case, 0) + 1
        candidate = result["minimum"]
        if candidate is not None:
            rule = candidate["adaptive_rule"]
            rule_counts[rule] = rule_counts.get(rule, 0) + 1
            if (
                minimum is None
                or candidate["reserve_margin"] < minimum[0]
            ):
                minimum = (candidate["reserve_margin"], candidate)

    # Connected trees: every rooted nonroot leaf is audited.
    for order in range(2, args.maximum_tree_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                for removed in [
                    vertex
                    for vertex in tree
                    if vertex != root and tree.degree(vertex) == 1
                ]:
                    consume(
                        audit_pair(
                            tree,
                            root,
                            removed,
                            "unlabeled_tree",
                            {"order": order, "graph6": code},
                            "connected_any_nonroot_leaf",
                        )
                    )

    # The path P_13 is the minimal-order rank-three counterexample to
    # the discarded sibling coefficient two.  It is retained here as
    # a deterministic test of the corrected uniform coefficient one.
    path_thirteen = nx.path_graph(13)
    consume(
        audit_pair(
            path_thirteen,
            1,
            0,
            "discarded_coefficient_two_path_counterexample",
            {
                "order": 13,
                "graph6": nx.to_graph6_bytes(
                    path_thirteen, header=False
                )
                .decode("ascii")
                .strip(),
            },
            "connected_any_nonroot_leaf",
        )
    )

    # Disconnected exact census: every adaptive tie is audited.
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
            eligible, rule = adaptive_vertices(forest, root)
            for removed in eligible:
                consume(
                    audit_pair(
                        forest,
                        root,
                        removed,
                        "atlas_disconnected_forest",
                        {"order": order, "graph6": code},
                        rule,
                    )
                )

    # Large random forests: one adaptive choice per sample.
    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(rng, 2, args.random_maximum_order)
        root = rng.choice(list(forest))
        eligible, rule = adaptive_vertices(forest, root)
        if not eligible:
            continue
        removed = rng.choice(eligible)
        consume(
            audit_pair(
                forest,
                root,
                removed,
                "random_forest",
                {
                    "sample": sample,
                    "order": len(forest),
                    "components": nx.number_connected_components(forest),
                },
                rule,
            )
        )

    report = {
        "status": (
            "PASS_NESTED_SHARP_LAMBDA_LOCAL_RESERVE_CANDIDATE"
            if not failures
            else "FAIL_NESTED_SHARP_LAMBDA_LOCAL_RESERVE_CANDIDATE"
        ),
        "claim": (
            "After the lower sharp remainder is subtracted, the "
            "nested pruning margin pays Lambda_(q-1)(Q-v), "
            "uniformly in all four local geometries."
        ),
        "maximum_unlabeled_tree_order": args.maximum_tree_order,
        "atlas_disconnected_forest_order": args.atlas_forest_order,
        "random_forest_samples": args.random_forests,
        "random_maximum_order": args.random_maximum_order,
        "checked_pruning_pairs": pairs,
        "checked_ranks": checks,
        "geometry_counts": case_counts,
        "minimum_records_by_rule_count": rule_counts,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_margin": minimum[1] if minimum is not None else None,
        "logical_consequence_if_proved": (
            "A simultaneous induction on order and rank proves the "
            "nested sharp-Lambda pruning inequality and the sharp "
            "Lambda floor for every forest."
        ),
        "scope_warning": (
            "For disconnected forests, arbitrary external leaves are "
            "false; only the stated adaptive pruning rule is claimed."
        ),
        "warning": (
            "This is exact finite evidence. The local-reserve "
            "inequality remains a proof obligation."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
