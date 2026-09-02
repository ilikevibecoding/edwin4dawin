#!/usr/bin/env python3
"""Audit the durable exhaustive outputs for rank-4 orders 1 through 19."""

from __future__ import annotations

import json
from pathlib import Path


BASE = Path(__file__).resolve().parent


def load(name):
    return json.loads((BASE / name).read_text(encoding="utf-8"))


def main() -> int:
    through16 = load("rank4_leaf_curvature_identity_n16_20260726.json")
    order17 = load("rank4_leaf_curvature_identity_n17_only_20260726.json")
    order18 = load("rank4_fast_n18_20260726.json")
    order19 = load("rank4_fast_n19_exhaustive_20260726.json")

    assert [row["order"] for row in through16["per_order"]] == list(
        range(1, 17)
    )
    assert through16["totals"]["trees"] == 32_508
    assert through16["totals"]["leaf_attachments"] == 497_380
    assert through16["totals"]["negative_rank4_curvatures"] == 0
    assert through16["totals"]["negative_rank4_leaf_increments"] == 0

    assert len(order17["per_order"]) == 1
    row17 = order17["per_order"][0]
    assert row17["order"] == 17
    assert row17["trees"] == 48_629
    assert order17["totals"]["leaf_attachments"] == 826_693
    assert order17["totals"]["negative_rank4_curvatures"] == 0
    assert order17["totals"]["negative_rank4_leaf_increments"] == 0
    assert row17["minimum_rank4_leaf_increment"] == 52_999_920

    row18 = order18["per_order"][0]
    assert row18["order"] == 18
    assert row18["trees"] == 123_867
    assert row18["attachments"] == 2_229_606
    assert order18["totals"]["negative_curvatures"] == 0
    assert order18["totals"]["negative_leaf_increments"] == 0
    assert row18["minimum_leaf_increment"] == 79_463_520
    assert row18["minimum_envelope_excess"] == 0

    assert order19["order"] == 19
    assert order19["coverage"]["generator_exhausted"]
    assert order19["coverage"]["trees"] == 317_955
    assert order19["coverage"]["last_tree_index"] == 317_954
    assert order19["coverage"]["attachments"] == 6_041_145
    assert order19["negative_curvatures"] == 0
    assert order19["negative_leaf_increments"] == 0
    assert order19["minimum_leaf_increment"] == 116_074_080
    assert order19["minimum_envelope_excess"] == 0

    total_trees = 32_508 + 48_629 + 123_867 + 317_955
    total_attachments = 497_380 + 826_693 + 2_229_606 + 6_041_145
    assert total_trees == 522_959
    assert total_attachments == 9_594_824

    print("rank-4 finite output bundle: PASS")
    print(f"unlabeled trees: {total_trees:,}")
    print(f"attachment vertices: {total_attachments:,}")
    print("covered orders: 1..19")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
