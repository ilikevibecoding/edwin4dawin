#!/usr/bin/env python3
"""Fast exact diagnostics for the open d=1 terminal-m0 H/matching cone.

SEARCH ONLY.  This file deliberately makes no theorem claim.  It rewrites the
already frozen low-block formulas without SymPy so that large parameter boxes
can be classified by cap branch and by the two pending scalar inequalities.
"""

from __future__ import annotations

import argparse
from collections import Counter
from fractions import Fraction
from math import comb



def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def low_block(R: int, T: int, Y: int) -> dict[str, Fraction]:
    S = R + T
    a = Fraction(S * (S - 1), 2)
    c0 = R * R + 4 * R * T - R + 2 * T * T - 5 * T
    P = Fraction(
        R**3
        + 3 * R * R * T
        + 3 * R * R
        + 3 * R * T * T
        + 2 * R
        + T**3
        + 5 * T,
        6,
    )
    R0 = Fraction(
        R * R * T
        + 3 * R * T * T
        - 6 * R * T
        + 6 * R * Y
        + T**3
        - 4 * T * T
        + 9 * T
        - 6 * Y,
        2,
    )
    A0 = P * c0 - a * R0
    assert min(a, P, A0) > 0
    return {"a": a, "c0": Fraction(c0), "P": P, "R0": R0, "A0": A0}


def q3_h(R: int, T: int, Y: int) -> Fraction:
    S = R + T
    edges = T
    wedges = T - Y
    f3 = C(S, 3) - edges * (S - 2) + wedges
    matchings = C(edges, 2) - wedges
    long3 = int(T > Y)
    connected4 = T - Y - long3
    z3 = (
        edges * C(S - 2, 2)
        - 2 * (wedges * (S - 3) + matchings)
        + 3 * connected4
    )
    assert f3 > 0 and z3 >= 0
    return Fraction(z3, 3 * f3)


def q2_k(T: int, Y: int) -> Fraction:
    edges = T - Y
    f2 = C(T, 2) - edges
    if f2 == 0:
        return Fraction(0)
    long2 = min(Y, T - Y)
    wedges = edges - long2
    z2 = edges * (T - 2) - 2 * wedges
    assert z2 >= 0
    return Fraction(z2, 2 * f2)


def empty_cap(order: int, components: int, long_components: int, rank: int) -> Fraction:
    free = order - 2 * rank + components
    if free < 0:
        return Fraction(0)
    forced = 2 * max(0, components - rank) + max(0, long_components - rank)
    active = free - forced
    assert active >= 0
    return Fraction(active, rank + active) if active else Fraction(0)


def cap_data(R: int, T: int, Y: int, j: int) -> dict[str, object]:
    h_empty = empty_cap(R + T, R, Y, j)
    h_q3 = q3_h(R, T, Y)
    h_cap = min(h_empty, h_q3)
    h_branch = "empty" if h_empty <= h_q3 else "q3"

    k_empty = empty_cap(T, Y, int(T > Y), j - 1)
    k_q2 = q2_k(T, Y)
    k_cap = min(k_empty, k_q2)
    k_branch = "empty" if k_empty <= k_q2 else "q2"
    # If the coefficient at rank j-1 is unsupported, the frozen literal
    # decomposition sets the entire included-block cap to zero.
    k_supported = matching_coefficient(T, Y, j - 1) > 0
    included = Fraction((j - 1) * k_cap + R, j) if k_supported else Fraction(0)
    return {
        "h_cap": h_cap,
        "h_branch": h_branch,
        "h_empty": h_empty,
        "h_q3": h_q3,
        "k_cap": k_cap,
        "k_branch": k_branch,
        "k_empty": k_empty,
        "k_q2": k_q2,
        "included": included,
    }


def path_coefficient(vertices: int, rank: int) -> int:
    return C(vertices + 1 - rank, rank)


def matching_coefficient(T: int, Y: int, rank: int) -> int:
    matching = (T - Y + 1) // 2
    isolates = T - 2 * matching
    return sum(
        C(matching, e) * (2**e) * C(isolates, rank - e)
        for e in range(rank + 1)
    )


def row_coefficient(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def canonical_h_coefficient(R: int, T: int, Y: int, rank: int) -> int:
    """Coefficient of (1+x)^(R-Y)(1+2x)^(Y-1)P_(T-Y+2)."""
    if rank < 0:
        return 0
    isolates = R - Y
    gap = T - Y
    total = 0
    for chosen_isolates in range(min(isolates, rank) + 1):
        for chosen_edges in range(min(Y - 1, rank - chosen_isolates) + 1):
            path_rank = rank - chosen_isolates - chosen_edges
            total += (
                C(isolates, chosen_isolates)
                * C(Y - 1, chosen_edges)
                * 2**chosen_edges
                * C(gap + 3 - path_rank, path_rank)
            )
    return total


def tangent_ratio(total_vertices: int, target_rank: int) -> Fraction:
    vertices = max(0, total_vertices - 8)
    residual_rank = target_rank - 4
    denominator = C(vertices + 1 - residual_rank, residual_rank)
    numerator = C(vertices - residual_rank, residual_rank + 1)
    return Fraction(numerator, denominator) if denominator else Fraction(0)


def evaluate(
    R: int, T: int, Y: int, j: int, *, include_canonical: bool = True
) -> dict[str, object]:
    S = R + T
    block = low_block(R, T, Y)
    caps = cap_data(R, T, Y, j)
    a, c0, P, R0, A0 = (block[k] for k in ("a", "c0", "P", "R0", "A0"))
    lead = (j + 1) * A0
    BH = (
        2 * lead
        + P * (j + 1) * (c0 + R0)
        - 6 * P * (P + a)
        - 3 * j * P * (P + a) * caps["h_cap"]
    )
    BK = (
        lead
        + P * (j + 1) * (c0 + R0)
        - 3 * P * (P + a)
        - 3 * j * P * (P + a) * caps["included"]
    )
    rho = tangent_ratio(T, j - 1)
    Kcommon = lead * rho + BK

    sigma_den = (j - 1) * (S - j - 1)
    sigma = (
        Fraction((S - 2 * j) * (S - 2 * j + 1), sigma_den)
        if sigma_den > 0 and S >= 2 * j
        else Fraction(0)
    )
    join_slope = lead * sigma + BH

    pm1 = path_coefficient(S, j - 1)
    p0 = path_coefficient(S, j)
    pp1 = path_coefficient(S, j + 1)
    path_h = lead * (pm1 + pp1) + BH * p0
    matching = matching_coefficient(T, Y, j - 1)
    paid = path_h + (Kcommon * matching if Kcommon < 0 else 0)
    h_rho = tangent_ratio(S, j)
    h_common = lead * h_rho + BH
    result = {
        **caps,
        "lead": lead,
        "BH": BH,
        "BK": BK,
        "rho": rho,
        "Kcommon": Kcommon,
        "sigma": sigma,
        "join_slope": join_slope,
        "path_h": path_h,
        "h_rho": h_rho,
        "h_common": h_common,
        "matching": matching,
        "paid": paid,
    }
    if include_canonical:
        canonical_h = lead * (
            canonical_h_coefficient(R, T, Y, j - 1)
            + canonical_h_coefficient(R, T, Y, j + 1)
        ) + BH * canonical_h_coefficient(R, T, Y, j)
        result["canonical_h"] = canonical_h
        result["canonical_paid"] = canonical_h + (
            Kcommon * matching if Kcommon < 0 else 0
        )
    return result


def scan(maximum_S: int, maximum_rank: int) -> dict[str, object]:
    counts: Counter[tuple[str, str, str, str]] = Counter()
    join_bad: list[tuple[object, ...]] = []
    path_bad: list[tuple[object, ...]] = []
    paid_bad: list[tuple[object, ...]] = []
    canonical_bad: list[tuple[object, ...]] = []
    h_common_bad: list[tuple[object, ...]] = []
    minima: dict[str, tuple[object, ...]] = {}
    canonical_minima: dict[str, tuple[object, ...]] = {}
    normalized_canonical_minimum = None
    for S in range(14, maximum_S + 1):
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                for j in range(5, min(maximum_rank, S) + 1):
                    data = evaluate(R, T, Y, j)
                    key = (
                        str(data["h_branch"]),
                        str(data["k_branch"]),
                        "K-" if data["Kcommon"] < 0 else "K+",
                        "sigma+" if data["sigma"] else "sigma0",
                    )
                    counts[key] += 1
                    record = (data["paid"], S, j, R, T, Y, key)
                    minima[key] = record if key not in minima else min(minima[key], record)
                    canonical_record = (
                        data["canonical_paid"], S, j, R, T, Y, key
                    )
                    canonical_minima[key] = (
                        canonical_record
                        if key not in canonical_minima
                        else min(canonical_minima[key], canonical_record)
                    )
                    if data["Kcommon"] < 0 and data["matching"]:
                        denominator = -data["Kcommon"] * data["matching"]
                        normalized_record = (
                            data["canonical_paid"] / denominator,
                            S,
                            j,
                            R,
                            T,
                            Y,
                            key,
                            data["canonical_h"],
                            data["Kcommon"],
                            data["matching"],
                        )
                        normalized_canonical_minimum = (
                            normalized_record
                            if normalized_canonical_minimum is None
                            else min(normalized_canonical_minimum, normalized_record)
                        )
                    if data["join_slope"] < 0 and len(join_bad) < 20:
                        join_bad.append((data["join_slope"], S, j, R, T, Y, key))
                    if data["path_h"] < 0 and len(path_bad) < 20:
                        path_bad.append((data["path_h"], S, j, R, T, Y, key))
                    if data["paid"] < 0 and len(paid_bad) < 20:
                        paid_bad.append(record)
                    if data["canonical_paid"] < 0 and len(canonical_bad) < 20:
                        canonical_bad.append(
                            (data["canonical_paid"], S, j, R, T, Y, key)
                        )
                    if data["h_common"] < 0 and len(h_common_bad) < 20:
                        h_common_bad.append(
                            (data["h_common"], S, j, R, T, Y, key)
                        )
    return {
        "S_range": [14, maximum_S],
        "maximum_rank": maximum_rank,
        "branch_counts": {str(k): v for k, v in sorted(counts.items())},
        "first_join_slope_negative": join_bad,
        "first_path_h_negative": path_bad,
        "first_paid_negative": paid_bad,
        "first_canonical_paid_negative": canonical_bad,
        "first_H_common_negative": h_common_bad,
        "branch_minima": {str(k): v for k, v in sorted(minima.items())},
        "canonical_branch_minima": {
            str(k): v for k, v in sorted(canonical_minima.items())
        },
        "normalized_canonical_minimum": normalized_canonical_minimum,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--S", type=int, default=80)
    parser.add_argument("--rank", type=int, default=40)
    args = parser.parse_args()
    result = scan(args.S, args.rank)
    for key, value in result.items():
        print(key, value)
    print("SEARCH_ONLY_D1_H_MATCHING_CONE")


if __name__ == "__main__":
    main()
