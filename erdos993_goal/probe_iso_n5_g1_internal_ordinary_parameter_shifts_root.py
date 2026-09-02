#!/usr/bin/env python3
"""Newton-shift diagnostic for large internal-ordinary g1.

Starting from the exact 28-cell expansion at ell=8+h, recompute the Newton
coefficients after shifts h=s+t and k=r+u by the Vandermonde identity.  The
probe reports which shifted cells become literally coefficientwise
nonnegative in the parent rows.  This is a sign proof only for shifts whose
every nonzero cell is coefficientwise nonnegative; otherwise it is a search
diagnostic.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_parameter_shifts_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_PARAMETER_SHIFTS_ROOT"
SHIFTS = (0, 1, 2, 4, 8, 16, 32, 64, 128)


def shifted_coefficients(coefficients, h_shift, k_shift):
    answer = {}
    for a in range(7):
        for b in range(7):
            value = sp.expand(sum(
                sp.binomial(h_shift, i - a)
                * sp.binomial(k_shift, j - b)
                * coefficients.get((i, j), 0)
                for i in range(a, 7)
                for j in range(b, 7)
            ))
            if value != 0:
                answer[(a, b)] = value
    return answer


def main() -> None:
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    reduced = sp.expand(expression.subs(rules))
    _degrees, coefficients = tensor_binomial(reduced, (h, k))
    variables = tuple(
        symbol for name in ("E", "P", "V", "W") for symbol in rows[name][1:7]
    )

    rows_out = []
    for h_shift in SHIFTS:
        for k_shift in SHIFTS:
            shifted = shifted_coefficients(coefficients, h_shift, k_shift)
            unresolved = []
            minima = []
            for index, form in sorted(shifted.items()):
                polynomial = sp.Poly(form, *variables)
                scalar_coefficients = polynomial.coeffs()
                if all(value.is_nonnegative is True for value in scalar_coefficients):
                    minima.append(min(scalar_coefficients))
                else:
                    unresolved.append([index[0], index[1]])
            rows_out.append({
                "h_shift": h_shift,
                "k_shift": k_shift,
                "nonzero_cells": len(shifted),
                "coefficientwise_nonnegative_cells": len(shifted) - len(unresolved),
                "all_cells_coefficientwise_nonnegative": not unresolved,
                "minimum_nonnegative_cell_scalar": str(min(minima)) if minima else None,
                "unresolved_indices": unresolved,
            })

    report = {
        "marker": MARKER,
        "shift_grid": list(SHIFTS),
        "rows": rows_out,
        "fully_closed_shifts": [
            [row["h_shift"], row["k_shift"]]
            for row in rows_out if row["all_cells_coefficientwise_nonnegative"]
        ],
        "scope": "Exact coefficientwise shift diagnostic; unresolved rows make no sign claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    best = max(rows_out, key=lambda row: row["coefficientwise_nonnegative_cells"])
    print(json.dumps({
        "marker": MARKER,
        "fully_closed_shifts": report["fully_closed_shifts"],
        "best": best,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
