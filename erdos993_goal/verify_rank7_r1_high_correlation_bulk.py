#!/usr/bin/env python3
"""Independent stored-witness audit for the order-23 r=1 bulk table."""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import networkx as nx

from enumerate_rank7_b2_42_root_profile_all_partitions import statistics
from enumerate_rank7_r1_high_correlation_bulk import exact_c5_integer


HERE = Path(__file__).resolve().parent
BULK = HERE / "rank7_r1_high_correlation_bulk_b30plus_exact_20260817.json"
LEGACY = (
    (38, 4, "rank7_b2_38_root_profile_all_partitions_exact_20260817.json"),
    (42, 4, "rank7_b2_42_root_profile_all_partitions_exact_20260817.json"),
    (46, 5, "rank7_b2_46_x5_root_profile_all_partitions_exact_20260817.json"),
)


def audit_witness(beta: int, neighbor_x: int, c4: int, row: dict) -> None:
    weights = row["weights_by_vertex"]
    partition = row["partition"]
    assert sorted(weights, reverse=True) == partition
    assert sum(weights) == 21
    assert sum(comb(value, 2) for value in weights) == beta
    gamma = sum(comb(value, 3) for value in weights)
    assert gamma == row["B3"]

    tree = nx.Graph()
    tree.add_nodes_from(range(len(weights)))
    tree.add_edges_from(row["core_edges"])
    assert nx.is_tree(tree)
    core_degree, leaf_slots, edge, connected_four, terms = statistics(tree, weights)
    assert core_degree == row["core_degree"]
    assert leaf_slots == row["leaf_slots"]
    assert edge == row["E"]
    assert connected_four == row["V"]
    assert terms == row["shape_terms"]
    assert any(
        weights[i] == neighbor_x and leaf_slots[i] >= 1
        for i in range(len(weights))
    )

    c4_constant = comb(20, 4) + 18 * beta + 20
    assert c4 == c4_constant - gamma - edge
    assert row["c5_min"] == exact_c5_integer(
        23, beta, gamma, edge, connected_four, c4
    )


def main() -> int:
    report = json.loads(BULK.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_R1_HIGH_CORRELATION_BULK"
    assert report["scope"] == {
        "n": 23,
        "B2_min": 30,
        "root_profile": (
            "every r=1 root profile, grouped by the excess x of the "
            "root's unique neighbour"
        ),
    }
    assert report["counts"] == {
        "partitions": 520,
        "shape_assignment_pairs": 4569336,
        "degree_feasible_pairs": 823715,
        "root_feasible_pairs": 823715,
    }
    assert report["profile_count"] == 656
    assert report["row_count"] == 31029

    audited = 0
    for profile in report["profiles"].values():
        beta = profile["B2"]
        neighbor_x = profile["neighbor_x"]
        assert beta >= 30
        c4_values = sorted(map(int, profile["c4_rows"]))
        assert c4_values[0] == profile["first_attainable_c4"]
        assert c4_values[-1] == profile["last_attainable_c4"]
        for c4_text, row in profile["c4_rows"].items():
            audit_witness(beta, neighbor_x, int(c4_text), row)
            audited += 1
    assert audited == 31029

    legacy_matches = {}
    for beta, neighbor_x, filename in LEGACY:
        old = json.loads((HERE / filename).read_text(encoding="utf-8"))
        old_rows = old["all_c4_rows"]
        new_rows = report["profiles"][f"B2={beta},x={neighbor_x}"]["c4_rows"]
        assert set(old_rows) == set(new_rows)
        for c4_text in old_rows:
            assert old_rows[c4_text]["c5_min"] == str(
                new_rows[c4_text]["c5_min"]
            )
        legacy_matches[filename] = len(old_rows)

    print(
        json.dumps(
            {
                "status": "PASS_EXACT_STORED_WITNESS_AUDIT",
                "audited_rows": audited,
                "legacy_full_profile_matches": legacy_matches,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
