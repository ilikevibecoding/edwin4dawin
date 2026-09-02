#!/usr/bin/env python3
"""Exact adversarial stress test for the recursive shadow-phi block.

The star-fork family used here is the same family that falsifies
ordinary and quantitative rooted ratio-dominance shortcuts.  The root
v has two leaf neighbors and one inward neighbor; the inward neighbor
has t child centers, each with m leaves.  The pruned support s is one
child center.

For a rooted state with E=I(B-v) and R=I(B-N[v]), put

  F_q(E,R)=2M^2+2X(M-r)+(2q-1)(Mt-Xr),

where M=E_(q-1), X=E_q, r=R_(q-1), t=R_q.  One quarter of the
shadow-phi phase block is F_q.  The recursive candidate is

  F_q(new)-F_q(old)-F_(q-1)(support_deleted) >= 0.

All polynomial coefficients and signs below are computed exactly with
FLINT integers.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from flint import fmpz_poly


X_POLY = fmpz_poly([0, 1])
BINOMIAL = fmpz_poly([1, 1])


def coefficient(poly: fmpz_poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def shadow_functional(
    rank_q: int,
    outer: fmpz_poly,
    inner: fmpz_poly,
) -> tuple[int, int]:
    M = coefficient(outer, rank_q - 1)
    X = coefficient(outer, rank_q)
    r = coefficient(inner, rank_q - 1)
    t = coefficient(inner, rank_q)
    determinant = M * t - X * r
    value = (
        2 * M * M
        + 2 * X * (M - r)
        + (2 * rank_q - 1) * determinant
    )
    return value, determinant


def audit_family(
    m: int,
    t: int,
    half_window: int,
) -> list[dict]:
    star = BINOMIAL**m + X_POLY
    rest = star ** (t - 1)
    old_inner = rest * star
    old_leaf_bundle = BINOMIAL ** (m * t)
    old_inward = old_inner + X_POLY * old_leaf_bundle
    old_outer = BINOMIAL**2 * old_inward

    larger_star = BINOMIAL ** (m + 1) + X_POLY
    new_inner = rest * larger_star
    new_leaf_bundle = BINOMIAL ** (m * t + 1)
    new_inward = new_inner + X_POLY * new_leaf_bundle
    new_outer = BINOMIAL**2 * new_inward

    rest_leaf_bundle = BINOMIAL ** (m * (t - 1))
    lower_inward = BINOMIAL**m * (
        rest + X_POLY * rest_leaf_bundle
    )
    lower_outer = BINOMIAL**2 * lower_inward
    lower_inner = BINOMIAL**m * rest

    center = (m * t + 4) // 2
    rows = []
    for q in range(center - half_window, center + half_window + 1):
        old_value, old_det = shadow_functional(
            q, old_outer, old_inner
        )
        new_value, _ = shadow_functional(
            q, new_outer, new_inner
        )
        lower_value, _ = shadow_functional(
            q - 1, lower_outer, lower_inner
        )
        recursive = new_value - old_value - lower_value
        rows.append(
            {
                "m": m,
                "t": t,
                "rank_q": q,
                "old_PIRD_determinant_sign": (
                    1 if old_det > 0 else (-1 if old_det < 0 else 0)
                ),
                "old_shadow_functional_sign": (
                    1
                    if old_value > 0
                    else (-1 if old_value < 0 else 0)
                ),
                "recursive_shadow_block_sign": (
                    1
                    if recursive > 0
                    else (-1 if recursive < 0 else 0)
                ),
                "recursive_shadow_block_bit_length": (
                    abs(recursive).bit_length()
                ),
            }
        )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--half-window", type=int, default=10)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_shadow_star_fork_stress_20260729.json"
        ),
    )
    args = parser.parse_args()

    rows = []
    for m, t in ((10, 1075), (15, 1200), (23, 2000)):
        rows.extend(audit_family(m, t, args.half_window))
    failures = [
        row
        for row in rows
        if row["recursive_shadow_block_sign"] < 0
    ]
    pird_negative_controls = sum(
        row["old_PIRD_determinant_sign"] < 0 for row in rows
    )
    if not pird_negative_controls:
        raise AssertionError("adversarial PIRD control did not trigger")
    report = {
        "status": (
            "PASS_RECURSIVE_SHADOW_BLOCK_STAR_FORK_STRESS"
            if not failures
            else "FAIL_RECURSIVE_SHADOW_BLOCK_STAR_FORK_STRESS"
        ),
        "families": [
            {"m": 10, "t": 1075},
            {"m": 15, "t": 1200},
            {"m": 23, "t": 2000},
        ],
        "half_window": args.half_window,
        "checked_ranks": len(rows),
        "negative_PIRD_control_ranks": pird_negative_controls,
        "recursive_failure_count": len(failures),
        "recursive_failures": failures[:20],
        "rows": rows,
        "warning": (
            "This is exact adversarial finite evidence, not a proof "
            "of the recursive shadow inequality."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
