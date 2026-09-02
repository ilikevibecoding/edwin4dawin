#!/usr/bin/env python3
"""Search abstract deletion windows for full-square reserve failures.

The windows satisfy C_j<=B_j and 0<=q_F,q_T<=4 but need not be
independence-polynomial windows.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path


def grid(rng: random.Random, low: int, high: int, den: int) -> Fraction:
    return Fraction(rng.randint(low, high), den)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=2_000_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--live-only", action="store_true")
    parser.add_argument(
        "--require-lower-c12",
        action="store_true",
        help=(
            "enforce the inductive terminal inequality "
            "2(r+1)q_T >= r q_link"
        ),
    )
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    rng = random.Random(args.seed)

    negative_cross = live_negative = checked = 0
    first_failure = None
    for sample in range(args.samples):
        r = rng.randint(6, 200)
        k = r + 1
        bm = Fraction(1)
        x = grid(rng, 1, 500, 100)
        b = x
        qf = grid(rng, 0, 400, 100)
        w = 1 + r * x - qf
        if w <= 0:
            continue
        bp = b * w / k
        cm = grid(rng, 0, 100, 100)
        c = grid(rng, 0, 100, 100) * b
        if cm == 0 and c > 0:
            continue
        a = b + cm
        ap = bp + c
        v = k * ap / a
        zeta = v - k * x
        if zeta <= 0:
            continue
        negative_cross += 1
        live = x > 1 or v > k
        if live:
            live_negative += 1
        if args.live_only and not live:
            continue

        qt = grid(rng, 0, 400, 100)
        next_mean = 1 + v - qt
        if next_mean < 0:
            continue
        app = ap * next_mean / (k + 1)
        cp_max = min(bp, app)
        cp = grid(rng, 0, 100, 100) * cp_max
        bpp = app - cp
        assert bpp >= 0 and 0 <= cp <= bp
        next_f_mean = (k + 1) * bpp / bp
        next_qf = 1 + w - next_f_mean
        if not (0 <= next_qf <= 4):
            continue
        if cm > 0 and c > 0:
            link_q = 1 + r * c / cm - k * cp / c
            if not (0 <= link_q <= 4):
                continue
            if (
                args.require_lower_c12
                and 2 * k * qt < r * link_q
            ):
                continue

        reserve_t = k - v + v * qt
        reserve_f = r - r * b + r * b * qf
        if reserve_t < 0 or reserve_f < 0:
            continue
        margin = reserve_t - zeta * zeta
        checked += 1
        if margin < 0:
            first_failure = {
                "sample": sample,
                "r": r,
                "live": live,
                "bm": str(bm),
                "b": str(b),
                "bp": str(bp),
                "bpp": str(bpp),
                "cm": str(cm),
                "c": str(c),
                "cp": str(cp),
                "q_F": str(qf),
                "q_T": str(qt),
                "q_F_next": str(next_qf),
                "q_link": (
                    str(link_q)
                    if cm > 0 and c > 0
                    else None
                ),
                "v": str(v),
                "zeta": str(zeta),
                "R_T": str(reserve_t),
                "R_F": str(reserve_f),
                "margin": str(margin),
            }
            break

    report = {
        "status": (
            "COUNTEREXAMPLE_TO_ABSTRACT_FULL_SQUARE"
            if first_failure is not None
            else "PASS_FINITE_AUDIT_NOT_PROOF"
        ),
        "scope_warning": (
            "The coefficient windows need not be realizable by "
            "independence polynomials."
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "negative_cross_draws": negative_cross,
        "live_negative_cross_draws": live_negative,
        "fully_checked_draws": checked,
        "first_failure": first_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
