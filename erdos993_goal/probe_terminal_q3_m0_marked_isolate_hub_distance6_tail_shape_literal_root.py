#!/usr/bin/env python3
"""Inspect the exact shape of distance-six tail payment sequences."""

from prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root import (
    formula_rows,
    margin,
)


def main():
    trees = 0
    max_sign_changes = 0
    bad_patterns = []
    start_minimum = None
    end_minimum = None
    value_minimum = None
    pattern_counts = {}
    for small in range(1, 21):
        for large in range(small, 121):
            independent, one_edge = formula_rows(large, small)
            targets = [
                target
                for target in range(small + 3, len(independent) - 1)
                if independent[target] > 0
            ]
            if not targets:
                continue
            values = [margin(independent, one_edge, target) for target in targets]
            differences = [values[index + 1] - values[index] for index in range(len(values) - 1)]
            signs = [1 if value > 0 else -1 if value < 0 else 0 for value in differences]
            compressed = []
            for sign in signs:
                if sign and (not compressed or sign != compressed[-1]):
                    compressed.append(sign)
            changes = max(0, len(compressed) - 1)
            max_sign_changes = max(max_sign_changes, changes)
            pattern = tuple(compressed)
            pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1
            if pattern not in ((), (-1,), (1,), (1, -1)) and len(bad_patterns) < 20:
                bad_patterns.append((large, small, targets[0], targets[-1], pattern))
            start_record = (values[0], large, small, targets[0])
            end_record = (values[-1], large, small, targets[-1])
            local_minimum = min(
                (value, large, small, target)
                for value, target in zip(values, targets)
            )
            start_minimum = min(start_minimum, start_record) if start_minimum else start_record
            end_minimum = min(end_minimum, end_record) if end_minimum else end_record
            value_minimum = min(value_minimum, local_minimum) if value_minimum else local_minimum
            trees += 1
    print(
        {
            "trees": trees,
            "max_sign_changes": max_sign_changes,
            "patterns": pattern_counts,
            "bad_patterns": bad_patterns,
            "start_minimum": start_minimum,
            "end_minimum": end_minimum,
            "value_minimum": value_minimum,
        },
        flush=True,
    )


if __name__ == "__main__":
    main()
