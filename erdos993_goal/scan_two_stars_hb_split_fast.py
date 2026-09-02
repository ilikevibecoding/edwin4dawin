#!/usr/bin/env python3
"""Fast exact HB-split scan for two stars and isolated vertices.

The forest is

    K_{1,m} disjoint union K_{1,s} disjoint union t K_1,

rooted at the center of the first star.  A down-link set has only
nine symmetry modes according to whether it selects a center, selects
one or more leaves, or avoids each star.  Aggregating those modes
makes very large parameter scans possible without expanding the
individual vertices.
"""

from __future__ import annotations

import argparse
import json
import random
from collections import Counter
from fractions import Fraction
from math import comb
from pathlib import Path

from audit_retained_half_state_partition import (
    forest_distribution,
    local_quantities,
    two_stars,
)


def choose(n, k):
    return comb(n, k) if 0 <= k <= n else 0


def coefficient(m, s, t, rank):
    """Coefficient of the two-star forest."""
    n = m + s + t
    return (
        choose(n, rank)
        + choose(m + t, rank - 1)
        + choose(s + t, rank - 1)
        + choose(t, rank - 2)
    )


def root_hit_coefficient(s, t, rank):
    """Rank-``rank`` sets containing the distinguished center."""
    return choose(s + t, rank - 1) + choose(t, rank - 2)


def add_mode(
    output,
    count,
    residual_n,
    residual_m,
    degree_square_sum,
    state,
    root_degree,
    hit_count=0,
):
    if count and residual_n > 0:
        output[
            (
                residual_n,
                residual_m,
                degree_square_sum,
                state,
                root_degree,
                hit_count,
            )
        ] += count


def mode_distribution(m, s, t, k):
    """Aggregate residual states for independent ``k``-sets."""
    n = m + s + t
    output = Counter()

    # First-star center selected.
    add_mode(
        output,
        choose(t, k - 1),
        s + t + 2 - k,
        s,
        s * s + s,
        "selected",
        0,
    )
    add_mode(
        output,
        choose(t, k - 2),
        t - k + 2,
        0,
        0,
        "selected",
        0,
    )
    add_mode(
        output,
        choose(s + t, k - 1) - choose(t, k - 1),
        s + t + 1 - k,
        0,
        0,
        "selected",
        0,
    )

    # First star open.
    add_mode(
        output,
        choose(t, k),
        n + 2 - k,
        m + s,
        m * m + m + s * s + s,
        "open",
        m,
    )
    add_mode(
        output,
        choose(t, k - 1),
        m + t + 2 - k,
        m,
        m * m + m,
        "open",
        m,
    )
    add_mode(
        output,
        choose(s + t, k) - choose(t, k),
        n + 1 - k,
        m,
        m * m + m,
        "open",
        m,
    )

    # One or more leaves of the first star selected.  Split off
    # exactly one first-star leaf so the neighbor-multiplicity
    # charging target can be tested.
    all_first_second_open = (
        choose(m + t, k) - choose(t, k)
    )
    one_first_second_open = m * choose(t, k - 1)
    add_mode(
        output,
        one_first_second_open,
        n + 1 - k,
        s,
        s * s + s,
        "blocked",
        0,
        1,
    )
    add_mode(
        output,
        all_first_second_open - one_first_second_open,
        n + 1 - k,
        s,
        s * s + s,
        "blocked",
        0,
        2,
    )
    all_first_second_center = (
        choose(m + t, k - 1) - choose(t, k - 1)
    )
    one_first_second_center = m * choose(t, k - 2)
    add_mode(
        output,
        one_first_second_center,
        m + t + 1 - k,
        0,
        0,
        "blocked",
        0,
        1,
    )
    add_mode(
        output,
        (
            all_first_second_center
            - one_first_second_center
        ),
        m + t + 1 - k,
        0,
        0,
        "blocked",
        0,
        2,
    )
    all_first_second_leaves = (
        choose(n, k)
        - choose(m + t, k)
        - choose(s + t, k)
        + choose(t, k)
    )
    one_first_second_leaves = m * (
        choose(s + t, k - 1) - choose(t, k - 1)
    )
    add_mode(
        output,
        one_first_second_leaves,
        n - k,
        0,
        0,
        "blocked",
        0,
        1,
    )
    add_mode(
        output,
        (
            all_first_second_leaves
            - one_first_second_leaves
        ),
        n - k,
        0,
        0,
        "blocked",
        0,
        2,
    )
    return output


def self_test():
    for m in range(4):
        for s in range(4):
            for t in range(3):
                adjacency = two_stars(m, s, t)
                exact = forest_distribution(
                    adjacency, 0, min(4, m + s + t)
                )
                by_rank = Counter()
                for (
                    k,
                    residual_n,
                    residual_m,
                    square_sum,
                    state,
                    root_degree,
                ), count in exact.items():
                    by_rank[
                        (
                            k,
                            residual_n,
                            residual_m,
                            square_sum,
                            state,
                            root_degree,
                        )
                    ] += count
                for k in range(min(4, m + s + t) + 1):
                    expected = Counter()
                    for key, value in mode_distribution(
                        m, s, t, k
                    ).items():
                        expected[(k, *key[:-1])] += value
                    observed = Counter(
                        {
                            key: value
                            for key, value in by_rank.items()
                            if key[0] == k and key[1] > 0
                        }
                    )
                    assert expected == observed, (
                        m,
                        s,
                        t,
                        k,
                        expected,
                        observed,
                    )


def evaluate_rank(m, s, t, r):
    bm = coefficient(m, s, t, r - 1)
    br = coefficient(m, s, t, r)
    if not bm or not br:
        return None
    u = Fraction(r * br, bm)
    if u < r:
        return None
    p = Fraction(
        root_hit_coefficient(s, t, r - 1), bm
    )
    mass = (r - 1) * bm
    sums = {
        "selected": Fraction(0),
        "blocked_one": Fraction(0),
        "blocked_many": Fraction(0),
        "open": Fraction(0),
    }
    observed_mass = 0
    for (
        residual_n,
        residual_m,
        square_sum,
        state,
        root_degree,
        hit_count,
    ), count in mode_distribution(
        m, s, t, r - 2
    ).items():
        weight_mass = count * residual_n
        observed_mass += weight_mass
        weight = Fraction(weight_mass, mass)
        (
            a_value,
            p_value,
            raw_margin,
            adjustment,
            drift_factor,
        ) = local_quantities(
            residual_n,
            residual_m,
            square_sum,
            state,
            root_degree,
        )
        centered_p = p_value - p
        centered = a_value - u - r * centered_p
        phi = (
            raw_margin
            - adjustment
            + 2 * (r - 2) * drift_factor
            + 2 * r * r * centered_p * centered_p
            - 2 * centered * centered
        )
        key = state
        if state == "blocked":
            key = (
                "blocked_one"
                if hit_count == 1
                else "blocked_many"
            )
        sums[key] += weight * phi
    assert observed_mass == mass
    blocked = sums["blocked_one"] + sums["blocked_many"]
    selected_half = (
        sums["selected"] + blocked / 2
    )
    open_half = sums["open"] + blocked / 2
    selected_one_hit = (
        sums["selected"] + sums["blocked_one"]
    )
    open_many_hit = (
        sums["open"] + sums["blocked_many"]
    )
    selected_one_plus_half_many = (
        sums["selected"]
        + sums["blocked_one"]
        + sums["blocked_many"] / 2
    )
    open_plus_half_many = (
        sums["open"] + sums["blocked_many"] / 2
    )
    rank_share = Fraction(1, r - 2)
    selected_rank_share = (
        sums["selected"]
        + sums["blocked_one"]
        + rank_share * sums["blocked_many"]
    )
    open_rank_share = (
        sums["open"]
        + (1 - rank_share) * sums["blocked_many"]
    )
    return {
        "m": m,
        "s": s,
        "t": t,
        "r": r,
        "order": m + s + t + 2,
        "u": u,
        "p": p,
        "selected": sums["selected"],
        "blocked": blocked,
        "blocked_one": sums["blocked_one"],
        "blocked_many": sums["blocked_many"],
        "open": sums["open"],
        "selected_plus_half_blocked": selected_half,
        "open_plus_half_blocked": open_half,
        "selected_plus_blocked_one": selected_one_hit,
        "open_plus_blocked_many": open_many_hit,
        "selected_plus_blocked_one_plus_half_many": (
            selected_one_plus_half_many
        ),
        "open_plus_half_blocked_many": open_plus_half_many,
        "selected_plus_rank_share_blocked_many": (
            selected_rank_share
        ),
        "open_plus_complement_rank_share_blocked_many": (
            open_rank_share
        ),
    }


def record(value, item):
    return {
        "exact": str(value),
        "float": float(value),
        **{
            key: (
                str(entry)
                if isinstance(entry, Fraction)
                else entry
            )
            for key, entry in item.items()
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=2000)
    parser.add_argument("--maximum", type=int, default=200)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--case",
        action="append",
        default=[],
        help="include an exact m,s,t parameter triple",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(
            "two_stars_hb_split_fast_scan.json"
        ),
    )
    args = parser.parse_args()

    self_test()
    rng = random.Random(args.seed)
    minima = {
        "selected_plus_half_blocked": None,
        "open_plus_half_blocked": None,
        "selected_plus_blocked_one": None,
        "open_plus_blocked_many": None,
        "selected_plus_blocked_one_plus_half_many": None,
        "open_plus_half_blocked_many": None,
        "selected_plus_rank_share_blocked_many": None,
        "open_plus_complement_rank_share_blocked_many": None,
    }
    failures = {name: 0 for name in minima}
    first_failure = {name: None for name in minima}
    checks = 0
    parameter_sets = {
        (
            rng.randrange(args.maximum + 1),
            rng.randrange(args.maximum + 1),
            rng.randrange(args.maximum + 1),
        )
        for _ in range(args.samples)
    }
    for specification in args.case:
        parameter_sets.add(
            tuple(map(int, specification.split(",")))
        )
    # Include deliberately imbalanced and symmetric boundaries.
    for scale in (5, 10, 20, 50, 100, args.maximum):
        if scale <= args.maximum:
            parameter_sets.update(
                {
                    (1, scale, scale),
                    (scale, 1, scale),
                    (scale, scale, 0),
                    (scale, scale, scale),
                    (2 * scale, scale, 1),
                    (scale, 2 * scale, 1),
                }
            )

    for m, s, t in sorted(parameter_sets):
        alpha = max(
            m + s + t,
            m + t + 1,
            s + t + 1,
            t + 2,
        )
        for r in range(6, alpha + 1):
            item = evaluate_rank(m, s, t, r)
            if item is None:
                continue
            checks += 1
            for name in minima:
                value = item[name]
                if (
                    minima[name] is None
                    or value < minima[name][0]
                ):
                    minima[name] = (value, item)
                if value < 0:
                    failures[name] += 1
                    if first_failure[name] is None:
                        first_failure[name] = record(
                            value, item
                        )

    report = {
        "parameters": vars(args)
        | {"out": str(args.out)},
        "parameter_sets": len(parameter_sets),
        "prefix_checks": checks,
        "failures": failures,
        "first_failure": first_failure,
        "minima": {
            name: (
                None
                if entry is None
                else record(*entry)
            )
            for name, entry in minima.items()
        },
    }
    args.out.write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
