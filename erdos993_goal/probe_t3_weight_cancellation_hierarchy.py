#!/usr/bin/env python3
"""Iterate normalized-CDF cancellations for t=3 residual weights."""

from probe_t3_weight_unimodality import weight_matrix


def normalize(row):
    total = sum(row)
    return [value / total for value in row]


def child(first, second):
    first = normalize(first)
    second = normalize(second)
    cumulative = 0
    out = []
    for b in range(len(second)):
        cumulative += second[b] - first[b]
        out.append(cumulative)
    return out


def hierarchy(q):
    levels = []
    current = [row[: q - p] for p, row in enumerate(weight_matrix(q))]
    levels.append(current)
    while len(current) > 1:
        next_level = []
        for p in range(len(current) - 1):
            assert len(current[p]) == len(current[p + 1]) + 1
            next_level.append(child(current[p], current[p + 1]))
        levels.append(next_level)
        current = next_level
    return levels


def main():
    for q in range(3, 41):
        levels = hierarchy(q)
        values = [value for level in levels for row in level for value in row]
        bad = [value for value in values if value <= 0]
        if bad:
            print(f"q={q} FAIL bad={bad[:3]}")
            return
        print(
            f"q={q} PASS levels={len(levels)} positive_weights={len(values)}",
            flush=True,
        )


if __name__ == "__main__":
    main()
