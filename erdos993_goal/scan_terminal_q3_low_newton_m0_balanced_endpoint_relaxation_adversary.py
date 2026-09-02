#!/usr/bin/env python3
"""Diagnostic of the exact balanced-subdivided-star m=0 relaxation.

Search only, not proof.  Unlike the older root-partition scan this keeps the
literal (Y,tau) occupancy correlation, the one-centre y cap, the H shadow in
U0, and the isolate-biased extension floor when the endpoint is a linear
forest (balanced quotient q=0).
"""

from __future__ import annotations

import argparse
from math import comb

from scan_terminal_q3_low_newton_m0_shared_q3_fast_adversary import gaps
from prove_balanced_subdivided_star_m0_row_correlation_adversary import (
    center_sector_extra_lower,
    h_max_row,
)


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def convolve(left: list[int], right: list[int], maximum: int) -> list[int]:
    output = [0] * (maximum + 1)
    for i, a in enumerate(left):
        for k, b in enumerate(right):
            if i + k <= maximum:
                output[i + k] += a * b
    return output


def path_row(vertices: int, maximum: int) -> list[int]:
    return [C(vertices + 1 - rank, rank) for rank in range(maximum + 1)]


def balanced_data(d: int, R: int) -> dict[str, int | list[int]]:
    q, residual = divmod(R, d)
    arms = [q + 1] * residual + [q] * (d - residual)
    weights = sorted(value - 1 for value in arms for _ in range(value))
    return {
        "q": q,
        "arms": arms,
        "weights": weights,
        "A2": sum(C(value, 2) for value in arms),
        "A3": sum(C(value, 3) for value in arms),
    }


def y_cap(N: int, j: int, d: int, R: int, B2: int, T: int) -> float:
    S = R + T
    a = C(N, 2) - S
    wedges_f = N - 1 + B2 - C(d, 2) - R
    z2 = S * (N - 2) - 2 * wedges_f
    h2 = C(S, 2) - T
    reserve = (2 * (j + 1) * h2 + (j - 2) * (2 * a - z2)) / (6 * a)
    cap = min(1.0, reserve)
    # alpha(H)<=R+floor(T/2) for R arm paths with T subdivisions.
    if j > R + T // 2:
        return 0.0
    if d >= j:
        cap = min(
            cap,
            (S - j + 1) / (S - j + 1 + j * (d - j + 1)),
        )
    return cap


def u_floors(
    N: int, j: int, d: int, R: int, T: int, Y: int, q: int, y: float
):
    S = R + T
    coupled = (N - 2 * j + 3 + (j - 1) * y) / (j + 1)
    if S >= j:
        coupled += j * y / (S - j + 1)
    component = (d + 1) / (j + 1) + y
    output = [("coupled_hshadow", coupled), ("component", component)]
    # H is a linear forest on S vertices with exactly R-Y isolated arm
    # components.  Isolates have inclusion probability at least j/S among
    # uniform independent j-sets (swap any occupied non-isolate to an
    # isolate).  The degree-two extension count therefore gives the exact
    # lower floor below for h_(j+1)/h_j, and f_(j+1)>=h_(j+1).
    h_isolates = R - Y
    h_average_extensions = S - 3 * j + 2 * j * h_isolates / S
    output.append((
        "H_linear_isolate_bias",
        1 + y + y * max(0.0, h_average_extensions) / (j + 1),
    ))
    # Exact all-order adjacent-ratio concentration theorem: every allocation
    # H likelihood-ratio dominates the fully concentrated path allocation.
    # Therefore h_(j+1)/h_j is at least the corresponding canonical ratio.
    concentrated = [C(R - Y, rank) for rank in range(j + 2)]
    concentrated = convolve(concentrated, path_row(T - Y + 2, j + 1), j + 1)
    for _ in range(Y - 1):
        concentrated = convolve(concentrated, path_row(2, j + 1), j + 1)
    concentrated_ratio = (
        concentrated[j + 1] / concentrated[j] if concentrated[j] else 0.0
    )
    output.append((
        "H_exact_adjacent_ratio_concentration",
        1 + y + y * concentrated_ratio,
    ))
    # Closed rational consequence of the same theorem.  If alpha is the
    # degree of Hconc and W=sum(1/root_odd), Newton's inequalities give
    # c_(j+1)/c_j >= alpha*(alpha-j)/((j+1)W).  For the long path, W is an
    # elementary parity polynomial obtained from its top two coefficients.
    long_vertices = T - Y + 2
    long_degree = (long_vertices + 1) // 2
    if long_vertices % 2 == 0:
        half = long_vertices // 2
        long_reciprocal_sum = half * (half + 2) / 6
    else:
        half = (long_vertices - 1) // 2
        long_reciprocal_sum = (half + 1) * (half + 2) / 2
    alpha = (R - Y) + (Y - 1) + long_degree
    reciprocal_sum = (R - Y) + (Y - 1) / 2 + long_reciprocal_sum
    newton_ratio = (
        alpha * (alpha - j) / ((j + 1) * reciprocal_sum)
        if alpha > j and reciprocal_sum > 0
        else 0.0
    )
    assert newton_ratio <= concentrated_ratio + 1e-9
    output.append((
        "H_concentrated_Newton_top_ratio",
        1 + y + y * newton_ratio,
    ))
    if q == 0:
        isolates = d - R
        average_extensions = N - 3 * j + 2 * j * isolates / N
        output.append(
            ("linear_isolate_bias", 1 + y + average_extensions / (j + 1))
        )
    return output


def rank4_exact_y_cap(
    N: int,
    d: int,
    R: int,
    T: int,
    B2: int,
    A2: int,
    Y: int,
    tau: int,
) -> float:
    """Upper h4/f4 using the exact rank-four forest motif formula.

    For H, only its number of P4 subtrees is not fixed by (T,Y).  Its exact
    minimum is max(0,T-2Y), which maximizes h4 and hence gives the safe cap.
    """
    S = R + T
    wedges_f = N - 1 + B2 - C(d, 2) - R
    matchings_f = C(S, 2) - wedges_f
    T4_f = (
        N - 2 + B2 + tau - C(d, 3) - A2 - (d - 1) * R - Y
    )
    f4 = (
        C(N, 4)
        - S * C(N - 2, 2)
        + wedges_f * (N - 3)
        + matchings_f
        - T4_f
    )
    wedges_h = T - Y
    matchings_h = C(T, 2) - wedges_h
    T4_h_min = max(0, T - 2 * Y)
    h4_max = (
        C(S, 4)
        - T * C(S - 2, 2)
        + wedges_h * (S - 3)
        + matchings_h
        - T4_h_min
    )
    assert 0 <= h4_max <= f4
    return h4_max / f4


def all_row_sector_gap(
    N: int,
    j: int,
    d: int,
    R: int,
    T: int,
    Y: int,
    B2: int,
    tau: int,
    A2: int,
) -> float:
    """Lower the full m0 gap using both adjacent centre-sector rows.

    The exact decomposition is C_f f_(j+1)+C_b f_j+C_h h_j.  The earlier
    row lemma gives f_j>=h_j+E_j and f_(j+1)>=h_(j+1)+E_(j+1), while the new
    adjacent-ratio theorem gives h_(j+1)>=rho*h_j and h_j<=Hmax_j.
    """
    base = float(gaps(N, j, d, R, B2, tau, A2, Y, 0.0, u_override=1.0))
    cf = float(gaps(N, j, d, R, B2, tau, A2, Y, 0.0, u_override=2.0)) - base
    hmax = h_max_row(R, T, Y, j + 1)
    concentrated = [C(R - Y, rank) for rank in range(j + 2)]
    concentrated = convolve(concentrated, path_row(T - Y + 2, j + 1), j + 1)
    for _ in range(Y - 1):
        concentrated = convolve(concentrated, path_row(2, j + 1), j + 1)
    rho = concentrated[j + 1] / concentrated[j] if concentrated[j] else 0.0
    common_h_coefficient = float(
        gaps(
            N,
            j,
            d,
            R,
            B2,
            tau,
            A2,
            Y,
            1.0,
            u_override=2.0 + rho,
        )
    )
    current_extra = center_sector_extra_lower(j, d, R, T, Y)
    next_extra = center_sector_extra_lower(j + 1, d, R, T, Y)
    return (
        cf * next_extra
        + base * current_extra
        + min(0.0, common_h_coefficient) * hmax[j]
    )


def center_deep_y_cap(
    j: int, d: int, R: int, T: int, Y: int, rmax: int
) -> float:
    """Literal-row cap from centres, deep tails, and unsubdivided leaves.

    Delete the mandatory first vertex of every arm.  The remaining deep-tail
    forest K has T vertices and T-Y edges.  Its rank-r row is at least the
    first union-bound Bonferroni floor C(T,r)-(T-Y)C(T-2,r-2).  If c centres
    are selected, at least R-Y-c*rmax unsubdivided arm vertices remain as
    isolates next to K.  Summing these disjoint exact-centre sectors gives an
    allocation-independent lower bound for f_j-h_j.
    """
    S = R + T
    wedges_h = T - Y
    disjoint_edge_pairs_h = C(T, 2) - wedges_h
    bonferroni_two = (
        C(S, j)
        - T * C(S - 2, j - 2)
        + wedges_h * C(S - 3, j - 3)
        + disjoint_edge_pairs_h * C(S - 4, j - 4)
    )
    matching_size = max(Y, (T + 1) // 2)
    matching_upper = sum(
        C(matching_size, selected_edges)
        * 2**selected_edges
        * C(S - 2 * matching_size, j - selected_edges)
        for selected_edges in range(j + 1)
    )
    # Exact coefficientwise path-allocation maximum.  The local grafts
    # P_(a+b-3)P_3 >= P_aP_b (a,b>=3) and
    # P_(a-1)P_3 >= P_aP_2 (a>=3) reduce every allocation to this row.
    if T >= 2 * Y:
        long_path = T - 2 * Y + 3
        factors = [path_row(long_path, j)] + [path_row(3, j)] * (Y - 1)
    else:
        factors = (
            [path_row(3, j)] * (T - Y)
            + [path_row(2, j)] * (2 * Y - T)
        )
    factors += [[C(R - Y, rank) for rank in range(j + 1)]]
    hmax_row = [1] + [0] * j
    for factor in factors:
        hmax_row = convolve(hmax_row, factor, j)
    path_allocation_upper = hmax_row[j]
    h_upper = min(
        C(S, j), bonferroni_two, matching_upper, path_allocation_upper
    )
    assert h_upper >= 0
    if h_upper == 0:
        return 0.0
    if T >= 2 * Y:
        k_factors = [path_row(T - 2 * Y + 2, j)] + [path_row(2, j)] * (Y - 1)
    else:
        k_factors = (
            [path_row(2, j)] * (T - Y)
            + [path_row(1, j)] * (2 * Y - T)
        )
    k_min_row = [1] + [0] * j
    for factor in k_factors:
        k_min_row = convolve(k_min_row, factor, j)
    k_lower = [
        max(
            k_min_row[rank],
            C(T, rank) - (T - Y) * C(T - 2, rank - 2),
        )
        for rank in range(j + 1)
    ]
    extra = 0
    unoccupied = R - Y

    def sector(isolates: int, residual_rank: int) -> int:
        return sum(
            C(isolates, selected_isolates)
            * k_lower[residual_rank - selected_isolates]
            for selected_isolates in range(residual_rank + 1)
        )

    for centres in range(1, min(d, j) + 1):
        residual_rank = j - centres
        sectors = C(d, centres)
        # Across all c-subsets of centres, the number L of unoccupied arms
        # outside the subset has exact mean U*(d-c)/d.  The row coefficient
        # [x^r](1+x)^L K_lower is a nondecreasing discrete-convex sequence in
        # integer L (its second difference has nonnegative binomial-basis
        # coefficients).  Integer Jensen therefore gives the balanced floor.
        total_isolates = sectors * unoccupied * (d - centres) // d
        assert sectors * unoccupied * (d - centres) % d == 0
        low, excess = divmod(total_isolates, sectors)
        extra += (sectors - excess) * sector(low, residual_rank)
        extra += excess * sector(low + 1, residual_rank)
    return h_upper / (h_upper + extra) if extra else 1.0


def scan(maximum_order: int, maximum_rank: int) -> dict[str, object]:
    cells = evaluations = 0
    minimum = None
    negatives = []
    by_rank = {}
    for N in range(15, maximum_order + 1):
        for j in range(4, min(maximum_rank, N) + 1):
            for d in range(1, N):
                for R in range(1, N - d + 1):
                    T = N - d - R
                    if T <= 0:
                        continue
                    data = balanced_data(d, R)
                    q = int(data["q"])
                    weights = data["weights"]
                    A2 = int(data["A2"])
                    B2 = C(d - 1, 2) + A2
                    B3 = C(d - 1, 3) + int(data["A3"])
                    base_tau = B3 + (d - 1) * R + T - (N - 2)
                    base_cap = y_cap(N, j, d, R, B2, T)
                    ymax_occupied = min(T, R)
                    local = None
                    for Y in range(1, ymax_occupied + 1):
                        tau_values = {
                            base_tau + sum(weights[:Y]),
                            base_tau + sum(weights[-Y:]),
                        }
                        for tau in tau_values:
                            cap = base_cap
                            cap = min(
                                cap,
                                center_deep_y_cap(
                                    j,
                                    d,
                                    R,
                                    T,
                                    Y,
                                    max(int(value) for value in data["arms"]),
                                ),
                            )
                            if j == 4:
                                cap = min(
                                    cap,
                                    rank4_exact_y_cap(
                                        N, d, R, T, B2, A2, Y, tau
                                    ),
                                )
                            for ylabel, y in (("zero", 0.0), ("cap", cap)):
                                candidates = []
                                for uname, u in u_floors(
                                    N, j, d, R, T, Y, q, y
                                ):
                                    value = float(
                                        gaps(
                                            N, j, d, R, B2, tau, A2, Y, y,
                                            u_override=u,
                                        )
                                    )
                                    candidates.append((value, uname))
                                    evaluations += 1
                                candidates.append((
                                    all_row_sector_gap(
                                        N,
                                        j,
                                        d,
                                        R,
                                        T,
                                        Y,
                                        B2,
                                        tau,
                                        A2,
                                    ),
                                    "exact_adjacent_sector_rows",
                                ))
                                evaluations += 1
                                best = max(candidates)
                                record = (
                                    best[0], N, j, d, R, T, Y, tau, ylabel,
                                    best[1], cap,
                                )
                                if local is None or record < local:
                                    local = record
                    assert local is not None
                    cells += 1
                    if minimum is None or local < minimum:
                        minimum = local
                    if j not in by_rank or local < by_rank[j]:
                        by_rank[j] = local
                    if local[0] < -1e-6:
                        negatives.append(local)
                        if len(negatives) <= 20:
                            print("negative", local, flush=True)
    return {
        "orders": [15, maximum_order],
        "ranks": [4, maximum_rank],
        "parameter_cells": cells,
        "bound_evaluations": evaluations,
        "minimum": minimum,
        "rank_minima": by_rank,
        "negatives": negatives,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=30)
    parser.add_argument("--rank", type=int, default=12)
    args = parser.parse_args()
    result = scan(args.order, args.rank)
    for key, value in result.items():
        if key == "negatives":
            print("negatives", len(value), sorted(value)[:30])
        else:
            print(key, value)


if __name__ == "__main__":
    main()
