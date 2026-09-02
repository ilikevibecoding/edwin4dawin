#!/usr/bin/env python3
"""Exact one-unit extension-drift scan of Galvin's two-phase tree family.

For integers m,t >= 1, the rooted construction used by Galvin has

    E_t(x) = (1+2x)^t,
    A_t(x) = E_t(x) + x(1+x)^t,
    I(T_{m,t};x) = A_t(x)^m + x E_t(x)^m.

The family has log-concavity failures arbitrarily far below its top rank.
This program checks the weaker extension-drift condition

    e_k-e_{k-1} <= 1

using exact FLINT integer polynomials.  Powers are updated incrementally in
m.  Floating point is used only to display and rank ratios after exact
cross multiplication.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE = Poly([1])


def better(candidate: dict, incumbent: dict | None) -> bool:
    if incumbent is None:
        return True
    return (
        candidate["drift_numerator"] * incumbent["drift_denominator"]
        > incumbent["drift_numerator"] * candidate["drift_denominator"]
    )


def scan(p: Poly, t: int, m: int) -> tuple[dict, dict | None]:
    champion = None
    witness = None
    for k in range(1, len(p) - 1):
        lower = int(p[k - 1])
        middle = int(p[k])
        upper = int(p[k + 1])
        numerator = (k + 1) * lower * upper - k * middle * middle
        denominator = lower * middle
        candidate = {
            "t": t,
            "m": m,
            "order": 1 + m * (1 + 2 * t),
            "alpha": m * (t + 1),
            "rank": k,
            "drift_numerator": numerator,
            "drift_denominator": denominator,
            "drift_float": numerator / denominator,
            "unit_drift_gap": denominator - numerator,
            "coefficient_window": [lower, middle, upper],
        }
        if better(candidate, champion):
            champion = candidate
        if numerator > denominator:
            witness = candidate | {
                "polynomial": [int(p[j]) for j in range(len(p))]
            }
            break
    assert champion is not None
    return champion, witness


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--t-min", type=int, default=2)
    parser.add_argument("--t-max", type=int, default=18)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=500)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    global_champion = None
    per_t = []
    witness = None
    cases = 0
    rank_checks = 0

    for t in range(args.t_min, args.t_max + 1):
        e = (ONE + 2 * X) ** t
        a = e + X * (ONE + X) ** t
        e_power = ONE
        a_power = ONE
        t_champion = None
        for m in range(1, args.m_max + 1):
            e_power *= e
            a_power *= a
            if m < args.m_min:
                continue
            p = a_power + X * e_power
            cases += 1
            rank_checks += max(0, len(p) - 2)
            champion, witness = scan(p, t, m)
            if better(champion, t_champion):
                t_champion = champion
            if better(champion, global_champion):
                global_champion = champion
            if witness is not None:
                break
        per_t.append(
            {
                "t": t,
                "cases": max(0, m - args.m_min + 1),
                "champion": t_champion,
            }
        )
        print(
            f"t={t}: m through {m}, "
            f"best drift={t_champion['drift_float']:.12f} "
            f"at m={t_champion['m']}, k={t_champion['rank']}",
            flush=True,
        )
        if witness is not None:
            break

    report = {
        "claim_tested": (
            "Galvin T_{m,t} trees satisfy e_k-e_{k-1} <= 1 in the "
            "specified grid."
        ),
        "formula": (
            "I(T_{m,t};x)=((1+2x)^t+x(1+x)^t)^m+x(1+2x)^(tm)"
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "exact_integer_arithmetic": True,
        "cases": cases,
        "rank_checks": rank_checks,
        "per_t": per_t,
        "champion": global_champion,
        "witness": witness,
        "status": "FAIL" if witness else "PASS_NOT_PROOF",
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "cases": cases,
                "rank_checks": rank_checks,
                "champion": global_champion,
                "witness": witness,
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
