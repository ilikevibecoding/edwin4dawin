#!/usr/bin/env python3
"""Diagnostic exact multivariate increment for one cubic boundary cell.

The root is the outer branch A and the extended edge is its pendant a1.
Both spines are in the regular regime length >=2; all five pendants are
symbolic positive lengths.  ``--shift`` is the lower bound on a1.  This is a
probe only: a signed coefficient is an obstruction to this particular cone,
not to the underlying inequality.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from pathlib import Path

from flint import fmpq_mpoly_ctx


ROOT = Path(__file__).resolve().parent
MAX_RANK = 8


def path(order, one, zero):
    rows = []
    for rank in range(MAX_RANK + 1):
        value = one
        for index in range(rank):
            value *= order - rank + 1 - index
        rows.append(value / math.factorial(rank))
    return rows


def product(factors, one, zero):
    values = [one] + [zero] * MAX_RANK
    for factor in factors:
        values = [
            sum((values[i] * factor[k - i] for i in range(k + 1)), zero)
            for k in range(MAX_RANK + 1)
        ]
    return values


def shifted(vector, amount, zero):
    return [zero] * amount + vector[: MAX_RANK + 1 - amount]


def core(lengths, one, zero):
    rows = []
    for left in (0, 1):
        for middle in (0, 1):
            for right in (0, 1):
                rows.append(shifted(product([
                    path(lengths["a1"] - left, one, zero),
                    path(lengths["a2"] - left, one, zero),
                    path(lengths["m"] - middle, one, zero),
                    path(lengths["b1"] - right, one, zero),
                    path(lengths["b2"] - right, one, zero),
                    path(lengths["u"] - 1 - left - middle, one, zero),
                    path(lengths["v"] - 1 - middle - right, one, zero),
                ], one, zero), left + middle + right, zero))
    return [sum((row[k] for row in rows), zero) for k in range(MAX_RANK + 1)]


def deleted_outer_branch(lengths, one, zero):
    rows = []
    for middle in (0, 1):
        for right in (0, 1):
            rows.append(shifted(product([
                path(lengths["a1"], one, zero),
                path(lengths["a2"], one, zero),
                path(lengths["u"] - 1 - middle, one, zero),
                path(lengths["m"] - middle, one, zero),
                path(lengths["v"] - 1 - middle - right, one, zero),
                path(lengths["b1"] - right, one, zero),
                path(lengths["b2"] - right, one, zero),
            ], one, zero), middle + right, zero))
    return [sum((row[k] for row in rows), zero) for k in range(MAX_RANK + 1)]


def residual(c, h, siblings, zero):
    p7 = sum((math.comb(siblings, i) * c[7 - i] for i in range(8)), zero) + h[6]
    p8 = sum((math.comb(siblings, i) * c[8 - i] for i in range(9)), zero) + h[7]
    p9_open = sum((math.comb(siblings, i) * c[9 - i] for i in range(1, 10)), zero)
    return (
        8 * c[7] * h[6] * (16 * p8**2 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * h[6] * p7 * (16 * c[8]**2 - c[7] * c[8])
        - 9 * c[7] * p7 * (14 * h[7]**2 - h[6] * h[7])
    )


def deltas(c, h, zero):
    d0 = residual(c, h, 1, zero)
    return d0, residual(c, h, 2, zero) - d0


def digest(poly):
    body = "".join(
        f"{','.join(map(str, powers))}:{coefficient}\n"
        for powers, coefficient in sorted(poly.terms())
    )
    return hashlib.sha256(body.encode("ascii")).hexdigest().upper()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--shift", type=int, default=4)
    args = parser.parse_args()
    assert args.shift >= 1
    started = time.perf_counter()
    ctx = fmpq_mpoly_ctx.get(("A", "A2", "M", "B1", "B2", "U", "V"), "degrevlex")
    A, A2, M, B1, B2, U, V = ctx.gens()
    one, zero = ctx.constant(1), ctx.constant(0)
    old = {
        "a1": A + args.shift,
        "a2": A2 + 1,
        "m": M + 1,
        "b1": B1 + 1,
        "b2": B2 + 1,
        "u": U + 2,
        "v": V + 2,
    }
    new = {**old, "a1": old["a1"] + 1}
    print("BUILD_OLD", flush=True)
    dc_old = deltas(core(old, one, zero), deleted_outer_branch(old, one, zero), zero)
    print("BUILD_NEW", time.perf_counter() - started, flush=True)
    dc_new = deltas(core(new, one, zero), deleted_outer_branch(new, one, zero), zero)
    rows = {}
    for rank in (0, 1):
        print("SUBTRACT", rank, time.perf_counter() - started, flush=True)
        poly = dc_new[rank] - dc_old[rank]
        negatives = [(p, c) for p, c in poly.terms() if c < 0]
        rows[str(rank)] = {
            "terms": len(poly),
            "negative_coefficients": len(negatives),
            "minimum_coefficient": str(min(poly.coeffs())),
            "maximum_selected_power_with_negative": max((p[0] for p, _ in negatives), default=None),
            "negative_selected_power_histogram": {
                str(power): sum(p[0] == power for p, _ in negatives)
                for power in sorted({p[0] for p, _ in negatives})
            },
            "first_negative_terms": [
                {"powers": list(map(int, p)), "coefficient": str(c)}
                for p, c in negatives[:20]
            ],
            "sha256": digest(poly),
        }
        del poly, negatives
    payload = {
        "schema": "rank8-delta01-e3-cubic-outer-branch-dominant-pendant-probe-agent-v1",
        "status": "PASS_COEFFICIENT_CONE" if all(not r["negative_coefficients"] for r in rows.values()) else "OBSTRUCTION_SIGNED_COEFFICIENTS",
        "shift": args.shift,
        "cell": "outer branch root; extend a1; pendants >=1; spines >=2",
        "ranks": rows,
        "runtime_seconds": time.perf_counter() - started,
    }
    out = ROOT / f"rank8_delta01_e3_cubic_outer_branch_dominant_pendant_shift{args.shift}_probe_agent_20260822.json"
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"], rows, flush=True)
    print("OUTPUT", digest.__name__, hashlib.sha256(out.read_bytes()).hexdigest().upper(), flush=True)


if __name__ == "__main__":
    main()
