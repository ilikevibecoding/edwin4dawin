#!/usr/bin/env python3
"""Exact global i4/i5 edge-pair lift for 25-vertex forests.

For a=i4(J), let B4=C(25,4)-a.  The program verifies the exact piecewise
integer lower bound obtained from:

* the union-bound edge floor ceil(B4/C(23,2));
* the degree-sum floor on adjacent edge pairs;
* edge-pair/five-set incidence; and
* the bad-four/bad-five incidence identity.

The main corollary is independent of every ambient c5 parameter:

    a <= 8854  ==>  i5(J) >= 7a-35198.
"""

from __future__ import annotations

import hashlib
import json
from itertools import combinations
from math import comb
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "forest_n25_i45_edge_pair_lift_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceil_div(numerator: int, denominator: int) -> int:
    return (numerator + denominator - 1) // denominator


def is_forest(order: int, edges: tuple[tuple[int, int], ...]) -> bool:
    parent = list(range(order))

    def find(vertex: int) -> int:
        while parent[vertex] != vertex:
            parent[vertex] = parent[parent[vertex]]
            vertex = parent[vertex]
        return vertex

    for left, right in edges:
        left_root, right_root = find(left), find(right)
        if left_root == right_root:
            return False
        parent[left_root] = right_root
    return True


def local_five_vertex_audit() -> dict:
    """Exhaust the 2^10 labelled graphs and retain the 291 forests."""
    possible = tuple(combinations(range(5), 2))
    forests = multi_edge_forests = 0
    minimum_t_for_multi_edge = None
    maximum_edge_pairs = 0
    for mask in range(1 << len(possible)):
        edges = tuple(
            possible[index]
            for index in range(len(possible))
            if mask & (1 << index)
        )
        if not is_forest(5, edges):
            continue
        forests += 1
        edge_count = len(edges)
        maximum_edge_pairs = max(maximum_edge_pairs, comb(edge_count, 2))
        bad_four_subsets = 0
        for omitted in range(5):
            remaining = set(range(5)) - {omitted}
            if any(left in remaining and right in remaining for left, right in edges):
                bad_four_subsets += 1
        if edge_count == 1:
            assert bad_four_subsets == 3
        if edge_count >= 2:
            multi_edge_forests += 1
            minimum_t_for_multi_edge = (
                bad_four_subsets
                if minimum_t_for_multi_edge is None
                else min(minimum_t_for_multi_edge, bad_four_subsets)
            )
    assert forests == 291
    assert maximum_edge_pairs == 6
    assert minimum_t_for_multi_edge == 4
    return {
        "labelled_five_vertex_forests": forests,
        "labelled_multi_edge_five_vertex_forests": multi_edge_forests,
        "maximum_edge_pairs": maximum_edge_pairs,
        "minimum_bad_four_subsets_when_at_least_two_edges": minimum_t_for_multi_edge,
    }


def lift_row(a: int) -> dict:
    m = 25
    bad4 = comb(m, 4) - a
    edge_floor = ceil_div(bad4, comb(m - 2, 2))
    adjacent_pair_floor = max(0, 2 * edge_floor - m)
    edge_pair_floor = comb(edge_floor, 2)
    pair_five_incidence_floor = (
        (m - 4) * edge_pair_floor
        + (comb(m - 3, 2) - (m - 4)) * adjacent_pair_floor
    )
    multiple_edge_five_sets_floor = ceil_div(
        pair_five_incidence_floor, comb(4, 2)
    )
    incidence_lift = ceil_div(multiple_edge_five_sets_floor, 3)
    generic_i5_lower = comb(m, 5) - (m - 4) * bad4 // 3
    return {
        "i4": a,
        "bad_four_sets": bad4,
        "edge_floor": edge_floor,
        "adjacent_edge_pair_floor": adjacent_pair_floor,
        "edge_pair_to_five_set_incidences_floor": pair_five_incidence_floor,
        "multiple_edge_five_sets_floor": multiple_edge_five_sets_floor,
        "incidence_lift": incidence_lift,
        "generic_i5_lower": generic_i5_lower,
        "lifted_i5_lower": generic_i5_lower + incidence_lift,
    }


def main() -> int:
    audit = local_five_vertex_audit()
    all_rows = [lift_row(a) for a in range(comb(25, 4) + 1)]

    threshold = 8854
    threshold_row = all_rows[threshold]
    assert threshold_row["bad_four_sets"] == 3796
    assert threshold_row["edge_floor"] == 16
    assert threshold_row["adjacent_edge_pair_floor"] == 7
    assert threshold_row["multiple_edge_five_sets_floor"] == 665
    assert threshold_row["incidence_lift"] == 222
    assert threshold_row["lifted_i5_lower"] == 7 * threshold - 35198

    # The mechanism has the same uniform constants for every 0<=a<=8854;
    # lower a can only raise the edge/pair floors.
    for row in all_rows[: threshold + 1]:
        assert row["edge_floor"] >= 16
        assert row["adjacent_edge_pair_floor"] >= 7
        assert row["multiple_edge_five_sets_floor"] >= 665
        assert row["incidence_lift"] >= 222
        assert row["lifted_i5_lower"] >= 7 * row["i4"] - 35198

    next_row = all_rows[threshold + 1]
    assert next_row["bad_four_sets"] == 3795
    assert next_row["edge_floor"] == 15

    # Compact the all-a piecewise formula into maximal constant parameter runs.
    runs = []
    start = 0
    signature = tuple(
        all_rows[0][key]
        for key in (
            "edge_floor",
            "adjacent_edge_pair_floor",
            "multiple_edge_five_sets_floor",
            "incidence_lift",
        )
    )
    for a in range(1, len(all_rows) + 1):
        next_signature = None if a == len(all_rows) else tuple(
            all_rows[a][key]
            for key in (
                "edge_floor",
                "adjacent_edge_pair_floor",
                "multiple_edge_five_sets_floor",
                "incidence_lift",
            )
        )
        if next_signature != signature:
            runs.append({
                "i4_min": start,
                "i4_max": a - 1,
                "edge_floor": signature[0],
                "adjacent_edge_pair_floor": signature[1],
                "multiple_edge_five_sets_floor": signature[2],
                "incidence_lift": signature[3],
                "lifted_i5_formula": f"7*i4-35420+{signature[3]}",
            })
            start = a
            signature = next_signature

    report = {
        "status": "PASS_EXACT_FOREST_N25_I45_EDGE_PAIR_LIFT",
        "theorem": (
            "For every 25-vertex forest J with a=i4(J), define the integer "
            "parameters in piecewise_runs. Then i5(J)>=7a-35420+incidence_lift. "
            "In particular, a<=8854 implies i5(J)>=7a-35198."
        ),
        "global_corollary": {
            "hypothesis": "0<=i4(J)<=8854",
            "conclusion": "i5(J)>=7*i4(J)-35198",
            "threshold_row": threshold_row,
            "first_row_outside_uniform_edge_16_scope": next_row,
        },
        "piecewise_formula": {
            "bad_four_sets": "C(25,4)-i4",
            "edge_floor": "ceil(bad_four_sets/C(23,2))",
            "adjacent_edge_pair_floor": "max(0,2*edge_floor-25)",
            "pair_five_incidence_floor": (
                "21*C(edge_floor,2)+210*adjacent_edge_pair_floor"
            ),
            "multiple_edge_five_sets_floor": (
                "ceil(pair_five_incidence_floor/6)"
            ),
            "incidence_lift": "ceil(multiple_edge_five_sets_floor/3)",
            "i5_lower": "7*i4-35420+incidence_lift",
        },
        "piecewise_runs": runs,
        "local_five_vertex_audit": audit,
        "scope_warning": (
            "This is a coefficient inequality for 25-vertex forests. It is "
            "independent of any ambient c5 or containment-face value."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        "i4<=8854 => edge_floor>=16, adjacent_pairs>=7, "
        "multi_edge_5sets>=665"
    )
    print("GLOBAL_COROLLARY i5>=7*i4-35198")
    print(f"piecewise_runs={len(runs)}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
