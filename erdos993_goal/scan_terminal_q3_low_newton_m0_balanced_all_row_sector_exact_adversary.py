#!/usr/bin/env python3
"""Exact finite adversarial scan of the sharpened balanced m=0 certificate.

This is search evidence, not an all-order theorem.  It keeps both consecutive
exact-centre sector floors, the all-order H adjacent-ratio concentration, and
the positive exact-U0 reserve h_(j-1) that the earlier relaxation dropped.
All sign decisions are integer decisions; no floating tolerance is used.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from functools import lru_cache
from math import comb
from pathlib import Path

from prove_balanced_subdivided_star_m0_row_correlation_adversary import (
    center_sector_extra_lower as _center_sector_extra_lower,
    h_max_row as _h_max_row,
)
from probe_terminal_q3_low_newton_m0_balanced_subdivided_star_adversary import (
    balanced_arm_counts,
    rank3_counts,
)


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "terminal_q3_low_newton_m0_balanced_all_row_sector_exact_search_20260829.json"
DEPENDENCIES = (
    ROOT / "prove_balanced_subdivided_star_m0_row_correlation_adversary.py",
    ROOT / "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json",
    ROOT / "prove_balanced_subdivided_star_h_adjacent_ratio_concentration_adversary.py",
    ROOT / "balanced_subdivided_star_h_adjacent_ratio_concentration_exact_adversary_20260829.json",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def convolve(left: tuple[int, ...], right: tuple[int, ...], maximum: int) -> tuple[int, ...]:
    output = [0] * (maximum + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= maximum:
                output[i + j] += a * b
    return tuple(output)


def add_rows(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    maximum = max(len(left), len(right))
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(maximum)
    )


@lru_cache(maxsize=None)
def path_row(vertices: int, maximum: int) -> tuple[int, ...]:
    return tuple(C(vertices + 1 - rank, rank) for rank in range(maximum + 1))


@lru_cache(maxsize=None)
def row_power(row: tuple[int, ...], exponent: int, maximum: int) -> tuple[int, ...]:
    output = (1,) + (0,) * maximum
    for _ in range(exponent):
        output = convolve(output, row, maximum)
    return output


@lru_cache(maxsize=None)
def component_base_rows(degree: int, occupied: int, maximum: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
    """Literal armwise lower rows H_i^0,K_i^0 at one centre."""
    assert 0 <= occupied <= degree
    p1 = path_row(1, maximum)
    p2 = path_row(2, maximum)
    H = convolve(
        row_power(p2, occupied, maximum),
        row_power(p1, degree - occupied, maximum),
        maximum,
    )
    K = row_power(p1, occupied, maximum)
    F = add_rows(H, (0,) + K[:-1])
    return F, H


@lru_cache(maxsize=None)
def histograms(centres: int, degree: int) -> tuple[tuple[int, ...], ...]:
    """Histograms of occupancy counts 0..degree over identical centres."""
    output: list[tuple[int, ...]] = []

    def visit(bin_index: int, remaining: int, prefix: tuple[int, ...]) -> None:
        if bin_index == degree:
            output.append(prefix + (remaining,))
            return
        for count in range(remaining + 1):
            visit(bin_index + 1, remaining - count, prefix + (count,))

    visit(0, centres, ())
    return tuple(output)


@lru_cache(maxsize=None)
def occupancy_profiles(
    d: int, R: int, T: int, maximum: int
) -> tuple[tuple[int, int, tuple[int, ...]], ...]:
    """Distinct (Y,weighted occupancy,E^0 row) profiles.

    Balanced centre degrees take only q and q+1.  Histograms quotient out all
    permutations within each degree class, so this remains far smaller than
    enumerating arm subsets.
    """
    q, high_centres = divmod(R, d)
    groups = []
    for centres, degree in ((high_centres, q + 1), (d - high_centres, q)):
        if centres:
            groups.append((centres, degree))
    group_records: list[list[tuple[int, int, tuple[int, ...], tuple[int, ...]]]] = []
    for centres, degree in groups:
        records = []
        for histogram in histograms(centres, degree):
            Y = sum(value * count for value, count in enumerate(histogram))
            weighted = (degree - 1) * Y
            F = (1,) + (0,) * maximum
            H = (1,) + (0,) * maximum
            for occupied, count in enumerate(histogram):
                if not count:
                    continue
                component_F, component_H = component_base_rows(
                    degree, occupied, maximum
                )
                F = convolve(F, row_power(component_F, count, maximum), maximum)
                H = convolve(H, row_power(component_H, count, maximum), maximum)
            records.append((Y, weighted, F, H))
        group_records.append(records)

    combined = [(0, 0, (1,) + (0,) * maximum, (1,) + (0,) * maximum)]
    for records in group_records:
        updated = []
        for Y0, weighted0, F0, H0 in combined:
            for Y1, weighted1, F1, H1 in records:
                updated.append((
                    Y0 + Y1,
                    weighted0 + weighted1,
                    convolve(F0, F1, maximum),
                    convolve(H0, H1, maximum),
                ))
        combined = updated

    distinct = set()
    for Y, weighted, F, H in combined:
        if not (1 <= Y <= min(R, T)):
            continue
        E = tuple(F[index] - H[index] for index in range(maximum + 1))
        assert all(value >= 0 for value in E)
        distinct.add((Y, weighted, E))
    return tuple(sorted(distinct))


@lru_cache(maxsize=None)
def hmax_row(R: int, T: int, Y: int, maximum: int) -> tuple[int, ...]:
    return tuple(_h_max_row(R, T, Y, maximum))


@lru_cache(maxsize=None)
def sector_extra(rank: int, d: int, R: int, T: int, Y: int) -> int:
    return _center_sector_extra_lower(rank, d, R, T, Y)


@lru_cache(maxsize=None)
def concentrated_row(R: int, T: int, Y: int, maximum: int) -> tuple[int, ...]:
    row = tuple(C(R - Y, rank) for rank in range(maximum + 1))
    row = convolve(row, path_row(T - Y + 2, maximum), maximum)
    p2 = path_row(2, maximum)
    for _ in range(Y - 1):
        row = convolve(row, p2, maximum)
    return row


@lru_cache(maxsize=None)
def q0_f_concentrated_row(
    d: int, R: int, T: int, maximum: int
) -> tuple[int, ...]:
    """Coefficientwise minimum/LR endpoint for the q=0 linear forest F."""
    row = row_power(path_row(1, maximum), d - R, maximum)
    row = convolve(row, path_row(T + 2, maximum), maximum)
    row = convolve(row, row_power(path_row(2, maximum), R - 1, maximum), maximum)
    return row


@lru_cache(maxsize=None)
def q0_f_max_row(d: int, R: int, T: int, maximum: int) -> tuple[int, ...]:
    """Coefficientwise maximum for the q=0 linear forest F."""
    core = tuple(_h_max_row(R, T + R, R, maximum))
    return convolve(
        row_power(path_row(1, maximum), d - R, maximum), core, maximum
    )


def balanced_motifs(d: int, R: int) -> tuple[int, int, int, tuple[int, ...]]:
    arms = balanced_arm_counts(d, R)
    A2 = sum(C(value, 2) for value in arms)
    B2 = C(d - 1, 2) + A2
    B3 = C(d - 1, 3) + sum(C(value, 3) for value in arms)
    weights = tuple(sorted(value - 1 for value in arms for _ in range(value)))
    assert len(weights) == R
    return A2, B2, B3, weights


@lru_cache(maxsize=None)
def sector_extra_upper(rank: int, d: int, R: int, T: int) -> int:
    """Coefficientwise upper bound for [x^rank](F-H).

    If a c-subset of centres containing u of the high-degree balanced centres
    is selected, exactly c*q+u mandatory arm vertices are deleted.  Ignoring
    all remaining edges leaves at most C(S-c*q-u,rank-c) sets in that sector.
    """
    S = R + T
    q, high = divmod(R, d)
    output = 0
    for centres in range(1, min(d, rank) + 1):
        low_u = max(0, centres - (d - high))
        high_u = min(centres, high)
        for selected_high in range(low_u, high_u + 1):
            multiplicity = C(high, selected_high) * C(
                d - high, centres - selected_high
            )
            deleted_arms = centres * q + selected_high
            output += multiplicity * C(
                S - deleted_arms, rank - centres
            )
    return output


def exact_coefficients(
    N: int,
    j: int,
    d: int,
    R: int,
    T: int,
    Y: int,
    B2: int,
    A2: int,
    tau: int,
) -> dict[str, int]:
    S = R + T
    assert N == d + S
    a = C(N, 2) - S
    W = N - 1 + B2
    wedges_f = W - C(d, 2) - R
    z2 = S * (N - 2) - 2 * wedges_f
    h2 = C(S, 2) - T
    c0 = a + z2 + h2
    f3 = C(N, 3) - S * (N - 2) + wedges_f
    matchings_f = C(S, 2) - wedges_f
    T4_f = N - 2 + B2 + tau - C(d, 3) - A2 - (d - 1) * R - Y
    z3 = S * C(N - 2, 2) - 2 * (
        wedges_f * (N - 3) + matchings_f
    ) + 3 * T4_f

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
    assert a > 0 and f3 > 0 and p0 > 0 and A0 > 0

    Cf = f3 * (j + 1) * a * A0
    Cb = (
        f3
        * (
            (j + 1) * a * A0
            + a * p0 * ((j + 1) * (c0 + R0) - 3 * (p0 + a))
        )
        - a * p0 * (p0 + a) * j * z3
    )
    Ch = f3 * ((j + 1) * a * A0 - 3 * a * p0 * (p0 + a))
    return {
        "a": a,
        "f3": f3,
        "z3": z3,
        "p0": p0,
        "R0": R0,
        "A0": A0,
        "Cf": Cf,
        "Cb": Cb,
        "Ch": Ch,
    }


def certificate_cell(
    N: int,
    j: int,
    d: int,
    R: int,
    T: int,
    Y: int,
    B2: int,
    A2: int,
    tau: int,
    base_extra_row: tuple[int, ...] | None = None,
) -> dict[str, int | str]:
    coefficients = exact_coefficients(N, j, d, R, T, Y, B2, A2, tau)
    Cf, Cb, Ch = (coefficients[name] for name in ("Cf", "Cb", "Ch"))
    assert Cf > 0
    old_Ej = sector_extra(j, d, R, T, Y)
    old_Enext = sector_extra(j + 1, d, R, T, Y)
    base_Ej = base_extra_row[j] if base_extra_row is not None else 0
    base_Enext = base_extra_row[j + 1] if base_extra_row is not None else 0
    Ej = max(old_Ej, base_Ej)
    Enext = max(old_Enext, base_Enext)
    Ej_upper = sector_extra_upper(j, d, R, T)
    assert Ej <= Ej_upper
    Hmax = hmax_row(R, T, Y, j + 1)[j]
    conc = concentrated_row(R, T, Y, j + 1)
    cprev, cj, cnext = conc[j - 1], conc[j], conc[j + 1]
    # Quantitative graft-residual tangent.  Every residual in the telescoping
    # path concentration has the form x^4 times a linear-forest row with at
    # least S-8 vertices.  Joining path components shows that its adjacent
    # ratio at t=j-4 is at least the P_(S-8) ratio.  This retains the required
    # correlation between the magnitude h_j and its adjacent ratio.
    residual_vertices = max(0, R + T - 8)
    residual_rank = j - 4
    residual_denominator = C(
        residual_vertices + 1 - residual_rank, residual_rank
    )
    residual_numerator = C(
        residual_vertices - residual_rank, residual_rank + 1
    )
    if residual_denominator == 0:
        residual_denominator = 1
        residual_numerator = 0
    common_numerator = (
        Cf * residual_numerator + (Cb + Ch) * residual_denominator
    )
    paid_Ej = Cb * (Ej if Cb >= 0 else Ej_upper)
    h_endpoint = cj if common_numerator >= 0 else Hmax
    cleared = (
        residual_denominator * (Cf * Enext + paid_Ej)
        + residual_denominator * Cf * cprev
        + Cf
        * (
            residual_denominator * cnext
            - residual_numerator * cj
        )
        + common_numerator * h_endpoint
    )
    scale = residual_denominator
    branch = "graft_residual_tangent"
    q0_details: dict[str, int | str] = {}
    if R < d:
        fconc = q0_f_concentrated_row(d, R, T, j + 1)
        fmax = q0_f_max_row(d, R, T, j + 1)
        fcj, fcnext = fconc[j], fconc[j + 1]
        if fcj:
            f_common_numerator = Cf * fcnext + Cb * fcj
            f_endpoint = fcj if f_common_numerator >= 0 else fmax[j]
            h_sign_endpoint = cj if Ch >= 0 else Hmax
            q0_cleared = (
                f_common_numerator * f_endpoint
                + Ch * fcj * h_sign_endpoint
                + Cf * fcj * cprev
            )
            q0_details = {
                "q0_fconc_j": fcj,
                "q0_fconc_next": fcnext,
                "q0_fmax_j": fmax[j],
                "q0_f_common_numerator": f_common_numerator,
                "q0_cleared_certificate": q0_cleared,
            }
            if q0_cleared >= 0 and cleared < 0:
                cleared = q0_cleared
                scale = fcj
                branch = "q0_F_adjacent_ratio"

    return {
        **coefficients,
        "Ej": Ej,
        "old_Ej": old_Ej,
        "base_Ej": base_Ej,
        "Ej_upper": Ej_upper,
        "Enext": Enext,
        "old_Enext": old_Enext,
        "base_Enext": base_Enext,
        "Hmax_j": Hmax,
        "conc_j": cj,
        "conc_prev": cprev,
        "conc_next": cnext,
        "common_numerator": common_numerator,
        "h_endpoint": h_endpoint,
        "residual_ratio_numerator": residual_numerator,
        "residual_ratio_denominator": residual_denominator,
        "cleared_certificate": cleared,
        "certificate_scale": scale,
        "branch": branch,
        **q0_details,
    }


def scan(start_order: int, maximum_order: int, maximum_rank: int) -> dict[str, object]:
    parameter_cells = endpoint_checks = supported_checks = zero_checks = 0
    negative = []
    minimum_positive = None
    minimum_normalized = None
    branch_counts: dict[str, int] = {}
    coefficient_minima = {"Cf": None, "Cb": None}
    rank_minima: dict[int, tuple] = {}
    for N in range(start_order, maximum_order + 1):
        for d in range(1, N):
            for R in range(1, N - d):
                T = N - d - R
                if T <= 0:
                    continue
                A2, B2, B3, weights = balanced_motifs(d, R)
                base_tau = B3 + (d - 1) * R + T - (N - 2)
                profiles = occupancy_profiles(d, R, T, maximum_rank + 1)
                for Y, weighted_occupancy, base_extra_row in profiles:
                    tau_endpoints = {base_tau + weighted_occupancy}
                    for j in range(4, min(maximum_rank, N) + 1):
                        parameter_cells += 1
                        local = None
                        for tau in tau_endpoints:
                            result = certificate_cell(
                                N, j, d, R, T, Y, B2, A2, tau, base_extra_row
                            )
                            endpoint_checks += 1
                            branch = str(result["branch"])
                            branch_counts[branch] = branch_counts.get(branch, 0) + 1
                            for name in coefficient_minima:
                                value = int(result[name])
                                old = coefficient_minima[name]
                                coefficient_minima[name] = value if old is None else min(old, value)
                            value = int(result["cleared_certificate"])
                            scale = int(result["certificate_scale"])
                            record = (value, N, j, d, R, T, Y, tau, branch)
                            if local is None or record < local:
                                local = record
                            if value < 0:
                                negative.append({
                                    "cell": list(record),
                                    "details": result,
                                })
                            elif value == 0:
                                zero_checks += 1
                            else:
                                supported_checks += 1
                                if minimum_positive is None or record < minimum_positive:
                                    minimum_positive = record
                                normalized_record = (value / scale, *record[1:])
                                if minimum_normalized is None or normalized_record < minimum_normalized:
                                    minimum_normalized = normalized_record
                        if local is not None and (j not in rank_minima or local < rank_minima[j]):
                            rank_minima[j] = local
    return {
        "orders": [start_order, maximum_order],
        "ranks": [4, maximum_rank],
        "parameter_cells": parameter_cells,
        "tau_endpoint_checks": endpoint_checks,
        "positive_checks": supported_checks,
        "zero_checks": zero_checks,
        "negative_checks": len(negative),
        "minimum_positive_cleared": minimum_positive,
        "minimum_positive_divided_by_ratio_scale": minimum_normalized,
        "coefficient_minima": coefficient_minima,
        "branch_counts": branch_counts,
        "rank_minima": {str(key): value for key, value in rank_minima.items()},
        "first_negative_witnesses": negative[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-order", type=int, default=15)
    parser.add_argument("--order", type=int, default=30)
    parser.add_argument("--rank", type=int, default=14)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    result = scan(args.start_order, args.order, args.rank)
    payload = {
        "schema": "terminal-q3-low-newton-m0-balanced-all-row-sector-exact-search-v1",
        "status": (
            "SEARCH_EXACT_NO_NEGATIVES_BALANCED_M0_ALL_ROW_SECTOR_BOX"
            if result["negative_checks"] == 0
            else "SEARCH_EXACT_NEGATIVE_RELAXATION_WITNESSES_FOUND"
        ),
        "exact_certificate": (
            "Cf*E_(j+1)+Cb*E_j+Cf*H_(j-1) plus the coupled H_j/H_(j+1) tangent; "
            "the report stores the denominator-cleared integer form"
        ),
        "tau_endpoint_justification": (
            "Cf,Cb,Ch are affine in tau; the minimum of the resulting minimum "
            "of two affine branches on the exact occupied-weight interval is "
            "attained at an interval endpoint."
        ),
        "result": result,
        "dependency_sha256": {
            path.name: sha256(path) for path in DEPENDENCIES if path.exists()
        },
        "scope_warning": (
            "This is an exact finite parameter search.  Even a no-negative result "
            "does not prove the all-order balanced endpoint, terminal m=0, the "
            "terminal-payment theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, args.output)
    print(payload["status"])
    for key, value in result.items():
        if key != "first_negative_witnesses":
            print(key, value)
    print("first_negative_witnesses", result["first_negative_witnesses"])
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(args.output))


if __name__ == "__main__":
    main()
