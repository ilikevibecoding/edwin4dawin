#!/usr/bin/env python3
"""Exact exclusion of the last order-27 Delta0 hard-face window.

The abstract joint-capacity row fixes c5=C(23,5)=33649 and asks, on its
containment-upper face, whether a 25-vertex forest J can have any integer

    8610 <= a=i4(J) <= 8633,  b=i5(J)=33649-a,

while obeying the generic bad-set floor.  Bad-set incidence, forced adjacent
edge pairs, and the fact that a five-vertex induced forest has at most four
edges exclude this full interval (which safely contains the negative rows).
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank7_delta0_n27_hard_face_forest_exclusion_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceil_div(numerator: int, denominator: int) -> int:
    return (numerator + denominator - 1) // denominator


def main() -> int:
    m = 25
    c5 = comb(23, 5)
    a_min, a_max = 8610, 8633

    # One edge belongs to C(m-2,2) four-sets.  Union bounding bad four-sets
    # gives a necessary edge floor for each integer a.
    four_sets_per_edge = comb(m - 2, 2)
    edge_pairs_per_five_set_ceiling = comb(4, 2)
    rows = []
    for a in range(a_min, a_max + 1):
        bad4 = comb(m, 4) - a
        edge_floor = ceil_div(bad4, four_sets_per_edge)

        # Adjacent edge pairs are sum_v C(deg(v),2).  Since C(d,2)>=d-1
        # for d>0 and at most m vertices have positive degree, a graph with e
        # edges has at least 2e-m adjacent pairs.  Every other pair is disjoint.
        adjacent_pair_floor = max(0, 2 * edge_floor - m)
        edge_pair_floor = comb(edge_floor, 2)
        disjoint_five_extensions = m - 4
        adjacent_five_extensions = comb(m - 3, 2)
        pair_five_incidence_floor = (
            disjoint_five_extensions * edge_pair_floor
            + (adjacent_five_extensions - disjoint_five_extensions)
            * adjacent_pair_floor
        )

        # An induced forest on five vertices has at most four edges, hence at
        # most six edge pairs.  This forces distinct multi-edge five-sets.
        multiple_edge_five_sets_floor = ceil_div(
            pair_five_incidence_floor, edge_pairs_per_five_set_ceiling
        )

        # D=21B4-3B5=3(b-b_generic), and each multi-edge five-set adds >=1.
        generic_badset_lower = comb(m, 5) - (m - 4) * bad4 // 3
        incidence_boost = ceil_div(multiple_edge_five_sets_floor, 3)
        improved_b_floor = generic_badset_lower + incidence_boost
        containment_upper = c5 - a
        assert improved_b_floor > containment_upper
        rows.append({
            "i4_J": a,
            "bad_four_sets": bad4,
            "edge_floor": edge_floor,
            "adjacent_edge_pair_floor": adjacent_pair_floor,
            "edge_pair_to_five_set_incidences_floor": pair_five_incidence_floor,
            "multiple_edge_five_sets_floor": multiple_edge_five_sets_floor,
            "generic_i5_lower": generic_badset_lower,
            "incidence_lift": incidence_boost,
            "improved_i5_lower": improved_b_floor,
            "containment_i5_upper": containment_upper,
            "exclusion_margin": improved_b_floor - containment_upper,
        })

    weakest_lower = min(row["improved_i5_lower"] for row in rows)
    weakest_margin = min(row["exclusion_margin"] for row in rows)
    assert weakest_lower == 25072
    assert weakest_margin == 33
    assert {row["edge_floor"] for row in rows} == {16}
    assert {row["adjacent_edge_pair_floor"] for row in rows} == {7}
    assert {row["multiple_edge_five_sets_floor"] for row in rows} == {665}

    report = {
        "status": "PASS_EXACT_RANK7_DELTA0_N27_HARD_FACE_FOREST_EXCLUSION",
        "scope": {
            "ambient_tree_order": 27,
            "root_type": "leaf",
            "forest_J_order": m,
            "c5": c5,
            "i4_J_integer_interval_audited": [a_min, a_max],
            "containment_face": "i5(J)=c5-i4(J)",
        },
        "exact_counts": {
            "four_sets_per_edge": four_sets_per_edge,
            "edge_pairs_per_induced_five_vertex_forest_ceiling": edge_pairs_per_five_set_ceiling,
            "constant_edge_floor_on_interval": 16,
            "constant_adjacent_edge_pair_floor_on_interval": 7,
            "constant_multiple_edge_five_sets_floor_on_interval": 665,
            "weakest_improved_i5_lower": weakest_lower,
            "weakest_exclusion_margin": weakest_margin,
        },
        "rows": rows,
        "conclusion": (
            "No 25-vertex forest J realizes any containment-upper row for "
            "integer i4(J) from 8610 through 8633. Hence no literal rooted-tree/J "
            "placement realizes the full negative n=27 containment-upper, "
            "q-lower hard-face interval."
        ),
        "method": (
            "exact bad-four/bad-five incidence double count, a degree-sum floor "
            "for adjacent edge pairs, and the four-edge ceiling for a five-vertex "
            "induced forest"
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        f"a={a_min}..{a_max}; edge_floor=16; adjacent_pairs>=7; "
        "multi_edge_5sets>=665"
    )
    print(f"weakest improved i5(J) floor={weakest_lower}; weakest margin={weakest_margin}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
