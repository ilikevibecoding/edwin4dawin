#!/usr/bin/env python3
"""Exact stable broom Newton reduction for internal-spine ordinary g2."""

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
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_broom_parameters_exact_rank5_g2_alt_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BROOM_PARAMETERS_RANK5_G2_ALT"


def stable_forms():
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    rules = {}
    for rank in range(1, 7):
        u = isolate_times_path(k, ell - 1, rank)
        x = sp.expand(u + path_coefficient(ell - 2, rank - 1))
        z = isolate_times_path(k, ell - 2, rank)
        y = sp.expand(z + path_coefficient(ell - 3, rank - 1))
        rules.update({rows["X"][rank]: x, rows["U"][rank]: u,
                      rows["Y"][rank]: y, rows["Z"][rank]: z})
    parameterized = sp.expand(expression.subs(rules))
    degrees, coefficients = tensor_binomial(parameterized, (h, k))
    return degrees, coefficients, rows


def main():
    degrees, coefficients, _rows = stable_forms()
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
        "stable_domain": "ell=8+h, h,k>=0 integers",
        "degrees_h_k": list(degrees),
        "coefficient_cells": len(coefficients),
        "nonzero_cells": len(forms),
        "forms_with_negative_scalars": sum(row["negative_scalar_coefficients"] > 0 for row in forms),
        "form_index_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        "forms": forms,
        "scope": "Exact parameter reduction only; parent-form signs are not asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "degrees": list(degrees), "nonzero": len(forms),
        "negative_scalar_forms": report["forms_with_negative_scalars"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
