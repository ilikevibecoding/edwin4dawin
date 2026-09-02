#!/usr/bin/env python3
"""Exact counterexample to the empty-interval oriented-boundary payment.

The first presentation is a partially oriented star.  More importantly, the
same count occurs in the exact image of matching contraction: take a matched
55-unit directed-star component and 26 disjoint K2 units.  A pointed subset
has external out-boundary ``e`` precisely when it omits exactly ``e`` active
leaves; all 26 disjoint units are free.  Hence the literal count is

    2**z * binom(d,e).

The script also finds the first failure inside this star family at the two
operative residue classes used by the pointed Hall-boundary reduction.
"""

from __future__ import annotations

import hashlib
import json
import os
from math import comb
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "oriented_forest_boundary_count_counterexample_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def operative_excess(alpha: int) -> int | None:
    if alpha % 3 == 0:
        return alpha // 3 + 1
    if alpha % 3 == 2:
        return (alpha - 2) // 3 + 2
    return None


def literal_count(alpha: int, active_leaves: int, excess: int) -> int:
    inactive_leaves = alpha - 1 - active_leaves
    total = 0
    # Bit 0 is the marked center and is always selected.  Enumerating the
    # leaf choices by their two binomial rows is a literal subset count.
    for omitted_active in range(active_leaves + 1):
        if omitted_active != excess:
            continue
        for selected_inactive in range(inactive_leaves + 1):
            total += comb(active_leaves, omitted_active) * comb(
                inactive_leaves, selected_inactive
            )
    return total


def mixed_coefficient(one_factors: int, two_factors: int, rank: int) -> int:
    """[x^rank] (1+x)^one_factors (1+2x)^two_factors."""
    return sum(
        comb(one_factors, left) * comb(two_factors, rank - left) * 2 ** (rank - left)
        for left in range(one_factors + 1)
        if 0 <= rank - left <= two_factors
    )


def exact_realization() -> tuple[nx.Graph, frozenset[str], str]:
    graph = nx.Graph()
    aset = frozenset(f"a{i}" for i in range(81))
    cset = frozenset(f"c{i}" for i in range(81))
    graph.add_nodes_from(aset | cset)
    # Perfect matching, one edge per contracted unit.
    graph.add_edges_from((f"c{i}", f"a{i}") for i in range(81))
    # The 54 nonmatching cross edges produce the directed star arcs 0 -> j.
    graph.add_edges_from(("c0", f"a{j}") for j in range(1, 55))
    assert nx.is_forest(graph)
    assert graph.number_of_nodes() == 162
    assert graph.number_of_edges() == 135
    assert all(not (u in aset and v in aset) for u, v in graph.edges())
    matching = nx.max_weight_matching(graph, maxcardinality=True)
    assert len(matching) == 81
    after = graph.copy()
    after.remove_node("c0")
    after_matching = nx.max_weight_matching(after, maxcardinality=True)
    assert len(after_matching) == 80
    # In these bipartite forests alpha=n-nu, so both values are 81.
    assert graph.number_of_nodes() - len(matching) == 81
    assert after.number_of_nodes() - len(after_matching) == 81
    return graph, aset, "c0"


def main() -> None:
    first_failure = None
    checked_rows = 0
    for alpha in range(2, 501):
        excess = operative_excess(alpha)
        if excess is None:
            continue
        capacity = excess * comb(alpha, excess)
        for active_leaves in range(excess, alpha):
            inactive_leaves = alpha - 1 - active_leaves
            count = (1 << inactive_leaves) * comb(active_leaves, excess)
            checked_rows += 1
            if count > capacity:
                first_failure = {
                    "alpha": alpha,
                    "alpha_mod_3": alpha % 3,
                    "operative_excess": excess,
                    "active_outgoing_leaves": active_leaves,
                    "inactive_leaves": inactive_leaves,
                    "pointed_boundary_sets": count,
                    "empty_interval_capacity": capacity,
                    "strict_excess": count - capacity,
                    "ratio_numerator": count,
                    "ratio_denominator": capacity,
                }
                break
        if first_failure is not None:
            break

    expected = {
        "alpha": 81,
        "alpha_mod_3": 0,
        "operative_excess": 28,
        "active_outgoing_leaves": 54,
        "inactive_leaves": 26,
        "pointed_boundary_sets": 125990575520198072205312,
        "empty_interval_capacity": 124539090165099954146880,
        "strict_excess": 1451485355098118058432,
        "ratio_numerator": 125990575520198072205312,
        "ratio_denominator": 124539090165099954146880,
    }
    assert first_failure == expected
    assert literal_count(81, 54, 28) == expected["pointed_boundary_sets"]
    assert expected["pointed_boundary_sets"] > expected["empty_interval_capacity"]

    graph, maximum_set, point = exact_realization()
    assert point not in maximum_set

    # Exact independence polynomial of the realized forest:
    #   I(G)=x(1+x)^54(1+2x)^26 + (1+x)(1+2x)^80.
    alpha = 81
    rank = 54
    i_rank = (
        mixed_coefficient(54, 26, rank - 1)
        + comb(80, rank) * 2**rank
        + comb(80, rank - 1) * 2 ** (rank - 1)
    )
    pointed_previous = mixed_coefficient(54, 26, rank - 2)
    pointed_margin = rank * i_rank - pointed_previous
    assert i_rank == 27697491361609637836580450636436085810
    assert pointed_previous == 911146079535559263747259235
    assert pointed_margin == 1495664533526009297095808775103801374505
    assert pointed_margin > 0

    # Replay the maximum-set Hall decomposition by the three exact choices:
    # point chosen or not; s chosen among the 54 active leaves; t chosen among
    # the 26 disjoint K2-cover vertices.
    hall_slack = 0
    hall_boundary = 0
    hall_type_rows = 0
    hall_weighted_rows = 0
    for point_chosen in (0, 1):
        for selected_active in range(55):
            for selected_disjoint in range(27):
                multiplicity = comb(54, selected_active) * comb(26, selected_disjoint)
                ysize = point_chosen + selected_active + selected_disjoint
                dsize = (
                    55 + selected_disjoint
                    if point_chosen
                    else selected_active + selected_disjoint
                )
                excess = dsize - ysize
                free = alpha - dsize
                current = comb(free, rank - ysize) if 0 <= rank - ysize <= free else 0
                previous = (
                    comb(free, rank - 1 - ysize)
                    if 0 <= rank - 1 - ysize <= free
                    else 0
                )
                term = rank * current - (previous if point_chosen else 0)
                if term < 0:
                    assert term == -1
                    assert excess == 28
                    hall_boundary += multiplicity
                else:
                    hall_slack += multiplicity * term
                hall_type_rows += 1
                hall_weighted_rows += multiplicity
    assert hall_boundary == expected["pointed_boundary_sets"]
    assert hall_slack == 1495664533526009423086384295301873579817
    assert hall_slack - hall_boundary == pointed_margin
    assert hall_weighted_rows == 2**81

    source = Path(__file__).resolve()
    report = {
        "schema": "oriented-forest-boundary-count-counterexample-exact-agent-v2",
        "date": "2026-08-29",
        "status": "COUNTEREXAMPLE_EXACT_ORIENTED_FOREST_BOUNDARY_COUNT_TARGET",
        "claim_refuted": (
            "The empty Boolean interval alone always pays every pointed exact "
            "Hall-excess boundary set after matching contraction."
        ),
        "family": (
            "Exact contracted image of a matched 55-unit directed-star "
            "component disjoint union 26 K2 units; count=2^26*C(54,28)."
        ),
        "first_failure_in_star_family_through_alpha_500": first_failure,
        "star_family_rows_before_first_failure_inclusive": checked_rows,
        "exact_matching_contraction_realization": {
            "forest_order": graph.number_of_nodes(),
            "forest_edges": graph.number_of_edges(),
            "alpha": alpha,
            "alpha_after_point_deletion": alpha,
            "maximum_set_size": len(maximum_set),
            "marked_point": point,
            "independence_polynomial": (
                "x(1+x)^54(1+2x)^26+(1+x)(1+2x)^80"
            ),
            "rank": rank,
            "i_rank": i_rank,
            "pointed_previous": pointed_previous,
            "pointed_margin": pointed_margin,
            "hall_positive_slack": hall_slack,
            "hall_boundary_count": hall_boundary,
            "hall_type_rows": hall_type_rows,
            "hall_weighted_rows": hall_weighted_rows,
        },
        "scope": (
            "Refutes the empty-interval-only payment even inside the exact "
            "matching-contraction image. The exact contraction and Hall-excess "
            "identities remain valid, and the full pointed margin here is positive "
            "because nonempty long intervals provide ample additional slack."
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
