#!/usr/bin/env python3
"""Smallest exact-union obstruction to a local N_4 proof.

Expand N_4 as weights on ordered pairs of independent sets and group every
pair by its exact union.  The total over all unions is N_4, but an individual
union group can be negative.  This verifier gives a five-vertex witness and
exhausts every marked forest through order four, proving minimal support
order for this proposed decomposition.

The witness does not refute N_4: its whole N_4 value is positive.
"""

from __future__ import annotations

from collections import Counter, defaultdict
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import graph6


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_exact_union_counterexample_root_20260829.json"

# coefficient, first row/rank, second row/rank
TERMS = (
    (8, "E", 4, "W", 2),
    (-5, "E", 5, "W", 1),
    (2, "E", 3, "W", 1),
    (-5, "E", 3, "W", 3),
    (-5, "U", 4, "V", 2),
    (-1, "U", 4, "W", 1),
    (8, "U", 3, "V", 3),
    (2, "U", 3, "W", 2),
    (-5, "U", 2, "V", 4),
    (2, "U", 2, "V", 2),
    (-1, "U", 2, "W", 3),
    (-1, "V", 4, "W", 1),
    (2, "V", 3, "W", 2),
    (-1, "V", 2, "W", 3),
)


def independent_sets(graph: nx.Graph) -> tuple[int, ...]:
    edge_masks = tuple((1 << x) | (1 << y) for x, y in graph.edges())
    return tuple(
        chosen
        for chosen in range(1 << len(graph))
        if all(chosen & edge != edge for edge in edge_masks)
    )


def matches(row: str, rank: int, chosen: int, u: int, v: int) -> bool:
    return (
        chosen.bit_count() == rank
        and not (row in "UW" and chosen >> u & 1)
        and not (row in "VW" and chosen >> v & 1)
    )


def union_charges(graph: nx.Graph, u: int, v: int):
    sets = independent_sets(graph)
    charges: Counter[int] = Counter()
    breakdown: dict[int, Counter[tuple[int, str, int, str, int]]] = defaultdict(Counter)
    for coefficient, left_row, left_rank, right_row, right_rank in TERMS:
        left = tuple(
            chosen
            for chosen in sets
            if matches(left_row, left_rank, chosen, u, v)
        )
        right = tuple(
            chosen
            for chosen in sets
            if matches(right_row, right_rank, chosen, u, v)
        )
        label = (coefficient, left_row, left_rank, right_row, right_rank)
        for first in left:
            for second in right:
                union = first | second
                charges[union] += coefficient
                breakdown[union][label] += 1
    return charges, breakdown


def exhaustive_small_orders() -> dict[str, object]:
    by_order = {}
    total_cells = 0
    for order in range(2, 5):
        forests = [
            nx.convert_node_labels_to_integers(graph)
            for graph in nx.graph_atlas_g()
            if len(graph) == order and nx.is_forest(graph)
        ]
        marked_pairs = 0
        union_cells = 0
        negative = 0
        minimum = None
        for forest in forests:
            for u, v in itertools.combinations(range(order), 2):
                marked_pairs += 1
                charges, _ = union_charges(forest, u, v)
                for union, value in charges.items():
                    union_cells += 1
                    negative += int(value < 0)
                    if minimum is None or value < minimum:
                        minimum = value
        assert negative == 0
        by_order[str(order)] = {
            "forest_types": len(forests),
            "marked_pairs": marked_pairs,
            "nonzero_union_cells": union_cells,
            "negative": negative,
            "minimum": minimum,
        }
        total_cells += union_cells
    return {"by_order": by_order, "nonzero_union_cells": total_cells}


def main() -> None:
    small = exhaustive_small_orders()
    assert small["nonzero_union_cells"] == 137

    witness = nx.Graph()
    witness.add_nodes_from(range(5))
    witness.add_edges_from(((0, 1), (1, 2)))
    u, v = 1, 3
    charges, breakdown = union_charges(witness, u, v)
    whole_n4 = four_minor_vector(witness, u, v)[4]
    assert sum(charges.values()) == whole_n4 == 106

    full_union = (1 << len(witness)) - 1
    assert charges[full_union] == -10
    active = [
        {
            "coefficient": label[0],
            "left": f"{label[1]}_{label[2]}",
            "right": f"{label[3]}_{label[4]}",
            "ordered_pairs": multiplicity,
            "contribution": label[0] * multiplicity,
        }
        for label, multiplicity in sorted(breakdown[full_union].items())
    ]
    assert active == [
        {
            "coefficient": -5,
            "left": "E_3",
            "right": "W_3",
            "ordered_pairs": 1,
            "contribution": -5,
        },
        {
            "coefficient": -5,
            "left": "U_4",
            "right": "V_2",
            "ordered_pairs": 1,
            "contribution": -5,
        },
    ]

    report = {
        "marker": "PASS_EXACT_ISO_N4_EXACT_UNION_COUNTEREXAMPLE",
        "rank": 4,
        "decomposition": (
            "Expand the closed N4 formula over ordered independent-set pairs "
            "and group all terms with the same exact union."
        ),
        "minimality_census": {
            **small,
            "conclusion": (
                "Every marked forest through order four has nonnegative exact-"
                "union groups; a negative group occurs at order five."
            ),
        },
        "witness": {
            "B_order": 5,
            "B_graph6": graph6(witness),
            "B_edges": list(witness.edges()),
            "marks": {"u": u, "v": v},
            "union_vertices": list(range(5)),
            "union_charge": charges[full_union],
            "active_terms": active,
            "whole_N4": whole_n4,
            "all_union_charges_sum": sum(charges.values()),
        },
        "orientation_robustness": (
            "Reversing the two factors of any commutative coefficient product "
            "preserves I union J.  Hence the total exact-union charge -10 is "
            "independent of product orientation."
        ),
        "scope": (
            "This disproves only termwise exact-union positivity (and any proof "
            "that never transfers reserve between unions).  The whole witness "
            "has N4=106>0, so it is not a counterexample to N4."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
