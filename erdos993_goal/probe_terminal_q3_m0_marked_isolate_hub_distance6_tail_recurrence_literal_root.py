#!/usr/bin/env python3
"""Test target recurrences on exact distance-six tail cells."""

from prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root import (
    formula_rows,
    margin,
)


def main():
    cells = 0
    positive = 0
    nonpositive = []
    by_offset = {}
    for small in range(1, 21):
        for large in range(small, 121):
            independent, one_edge = formula_rows(large, small)
            for target in range(small + 3, len(independent) - 1):
                if independent[target] == 0:
                    continue
                current = margin(independent, one_edge, target)
                following = margin(independent, one_edge, target + 1)
                difference = following - current
                offset = target - small - 3
                record = by_offset.setdefault(
                    offset,
                    {"cells": 0, "positive": 0, "minimum": None},
                )
                record["cells"] += 1
                record["positive"] += difference > 0
                witness = (difference, large, small, target)
                if record["minimum"] is None or witness < record["minimum"]:
                    record["minimum"] = witness
                if difference > 0:
                    positive += 1
                elif len(nonpositive) < 30:
                    nonpositive.append(witness)
                cells += 1
    print(
        {
            "cells": cells,
            "positive": positive,
            "nonpositive_count": cells - positive,
            "first_nonpositive": nonpositive,
            "offsets": by_offset,
        },
        flush=True,
    )


if __name__ == "__main__":
    main()
