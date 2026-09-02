#!/usr/bin/env python3
"""Exact global-payment diagnostic for internal-ordinary large-broom g1.

The direct tensor-Newton cone tries to certify every coefficient of g1.
That is unnecessarily strong: for the composite marked forest C, the
universal theorem already gives S(C)=M5(C)+3*C5(C)>=0 as a whole for every
fixed pair (h,k).  Likewise N4(D)>=0 for the deleted composite forest D.

This probe subtracts those global payments *before* the h,k Newton
expansion and measures exact coefficientwise positivity of the remaining
parent forms on the adjacent and nonadjacent mark-inclusion faces.  It is a
diagnostic only; a row is claimed only when every displayed scalar
coefficient is nonnegative.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_global_payment_reduction_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_GLOBAL_PAYMENT_REDUCTION_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def main() -> None:
    g1, rows = ordinary_expression()
    x, u, y, z = (rows[name] for name in ("X", "U", "Y", "Z"))
    e, p, v, w = (rows[name] for name in ("E", "P", "V", "W"))
    crows = (
        convolve(x, e),
        convolve(u, e),
        convolve(x, v),
        convolve(u, v),
    )
    drows = (
        convolve(y, p),
        convolve(z, p),
        convolve(y, w),
        convolve(z, w),
    )
    constants = {
        row[0]: 1 for row in (x, u, y, z, e, p, v, w)
    }
    def row_difference(full, deleted):
        return tuple(sp.expand(left - right) for left, right in zip(full, deleted))

    def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
        product = convolve(child_full, parent_full)
        forbidden = convolve(
            row_difference(child_full, child_deleted),
            row_difference(parent_full, parent_deleted),
        )
        return tuple(
            sp.expand(value - removed)
            for value, removed in zip(product, forbidden)
        )

    bridge_rows = (
        bridge_row(x, y, e, p),
        bridge_row(u, z, e, p),
        bridge_row(x, y, v, w),
        bridge_row(u, z, v, w),
    )
    c_forms = compact_forms(crows)
    bridge_forms = compact_forms(bridge_rows)
    s_c = sp.expand(c_forms["S_C"].subs(constants))
    n4_d = sp.expand(compact_forms(drows)["N4_C"].subs(constants))
    s_bridge = sp.expand(bridge_forms["S_C"].subs(constants))
    c5_bridge = sp.expand(bridge_forms["C5_C"].subs(constants))
    n4_bridge = sp.expand(bridge_forms["N4_C"].subs(constants))

    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    child_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        child_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })

    variants = {
        "raw_g1": g1,
        "after_S_C": sp.expand(g1 - s_c),
        "after_S_C_and_N4_D": sp.expand(g1 - s_c - n4_d),
        "after_S_bridge": sp.expand(g1 - s_bridge),
        "after_C5_bridge": sp.expand(g1 - c5_bridge),
        "after_N4_bridge": sp.expand(g1 - n4_bridge),
        "after_S_bridge_and_N4_D": sp.expand(g1 - s_bridge - n4_d),
        "after_S_C_and_S_bridge": sp.expand(g1 - s_c - s_bridge),
    }
    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))

    reports = []
    for variant_name, expression in variants.items():
        parameterized = sp.expand(expression.subs(child_rules))
        degrees, coefficients = tensor_binomial(parameterized, (h, k))
        assert all(0 <= degree <= 6 for degree in degrees)
        nonzero_cells = sum(value != 0 for value in coefficients.values())
        for epsilon in (0, 1):
            partition_rules = {}
            for rank in range(1, 7):
                partition_rules.update({
                    rows["W"][rank]: at(a, rank),
                    rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                    rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                    rows["E"][rank]: (
                        at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                        + epsilon * at(d, rank - 2)
                    ),
                })
            variables = tuple((*a[1:], *b[1:], *c[1:], *(d[1:] if epsilon else ())))
            rows_report = []
            for index, form in sorted(coefficients.items()):
                if form == 0:
                    continue
                transformed = sp.expand(form.subs(partition_rules))
                polynomial = sp.Poly(transformed, *variables)
                values = polynomial.coeffs()
                stream = "".join(
                    f"{powers}:{value};" for powers, value in polynomial.terms()
                )
                rows_report.append({
                    "h_index": index[0],
                    "k_index": index[1],
                    "monomials": len(polynomial.terms()),
                    "negative_scalars": sum(
                        value.is_negative is True for value in values
                    ),
                    "minimum_scalar": str(min(values)),
                    "ordered_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                })
            exact = sum(row["negative_scalars"] == 0 for row in rows_report)
            reports.append({
                "variant": variant_name,
                "degrees_h_k": list(degrees),
                "nonzero_cells": nonzero_cells,
                "epsilon": epsilon,
                "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
                "exact_coefficientwise_cells": exact,
                "unresolved_cells": len(rows_report) - exact,
                "unresolved_indices": [
                    [row["h_index"], row["k_index"]]
                    for row in rows_report if row["negative_scalars"]
                ],
                "rows": rows_report,
            })

    report = {
        "marker": MARKER,
        "global_payments": {
            "S_C": "universal S(C)=M5(C)+3*C5(C)>=0 for every marked forest C",
            "N4_D": "universal rank-four nested form N4(D)>=0 for every marked forest D",
        },
        "reports": reports,
        "status": "exact diagnostic; only coefficientwise rows are certified",
        "scope": (
            "Internal-spine ordinary-parent g1 with ell>=8 only.  A global "
            "payment is useful only if its remaining residual is proved "
            "nonnegative; unresolved rows make no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "reports": [
            {
                key: row[key]
                for key in (
                    "variant", "geometry", "exact_coefficientwise_cells",
                    "unresolved_cells", "unresolved_indices",
                )
            }
            for row in reports
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
