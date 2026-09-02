#!/usr/bin/env python3
"""Aggregate the exploratory rank-5 AM-GM MILP output."""

from __future__ import annotations

import ast
from collections import defaultdict
from pathlib import Path


def main() -> int:
    source = Path("amgm_milp_a0_chunks4.log")
    aggregated = defaultdict(lambda: [0, 0, 0])
    for line in source.read_text(encoding="utf-8").splitlines():
        if not line.startswith("("):
            continue
        needed, middle, left_use, left, right_use, right = (
            ast.literal_eval(line.rstrip(","))
        )
        key = (middle, left, right)
        aggregated[key][0] += needed
        aggregated[key][1] += left_use
        aggregated[key][2] += right_use
    print(f"raw=140 aggregated={len(aggregated)}")
    for (middle, left, right), (needed, left_use, right_use) in sorted(
        aggregated.items()
    ):
        assert 4 * left_use * right_use >= needed * needed
        print(
            f"({needed}, {middle}, {left_use}, {left}, "
            f"{right_use}, {right}),"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
