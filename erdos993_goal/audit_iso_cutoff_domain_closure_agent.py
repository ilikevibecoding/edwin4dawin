#!/usr/bin/env python3
"""Exact scope audit for the Q -> D -> N/FML cutoff bookkeeping.

This is not a positivity proof.  It gives replayable integer witnesses showing
that a Four-Minor Leaf Lemma restricted by r < L(alpha(B)) is too narrow, and
that even the direct-use cutoff r < L(alpha(B-{u,v})+2) is not hereditary
under the same-rank branch of FML.
"""

from __future__ import annotations

import json

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import iso, poly_forest


def L(alpha: int) -> int:
    return (2 * alpha + 1) // 3


def independence_number(graph: nx.Graph) -> int:
    return len(poly_forest(graph)) - 1


def leaf_remainder(graph: nx.Graph, leaf: int, support: int, rank: int) -> int:
    deleted = graph.copy()
    deleted.remove_node(leaf)
    link = graph.copy()
    link.remove_nodes_from([leaf, support])
    return (
        iso(poly_forest(graph), rank)
        - iso(poly_forest(deleted), rank)
        - iso(poly_forest(link), rank - 1)
    )


def cutoff_arithmetic() -> dict[str, object]:
    missing_same_rank_residues: dict[int, list[int]] = {0: [], 1: [], 2: []}
    for alpha in range(3, 301):
        # The lower-rank child Q_{r-1} at alpha-1 is always in its prefix.
        for rank in range(2, L(alpha)):
            assert rank - 1 < L(alpha - 1)

        if L(alpha) > L(alpha - 1):
            missing = L(alpha - 1)
            assert missing < L(alpha)
            assert not (missing < L(alpha - 1))
            missing_same_rank_residues[alpha % 3].append(alpha)

    assert missing_same_rank_residues[0]
    assert missing_same_rank_residues[1]
    assert not missing_same_rank_residues[2]
    return {
        "formula": "L(a)=floor((2a+1)/3)",
        "same_rank_alpha_drop": (
            "If alpha drops from a to a-1, the only newly exposed rank is "
            "r=L(a-1), and it occurs exactly for a mod 3 in {0,1}."
        ),
        "lower_rank_child": "r<L(a) always implies r-1<L(a-1)",
        "observed_parent_residues_with_missing_rank": [0, 1],
    }


def connected_spider_witness() -> dict[str, object]:
    # Three arms of length two: 0-i-(i+3), i=1,2,3.
    forest = nx.Graph()
    forest.add_edges_from([(0, 1), (1, 4), (0, 2), (2, 5), (0, 3), (3, 6)])
    polynomial = poly_forest(forest)
    assert polynomial == [1, 7, 15, 11, 1]
    assert independence_number(forest) == 4

    # Every leaf is in the unique maximum independent set, so every leaf
    # deletion drops alpha.  There is no alpha-preserving leaf choice.
    leaf_children = {}
    for leaf in (4, 5, 6):
        child = forest.copy()
        child.remove_node(leaf)
        leaf_children[str(leaf)] = {
            "polynomial": poly_forest(child),
            "alpha": independence_number(child),
            "Q2": iso(poly_forest(child), 2),
        }
        assert independence_number(child) == 3

    rank = 2
    first_leaf, first_support = 5, 2
    second_leaf, second_support = 4, 1
    first_deleted = forest.copy()
    first_deleted.remove_node(first_leaf)
    first_link = forest.copy()
    first_link.remove_nodes_from([first_leaf, first_support])
    d_parent = leaf_remainder(forest, first_leaf, first_support, rank)
    assert (
        iso(polynomial, rank),
        iso(poly_forest(first_deleted), rank),
        iso(poly_forest(first_link), rank - 1),
        d_parent,
    ) == (268, 146, 14, 108)

    core = forest.copy()
    core.remove_nodes_from([first_leaf, second_leaf])
    marks = (second_support, first_support)
    four_minor = core.copy()
    four_minor.remove_nodes_from(marks)
    n_vector = four_minor_vector(core, *marks)
    assert independence_number(core) == 3
    assert independence_number(four_minor) == 2
    assert n_vector[rank] == 37

    same_child = forest.copy()
    same_child.remove_node(second_leaf)
    lower_child = forest.copy()
    lower_child.remove_nodes_from([second_leaf, second_support])
    d_same = leaf_remainder(same_child, first_leaf, first_support, rank)
    d_lower = leaf_remainder(lower_child, first_leaf, first_support, rank - 1)
    assert (d_same, d_lower, n_vector[rank]) == (68, 3, 37)
    assert d_parent == d_same + d_lower + n_vector[rank]

    assert L(4) == 3 and L(3) == 2
    assert rank < L(4)
    assert not (rank < L(independence_number(core)))
    assert rank < L(independence_number(four_minor) + 2)
    return {
        "graph": "three-arm length-two spider",
        "polynomial": polynomial,
        "alpha_F": 4,
        "target_rank": rank,
        "L_alpha_F": L(4),
        "all_leaf_deletions": leaf_children,
        "Q_identity_at_rank_2": {
            "Q_F": 268,
            "Q_same_rank_child": 146,
            "Q_lower_rank_child": 14,
            "D": 108,
        },
        "marked_core": {
            "alpha_B": 3,
            "alpha_W": 2,
            "L_alpha_B": L(3),
            "L_alpha_W_plus_2": L(4),
            "N2": n_vector[rank],
        },
        "D_identity_at_rank_2": {
            "D_parent": d_parent,
            "D_same_rank_child": d_same,
            "D_lower_rank_child": d_lower,
            "N2": n_vector[rank],
        },
        "conclusion": (
            "N_2(B;u,v) is an exact summand required for prefix ISO of F, "
            "but 2<=r<L(alpha(B)) contains no rank at all."
        ),
    }


def two_rank_omission_witness() -> dict[str, object]:
    # B = two marked K_{1,2}'s plus an unmarked K_2.  Deleting the marked
    # centers changes neither alpha, so alpha(B)=alpha(W)=5.  Attaching one
    # pending leaf at each mark produces alpha 7 and exposes ranks 3 and 4
    # beyond the proposed local cutoff L(alpha(B))=3.
    core = nx.Graph()
    core.add_edges_from([(0, 1), (0, 2), (3, 4), (3, 5), (6, 7)])
    outer = core.copy()
    outer.add_edges_from([(0, 8), (3, 9)])
    four_minor = core.copy()
    four_minor.remove_nodes_from([0, 3])
    assert independence_number(core) == independence_number(four_minor) == 5
    assert independence_number(outer) == 7
    assert L(5) == 3 and L(7) == 5
    vector = four_minor_vector(core, 0, 3)
    assert vector[4] == 2156
    return {
        "alpha_B": 5,
        "alpha_W": 5,
        "alpha_outer": 7,
        "proposed_domain": "2<=r<3 (only r=2)",
        "required_outer_prefix_domain": "2<=r<5 (r=2,3,4)",
        "N4": vector[4],
        "omitted_required_ranks": [3, 4],
    }


def isolate_nonheredity_witness() -> dict[str, object]:
    # Marked edge 0-1 plus two unmarked isolates.  Removing one isolate drops
    # alpha(W) from 2 to 1 while FML keeps the same rank on its first child.
    parent = nx.Graph()
    parent.add_nodes_from(range(4))
    parent.add_edge(0, 1)
    child = parent.copy()
    child.remove_node(2)
    parent_w = parent.copy()
    parent_w.remove_nodes_from([0, 1])
    child_w = child.copy()
    child_w.remove_nodes_from([0, 1])
    assert independence_number(parent_w) == 2
    assert independence_number(child_w) == 1
    parent_n = four_minor_vector(parent, 0, 1)
    child_n = four_minor_vector(child, 0, 1)
    rank = 2
    gap = parent_n[rank] - child_n[rank] - child_n[rank - 1]
    assert (parent_n[rank], child_n[rank], child_n[rank - 1], gap) == (24, 17, 0, 7)
    assert rank < L(2 + 2)
    assert not (rank < L(1 + 2))
    return {
        "parent_alpha_W": 2,
        "child_alpha_W": 1,
        "rank": rank,
        "parent_direct_cutoff": L(4),
        "child_direct_cutoff": L(3),
        "FML_isolate_identity": {
            "N_parent": parent_n[rank],
            "N_same_rank_child": child_n[rank],
            "N_lower_rank_child": child_n[rank - 1],
            "gap": gap,
        },
        "conclusion": (
            "Replacing alpha(B) by alpha(W)+2 fixes direct use but is not "
            "induction-closed: the same-rank child N_2 is still required "
            "outside its own strict local cutoff."
        ),
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_ISO_CUTOFF_DOMAIN_SCOPE_AUDIT",
        "status": "scope audit only; no positivity theorem claimed",
        "cutoff_arithmetic": cutoff_arithmetic(),
        "connected_spider_witness": connected_spider_witness(),
        "two_rank_omission_witness": two_rank_omission_witness(),
        "isolate_nonheredity_witness": isolate_nonheredity_witness(),
        "correct_direct_N_domain": "2<=r<L(alpha(B-{u,v})+2)",
        "induction_closed_ambient_domain": (
            "Fix ambient A and R=L(A)-1.  For every descendant marked core "
            "B with W=B-{u,v}, FML is needed for "
            "2<=r<=min(R,alpha(W)+2)."
        ),
        "uniform_domain_for_this_recurrence_strategy": (
            "For all ambient forests at once, prove FML for every marked "
            "forest at all 2<=r<=alpha(B-{u,v})+2, unless an additional "
            "alpha-preserving leaf-selection or boundary-payment theorem is supplied."
        ),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print("PASS_EXACT_ISO_CUTOFF_DOMAIN_SCOPE_AUDIT")


if __name__ == "__main__":
    main()
