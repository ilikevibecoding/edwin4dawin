#!/usr/bin/env python3
"""Exhaustive probe for the Hall-excess boundary-count payment.

An oriented unit edge u->v records the forbidden pair (C_u,A_v).  Edges in
state zero are harmless for this upper-bound probe (they may stand for a
C--C constraint, which can only remove admissible C-subsets).  The probe
tests whether the number of subsets containing a fixed point and having
exactly the operative external out-boundary is at most e*binom(alpha,e), the
slack supplied by the empty Boolean interval.
"""

from __future__ import annotations

import argparse
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx


def operative_excess(alpha: int) -> int | None:
    if alpha % 3 == 0:
        return alpha // 3 + 1
    if alpha % 3 == 2:
        return alpha // 3 + 2
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-alpha", type=int, default=7)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("oriented_forest_boundary_count_probe_root_20260829.json"),
    )
    args = parser.parse_args()

    orientations = 0
    pointed_cases = 0
    subset_checks = 0
    closest = None
    failure = None
    for alpha in range(2, args.max_alpha + 1):
        excess = operative_excess(alpha)
        if excess is None or excess > alpha:
            continue
        target_rank = alpha - excess + 1
        capacity = excess * comb(alpha, excess)
        family = [nx.path_graph(1)] if alpha == 1 else nx.nonisomorphic_trees(alpha)
        for tree_index, tree0 in enumerate(family):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            edges = sorted(tuple(sorted(edge)) for edge in tree.edges())
            # 0=no directed boundary edge, 1=u->v, 2=v->u.
            for states in itertools.product(range(3), repeat=len(edges)):
                out = [0] * alpha
                directed_edges = []
                for (u, v), state in zip(edges, states):
                    if state == 1:
                        out[u] |= 1 << v
                        directed_edges.append((u, v))
                    elif state == 2:
                        out[v] |= 1 << u
                        directed_edges.append((v, u))
                orientations += 1
                for point in range(alpha):
                    count = 0
                    point_bit = 1 << point
                    for subset in range(1 << alpha):
                        if not subset & point_bit:
                            continue
                        boundary = 0
                        active = subset
                        while active:
                            bit = active & -active
                            vertex = bit.bit_length() - 1
                            boundary |= out[vertex]
                            active ^= bit
                        boundary &= ~subset
                        subset_checks += 1
                        if boundary.bit_count() == excess:
                            count += 1
                    pointed_cases += 1
                    record = {
                        "alpha": alpha,
                        "excess": excess,
                        "target_rank": target_rank,
                        "tree_index": tree_index,
                        "point": point,
                        "directed_edges": directed_edges,
                        "boundary_sets": count,
                        "empty_interval_capacity": capacity,
                        "capacity_minus_count": capacity - count,
                    }
                    if closest is None or count * closest["empty_interval_capacity"] > closest["boundary_sets"] * capacity:
                        closest = record
                    if count > capacity:
                        failure = record
                        break
                if failure:
                    break
            if failure:
                break
        if failure:
            break

    report = {
        "status": "FAIL" if failure else "PASS_FINITE_EVIDENCE_ONLY",
        "max_alpha": args.max_alpha,
        "orientations": orientations,
        "pointed_cases": pointed_cases,
        "subset_checks": subset_checks,
        "closest": closest,
        "first_failure": failure,
        "scope": "finite orientation evidence only; not an all-order boundary theorem",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
