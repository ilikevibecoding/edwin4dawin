#!/usr/bin/env python3
"""Replay the connected alpha-drop family and bounded-collar obstructions.

Scope only: this proves that alpha-preserving leaf selection and every fixed
local-cutoff collar fail for the displayed connected, isolate-free family.
It does not decide FML positivity.
"""

from __future__ import annotations

import json

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import graph6, poly_forest


def L(alpha: int) -> int:
    return (2 * alpha + 1) // 3


def alpha(graph: nx.Graph) -> int:
    return len(poly_forest(graph)) - 1


def pruned_core_is_path(tree: nx.Graph) -> bool:
    """A broad superset of path/star/standard double-broom terminals."""
    core = tree.subgraph([v for v in tree if tree.degree(v) >= 2])
    if len(core) <= 1:
        return True
    return nx.is_connected(core) and max(dict(core.degree()).values()) <= 2


def bundled_spider_sizes(
    bundle_sizes: tuple[int, int, int]
) -> tuple[nx.Graph, dict[int, list[int]]]:
    tree = nx.Graph()
    tree.add_node(0)
    next_vertex = 4
    bundles: dict[int, list[int]] = {}
    for support, bundle_size in zip((1, 2, 3), bundle_sizes):
        tree.add_edge(0, support)
        leaves = []
        for _ in range(bundle_size):
            tree.add_edge(support, next_vertex)
            leaves.append(next_vertex)
            next_vertex += 1
        bundles[support] = leaves
    return tree, bundles


def bundled_spider(bundle_size: int) -> tuple[nx.Graph, dict[int, list[int]]]:
    return bundled_spider_sizes((bundle_size, bundle_size, bundle_size))


def exhaustive_minimum_selection_obstruction() -> dict[str, object]:
    rows = []
    counts = {}
    for order in range(2, 8):
        count = 0
        for tree in nx.nonisomorphic_trees(order):
            leaves = [v for v in tree if tree.degree(v) == 1]
            all_essential = all(
                alpha(nx.restricted_view(tree, [leaf], [])) == alpha(tree) - 1
                for leaf in leaves
            )
            if all_essential and not pruned_core_is_path(tree):
                count += 1
                rows.append(
                    {
                        "order": order,
                        "graph6": graph6(tree),
                        "alpha": alpha(tree),
                        "degree_sequence": sorted(dict(tree.degree()).values()),
                        "leaves": len(leaves),
                    }
                )
        counts[str(order)] = count
    assert all(counts[str(order)] == 0 for order in range(2, 7))
    assert counts["7"] == 1
    assert rows[0]["degree_sequence"] == [1, 1, 1, 2, 2, 2, 3]
    return {
        "terminal_superset_excluded": (
            "the induced subgraph on vertices of degree at least two is a path; "
            "this contains paths, stars, and standard brooms/double brooms"
        ),
        "counts_by_order": counts,
        "unique_minimum": rows[0],
        "identification": "three-arm spider with all arm lengths two",
    }


def assert_marked_state(
    tree: nx.Graph, marks: tuple[int, int], expected_w: int
) -> list[int]:
    assert nx.is_tree(tree)
    assert not pruned_core_is_path(tree)
    w_graph = tree.copy()
    w_graph.remove_nodes_from(marks)
    assert nx.is_tree(w_graph)
    assert alpha(w_graph) == expected_w
    eligible = [
        leaf
        for leaf in tree
        if tree.degree(leaf) == 1 and leaf not in marks
    ]
    assert eligible
    for leaf in eligible:
        support = next(iter(tree.neighbors(leaf)))
        assert support not in marks  # every available step is ordinary FML
        child_w = w_graph.copy()
        child_w.remove_node(leaf)
        assert nx.is_tree(child_w)
        assert alpha(child_w) == expected_w - 1
    return eligible


def collar_witness(bundle_size: int, deletions: int, collar: int) -> dict[str, object]:
    tree, bundles = bundled_spider(bundle_size)
    marks = (bundles[1][0], bundles[2][0])
    w0 = 3 * bundle_size - 1
    ambient_alpha = w0 + 2
    rank = L(ambient_alpha) - 1
    assert rank == 2 * bundle_size
    assert deletions < bundle_size - 1
    initial_n = four_minor_vector(tree, *marks)[rank]

    rows = []
    current = tree
    for step, leaf in enumerate(bundles[1][1 : 1 + deletions], 1):
        expected_parent_w = w0 - step + 1
        eligible = assert_marked_state(current, marks, expected_parent_w)
        assert leaf in eligible
        support = next(iter(current.neighbors(leaf)))
        parent_vector = four_minor_vector(current, *marks)
        child = current.copy()
        child.remove_node(leaf)
        lower = current.copy()
        lower.remove_nodes_from([leaf, support])
        child_vector = four_minor_vector(child, *marks)
        lower_vector = four_minor_vector(lower, *marks)
        lower_value = lower_vector[rank - 1] if rank - 1 < len(lower_vector) else 0
        gap = parent_vector[rank] - child_vector[rank] - lower_value
        rows.append(
            {
                "step": step,
                "deleted_leaf": leaf,
                "parent_alpha_W": expected_parent_w,
                "child_alpha_W": expected_parent_w - 1,
                "N_parent": parent_vector[rank],
                "N_same_rank_child": child_vector[rank],
                "N_lower_rank_child": lower_value,
                "FML_gap": gap,
            }
        )
        current = child

    final_w = w0 - deletions
    assert_marked_state(current, marks, final_w)
    final_n = four_minor_vector(current, *marks)[rank]
    assert rank < L(ambient_alpha)
    assert not (rank < L(final_w + 2) + collar)
    return {
        "bundle_size": bundle_size,
        "tree_order": len(tree),
        "outer_tree_order_after_adding_two_pending_leaves": len(tree) + 2,
        "marks": marks,
        "initial_alpha_W": w0,
        "ambient_alpha": ambient_alpha,
        "target_rank": rank,
        "local_collar_size": collar,
        "forced_deletions": deletions,
        "final_alpha_W": final_w,
        "final_local_L": L(final_w + 2),
        "initial_N": initial_n,
        "final_same_rank_N": final_n,
        "recurrence_rows": rows,
        "outside_final_local_collar": True,
    }


def arbitrary_collar_arithmetic() -> dict[str, object]:
    rows = []
    for collar in range(0, 21):
        # A simple all-c construction, not the smallest M: after d=M-2
        # deletions every effective bundle is still nonempty.
        bundle_size = 3 * collar + 4
        deletions = bundle_size - 2
        w0 = 3 * bundle_size - 1
        ambient = w0 + 2
        rank = L(ambient) - 1
        wd = w0 - deletions
        assert deletions < bundle_size - 1
        assert rank >= L(wd + 2) + collar
        rows.append(
            {
                "collar": collar,
                "bundle_size": bundle_size,
                "deletions": deletions,
                "ambient_alpha": ambient,
                "target_rank": rank,
                "descendant_alpha_W": wd,
                "descendant_L": L(wd + 2),
                "deficit": rank - L(wd + 2),
            }
        )
    return {
        "construction": "M=3c+4, d=M-2",
        "verified_collars": rows,
        "symbolic_values": (
            "ambient alpha=9c+13, target r=6c+8, descendant "
            "alpha(W)+2=6c+11, descendant L=4c+7, so r-L=2c+1>=c"
        ),
    }


def rank_five_immediate_cutoff_leak() -> dict[str, object]:
    """Small explicit leak after bypassing the entire rank-four layer."""
    tree, bundles = bundled_spider_sizes((3, 3, 2))
    marks = (bundles[1][0], bundles[2][0])
    eligible = assert_marked_state(tree, marks, 7)
    leaf = bundles[3][0]
    assert leaf in eligible
    support = 3

    # Reconstruct the outer forest whose two first reduction leaves are
    # pending at the marks.  This verifies the ambient alpha rather than
    # inferring it from the four-minor support bound.
    outer = tree.copy()
    next_vertex = max(outer) + 1
    outer.add_edges_from(((marks[0], next_vertex), (marks[1], next_vertex + 1)))
    ambient_alpha = alpha(outer)
    assert ambient_alpha == 9 and L(ambient_alpha) == 6
    rank = 5

    child = tree.copy()
    child.remove_node(leaf)
    child_w = child.copy()
    child_w.remove_nodes_from(marks)
    assert alpha(child_w) == 6
    assert L(alpha(child_w) + 2) == 5

    lower = tree.copy()
    lower.remove_nodes_from((leaf, support))
    parent_vector = four_minor_vector(tree, *marks)
    child_vector = four_minor_vector(child, *marks)
    lower_vector = four_minor_vector(lower, *marks)
    parent_value = parent_vector[rank]
    child_value = child_vector[rank]
    lower_value = lower_vector[rank - 1]
    gap = parent_value - child_value - lower_value
    assert child_value != 0
    return {
        "bundle_sizes_before_mark_deletion": [3, 3, 2],
        "effective_W_bundle_sizes": [2, 2, 2],
        "B_order": len(tree),
        "outer_order": len(outer),
        "marks": marks,
        "initial_alpha_W": 7,
        "ambient_alpha": ambient_alpha,
        "target_rank": rank,
        "strict_ambient_prefix": rank < L(ambient_alpha),
        "child_alpha_W": 6,
        "child_local_L": L(alpha(child_w) + 2),
        "outside_child_strict_local_cutoff": not (
            rank < L(alpha(child_w) + 2)
        ),
        "N_parent": parent_value,
        "N_same_rank_child": child_value,
        "N_lower_rank_child": lower_value,
        "FML_gap": gap,
        "identity": f"{parent_value}={child_value}+{lower_value}+{gap}",
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_CONNECTED_ALPHA_SELECTION_AND_COLLAR_OBSTRUCTION",
        "status": "scope obstruction only; no FML sign theorem claimed",
        "minimum_unmarked_selection_obstruction": exhaustive_minimum_selection_obstruction(),
        "rank_five_immediate_cutoff_leak": rank_five_immediate_cutoff_leak(),
        "one_rank_collar_witness": collar_witness(4, 2, 1),
        "two_rank_collar_witness": collar_witness(6, 4, 2),
        "arbitrary_fixed_collar": arbitrary_collar_arithmetic(),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print("PASS_EXACT_CONNECTED_ALPHA_SELECTION_AND_COLLAR_OBSTRUCTION")


if __name__ == "__main__":
    main()
