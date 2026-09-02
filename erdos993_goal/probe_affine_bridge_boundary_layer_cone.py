#!/usr/bin/env python3
"""Test the exact planar-path boundary-layer strengthening.

For a fixed order r, decompose each shifted predecessor according to the
number j of constant steps in V^r.  The remaining two step counts give a
binomial row.  Layerwise positivity would be a natural recurrence-compatible
planar-network cone, but it is strictly stronger than positivity of the sum.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from probe_affine_bridge_shifted_predecessors import (
    A,
    T_dict,
    V_dict,
    evaluate,
    multiply,
    power,
    sources,
)


def initial_outer(package, parity, parameters, base_source, reserve_source, cap):
    if package == "group":
        c_value, m_value, x_value = parameters
        a_value = 2 * c_value + m_value + x_value - 3
        b_value = 2 * m_value + parity - 4
    else:
        m_value, x_value = parameters
        c_value = 0
        a_value = m_value + x_value - 3
        b_value = 2 * m_value + parity - 5
    base = evaluate(base_source, c_value, m_value, x_value, cap)
    reserve = evaluate(reserve_source, c_value, m_value, x_value, cap)
    for factor, exponent in ((A, a_value), (T_dict, b_value)):
        factor_power = power(factor, exponent, cap)
        base = multiply(base, factor_power, cap)
        reserve = multiply(reserve, factor_power, cap)
    return m_value, base, reserve


def shifted_layers(base, reserve, m_value, order, kind):
    """Return layers after removing the manifest positive C(r,j) factor."""
    baseline = m_value + 5
    extra_w = 0 if kind == "U" else 1
    layers = []
    for constant_steps in range(order + 1):
        length = order - constant_steps
        value = 0
        for k in range(length + 1):
            offset_z = constant_steps + 1 + k
            offset_w = order + extra_w - k
            source_value = (
                base.get((baseline + offset_z, baseline + offset_w), 0)
                + order
                * reserve.get((baseline + offset_z, baseline + offset_w), 0)
            )
            value += math.comb(length, k) * source_value
        layers.append(value)
    return layers


def audit(package, parity, parameters, maximum_r, base_source, reserve_source):
    m_value = parameters[1] if package == "group" else parameters[0]
    cap = m_value + maximum_r + 6
    m_value, base, reserve = initial_outer(
        package, parity, parameters, base_source, reserve_source, cap
    )
    first_negative_layer = {}
    first_negative_prefix = {}
    first_negative_suffix = {}
    total_checks = 0
    propagated_base = base
    propagated_reserve = reserve
    for order in range(maximum_r + 1):
        target = m_value + order + 5
        for kind, coordinate in (
            ("U", (target + 1, target)),
            ("V", (target + 1, target + 1)),
        ):
            layers = shifted_layers(base, reserve, m_value, order, kind)
            weighted = [
                math.comb(order, j) * value for j, value in enumerate(layers)
            ]
            direct = (
                propagated_base.get(coordinate, 0)
                + order * propagated_reserve.get(coordinate, 0)
            )
            assert sum(weighted) == direct
            total_checks += len(layers)
            for j, value in enumerate(layers):
                if value < 0 and kind not in first_negative_layer:
                    first_negative_layer[kind] = {
                        "r": order, "j": j, "unweighted_layer": value,
                        "weighted_layer": weighted[j],
                    }
            prefix = 0
            for j, value in enumerate(weighted):
                prefix += value
                if prefix < 0 and kind not in first_negative_prefix:
                    first_negative_prefix[kind] = {
                        "r": order, "through_j": j, "weighted_prefix": prefix,
                    }
            suffix = 0
            for j in range(order, -1, -1):
                suffix += weighted[j]
                if suffix < 0 and kind not in first_negative_suffix:
                    first_negative_suffix[kind] = {
                        "r": order, "from_j": j, "weighted_suffix": suffix,
                    }
        propagated_base = multiply(propagated_base, V_dict, cap)
        propagated_reserve = multiply(propagated_reserve, V_dict, cap)
    parameter_record = (
        {"c": parameters[0], "m": parameters[1], "x": parameters[2]}
        if package == "group"
        else {"m": parameters[0], "x": parameters[1]}
    )
    return {
        "package": package,
        "parity": parity,
        **parameter_record,
        "maximum_r": maximum_r,
        "layer_check_count": total_checks,
        "first_negative_layer": first_negative_layer,
        "first_negative_weighted_prefix": first_negative_prefix,
        "first_negative_weighted_suffix": first_negative_suffix,
    }


def main() -> None:
    points = {
        "group": [(1, 3, 0), (1, 12, 24), (15, 30, 60), (30, 3, 0)],
        "bottom": [(3, 0), (3, 48), (20, 40), (30, 60)],
    }
    records = []
    for package in ("group", "bottom"):
        for parity in (0, 1):
            base_source, reserve_source = sources(package, parity)
            for parameters in points[package]:
                records.append(audit(
                    package, parity, parameters, 50,
                    base_source, reserve_source,
                ))
            print(package, parity, "done", flush=True)
    failures = {
        label: sum(bool(record[label]) for record in records)
        for label in (
            "first_negative_layer",
            "first_negative_weighted_prefix",
            "first_negative_weighted_suffix",
        )
    }
    report = {
        "status": "BOUNDARY_LAYER_CONE_PROBE",
        "identity": {
            "U_layer_r_j": (
                "sum_(k=0)^(r-j) C(r-j,k) "
                "H_r(L+j+1+k,L+r-k)"
            ),
            "V_layer_r_j": (
                "sum_(k=0)^(r-j) C(r-j,k) "
                "H_r(L+j+1+k,L+r+1-k)"
            ),
            "assembly": (
                "U_r=sum_j C(r,j)U_layer_r_j; "
                "V_r=sum_j C(r,j)V_layer_r_j"
            ),
            "H_r": "A^a T^b (B+rP)",
        },
        "case_count": len(records),
        "layer_check_count": sum(record["layer_check_count"] for record in records),
        "failure_case_counts": failures,
        "records": records,
        "scope_warning": "Finite exact probe only.",
    }
    output = Path("affine_bridge_boundary_layer_cone_probe_20260810.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "case_count": report["case_count"],
        "layer_check_count": report["layer_check_count"],
        "failure_case_counts": failures,
        "first_failures": [
            record for record in records
            if any(record[label] for label in failures)
        ][:4],
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
