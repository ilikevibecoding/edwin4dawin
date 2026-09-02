#!/usr/bin/env python3
"""Inspect sign geometry of the reduced original source V*L+(r+1)R."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_scaled_excess_local_summands import choose, local
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


def add(result: dict[tuple[int, int], int], key: tuple[int, int], value: int) -> None:
    updated = result.get(key, 0) + value
    if updated:
        result[key] = updated
    elif key in result:
        del result[key]


def original_source(ell, reserve, r: int) -> dict[tuple[int, int], int]:
    result = {}
    for (pz, pw), value in ell.items():
        add(result, (pz, pw), value)
        add(result, (pz + 1, pw), value)
        add(result, (pz, pw + 1), value)
    for key, value in reserve.items():
        add(result, key, (r + 1) * value)
    return result


def word(values) -> list[int]:
    result = []
    for value in values:
        current = 1 if value > 0 else -1 if value < 0 else 0
        if current and (not result or result[-1] != current):
            result.append(current)
    return result


def grouped(source, key, order) -> list[dict]:
    groups = {}
    for exponent, value in source.items():
        groups.setdefault(key(exponent), []).append((exponent, value))
    records = []
    for label, entries in sorted(groups.items()):
        entries.sort(key=lambda item: order(item[0]))
        signs = word(value for _, value in entries)
        records.append({
            "label": label,
            "term_count": len(entries),
            "sign_word": signs,
            "transition_count": max(0, len(signs) - 1),
        })
    return records


def symmetric_sq_basis(source: dict[tuple[int, int], int]):
    """Convert a symmetric z,w source to the basis s=z+w, q=zw."""

    max_difference = max(abs(pz - pw) for pz, pw in source)
    power_sums = [{(0, 0): 2}, {(1, 0): 1}]
    for degree in range(2, max_difference + 1):
        current = {}
        for (ps, pq), value in power_sums[-1].items():
            add(current, (ps + 1, pq), value)
        for (ps, pq), value in power_sums[-2].items():
            add(current, (ps, pq + 1), -value)
        power_sums.append(current)

    result = {}
    for (pz, pw), value in source.items():
        if pz < pw:
            continue
        if pz == pw:
            add(result, (0, pz), value)
            continue
        if source.get((pw, pz)) != value:
            raise AssertionError("source is not symmetric")
        difference = pz - pw
        for (ps, pq), coefficient in power_sums[difference].items():
            add(result, (ps, pq + pw), value * coefficient)
    return result


def aggregate_numeric_at_j(source, a: int, b: int, order: int, target: int, j: int):
    return choose(order, j) * sum(
        choose(b, k) * local(source, a, b, order, target, k, j)
        for k in range(b + 1)
    )


def audit(package, parity, coordinate, c_value, m_value, x_value, r):
    ell_source, reserve_source = reduced_sources(package, parity, coordinate)
    cap = m_value + r + 6
    ell = evaluate(ell_source, c_value, m_value, x_value, cap)
    reserve = evaluate(reserve_source, c_value, m_value, x_value, cap)
    source = original_source(ell, reserve, r)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    reduced_b = (
        2 * m_value + parity - 1
        if package == "group" else 2 * m_value + parity - 2
    )
    target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    parity_remainder_sources = []
    for parity_class in (0, 1):
        leading_index = r - ((r - parity_class) % 2)
        original_leading = aggregate_numeric_at_j(
            source, a, reduced_b, r, target, leading_index
        )
        reserve_leading = aggregate_numeric_at_j(
            reserve, a, reduced_b, r, target, leading_index
        )
        remainder_source = {}
        for key in set(source) | set(reserve):
            add(
                remainder_source,
                key,
                reserve_leading * source.get(key, 0)
                - original_leading * reserve.get(key, 0),
            )
        parity_remainder_sources.append({
            "parity_class": parity_class,
            "leading_index": leading_index,
            "term_count": len(remainder_source),
            "negative_count": sum(value < 0 for value in remainder_source.values()),
            "positive_count": sum(value > 0 for value in remainder_source.values()),
            "coefficientwise_one_sign": not (
                any(value < 0 for value in remainder_source.values())
                and any(value > 0 for value in remainder_source.values())
            ),
        })
    symmetric = symmetric_sq_basis(source)
    row = grouped(source, lambda e: e[1], lambda e: e[0])
    diagonal = grouped(source, lambda e: e[0] + e[1], lambda e: e[0] - e[1])
    antidiagonal = grouped(source, lambda e: e[0] - e[1], lambda e: e[0] + e[1])
    symmetric_s_rows = grouped(symmetric, lambda e: e[0], lambda e: e[1])
    symmetric_q_rows = grouped(symmetric, lambda e: e[1], lambda e: e[0])
    antidiagonal_words = {}
    for item in antidiagonal:
        key = ",".join(str(value) for value in item["sign_word"])
        antidiagonal_words[key] = antidiagonal_words.get(key, 0) + 1
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "term_count": len(source),
        "negative_count": sum(value < 0 for value in source.values()),
        "positive_count": sum(value > 0 for value in source.values()),
        "symmetric_sq_term_count": len(symmetric),
        "symmetric_sq_negative_count": sum(value < 0 for value in symmetric.values()),
        "symmetric_sq_positive_count": sum(value > 0 for value in symmetric.values()),
        "parity_leading_cancelled_source_summaries": parity_remainder_sources,
        "symmetric_fixed_s_maximum_transition_count": max(
            x["transition_count"] for x in symmetric_s_rows
        ),
        "symmetric_fixed_q_maximum_transition_count": max(
            x["transition_count"] for x in symmetric_q_rows
        ),
        "row_maximum_transition_count": max(x["transition_count"] for x in row),
        "diagonal_maximum_transition_count": max(x["transition_count"] for x in diagonal),
        "antidiagonal_maximum_transition_count": max(x["transition_count"] for x in antidiagonal),
        "row_transition_histogram": {
            str(k): sum(x["transition_count"] == k for x in row)
            for k in range(max(x["transition_count"] for x in row) + 1)
        },
        "diagonal_transition_histogram": {
            str(k): sum(x["transition_count"] == k for x in diagonal)
            for k in range(max(x["transition_count"] for x in diagonal) + 1)
        },
        "antidiagonal_transition_histogram": {
            str(k): sum(x["transition_count"] == k for x in antidiagonal)
            for k in range(max(x["transition_count"] for x in antidiagonal) + 1)
        },
        "antidiagonal_sign_word_histogram": antidiagonal_words,
    }


def main() -> None:
    records = [
        audit("group", 0, "m", 1, 120, 240, 160),
        audit("bottom", 1, "x", 0, 120, 240, 180),
        audit("group", 0, "m", 1, 16, 40, 25),
        audit("bottom", 1, "x", 0, 20, 40, 26),
    ]
    report = {
        "status": "ORIGINAL_SOURCE_SIGN_GEOMETRY_DIAGNOSTIC",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_source_sign_geometry_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
