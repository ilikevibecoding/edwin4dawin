#!/usr/bin/env python3
"""Exact large-broom parameter reduction for internal ordinary-parent g1.

Substitute the one-ended broom rows with ``ell=8+h`` into the exact ordinary
factor form, then expand in the tensor Newton basis ``C(h,i)C(k,j)``.  The
remaining coefficients are forms in the four parent-side marked-forest rows
``(E,P,V,W)``.  This is a finite algebraic reduction, not a sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    form_summary,
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_broom_parameters_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_BROOM_PARAMETERS_ROOT"


def main() -> None:
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    substitutions = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        substitutions.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    parameterized = sp.expand(expression.subs(substitutions))
    degrees, coefficients = tensor_binomial(parameterized, (h, k))
    forms = [
        {"h_index": index[0], "k_index": index[1], **form_summary(value)}
        for index, value in sorted(coefficients.items()) if value != 0
    ]
    stream = "".join(
        f"{row['h_index']},{row['k_index']}:{row['ordered_term_stream_sha256']};"
        for row in forms
    )
    report = {
        "marker": MARKER,
        "stable_domain": "ell=8+h with h>=0 and collision-leaf count k>=0",
        "parent_rows": "(E,P,V,W)=(I(F),I(F-p),I(F-v),I(F-{p,v}))",
        "tensor_binomial_reduction": {
            "degrees_h_k": list(degrees),
            "coefficient_cells": len(coefficients),
            "nonzero_cells": len(forms),
            "forms_with_negative_scalars": sum(
                row["negative_scalar_coefficients"] > 0 for row in forms
            ),
            "form_index_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
            "forms": forms,
        },
        "status": "exact finite parent-form reduction; signs remain open",
        "scope": (
            "Internal-spine ordinary-parent g1 for ell>=8 only.  Small ell, "
            "the parent-form signs, other g1/g2 modes, all N5, and Erdos Problem "
            "993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "coefficient_cells": len(coefficients),
        "nonzero_cells": len(forms),
        "forms_with_negative_scalars": report["tensor_binomial_reduction"]["forms_with_negative_scalars"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
