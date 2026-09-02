#!/usr/bin/env python3
"""Search the local cone induced by the exact degree-two rooted recurrence.

For a rooted tree R at q, write

    C = I(R-q),  D = I(R-N[q]),  B = C+xD,
    P = (1+x)B+xC.

The genuine terminal pendant pair is (P,B).  This script samples positive
local coefficient windows for C and D, imposes D<=C coefficientwise,
the universal forest bound 0<=sigma<=4 on every available adjacent
curvature, and then tests C12 and high-occupancy SCC.  A failure is only an
abstract coefficient-cone witness unless C and D are separately realized
by a rooted forest.
"""

from __future__ import annotations

import argparse
import json
import math
import random


def make_window(k: int, means: list[float]) -> dict[int, float]:
    """Return coefficients at k-3,...,k+1 with coefficient k-2 scaled to 1."""
    # means[t] is x_j=j a_j/a_(j-1), for j=k-2+t.
    out = {k - 2: 1.0}
    out[k - 3] = (k - 2) / means[0]
    out[k - 1] = means[1] / (k - 1)
    out[k] = out[k - 1] * means[2] / k
    out[k + 1] = out[k] * means[3] / (k + 1)
    return out


def reserve_sigma(poly: dict[int, float], j: int) -> float:
    return (
        1.0
        + j * poly[j] / poly[j - 1]
        - (j + 1) * poly[j + 1] / poly[j]
    )


def sample_means(
    rng: random.Random, k: int, alpha: int, polc: bool
) -> list[float] | None:
    caps = [
        2.0 * (alpha - j + 1)
        for j in range(k - 2, k + 2)
    ]
    first = caps[0] * rng.random()
    if first <= 0:
        return None
    means = [first]
    for index in range(1, 4):
        # sigma at the previous coefficient rank is in [0,4].
        if polc:
            # Ordered log-concavity is x_(j+1)<=x_j.
            lower = max(0.0, means[-1] - 3.0)
            current = lower + (means[-1] - lower) * rng.random()
        else:
            current = 1.0 + means[-1] - 4.0 * rng.random()
        if current <= 0 or current > caps[index]:
            return None
        means.append(current)
    return means


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=5_000_000)
    parser.add_argument("--seed", type=int, default=27072026)
    parser.add_argument("--k-min", type=int, default=4)
    parser.add_argument("--k-max", type=int, default=300)
    parser.add_argument(
        "--stop-on",
        choices=("either", "c12", "hoc", "never"),
        default="either",
    )
    parser.add_argument("--polc-components", action="store_true")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    accepted = 0
    best = math.inf
    best_item = None
    best_hoc = math.inf
    best_hoc_item = None

    for _ in range(args.trials):
        k = rng.randint(args.k_min, args.k_max)
        beta = rng.randint(math.ceil(3 * k / 2), math.ceil(3 * k / 2) + 600)
        gamma = beta - rng.randint(0, 1)
        delta = rng.randint(max(0, gamma - 20), gamma)

        c_means = sample_means(
            rng, k, gamma, args.polc_components
        )
        d_means = sample_means(
            rng, k, delta, args.polc_components
        )
        if c_means is None or d_means is None:
            continue
        c = make_window(k, c_means)
        d_unit = make_window(k, d_means)

        # Choose a logarithmic relative scale and enforce D<=C throughout.
        scale_cap = min(
            c[j] / d_unit[j] for j in range(k - 3, k + 1)
        )
        if scale_cap <= 0:
            continue
        scale = scale_cap * 10.0 ** (-6.0 * rng.random())
        d = {j: scale * value for j, value in d_unit.items()}

        b = {
            j: c[j] + d[j - 1]
            for j in range(k - 2, k + 2)
        }
        p = {
            j: b[j] + b[j - 1] + c[j - 1]
            for j in range(k - 1, k + 2)
        }

        sigma_b = reserve_sigma(b, k - 1)
        sigma_p = reserve_sigma(p, k)
        if not (0 < sigma_b <= 4 and 0 < sigma_p <= 4):
            continue

        accepted += 1
        ratio = k * sigma_p / ((k - 1) * sigma_b)
        occupancy = b[k - 1] / p[k]
        item = {
            "k": k,
            "beta": beta,
            "gamma": gamma,
            "delta": delta,
            "C_means": c_means,
            "D_means": d_means,
            "D_scale": scale,
            "sigma_B": sigma_b,
            "sigma_P": sigma_p,
            "scaled_ratio": ratio,
            "occupancy": occupancy,
            "C": [c[j] for j in range(k - 3, k + 2)],
            "D": [d[j] for j in range(k - 3, k + 2)],
            "B": [b[j] for j in range(k - 2, k + 2)],
            "P": [p[j] for j in range(k - 1, k + 2)],
        }
        if ratio < best:
            best = ratio
            best_item = item
        if occupancy >= 0.5 and ratio < best_hoc:
            best_hoc = ratio
            best_hoc_item = item

        c12_failure = ratio < 0.5
        hoc_failure = occupancy >= 0.5 and ratio < 1.0
        should_stop = (
            (args.stop_on == "either" and (c12_failure or hoc_failure))
            or (args.stop_on == "c12" and c12_failure)
            or (args.stop_on == "hoc" and hoc_failure)
        )
        if should_stop:
            print(
                json.dumps(
                    {
                        "status": "ABSTRACT_RECURRENCE_FAILURE",
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
                "best": best_item,
                "best_high_occupancy": best_hoc_item,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
