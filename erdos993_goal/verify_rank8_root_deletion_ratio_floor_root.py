#!/usr/bin/env python3
"""Prove and audit the rooted-deletion coefficient-ratio floor used at rank 8."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_root_deletion_ratio_floor_exact_root_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path_coefficient(order: int, rank: int) -> int:
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def coefficient(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if rank < len(row) else 0


def main() -> None:
    # These are the two Pascal identities used by the all-order inductions.
    # Forest lower bound: delete a leaf v from a nontrivial component and use
    # I(F)=I(F-v)+x I(F-N[v]), where |N[v]|=2.
    # Tree upper bound: the first term is bounded inductively and the second
    # by the number of all (k-1)-subsets of the remaining n-2 vertices.
    identity_checks = 0
    for order in range(2, 80):
        for rank in range(1, 20):
            lower_left = path_coefficient(order - 1, rank)
            lower_left += path_coefficient(order - 2, rank - 1)
            assert lower_left == path_coefficient(order, rank)
            upper_left = math.comb(order - 2, rank) if order - 2 >= rank else 0
            upper_left += (
                math.comb(order - 2, rank - 1)
                if order - 2 >= rank - 1 >= 0
                else 0
            )
            upper_right = math.comb(order - 1, rank) if order - 1 >= rank else 0
            assert upper_left == upper_right
            identity_checks += 2

    trees_checked = 0
    roots_checked = 0
    active_ratio_checks = 0
    minimum_scaled_slack = None
    minimum_witness = None
    for order in range(2, 14):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            deleted, whole = all_root_states(tree, 8)
            trees_checked += 1
            for root in tree:
                roots_checked += 1
                for rank in range(2, 9):
                    c_rank = coefficient(whole, rank)
                    if not c_rank:
                        continue
                    h_rank = coefficient(deleted[root], rank)
                    containing_rank = c_rank - h_rank
                    forest_floor = path_coefficient(order - 1, rank)
                    tree_ceiling = (
                        math.comb(order - 1, rank)
                        if order - 1 >= rank
                        else 0
                    )
                    containing_ceiling = (
                        math.comb(order - tree.degree(root) - 1, rank - 1)
                        if order - tree.degree(root) - 1 >= rank - 1
                        else 0
                    )
                    assert h_rank >= forest_floor
                    assert c_rank <= tree_ceiling
                    assert containing_rank <= containing_ceiling
                    # Since c_k=h_k+a_k, h_k>=L, and a_k<=A, the sharper
                    # deletion floor is h_k/c_k>=L/(L+A). Cross-multiply it.
                    scaled_slack = (
                        h_rank * (forest_floor + containing_ceiling)
                        - c_rank * forest_floor
                    )
                    assert scaled_slack >= 0
                    active_ratio_checks += 1
                    row = (
                        scaled_slack,
                        order,
                        tree_index,
                        root,
                        rank,
                        h_rank,
                        c_rank,
                        nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    )
                    if minimum_scaled_slack is None or row < minimum_witness:
                        minimum_scaled_slack = scaled_slack
                        minimum_witness = row

    sample_orders = (14, 21, 28, 31, 40, 80, 200, 1000)
    rank7_samples = []
    for order in sample_orders:
        path_floor = math.comb(order - 7, 7)
        containing_ceiling = math.comb(order - 2, 6)
        floor = Fraction(path_floor, path_floor + containing_ceiling)
        rank7_samples.append(
            {
                "order": order,
                "Z_lower_bound": str(floor),
                "decimal": f"{float(floor):.18g}",
            }
        )

    payload = {
        "schema": "rank8-root-deletion-ratio-floor-root-v1",
        "status": "PASS_EXACT_ALL_ORDER_ROOT_DELETION_RATIO_FLOOR",
        "theorem": (
            "For every n-vertex tree T, every vertex q of degree d, and every "
            "rank k>=2 with i_k(T)>0, i_k(T-q)/i_k(T) is at least L/(L+A), "
            "where L=binomial(n-k,k) and A=binomial(n-d-1,k-1). In particular "
            "it is at least L/(L+binomial(n-2,k-1))."
        ),
        "proof": {
            "forest_path_minimality": (
                "Every m-vertex forest F satisfies i_k(F)>=binomial(m-k+1,k). "
                "Induct using a leaf v in a nontrivial component: F-v and "
                "F-N[v] have m-1 and m-2 vertices, and Pascal closes the bound; "
                "the edgeless case is immediate."
            ),
            "tree_star_maximality_secondary": (
                "Every n-vertex tree T satisfies i_k(T)<=binomial(n-1,k) for "
                "k>=2. Delete a leaf v: the tree T-v contributes at most "
                "binomial(n-2,k) inductively, while T-N[v] contributes at most "
                "binomial(n-2,k-1); Pascal closes the bound."
            ),
            "root_join": (
                "Write i_k(T)=h+a with h=i_k(T-q) and "
                "a=i_(k-1)(T-N[q]). The forest lower bound gives h>=L, while "
                "the trivial subset ceiling gives a<=A. Since h/(h+a) increases "
                "with h and decreases with a, h/i_k(T)>=L/(L+A)."
            ),
        },
        "rank8_corollary": {
            "definition": "Z=h7/c7=i7(T-q)/i7(T)",
            "degree_sensitive_bound": (
                "Z>=binomial(n-7,7)/(binomial(n-7,7)+binomial(n-d(q)-1,6))"
            ),
            "universal_bound": (
                "Z>=binomial(n-7,7)/(binomial(n-7,7)+binomial(n-2,6))"
            ),
            "samples": rank7_samples,
        },
        "pascal_identity_checks": identity_checks,
        "independent_census": {
            "orders": "2..13",
            "trees": trees_checked,
            "roots": roots_checked,
            "active_rank_root_checks": active_ratio_checks,
            "minimum_scaled_slack": minimum_scaled_slack,
            "minimum_witness": list(minimum_witness) if minimum_witness else None,
        },
        "scope_warning": (
            "This is an all-order coefficient-ratio input. It does not by itself "
            "prove any pending Delta0..Delta3 tensor, connected Q8, forest Q8, "
            "rank-eight PGC, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
