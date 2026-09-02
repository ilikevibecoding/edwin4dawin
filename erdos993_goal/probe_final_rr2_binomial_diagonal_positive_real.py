#!/usr/bin/env python3
"""Probe the positive-real reserve pair after isolating the final RR2 array.

For a final bivariate coefficient array K and N=r+d, the reserve is

  R_j = C(r,j) sum_{h=0}^{r-j} C(r-j,h) K[N-h,N-j].

This removes the earlier A^a T^b construction and tests the proposed
abstract reverse-TP2 -> positive-real transform directly.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from analyze_original_reserve_pencil_crossings import product


OUTPUT_PATH = Path("final_rr2_binomial_diagonal_positive_real_probe_20260802.json")


def reserve(K, r: int, d: int):
    N = r + d
    return [
        math.comb(r, j)
        * sum(
            math.comb(r - j, h) * K.get((N - h, N - j), 0)
            for h in range(r - j + 1)
        )
        for j in range(r + 1)
    ]


def multiply_one(values):
    out = [0] * (len(values) + 1)
    for j, value in enumerate(values):
        out[j] += value
        out[j + 1] += value
    return out


def real_numerator(A, B):
    ae = [v if j % 2 == 0 else -v for j, v in enumerate(A[0::2])]
    ao = [v if j % 2 == 0 else -v for j, v in enumerate(A[1::2])]
    be = [v if j % 2 == 0 else -v for j, v in enumerate(B[0::2])]
    bo = [v if j % 2 == 0 else -v for j, v in enumerate(B[1::2])]
    ee, oo = product(ae, be), product(ao, bo)
    return [
        (ee[k] if k < len(ee) else 0)
        + (oo[k - 1] if 0 <= k - 1 < len(oo) else 0)
        for k in range(max(len(ee), len(oo) + 1))
    ]


def dense_reverse_tp(rng: random.Random, N: int):
    # Strict reverse-TP2 kernel, with arbitrary positive row/column scalings.
    row = [rng.randint(1, 9) for _ in range(N + 1)]
    col = [rng.randint(1, 9) for _ in range(N + 1)]
    cap = N * N
    return {
        (i, j): row[i] * col[j] * 2 ** (cap - i * j)
        for i in range(N + 1)
        for j in range(N + 1)
    }


def main():
    rng = random.Random(99302)
    failures = []
    records = []
    for trial in range(500):
        r = rng.randint(2, 18)
        d = rng.randint(0, 12)
        N = r + d
        K = dense_reverse_tp(rng, N)
        current = reserve(K, r, d)
        previous = reserve(K, r - 1, d)
        J = real_numerator(current, multiply_one(previous))
        negative = [k for k, value in enumerate(J) if value < 0]
        zero = [k for k, value in enumerate(J) if value == 0]
        records.append({"r": r, "d": d, "negative": negative, "zero": zero})
        if negative:
            failures.append({"trial": trial, "r": r, "d": d, "negative": negative})
            if len(failures) >= 12:
                break
    report = {
        "status": "PASS_FINAL_RR2_TRANSFORM_PROBE" if not failures else "FINAL_RR2_TRANSFORM_FAILURE",
        "planned_trials": 500,
        "completed_trials": len(records),
        "failure_count": len(failures),
        "first_failures": failures,
        "warning": "Finite exact probe only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
