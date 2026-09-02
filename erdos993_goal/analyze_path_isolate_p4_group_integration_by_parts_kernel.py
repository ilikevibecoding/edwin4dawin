#!/usr/bin/env python3
"""Analyze the finite kernel obtained by integrating the r*P reserve by parts."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    Sparse,
    add,
    divisible_by_e1,
    divide_by_e1,
    hcu_audit,
    load_kernel,
    multiply_v,
    paired_cone_audit,
    reciprocal,
    shift_parameters,
)


A_TERMS = ((0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1))
T_TERMS = ((1, 0, 1), (2, 0, 1), (0, 1, 1), (0, 2, 1))
V_TERMS = ((0, 0, 1), (1, 0, 1), (0, 1, 1))
TWO_PLUS_E1_TERMS = ((0, 0, 2), (1, 0, 1), (0, 1, 1))


def multiply_fixed(source: Sparse, terms) -> Sparse:
    result: Sparse = {}
    for (pz, pw, pc, pm, px), value in source.items():
        for dz, dw, coefficient in terms:
            key = (pz + dz, pw + dw, pc, pm, px)
            result[key] = result.get(key, 0) + value * coefficient
    return {key: value for key, value in result.items() if value}


def derivative_sum(source: Sparse) -> Sparse:
    result: Sparse = {}
    for (pz, pw, pc, pm, px), value in source.items():
        if pz:
            key = (pz - 1, pw, pc, pm, px)
            result[key] = result.get(key, 0) + pz * value
        if pw:
            key = (pz, pw - 1, pc, pm, px)
            result[key] = result.get(key, 0) + pw * value
    return {key: value for key, value in result.items() if value}


def multiply_parameter_linear(
    source: Sparse,
    constant: int,
    c_coefficient: int,
    m_coefficient: int,
    x_coefficient: int,
) -> Sparse:
    result: Sparse = {}
    parameter_terms = (
        (0, 0, 0, constant),
        (1, 0, 0, c_coefficient),
        (0, 1, 0, m_coefficient),
        (0, 0, 1, x_coefficient),
    )
    for (pz, pw, pc, pm, px), value in source.items():
        for dc, dm, dx, coefficient in parameter_terms:
            if not coefficient:
                continue
            key = (pz, pw, pc + dc, pm + dm, px + dx)
            result[key] = result.get(key, 0) + value * coefficient
    return {key: value for key, value in result.items() if value}


def analyze(source: Sparse) -> dict:
    reversed_source, bidegree = reciprocal(source)
    shifted = shift_parameters(reversed_source, 1, 3)
    hcu = hcu_audit(shifted)
    e1 = divisible_by_e1(shifted)
    result = {
        "bidegree": bidegree,
        "term_count_after_shift": len(shifted),
        "ordinary_negative_term_count": sum(
            1 for value in shifted.values() if value < 0
        ),
        "hcu": hcu,
        "divisible_by_e1": e1,
    }
    if e1:
        quotient = divide_by_e1(shifted)
        result["e1_quotient_hcu"] = hcu_audit(quotient)
        result["e1_quotient_paired_cone"] = paired_cone_audit(quotient)
    return result


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    records = []
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            maximum = len(kernels) - 1
            p_kernel: Sparse = {}
            base_kernel: Sparse = {}
            for record in kernels:
                order = record["numerator_order"]
                value = multiply_v(load_kernel(record), maximum - order)
                p_kernel = add(p_kernel, value)
                base_kernel = add(base_kernel, value, maximum - order + 1)

            pv = multiply_fixed(p_kernel, V_TERMS)
            at_base = multiply_fixed(
                multiply_fixed(base_kernel, A_TERMS), T_TERMS
            )
            at_v_dp = multiply_fixed(
                multiply_fixed(
                    multiply_fixed(derivative_sum(p_kernel), V_TERMS),
                    A_TERMS,
                ),
                T_TERMS,
            )
            a_term = multiply_parameter_linear(
                multiply_fixed(
                    multiply_fixed(pv, T_TERMS), TWO_PLUS_E1_TERMS
                ),
                -3,
                2,
                1,
                1,
            )
            b_term = multiply_parameter_linear(
                multiply_fixed(
                    multiply_fixed(pv, A_TERMS), V_TERMS
                ),
                parity - 4,
                0,
                2,
                0,
            )
            # For L=(V/2)(d_z+d_w), L(V^r)=rV^r.  Hence
            # R = 2AT*B - ATV*dP - a*TV*(2+e1)*P - 2b*A*V^2*P.
            finite_kernel = add(at_base, at_base)
            finite_kernel = add(finite_kernel, at_v_dp, -1)
            finite_kernel = add(finite_kernel, a_term, -1)
            finite_kernel = add(finite_kernel, b_term, -2)
            records.append(
                {
                    "parity_epsilon": parity,
                    "coordinate": coordinate,
                    "identity": (
                        "R=2*A*T*B-A*T*V*(d_z+d_w)P"
                        "-a*T*(2+z+w)*P*V-2*b*A*P*V^2"
                    ),
                    "a": "2c+m+x-3",
                    "b": f"2m+{parity}-4",
                    **analyze(finite_kernel),
                }
            )
    report = {"status": "ANALYSIS", "records": records}
    Path(
        "path_isolate_p4_group_integration_by_parts_kernel_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
