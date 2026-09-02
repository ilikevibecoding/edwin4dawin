#!/usr/bin/env python3
"""Test the Euler-transfer kernel for all affine monotonicity increments.

At the diagonal target (N,N), E=z*d/dz+w*d/dw satisfies

    [z^N w^N] F E(G) = [z^N w^N] (2N F-E(F))G.

Writing T^2 Q=(z+w)S and G=V^(r+1) turns the derivative-like reserve
into a bounded kernel H multiplied only by nonnegative outer factors.
"""

from __future__ import annotations

import argparse
import functools
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    m,
    q,
    w,
    x,
    z,
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


def euler(expression: sp.Expr) -> sp.Expr:
    return sp.expand(z * sp.diff(expression, z) + w * sp.diff(expression, w))


@functools.cache
def transfer_kernel(package: str, parity: int, coordinate: str) -> sp.Expr:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    reserve_divisor = z + w
    s_kernel = quotient(reserve_reduced, reserve_divisor)

    if package == "group":
        a = 2 * c + m + x - 3
        b = 2 * m + parity - 1
        target = m + r_symbol + 5 + int(coordinate == "m")
    else:
        a = m + x - 3
        b = 2 * m + parity - 2
        target = m + r_symbol + 3 + int(coordinate == "m")

    h_kernel = sp.expand(
        A * T * ell
        + 2 * target * A * T * s_kernel
        - a * T * euler(A) * s_kernel
        - b * A * euler(T) * s_kernel
        - A * T * euler(s_kernel)
    )
    return h_kernel


def audit_case(
    package: str,
    parity: int,
    coordinate: str,
    c_value: int,
    m_value: int,
    x_value: int,
    r_value: int,
    label: str,
) -> dict:
    h_numeric = sp.Poly(
        transfer_kernel(package, parity, coordinate).subs(
            {c: c_value, m: m_value, x: x_value, r_symbol: r_value}
        ),
        z,
        w,
    )
    coefficients = [int(value) for value in h_numeric.coeffs()]
    sparse = {
        (int(pz), int(pw), 0, 0, 0): int(value)
        for (pz, pw), value in h_numeric.terms()
    }
    reciprocal_sparse, bidegree = reciprocal(sparse)
    hcu = hcu_audit(reciprocal_sparse)
    paired = paired_cone_audit(reciprocal_sparse)
    return {
        "label": label,
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r_value,
        "term_count": len(coefficients),
        "bidegree": bidegree,
        "negative_coefficient_count": sum(value < 0 for value in coefficients),
        "zero_coefficient_count_inside_support": sum(value == 0 for value in coefficients),
        "minimum_coefficient": min(coefficients),
        "maximum_coefficient": max(coefficients),
        "reciprocal_hcu": hcu,
        "reciprocal_paired_cone": paired,
    }


def requested_cases():
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            yield "group", parity, coordinate, 1, 12, 24, 20, "all_family_local"
        for coordinate in ("x", "m"):
            yield "bottom", parity, coordinate, 0, 12, 24, 20, "all_family_local"
    yield "group", 0, "m", 1, 180, 360, 240, "first_two_boundary"
    yield "group", 0, "m", 1, 300, 600, 400, "farther_ray"
    yield "bottom", 1, "x", 0, 300, 600, 450, "farther_ray"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quick", action="store_true")
    args = parser.parse_args()
    records = []
    cases = list(requested_cases())
    if args.quick:
        cases = cases[:1]
    for case in cases:
        record = audit_case(*case)
        records.append(record)
        print(
            record["package"], record["parity"], record["coordinate"],
            record["label"], record["negative_coefficient_count"],
            record["minimum_coefficient"], flush=True,
        )
    report = {
        "status": (
            "PASS_FINITE_COEFFICIENTWISE_EULER_TRANSFER"
            if not any(record["negative_coefficient_count"] for record in records)
            else "FAIL"
        ),
        "identity": (
            "[z^Nw^N]A^aT^b(V^(r+1)L+(r+1)V^rT^2Q)="
            "[z^Nw^N]A^(a-1)T^(b-1)V^(r+1)H, with "
            "H=ATL+2NATS-aT E(A)S-bA E(T)S-AT E(S), "
            "S=T^2Q/(z+w)."
        ),
        "case_count": len(records),
        "failure_count": sum(
            bool(record["negative_coefficient_count"]) for record in records
        ),
        "records": records,
        "warning": "The identity is exact; coefficientwise signs are finite evidence only.",
    }
    output_name = (
        "path_isolate_p4_affine_parameter_monotonicity_euler_transfer_"
        f"{'quick_' if args.quick else ''}probe_20260802.json"
    )
    Path(output_name).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
