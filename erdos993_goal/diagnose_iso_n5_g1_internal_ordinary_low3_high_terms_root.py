#!/usr/bin/env python3
"""List high-rank coefficient signs after the low-motif substitution for h+k<=1."""

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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low3_high_terms_diagnostic_root_20260830.json"
MARKER = "DIAGNOSE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW3_HIGH_TERMS_ROOT"
CELLS = ((0, 0), (0, 1), (1, 0))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def monomial_name(variables, powers):
    return "*".join(
        str(variable) if power == 1 else f"{variable}^{power}"
        for variable, power in zip(variables, powers) if power
    ) or "1"


def main() -> None:
    expression, rows = ordinary_expression()
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
    degrees, newton_cells = tensor_binomial(
        sp.expand(expression.subs(child_rules)), (h, k)
    )
    assert degrees == (6, 6)

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    ea, qa, eb, ec, ed = sp.symbols("ea qa eb ec ed", nonnegative=True)
    low_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - ea,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * ea + qa,
        b[1]: nb,
        b[2]: nb * (nb - 1) / 2 - eb,
        c[1]: nc,
        c[2]: nc * (nc - 1) / 2 - ec,
        d[1]: nd,
        d[2]: nd * (nd - 1) / 2 - ed,
    }
    remaining = tuple((*a[4:], *b[3:], *c[3:], *d[3:]))
    base = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    variables = (*base, *remaining)

    faces = []
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
        cell_rows = []
        for index in CELLS:
            polynomial = sp.Poly(
                sp.expand(newton_cells[index].subs(partition_rules).subs(low_rules)),
                *variables,
            )
            positive_high = []
            negative_high = []
            for powers, coefficient in polynomial.terms():
                if not any(powers[len(base):]):
                    continue
                row = {
                    "coefficient": str(coefficient),
                    "monomial": monomial_name(variables, powers),
                    "powers": list(powers),
                }
                (positive_high if coefficient > 0 else negative_high).append(row)
            cell_rows.append({
                "h_index": index[0],
                "k_index": index[1],
                "positive_high_monomials": positive_high,
                "negative_high_monomials": negative_high,
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cell_rows,
        })

    report = {
        "marker": MARKER,
        "faces": faces,
        "status": "exact sign/support diagnostic; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "geometry": face["geometry"],
                "cells": [
                    {
                        "index": [cell["h_index"], cell["k_index"]],
                        "positive_high": len(cell["positive_high_monomials"]),
                        "negative_high": len(cell["negative_high_monomials"]),
                        "positive_terms": cell["positive_high_monomials"],
                    }
                    for cell in face["cells"]
                ],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
