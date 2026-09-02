#!/usr/bin/env python3
"""Ablate the correlated bounds in the candidate j=3,m=1 proof."""

from __future__ import annotations

import numpy as np

import scan_terminal_q3_low_newton_m1_root_partition_fast_agent as base
from scan_terminal_q3_low_newton_m1_j3_root_reserve_full_b2_root import evaluate


CASES = [
    ("hbin", "low", "coupled"),
    ("hbin", "low", "coupled_rank4"),
    ("hbin", "low", "all"),
    ("hbin", "low_zagreb", "all"),
    ("hbin", "all", "all"),
    ("reserve_hbin", "low", "all"),
    ("reserve_hbin", "all", "all"),
    ("all", "low", "all"),
    ("all", "all", "all"),
]


def main() -> None:
    active = {case: True for case in CASES}
    minima = {case: None for case in CASES}
    failures = {}
    for N in range(15, 41):
        for d in range(1, N + 1):
            S = N - d
            rbase = np.array([0], dtype=np.int64) if S == 0 else np.arange(1, S + 1)
            rparts = []
            bparts = []
            for rv in rbase:
                lo = int(base.c2(d - 1))
                hi = int(lo + base.c2(rv) + base.c2(S - rv))
                rparts.append(np.full(hi - lo + 1, rv, dtype=np.float64))
                bparts.append(np.arange(lo, hi + 1, dtype=np.float64))
            R = np.concatenate(rparts)
            B2 = np.concatenate(bparts)
            for case in CASES:
                if not active[case]:
                    continue
                values, ycap, tcap, labels, rows = evaluate(
                    N, d, R, B2, *case
                )
                idx = int(np.argmin(values))
                branch = int(np.argmin([row[idx] for row in rows]))
                item = (
                    float(values[idx]), N, d, int(R[idx]), int(B2[idx]),
                    float(ycap[idx]), float(tcap[idx]), labels[branch],
                )
                if minima[case] is None or item[0] < minima[case][0]:
                    minima[case] = item
                if item[0] < -1e-6:
                    active[case] = False
                    failures[case] = item
        print("through", N, "active", [case for case in CASES if active[case]], flush=True)
    print("minima")
    for case in CASES:
        print(case, minima[case], "failure", failures.get(case))


if __name__ == "__main__":
    main()
