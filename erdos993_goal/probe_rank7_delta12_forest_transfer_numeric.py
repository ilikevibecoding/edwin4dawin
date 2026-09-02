#!/usr/bin/env python3
"""Low-memory numerical screen for a rooted-C7-free Delta1/2 endpoint.

For H=A-q (a forest of order n-1), the sharp forest rank-(4,5) ratio
followed by the discrete extension-moment transfer gives

    h6/h5 >= lambda_n = PhiTransfer(tau_n)/6,
    tau_n=(n-8)(n-9)/(n-4).

Hence d=h6/c6 >= lambda_n*s*z.  This script only screens the resulting
endpoint over the existing exact coefficient boxes; it is not a proof.
"""

from __future__ import annotations

import itertools
import json
import math
from pathlib import Path

from prove_rank7_terminal_broom_delta0_large import normalized_low
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def phi_transfer(t: float) -> float:
    q = math.floor(t)
    # Phi linearly interpolates Phi(q)=C(q-1,2).
    phi = (q - 1) * (q - 2) / 2 + (q - 1) * (t - q)
    return 2 * phi / t


def values(lo: float, hi: float, steps: int = 5):
    return [lo + (hi - lo) * j / (steps - 1) for j in range(steps)]


def main() -> int:
    expressions = {}
    variables = {}
    for rank in (1, 2):
        expression, symbols = normalized_low(rank)
        expressions[rank] = expression
        variables[rank] = symbols

    import sympy as sp

    funcs = {
        rank: sp.lambdify(variables[rank], expressions[rank], "math")
        for rank in (1, 2)
    }
    minima = {1: (float("inf"), None), 2: (float("inf"), None)}
    invalid = []
    residual = json.loads(
        Path("rank7_rooted_cross_residual_after_b2_4_exact_20260816.json").read_text()
    )["residual"]["cells"]
    residual_pairs = {
        (n, m) for n in range(25, 39) for m in range(n - 8, n - 1)
    }
    for n, m in sorted(residual_pairs):
        tau = (n - 8) * (n - 9) / (n - 4)
        # Diagnostic stronger conjectural path-ratio endpoint for H.
        # (Kept as a screen only; no theorem is asserted here.)
        lam = (n - 10) * (n - 11) / (6 * (n - 5))
        t_n = (n - 7) * (n - 8) / (n - 3)
        c5_lower = math.comb(n - 4, 5)
        s_low = max(0.0, 1 - math.comb(m, 4) / c5_lower)
        # Coefficientwise path minimality on the forest J and the star
        # upper extremum on the n-vertex tree A give a valid coarse cap.
        s_high = 1 - math.comb(max(m - 3, 0), 4) / math.comb(n - 1, 5)
        for rank in (1, 2):
            if rank == 1:
                coeff_rows = []
                for y in values(5 / (n - 4), 5 / t_n):
                    for d5 in values((2 + y) / 12, 1 / 6 + y / 2):
                        coeff_rows.append((1.0, y, y / (1 - d5)))
            else:
                coeff_rows = []
                for x in values(4 / (n - 3), 4 * (n - 2) / ((n - 5) * (n - 6))):
                    for d4 in values((2 + x) / 10, float(D4_CEILING)):
                        y = x / (1 - d4)
                        for d5 in values((2 + y) / 12, 1 / 6 + y / 2):
                            coeff_rows.append((x, y, y / (1 - d5)))
            for x, y, z in coeff_rows:
                for q in ((2 + z) / 14, 1 / 7 + z / 2):
                    for s in values(1 - y, 1.0):
                        d = max(
                            1 - z * (m - 4) * (1 - s) / 5,
                            1 - s * z,
                        )
                        if d > 1 + 1e-12:
                            invalid.append((rank, n, m, x, y, z, q, s, d))
                            continue
                        val = funcs[rank](x, y, z, q, s, d)
                        if val < minima[rank][0]:
                            minima[rank] = (
                                val,
                                (n, m, x, y, z, q, s, d, lam),
                            )
    for rank in (1, 2):
        print("rank", rank, "minimum", minima[rank][0])
        print("witness", minima[rank][1])
    print("invalid_lower_endpoint_rows", len(invalid))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
