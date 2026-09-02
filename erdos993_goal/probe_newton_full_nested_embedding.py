#!/usr/bin/env python3
"""Test diagonal nesting of consecutive full Newton-coordinate matrices."""

from itertools import combinations

from probe_newton_full_neville_patterns import transformed
from probe_selected_nested_embedding import diagonally_equivalent


def embeddings(q):
    small = transformed(q)
    large = transformed(q + 1)
    hits = []
    for deleted_row in range(q + 1):
        kept_rows = [row for row in range(q + 1) if row != deleted_row]
        for deleted_column in range(q + 1):
            kept_columns = [
                column for column in range(q + 1) if column != deleted_column
            ]
            candidate = [
                [large[row][column] for column in kept_columns]
                for row in kept_rows
            ]
            gauges = diagonally_equivalent(small, candidate)
            if gauges is not None:
                hits.append((deleted_row, deleted_column))
    return hits


def embeddings_two_step(q):
    small = transformed(q)
    large = transformed(q + 2)
    hits = []
    for deleted_rows in combinations(range(q + 2), 2):
        kept_rows = [row for row in range(q + 2) if row not in deleted_rows]
        for deleted_columns in combinations(range(q + 2), 2):
            kept_columns = [
                column
                for column in range(q + 2)
                if column not in deleted_columns
            ]
            candidate = [
                [large[row][column] for column in kept_columns]
                for row in kept_rows
            ]
            if diagonally_equivalent(small, candidate) is not None:
                hits.append((deleted_rows, deleted_columns))
    return hits


def main():
    for q in range(2, 11):
        print(f"q={q} hits={embeddings(q)}")
    for q in range(2, 8):
        print(f"q={q} two_step_hits={embeddings_two_step(q)}")


if __name__ == "__main__":
    main()
