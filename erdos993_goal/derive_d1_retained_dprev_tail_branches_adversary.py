#!/usr/bin/env python3
"""Search-only branch map for the retained-Dprev d=1 terminal-m0 lane.

This script deliberately records exact coefficient signs and canonical-row
support.  It is not a sign certificate and must not be cited as an all-order
theorem.
"""

from __future__ import annotations

import argparse
from collections import Counter
from fractions import Fraction

from audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary import (
    block_data,
)
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--s-max", type=int, default=120)
    parser.add_argument("--j-max", type=int, default=50)
    args = parser.parse_args()

    branch_counts: Counter[tuple[str, str, str, str]] = Counter()
    last_negative_bh = None
    last_negative_bk = None
    checks = 0

    for S in range(14, args.s_max + 1):
        N = S + 1
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                for rank in range(5, min(args.j_max, S) + 1):
                    data = block_data(N, rank, R, T, Y)
                    lead = Fraction(data["lead"])
                    BH = Fraction(data["BH"])
                    BK = Fraction(data["BK"])
                    if BH < 0:
                        last_negative_bh = (N, rank, R, T, Y, BH)
                    if BK < 0:
                        last_negative_bk = (N, rank, R, T, Y, BK)
                    branch_counts[
                        (
                            str(data["H_cap_branch"]),
                            str(data["K_cap_branch"]),
                            "BH+" if BH >= 0 else "BH-",
                            "BK+" if BK >= 0 else "BK-",
                        )
                    ] += 1
                    checks += 1

    print("SEARCH_ONLY")
    print("checks", checks)
    print("branch_counts")
    for key, value in sorted(branch_counts.items()):
        print(key, value)
    print("last_negative_bh", last_negative_bh)
    print("last_negative_bk", last_negative_bk)


if __name__ == "__main__":
    main()
