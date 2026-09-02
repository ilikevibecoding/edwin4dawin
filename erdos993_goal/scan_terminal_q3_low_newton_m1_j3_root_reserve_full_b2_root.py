#!/usr/bin/env python3
"""Interior-B2 diagnostic for tree Newton m=1 at target j=3.

This independently evaluates every integer B2 in the relaxed root-motif
interval.  It is finite search evidence, not an all-order proof.
"""

from __future__ import annotations

import argparse
import numpy as np

import scan_terminal_q3_low_newton_m1_root_partition_fast_agent as base


def evaluate(
    N: int,
    d: int,
    R: np.ndarray,
    B2: np.ndarray,
    y_mode: str = "all",
    tau_mode: str = "all",
    u_mode: str = "all",
):
    S = N - d
    W = N - 1 + B2
    a = base.c2(N) - S
    P = W - base.c2(d) - R
    z2 = S * (N - 2) - 2 * P
    h2 = base.c2(S) - (S - R)
    b = base.c3(N) - S * (N - 2) + P

    reserve = (8 * h2 + 2 * a - z2) / (6 * a)
    hbin = np.divide(base.c3(S), b, out=np.zeros_like(B2), where=b > 0)
    if y_mode == "hbin":
        ycap = np.minimum(np.ones_like(B2), hbin)
    elif y_mode == "reserve_hbin":
        ycap = np.minimum.reduce((np.ones_like(B2), reserve, hbin))
    elif y_mode == "all":
        ycap = np.minimum.reduce((
            np.ones_like(B2), np.full_like(B2, S / d), reserve, hbin,
        ))
    else:
        raise ValueError(y_mode)
    ycap = np.maximum(0.0, ycap)

    b3max = base.c3(d - 1) + base.c3(R) + base.c3(S - R)
    tz = (N - 3) * B2 / 3
    ta = b3max + (d - 1) * R + np.maximum(R, S - R) * (S - R) - (N - 2)
    L = B2 - base.c2(d - 1)
    tl = base.c3(d - 1) + (d - 2) * (R - 1) + 3 * L + 4 * (S - 2) * L / 3
    if tau_mode == "low":
        tcap = tl
    elif tau_mode == "low_zagreb":
        tcap = np.minimum(tz, tl)
    elif tau_mode == "all":
        tcap = np.minimum.reduce((tz, ta, tl))
    else:
        raise ValueError(tau_mode)
    tcap = np.maximum(0.0, tcap)

    f4floor = (
        base.c3(N) * (N - 3) / 4
        - S * base.c2(N - 2) + P * (N - 4)
        + base.c2(S) - base.c3(S)
    )
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    c0 = a + z2 + h2
    a1bar = p0 + N + 2 + 2 * W + (c0 - a) * p1 / a

    candidates = []
    labels = []
    rank4_minus_coupled_zero = f4floor / b + 1 + h2 / b - (N - 3) / 4
    rank4_minus_coupled_slope = (N - 9) / (2 * (N - 3))
    ycross = np.clip(
        -rank4_minus_coupled_zero / rank4_minus_coupled_slope,
        0.0, ycap,
    )
    for yn, y in (("y0", np.zeros_like(B2)),
                  ("yhalf", np.where(ycap >= 0.5, 0.5, ycap)),
                  ("ycross", ycross),
                  ("ycap", ycap)):
        for tn, tau in (("tau0", np.zeros_like(B2)), ("taucap", tcap)):
            coupled, component = base.gaps(3, N - 3, d, R, B2, tau, y)
            rank4u0 = f4floor / b + 1 + y + h2 / b
            componentu0 = (d + 1) / 4 + y + 3 * y / (N - 3)
            rank4 = component + 4 * a * a1bar * (rank4u0 - componentu0)
            if u_mode == "coupled":
                value = coupled
            elif u_mode == "rank4":
                value = rank4
            elif u_mode == "blend25":
                value = (3 * coupled + rank4) / 4
            elif u_mode == "blend50":
                value = (coupled + rank4) / 2
            elif u_mode == "blend75":
                value = (coupled + 3 * rank4) / 4
            elif u_mode == "coupled_rank4":
                value = np.maximum(coupled, rank4)
            elif u_mode == "all":
                value = np.maximum.reduce((coupled, component, rank4))
            else:
                raise ValueError(u_mode)
            candidates.append(value)
            labels.append((yn, tn))
    values = np.minimum.reduce(candidates)
    return values, ycap, tcap, labels, candidates


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=60)
    parser.add_argument("--y-mode", choices=("hbin", "reserve_hbin", "all"), default="all")
    parser.add_argument("--tau-mode", choices=("low", "low_zagreb", "all"), default="all")
    parser.add_argument(
        "--u-mode",
        choices=("coupled", "rank4", "blend25", "blend50", "blend75", "coupled_rank4", "all"),
        default="all",
    )
    args = parser.parse_args()
    minimum = None
    checks = 0
    for N in range(15, args.max_order + 1):
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
            values, ycap, tcap, labels, candidates = evaluate(
                N, d, R, B2, args.y_mode, args.tau_mode, args.u_mode
            )
            checks += int(values.size * len(candidates))
            idx = int(np.argmin(values))
            branch = int(np.argmin([row[idx] for row in candidates]))
            item = (
                float(values[idx]), N, d, int(R[idx]), int(B2[idx]),
                float(ycap[idx]), float(tcap[idx]), labels[branch],
            )
            if minimum is None or item[0] < minimum[0]:
                minimum = item
            if item[0] < -1e-6:
                print("first_negative", item, "checks", checks)
                return
        if N in (15, 20, 30, 40, 50, 60, args.max_order):
            print("through", N, "minimum", minimum, "checks", checks, flush=True)
    print("minimum", minimum)
    print("checks", checks)
    print("negatives", [])


if __name__ == "__main__":
    main()
