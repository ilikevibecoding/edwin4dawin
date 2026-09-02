#!/usr/bin/env python3
"""Search-only diagnostics for paying terminal m=0 in the d=1 sector.

The frozen retained-hprev identity and the inductive low-block q-gap lemma
combine before any coefficient endpoint is chosen.  After the q3 terms
cancel, the H and K blocks have the exact sufficient form recorded below.
This file currently scans several elementary row-ratio relaxations; it is not
an all-order sign certificate.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
from functools import lru_cache
from math import comb

from prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary import (
    linear_q2,
    linear_q3,
)
from prove_balanced_subdivided_star_m0_row_correlation_adversary import h_max_row
from prove_d1_spider_quantitative_qgap_cap_adversary import k_coefficient_ceiling
from prove_d1_spider_quantitative_qgap_cap_adversary import h_concentrated_row
from prove_linear_forest_empty_component_token_ratio_adversary import refined_cap
from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    exact_coefficients,
)


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def tangent_ratio(total_vertices: int, target_rank: int) -> Fraction:
    vertices = max(0, total_vertices - 8)
    residual_rank = target_rank - 4
    denominator = C(vertices + 1 - residual_rank, residual_rank)
    numerator = C(vertices - residual_rank, residual_rank + 1)
    return Fraction(numerator, denominator) if denominator else Fraction(0)


@lru_cache(maxsize=None)
def cached_hconc(R: int, T: int, Y: int) -> tuple[int, ...]:
    return tuple(h_concentrated_row(R, T, Y))


@lru_cache(maxsize=None)
def cached_hmax(R: int, T: int, Y: int, maximum: int) -> tuple[int, ...]:
    return tuple(h_max_row(R, T, Y, maximum))


@lru_cache(maxsize=None)
def cached_kceiling(T: int, Y: int, rank: int) -> tuple[int, int]:
    return k_coefficient_ceiling(T, Y, rank)


def k_adjacent_ratio_floor(T: int, Y: int, rank: int) -> Fraction:
    """Candidate LR floor for K_rank/K_(rank-1), minimizing over long counts."""
    target = rank - 1
    if T == Y:
        denominator = C(Y, target)
        return Fraction(C(Y, rank), denominator) if denominator else Fraction(0)
    ratios = []
    for long2 in range(1, min(Y, T - Y) + 1):
        row = cached_hconc(Y, T - Y, long2)
        denominator = row[target] if target < len(row) else 0
        if denominator:
            numerator = row[rank] if rank < len(row) else 0
            ratios.append(Fraction(numerator, denominator))
    return min(ratios) if ratios else Fraction(0)


def h_tangent_lower(
    R: int, T: int, Y: int, rank: int, lead: Fraction, middle: Fraction
) -> Fraction:
    """Frozen graft-residual tangent for lead(Hprev+Hnext)+middle*Hj."""
    conc = cached_hconc(R, T, Y)
    cprev = conc[rank - 1] if rank - 1 < len(conc) else 0
    cj = conc[rank] if rank < len(conc) else 0
    cnext = conc[rank + 1] if rank + 1 < len(conc) else 0
    ceiling = cached_hmax(R, T, Y, rank)[rank]
    ratio = tangent_ratio(R + T, rank)
    common = lead * ratio + middle
    endpoint = cj if common >= 0 else ceiling
    return lead * cprev + lead * (cnext - ratio * cj) + common * endpoint


def k_tangent_lower(
    T: int, Y: int, rank: int, lead: Fraction, middle: Fraction
) -> tuple[Fraction, int]:
    """Minimize the analogous fixed-long-count K tangent over all counts."""
    if T == Y:
        prev = C(Y, rank - 1)
        current = C(Y, rank)
        return lead * current + middle * prev, 0
    ratio = tangent_ratio(T, rank - 1)
    common = lead * ratio + middle
    candidates = []
    for long2 in range(1, min(Y, T - Y) + 1):
        conc = cached_hconc(Y, T - Y, long2)
        cprev = conc[rank - 1] if rank - 1 < len(conc) else 0
        current = conc[rank] if rank < len(conc) else 0
        ceiling = cached_hmax(Y, T - Y, long2, rank - 1)[rank - 1]
        endpoint = cprev if common >= 0 else ceiling
        value = lead * (current - ratio * cprev) + common * endpoint
        candidates.append((value, long2))
    return min(candidates) if candidates else (Fraction(0), -1)


def k_global_ceiling_tangent_lower(
    T: int, Y: int, rank: int, lead: Fraction, middle: Fraction
) -> tuple[Fraction, int]:
    """K tangent using the frozen global previous-rank ceiling.

    On the negative-common branch the ceiling term is independent of Z and
    the one-step K_Z identity predicts that the residual minimum is at Zmax.
    The positive-common branch retains the literal minimum for diagnostics.
    """
    if T == Y:
        return lead * C(Y, rank) + middle * C(Y, rank - 1), 0
    rho = tangent_ratio(T, rank - 1)
    common = lead * rho + middle
    zmax = min(Y, T - Y)
    candidates = []
    for long2 in range(1, zmax + 1):
        canonical = cached_hconc(Y, T - Y, long2)
        previous = canonical[rank - 1] if rank - 1 < len(canonical) else 0
        current = canonical[rank] if rank < len(canonical) else 0
        if common < 0:
            global_ceiling = cached_kceiling(T, Y, rank - 1)[0]
            value = (
                lead * (current - rho * previous)
                + common * global_ceiling
            )
        else:
            value = lead * current + middle * previous
        candidates.append((value, long2))
    return min(candidates) if candidates else (Fraction(0), -1)


def scalar_coupled_lp_floor(
    R: int,
    T: int,
    rank: int,
    lead: Fraction,
    h_middle: Fraction,
    k_middle: Fraction,
) -> Fraction | None:
    """Homogeneous LP floor per K_(j-1), or None if a recession ray fails.

    It uses only literal containment, deletion/extension incidences, and the
    R new arm-entry vertices relating H to K.  This is a diagnostic for a
    simpler all-order cone; it is deliberately weaker than the row tangent.
    """
    S = R + T
    if rank > S:
        return Fraction(0)
    lam = Fraction(max(0, R - rank + 1), rank)
    mu = Fraction(max(0, R - rank), rank + 1)
    nu = Fraction(rank, S - rank + 1)
    ext = Fraction(max(0, S - 3 * rank), rank + 1)
    kap = Fraction(max(0, T - 3 * (rank - 1)), rank)

    def value(h: Fraction, k: Fraction) -> Fraction:
        hp = max(Fraction(1), nu * h)
        hn = max(mu * k, ext * h)
        return lead * hp + lead * hn + h_middle * h + lead * k + k_middle

    # Recession direction h->infinity at fixed k.
    if lead * nu + lead * ext + h_middle < 0:
        return None
    # Recession direction h=k+constant, k->infinity.  The active Hnext term
    # has slope max(mu,ext) on this ray.
    if lead * nu + lead * max(mu, ext) + h_middle + lead < 0:
        return None

    lines = []
    # A*x+B*y=C with x=h,y=k.
    lines.append((Fraction(0), Fraction(1), kap))
    lines.append((Fraction(1), Fraction(-1), lam))
    if nu:
        lines.append((Fraction(1), Fraction(0), 1 / nu))
    lines.append((ext, -mu, Fraction(0)))
    candidates = [(kap + lam, kap)]
    for index, (a1, b1, c1) in enumerate(lines):
        for a2, b2, c2 in lines[index + 1 :]:
            determinant = a1 * b2 - a2 * b1
            if not determinant:
                continue
            h = (c1 * b2 - c2 * b1) / determinant
            k = (a1 * c2 - a2 * c1) / determinant
            if k >= kap and h >= k + lam:
                candidates.append((h, k))
    return min(value(h, k) for h, k in candidates)


def block_coefficients(
    N: int, rank: int, R: int, T: int, Y: int
) -> dict[str, Fraction | int]:
    """Return the q3-cancelled H/K coefficients using low-block caps only."""
    assert N == 1 + R + T
    B2 = C(R, 2)
    tau = C(R, 3) + (R - 1) * (Y - 1)
    data = exact_coefficients(N, rank, 1, R, T, Y, B2, B2, tau)
    a, P, A0 = (int(data[key]) for key in ("a", "p0", "A0"))
    c0, R0 = None, int(data["R0"])
    # A0=P*c0-a*R0, and divisibility is exact in the rooted-tree formulas.
    c0_num = A0 + a * R0
    assert c0_num % P == 0
    c0 = c0_num // P

    h_supported = bool(cached_hmax(R, T, Y, rank)[rank])
    k_supported = bool(cached_kceiling(T, Y, rank - 1)[0])
    minimum_h_long3 = int(T > Y)
    uH_q3 = (
        linear_q3(R + T, R, Y, minimum_h_long3)
        if h_supported
        else Fraction(0)
    )
    uH_empty = (
        refined_cap(R + T, R, Y, rank)
        if h_supported
        else Fraction(0)
    )
    uH = min(uH_q3, uH_empty)
    maximum_k_long2 = min(Y, T - Y)
    uK_q2 = (
        linear_q2(T, Y, maximum_k_long2)
        if k_supported
        else Fraction(0)
    )
    uK_empty = (
        refined_cap(T, Y, int(T > Y), rank - 1)
        if k_supported
        else Fraction(0)
    )
    uK = min(uK_q2, uK_empty)
    uI = (
        (Fraction(rank - 1) * uK + R) / rank
        if k_supported
        else Fraction(0)
    )

    lead = (rank + 1) * A0
    h_middle = (
        2 * (rank + 1) * A0
        + P * (rank + 1) * (c0 + R0)
        - 6 * P * (P + a)
        - 3 * rank * P * (P + a) * uH
    )
    k_middle = (
        (rank + 1) * A0
        + P * (rank + 1) * (c0 + R0)
        - 3 * P * (P + a)
        - 3 * rank * P * (P + a) * uI
    )
    return {
        **data,
        "c0": c0,
        "uH_lowblock": uH,
        "uH_q3": uH_q3,
        "uH_empty": uH_empty,
        "uK_lowblock": uK,
        "uK_q2": uK_q2,
        "uK_empty": uK_empty,
        "uI_lowblock": uI,
        "H_supported": int(h_supported),
        "K_supported": int(k_supported),
        "lead": lead,
        "h_middle": h_middle,
        "k_middle": k_middle,
    }


def scan(maximum_order: int, maximum_R: int, maximum_rank: int) -> dict[str, object]:
    checks = 0
    negative_h = []
    negative_k = []
    negative_total_tangent = []
    negative_lead_plus_kmiddle = []
    negative_h_forward = []
    negative_split_payment = []
    negative_containment_payment = []
    negative_h_forward_empty_cap = []
    negative_scalar_lp = []
    negative_global_ceiling_tangent = []
    failed_scalar_lp_rays = []
    minima_h = None
    minima_k = None
    minimum_total_tangent = None
    minimum_positive_total_tangent = None
    tangent_branch_counts: dict[str, int] = {}
    k_minimizer_position_counts: dict[str, int] = {}
    for N in range(15, maximum_order + 1):
        for R in range(1, min(maximum_R, N - 2) + 1):
            T = N - 1 - R
            for Y in range(1, min(R, T) + 1):
                for rank in range(4, min(maximum_rank, N) + 1):
                    data = block_coefficients(N, rank, R, T, Y)
                    lead = Fraction(data["lead"])
                    h_middle = Fraction(data["h_middle"])
                    k_middle = Fraction(data["k_middle"])
                    M = R + T

                    # Universal deletion incidence: h_(j-1)/h_j >= j/(M-j+1).
                    # Max-degree-two extension: h_(j+1)/h_j >=
                    # max(0,M-3j)/(j+1).
                    h_supported = bool(data["H_supported"])
                    if h_supported:
                        h_ratio = Fraction(rank, M - rank + 1)
                        if M - 3 * rank > 0:
                            h_ratio += Fraction(M - 3 * rank, rank + 1)
                        h_value = lead * h_ratio + h_middle
                    else:
                        h_value = Fraction(0)

                    # K is a linear forest on T vertices.  Use the corresponding
                    # extension floor from rank j-1 to j.  If it vanishes, the
                    # middle coefficient must carry the top-support face.
                    k_supported = bool(data["K_supported"])
                    if k_supported:
                        k_ratio = k_adjacent_ratio_floor(T, Y, rank)
                        k_value = lead * k_ratio + k_middle
                    else:
                        k_value = Fraction(0)
                    record_h = (h_value, N, rank, R, T, Y)
                    record_k = (k_value, N, rank, R, T, Y)
                    h_tangent = h_tangent_lower(
                        R, T, Y, rank, lead, h_middle
                    )
                    k_tangent, k_long2 = k_tangent_lower(
                        T, Y, rank, lead, k_middle
                    )
                    k_global, k_global_z = k_global_ceiling_tangent_lower(
                        T, Y, rank, lead, k_middle
                    )
                    global_ceiling_total = h_tangent + k_global
                    total_tangent = h_tangent + k_tangent
                    record_total = (
                        total_tangent,
                        N,
                        rank,
                        R,
                        T,
                        Y,
                        h_tangent,
                        k_tangent,
                        k_long2,
                    )
                    h_common = lead * tangent_ratio(R + T, rank) + h_middle
                    k_common = lead * tangent_ratio(T, rank - 1) + k_middle
                    tangent_key = (
                        f"Hcap_{'q3' if data['uH_q3'] <= data['uH_empty'] else 'empty'}_"
                        f"Kcap_{'q2' if data['uK_q2'] <= data['uK_empty'] else 'empty'}_"
                        f"Hcommon_{'plus' if h_common >= 0 else 'minus'}_"
                        f"Kcommon_{'plus' if k_common >= 0 else 'minus'}"
                    )
                    tangent_branch_counts[tangent_key] = tangent_branch_counts.get(tangent_key, 0) + 1
                    zmax = min(Y, T - Y) if T > Y else 0
                    if k_long2 == 0:
                        zposition = "all_isolates"
                    elif k_long2 == 1:
                        zposition = "one"
                    elif k_long2 == zmax:
                        zposition = "maximum"
                    else:
                        zposition = "interior"
                    zposition_key = (
                        f"Kcommon_{'plus' if k_common >= 0 else 'minus'}_{zposition}"
                    )
                    k_minimizer_position_counts[zposition_key] = (
                        k_minimizer_position_counts.get(zposition_key, 0) + 1
                    )
                    lead_plus_kmiddle = lead + k_middle
                    h_forward_ratio = Fraction(max(0, M - 3 * rank), rank + 1)
                    h_forward = lead * h_forward_ratio + h_middle
                    h_middle_empty = h_middle - 3 * rank * int(data["p0"]) * (
                        int(data["p0"]) + int(data["a"])
                    ) * (Fraction(data["uH_empty"]) - Fraction(data["uH_lowblock"]))
                    h_forward_empty = lead * h_forward_ratio + h_middle_empty
                    h_conc = cached_hconc(R, T, Y)
                    hconc_previous = (
                        h_conc[rank - 1] if rank - 1 < len(h_conc) else 0
                    )
                    split_payment = lead * hconc_previous + k_tangent
                    containment_current = lead + h_forward
                    containment_previous = (
                        lead + k_middle + (R - Y) * h_forward
                    )
                    k_ratio_floor = k_adjacent_ratio_floor(T, Y, rank)
                    containment_payment = (
                        containment_current * k_ratio_floor
                        + containment_previous
                    )
                    scalar_lp = scalar_coupled_lp_floor(
                        R, T, rank, lead, h_middle, k_middle
                    )
                    if minima_h is None or record_h < minima_h:
                        minima_h = record_h
                    if minima_k is None or record_k < minima_k:
                        minima_k = record_k
                    if minimum_total_tangent is None or record_total < minimum_total_tangent:
                        minimum_total_tangent = record_total
                    if total_tangent > 0 and (
                        minimum_positive_total_tangent is None
                        or record_total < minimum_positive_total_tangent
                    ):
                        minimum_positive_total_tangent = record_total
                    if h_supported and h_value < 0:
                        negative_h.append(record_h)
                    if k_supported and k_value < 0:
                        negative_k.append(record_k)
                    if total_tangent < 0:
                        negative_total_tangent.append(record_total)
                    if k_supported and lead_plus_kmiddle < 0:
                        negative_lead_plus_kmiddle.append(
                            (lead_plus_kmiddle, N, rank, R, T, Y)
                        )
                    if h_supported and h_forward < 0:
                        negative_h_forward.append(
                            (h_forward, N, rank, R, T, Y)
                        )
                    if split_payment < 0:
                        negative_split_payment.append(
                            (
                                split_payment,
                                N,
                                rank,
                                R,
                                T,
                                Y,
                                lead * hconc_previous,
                                k_tangent,
                                k_long2,
                            )
                        )
                    if k_supported and containment_payment < 0:
                        negative_containment_payment.append(
                            (
                                containment_payment,
                                N,
                                rank,
                                R,
                                T,
                                Y,
                                h_forward,
                                k_ratio_floor,
                            )
                        )
                    if h_supported and h_forward_empty < 0:
                        negative_h_forward_empty_cap.append(
                            (h_forward_empty, N, rank, R, T, Y)
                        )
                    if scalar_lp is None:
                        failed_scalar_lp_rays.append((N, rank, R, T, Y))
                    elif scalar_lp < 0:
                        negative_scalar_lp.append(
                            (scalar_lp, N, rank, R, T, Y)
                        )
                    if global_ceiling_total < 0:
                        negative_global_ceiling_tangent.append(
                            (
                                global_ceiling_total,
                                N,
                                rank,
                                R,
                                T,
                                Y,
                                h_tangent,
                                k_global,
                                k_global_z,
                            )
                        )
                    checks += 1
    return {
        "orders": [15, maximum_order],
        "maximum_R": maximum_R,
        "maximum_rank": maximum_rank,
        "parameter_rank_checks": checks,
        "minimum_H_simple_ratio_lower": minima_h,
        "minimum_K_simple_ratio_lower": minima_k,
        "negative_H_simple_ratio_checks": len(negative_h),
        "negative_K_simple_ratio_checks": len(negative_k),
        "minimum_combined_HK_tangent_lower": minimum_total_tangent,
        "minimum_positive_combined_HK_tangent_lower": minimum_positive_total_tangent,
        "combined_tangent_branch_counts": tangent_branch_counts,
        "K_tangent_minimizer_position_counts": k_minimizer_position_counts,
        "negative_combined_HK_tangent_checks": len(negative_total_tangent),
        "negative_lead_plus_Kmiddle_checks": len(negative_lead_plus_kmiddle),
        "negative_H_forward_checks": len(negative_h_forward),
        "negative_split_Hprev_Kpayment_checks": len(negative_split_payment),
        "negative_containment_payment_checks": len(negative_containment_payment),
        "negative_H_forward_empty_cap_checks": len(negative_h_forward_empty_cap),
        "failed_scalar_coupled_LP_rays": len(failed_scalar_lp_rays),
        "negative_scalar_coupled_LP_checks": len(negative_scalar_lp),
        "negative_global_ceiling_tangent_checks": len(negative_global_ceiling_tangent),
        "first_negative_H": negative_h[:20],
        "first_negative_K": negative_k[:20],
        "first_negative_combined_HK_tangent": negative_total_tangent[:20],
        "first_negative_lead_plus_Kmiddle": negative_lead_plus_kmiddle[:20],
        "first_negative_H_forward": negative_h_forward[:20],
        "first_negative_split_Hprev_Kpayment": negative_split_payment[:20],
        "first_negative_containment_payment": negative_containment_payment[:20],
        "first_negative_H_forward_empty_cap": negative_h_forward_empty_cap[:20],
        "first_failed_scalar_coupled_LP_ray": failed_scalar_lp_rays[:20],
        "first_negative_scalar_coupled_LP": negative_scalar_lp[:20],
        "first_negative_global_ceiling_tangent": negative_global_ceiling_tangent[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=100)
    parser.add_argument("--R", type=int, default=20)
    parser.add_argument("--rank", type=int, default=40)
    args = parser.parse_args()
    result = scan(args.order, args.R, args.rank)
    for key, value in result.items():
        print(key, value)
    print("SEARCH_ONLY_D1_LOWBLOCK_SEPARATE_ROW_PAYMENT")


if __name__ == "__main__":
    main()
