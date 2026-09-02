#!/usr/bin/env python3
"""Stress terminal j-tail domination for all affine monotonicity kernels."""

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
from probe_path_isolate_p4_affine_parameter_monotonicity_local_summands import audit
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def tail_summary(values: list[int]) -> dict:
    negative = [index for index, value in enumerate(values) if value < 0]
    signs = [value > 0 for value in values if value]
    transitions = sum(
        signs[index] != signs[index - 1] for index in range(1, len(signs))
    )
    if not negative:
        return {
            "negative_count": 0,
            "terminal_contiguous": True,
            "sign_transitions": transitions,
            "tail_start": None,
            "preceding_terms_needed": 0,
            "magnitude_unimodal": True,
            "magnitude_direction_transitions": 0,
            "magnitude_log_concavity_failure_count": 0,
        }
    start = negative[0]
    terminal_contiguous = negative == list(range(start, len(values)))
    debt = -sum(values[start:])
    preceding_one = values[start - 1] if start >= 1 else 0
    preceding_two = preceding_one + (values[start - 2] if start >= 2 else 0)
    tail_ratios = [
        Fraction(abs(values[index + 1]), abs(values[index]))
        for index in range(start, len(values) - 1)
        if values[index]
    ]
    maximum_tail_ratio = max(tail_ratios, default=Fraction(0, 1))
    magnitudes = [-value for value in values[start:]]
    peak = max(magnitudes)
    peak_offset = magnitudes.index(peak)
    magnitude_directions = [
        magnitudes[index + 1] > magnitudes[index]
        for index in range(len(magnitudes) - 1)
        if magnitudes[index + 1] != magnitudes[index]
    ]
    magnitude_direction_transitions = sum(
        magnitude_directions[index] != magnitude_directions[index - 1]
        for index in range(1, len(magnitude_directions))
    )
    log_concavity_failures = sum(
        magnitudes[index] ** 2
        < magnitudes[index - 1] * magnitudes[index + 1]
        for index in range(1, len(magnitudes) - 1)
    )
    post_peak_ratios = [
        Fraction(magnitudes[index + 1], magnitudes[index])
        for index in range(peak_offset, len(magnitudes) - 1)
    ]
    accumulated = 0
    needed = None
    for width in range(1, start + 1):
        accumulated += values[start - width]
        if accumulated >= debt:
            needed = width
            break
    return {
        "negative_count": len(negative),
        "terminal_contiguous": terminal_contiguous,
        "sign_transitions": transitions,
        "tail_start": start,
        "preceding_terms_needed": needed,
        "tail_debt": debt,
        "preceding_one": preceding_one,
        "preceding_two_sum": preceding_two,
        "debt_over_preceding_one": (
            float(Fraction(debt, preceding_one)) if preceding_one > 0 else None
        ),
        "debt_over_preceding_two": (
            float(Fraction(debt, preceding_two)) if preceding_two > 0 else None
        ),
        "maximum_consecutive_tail_ratio": float(maximum_tail_ratio),
        "maximum_consecutive_tail_ratio_exact": {
            "numerator": maximum_tail_ratio.numerator,
            "denominator": maximum_tail_ratio.denominator,
        },
        "magnitude_unimodal": magnitude_direction_transitions <= 1,
        "magnitude_direction_transitions": magnitude_direction_transitions,
        "magnitude_log_concavity_failure_count": log_concavity_failures,
        "magnitude_peak_offset": peak_offset,
        "tail_debt_over_peak": float(Fraction(debt, peak)),
        "peak_over_preceding_one": (
            float(Fraction(peak, preceding_one)) if preceding_one > 0 else None
        ),
        "peak_over_preceding_two": (
            float(Fraction(peak, preceding_two)) if preceding_two > 0 else None
        ),
        "maximum_post_peak_ratio": (
            float(max(post_peak_ratios)) if post_peak_ratios else 0.0
        ),
        "available_preceding_sum": sum(values[:start]),
    }


def selected_order(record: dict) -> int:
    worst = record.get("worst_compensation")
    return worst["r"] if worst is not None else min(20, record["order_range"][1])


def root_summary(values: list[int]) -> dict:
    y = sp.symbols("y")
    polynomial = sp.Poly.from_list(list(reversed(values)), gens=y)
    degree = int(polynomial.degree())
    negative = int(polynomial.count_roots(-sp.oo, 0))
    positive = int(polynomial.count_roots(0, sp.oo))
    real = int(polynomial.count_roots(-sp.oo, sp.oo))
    return {
        "degree": degree,
        "negative_real_root_count": negative,
        "positive_real_root_count": positive,
        "real_root_count": real,
        "nonreal_root_count": degree - real,
        "all_roots_real": real == degree,
    }


def main() -> None:
    records = []
    group_report = json.loads(
        Path(
            "path_isolate_p4_group_affine_parameter_monotonicity_"
            "probe_20260801.json"
        ).read_text(encoding="utf-8")
    )
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
        for source_record in group_report["records"]:
            if source_record["parity"] != parity:
                continue
            coordinate = source_record["coordinate"]
            r = selected_order(source_record)
            result = audit(
                "group",
                parity,
                coordinate,
                source_record["c"],
                source_record["m"],
                source_record["x"],
                r,
                1,
                1,
                *sources[coordinate],
            )
            record = {
                key: value
                for key, value in result.items()
                if key not in {"k_aggregates", "j_aggregates"}
            }
            record["tail"] = tail_summary(result["j_aggregates"])
            record["roots"] = root_summary(result["j_aggregates"])
            records.append(record)
            print(
                "group",
                parity,
                coordinate,
                source_record["c"],
                source_record["m"],
                source_record["x"],
                r,
                record["tail"]["negative_count"],
                record["tail"]["preceding_terms_needed"],
                flush=True,
            )

    bottom_report = json.loads(
        Path(
            "path_isolate_p4_bottom_pair_affine_parameter_monotonicity_"
            "probe_20260801.json"
        ).read_text(encoding="utf-8")
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
                to_sparse(
                    sp.expand(A * T**2 * p.subs(m, m + 1) - q * p)
                ),
            ),
        }
        for source_record in bottom_report["records"]:
            if source_record["parity"] != parity:
                continue
            coordinate = source_record["coordinate"]
            r = selected_order(source_record)
            result = audit(
                "bottom",
                parity,
                coordinate,
                0,
                source_record["m"],
                source_record["x"],
                r,
                1,
                1,
                *sources[coordinate],
            )
            record = {
                key: value
                for key, value in result.items()
                if key not in {"k_aggregates", "j_aggregates"}
            }
            record["tail"] = tail_summary(result["j_aggregates"])
            record["roots"] = root_summary(result["j_aggregates"])
            records.append(record)
            print(
                "bottom",
                parity,
                coordinate,
                source_record["m"],
                source_record["x"],
                r,
                record["tail"]["negative_count"],
                record["tail"]["preceding_terms_needed"],
                flush=True,
            )

    failures = [
        record
        for record in records
        if not record["tail"]["terminal_contiguous"]
        or record["tail"]["sign_transitions"] > 1
        or record["tail"]["preceding_terms_needed"] is None
        or record["tail"]["preceding_terms_needed"] > 2
    ]
    report = {
        "status": "PASS_FINITE_J_TAIL_PATTERN" if not failures else "FAIL",
        "case_count": len(records),
        "failure_count": len(failures),
        "maximum_negative_tail_length": max(
            record["tail"]["negative_count"] for record in records
        ),
        "maximum_preceding_terms_needed": max(
            record["tail"]["preceding_terms_needed"] or 0
            for record in records
        ),
        "maximum_debt_over_preceding_two": max(
            record["tail"].get("debt_over_preceding_two") or 0.0
            for record in records
        ),
        "maximum_consecutive_tail_ratio": max(
            record["tail"].get("maximum_consecutive_tail_ratio") or 0.0
            for record in records
        ),
        "all_negative_magnitude_tails_unimodal": all(
            record["tail"].get("magnitude_unimodal", True)
            for record in records
        ),
        "maximum_magnitude_direction_transitions": max(
            record["tail"].get("magnitude_direction_transitions", 0)
            for record in records
        ),
        "maximum_log_concavity_failure_count": max(
            record["tail"].get("magnitude_log_concavity_failure_count", 0)
            for record in records
        ),
        "maximum_tail_debt_over_peak": max(
            record["tail"].get("tail_debt_over_peak") or 0.0
            for record in records
        ),
        "maximum_peak_over_preceding_two": max(
            record["tail"].get("peak_over_preceding_two") or 0.0
            for record in records
        ),
        "maximum_post_peak_ratio": max(
            record["tail"].get("maximum_post_peak_ratio") or 0.0
            for record in records
        ),
        "bottom_all_roots_real": all(
            record["roots"]["all_roots_real"]
            for record in records if record["package"] == "bottom"
        ),
        "group_maximum_nonreal_root_count": max(
            record["roots"]["nonreal_root_count"]
            for record in records if record["package"] == "group"
        ),
        "maximum_positive_real_root_count": max(
            record["roots"]["positive_real_root_count"]
            for record in records
        ),
        "records": records,
        "failures": failures,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_j_tail_stress_"
        "20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in {"records", "failures"}}, indent=2))


if __name__ == "__main__":
    main()
