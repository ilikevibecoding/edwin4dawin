#!/usr/bin/env python3
"""Exact retained-half PISO audit for a star plus isolates.

The forest is K_(1,m) disjoint union t isolated vertices.  The
distinguished root is separately tested as the star center, a star
leaf, and an isolate (when available).  Rank-(r-2) down-link fibers
are aggregated by the number of selected star leaves and isolates,
so large parameters can be checked without subset enumeration.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def coefficient(m: int, t: int, rank: int) -> int:
    return choose(m + t, rank) + choose(t, rank - 1)


def root_containing(
    m: int,
    t: int,
    rank: int,
    root_type: str,
) -> int:
    if root_type == "center":
        return choose(t, rank - 1)
    if root_type == "leaf":
        return choose(m + t - 1, rank - 1)
    if root_type == "isolate":
        return (
            choose(m + t - 1, rank - 1)
            + choose(t - 1, rank - 2)
        )
    raise ValueError(root_type)


def applicable_local_piso(
    residual_n: int,
    residual_m: int,
    degree_square_sum: int,
    state: str,
    root_degree: int,
) -> Fraction:
    n = residual_n
    if n <= 0:
        raise ValueError("only positive-mass fibers are evaluated")
    a_value = Fraction(
        n * (n - 1) - 2 * residual_m,
        n,
    )
    mean_q = Fraction(
        n * residual_m - degree_square_sum,
        n,
    )
    variance = (
        Fraction(degree_square_sum, n)
        - Fraction(4 * residual_m * residual_m, n * n)
    )
    if state == "selected":
        p_value = Fraction(1)
        covariance = z_value = Fraction(0)
    elif state == "blocked":
        p_value = covariance = z_value = Fraction(0)
    else:
        p_value = Fraction(1, n)
        e_root = n - 1 - root_degree
        covariance = (
            Fraction(e_root, n) - p_value * a_value
        )
        z_value = Fraction(e_root, n)
    local_burden = (
        (2 - a_value) * p_value
        - 3 * covariance
        - 3 * z_value
    )
    raw_margin = (
        2
        + a_value
        + 2 * mean_q
        - variance
        - 2 * local_burden
    )
    if state == "selected" or n < 2:
        return raw_margin + 2 * local_burden
    return raw_margin


def fiber_categories(
    m: int,
    t: int,
    k_size: int,
    root_type: str,
):
    """Yield (multiplicity,N,M,S2,state,root residual degree)."""

    # The star center belongs to K.  No star leaf can then belong.
    isolate_count = k_size - 1
    if isolate_count >= 0:
        residual_n = t - isolate_count
        if root_type == "center":
            count = choose(t, isolate_count)
            if count:
                yield (
                    count,
                    residual_n,
                    0,
                    0,
                    "selected",
                    0,
                )
        elif root_type == "leaf":
            count = choose(t, isolate_count)
            if count:
                yield (
                    count,
                    residual_n,
                    0,
                    0,
                    "blocked",
                    0,
                )
        else:
            selected = choose(t - 1, isolate_count - 1)
            unselected = choose(t - 1, isolate_count)
            if selected:
                yield (
                    selected,
                    residual_n,
                    0,
                    0,
                    "selected",
                    0,
                )
            if unselected:
                yield (
                    unselected,
                    residual_n,
                    0,
                    0,
                    "open",
                    0,
                )

    # The center is absent.  Choose a star leaves and k_size-a
    # isolates.
    for leaves_chosen in range(0, min(m, k_size) + 1):
        isolates_chosen = k_size - leaves_chosen
        if not 0 <= isolates_chosen <= t:
            continue
        if leaves_chosen:
            residual_n = m + t - k_size
            residual_m = degree_square_sum = 0
        else:
            residual_n = 1 + m + t - k_size
            residual_m = m
            degree_square_sum = m * m + m

        if root_type == "center":
            count = (
                choose(m, leaves_chosen)
                * choose(t, isolates_chosen)
            )
            if count:
                yield (
                    count,
                    residual_n,
                    residual_m,
                    degree_square_sum,
                    "blocked" if leaves_chosen else "open",
                    0 if leaves_chosen else m,
                )
        elif root_type == "leaf":
            selected = (
                choose(m - 1, leaves_chosen - 1)
                * choose(t, isolates_chosen)
            )
            unselected = (
                choose(m - 1, leaves_chosen)
                * choose(t, isolates_chosen)
            )
            if selected:
                yield (
                    selected,
                    residual_n,
                    residual_m,
                    degree_square_sum,
                    "selected",
                    0,
                )
            if unselected:
                yield (
                    unselected,
                    residual_n,
                    residual_m,
                    degree_square_sum,
                    "open",
                    0 if leaves_chosen else 1,
                )
        else:
            selected = (
                choose(m, leaves_chosen)
                * choose(t - 1, isolates_chosen - 1)
            )
            unselected = (
                choose(m, leaves_chosen)
                * choose(t - 1, isolates_chosen)
            )
            if selected:
                yield (
                    selected,
                    residual_n,
                    residual_m,
                    degree_square_sum,
                    "selected",
                    0,
                )
            if unselected:
                yield (
                    unselected,
                    residual_n,
                    residual_m,
                    degree_square_sum,
                    "open",
                    0,
                )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-leaves", type=int, default=100)
    parser.add_argument("--max-isolates", type=int, default=100)
    parser.add_argument("--min-rank", type=int, default=6)
    parser.add_argument(
        "--require-room",
        action="store_true",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = identity_failures = failures = 0
    minimum = None
    minimum_item = None

    for m in range(1, args.max_leaves + 1):
        for t in range(args.max_isolates + 1):
            order = 1 + m + t
            alpha = m + t
            root_types = ["center", "leaf"]
            if t:
                root_types.append("isolate")
            for r in range(args.min_rank, alpha + 1):
                bm = coefficient(m, t, r - 1)
                br = coefficient(m, t, r)
                bp = coefficient(m, t, r + 1)
                if min(bm, br) <= 0:
                    continue
                u = Fraction(r * br, bm)
                if u < r:
                    continue
                if (
                    args.require_room
                    and (alpha - r) * (order - r)
                    <= (r + 1) * (r + 2)
                ):
                    continue
                for root_type in root_types:
                    hm = root_containing(
                        m, t, r - 1, root_type
                    )
                    hr = root_containing(m, t, r, root_type)
                    rho_m = Fraction(hm, bm)
                    rho = Fraction(hr, br)
                    reserve = Fraction(
                        r
                        * (
                            r * br * br
                            + bm * bm
                            - (r + 1) * bm * bp
                        ),
                        bm * bm,
                    )
                    burden = (
                        r * (u + 1) * rho_m
                        - (r + 1) * u * rho
                    )
                    global_margin = reserve - 2 * burden
                    downlink_mass = (r - 1) * bm
                    weighted_local = Fraction(0)
                    observed_mass = 0
                    for (
                        multiplicity,
                        residual_n,
                        residual_m,
                        degree_square_sum,
                        state,
                        root_degree,
                    ) in fiber_categories(
                        m, t, r - 2, root_type
                    ):
                        if residual_n <= 0:
                            continue
                        fiber_mass = multiplicity * residual_n
                        observed_mass += fiber_mass
                        weighted_local += (
                            Fraction(fiber_mass, downlink_mass)
                            * applicable_local_piso(
                                residual_n,
                                residual_m,
                                degree_square_sum,
                                state,
                                root_degree,
                            )
                        )
                    half_lift = (
                        2 * global_margin - weighted_local
                    )
                    checks += 1
                    item = {
                        "star_leaves": m,
                        "isolates": t,
                        "order": order,
                        "alpha": alpha,
                        "root_type": root_type,
                        "rank_r": r,
                        "u": str(u),
                        "global_piso_margin": str(global_margin),
                        "average_applicable_rank2_margin": str(
                            weighted_local
                        ),
                        "retained_half_margin": str(half_lift),
                    }
                    if observed_mass != downlink_mass:
                        identity_failures += 1
                    if half_lift < 0:
                        failures += 1
                    if minimum is None or half_lift < minimum:
                        minimum = half_lift
                        minimum_item = item
        if m % 10 == 0:
            print(
                f"leaves={m}, checks={checks:,}, "
                f"failures={failures:,}",
                flush=True,
            )

    payload = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "identity_failures": identity_failures,
        "failures": failures,
        "minimum": (
            None
            if minimum is None
            else {
                "exact": str(minimum),
                "float": float(minimum),
                **minimum_item,
            }
        ),
    }
    args.out.write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    print(json.dumps(payload, indent=2))
    return 1 if failures or identity_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
