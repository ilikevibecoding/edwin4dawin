#!/usr/bin/env python3
"""Derive finite numerator kernels for the group coordinate recurrences.

The Newton generating integrand is

    T^3 K/(1-tU) + J R t/(1-tU)^2,

where R=A/q, U=V/q, q=zw.  Multiplication by q gives numerator

    N~=q*T^3*K + t*(J*A-T^3*K*V)

over q*(1-tU)^2.  This script forms the strong x, c, and m recurrence
numerators, cancels the common q after target alignment, and records the
resulting finite kernel lists.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w, c, m, x, t = sp.symbols("z w c m x t")
q = z * w
A = (1 + z) * (1 + w)
T = z * (1 + z) + w * (1 + w)
V = 1 + z + w
MX = 1 + 3 * t + 2 * t**2
M4 = 1 + 6 * t + 13 * t**2 + 12 * t**3 + 4 * t**4


def canonical_hash(poly: sp.Poly) -> str:
    payload = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def coefficient_records(expressions: list[sp.Expr]) -> list[dict]:
    result = []
    generators = (z, w, c, m, x)
    for order, raw in enumerate(expressions):
        raw_poly = sp.Poly(raw, *generators)
        normalized_terms = {}
        if order == 0:
            for monomial, coefficient in raw_poly.terms():
                assert monomial[0] >= 1 and monomial[1] >= 1
                normalized_terms[
                    (monomial[0] - 1, monomial[1] - 1, *monomial[2:])
                ] = coefficient
            normalization = "B_0/(zw)"
        else:
            for monomial, coefficient in raw_poly.terms():
                normalized_terms[
                    (
                        monomial[0] + order - 1,
                        monomial[1] + order - 1,
                        *monomial[2:],
                    )
                ] = coefficient
            normalization = f"(zw)^{order - 1}*B_{order}"
        poly = sp.Poly.from_dict(normalized_terms, generators)
        terms = poly.terms()
        result.append(
            {
                "numerator_order": order,
                "normalization": normalization,
                "term_count_after_normalization": len(terms),
                "degrees_z_w_c_m_x": list(map(int, poly.degree_list())),
                "ordinary_negative_term_count": sum(
                    1 for _, coefficient in terms if coefficient < 0
                ),
                "sha256": canonical_hash(poly),
                "terms": [
                    {
                        "monomial_z_w_c_m_x": list(monomial),
                        "coefficient": str(coefficient),
                    }
                    for monomial, coefficient in terms
                ],
            }
        )
    return result


def recurrence_coefficients(
    n0: sp.Expr,
    n1: sp.Expr,
    new0: sp.Expr,
    new1: sp.Expr,
    left_factor: sp.Expr,
    old_factor: sp.Expr,
    multiplier: tuple[int, ...],
) -> list[sp.Expr]:
    result = []
    for order in range(len(multiplier) + 1):
        value = sp.Integer(0)
        if order == 0:
            value += left_factor * new0
        elif order == 1:
            value += left_factor * new1
        if order < len(multiplier):
            value -= old_factor * multiplier[order] * n0
        if 0 <= order - 1 < len(multiplier):
            value -= old_factor * multiplier[order - 1] * n1
        result.append(value)
    return result


def main() -> None:
    parity_records = []
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.cancel((constant - slope) / T**3)
        assert sp.expand(constant - slope - T**3 * kernel) == 0
        n0 = q * T**3 * kernel
        n1 = slope * A - T**3 * kernel * V
        recurrences = {
            "x": (
                recurrence_coefficients(
                    n0,
                    n1,
                    n0.subs(x, x + 1),
                    n1.subs(x, x + 1),
                    A,
                    sp.Integer(1),
                    (1, 3, 2),
                ),
                "A*N~(x+1)-(1+t)(1+2t)N~(x)",
            ),
            "c": (
                recurrence_coefficients(
                    n0,
                    n1,
                    n0.subs(c, c + 1),
                    n1.subs(c, c + 1),
                    A**2,
                    sp.Integer(1),
                    (1, 6, 13, 12, 4),
                ),
                "A^2*N~(c+1)-(1+t)^2(1+2t)^2*N~(c)",
            ),
            "m": (
                recurrence_coefficients(
                    n0,
                    n1,
                    n0.subs(m, m + 1),
                    n1.subs(m, m + 1),
                    A * T**2,
                    q,
                    (1, 6, 13, 12, 4),
                ),
                "A*T^2*N~(m+1)-zw*(1+t)^2(1+2t)^2*N~(m)",
            ),
        }
        parity_item = {"parity_epsilon": parity, "recurrences": {}}
        for coordinate, (expressions, identity) in recurrences.items():
            print(f"parity={parity} coordinate={coordinate}", flush=True)
            parity_item["recurrences"][coordinate] = {
                "identity": identity,
                "maximum_numerator_order": len(expressions) - 1,
                "coefficients": coefficient_records(expressions),
            }
        parity_records.append(parity_item)

    report = {
        "status": "PASS_PATH_ISOLATE_P4_GROUP_COORDINATE_GENERATING_NUMERATORS",
        "definitions": {
            "q": "zw",
            "A": "(1+z)(1+w)",
            "V": "1+z+w",
            "T": "z(1+z)+w(1+w)",
            "N_tilde": "q*T^3*K+t*(J*A-T^3*K*V)",
        },
        "common_denominator": "q*(1-t*V/q)^2",
        "constant_numerator_kernels_divisible_by_zw": True,
        "parities": parity_records,
        "order_consequence": (
            "At Newton order k, coordinate residuals are positive-weight "
            "sums of (k-j+1)*C_j*V^(k-j), where C_0=B_0/(zw) and "
            "C_j=(zw)^(j-1)B_j for j>=1 are the finite normalized "
            "kernels recorded here."
        ),
    }
    Path("path_isolate_p4_group_coordinate_generating_numerators_20260801.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    # Do not dump the multi-megabyte term payload to the terminal.
    print(
        json.dumps(
            {
                "status": report["status"],
                "record_counts": {
                    str(item["parity_epsilon"]): {
                        coordinate: len(data["coefficients"])
                        for coordinate, data in item["recurrences"].items()
                    }
                    for item in parity_records
                },
                "output": "path_isolate_p4_group_coordinate_generating_numerators_20260801.json",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
