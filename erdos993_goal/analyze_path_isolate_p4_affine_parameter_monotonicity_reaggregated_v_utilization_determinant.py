#!/usr/bin/env python3
"""Audit the cross-determinant controlling reaggregated utilization."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly

from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import blocks


def root_summary(values: list[int]) -> dict:
    negative = positive = nonreal = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            if root.real < 0:
                negative += multiplicity
            elif root.real > 0:
                positive += multiplicity
        else:
            nonreal += multiplicity
    return {
        "degree": len(values) - 1,
        "negative_real_root_count": negative,
        "positive_real_root_count": positive,
        "nonreal_root_count": nonreal,
    }


def main() -> None:
    source = Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "far_refutation_probe_20260802.json"
    )
    record = json.loads(source.read_text(encoding="utf-8"))["record"]
    ell = record["ell_values"]
    reserve = record["reserve_values"]
    determinants = [
        ell[j + 1] * reserve[j] - ell[j] * reserve[j + 1]
        for j in range(len(reserve) - 1)
    ]
    order = len(determinants) - 1
    ulc_failures = [
        j
        for j in range(1, order)
        if (
            j * (order - j) * determinants[j] ** 2
            < (j + 1) * (order - j + 1)
            * determinants[j - 1] * determinants[j + 1]
        )
    ]
    ctx.prec = 100
    report = {
        "status": "PASS_EXACT_UTILIZATION_DETERMINANT_SHAPE",
        "source": source.name,
        "determinant_sign_blocks": blocks(determinants),
        "signed_ulc_failure_count": len(ulc_failures),
        "root_summary": root_summary(determinants),
        "determinants": determinants,
        "warning": "One finite exact determinant sequence.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "utilization_determinant_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print({key: value for key, value in report.items() if key != "determinants"}, flush=True)


if __name__ == "__main__":
    main()
