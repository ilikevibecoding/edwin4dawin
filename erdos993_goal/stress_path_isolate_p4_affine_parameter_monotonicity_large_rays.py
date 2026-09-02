#!/usr/bin/env python3
"""Stress affine monotonicity j-tail structure on larger proportional rays.

This is exact finite evidence.  For each selected point it computes the
separate j-aggregated signed base D and reserve rR, so it can audit both the
full increment D+rR and the eventual reserve-utilization ratio -D/(rR).
"""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    load_bottom,
    m,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from probe_path_isolate_p4_affine_scaled_excess_local_summands import choose, local
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse
from stress_path_isolate_p4_affine_parameter_monotonicity_j_tail import (
    root_summary,
    tail_summary,
)


def audit_components(
    package: str,
    parity: int,
    coordinate: str,
    c_value: int,
    m_value: int,
    x_value: int,
    r: int,
    d_source,
    reserve_source,
    compute_roots: bool = False,
    store_sequence: bool = False,
    store_components: bool = False,
) -> dict:
    a = (
        m_value + x_value - 3
        if package == "bottom"
        else 2 * c_value + m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 5
        if package == "bottom"
        else 2 * m_value + parity - 4
    )
    target = m_value + r + 5 + (coordinate == "m")
    numeric_d = evaluate(d_source, c_value, m_value, x_value, target)
    numeric_r = evaluate(reserve_source, c_value, m_value, x_value, target)
    d_by_j = [0] * (r + 1)
    rr_by_j = [0] * (r + 1)
    for k in range(b + 1):
        k_weight = choose(b, k)
        for j in range(r + 1):
            weight = k_weight * choose(r, j)
            d_by_j[j] += weight * local(
                numeric_d, a, b, r, target, k, j
            )
            rr_by_j[j] += weight * r * local(
                numeric_r, a, b, r, target, k, j
            )

    full = [d_value + r_value for d_value, r_value in zip(d_by_j, rr_by_j)]
    half = [2 * d_value + r_value for d_value, r_value in zip(d_by_j, rr_by_j)]
    ordinary_turan_failures = [
        j for j in range(1, r)
        if full[j] ** 2 < full[j - 1] * full[j + 1]
    ]
    ultra_log_concavity_failures = [
        j for j in range(1, r)
        if (
            j * (r - j) * full[j] ** 2
            < (j + 1) * (r - j + 1) * full[j - 1] * full[j + 1]
        )
    ]
    tail = tail_summary(full)
    start = tail["tail_start"]
    negative_magnitudes = (
        [-value for value in full[start:]] if start is not None else []
    )
    magnitude_directions = [
        negative_magnitudes[index + 1] > negative_magnitudes[index]
        for index in range(len(negative_magnitudes) - 1)
        if negative_magnitudes[index + 1] != negative_magnitudes[index]
    ]
    magnitude_direction_transitions = sum(
        magnitude_directions[index] != magnitude_directions[index - 1]
        for index in range(1, len(magnitude_directions))
    )
    tail["magnitude_direction_transitions"] = magnitude_direction_transitions
    tail["magnitude_unimodal"] = magnitude_direction_transitions <= 1
    tail["magnitude_peak_offset"] = (
        negative_magnitudes.index(max(negative_magnitudes))
        if negative_magnitudes else None
    )
    tail["tail_debt_over_peak"] = (
        float(Fraction(sum(negative_magnitudes), max(negative_magnitudes)))
        if negative_magnitudes else None
    )
    tail["magnitude_log_concavity_failure_count"] = sum(
        negative_magnitudes[index] ** 2
        < negative_magnitudes[index - 1] * negative_magnitudes[index + 1]
        for index in range(1, len(negative_magnitudes) - 1)
    )
    ratio_values = [
        None if r_value == 0 else Fraction(-d_value, r_value)
        for d_value, r_value in zip(d_by_j, rr_by_j)
    ]
    relevant_start = max(0, start - 2) if start is not None else None
    relevant = (
        [(j, ratio) for j, ratio in enumerate(ratio_values)
         if ratio is not None and j >= relevant_start]
        if relevant_start is not None
        else []
    )
    decreases = [
        (relevant[index - 1][0], relevant[index][0])
        for index in range(1, len(relevant))
        if relevant[index][1] < relevant[index - 1][1]
    ]
    full_total = sum(full)
    half_total = sum(half)
    sign_blocks = []
    for index, value in enumerate(full):
        if not value:
            continue
        sign = 1 if value > 0 else -1
        if not sign_blocks or sign_blocks[-1]["sign"] != sign:
            sign_blocks.append({
                "sign": sign,
                "start": index,
                "end": index,
                "count": 1,
                "sum": value,
                "maximum_absolute_value": abs(value),
            })
        else:
            block = sign_blocks[-1]
            block["end"] = index
            block["count"] += 1
            block["sum"] += value
            block["maximum_absolute_value"] = max(
                block["maximum_absolute_value"], abs(value)
            )
    result = {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "full_total": full_total,
        "half_total": half_total,
        "ordinary_turan_failure_count": len(ordinary_turan_failures),
        "first_ordinary_turan_failures": ordinary_turan_failures[:10],
        "signed_ultra_log_concavity_failure_count": len(
            ultra_log_concavity_failures
        ),
        "first_signed_ultra_log_concavity_failures": (
            ultra_log_concavity_failures[:10]
        ),
        "nonzero_sign_block_count": len(sign_blocks),
        "sign_blocks": sign_blocks,
        "full_tail": tail,
        "eventual_utilization_start": relevant_start,
        "eventual_utilization_decrease_count": len(decreases),
        "first_eventual_utilization_decreases": decreases[:10],
        "eventual_utilization_first": (
            float(relevant[0][1]) if relevant else None
        ),
        "eventual_utilization_last": (
            float(relevant[-1][1]) if relevant else None
        ),
    }
    if compute_roots:
        result["roots"] = root_summary(full)
    if store_sequence:
        result["j_aggregates"] = full
    if store_components:
        result["base_j_aggregates"] = d_by_j
        result["reserve_j_aggregates"] = rr_by_j
    return result


def ray_points() -> list[tuple[int, int, int]]:
    points = []
    for m_value in (30, 45, 60):
        for r in (m_value - 5, (4 * m_value) // 3, (3 * m_value) // 2):
            points.append((m_value, 2 * m_value, r))
    return points


def main() -> None:
    records = []
    points = ray_points()
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p = sp.expand(slope * A)
        base = sp.expand(T**3 * affine * V + p)
        sources = {
            "x": (
                to_sparse(sp.expand(A * base.subs(x, x + 1) - base)),
                to_sparse(sp.expand((A - 1) * p)),
            ),
            "c": (
                to_sparse(sp.expand(A**2 * base.subs(c, c + 1) - base)),
                to_sparse(sp.expand((A**2 - 1) * p)),
            ),
            "m": (
                to_sparse(sp.expand(A * T**2 * base.subs(m, m + 1) - q * base)),
                to_sparse(sp.expand((A * T**2 - q) * p)),
            ),
        }
        for m_value, x_value, r in points:
            for coordinate, source_pair in sources.items():
                record = audit_components(
                    "group", parity, coordinate, 1, m_value, x_value, r,
                    *source_pair,
                )
                records.append(record)
                print(
                    "group", parity, coordinate, m_value, x_value, r,
                    record["full_tail"]["negative_count"],
                    record["full_tail"]["preceding_terms_needed"],
                    record["eventual_utilization_decrease_count"],
                    flush=True,
                )

    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p = sp.expand(slope * A)
        base = sp.expand(q**2 * T**3 * affine * V + p)
        sources = {
            "x": (
                to_sparse(sp.expand(A * base.subs(x, x + 1) - base)),
                to_sparse(sp.expand((A - 1) * p)),
            ),
            "m": (
                to_sparse(sp.expand(A * T**2 * base.subs(m, m + 1) - q * base)),
                to_sparse(sp.expand(A * T**2 * p.subs(m, m + 1) - q * p)),
            ),
        }
        for m_value, x_value, r in points:
            for coordinate, source_pair in sources.items():
                record = audit_components(
                    "bottom", parity, coordinate, 0, m_value, x_value, r,
                    *source_pair,
                )
                records.append(record)
                print(
                    "bottom", parity, coordinate, m_value, x_value, r,
                    record["full_tail"]["negative_count"],
                    record["full_tail"]["preceding_terms_needed"],
                    record["eventual_utilization_decrease_count"],
                    flush=True,
                )

    failures = [
        record for record in records
        if (
            not record["full_tail"]["terminal_contiguous"]
            or record["full_tail"]["sign_transitions"] > 1
            or (record["full_tail"]["preceding_terms_needed"] or 0) > 2
            or record["eventual_utilization_decrease_count"]
            or record["full_total"] < 0
        )
    ]
    report = {
        "status": "PASS_FINITE_LARGE_RAY_PATTERN" if not failures else "FAIL",
        "case_count": len(records),
        "failure_count": len(failures),
        "negative_tail_case_count": sum(
            bool(record["full_tail"]["negative_count"]) for record in records
        ),
        "maximum_negative_tail_length": max(
            record["full_tail"]["negative_count"] for record in records
        ),
        "maximum_preceding_terms_needed": max(
            record["full_tail"]["preceding_terms_needed"] or 0
            for record in records
        ),
        "maximum_debt_over_preceding_two": max(
            record["full_tail"].get("debt_over_preceding_two") or 0.0
            for record in records
        ),
        "maximum_consecutive_tail_ratio": max(
            record["full_tail"].get("maximum_consecutive_tail_ratio") or 0.0
            for record in records
        ),
        "all_negative_magnitude_tails_unimodal": all(
            record["full_tail"].get("magnitude_unimodal", True)
            for record in records
        ),
        "maximum_magnitude_direction_transitions": max(
            record["full_tail"].get("magnitude_direction_transitions", 0)
            for record in records
        ),
        "maximum_log_concavity_failure_count": max(
            record["full_tail"].get(
                "magnitude_log_concavity_failure_count", 0
            )
            for record in records
        ),
        "maximum_magnitude_peak_offset": max(
            record["full_tail"].get("magnitude_peak_offset") or 0
            for record in records
        ),
        "maximum_tail_debt_over_peak": max(
            record["full_tail"].get("tail_debt_over_peak") or 0.0
            for record in records
        ),
        "maximum_peak_over_preceding_two": max(
            record["full_tail"].get("peak_over_preceding_two") or 0.0
            for record in records
        ),
        "maximum_post_peak_ratio": max(
            record["full_tail"].get("maximum_post_peak_ratio") or 0.0
            for record in records
        ),
        "maximum_ordinary_turan_failure_count": max(
            record["ordinary_turan_failure_count"] for record in records
        ),
        "maximum_signed_ultra_log_concavity_failure_count": max(
            record["signed_ultra_log_concavity_failure_count"]
            for record in records
        ),
        "records": records,
        "failures": failures,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_large_rays_"
        "20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        key: value for key, value in report.items()
        if key not in {"records", "failures"}
    }, indent=2))


if __name__ == "__main__":
    main()
