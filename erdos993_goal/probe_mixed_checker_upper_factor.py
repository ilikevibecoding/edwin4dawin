#!/usr/bin/env python3
"""Extract the upper factor after the simple forward Neville elimination."""

from fractions import Fraction as F

from probe_mixed_checker_neville import checked_inverse


def upper_factor(q):
    work = [row[:] for row in checked_inverse(q)]
    for column in range(q - 1):
        expected = work[column + 1][column] / work[column][column]
        assert expected == F(1, q + 3 - column)
        for row in range(q - 1, column, -1):
            multiplier = work[row][column] / work[row - 1][column]
            assert multiplier == expected
            for j in range(column, q):
                work[row][j] -= multiplier * work[row - 1][j]
    assert all(work[i][j] == 0 for i in range(q) for j in range(i))
    return work


def fmt(v):
    return str(v.numerator) if v.denominator == 1 else f"{v.numerator}/{v.denominator}"


def main():
    for q in range(2, 9):
        upper = upper_factor(q)
        print(f"\nq={q}")
        print("diagonal", [fmt(upper[i][i]) for i in range(q)])
        print("row-diagonal normalized")
        for i in range(q):
            print(" ", [fmt(upper[i][j] / upper[i][i]) for j in range(i, q)])


if __name__ == "__main__":
    main()
