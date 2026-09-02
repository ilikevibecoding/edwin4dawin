#!/usr/bin/env python3
"""Audit the target/reserve one-crossing law on the 72-case harsh grid."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly

from analyze_original_reserve_pencil_crossings import product, subtract
from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    nonzero_sign_word,
)
from analyze_wide_phase_polynomial_positivity import original_coefficients
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    aggregate,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


SOURCE_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "symmetric_pascal_valley_location_stress_20260802.json"
)
OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "wide_target_reserve_nyquist_crossings_20260802.json"
)


def audit(record: dict) -> dict:
    package = record["package"]
    parity = int(record["parity"])
    coordinate = record["coordinate"]
    c_value = int(record.get("c") or 0)
    m_value = int(record["m"])
    x_value = int(record["x"])
    r = int(record["r"])
    target_values = original_coefficients(record)
    _, reserve_source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 1
        if package == "group" else 2 * m_value + parity - 2
    )
    target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    reserve = aggregate(
        reserve_source, a, b, r, target,
        c_value, m_value, x_value,
    )
    ce, co = target_values[0::2], target_values[1::2]
    re, ro = reserve[0::2], reserve[1::2]
    cross = subtract(product(ce, ro), product(co, re))
    reflected = [value if j % 2 == 0 else -value for j, value in enumerate(cross)]
    word = nonzero_sign_word(reflected)
    sign_changes = max(0, len(word) - 1)
    positive_roots = None
    negative_roots = None
    if sign_changes > 1:
        positive_roots = 0
        negative_roots = 0
        for root, multiplicity in fmpz_poly(reflected).complex_roots():
            if not root.imag.is_zero():
                continue
            if root.real > 0:
                positive_roots += multiplicity
            elif root.real < 0:
                negative_roots += multiplicity
    transition = next(
        (j for j in range(1, len(reflected)) if reflected[j - 1] * reflected[j] < 0),
        None,
    )
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "cross_degree": len(cross) - 1,
        "reflected_nonzero_sign_word": word,
        "descartes_sign_changes": sign_changes,
        "arb_certified_positive_root_count": positive_roots,
        "arb_certified_negative_root_count": negative_roots,
        "negative_coefficient_count": sum(value < 0 for value in reflected),
        "zero_coefficient_count": sum(value == 0 for value in reflected),
        "first_adjacent_sign_transition_index": transition,
    }


def main() -> None:
    ctx.prec = 100
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    records = [audit(record) for record in source["records"]]
    histogram = {}
    for record in records:
        word = str(record["reflected_nonzero_sign_word"])
        histogram[word] = histogram.get(word, 0) + 1
    failures = [record for record in records if record["descartes_sign_changes"] > 1]
    report = {
        "status": (
            "PASS_WIDE_TARGET_RESERVE_ONE_CROSSING"
            if not failures else "WIDE_TARGET_RESERVE_ONE_CROSSING_FAILURE"
        ),
        "case_count": len(records),
        "failure_count": len(failures),
        "sign_word_histogram": histogram,
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
