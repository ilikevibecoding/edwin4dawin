#!/usr/bin/env python3
"""Audit the exhaustive finite rank-4 Q leaf certificate through n=19."""

from __future__ import annotations

import json
from pathlib import Path

from scan_rank4_three_halves_leaf_finite import cutoff, reserve


OUTPUT = Path("rank4_three_halves_leaf_finite_n19_20260727.json")


def main() -> int:
    payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
    expected_tree_counts = [
        1,
        1,
        1,
        2,
        3,
        6,
        11,
        23,
        47,
        106,
        235,
        551,
        1301,
        3159,
        7741,
        19320,
        48629,
        123867,
        317955,
    ]
    rows = payload["per_order"]
    assert [row["old_order"] for row in rows] == list(range(1, 20))
    assert [row["trees"] for row in rows] == expected_tree_counts
    assert all(
        row["attachments"] == row["old_order"] * row["trees"]
        for row in rows
    )
    expected_trees = sum(expected_tree_counts)
    expected_attachments = sum(
        order * count
        for order, count in enumerate(expected_tree_counts, start=1)
    )
    totals = payload["totals"]
    assert expected_trees == 522_959
    assert expected_attachments == 9_594_824
    assert totals["trees"] == expected_trees
    assert totals["attachments"] == expected_attachments
    assert totals["prefix_reserve_failures"] == 0
    assert totals["q_lm_failures"] == 0
    assert totals["q_br_failures"] == 0
    assert payload["first_prefix_reserve_failure"] is None
    assert payload["first_q_lm_failure"] is None
    assert payload["first_q_br_failure"] is None

    # The unrestricted statements really do have tiny failures.  Replay
    # them and verify that their cutoffs put rank four outside scope.
    negative_reserve = payload["first_negative_reserve"]
    assert reserve(negative_reserve["coefficients_0_to_5"]) == -2
    assert negative_reserve["cutoff"] == cutoff(
        negative_reserve["independence_number"]
    )
    assert negative_reserve["cutoff"] == 3
    assert totals["negative_reserves"] == 2

    negative_increment = payload["first_negative_leaf_increment"]
    old_value = reserve(negative_increment["old_coefficients_0_to_5"])
    new_value = reserve(negative_increment["new_coefficients_0_to_5"])
    assert old_value == negative_increment["old_reserve"]
    assert new_value == negative_increment["new_reserve"]
    assert new_value - old_value == negative_increment["increment"] == -2
    assert negative_increment["old_cutoff"] == 2
    assert negative_increment["new_cutoff"] == 3
    assert totals["negative_leaf_increments"] == 3

    # Recheck every stored order-minimum witness.
    for row in rows:
        reserve_witness = row["minimum_reserve_witness"]
        assert (
            reserve(reserve_witness["coefficients_0_to_5"])
            == row["minimum_reserve"]
            == reserve_witness["reserve"]
        )
        increment_witness = row["minimum_leaf_increment_witness"]
        old_value = reserve(
            increment_witness["old_coefficients_0_to_5"]
        )
        new_value = reserve(
            increment_witness["new_coefficients_0_to_5"]
        )
        assert old_value == increment_witness["old_reserve"]
        assert new_value == increment_witness["new_reserve"]
        assert (
            new_value - old_value
            == row["minimum_leaf_increment"]
            == increment_witness["increment"]
        )

    print("rank-4 three-halves finite-output audit: PASS")
    print(f"unlabeled trees: {expected_trees:,}")
    print(f"attachment vertices: {expected_attachments:,}")
    print("prefix Q-LM failures: 0")
    print("rank-4 Q-BR failures: 0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
