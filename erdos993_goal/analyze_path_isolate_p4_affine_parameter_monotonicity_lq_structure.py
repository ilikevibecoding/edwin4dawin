#!/usr/bin/env python3
"""Audit exact factor and low-order differential structure of reduced L,Q."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, q, z, w
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def factor_record(expression: sp.Expr) -> dict:
    coefficient, factors = sp.factor_list(expression, z, w)
    return {
        "coefficient": str(coefficient),
        "factors": [
            {"factor": str(factor), "multiplicity": int(multiplicity)}
            for factor, multiplicity in factors
        ],
    }


def audit(package: str, parity: int, coordinate: str) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    q_kernel = quotient(reserve_reduced, T**2)
    ell_poly = sp.Poly(ell, z, w)
    q_poly = sp.Poly(q_kernel, z, w)
    gcd = sp.gcd(ell_poly, q_poly).as_expr()

    # Test the smallest symmetric Euler-operator ansatz
    # L=(a0+a1(z+w)+a2 zw)Q + (b0+b1(z+w))E Q + c E^2 Q.
    # Coefficients may depend on the integer parameters and are solved over
    # their rational-function field by SymPy.
    s = z + w
    e_q = sp.expand(z * sp.diff(q_kernel, z) + w * sp.diff(q_kernel, w))
    e2_q = sp.expand(z * sp.diff(e_q, z) + w * sp.diff(e_q, w))
    basis = [q_kernel, s * q_kernel, q * q_kernel, e_q, s * e_q, e2_q]
    monomials = sorted(
        set().union(
            *(sp.Poly(item, z, w).monoms() for item in basis),
            ell_poly.monoms(),
        )
    )
    matrix = sp.Matrix(
        [
            [sp.Poly(item, z, w).coeff_monomial(monomial) for item in basis]
            for monomial in monomials
        ]
    )
    rhs = sp.Matrix([ell_poly.coeff_monomial(monomial) for monomial in monomials])
    try:
        solution = sp.linsolve((matrix, rhs))
        solution_text = str(solution)
        euler_ansatz_succeeds = solution != sp.EmptySet
    except Exception as error:  # pragma: no cover - diagnostic only
        solution_text = f"ERROR: {error}"
        euler_ansatz_succeeds = False

    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "ell_term_count": len(ell_poly.terms()),
        "q_term_count": len(q_poly.terms()),
        "gcd": factor_record(gcd),
        "ell_factorization": factor_record(ell),
        "q_factorization": factor_record(q_kernel),
        "euler_ansatz_succeeds": euler_ansatz_succeeds,
        "euler_ansatz_solution": solution_text,
    }


def main() -> None:
    records = []
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            record = audit("group", parity, coordinate)
            records.append(record)
            print("group", parity, coordinate, record["euler_ansatz_succeeds"], flush=True)
        for coordinate in ("x", "m"):
            record = audit("bottom", parity, coordinate)
            records.append(record)
            print("bottom", parity, coordinate, record["euler_ansatz_succeeds"], flush=True)
    report = {"status": "AUDIT", "records": records}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_lq_structure_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
