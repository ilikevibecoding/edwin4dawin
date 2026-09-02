#!/usr/bin/env python3
"""Literal exact sign search for the distance-six double-broom m=0 margin."""

from fractions import Fraction

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    DISTANCE,
    core_terms,
    fixed_coefficient,
)


def main():
    cells = 0
    minimum = None
    negatives = []
    for small_int in range(1, 9):
        for large_int in range(small_int, 21):
            large = Fraction(large_int)
            small = Fraction(small_int)
            f_terms, z_terms = core_terms(DISTANCE, large, small)
            n = large_int + small_int
            order = n + DISTANCE + 1
            independent = [
                fixed_coefficient(f_terms, rank, large, small)
                for rank in range(order + 1)
            ]
            one_edge = [
                fixed_coefficient(z_terms, rank, large, small)
                for rank in range(order + 1)
            ]
            f2 = independent[2]
            p0 = independent[3] + 2 * f2 + order
            r0 = one_edge[4] + 2 * one_edge[3] + one_edge[2]
            c0 = one_edge[3] + 2 * f2
            determinant = p0 * c0 - f2 * r0
            assert determinant > 0
            for target in range(4, n + 4):
                # Skip unsupported zero row at the far endpoint if present.
                fj = independent[target]
                if fj == 0:
                    continue
                value = (
                    (target + 1) * f2 * determinant
                    * (independent[target + 1] + 2 * fj + independent[target - 1])
                    + f2 * p0 * (
                        (target + 1) * fj * (c0 + r0)
                        - 3 * (p0 + f2) * (one_edge[target + 1] + 2 * fj)
                    )
                )
                assert value.denominator == 1
                integer = value.numerator
                record = (integer, large_int, small_int, target)
                if minimum is None or record < minimum:
                    minimum = record
                if integer <= 0:
                    negatives.append(record)
                    print("NONPOSITIVE", record, flush=True)
                    if len(negatives) >= 20:
                        print("STOP", cells, minimum, negatives)
                        return
                cells += 1
    print("DONE", cells, minimum, negatives)


if __name__ == "__main__":
    main()
