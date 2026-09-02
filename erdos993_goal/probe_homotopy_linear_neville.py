#!/usr/bin/env python3
"""Print Neville parameters of the shifted strict-upper coefficient B."""

from __future__ import annotations

import argparse

from probe_newton_full_neville_patterns import neville_parameters
from verify_newton_checker_offdiag_homotopy import constant_and_linear


def compact(x):
    return f"{x.numerator}/{x.denominator}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--q", type=int, default=8)
    args = parser.parse_args()
    _, b = constant_and_linear(args.q)
    shifted = [[b[i][j + 1] for j in range(args.q - 1)] for i in range(args.q - 1)]
    for orientation, matrix in (
        ("transpose", [list(row) for row in zip(*shifted)]),
    ):
        parameters, pivots = neville_parameters(matrix)
        print(orientation, "pivots", [compact(x) for x in pivots])
        for c, level in enumerate(parameters):
            print(c, [(r, compact(x)) for r, x in level])


if __name__ == "__main__":
    main()
