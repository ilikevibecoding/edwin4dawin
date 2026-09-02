#!/usr/bin/env python3
"""Falsify the sign-aware pointed-reserve cascade in a scalar relaxation.

This samples consecutive extension means and three hit probabilities,
enforces the two ordinary ISO inequalities, the two pointed half-reserve
inequalities, terminal drift, and 0<=q_F,q_T,q_F^+<=4.  A negative
sign-aware margin shows that those scalar constraints alone do not prove
the strong reserve cascade; such a witness need not be graph-realizable.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=2_000_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--min-q-t", type=float, default=0.0)
    parser.add_argument(
        "--singleton-hit",
        action="store_true",
        help="Also impose ISO/curvature constraints on H=xJ.",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    accepted = failures = 0
    minimum = None
    minimum_item = None

    for sample in range(args.samples):
        r = rng.randint(6, 80)
        k = r + 1
        u = r * (1 + 5 * rng.random())
        q_f = 4 * rng.random()
        w = u + 1 - q_f
        if w <= 0:
            continue
        q_next = min(4.0, w + 1) * rng.random()
        z = w + 1 - q_next
        reserve = r - u + u * q_f
        reserve_next = k - w + w * q_next
        if reserve < 0 or reserve_next < 0:
            continue

        rho_m = rng.random()
        rho = rng.random()
        rho_p = rng.random()
        if min(1 - rho_m, 1 - rho) <= 1e-12:
            continue
        u_c = u * (1 - rho) / (1 - rho_m)
        w_c = w * (1 - rho_p) / (1 - rho)
        q_c = 1 + u_c - w_c
        reserve_c = r - u_c + u_c * q_c
        if not (0 <= q_c <= 4) or reserve_c < 0:
            continue
        burden = r * (u + 1) * rho_m - k * u * rho
        burden_next = (
            k * (w + 1) * rho - (k + 1) * w * rho_p
        )
        if reserve + 1e-12 < 2 * burden:
            continue
        if reserve_next + 1e-12 < 2 * burden_next:
            continue
        if args.singleton_hit:
            if min(rho_m, rho) <= 1e-12:
                continue
            u_j = (
                (r - 1) * u * rho / (r * rho_m)
            )
            w_j = r * w * rho_p / (k * rho)
            q_j = 1 + u_j - w_j
            reserve_j = (
                (r - 1) - u_j + u_j * q_j
            )
            if not (0 <= q_j <= 4) or reserve_j < 0:
                continue
        else:
            u_j = w_j = q_j = reserve_j = None

        denominator = u + r * (1 - rho_m)
        denominator_next = w + k * (1 - rho)
        v = u * (w + k * (1 - rho)) / denominator
        y = (
            w
            * (z + (k + 1) * (1 - rho_p))
            / denominator_next
        )
        q_t = 1 + v - y
        if not (args.min_q_t <= q_t <= 4):
            continue
        drift = u + 1 - v
        if drift < 0:
            continue
        epsilon = max(0.0, w - v)
        bracket = (
            r * v * reserve / u
            + (r + 2 + r * r / u) * drift
            + 2 * k * r * epsilon
            - 2 * k * (k + v * (q_f - 1 - drift))
        )
        threshold = denominator_next * bracket / (2 * k * v)
        lower = (
            reserve_next - burden_next
            if burden_next <= 0
            else reserve_next / 2
        )
        margin = lower - threshold
        accepted += 1
        if minimum is None or margin < minimum:
            minimum = margin
            minimum_item = {
                "sample": sample,
                "r": r,
                "u": u,
                "w": w,
                "z": z,
                "q_F": q_f,
                "q_F_next": q_next,
                "q_T": q_t,
                "rho_previous": rho_m,
                "rho": rho,
                "rho_next": rho_p,
                "u_C": u_c,
                "w_C": w_c,
                "q_C": q_c,
                "R_C": reserve_c,
                "u_J": u_j,
                "w_J": w_j,
                "q_J": q_j,
                "R_J": reserve_j,
                "R": reserve,
                "R_next": reserve_next,
                "burden": burden,
                "burden_next": burden_next,
                "v": v,
                "drift": drift,
                "epsilon": epsilon,
                "threshold": threshold,
                "adaptive_lower": lower,
                "margin": margin,
            }
        if margin < 0:
            failures += 1
            if failures >= 100:
                break

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "accepted": accepted,
        "failures": failures,
        "minimum": minimum,
        "witness": minimum_item,
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
