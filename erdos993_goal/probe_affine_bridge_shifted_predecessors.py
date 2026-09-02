#!/usr/bin/env python3
"""Exact finite probe of the two shifted affine-bridge predecessors.

This is evidence and counterexample search, not an all-order proof.  It
checks both individual predecessor values, the exact boundary triple, and
several tempting strengthenings on a compact parameter lattice and hard
large rays.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr,
    T,
    V,
    load_bottom,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_target_rows import (
    A,
    T as T_dict,
    V as V_dict,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def sources(package: str, parity: int):
    if package == "bottom":
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(
            sp.cancel((constant - slope) / (q**2 * T**3)), x
        )
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        reserve = to_sparse(sp.expand(slope * A_expr))
        base = to_sparse(sp.expand(q**2 * T**3 * affine * V + slope * A_expr))
        return base, reserve
    constant, slope = split_sparse(
        Path(
            "path_isolate_p4_group_integrand_stable_"
            f"parity{parity}_terms_20260730.json"
        ),
        "zwcmsx",
    )
    kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
    affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
    reserve = to_sparse(sp.expand(slope * A_expr))
    base = to_sparse(sp.expand(T**3 * affine * V + slope * A_expr))
    return base, reserve


def audit_point(
    package: str,
    parity: int,
    parameters: tuple[int, ...],
    maximum_r: int,
    base_source,
    reserve_source,
) -> dict:
    if package == "group":
        c_value, m_value, x_value = parameters
        a_value = 2 * c_value + m_value + x_value - 3
        b_value = 2 * m_value + parity - 4
        parameter_record = {"c": c_value, "m": m_value, "x": x_value}
    else:
        m_value, x_value = parameters
        c_value = 0
        a_value = m_value + x_value - 3
        b_value = 2 * m_value + parity - 5
        parameter_record = {"m": m_value, "x": x_value}
    cap = m_value + maximum_r + 6
    base = evaluate(base_source, c_value, m_value, x_value, cap)
    reserve = evaluate(reserve_source, c_value, m_value, x_value, cap)
    for factor, exponent in ((A, a_value), (T_dict, b_value)):
        factor_power = power(factor, exponent, cap)
        base = multiply(base, factor_power, cap)
        reserve = multiply(reserve, factor_power, cap)

    minima = {
        "U_combined": None,
        "V_combined": None,
        "boundary_without_next_reserve": None,
        "boundary_with_next_reserve": None,
    }
    first_failures = {}
    first_negative_base = {}
    recurrence_checks = 0
    for order in range(maximum_r + 1):
        target = m_value + order + 5
        base_u = base.get((target + 1, target), 0)
        reserve_u = reserve.get((target + 1, target), 0)
        base_v = base.get((target + 1, target + 1), 0)
        reserve_v = reserve.get((target + 1, target + 1), 0)
        u_value = base_u + order * reserve_u
        v_value = base_v + order * reserve_v
        next_base = multiply(base, V_dict, cap)
        next_reserve = multiply(reserve, V_dict, cap)
        next_reserve_central = next_reserve.get((target + 1, target + 1), 0)
        boundary_without = 2 * u_value + v_value
        boundary_with = boundary_without + next_reserve_central
        next_central = (
            next_base.get((target + 1, target + 1), 0)
            + (order + 1) * next_reserve_central
        )
        assert boundary_with == next_central
        recurrence_checks += 1

        values = {
            "U_combined": u_value,
            "V_combined": v_value,
            "boundary_without_next_reserve": boundary_without,
            "boundary_with_next_reserve": boundary_with,
        }
        for label, value in values.items():
            candidate = {"r": order, "value": value}
            if minima[label] is None or value < minima[label]["value"]:
                minima[label] = candidate
            if value < 0 and label not in first_failures:
                first_failures[label] = candidate
        for label, value in (("U_base", base_u), ("V_base", base_v)):
            if value < 0 and label not in first_negative_base:
                first_negative_base[label] = {"r": order, "value": value}
        base, reserve = next_base, next_reserve

    return {
        "package": package,
        "parity": parity,
        **parameter_record,
        "maximum_r": maximum_r,
        "minima": minima,
        "first_failures": first_failures,
        "first_negative_base_only_predecessors": first_negative_base,
        "recurrence_checks": recurrence_checks,
    }


def unique(items):
    return sorted(set(items))


def main() -> None:
    group_lattice = unique(
        (c_value, m_value, x_value)
        for c_value in range(1, 5)
        for m_value in range(3, 9)
        for x_value in (0, 1, 2, 4, 2 * m_value)
    )
    bottom_lattice = unique(
        (m_value, x_value)
        for m_value in range(3, 11)
        for x_value in (0, 1, 2, 4, 2 * m_value)
    )
    group_hard = unique([
        (1, 12, 24),
        (15, 30, 60),
        (30, 3, 0),
        (8, 3, 0),
        (4, 7, 0),
    ])
    bottom_hard = unique([
        (30, 60),
        (3, 48),
        (20, 40),
        (12, 24),
        (3, 0),
    ])

    records = []
    for package, lattice, hard in (
        ("group", group_lattice, group_hard),
        ("bottom", bottom_lattice, bottom_hard),
    ):
        for parity in (0, 1):
            base_source, reserve_source = sources(package, parity)
            for parameters in lattice:
                records.append(audit_point(
                    package, parity, parameters, 12,
                    base_source, reserve_source,
                ))
            for parameters in hard:
                records.append(audit_point(
                    package, parity, parameters, 50,
                    base_source, reserve_source,
                ))
            print(package, parity, "done", flush=True)

    failures = []
    for record in records:
        for label, failure in record["first_failures"].items():
            failures.append({
                **{key: value for key, value in record.items() if key in (
                    "package", "parity", "c", "m", "x", "maximum_r"
                )},
                "inequality": label,
                **failure,
            })
    base_counterexamples = [
        record for record in records
        if record["first_negative_base_only_predecessors"]
    ]
    report = {
        "status": (
            "NO_FINITE_COUNTEREXAMPLE_TO_SHIFTED_PREDECESSORS"
            if not failures else "FINITE_COUNTEREXAMPLE_FOUND"
        ),
        "scope": {
            "small_group_lattice": (
                "1<=c<=4, 3<=m<=8, x in {0,1,2,4,2m}, 0<=r<=12"
            ),
            "small_bottom_lattice": (
                "3<=m<=10, x in {0,1,2,4,2m}, 0<=r<=12"
            ),
            "hard_group_points": [list(point) for point in group_hard],
            "hard_bottom_points": [list(point) for point in bottom_hard],
            "hard_maximum_r": 50,
            "parities": [0, 1],
        },
        "point_parity_case_count": len(records),
        "exact_recurrence_check_count": sum(
            record["recurrence_checks"] for record in records
        ),
        "tested_inequalities": [
            "U_r=F_r(N-1,N)>=0",
            "V_r=F_r(N-1,N-1)>=0",
            "2U_r+V_r>=0",
            "2U_r+V_r+R_(r+1)(N,N)>=0",
        ],
        "failure_count": len(failures),
        "first_failures": failures[:20],
        "base_only_predecessor_counterexample_count": len(base_counterexamples),
        "first_base_only_predecessor_counterexamples": base_counterexamples[:10],
        "records": records,
        "scope_warning": (
            "All arithmetic is exact, but a finite probe is not an all-order "
            "proof.  Positivity of U_r and V_r remains a conjectural sufficient "
            "strengthening of the boundary-triple inequality."
        ),
    }
    output = Path("affine_bridge_shifted_predecessor_probe_20260810.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        key: value for key, value in report.items()
        if key not in ("records", "first_base_only_predecessor_counterexamples")
    }, indent=2))


if __name__ == "__main__":
    main()
