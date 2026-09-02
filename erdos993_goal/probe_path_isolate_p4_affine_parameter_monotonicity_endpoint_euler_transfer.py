#!/usr/bin/env python3
"""Test weighted Euler-transfer kernels at y=1/2 and y=3/2."""

from __future__ import annotations

import argparse
import functools
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A, T, V, m, q, w, x, z,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    hcu_audit,
    paired_cone_audit,
    reciprocal,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


r_symbol = sp.symbols("r", integer=True, nonnegative=True)


def weighted_euler(expression: sp.Expr, lam: sp.Rational) -> sp.Expr:
    return sp.expand(
        z * sp.diff(expression, z) + sp.diff(expression, w) * w / lam
    )


@functools.cache
def reduced_components(package: str, parity: int, coordinate: str):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    s_kernel = quotient(reserve_reduced, z + w)
    return ell, s_kernel


@functools.cache
def transfer_kernel(
    package: str, parity: int, coordinate: str, numerator: int, denominator: int
) -> sp.Expr:
    lam = sp.Rational(numerator, denominator)
    ell, s_kernel = reduced_components(package, parity, coordinate)
    if package == "group":
        a = 2 * c + m + x - 3
        b = 2 * m + parity - 1
        target = m + r_symbol + 5 + int(coordinate == "m")
    else:
        a = m + x - 3
        b = 2 * m + parity - 2
        target = m + r_symbol + 3 + int(coordinate == "m")
    return sp.expand(
        A * T * ell
        + target * (1 + 1 / lam) * A * T * s_kernel
        - a * T * weighted_euler(A, lam) * s_kernel
        - b * A * weighted_euler(T, lam) * s_kernel
        - A * T * weighted_euler(s_kernel, lam)
    )


def audit_case(
    package: str, parity: int, coordinate: str, c_value: int,
    m_value: int, x_value: int, r_value: int, label: str,
) -> dict:
    endpoints = []
    for numerator, denominator in ((1, 2), (2, 3), (3, 2)):
        numeric = sp.Poly(
            transfer_kernel(
                package, parity, coordinate, numerator, denominator
            ).subs({c: c_value, m: m_value, x: x_value, r_symbol: r_value}),
            z, w,
        )
        coefficients = numeric.coeffs()
        endpoint = {
                "lambda": f"{numerator}/{denominator}",
                "term_count": len(coefficients),
                "negative_coefficient_count": len(
                    [value for value in coefficients if value < 0]
                ),
                "minimum_coefficient": str(min(coefficients)),
                "maximum_coefficient": str(max(coefficients)),
            }
        if r_value <= 30:
            lam = sp.Rational(numerator, denominator)
            u_lam = 1 + z + lam * w
            full = sp.expand(u_lam ** (r_value + 1) * numeric.as_expr())
            symmetric = sp.Poly(
                sp.expand(full + full.xreplace({z: w, w: z})), z, w
            )
            common_denominator = functools.reduce(
                sp.ilcm, (int(sp.denom(value)) for value in symmetric.coeffs()), 1
            )
            sparse = {
                (int(pz), int(pw), 0, 0, 0): int(value * common_denominator)
                for (pz, pw), value in symmetric.terms()
            }
            reciprocal_sparse, _ = reciprocal(sparse)
            endpoint["symmetrized_full_reciprocal_hcu"] = hcu_audit(
                reciprocal_sparse
            )
            endpoint["symmetrized_full_reciprocal_paired_cone"] = (
                paired_cone_audit(reciprocal_sparse)
            )
        endpoints.append(endpoint)
    return {
        "label": label,
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r_value,
        "endpoints": endpoints,
    }


def cases():
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            yield "group", parity, coordinate, 1, 12, 24, 20, "local"
        for coordinate in ("x", "m"):
            yield "bottom", parity, coordinate, 0, 12, 24, 20, "local"
    yield "group", 0, "m", 1, 180, 360, 240, "two_boundary"
    yield "bottom", 1, "x", 0, 300, 600, 450, "farther"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quick", action="store_true")
    args = parser.parse_args()
    requested = list(cases())
    if args.quick:
        requested = requested[:1]
    records = []
    for case in requested:
        record = audit_case(*case)
        records.append(record)
        print(
            record["package"], record["parity"], record["coordinate"],
            [(item["lambda"], item["negative_coefficient_count"])
             for item in record["endpoints"]],
            flush=True,
        )
    failures = [
        (record, endpoint)
        for record in records
        for endpoint in record["endpoints"]
        if endpoint["negative_coefficient_count"]
    ]
    report = {
        "status": "PASS_FINITE_ENDPOINT_TRANSFER" if not failures else "FAIL",
        "case_count": len(records),
        "endpoint_failure_count": len(failures),
        "records": records,
        "warning": "Exact transfer identity; finite raw coefficient signs only.",
    }
    output = (
        "path_isolate_p4_affine_parameter_monotonicity_endpoint_euler_transfer_"
        f"{'quick_' if args.quick else ''}probe_20260802.json"
    )
    Path(output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
