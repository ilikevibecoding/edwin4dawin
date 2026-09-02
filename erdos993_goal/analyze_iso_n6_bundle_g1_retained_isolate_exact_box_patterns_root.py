#!/usr/bin/env python3
"""Classify derivative-sign and active-cap patterns in the exact box.

This deterministic large-order forest sample is a route diagnostic.  It helps
partition the piecewise exact lower into the sign/cap regimes that actually
occur, but asserts no universal completeness of the observed patterns.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import json
from pathlib import Path
import random

import sympy as sp

from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, random_forest, rows


HERE = Path(__file__).resolve().parent
DERIVATION_REPORT = HERE / "iso_n6_bundle_g1_retained_isolate_exact_box_root_20260901.json"
COARSE_REPORT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_lower_exact_root_20260901.json"
QFREE_REPORT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
HIGH_CAP_REPORT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_high_caps_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_exact_box_patterns_root_20260901.json"
MARKER = "ANALYZED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_EXACT_BOX_PATTERNS_ROOT"
EXPECTED_DERIVATION_REPORT_SHA256 = "AFDDE29CBD7C208D950B3295CE4D07D968F656F6800F5D6A568438445C6C43DE"
EXPECTED_COARSE_REPORT_SHA256 = "148997F5D5ED3A798B18B4FEEF6FF13166366247ACA4D445495AB6655095E12A"
EXPECTED_QFREE_REPORT_SHA256 = "239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE"
EXPECTED_HIGH_CAP_REPORT_SHA256 = "56A0FF0618A94D14AC40C93C585598DEF9441D9F7908E8300C3E35FB58AA4A22"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def compile_expression(text: str):
    expression = sp.sympify(text)
    variables = tuple(sorted(expression.free_symbols, key=str))
    return variables, sp.lambdify(variables, expression, "math")


def evaluate(compiled, values):
    variables, function = compiled
    return int(function(*(values[str(variable)] for variable in variables)))


def main() -> None:
    report_hash = sha256(DERIVATION_REPORT)
    if report_hash != EXPECTED_DERIVATION_REPORT_SHA256:
        raise RuntimeError(f"derivation report hash mismatch: {report_hash}")
    derivation = json.loads(DERIVATION_REPORT.read_text(encoding="utf-8"))
    coarse_hash = sha256(COARSE_REPORT)
    if coarse_hash != EXPECTED_COARSE_REPORT_SHA256:
        raise RuntimeError(f"coarse report hash mismatch: {coarse_hash}")
    coarse_report = json.loads(COARSE_REPORT.read_text(encoding="utf-8"))
    qfree_hash = sha256(QFREE_REPORT)
    if qfree_hash != EXPECTED_QFREE_REPORT_SHA256:
        raise RuntimeError(f"q-free report hash mismatch: {qfree_hash}")
    qfree_report = json.loads(QFREE_REPORT.read_text(encoding="utf-8"))
    high_cap_hash = sha256(HIGH_CAP_REPORT)
    if high_cap_hash != EXPECTED_HIGH_CAP_REPORT_SHA256:
        raise RuntimeError(f"high-cap report hash mismatch: {high_cap_hash}")
    high_cap_report = json.loads(HIGH_CAP_REPORT.read_text(encoding="utf-8"))
    compiled = {}
    for label, branch in derivation["branches"].items():
        rows_compiled = {}
        for name, row in branch["derivative_rows"].items():
            rows_compiled[name] = {
                "derivative": compile_expression(row["derivative_expression"]),
                "containment": compile_expression(row["containment_cap"]),
                "cardinality": compile_expression(row["cardinality_cap"]),
            }
        compiled[label] = {
            "lower": compile_expression(branch["exact_box_lower_expression"]),
            "coarse": compile_expression(coarse_report["branches"][label]["expression"]),
            "qfree": compile_expression(qfree_report["branches"][label]["lower_expression"]),
            "rows": rows_compiled,
        }
        worst_label = f"{label.split('_')[0]}_u0_v0"
        compiled[label]["intrinsic"] = compile_expression(
            high_cap_report["branches"][worst_label]["intrinsic_remaining_expression"]
        )
        compiled[label]["cross"] = compile_expression(
            high_cap_report["branches"][worst_label]["cross_remaining_expression"]
        )

    rng = random.Random(993_641_904)
    trials = 10_000
    derivative_signs = {
        label: {name: Counter() for name in compiled[label]["rows"]} for label in compiled
    }
    active_caps = {
        label: {name: Counter() for name in compiled[label]["rows"]} for label in compiled
    }
    patterns = {label: Counter() for label in compiled}
    lower_signs = {label: Counter() for label in compiled}
    coarse_signs = {label: Counter() for label in compiled}
    qfree_signs = {label: Counter() for label in compiled}
    qfree_minima = {label: None for label in compiled}
    cap_signs = {
        label: {name: Counter() for name in ("intrinsic", "cross")} for label in compiled
    }
    cap_minima = {
        label: {name: None for name in ("intrinsic", "cross")} for label in compiled
    }
    coarse_negative_order_range = {label: [None, None] for label in compiled}
    minima = {label: None for label in compiled}
    stream = hashlib.sha256()

    for trial in range(trials):
        order = rng.randrange(8, 122)
        graph = random_forest(rng, order)
        u, v = rng.sample(tuple(graph), 2)
        uvalue, vvalue = rng.randrange(2), rng.randrange(2)
        tvalue = rng.randrange(order - 1)
        geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
        label = f"{geometry}_u{uvalue}_v{vvalue}"
        values = {
            **categories(rows(graph, u, v)),
            "n": order,
            "t": tvalue,
            "q": tvalue + uvalue + vvalue,
            "s": order - 8,
        }
        sign_word = []
        cap_word = []
        for name, row in compiled[label]["rows"].items():
            derivative = evaluate(row["derivative"], values)
            containment = evaluate(row["containment"], values)
            cardinality = evaluate(row["cardinality"], values)
            derivative_sign = "-" if derivative < 0 else "+" if derivative > 0 else "0"
            cap_sign = "C" if containment < cardinality else "K" if cardinality < containment else "="
            derivative_signs[label][name][derivative_sign] += 1
            active_caps[label][name][cap_sign] += 1
            sign_word.append(derivative_sign)
            cap_word.append(cap_sign)
        pattern = "".join(sign_word) + "|" + "".join(cap_word)
        patterns[label][pattern] += 1
        lower = evaluate(compiled[label]["lower"], values)
        lower_sign = "negative" if lower < 0 else "positive" if lower > 0 else "zero"
        lower_signs[label][lower_sign] += 1
        coarse = evaluate(compiled[label]["coarse"], values)
        coarse_sign = "negative" if coarse < 0 else "positive" if coarse > 0 else "zero"
        coarse_signs[label][coarse_sign] += 1
        qfree = evaluate(compiled[label]["qfree"], values)
        qfree_sign = "negative" if qfree < 0 else "positive" if qfree > 0 else "zero"
        qfree_signs[label][qfree_sign] += 1
        qfree_record = (qfree, order, u, v, uvalue, vvalue, tvalue)
        qfree_minima[label] = (
            qfree_record if qfree_minima[label] is None or qfree_record < qfree_minima[label]
            else qfree_minima[label]
        )
        for cap_name in ("intrinsic", "cross"):
            cap_value = evaluate(compiled[label][cap_name], values)
            cap_sign = "negative" if cap_value < 0 else "positive" if cap_value > 0 else "zero"
            cap_signs[label][cap_name][cap_sign] += 1
            cap_record = (cap_value, order, u, v, uvalue, vvalue, tvalue)
            cap_minima[label][cap_name] = (
                cap_record
                if cap_minima[label][cap_name] is None or cap_record < cap_minima[label][cap_name]
                else cap_minima[label][cap_name]
            )
        if coarse < 0:
            limits = coarse_negative_order_range[label]
            limits[0] = order if limits[0] is None else min(limits[0], order)
            limits[1] = order if limits[1] is None else max(limits[1], order)
        record = (lower, order, u, v, uvalue, vvalue, tvalue)
        minima[label] = record if minima[label] is None or record < minima[label] else minima[label]
        stream.update(f"{trial}|{label}|{pattern}|{lower}|{order}|{u}|{v}|{tvalue};".encode())

    result = {
        "marker": MARKER,
        "seed": 993_641_904,
        "trials": trials,
        "orders": [8, 121],
        "lower_signs": {label: dict(lower_signs[label]) for label in sorted(lower_signs)},
        "coarse_signs": {label: dict(coarse_signs[label]) for label in sorted(coarse_signs)},
        "qfree_signs": {label: dict(qfree_signs[label]) for label in sorted(qfree_signs)},
        "qfree_minima": {label: list(qfree_minima[label]) for label in sorted(qfree_minima)},
        "cap_signs": {
            label: {name: dict(cap_signs[label][name]) for name in cap_signs[label]}
            for label in sorted(cap_signs)
        },
        "cap_minima": {
            label: {name: list(cap_minima[label][name]) for name in cap_minima[label]}
            for label in sorted(cap_minima)
        },
        "coarse_negative_order_range": coarse_negative_order_range,
        "minima": {label: list(minima[label]) if minima[label] else None for label in sorted(minima)},
        "unique_patterns": {label: len(patterns[label]) for label in sorted(patterns)},
        "top_patterns": {
            label: patterns[label].most_common(20) for label in sorted(patterns)
        },
        "derivative_signs": {
            label: {name: dict(rows_[name]) for name in rows_}
            for label, rows_ in derivative_signs.items()
        },
        "active_caps": {
            label: {name: dict(rows_[name]) for name in rows_}
            for label, rows_ in active_caps.items()
        },
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "derivation_report_sha256": report_hash,
        "coarse_report_sha256": coarse_hash,
        "qfree_report_sha256": qfree_hash,
        "high_cap_report_sha256": high_cap_hash,
        "scope_guard": "Observed piecewise patterns are finite diagnostics, not a universal list.",
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(result, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "lower_signs": result["lower_signs"],
        "coarse_signs": result["coarse_signs"],
        "qfree_signs": result["qfree_signs"],
        "qfree_minima": result["qfree_minima"],
        "cap_signs": result["cap_signs"],
        "cap_minima": result["cap_minima"],
        "minima": result["minima"],
        "unique_patterns": result["unique_patterns"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", result["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
