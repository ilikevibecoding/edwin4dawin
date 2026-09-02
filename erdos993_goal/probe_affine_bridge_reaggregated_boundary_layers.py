#!/usr/bin/env python3
"""Probe the derivative-reaggregated homogenizer layers of the bridge."""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr,
    T,
    load_bottom,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_affine_bridge_shifted_predecessors import A, T_dict, evaluate, multiply, power
from prove_affine_bridge_r0_even import w, z
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def sources(package: str, parity: int):
    if package == "bottom":
        constant, slope = load_bottom(parity)
        reduced = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = reduced.coeff_monomial(1) + x * reduced.coeff_monomial(x)
        signed_q = q**2 * T**3 * affine
    else:
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        reduced = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine = reduced.coeff_monomial(1) + x * reduced.coeff_monomial(x)
        signed_q = T**3 * affine
    reserve = sp.expand(slope * A_expr)
    reserve_over_s = sp.cancel(reserve / (z + w))
    assert sp.denom(reserve_over_s) == 1
    assert sp.expand(reserve - (z + w) * reserve_over_s) == 0
    return to_sparse(sp.expand(signed_q)), to_sparse(sp.expand(reserve_over_s))


def outer(package, parity, parameters, q_source, r_source, cap):
    if package == "group":
        c_value, m_value, x_value = parameters
        a_value = 2 * c_value + m_value + x_value - 3
        b_value = 2 * m_value + parity - 4
    else:
        m_value, x_value = parameters
        c_value = 0
        a_value = m_value + x_value - 3
        b_value = 2 * m_value + parity - 5
    q_outer = evaluate(q_source, c_value, m_value, x_value, cap)
    r_outer = evaluate(r_source, c_value, m_value, x_value, cap)
    for factor, exponent in ((A, a_value), (T_dict, b_value)):
        factor_power = power(factor, exponent, cap)
        q_outer = multiply(q_outer, factor_power, cap)
        r_outer = multiply(r_outer, factor_power, cap)
    return m_value, q_outer, r_outer


def layer(q_outer, r_outer, target_z, target_w, homogeneous_power):
    result = 0
    for z_steps in range(homogeneous_power + 1):
        source_key = (
            target_z - z_steps,
            target_w - (homogeneous_power - z_steps),
        )
        result += math.comb(homogeneous_power, z_steps) * (
            q_outer.get(source_key, 0)
            + homogeneous_power * r_outer.get(source_key, 0)
        )
    return result


def audit(package, parity, parameters, maximum_r, q_source, r_source):
    m_value = parameters[1] if package == "group" else parameters[0]
    cap = m_value + maximum_r + 6
    m_value, q_outer, r_outer = outer(
        package, parity, parameters, q_source, r_source, cap
    )
    first_negative = {}
    first_negative_reserve_bearing = {}
    first_terminal_pair_failure = {}
    minimum = {"U": None, "V": None}
    minimum_terminal_pair = {"U": None, "V": None}
    checks = 0
    for order in range(maximum_r + 1):
        target = m_value + order + 5
        for kind, target_pair in (
            ("U", (target + 1, target)),
            ("V", (target + 1, target + 1)),
        ):
            assembled = 0
            weighted_layers = []
            for constant_steps in range(order + 2):
                homogeneous_power = order + 1 - constant_steps
                value = layer(
                    q_outer, r_outer, *target_pair, homogeneous_power
                )
                weighted_value = math.comb(order + 1, constant_steps) * value
                weighted_layers.append(weighted_value)
                assembled += weighted_value
                checks += 1
                candidate = {
                    "r": order,
                    "j": constant_steps,
                    "homogeneous_power": homogeneous_power,
                    "value_without_positive_outer_binomial": value,
                }
                if minimum[kind] is None or value < minimum[kind]["value_without_positive_outer_binomial"]:
                    minimum[kind] = candidate
                if value < 0 and kind not in first_negative:
                    first_negative[kind] = candidate
                if (
                    value < 0
                    and homogeneous_power >= 1
                    and kind not in first_negative_reserve_bearing
                ):
                    first_negative_reserve_bearing[kind] = candidate

            terminal_pair = weighted_layers[-2] + weighted_layers[-1]
            terminal_candidate = {
                "r": order,
                "weighted_h1_plus_h0": terminal_pair,
                "weighted_h1": weighted_layers[-2],
                "weighted_h0": weighted_layers[-1],
            }
            if (
                minimum_terminal_pair[kind] is None
                or terminal_pair
                < minimum_terminal_pair[kind]["weighted_h1_plus_h0"]
            ):
                minimum_terminal_pair[kind] = terminal_candidate
            if terminal_pair < 0 and kind not in first_terminal_pair_failure:
                first_terminal_pair_failure[kind] = terminal_candidate

            # Direct assembly by expanding (1+z+w)^r(B+rP) follows formally
            # from B=(1+z+w)Q+(z+w)R.  The equality is replayed separately in
            # the main shifted-predecessor probe, so here we retain the exact
            # homogenized sum as the value.
            assert isinstance(assembled, int)
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
        "layer_check_count": checks,
        "minimum_layers": minimum,
        "first_negative_layer": first_negative,
        "first_negative_reserve_bearing_layer": first_negative_reserve_bearing,
        "minimum_terminal_pair": minimum_terminal_pair,
        "first_terminal_pair_failure": first_terminal_pair_failure,
    }


def main() -> None:
    points = {
        "group": [(1, 3, 0), (1, 12, 24), (15, 30, 60), (30, 3, 0)],
        "bottom": [(3, 0), (3, 48), (20, 40), (30, 60)],
    }
    records = []
    for package in ("group", "bottom"):
        for parity in (0, 1):
            q_source, r_source = sources(package, parity)
            for parameters in points[package]:
                records.append(audit(
                    package, parity, parameters, 50, q_source, r_source
                ))
            print(package, parity, "done", flush=True)
    failures = [record for record in records if record["first_negative_layer"]]
    corrected_failures = [
        record for record in records
        if record["first_negative_reserve_bearing_layer"]
        or record["first_terminal_pair_failure"]
    ]
    report = {
        "status": (
            "NO_FINITE_COUNTEREXAMPLE_TO_REAGGREGATED_BOUNDARY_LAYERS"
            if not failures else "REAGGREGATED_BOUNDARY_LAYER_COUNTEREXAMPLE"
        ),
        "identity": (
            "V^r(B+rP)=V^(r+1)Q+(r+1)V^rP, with B=VQ+P; "
            "after V=t+s and P=sR, the t^j layer is "
            "C(r+1,j)s^(r+1-j)(Q+(r+1-j)R)"
        ),
        "case_count": len(records),
        "layer_check_count": sum(record["layer_check_count"] for record in records),
        "failure_case_count": len(failures),
        "first_failures": failures[:10],
        "corrected_cone": (
            "Every h>=1 layer is nonnegative and the weighted h=1 layer "
            "plus the terminal h=0 layer is nonnegative."
        ),
        "corrected_cone_failure_case_count": len(corrected_failures),
        "first_corrected_cone_failures": corrected_failures[:10],
        "records": records,
        "scope_warning": "Finite exact probe only; this is not an all-order proof.",
    }
    output = Path("affine_bridge_reaggregated_boundary_layer_probe_20260810.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        key: value for key, value in report.items()
        if key not in (
            "records", "first_failures", "first_corrected_cone_failures"
        )
    }, indent=2))


if __name__ == "__main__":
    main()
