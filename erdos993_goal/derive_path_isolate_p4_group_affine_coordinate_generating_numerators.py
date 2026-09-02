#!/usr/bin/env python3
"""Derive finite coordinate numerators after deleting the proved x^2 kernel."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_p4_group_coordinate_generating_numerators import (
    A,
    T,
    V,
    c,
    coefficient_records,
    m,
    q,
    recurrence_coefficients,
    split_sparse,
    x,
)


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
        full_kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        kernel = full_kernel.coeff_monomial(1) + x * full_kernel.coeff_monomial(x)
        n0 = q * T**3 * kernel
        n1 = slope * A - T**3 * kernel * V
        recurrences = {
            "x": recurrence_coefficients(
                n0,
                n1,
                n0.subs(x, x + 1),
                n1.subs(x, x + 1),
                A,
                sp.Integer(1),
                (1, 3, 2),
            ),
            "c": recurrence_coefficients(
                n0,
                n1,
                n0.subs(c, c + 1),
                n1.subs(c, c + 1),
                A**2,
                sp.Integer(1),
                (1, 6, 13, 12, 4),
            ),
            "m": recurrence_coefficients(
                n0,
                n1,
                n0.subs(m, m + 1),
                n1.subs(m, m + 1),
                A * T**2,
                q,
                (1, 6, 13, 12, 4),
            ),
        }
        parity_item = {"parity_epsilon": parity, "recurrences": {}}
        for coordinate, expressions in recurrences.items():
            print(parity, coordinate, flush=True)
            parity_item["recurrences"][coordinate] = {
                "maximum_numerator_order": len(expressions) - 1,
                "coefficients": coefficient_records(expressions),
            }
        parity_records.append(parity_item)
    report = {
        "status": "PASS_PATH_ISOLATE_P4_GROUP_AFFINE_COORDINATE_NUMERATORS",
        "scope": "K_aff=[x^0]K+x[x^1]K; the x^2 part is excluded",
        "parities": parity_records,
    }
    Path(
        "path_isolate_p4_group_affine_coordinate_generating_numerators_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
