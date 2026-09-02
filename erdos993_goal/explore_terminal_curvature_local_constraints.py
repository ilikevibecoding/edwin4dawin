#!/usr/bin/env python3
"""Falsify local coefficient constraints proposed for pendant curvature.

For a pendant pair write

    P = (1+x) B + x C,    0 <= C <= B coefficientwise.

At a target rank k put

    x_j = j B_j/B_{j-1},
    v_j = C_{j-1}/B_j.

Then

    P_j = B_j (1 + j/x_j + v_j)

and the normalized GSB curvature is

    sigma_j(P) = 1 + x_j A_j/A_{j-1}
                   - x_{j+1} A_{j+1}/A_j,
    A_j = 1 + j/x_j + v_j.

This randomized numerical search asks whether C12 or high-occupancy SCC
follows merely from local positivity, C <= B, the rooted cross-minor
v_{k-1} <= v_k <= v_{k+1}, and prefix GSB for B and C.  A failure is only
an abstract local coefficient configuration, not a graph counterexample.
"""

from __future__ import annotations

import argparse
import json
import math
import random


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=2_000_000)
    parser.add_argument("--seed", type=int, default=20260727)
    parser.add_argument("--k-min", type=int, default=3)
    parser.add_argument("--k-max", type=int, default=200)
    parser.add_argument(
        "--stop-on",
        choices=("either", "c12", "hoc", "never"),
        default="either",
    )
    parser.add_argument(
        "--single-root-deletion",
        action="store_true",
        help=(
            "Impose the extra universal bounds valid when C=B-q for one "
            "root q, including the matching-block extension bound."
        ),
    )
    args = parser.parse_args()

    rng = random.Random(args.seed)
    best_c12 = math.inf
    best_c12_item = None
    best_hoc = math.inf
    best_hoc_item = None
    accepted = 0

    for _ in range(args.trials):
        k = rng.randint(args.k_min, args.k_max)

        beta = None
        gamma = None
        if args.single_root_deletion:
            # k <= floor(2 beta/3), the exact pendant-prefix restriction.
            beta_min = max(k, math.ceil(3 * k / 2))
            beta = rng.randint(beta_min, beta_min + 500)
            gamma = beta - rng.randint(0, 1)

        # Log-uniform extension means, then enforce the two adjacent GSB
        # inequalities of B by rejection.
        if args.single_root_deletion:
            x_caps = (
                2.0 * (beta - k + 2),
                2.0 * (beta - k + 1),
                2.0 * (beta - k),
            )
            xb0 = x_caps[0] * rng.random()
            sigma_b_draw = 4.0 * rng.random()
            xb1 = 1.0 + xb0 - sigma_b_draw
            if xb1 <= 0 or xb1 > x_caps[1]:
                continue
            sigma_b_next_draw = 4.0 * rng.random()
            xb2 = 1.0 + xb1 - sigma_b_next_draw
            if xb2 <= 0 or xb2 > x_caps[2]:
                continue
        else:
            xb0 = math.exp(rng.uniform(-4.0, 6.0))
            xb1 = 1.0 + xb0 - 4.0 * rng.random()
            if xb1 <= 0:
                continue
            xb2 = 1.0 + xb1 - 4.0 * rng.random()
            if xb2 <= 0:
                continue
            x_caps = None
        if xb1 > xb0 + 1.0 or xb2 > xb1 + 1.0:
            continue

        caps = (
            (k - 1) / xb0,
            k / xb1,
            (k + 1) / xb2,
        )
        common_cap = min(caps)
        if common_cap <= 0:
            continue

        # Generate an increasing cross-minor profile inside all three
        # coefficientwise C <= B caps.
        if args.single_root_deletion:
            v_lowers = (
                (k - 1) / (2 * gamma - k + 3),
                k / (2 * gamma - k + 2),
                (k + 1) / (2 * gamma - k + 1),
            )
            if any(
                lower > cap for lower, cap in zip(v_lowers, caps)
            ):
                continue
            v0 = v_lowers[0] + (
                common_cap - v_lowers[0]
            ) * rng.random() ** 3
        else:
            v_lowers = None
            v0 = common_cap * rng.random() ** 3
        if caps[1] < v0 or caps[2] < v0:
            continue
        v1_lower = max(v0, v_lowers[1] if v_lowers else 0.0)
        v1_upper = min(caps[1], caps[2])
        if v1_lower > v1_upper:
            continue
        v1 = v1_lower + (v1_upper - v1_lower) * rng.random()
        v2_lower = max(v1, v_lowers[2] if v_lowers else 0.0)
        if v2_lower > caps[2]:
            continue
        v2 = v2_lower + (caps[2] - v2_lower) * rng.random()
        if min(v0, v1, v2) <= 1e-15:
            continue

        if args.single_root_deletion:
            # Exact rooted recurrence B=C+xD with D=B-N[q] an induced
            # subforest of C=B-q.  At the two available ranks, D<=C gives
            #
            #   B_(k-1)-C_(k-1) <= C_(k-2),
            #   B_k-C_k <= C_(k-1).
            b_k_minus_1 = k / xb1
            b_k_plus_1 = xb2 / (k + 1)
            c_k_minus_2 = v0 * b_k_minus_1
            c_k_minus_1 = v1
            c_k = v2 * b_k_plus_1
            if (
                b_k_minus_1 - c_k_minus_1 > c_k_minus_2
                or 1.0 - c_k > c_k_minus_1
            ):
                continue

        # Prefix GSB of C at its relevant rank.
        yc0 = (k - 1) * v1 * xb1 / (k * v0)
        yc1 = k * v2 * xb2 / ((k + 1) * v1)
        sigma_c = 1.0 + yc0 - yc1
        # For a forest, residual q <= e gives the universal upper bound
        # sigma=S/mu <= 4 whenever the adjacent coefficients are positive.
        if sigma_c < 0 or sigma_c > 4.0:
            continue
        if args.single_root_deletion and (
            yc0 > 2.0 * (gamma - k + 2)
            or yc1 > 2.0 * (gamma - k + 1)
        ):
            continue

        sigma_b = 1.0 + xb0 - xb1
        if sigma_b <= 0 or sigma_b > 4.0:
            continue

        a0 = 1.0 + (k - 1) / xb0 + v0
        a1 = 1.0 + k / xb1 + v1
        a2 = 1.0 + (k + 1) / xb2 + v2
        sigma_p = 1.0 + xb1 * a1 / a0 - xb2 * a2 / a1
        if sigma_p <= 0 or sigma_p > 4.0:
            continue

        accepted += 1
        scaled_ratio = k * sigma_p / ((k - 1) * sigma_b)

        # B_{k-1}/P_k after scaling B_k=1.
        occupancy = (k / xb1) / a1
        item = {
            "k": k,
            "x_B": [xb0, xb1, xb2],
            "v": [v0, v1, v2],
            "sigma_B": sigma_b,
            "sigma_C": sigma_c,
            "sigma_P": sigma_p,
            "scaled_ratio": scaled_ratio,
            "occupancy": occupancy,
            "caps": caps,
            "beta": beta,
            "gamma": gamma,
            "x_caps": x_caps,
            "v_lowers": v_lowers,
        }
        if scaled_ratio < best_c12:
            best_c12 = scaled_ratio
            best_c12_item = item
        if occupancy >= 0.5 and scaled_ratio < best_hoc:
            best_hoc = scaled_ratio
            best_hoc_item = item

        c12_failure = scaled_ratio < 0.5
        hoc_failure = occupancy >= 0.5 and scaled_ratio < 1.0
        should_stop = (
            (args.stop_on == "either" and (c12_failure or hoc_failure))
            or (args.stop_on == "c12" and c12_failure)
            or (args.stop_on == "hoc" and hoc_failure)
        )
        if should_stop:
            print(
                json.dumps(
                    {
                        "status": "ABSTRACT_LOCAL_FAILURE",
                        "accepted": accepted,
                        "c12_failure": c12_failure,
                        "hoc_failure": hoc_failure,
                        "witness": item,
                    },
                    indent=2,
                )
            )
            return 1

    print(
        json.dumps(
            {
                "status": "NO_FAILURE_IN_RANDOM_SAMPLE",
                "trials": args.trials,
                "accepted": accepted,
                "best_c12": best_c12_item,
                "best_high_occupancy": best_hoc_item,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
