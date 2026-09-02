#!/usr/bin/env python3
"""Test one- and two-step diagonal nesting of the t=1 quotient matrices."""

from fractions import Fraction as F
from itertools import combinations

from probe_selected_nested_embedding import diagonally_equivalent
from probe_switch_gauge_quotient import confluent_quotient


def matrix(q):
    return confluent_quotient(q, F(1))


def one_step(q):
    small, large = matrix(q), matrix(q + 1)
    hits = []
    for deleted_row in range(q + 1):
        rows = [i for i in range(q + 1) if i != deleted_row]
        for deleted_column in range(q + 1):
            columns = [j for j in range(q + 1) if j != deleted_column]
            candidate = [[large[i][j] for j in columns] for i in rows]
            if diagonally_equivalent(small, candidate) is not None:
                hits.append((deleted_row, deleted_column))
    return hits


def two_step(q):
    small, large = matrix(q), matrix(q + 2)
    hits = []
    for deleted_rows in combinations(range(q + 2), 2):
        rows = [i for i in range(q + 2) if i not in deleted_rows]
        for deleted_columns in combinations(range(q + 2), 2):
            columns = [j for j in range(q + 2) if j not in deleted_columns]
            candidate = [[large[i][j] for j in columns] for i in rows]
            if diagonally_equivalent(small, candidate) is not None:
                hits.append((deleted_rows, deleted_columns))
    return hits


def main():
    for q in range(2, 10):
        print(f"q={q} one_step={one_step(q)}")
    for q in range(2, 8):
        print(f"q={q} two_step={two_step(q)}")


if __name__ == "__main__":
    main()
