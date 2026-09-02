#!/usr/bin/env python3
"""Audit a sufficient third-convexity reduction for utilization.

Let d=n-j, u_j=v_j/d, and put

    a_j = d Delta v_j + v_j,
    b_j = 2 a_j + d(d-1) Delta^2 v_j.

Then

    Delta^2 u_j = b_j / (d(d-1)(d-2)),
    b_{j+1}-b_j = (d-1)(d-2) Delta^3 v_j.

Consequently, if Delta^3 v has at most one nonzero sign transition and
it is from positive to negative, then b first rises and then falls.  In
that case positivity of both endpoints of b implies strict discrete
convexity of u.  This script verifies the identities and this sufficient
criterion on every complete saved hard sequence.
"""

from __future__ import annotations

from fractions import Fraction
import json
from pathlib import Path


DEFAULT_PATHS = [
    "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
    "far_refutation_probe_20260802.json",
    "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
    "interlacing_probe_20260802.json",
    "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
    "generalized_interlacing_probe_20260802.json",
]


def differences(values: list[Fraction]) -> list[Fraction]:
    return [values[j + 1] - values[j] for j in range(len(values) - 1)]


def sign_blocks(values: list[Fraction]) -> list[dict]:
    result = []
    for index, value in enumerate(values):
        sign = 1 if value > 0 else -1 if value < 0 else 0
        if not result or result[-1]["sign"] != sign:
            result.append({"sign": sign, "start": index, "end": index})
        else:
            result[-1]["end"] = index
    return result


def nonzero_sign_word(values: list[Fraction]) -> list[int]:
    result = []
    for value in values:
        if value == 0:
            continue
        sign = 1 if value > 0 else -1
        if not result or result[-1] != sign:
            result.append(sign)
    return result


def audit(record: dict, source: str) -> dict:
    ell = record["ell_values"]
    reserve = record["reserve_values"]
    n = int(record["r"]) + 1
    u = [Fraction(-ell[j], n * reserve[j]) for j in range(len(reserve))]
    v = [Fraction(n - j) * u[j] for j in range(len(u))]
    first = differences(v)
    second = differences(first)
    third = differences(second)
    u_second = differences(differences(u))

    a = [Fraction(n - j) * first[j] + v[j] for j in range(len(first))]
    b = [
        2 * a[j] + Fraction((n - j) * (n - j - 1)) * second[j]
        for j in range(len(second))
    ]
    identity_failures = []
    for j, value in enumerate(b):
        d = n - j
        if value != Fraction(d * (d - 1) * (d - 2)) * u_second[j]:
            identity_failures.append({"identity": "u_curvature", "index": j})
    for j in range(len(b) - 1):
        d = n - j
        if b[j + 1] - b[j] != Fraction((d - 1) * (d - 2)) * third[j]:
            identity_failures.append({"identity": "b_increment", "index": j})

    third_sign_word = nonzero_sign_word(third)
    third_peak_shape = third_sign_word in ([], [1], [-1], [1, -1])
    endpoint_b_positive = bool(b and b[0] > 0 and b[-1] > 0)
    curvature_lc_failures = [
        j
        for j in range(1, len(second) - 1)
        if second[j] ** 2 < second[j - 1] * second[j + 1]
    ]
    curvature_lc_equalities = [
        j
        for j in range(1, len(second) - 1)
        if second[j] ** 2 == second[j - 1] * second[j + 1]
    ]

    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "c": record.get("c"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": record.get("r"),
        "length": len(u),
        "identity_failure_count": len(identity_failures),
        "first_identity_failures": identity_failures[:10],
        "deweighted_third_difference_sign_blocks": sign_blocks(third),
        "deweighted_third_difference_negative_count": sum(x < 0 for x in third),
        "deweighted_third_difference_zero_count": sum(x == 0 for x in third),
        "deweighted_third_difference_nonzero_sign_word": third_sign_word,
        "deweighted_third_difference_has_peak_shape": third_peak_shape,
        "deweighted_curvature_nonpositive_count": sum(x <= 0 for x in second),
        "deweighted_curvature_log_concavity_failure_count": len(
            curvature_lc_failures
        ),
        "deweighted_curvature_log_concavity_equality_count": len(
            curvature_lc_equalities
        ),
        "deweighted_curvature_first_log_concavity_failures": (
            curvature_lc_failures[:10]
        ),
        "initial_b_positive": bool(b and b[0] > 0),
        "final_b_positive": bool(b and b[-1] > 0),
        "b_sign_blocks": sign_blocks(b),
        "b_minimum_index": min(range(len(b)), key=b.__getitem__) if b else None,
        "utilization_second_difference_negative_count": sum(x < 0 for x in u_second),
        "utilization_second_difference_zero_count": sum(x == 0 for x in u_second),
        "sufficient_lemma_certifies_strict_convexity": bool(
            third_peak_shape and endpoint_b_positive
        ),
    }


def main() -> None:
    records = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        records.extend(
            audit(record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )

    passed = all(
        record["identity_failure_count"] == 0
        and record["sufficient_lemma_certifies_strict_convexity"]
        for record in records
    )
    report = {
        "status": (
            "PASS_DEWEIGHTED_THIRD_CONVEXITY_REDUCTION_ALL_SAVED_CASES"
            if passed else "SUFFICIENT_REDUCTION_HAS_SAVED_CASE_FAILURE"
        ),
        "lemma": (
            "For d=n-j and u_j=v_j/d, set "
            "a_j=d Delta v_j+v_j and "
            "b_j=2a_j+d(d-1)Delta^2v_j. Then "
            "Delta^2u_j=b_j/[d(d-1)(d-2)] and "
            "Delta b_j=(d-1)(d-2)Delta^3v_j. Hence, if the "
            "nonzero signs of Delta^3v are empty, constant, or + then -, "
            "the sequence b has no interior minimum; b_0>0 and "
            "b_last>0 then imply Delta^2u>0."
        ),
        "case_count": len(records),
        "certified_case_count": sum(
            record["sufficient_lemma_certifies_strict_convexity"]
            and record["identity_failure_count"] == 0
            for record in records
        ),
        "records": records,
        "warning": "Finite exact audit of complete saved sequences only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "deweighted_third_convexity_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
