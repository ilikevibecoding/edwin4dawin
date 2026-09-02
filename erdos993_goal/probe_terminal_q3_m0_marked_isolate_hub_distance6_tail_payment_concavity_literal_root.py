#!/usr/bin/env python3
"""Test ordinary concavity of distance-six tail payment sequences."""

from prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root import (
    formula_rows,
    margin,
)


def main():
    cells = 0
    nonconcave = []
    maximum = None
    for small in range(1, 21):
        for large in range(small, 121):
            independent, one_edge = formula_rows(large, small)
            targets = [
                target
                for target in range(small + 3, len(independent) - 1)
                if independent[target] > 0
            ]
            values = [margin(independent, one_edge, target) for target in targets]
            for index in range(1, len(values) - 1):
                second = values[index + 1] - 2 * values[index] + values[index - 1]
                record = (second, large, small, targets[index])
                if maximum is None or record > maximum:
                    maximum = record
                if second > 0 and len(nonconcave) < 20:
                    nonconcave.append(record)
                cells += 1
    print({"cells": cells, "maximum": maximum, "nonconcave": nonconcave}, flush=True)


if __name__ == "__main__":
    main()
