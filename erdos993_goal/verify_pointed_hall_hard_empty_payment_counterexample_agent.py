#!/usr/bin/env python3
"""Exact counterexample to paying all delta<=1 Hall rows from empty slack."""

from __future__ import annotations

import hashlib
import json
import os
from math import comb
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pointed_hall_hard_empty_payment_counterexample_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def operative_excess(alpha: int) -> int | None:
    if alpha % 3 == 0:
        return alpha // 3 + 1
    if alpha % 3 == 2:
        return (alpha - 2) // 3 + 2
    return None


def mixed(one_factors: int, two_factors: int, rank: int) -> int:
    return sum(
        comb(one_factors, left) * comb(two_factors, rank - left) * 2 ** (rank - left)
        for left in range(one_factors + 1)
        if 0 <= rank - left <= two_factors
    )


def rest_coefficient(rank: int) -> int:
    # R is the 65-unit directed-star component plus 30 disjoint K2s.
    # I(R)=(1+2x)^30 [x(1+x)^64+(1+x)(1+2x)^64].
    return (
        mixed(64, 30, rank - 1)
        + comb(94, rank) * 2**rank
        + comb(94, rank - 1) * 2 ** (rank - 1)
    )


def exact_realization() -> tuple[nx.Graph, frozenset[str], str]:
    graph = nx.Graph()
    aset = frozenset(f"a{i}" for i in range(96))
    cset = frozenset(f"c{i}" for i in range(96))
    graph.add_nodes_from(aset | cset)
    graph.add_edges_from((f"c{i}", f"a{i}") for i in range(96))
    # Unit 0 is the active-star center, units 1..64 its directed leaves.
    graph.add_edges_from(("c0", f"a{j}") for j in range(1, 65))
    assert nx.is_forest(graph)
    assert graph.number_of_nodes() == 192
    assert graph.number_of_edges() == 160
    matching = nx.max_weight_matching(graph, maxcardinality=True)
    assert len(matching) == 96
    point = "c95"  # one of the 31 isolated K2 units, separate from the star
    after = graph.copy()
    after.remove_node(point)
    after_matching = nx.max_weight_matching(after, maxcardinality=True)
    assert len(after_matching) == 95
    assert len(graph) - len(matching) == len(after) - len(after_matching) == 96
    return graph, aset, point


def main() -> None:
    first_failure = None
    rows = 0
    # Family: one marked isolated K2 unit, a directed out-star with d active
    # leaves, and z other isolated K2 units.  Thus alpha=d+z+2.
    for alpha in range(2, 501):
        excess = operative_excess(alpha)
        if excess is None:
            continue
        capacity = excess * comb(alpha, excess)
        for active_leaves in range(excess, alpha - 1):
            free_units = alpha - active_leaves - 2
            count = (1 << free_units) * comb(active_leaves, excess)
            rows += 1
            if count > capacity:
                first_failure = {
                    "alpha": alpha,
                    "alpha_mod_3": alpha % 3,
                    "operative_excess": excess,
                    "active_outgoing_leaves": active_leaves,
                    "other_free_K2_units": free_units,
                    "hard_delta1_boundary_sets": count,
                    "empty_interval_capacity": capacity,
                    "strict_excess": count - capacity,
                }
                break
        if first_failure is not None:
            break
    expected = {
        "alpha": 96,
        "alpha_mod_3": 0,
        "operative_excess": 33,
        "active_outgoing_leaves": 64,
        "other_free_K2_units": 30,
        "hard_delta1_boundary_sets": 1908135939686914171405860864,
        "empty_interval_capacity": 1900911857473066650234010560,
        "strict_excess": 7224082213847521171850304,
    }
    assert first_failure == expected

    graph, maximum_set, point = exact_realization()
    assert point not in maximum_set
    alpha = 96
    rank = 64
    # G=K2(point) disjoint union R, so I(G)=(1+2x)I(R) and
    # h_(rank-1,p)=i_(rank-2)(R).
    i_rank = rest_coefficient(rank) + 2 * rest_coefficient(rank - 1)
    pointed_previous = rest_coefficient(rank - 2)
    margin = rank * i_rank - pointed_previous
    assert i_rank == 365267026473898649400015508737324540448931840
    assert pointed_previous == 117444708990674686284887573884411485716118528
    assert margin == 23259644985338838875316104985304359103015519232
    assert margin > 0

    hall_slack = 0
    hall_boundary = 0
    weighted_rows = 0
    # Exact C-part types: marked K2 cover p, star center q, s active
    # star-leaf covers, and t of the 30 other isolated K2 covers.
    for pflag in (0, 1):
        for qflag in (0, 1):
            for selected_active in range(65):
                for selected_free in range(31):
                    multiplicity = comb(64, selected_active) * comb(30, selected_free)
                    ysize = pflag + qflag + selected_active + selected_free
                    dsize = pflag + (65 if qflag else selected_active) + selected_free
                    free = alpha - dsize
                    current = (
                        comb(free, rank - ysize)
                        if 0 <= rank - ysize <= free
                        else 0
                    )
                    previous = (
                        comb(free, rank - 1 - ysize)
                        if 0 <= rank - 1 - ysize <= free
                        else 0
                    )
                    term = rank * current - (previous if pflag else 0)
                    if term < 0:
                        assert term == -1
                        assert pflag == qflag == 1 and selected_active == 31
                        hall_boundary += multiplicity
                    else:
                        hall_slack += multiplicity * term
                    weighted_rows += multiplicity
    assert hall_boundary == expected["hard_delta1_boundary_sets"]
    assert hall_slack == 23259644985338838877224240924991273274421380096
    assert hall_slack - hall_boundary == margin
    assert weighted_rows == 2**96

    source = Path(__file__).resolve()
    report = {
        "schema": "pointed-hall-hard-empty-payment-counterexample-agent-v1",
        "date": "2026-08-29",
        "status": "COUNTEREXAMPLE_EXACT_POINTED_HALL_HARD_EMPTY_ONLY_PAYMENT",
        "claim_refuted": (
            "After paying delta>=2 rows from their Z intervals, the empty "
            "Boolean interval alone always pays every remaining delta<=1 row."
        ),
        "first_failure_in_exact_family_through_alpha_500": first_failure,
        "family_rows_before_first_failure_inclusive": rows,
        "exact_realization": {
            "forest_order": len(graph),
            "forest_edges": graph.number_of_edges(),
            "alpha": alpha,
            "alpha_after_point_deletion": alpha,
            "rank": rank,
            "marked_point": point,
            "hard_boundary_count": hall_boundary,
            "empty_capacity": expected["empty_interval_capacity"],
            "full_hall_positive_slack": hall_slack,
            "pointed_margin": margin,
        },
        "scope": (
            "Refutes only the hard-family empty-only payment. The delta>=2 "
            "private-neighbor payment remains exact; the full pointed margin "
            "in this example is positive due to other nonempty long intervals."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print(json.dumps(first_failure, indent=2))
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
