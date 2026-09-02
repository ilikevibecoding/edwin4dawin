#!/usr/bin/env python3
"""Exact full-reciprocal-support audit of the affine diagonal layers."""

from __future__ import annotations

import json
from pathlib import Path

from probe_affine_bridge_boundary_layer_cone import audit
from probe_affine_bridge_shifted_predecessors import sources


def reciprocal_target(package: str, parity: int, parameters: tuple[int, ...]) -> int:
    if package == "group":
        c_value, m_value, x_value = parameters
        return 2 * c_value + 4 * m_value + x_value + 2 * parity + 8
    m_value, x_value = parameters
    return 4 * m_value + x_value + 2 * parity + 8


def main() -> None:
    cases = [
        ("group", 0, (1, 12, 24)),
        ("group", 1, (1, 12, 24)),
        ("bottom", 0, (12, 24)),
        ("bottom", 1, (12, 24)),
        ("bottom", 0, (3, 48)),
        ("bottom", 1, (3, 48)),
    ]
    records = []
    for package, parity, parameters in cases:
        target = reciprocal_target(package, parity, parameters)
        base_source, reserve_source = sources(package, parity)
        record = audit(
            package,
            parity,
            parameters,
            target - 1,
            base_source,
            reserve_source,
        )
        record["fixed_reciprocal_target_N"] = target
        record["full_nonzero_selector_order_range"] = [0, target - 1]
        records.append(record)
        print(package, parity, parameters, "done", flush=True)

    layer_failures = [record for record in records if record["first_negative_layer"]]
    prefix_failures = [
        record for record in records
        if record["first_negative_weighted_prefix"]
    ]
    suffix_failures = [
        record for record in records
        if record["first_negative_weighted_suffix"]
    ]
    report = {
        "status": "NO_COUNTEREXAMPLE_ON_SELECTED_FULL_RECIPROCAL_SUPPORTS",
        "scope": (
            "For every listed point, all orders 0<=r<=N-1 are checked, "
            "so the moving original target traverses the complete relevant "
            "fixed reciprocal diagonal support."
        ),
        "case_count": len(records),
        "layer_check_count": sum(record["layer_check_count"] for record in records),
        "layer_failure_case_count": len(layer_failures),
        "weighted_prefix_failure_case_count": len(prefix_failures),
        "weighted_suffix_failure_case_count": len(suffix_failures),
        "first_layer_failures": layer_failures[:10],
        "records": records,
        "scope_warning": (
            "The support traversal is complete at the six selected parameter "
            "points, but this remains finite evidence over the unbounded "
            "parameter domain."
        ),
    }
    assert not layer_failures
    assert not prefix_failures
    assert not suffix_failures
    output = Path("affine_bridge_layer_full_support_probe_20260810.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        key: value for key, value in report.items()
        if key not in ("records", "first_layer_failures")
    }, indent=2))


if __name__ == "__main__":
    main()
