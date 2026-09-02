#!/usr/bin/env python3
"""Certify roots and endpoint signs for all ten affine families on one ray."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    aggregate,
    blocks,
    roots,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


def audit(
    package: str,
    parity: int,
    coordinate: str,
    c_value: int,
    m_value: int,
    x_value: int,
    r: int,
) -> dict:
    ell_source, reserve_source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    target = m_value + r + 5 + int(coordinate == "m")
    reduced_target = target if package == "group" else target - 2
    reduced_b = original_b + 3
    ell_values = aggregate(
        ell_source, a, reduced_b, r + 1, reduced_target,
        c_value, m_value, x_value,
    )
    reserve_values = aggregate(
        reserve_source, a, reduced_b, r, reduced_target,
        c_value, m_value, x_value,
    )
    values = [
        ell_values[j] + ((r + 1) * reserve_values[j] if j <= r else 0)
        for j in range(r + 2)
    ]
    degree = len(values) - 1
    root_data = roots(values)
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "sign_blocks": blocks(values),
        "root_summary": root_data,
        "fully_real_rooted": root_data["nonreal"] == 0,
        "weighted_at_half_positive": sum(
            value * 2 ** (degree - j) for j, value in enumerate(values)
        ) > 0,
        "weighted_at_one_positive": sum(values) > 0,
        "weighted_at_three_halves_positive": sum(
            value * 3**j * 2 ** (degree - j)
            for j, value in enumerate(values)
        ) > 0,
    }


def main() -> None:
    ctx.prec = 80
    records = []
    m_value, x_value, r = 60, 120, 90
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            record = audit(
                "group", parity, coordinate, 1, m_value, x_value, r
            )
            records.append(record)
            print("group", parity, coordinate, record["root_summary"], flush=True)
        for coordinate in ("x", "m"):
            record = audit(
                "bottom", parity, coordinate, 0, m_value, x_value, r
            )
            records.append(record)
            print("bottom", parity, coordinate, record["root_summary"], flush=True)
    failures = [
        record for record in records
        if record["root_summary"]["nonreal"] > 2
        or not record["weighted_at_half_positive"]
        or not record["weighted_at_three_halves_positive"]
    ]
    report = {
        "status": "PASS_FINITE_QUASI_ROOT_ENDPOINTS" if not failures else "FAIL",
        "case_count": len(records),
        "failure_count": len(failures),
        "records": records,
        "warning": "Finite exact Arb root isolation and integer endpoint signs only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "ray_roots_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
