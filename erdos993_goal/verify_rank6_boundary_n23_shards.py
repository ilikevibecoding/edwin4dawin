#!/usr/bin/env python3
"""Aggregate the eight exact order-23 terminal-bundle boundary shards."""

from __future__ import annotations

from pathlib import Path
import re


HERE = Path(__file__).resolve().parent
SHARDS = 8
EXPECTED_TREES = 14_828_074
EXPECTED_ROOTS = 23 * EXPECTED_TREES
PATTERN = re.compile(
    r"boundary core_n=23 trees=(\d+) rooted=(\d+) "
    r"min_R1=(-?\d+) min_DeltaR1=(-?\d+) "
    r"shard=Some\(\((\d+), (\d+)\)\)"
)


def main() -> int:
    rows = []
    for shard in range(SHARDS):
        path = HERE / f"rank6_boundary_n23_shard_{shard}.stdout.log"
        match = PATTERN.fullmatch(path.read_text().strip())
        if match is None:
            raise AssertionError(f"invalid or incomplete shard log: {path}")
        trees, roots, r1, delta1, index, count = map(
            int, match.groups()
        )
        assert index == shard
        assert count == SHARDS
        expected = (
            EXPECTED_TREES + SHARDS - 1 - shard
        ) // SHARDS
        assert trees == expected
        assert roots == 23 * trees
        assert r1 >= 0
        assert delta1 >= 0
        rows.append((trees, roots, r1, delta1))

    assert sum(row[0] for row in rows) == EXPECTED_TREES
    assert sum(row[1] for row in rows) == EXPECTED_ROOTS
    print(
        "rank-6 terminal-bundle boundary order 23: CERTIFIED "
        f"trees={EXPECTED_TREES} roots={EXPECTED_ROOTS} "
        f"min_R1={min(row[2] for row in rows)} "
        f"min_DeltaR1={min(row[3] for row in rows)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
