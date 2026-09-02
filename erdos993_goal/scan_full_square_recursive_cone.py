#!/usr/bin/env python3
"""Stress PFSR in the exact two-step leaf-recursive coefficient cone.

Take positive local windows C,D and form

    F = C + x D,
    T = F + x C.

This is the exact polynomial recurrence for a two-edge rooted path.
The sampled C,D windows need not themselves be realizable by forests,
so failures are abstract negative controls.  Optional constraints impose
the two smaller C12 inequalities that strong induction would supply.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path


def window_from_means(
    base_rank: int,
    means: list[float],
) -> dict[int, float]:
    """Build coefficients with coefficient at base_rank scaled to one."""
    out = {base_rank: 1.0}
    for offset, mean in enumerate(means):
        rank = base_rank + offset + 1
        out[rank] = out[rank - 1] * mean / rank
    return out


def sigma(poly: dict[int, float], rank: int) -> float:
    return (
        1.0
        + rank * poly[rank] / poly[rank - 1]
        - (rank + 1) * poly[rank + 1] / poly[rank]
    )


def random_means(
    rng: random.Random,
    start_rank: int,
    length: int,
) -> list[float] | None:
    first = rng.uniform(0.05, 6.0 * (start_rank + 1))
    values = [first]
    for _ in range(1, length):
        current = 1.0 + values[-1] - rng.uniform(0.0, 4.0)
        if current <= 0:
            return None
        values.append(current)
    return values


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=5_000_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--require-lower-c12", action="store_true")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "full_square_recursive_cone_20260729.json"
        ),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    accepted = 0
    negative_cross = 0
    live_negative_cross = 0
    first_failure = None
    first_inductive_endpoint_failure = None
    minimum_ratio = math.inf
    minimum_witness = None
    minimum_inductive_endpoint_margin = math.inf
    minimum_inductive_endpoint_witness = None
    for sample in range(args.samples):
        r = rng.randint(6, 250)
        k = r + 1
        c_means = random_means(rng, r - 2, 5)
        d_means = random_means(rng, r - 3, 5)
        if c_means is None or d_means is None:
            continue
        c = window_from_means(r - 2, c_means)
        d_unit = window_from_means(r - 3, d_means)
        common_ranks = range(r - 2, r + 2)
        scale_cap = min(
            c[j] / d_unit[j] for j in common_ranks
        )
        if scale_cap <= 0:
            continue
        d_scale = scale_cap * 10.0 ** (-8.0 * rng.random())
        d = {
            j: d_scale * value
            for j, value in d_unit.items()
        }

        f = {
            j: c[j] + d[j - 1]
            for j in range(r - 1, r + 3)
        }
        t = {
            j: f[j] + c[j - 1]
            for j in range(r, r + 3)
        }
        bm, b, bp = f[r - 1], f[r], f[r + 1]
        a, ap, app = t[r], t[r + 1], t[r + 2]
        u = r * b / bm
        v = k * ap / a
        zeta = v - k * u / r
        if zeta <= 0:
            continue
        negative_cross += 1
        if v <= k:
            continue
        live_negative_cross += 1

        q_c = sigma(c, r)
        q_c_next = sigma(c, k)
        q_d = sigma(d, r - 1)
        q_d_next = sigma(d, r)
        q_f = sigma(f, r)
        q_f_next = sigma(f, k)
        q_t = sigma(t, k)
        if not all(
            0.0 <= q <= 4.0
            for q in (
                q_c,
                q_c_next,
                q_d,
                q_d_next,
                q_f,
                q_f_next,
                q_t,
            )
        ):
            continue
        if args.require_lower_c12 and (
            2.0 * k * q_t < r * q_c
            or 2.0 * r * q_f < (r - 1) * q_d
            or 2.0 * k * q_f_next < r * q_d_next
        ):
            continue

        reserve_t = k - v + v * q_t
        reserve_f = r - u + u * q_f
        if reserve_t < 0 or reserve_f < 0:
            continue
        accepted += 1
        margin = reserve_t - zeta * zeta
        inductive_endpoint_margin = (
            k
            - v
            + v * r * q_c / (2.0 * k)
            - zeta * zeta
        )
        ratio = reserve_t / (zeta * zeta)
        witness = {
            "sample": sample,
            "r": r,
            "C_means": c_means,
            "D_means": d_means,
            "D_scale": d_scale,
            "u": u,
            "v": v,
            "zeta": zeta,
            "q_C": q_c,
            "q_C_next": q_c_next,
            "q_D": q_d,
            "q_D_next": q_d_next,
            "q_F": q_f,
            "q_F_next": q_f_next,
            "q_T": q_t,
            "R_F": reserve_f,
            "R_T": reserve_t,
            "R_T_over_zeta_squared": ratio,
            "margin": margin,
            "inductive_C12_endpoint_margin": (
                inductive_endpoint_margin
            ),
        }
        if ratio < minimum_ratio:
            minimum_ratio = ratio
            minimum_witness = witness
        if margin < 0:
            first_failure = witness
            break
        if (
            args.require_lower_c12
            and inductive_endpoint_margin
            < minimum_inductive_endpoint_margin
        ):
            minimum_inductive_endpoint_margin = (
                inductive_endpoint_margin
            )
            minimum_inductive_endpoint_witness = witness
        if (
            args.require_lower_c12
            and inductive_endpoint_margin < 0
            and first_inductive_endpoint_failure is None
        ):
            first_inductive_endpoint_failure = witness

    report = {
        "status": (
            "ABSTRACT_RECURSIVE_CONE_COUNTEREXAMPLE_TO_PFSR"
            if first_failure is not None
            else "PASS_RANDOM_CONE_AUDIT_NOT_PROOF"
        ),
        "scope_warning": (
            "The C,D windows need not be realizable by forest "
            "independence polynomials."
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "negative_cross_draws": negative_cross,
        "live_negative_cross_draws": live_negative_cross,
        "accepted_draws": accepted,
        "minimum_witness": minimum_witness,
        "minimum_inductive_endpoint_witness": (
            minimum_inductive_endpoint_witness
        ),
        "first_inductive_endpoint_failure": (
            first_inductive_endpoint_failure
        ),
        "first_failure": first_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
