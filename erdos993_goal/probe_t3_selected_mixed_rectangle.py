#!/usr/bin/env python3
"""Audit a selected rectangle of the t=3 symmetric mixed kernel.

For q=2m+2, retain only the last m (lowest-degree) coefficient columns of
the t=3 mixed kernel.  This is a strictly weaker target than total
positivity of the full q-square symmetric kernel, but it is not by itself
the actual selected coefficient quotient used in the final Erdos reduction.
"""

from fractions import Fraction as F

from probe_beta_newton_compressed_factor import neville_pair
from probe_mixed_kernel_root_scan import mixed_kernel
from probe_newton_full_neville_patterns import neville_parameters


def selected_rectangle(m):
    q = 2 * m + 2
    return [row[q - m :] for row in mixed_kernel(q, F(3))]


def fmt(value):
    if value.denominator == 1:
        return str(value.numerator)
    return f"{value.numerator}/{value.denominator}"


def main():
    for m in range(1, 31):
        rectangle = selected_rectangle(m)
        forward, transpose = neville_pair(rectangle)
        if forward["status"] != "PASS" or transpose["status"] != "PASS":
            print(f"m={m} FAIL forward={forward} transpose={transpose}")
            return
        print(
            f"m={m} PASS forward_multipliers={forward['positive']} "
            f"transpose_multipliers={transpose['positive']}",
            flush=True,
        )

    for m in range(1, 6):
        rectangle = selected_rectangle(m)
        forward, pivots = neville_parameters(rectangle)
        transpose, _ = neville_parameters([list(row) for row in zip(*rectangle)])
        print(f"\nm={m}")
        print("F", [[fmt(v) for _, v in level] for level in forward])
        print("T", [[fmt(v) for _, v in level] for level in transpose])
        print("P", [fmt(v) for v in pivots])


if __name__ == "__main__":
    main()
