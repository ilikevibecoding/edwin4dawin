#!/usr/bin/env python3
"""Exact block audit for the Euler-transferred affine bridge.

The h-th homogeneous contribution to the standard central bridge target is

  e_h=[z^Dw^D](z+w)^h {XQ+(2D-E)(XR)} = q_h+h*rho_h.

The full value is ``sum_h C(k+1,h)e_h``.  This probe records how many of the
low-h boundary layers must be retained before every remaining layer and the
accumulated boundary block are nonnegative.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from probe_affine_bridge_reaggregated_boundary_layers import outer, sources


def homogeneous(poly, target, h):
    return sum(
        math.comb(h, p) * poly.get((target - p, target - h + p), 0)
        for p in range(h + 1)
    )


def audit(package, parity, parameters, maximum_r, q_source, r_source):
    m_value = parameters[1] if package == "group" else parameters[0]
    cap = m_value + maximum_r + 5
    _, q_outer, r_outer = outer(
        package, parity, parameters, q_source, r_source, cap
    )
    order_records = []
    maximum_required_block = 0
    first_full_failure = None
    first_no_terminal_block = None
    negative_layer_count = 0
    for order in range(maximum_r + 1):
        target = m_value + order + 5
        n = order + 1
        layers = []
        prefix = 0
        prefix_values = []
        for h in range(n + 1):
            q_h = homogeneous(q_outer, target, h)
            rho_h = homogeneous(r_outer, target, h)
            value = q_h + h * rho_h
            if value < 0:
                negative_layer_count += 1
            weighted = math.comb(n, h) * value
            prefix += weighted
            prefix_values.append(prefix)
            layers.append({
                "h": h,
                "q_h": q_h,
                "rho_h": rho_h,
                "e_h": value,
                "weighted": weighted,
            })
        full = prefix
        if full < 0 and first_full_failure is None:
            first_full_failure = {"r": order, "value": full}

        # The least H such that the low boundary block 0..H is nonnegative
        # and each later layer is individually nonnegative.
        required = None
        for H in range(n + 1):
            if prefix_values[H] >= 0 and all(
                item["e_h"] >= 0 for item in layers[H + 1:]
            ):
                required = H
                break
        if required is None and first_no_terminal_block is None:
            first_no_terminal_block = {"r": order}
        if required is not None:
            maximum_required_block = max(maximum_required_block, required)
        order_records.append({
            "r": order,
            "target": target,
            "full": full,
            "negative_h": [item["h"] for item in layers if item["e_h"] < 0],
            "least_boundary_block_H": required,
            "boundary_block_value": (
                prefix_values[required] if required is not None else None
            ),
            "layers": layers,
        })
    parameter_record = (
        {"c": parameters[0], "m": parameters[1], "x": parameters[2]}
        if package == "group" else
        {"m": parameters[0], "x": parameters[1]}
    )
    return {
        "package": package,
        "parity": parity,
        **parameter_record,
        "maximum_r": maximum_r,
        "maximum_required_boundary_block_H": maximum_required_block,
        "negative_layer_count": negative_layer_count,
        "first_full_failure": first_full_failure,
        "first_no_terminal_block": first_no_terminal_block,
        "orders": order_records,
    }


def main():
    points = {
        "group": [
            ((1, 3, 0), 50), ((1, 3, 4), 50),
            ((1, 12, 24), 50), ((15, 30, 60), 50),
            ((30, 3, 0), 50),
        ],
        "bottom": [
            ((3, 0), 50), ((3, 48), 50),
            ((20, 40), 50), ((30, 60), 50),
            ((12, 24), 50),
        ],
    }
    records = []
    for package in ("group", "bottom"):
        for parity in (0, 1):
            q_source, r_source = sources(package, parity)
            for parameters, maximum_r in points[package]:
                record = audit(
                    package, parity, parameters, maximum_r,
                    q_source, r_source,
                )
                records.append(record)
                print(
                    package, parity, parameters,
                    "maxH", record["maximum_required_boundary_block_H"],
                    "neg", record["negative_layer_count"],
                    "fullfail", record["first_full_failure"],
                    flush=True,
                )
    full_failures = [record for record in records if record["first_full_failure"]]
    block_failures = [record for record in records if record["first_no_terminal_block"]]
    report = {
        "status": (
            "NO_FINITE_COUNTEREXAMPLE_TO_EULER_TRANSFER_BLOCKS"
            if not full_failures and not block_failures else
            "EULER_TRANSFER_BLOCK_FAILURE"
        ),
        "identity": (
            "e_h=[z^Dw^D](z+w)^h{XQ+(2D-E)(XR)}=q_h+h*rho_h; "
            "F_k=sum_(h=0)^(k+1) C(k+1,h)e_h"
        ),
        "record_count": len(records),
        "full_failure_count": len(full_failures),
        "block_failure_count": len(block_failures),
        "maximum_required_boundary_block_H": max(
            record["maximum_required_boundary_block_H"] for record in records
        ),
        "records": records,
        "scope_warning": "Finite exact probe only.",
    }
    output = Path("affine_bridge_euler_transfer_blocks_probe_20260812.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        key: value for key, value in report.items() if key != "records"
    }, indent=2))


if __name__ == "__main__":
    main()
