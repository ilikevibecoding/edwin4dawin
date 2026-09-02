#!/usr/bin/env python3
"""Stress the exact V-reaggregation on focused hard affine cases."""

from __future__ import annotations

import functools
from fractions import Fraction
import json
import math
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m, q, x
from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    differences,
    nonzero_sign_word,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    aggregate,
    blocks,
    bottom_increment,
    group_increment,
    quotient,
    roots,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_j_tail import (
    selected_order,
    tail_summary,
)


@functools.cache
def reduced_sources(package: str, parity: int, coordinate: str):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    assert sp.expand(d_reduced - V * ell - reserve_reduced) == 0
    assert quotient(reserve_reduced, T**2).is_polynomial()
    return to_sparse(ell), to_sparse(reserve_reduced)


def signed_ulc_failures(values: list[int]) -> list[int]:
    order = len(values) - 1
    return [
        j
        for j in range(1, order)
        if (
            j * (order - j) * values[j] ** 2
            < (j + 1) * (order - j + 1) * values[j - 1] * values[j + 1]
        )
    ]


def parity_root_geometry(values: list[int]) -> dict:
    """Certify the Hermite--Biehler geometry of the even/odd parts."""

    parts = {}
    real_roots = {}
    for label, coefficients in (("even", values[0::2]), ("odd", values[1::2])):
        negative = []
        positive = []
        nonreal = 0
        zero = 0
        for root, multiplicity in fmpz_poly(coefficients).complex_roots():
            if root.imag.is_zero():
                if root.real < 0:
                    negative.extend([root.real] * multiplicity)
                elif root.real > 0:
                    positive.extend([root.real] * multiplicity)
                else:
                    zero += multiplicity
            else:
                nonreal += multiplicity
        real_roots[label] = {"negative": negative, "positive": positive}
        parts[label] = {
            "degree": len(coefficients) - 1,
            "negative": len(negative),
            "positive": len(positive),
            "zero": zero,
            "nonreal": nonreal,
        }

    interlacing = {}
    merged_labels = {}
    for sign in ("negative", "positive"):
        merged = [
            (root, "E") for root in real_roots["even"][sign]
        ] + [
            (root, "O") for root in real_roots["odd"][sign]
        ]
        merged.sort(key=lambda item: float(item[0].mid()))
        labels = "".join(label for _, label in merged)
        merged_labels[sign] = labels
        interlacing[sign] = {
            "even_count": labels.count("E"),
            "odd_count": labels.count("O"),
            "same_label_adjacency_count": sum(
                labels[j] == labels[j - 1] for j in range(1, len(labels))
            ),
            "first_labels": labels[:6],
            "last_labels": labels[-6:],
        }

    degree = len(values) - 1
    negative_labels = merged_labels["negative"]
    if degree % 2 == 0:
        hurwitz_orientation = bool(
            negative_labels
            and negative_labels[0] == "E"
            and negative_labels[-1] == "E"
            and parts["even"]["negative"]
            == parts["odd"]["negative"] + 1
        )
    else:
        hurwitz_orientation = bool(
            negative_labels
            and negative_labels[0] == "O"
            and negative_labels[-1] == "E"
            and parts["even"]["negative"]
            == parts["odd"]["negative"]
        )
    return {
        "even": parts["even"],
        "odd": parts["odd"],
        "negative_interlacing": interlacing["negative"],
        "positive_interlacing": interlacing["positive"],
        "both_parts_real_rooted": (
            parts["even"]["nonreal"] == 0
            and parts["odd"]["nonreal"] == 0
        ),
        "negative_roots_strictly_alternate": (
            interlacing["negative"]["same_label_adjacency_count"] == 0
        ),
        "negative_roots_have_hurwitz_orientation": (
            interlacing["negative"]["same_label_adjacency_count"] == 0
            and hurwitz_orientation
        ),
        "parts_have_same_positive_root_count": (
            parts["even"]["positive"] == parts["odd"]["positive"]
        ),
        "part_leading_coefficients_have_same_sign": (
            values[-1] * values[-2] > 0
        ),
        "each_part_has_at_most_two_positive_roots": (
            parts["even"]["positive"] <= 2
            and parts["odd"]["positive"] <= 2
        ),
    }


def parity_phase_numerator_summary(values: list[int]) -> dict:
    """Audit M(-x), where d arg C(iw)/dw=M(-w^2)/|C(iw)|^2."""

    even = values[0::2]
    odd = values[1::2]

    def derivative(coefficients):
        return [
            (j + 1) * coefficients[j + 1]
            for j in range(len(coefficients) - 1)
        ]

    def product(left, right):
        result = [0] * (len(left) + len(right) - 1)
        for j, a_value in enumerate(left):
            for k, b_value in enumerate(right):
                result[j + k] += a_value * b_value
        return result

    even_odd = product(even, odd)
    first = product(derivative(even), odd)
    second = product(even, derivative(odd))
    length = max(len(first), len(second))
    wronskian = [
        (first[j] if j < len(first) else 0)
        - (second[j] if j < len(second) else 0)
        for j in range(length)
    ]
    phase = list(even_odd)
    if len(phase) < len(wronskian) + 1:
        phase.extend([0] * (len(wronskian) + 1 - len(phase)))
    for j, value in enumerate(wronskian):
        phase[j + 1] -= 2 * value
    while phase and phase[-1] == 0:
        phase.pop()
    reflected = [
        value if j % 2 == 0 else -value
        for j, value in enumerate(phase)
    ]
    return {
        "degree": len(reflected) - 1,
        "nonpositive_coefficient_count": sum(value <= 0 for value in reflected),
        "negative_coefficient_count": sum(value < 0 for value in reflected),
        "zero_coefficient_count": sum(value == 0 for value in reflected),
        "strictly_coefficient_positive": all(value > 0 for value in reflected),
        "nonzero_sign_word": nonzero_sign_word(reflected),
    }


def audit_case(
    package: str,
    parity: int,
    coordinate: str,
    c_value: int,
    m_value: int,
    x_value: int,
    r: int,
    grid: str,
) -> dict:
    ell_source, reserve_source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group"
        else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group"
        else 2 * m_value + parity - 5
    )
    target = m_value + r + 5 + (coordinate == "m")
    reduced_target = target if package == "group" else target - 2
    reduced_b = original_b + 3
    ell_values = aggregate(
        ell_source,
        a,
        reduced_b,
        r + 1,
        reduced_target,
        c_value,
        m_value,
        x_value,
    )
    reserve_values = aggregate(
        reserve_source,
        a,
        reduced_b,
        r,
        reduced_target,
        c_value,
        m_value,
        x_value,
    )
    values = [
        ell_values[j] + ((r + 1) * reserve_values[j] if j <= r else 0)
        for j in range(r + 2)
    ]
    utilization_decreases = [
        j
        for j in range(r)
        if reserve_values[j] > 0
        and reserve_values[j + 1] > 0
        and ell_values[j + 1] * reserve_values[j]
        > ell_values[j] * reserve_values[j + 1]
    ]
    utilization_decreases_form_initial_prefix = utilization_decreases == list(
        range(len(utilization_decreases))
    )
    utilization = [
        Fraction(-ell_values[j], (r + 1) * reserve_values[j])
        for j in range(len(reserve_values))
    ]
    utilization_second_differences = [
        utilization[j + 1] - 2 * utilization[j] + utilization[j - 1]
        for j in range(1, len(utilization) - 1)
    ]
    utilization_nonpositive_second_difference_indices = [
        j + 1 for j, value in enumerate(utilization_second_differences)
        if value <= 0
    ]
    deweighted = [
        Fraction(r + 1 - j) * utilization[j]
        for j in range(len(utilization))
    ]
    deweighted_first = differences(deweighted)
    deweighted_second = differences(deweighted_first)
    deweighted_third = differences(deweighted_second)
    deweighted_curvature_log_concavity_failures = [
        j
        for j in range(1, len(deweighted_second) - 1)
        if deweighted_second[j] ** 2
        < deweighted_second[j - 1] * deweighted_second[j + 1]
    ]
    deweighted_curvature_log_concavity_equalities = [
        j
        for j in range(1, len(deweighted_second) - 1)
        if deweighted_second[j] ** 2
        == deweighted_second[j - 1] * deweighted_second[j + 1]
    ]
    deweighted_third_sign_word = nonzero_sign_word(deweighted_third)
    deweighted_third_peak_shape = deweighted_third_sign_word in (
        [], [1], [-1], [1, -1]
    )
    b_values = [
        2 * ((r + 1 - j) * deweighted_first[j] + deweighted[j])
        + (r + 1 - j) * (r - j) * deweighted_second[j]
        for j in range(len(deweighted_second))
    ]
    n = r + 1
    symmetric_numerator_unweighted = [
        Fraction(-ell_values[j], math.comb(n, j))
        for j in range(n + 1)
    ]
    symmetric_reserve_unweighted = [
        Fraction(reserve_values[j], math.comb(r, j))
        for j in range(n)
    ]
    symmetric_base_unweighted = [
        symmetric_reserve_unweighted[j]
        - symmetric_numerator_unweighted[j]
        - symmetric_numerator_unweighted[j + 1]
        for j in range(n)
    ]
    symmetric_pascal_utilization = [
        -symmetric_base_unweighted[j] / symmetric_reserve_unweighted[j]
        for j in range(n)
    ]
    symmetric_pascal_first = differences(symmetric_pascal_utilization)
    symmetric_pascal_second = differences(symmetric_pascal_first)
    symmetric_pascal_first_word = nonzero_sign_word(symmetric_pascal_first)
    symmetric_pascal_second_word = nonzero_sign_word(symmetric_pascal_second)
    original_aggregated_values = [
        math.comb(r, j)
        * (
            symmetric_base_unweighted[j]
            + r * symmetric_reserve_unweighted[j]
        )
        for j in range(n)
    ]
    assert all(value.denominator == 1 for value in original_aggregated_values)
    original_aggregated_integers = [int(value) for value in original_aggregated_values]
    assert sum(original_aggregated_values) == sum(values)
    original_sign_word = nonzero_sign_word(original_aggregated_values)
    original_parity_root_geometry = parity_root_geometry(
        original_aggregated_integers
    )
    original_parity_phase_numerator = parity_phase_numerator_summary(
        original_aggregated_integers
    )
    deweighted_peak_lemma_certifies = bool(
        b_values
        and b_values[0] > 0
        and b_values[-1] > 0
        and deweighted_third_peak_shape
    )
    tail = tail_summary(values)
    ulc = signed_ulc_failures(values)
    record = {
        "grid": grid,
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "full_total_positive": sum(values) > 0,
        "weighted_total_at_half_positive": sum(
            value * 2 ** (len(values) - 1 - j)
            for j, value in enumerate(values)
        ) > 0,
        "weighted_total_at_two_thirds_positive": sum(
            value * 2**j * 3 ** (len(values) - 1 - j)
            for j, value in enumerate(values)
        ) > 0,
        "weighted_total_at_two_positive": sum(
            value * (1 << j) for j, value in enumerate(values)
        ) > 0,
        "weighted_total_at_three_halves_positive": sum(
            value * 3**j * 2 ** (len(values) - 1 - j)
            for j, value in enumerate(values)
        ) > 0,
        "tail": tail,
        "nonzero_sign_blocks": blocks(values),
        "negative_mass_over_positive_mass": (
            float(
                Fraction(
                    -sum(value for value in values if value < 0),
                    sum(value for value in values if value > 0),
                )
            )
        ),
        "signed_ulc_failure_count": len(ulc),
        "signed_ulc_first_failures": ulc[:10],
        "reserve_nonpositive_count": sum(value <= 0 for value in reserve_values),
        "ell_nonnegative_count": sum(value >= 0 for value in ell_values),
        "genuinely_signed_utilization_regime": all(
            value < 0 for value in ell_values
        ),
        "utilization_decrease_count": len(utilization_decreases),
        "utilization_first_decreases": utilization_decreases[:10],
        "utilization_decreases_form_initial_prefix": (
            utilization_decreases_form_initial_prefix
        ),
        "utilization_strictly_discrete_convex": not (
            utilization_nonpositive_second_difference_indices
        ),
        "utilization_nonpositive_second_difference_count": len(
            utilization_nonpositive_second_difference_indices
        ),
        "utilization_first_nonpositive_second_difference_indices": (
            utilization_nonpositive_second_difference_indices[:10]
        ),
        "deweighted_third_difference_nonzero_sign_word": (
            deweighted_third_sign_word
        ),
        "deweighted_third_difference_negative_count": sum(
            value < 0 for value in deweighted_third
        ),
        "deweighted_third_difference_zero_count": sum(
            value == 0 for value in deweighted_third
        ),
        "deweighted_third_difference_has_peak_shape": (
            deweighted_third_peak_shape
        ),
        "deweighted_curvature_nonpositive_count": sum(
            value <= 0 for value in deweighted_second
        ),
        "deweighted_curvature_log_concavity_failure_count": len(
            deweighted_curvature_log_concavity_failures
        ),
        "deweighted_curvature_log_concavity_equality_count": len(
            deweighted_curvature_log_concavity_equalities
        ),
        "deweighted_curvature_first_log_concavity_failures": (
            deweighted_curvature_log_concavity_failures[:10]
        ),
        "deweighted_b_initial_positive": bool(b_values and b_values[0] > 0),
        "deweighted_b_final_positive": bool(b_values and b_values[-1] > 0),
        "deweighted_peak_lemma_certifies_strict_convexity": (
            deweighted_peak_lemma_certifies
        ),
        "symmetric_pascal_base_transform_negative_count": sum(
            value < 0 for value in symmetric_base_unweighted
        ),
        "symmetric_pascal_utilization_first_difference_nonzero_sign_word": (
            symmetric_pascal_first_word
        ),
        "symmetric_pascal_utilization_first_difference_sign_blocks": (
            blocks(symmetric_pascal_first)
        ),
        "symmetric_pascal_utilization_second_difference_nonzero_sign_word": (
            symmetric_pascal_second_word
        ),
        "symmetric_pascal_utilization_strictly_discrete_convex": all(
            value > 0 for value in symmetric_pascal_second
        ),
        "original_aggregation_nonzero_sign_word": original_sign_word,
        "original_aggregation_root_summary": roots(original_aggregated_integers),
        "original_aggregation_parity_root_geometry": (
            original_parity_root_geometry
        ),
        "original_aggregation_parity_phase_numerator": (
            original_parity_phase_numerator
        ),
        "original_aggregation_positive_coefficients_contiguous": (
            original_sign_word in ([1], [-1, 1], [1, -1], [-1, 1, -1])
        ),
        "original_aggregation_at_two_thirds_positive": sum(
            value * 2**j * 3 ** (r - j)
            for j, value in enumerate(original_aggregated_values)
        ) > 0,
        "original_aggregation_at_three_halves_positive": sum(
            value * 3**j * 2 ** (r - j)
            for j, value in enumerate(original_aggregated_values)
        ) > 0,
        "initial_reaggregated_value_positive": values[0] > 0,
    }
    print(
        package,
        parity,
        coordinate,
        m_value,
        x_value,
        r,
        tail["negative_count"],
        tail["sign_transitions"],
        tail["preceding_terms_needed"],
        len(ulc),
        flush=True,
    )
    return record


def focused_cases():
    group_report = json.loads(
        Path(
            "path_isolate_p4_group_affine_parameter_monotonicity_probe_20260801.json"
        ).read_text(encoding="utf-8")
    )
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            candidates = [
                source
                for source in group_report["records"]
                if source["parity"] == parity
                and source["coordinate"] == coordinate
            ]
            source = max(
                candidates,
                key=lambda item: (
                    item.get("worst_compensation") or {"ratio": -1.0}
                )["ratio"],
            )
            yield (
                "group",
                source["parity"],
                source["coordinate"],
                source["c"],
                source["m"],
                source["x"],
                selected_order(source),
                "hard_local_representative",
            )
    bottom_report = json.loads(
        Path(
            "path_isolate_p4_bottom_pair_affine_parameter_monotonicity_probe_20260801.json"
        ).read_text(encoding="utf-8")
    )
    for parity in (0, 1):
        for coordinate in ("x", "m"):
            candidates = [
                source
                for source in bottom_report["records"]
                if source["parity"] == parity
                and source["coordinate"] == coordinate
            ]
            source = max(
                candidates,
                key=lambda item: (
                    item.get("worst_compensation") or {"ratio": -1.0}
                )["ratio"],
            )
            yield (
                "bottom",
                source["parity"],
                source["coordinate"],
                0,
                source["m"],
                source["x"],
                selected_order(source),
                "hard_local_representative",
            )
    m_value = 60
    x_value = 120
    r = 90
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            yield (
                "group", parity, coordinate, 1, m_value, x_value, r,
                "largest_complete_ray",
            )
        for coordinate in ("x", "m"):
            yield (
                "bottom", parity, coordinate, 0, m_value, x_value, r,
                "largest_complete_ray",
            )
    yield ("group", 0, "m", 1, 120, 240, 160, "far_refutation_ray")
    yield ("bottom", 1, "x", 0, 120, 240, 180, "far_refutation_ray")
    for m_value in (150, 180):
        yield (
            "group", 0, "m", 1, m_value, 2 * m_value,
            (4 * m_value) // 3, "far_extension_ray",
        )
        yield (
            "bottom", 1, "x", 0, m_value, 2 * m_value,
            (3 * m_value) // 2, "far_extension_ray",
        )


def main() -> None:
    ctx.prec = 100
    records = [audit_case(*case) for case in focused_cases()]
    failures = [
        record
        for record in records
        if (
            not record["full_total_positive"]
            or len(record["nonzero_sign_blocks"]) > 3
            or (
                record["tail"]["negative_count"]
                and record["signed_ulc_failure_count"]
            )
            or (
                record["genuinely_signed_utilization_regime"]
                and not record["utilization_decreases_form_initial_prefix"]
            )
            or (
                record["genuinely_signed_utilization_regime"]
                and not record["utilization_strictly_discrete_convex"]
            )
            or (
                not record["genuinely_signed_utilization_regime"]
                and record["tail"]["negative_count"]
            )
            or not record["initial_reaggregated_value_positive"]
            or record["reserve_nonpositive_count"]
        )
    ]
    negative = [record for record in records if record["tail"]["negative_count"]]
    report = {
        "status": "PASS_FINITE_REAGGREGATED_V_FOCUSED" if not failures else "FAIL",
        "case_count": len(records),
        "failure_count": len(failures),
        "negative_tail_case_count": len(negative),
        "maximum_negative_tail_length": max(
            (record["tail"]["negative_count"] for record in records), default=0
        ),
        "maximum_sign_transition_count": max(
            record["tail"]["sign_transitions"] for record in records
        ),
        "maximum_preceding_terms_needed": max(
            (record["tail"]["preceding_terms_needed"] or 0) for record in records
        ),
        "maximum_debt_over_preceding_one": max(
            (
                record["tail"].get("debt_over_preceding_one") or 0.0
                for record in negative
            ),
            default=0.0,
        ),
        "maximum_debt_over_preceding_two": max(
            (
                record["tail"].get("debt_over_preceding_two") or 0.0
                for record in negative
            ),
            default=0.0,
        ),
        "weighted_total_at_two_failure_count": sum(
            not record["weighted_total_at_two_positive"] for record in records
        ),
        "weighted_total_at_three_halves_failure_count": sum(
            not record["weighted_total_at_three_halves_positive"]
            for record in records
        ),
        "utilization_decrease_count": sum(
            record["utilization_decrease_count"] for record in records
        ),
        "utilization_prefix_shape_failure_count": sum(
            record["genuinely_signed_utilization_regime"]
            and not record["utilization_decreases_form_initial_prefix"]
            for record in records
        ),
        "utilization_strict_convexity_failure_count": sum(
            record["genuinely_signed_utilization_regime"]
            and not record["utilization_strictly_discrete_convex"]
            for record in records
        ),
        "deweighted_third_peak_shape_failure_count": sum(
            record["genuinely_signed_utilization_regime"]
            and not record["deweighted_third_difference_has_peak_shape"]
            for record in records
        ),
        "deweighted_peak_lemma_failure_count": sum(
            record["genuinely_signed_utilization_regime"]
            and not record["deweighted_peak_lemma_certifies_strict_convexity"]
            for record in records
        ),
        "symmetric_pascal_utilization_convexity_failure_count": sum(
            record["genuinely_signed_utilization_regime"]
            and not record[
                "symmetric_pascal_utilization_strictly_discrete_convex"
            ]
            for record in records
        ),
        "original_aggregation_contiguous_positive_failure_count": sum(
            not record["original_aggregation_positive_coefficients_contiguous"]
            for record in records
        ),
        "deweighted_curvature_log_concavity_failure_case_count": sum(
            bool(
                record["genuinely_signed_utilization_regime"]
                and (
                record["deweighted_curvature_nonpositive_count"]
                or record["deweighted_curvature_log_concavity_failure_count"]
                or record["deweighted_curvature_log_concavity_equality_count"]
                )
            )
            for record in records
        ),
        "nonnegative_reserve_failure_count": sum(
            bool(record["reserve_nonpositive_count"])
            for record in records
        ),
        "genuinely_signed_utilization_case_count": sum(
            record["genuinely_signed_utilization_regime"] for record in records
        ),
        "signed_tail_case_ulc_failure_count": sum(
            record["signed_ulc_failure_count"]
            for record in records
            if record["tail"]["negative_count"]
        ),
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "grids_stress_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
