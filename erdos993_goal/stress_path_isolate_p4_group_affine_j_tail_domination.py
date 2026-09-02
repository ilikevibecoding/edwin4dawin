#!/usr/bin/env python3
"""Stress one-dimensional j-tail domination for the group affine target.

The source points are the hardest negative-base cases already recorded by the
broad and proportional-ray reserve probes.  For each parameter tuple we keep
the order r with the largest reserve fraction and audit the exact C=0 target
B+rP after summing the k index in the central double-binomial formula.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_scaled_excess_local_summands import audit_case
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse
from stress_path_isolate_p4_affine_parameter_monotonicity_j_tail import (
    root_summary,
    tail_summary,
)


SOURCE_PATHS = (
    Path("path_isolate_p4_affine_central_reserve_ratio_group_20260801.json"),
    Path("path_isolate_p4_affine_central_reserve_ratio_group_rays_20260801.json"),
)


def selected_points(limit: int) -> list[dict]:
    hardest: dict[tuple[int, int, int, int], dict] = {}
    for path in SOURCE_PATHS:
        report = json.loads(path.read_text(encoding="utf-8"))
        for record in report["records"]:
            if int(record["base"]) >= 0:
                continue
            key = (
                int(record["parity"]),
                int(record["c"]),
                int(record["m"]),
                int(record["x"]),
            )
            old = hardest.get(key)
            if old is None or float(record["reserve_fraction_used"]) > float(
                old["reserve_fraction_used"]
            ):
                hardest[key] = record
    return sorted(
        hardest.values(),
        key=lambda item: float(item["reserve_fraction_used"]),
        reverse=True,
    )[:limit]


def tail_audit(values: list[int]) -> dict:
    negative = [index for index, value in enumerate(values) if value < 0]
    nonzero_signs = [value > 0 for value in values if value]
    transitions = sum(
        nonzero_signs[index] != nonzero_signs[index - 1]
        for index in range(1, len(nonzero_signs))
    )
    is_terminal_tail = not negative or negative == list(
        range(negative[0], len(values))
    )
    tail_start = negative[0] if negative else None
    tail_sum = sum(values[tail_start:]) if negative else 0
    preceding = values[tail_start - 1] if negative and tail_start else None
    paired_margin = preceding + tail_sum if preceding is not None else None
    block_sum = tail_sum
    block_start = tail_start
    if negative:
        while block_start and block_sum < 0:
            block_start -= 1
            block_sum += values[block_start]
    preceding_terms_needed = (
        tail_start - block_start if negative and block_sum >= 0 else None
    )
    return {
        "sign_transitions": transitions,
        "negative_count": len(negative),
        "negative_indices": negative,
        "is_terminal_negative_tail": is_terminal_tail,
        "negative_tail_sum": tail_sum,
        "preceding_positive": preceding,
        "preceding_plus_tail_margin": paired_margin,
        "minimal_preceding_terms_needed": preceding_terms_needed,
        "dominating_block_start": block_start,
        "dominating_block_margin": block_sum,
        "dominating_block_values": (
            values[block_start:] if negative and block_sum >= 0 else []
        ),
        "last_eight_j_aggregates": values[-8:],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=24)
    args = parser.parse_args()

    points = selected_points(args.limit)
    sources = {}
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
        sources[parity] = (
            to_sparse(sp.expand(T**3 * affine * V + slope * A)),
            to_sparse(sp.expand(slope * A)),
        )

    records = []
    shape_failures = []
    one_term_failures = []
    for point in points:
        parity = int(point["parity"])
        c_value = int(point["c"])
        m_value = int(point["m"])
        x_value = int(point["x"])
        r = int(point["r"])
        b_source, p_source = sources[parity]
        audit = audit_case(
            "group", parity, c_value, m_value, x_value, r, 0,
            b_source, p_source,
        )
        tail = tail_audit(audit["j_aggregates"])
        refined_tail = tail_summary(audit["j_aggregates"])
        roots = root_summary(audit["j_aggregates"])
        order = len(audit["j_aggregates"]) - 1
        ulc_failures = [
            j for j in range(1, order)
            if (
                j * (order - j) * audit["j_aggregates"][j] ** 2
                < (j + 1) * (order - j + 1)
                * audit["j_aggregates"][j - 1]
                * audit["j_aggregates"][j + 1]
            )
        ]
        record = {
            "parity": parity,
            "c": c_value,
            "m": m_value,
            "x": x_value,
            "r": r,
            "source_reserve_fraction": point["reserve_fraction_used"],
            "weighted_total": audit["weighted_total"],
            **tail,
            "refined_tail": refined_tail,
            "roots": roots,
            "signed_ultra_log_concavity_failure_count": len(ulc_failures),
            "first_signed_ultra_log_concavity_failures": ulc_failures[:10],
        }
        record["terminal_one_transition_shape_passes"] = (
            tail["sign_transitions"] <= 1
            and tail["is_terminal_negative_tail"]
        )
        record["one_preceding_term_dominates"] = (
            tail["preceding_plus_tail_margin"] is None
            or tail["preceding_plus_tail_margin"] >= 0
        )
        records.append(record)
        if not record["terminal_one_transition_shape_passes"]:
            shape_failures.append(record)
        if not record["one_preceding_term_dominates"]:
            one_term_failures.append(record)
        print(
            parity, c_value, m_value, x_value, r,
            tail["negative_count"], tail["minimal_preceding_terms_needed"],
            record["terminal_one_transition_shape_passes"],
            flush=True,
        )

    report = {
        "status": "FINITE_GROUP_J_TAIL_STRUCTURE_STRESS",
        "case_count": len(records),
        "shape_failure_count": len(shape_failures),
        "one_preceding_term_failure_count": len(one_term_failures),
        "maximum_negative_tail_length": max(
            (record["negative_count"] for record in records), default=0
        ),
        "maximum_preceding_terms_needed": max(
            (record["minimal_preceding_terms_needed"] or 0 for record in records),
            default=0,
        ),
        "maximum_nonreal_root_count": max(
            record["roots"]["nonreal_root_count"] for record in records
        ),
        "maximum_positive_real_root_count": max(
            record["roots"]["positive_real_root_count"] for record in records
        ),
        "maximum_signed_ultra_log_concavity_failure_count": max(
            record["signed_ultra_log_concavity_failure_count"]
            for record in records
        ),
        "records": records,
        "shape_failures": shape_failures,
        "one_preceding_term_failures": one_term_failures,
        "warning": "Finite exact evidence only; this is not a theorem.",
    }
    output = Path(
        "path_isolate_p4_group_affine_j_tail_domination_stress_20260801.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items()
                      if key != "records"}, indent=2))
    if shape_failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
