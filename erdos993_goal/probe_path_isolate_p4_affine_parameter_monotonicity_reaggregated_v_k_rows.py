#!/usr/bin/env python3
"""Audit the inner T-binomial rows after exact V-reaggregation."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate
from probe_path_isolate_p4_affine_scaled_excess_local_summands import choose, local
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


def simple_tail(values: list[int]) -> dict:
    nonzero = [(index, value) for index, value in enumerate(values) if value]
    negative = [index for index, value in nonzero if value < 0]
    signs = [value > 0 for _, value in nonzero]
    transitions = sum(
        signs[index] != signs[index - 1] for index in range(1, len(signs))
    )
    if not negative:
        return {
            "negative_count": 0,
            "terminal_contiguous": True,
            "sign_transitions": transitions,
            "preceding_terms_needed": 0,
        }
    start = negative[0]
    terminal = all(value < 0 for index, value in nonzero if index >= start)
    debt = -sum(value for index, value in nonzero if index >= start)
    accumulated = 0
    needed = None
    for width in range(1, start + 1):
        accumulated += values[start - width]
        if accumulated >= debt:
            needed = width
            break
    return {
        "negative_count": len(negative),
        "terminal_contiguous": terminal,
        "sign_transitions": transitions,
        "preceding_terms_needed": needed,
    }


def audit_case(
    package: str,
    parity: int,
    coordinate: str,
    c_value: int,
    m_value: int,
    x_value: int,
    r: int,
) -> dict:
    ell_source, reserve_source = reduced_sources(package, parity, coordinate)
    ell_numeric = evaluate(ell_source, c_value, m_value, x_value, 10**9)
    reserve_numeric = evaluate(reserve_source, c_value, m_value, x_value, 10**9)
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
    b = original_b + 3
    target = m_value + r + 5 + (coordinate == "m")
    target = target if package == "group" else target - 2
    n = r + 1
    rows = []
    aggregated = [0] * (n + 1)
    for k_value in range(b + 1):
        values = []
        for j_value in range(n + 1):
            ell_value = choose(n, j_value) * local(
                ell_numeric, a, b, n, target, k_value, j_value
            )
            reserve_value = 0
            if j_value < n:
                reserve_value = n * choose(n - 1, j_value) * local(
                    reserve_numeric,
                    a,
                    b,
                    n - 1,
                    target,
                    k_value,
                    j_value,
                )
            values.append(ell_value + reserve_value)
            aggregated[j_value] += choose(b, k_value) * values[-1]
        tail = simple_tail(values)
        rows.append(
            {
                "k": k_value,
                "total_positive": sum(values) >= 0,
                "total_zero": sum(values) == 0,
                "negative_count": tail["negative_count"],
                "terminal_contiguous": tail["terminal_contiguous"],
                "sign_transitions": tail["sign_transitions"],
                "preceding_terms_needed": tail["preceding_terms_needed"],
            }
        )
    direct_ell = aggregate(
        ell_source, a, b, n, target, c_value, m_value, x_value
    )
    direct_reserve = aggregate(
        reserve_source, a, b, n - 1, target, c_value, m_value, x_value
    )
    direct = [
        direct_ell[j] + (n * direct_reserve[j] if j < n else 0)
        for j in range(n + 1)
    ]
    assert aggregated == direct
    failures = [
        row
        for row in rows
        if not row["total_positive"]
        or not row["terminal_contiguous"]
        or row["sign_transitions"] > 1
    ]
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "k_row_count": len(rows),
        "negative_total_k_row_count": sum(not row["total_positive"] for row in rows),
        "zero_total_k_row_count": sum(row["total_zero"] for row in rows),
        "nonterminal_k_row_count": sum(not row["terminal_contiguous"] for row in rows),
        "maximum_k_row_sign_transitions": max(row["sign_transitions"] for row in rows),
        "maximum_k_row_predecessors_needed": max(
            (row["preceding_terms_needed"] or 0) for row in rows
        ),
        "failure_count": len(failures),
        "first_failures": failures[:20],
        "rows": rows,
    }


def main() -> None:
    cases = [
        ("group", 0, "m", 1, 90, 180, 120),
        ("bottom", 1, "x", 0, 120, 240, 180),
    ]
    records = []
    for case in cases:
        record = audit_case(*case)
        records.append(record)
        print({key: value for key, value in record.items() if key != "rows"}, flush=True)
    report = {
        "status": "PASS_FINITE_REAGGREGATED_K_ROWS"
        if all(not record["failure_count"] for record in records)
        else "K_ROW_FAILURE",
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "k_rows_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
