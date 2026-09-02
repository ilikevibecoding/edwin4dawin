#!/usr/bin/env python3
"""Axiswise exact Bernstein probe for the uniform same-mark >=5 cone."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp

import probe_iso_n7_bundle_g3_adjacent_no_parent_same_mark_ge5_uniform_rank7_g5_finish as base


HERE = Path(__file__).resolve().parent
BASE_SOURCE = HERE / "probe_iso_n7_bundle_g3_adjacent_no_parent_same_mark_ge5_uniform_rank7_g5_finish.py"
BASE_SOURCE_SHA = "2D9F8618DE7D377E512BBDCCE6861FFCE9F265F235F065FCC767750E1047E901"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_SAME_MARK_GE5_UNIFORM_AXISWISE_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def axiswise_summary(expression, variables, tail):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    shape = tuple(degree + 1 for degree in degrees)
    controls = np.empty(shape, dtype=object)
    controls.fill(sp.Integer(0))
    for powers, coefficient in polynomial.terms():
        controls[powers] = sp.expand(coefficient)
    for axis, degree in enumerate(degrees):
        moved = np.moveaxis(controls, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for index in range(degree + 1):
            target[index] = sum(
                source[exponent]
                * sp.Rational(math.comb(index, exponent), math.comb(degree, exponent))
                for exponent in range(index + 1)
            )
        controls = np.moveaxis(target.reshape(moved.shape), 0, axis)
    negatives = []
    scalar_total = negative_count = 0
    minimum = None
    stream = hashlib.sha256()
    for index in np.ndindex(shape):
        value = sp.expand(controls[index])
        stream.update(f"{degrees}|{index}|{sp.srepr(value)};".encode())
        for coefficient in sp.Poly(value, tail).all_coeffs():
            scalar_total += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative_count += 1
                if len(negatives) < 20:
                    negatives.append({
                        "index": list(index),
                        "control": str(value),
                        "negative_coefficient": str(coefficient),
                    })
    return {
        "variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "bernstein_controls": int(np.prod(shape)),
        "tail_scalar_coefficients": scalar_total,
        "negative_tail_scalar_coefficients": negative_count,
        "minimum_tail_scalar_coefficient": str(minimum),
        "first_negative": negatives,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "exact_power_inversion": False,
        "algorithm": "axiswise exact power-to-Bernstein conversion",
    }


def summarize(expression, variables, m, threshold=10):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail + threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    twice_edge = 10 + tail * (1 + variables[1] * (1 - variables[0]))
    denominator_power = None
    for power in range(5):
        quotient = sp.cancel(denominator / twice_edge**power)
        if not quotient.free_symbols and quotient > 0:
            denominator_power = power
            break
    assert denominator_power is not None
    return axiswise_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    assert sha256(BASE_SOURCE) == BASE_SOURCE_SHA
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--main-only", action="store_true")
    args = parser.parse_args()
    values = base.build_value(args.chart)
    main_summary, denominator = summarize(values["value"], values["variables"], values["m"])
    sign_summaries, sign_denominators = {}, {}
    if not args.main_only:
        for label in ("minus_d4", "minus_nested_b", "minus_nested_c"):
            sign_summaries[label], sign_denominators[label] = summarize(
                values[label], values["sign_variables"], values["m"]
            )
    suffix = "_main_only" if args.main_only else ""
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_same_mark_ge5_uniform_{args.chart}_m10_axiswise{suffix}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "main_only": args.main_only,
        "threshold_m": 10,
        "threshold_n": 12,
        "root_count_parameterization": str(values["roots"]),
        "root_count_domain": "5<=r<=m/2, continuously over-approximated",
        "root_degree_parameterization": str(values["degree_sum"]),
        "union_shadow": {
            "Q2_exact": str(values["q2"]),
            "pair_row_exact": str(values["pair_row"]),
            "Q3_upper": str(values["q3_upper"]),
            "extension3_exact": str(values["extension3"]),
            "triple_row_lower": str(values["triple_row"]),
            "Q4_extra": str(values["q4_extra"]),
            "nested_b": str(values["nested_b"]),
            "nested_c": str(values["nested_c"]),
            "safe_lower": str(values["lower"]),
        },
        "summary": main_summary,
        "positive_denominator": denominator,
        "sign_summaries": sign_summaries,
        "sign_positive_denominators": sign_denominators,
        "dependency_source_sha256": BASE_SOURCE_SHA,
        "scope": "Same-mark r>=5 attachments at nonisolated roots in distinct components of isolate-free W; adjacent no-parent G3.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "chart": args.chart,
        "degree_profile": main_summary["degree_profile"],
        "controls": main_summary["bernstein_controls"],
        "main_negatives": main_summary["negative_tail_scalar_coefficients"],
        "minimum": main_summary["minimum_tail_scalar_coefficient"],
        "first_negative": main_summary["first_negative"],
        "sign_negatives": {label: item["negative_tail_scalar_coefficients"] for label, item in sign_summaries.items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
