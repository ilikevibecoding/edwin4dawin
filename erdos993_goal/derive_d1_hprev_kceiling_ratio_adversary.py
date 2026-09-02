#!/usr/bin/env python3
"""Search-only map of K-ceiling / canonical-H previous-row ratios."""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb

from audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary import coefficient
from prove_d1_spider_quantitative_qgap_cap_adversary import (
    h_concentrated_row,
    k_coefficient_ceiling,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--s-max", type=int, default=100)
    parser.add_argument("--j-max", type=int, default=60)
    args = parser.parse_args()
    maximum = None
    failures = []
    dmin_failures = []
    checks = 0
    # Candidate simple domination: Kmax_(j-1)/Hc_(j-1) <= Y/R.
    for S in range(14, args.s_max + 1):
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                H = h_concentrated_row(R, T, Y)
                for rank in range(5, min(args.j_max, S) + 1):
                    hp = coefficient(H, rank - 1)
                    kc = k_coefficient_ceiling(T, Y, rank - 1)[0]
                    if not hp:
                        assert not kc
                        continue
                    ratio = Fraction(kc, hp)
                    record = (ratio, S, rank, R, T, Y, kc, hp)
                    maximum = record if maximum is None else max(maximum, record)
                    if ratio > Fraction(Y, R) and len(failures) < 20:
                        failures.append(record)
                    dmin = (
                        (Y - 1) * (comb(S - rank - 2, rank - 2)
                                   if S - rank - 2 >= rank - 2 >= 0 else 0)
                        + (R - Y) * (comb(S - rank - 1, rank - 2)
                                     if S - rank - 1 >= rank - 2 >= 0 else 0)
                    )
                    if kc > dmin and len(dmin_failures) < 30:
                        dmin_failures.append(
                            (kc - dmin, S, rank, R, T, Y, kc, dmin)
                        )
                    checks += 1
    print("SEARCH_ONLY")
    print("checks", checks)
    print("maximum", maximum)
    print("Y_over_R_failures", failures)
    print("Kceiling_over_Dmin_failures", dmin_failures)


if __name__ == "__main__":
    main()
