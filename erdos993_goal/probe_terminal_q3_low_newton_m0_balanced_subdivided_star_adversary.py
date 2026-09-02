#!/usr/bin/env python3
"""Exact adversarial probe for the balanced subdivided-star m=0 endpoint.

Search evidence only.  The endpoint has d rooted centres, balanced arm counts
r_i, and T subdivision vertices distributed among the R arms.  Every row used
below is extracted from the literal product formula for the resulting forest;
no independent-set ratio relaxation is made.
"""

from __future__ import annotations

import argparse
import itertools
from collections import Counter
from math import comb


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def convolution(left: list[int], right: list[int], maximum: int) -> list[int]:
    output = [0] * (maximum + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= maximum:
                output[i + j] += a * b
    return output


def path_row(vertices: int, maximum: int) -> list[int]:
    """Independence row of P_vertices, padded through maximum."""
    return [C(vertices + 1 - rank, rank) for rank in range(maximum + 1)]


def family_rows(
    arm_counts: tuple[int, ...],
    subdivisions: tuple[int, ...],
    maximum: int,
) -> tuple[list[int], list[int]]:
    """Return exact rows of F and H for a subdivision allocation.

    H is the disjoint union of the arm paths.  For each centre component of F,
    excluding the centre gives the H paths, while including it deletes the
    first vertex of each incident path.
    """
    assert len(subdivisions) == sum(arm_counts)
    frow = [1] + [0] * maximum
    hrow = [1] + [0] * maximum
    cursor = 0
    for arms in arm_counts:
        excluded = [1] + [0] * maximum
        included_tail = [1] + [0] * maximum
        for ell in subdivisions[cursor : cursor + arms]:
            excluded = convolution(excluded, path_row(ell + 1, maximum), maximum)
            included_tail = convolution(
                included_tail, path_row(ell, maximum), maximum
            )
        component = excluded[:]
        for rank in range(1, maximum + 1):
            component[rank] += included_tail[rank - 1]
        frow = convolution(frow, component, maximum)
        hrow = convolution(hrow, excluded, maximum)
        cursor += arms
    return frow, hrow


def rank3_counts(
    order: int, edges: int, wedges: int, connected_four: int
) -> tuple[int, int]:
    independent = C(order, 3) - edges * (order - 2) + wedges
    matchings = C(edges, 2) - wedges
    one_edge = (
        edges * C(order - 2, 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return independent, one_edge


def structural_data(
    arm_counts: tuple[int, ...], subdivisions: tuple[int, ...]
) -> dict[str, int]:
    d = len(arm_counts)
    R = sum(arm_counts)
    T = sum(subdivisions)
    N = d + R + T
    S = R + T
    B2root = C(d - 1, 2)
    A2 = sum(C(value, 2) for value in arm_counts)
    B2 = B2root + A2
    B3 = C(d - 1, 3) + sum(C(value, 3) for value in arm_counts)
    occupied = sum(value > 0 for value in subdivisions)
    weighted_occupancy = sum(
        (arms + ell - 1)
        for arms, block in _blocks(arm_counts, subdivisions)
        for ell in block
        if ell > 0
    )
    tau = B3 + (d - 1) * R + weighted_occupancy - (N - 2)
    return {
        "N": N,
        "d": d,
        "R": R,
        "T": T,
        "S": S,
        "B2": B2,
        "A2": A2,
        "Y": occupied,
        "tau": tau,
    }


def _blocks(
    arm_counts: tuple[int, ...], subdivisions: tuple[int, ...]
):
    cursor = 0
    for arms in arm_counts:
        yield arms, subdivisions[cursor : cursor + arms]
        cursor += arms


def cleared_q3_lower_margin(
    arm_counts: tuple[int, ...],
    subdivisions: tuple[int, ...],
    rank: int,
) -> tuple[int, dict[str, int]]:
    """Return f3*b times the shared-q3 lower gap, an exact integer."""
    data = structural_data(arm_counts, subdivisions)
    N, d, R, S = (data[name] for name in ("N", "d", "R", "S"))
    B2, A2, Y, tau = (
        data[name] for name in ("B2", "A2", "Y", "tau")
    )
    rows_f, rows_h = family_rows(arm_counts, subdivisions, rank + 1)
    a = rows_f[2]
    b = rows_f[rank]
    h = rows_h[rank]
    fnext = rows_f[rank + 1]
    if b == 0:
        return 0, {**data, "supported": 0}

    W = N - 1 + B2
    wedges_f = W - C(d, 2) - R
    z2 = S * (N - 2) - 2 * wedges_f
    h2 = C(S, 2) - (S - R)
    c0 = a + z2 + h2
    f3 = rows_f[3]
    matchings_f = C(S, 2) - wedges_f
    T4_f = (
        N
        - 2
        + B2
        + tau
        - C(d, 3)
        - A2
        - (d - 1) * R
        - Y
    )
    z3 = (
        S * C(N - 2, 2)
        - 2 * (wedges_f * (N - 3) + matchings_f)
        + 3 * T4_f
    )

    # Reconstruct the anchor cross literally from its two rank-three motif
    # rows.  This avoids importing the producer's symbolic expression.
    n = N + 1
    v4 = n - 3 + B2 + tau
    p0, R0 = rank3_counts(n + 1, n - 1, W, v4)
    it, st = rank3_counts(
        n + 2,
        n + 1,
        W + d + 1,
        v4 + C(d, 2) + R + d,
    )
    A0 = st * p0 - R0 * it
    assert A0 == p0 * c0 - a * R0

    margin = (
        (rank + 1) * a * A0 * f3 * (b + h + fnext)
        + a
        * p0
        * f3
        * (
            (rank + 1) * (c0 + R0) * b
            - 3 * (p0 + a) * (b + h)
        )
        - a * p0 * (p0 + a) * rank * z3 * b
    )
    details = {
        **data,
        "supported": 1,
        "a": a,
        "b": b,
        "h": h,
        "fnext": fnext,
        "f3": f3,
        "z3": z3,
        "p0": p0,
        "R0": R0,
        "A0": A0,
        "cleared_margin": margin,
    }
    return margin, details


def weak_compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for cuts in itertools.combinations(range(total + parts - 1), parts - 1):
        boundaries = (-1, *cuts, total + parts - 1)
        yield tuple(
            boundaries[index + 1] - boundaries[index] - 1
            for index in range(parts)
        )


def balanced_arm_counts(d: int, R: int) -> tuple[int, ...]:
    quotient, residual = divmod(R, d)
    return (quotient + 1,) * residual + (quotient,) * (d - residual)


def scan_case(d: int, R: int, T: int, rank: int) -> dict[str, object]:
    arms = balanced_arm_counts(d, R)
    records = []
    for allocation in weak_compositions(T, R):
        margin, details = cleared_q3_lower_margin(arms, allocation, rank)
        if details["supported"]:
            records.append((margin, allocation, details))
    records.sort(key=lambda item: (item[0], item[1]))
    return {
        "parameters": {"d": d, "R": R, "T": T, "rank": rank},
        "arm_counts": arms,
        "allocations": C(T + R - 1, R - 1),
        "supported_allocations": len(records),
        "minimum": records[0] if records else None,
        "maximum": records[-1] if records else None,
        "margin_by_occupancy": {
            occupancy: min(item[0] for item in records if sum(x > 0 for x in item[1]) == occupancy)
            for occupancy in sorted({sum(x > 0 for x in item[1]) for item in records})
        },
        "minimizer_shapes": Counter(
            tuple(sorted(item[1], reverse=True))
            for item in records
            if item[0] == records[0][0]
        ) if records else Counter(),
    }


def scan_atlas(maximum_order: int, maximum_allocations: int) -> dict[str, object]:
    cases = allocations = rank_checks = 0
    minimum = None
    nonconcentrated_minima = []
    negative_margins = []
    for N in range(15, maximum_order + 1):
        for d in range(1, N):
            for R in range(1, N - d + 1):
                T = N - d - R
                if T <= 0 or C(T + R - 1, R - 1) > maximum_allocations:
                    continue
                arms = balanced_arm_counts(d, R)
                rows = []
                for allocation in weak_compositions(T, R):
                    frow, _ = family_rows(arms, allocation, N)
                    supported = max(index for index, value in enumerate(frow) if value)
                    local = []
                    for rank in range(3, supported + 1):
                        margin, details = cleared_q3_lower_margin(
                            arms, allocation, rank
                        )
                        local.append((rank, margin, details))
                        rank_checks += 1
                    rows.append((allocation, local))
                    allocations += 1
                cases += 1
                for rank in range(3, max((len(row[1]) + 2 for row in rows), default=2) + 1):
                    rank_rows = [
                        (local[rank - 3][1], allocation, local[rank - 3][2])
                        for allocation, local in rows
                        if rank - 3 < len(local)
                    ]
                    if not rank_rows:
                        continue
                    rank_rows.sort(key=lambda item: (item[0], item[1]))
                    best = rank_rows[0]
                    record = (best[0], N, rank, d, R, T, best[1])
                    if minimum is None or record < minimum:
                        minimum = record
                    if best[0] < 0:
                        negative_margins.append(record)
                    if sum(value > 0 for value in best[1]) != 1:
                        concentrated_best = min(
                            item for item in rank_rows
                            if sum(value > 0 for value in item[1]) == 1
                        )
                        nonconcentrated_minima.append(
                            (record, concentrated_best[0], concentrated_best[1])
                        )
    return {
        "orders": [15, maximum_order],
        "maximum_allocations_per_case": maximum_allocations,
        "parameter_cases": cases,
        "allocation_rows": allocations,
        "rank_checks": rank_checks,
        "minimum": minimum,
        "negative_margins": negative_margins,
        "nonconcentrated_minima": nonconcentrated_minima,
    }
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--d", type=int, default=5)
    parser.add_argument("--R", type=int, default=8)
    parser.add_argument("--T", type=int, default=2)
    parser.add_argument("--rank", type=int, default=4)
    parser.add_argument("--atlas-order", type=int)
    parser.add_argument("--atlas-max-allocations", type=int, default=2000)
    args = parser.parse_args()
    if args.atlas_order is not None:
        result = scan_atlas(args.atlas_order, args.atlas_max_allocations)
        for key, value in result.items():
            if key in ("negative_margins", "nonconcentrated_minima"):
                print(key, len(value), value[:20])
            else:
                print(key, value)
        return
    result = scan_case(args.d, args.R, args.T, args.rank)
    print("parameters", result["parameters"])
    print("arm_counts", result["arm_counts"])
    print("allocations", result["allocations"])
    print("supported_allocations", result["supported_allocations"])
    print("minimum", result["minimum"])
    print("maximum", result["maximum"])
    print("margin_by_occupancy", result["margin_by_occupancy"])
    print("minimizer_shapes", result["minimizer_shapes"])


if __name__ == "__main__":
    main()
