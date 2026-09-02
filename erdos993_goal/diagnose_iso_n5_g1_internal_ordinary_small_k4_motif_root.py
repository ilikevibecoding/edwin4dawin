#!/usr/bin/env python3
"""Inspect exact forest-motif forms of the seven small-broom k=4 rows."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k4_motif_diagnostic_root_20260830.json"
MARKER = "DIAGNOSTIC_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K4_MOTIF_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def main() -> None:
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        child_rules = {}
        for rank in range(1, 7):
            child_rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        _degree, coefficients = tensor_binomial(
            sp.expand(expression.subs(child_rules)), (k,)
        )
        targets[ell] = coefficients[(4,)]

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, m, q, nb, eb, nc, ec, nd = sp.symbols(
        "n m q nb eb nc ec nd", integer=True, nonnegative=True
    )
    motif_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - m,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * m + q,
        b[1]: nb,
        b[2]: nb * (nb - 1) / 2 - eb,
        c[1]: nc,
        c[2]: nc * (nc - 1) / 2 - ec,
        d[1]: nd,
    }
    motif_variables = (n, m, q, nb, eb, nc, ec, nd)
    faces = []
    for epsilon in (0, 1):
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        rows_out = []
        for ell, target in sorted(targets.items()):
            reduced = sp.expand(target.subs(rules).subs(motif_rules))
            extra = sorted(reduced.free_symbols - set(motif_variables), key=str)
            polynomial = sp.Poly(reduced, *motif_variables, *extra)
            rows_out.append({
                "ell": ell,
                "extra_symbols": [str(symbol) for symbol in extra],
                "monomials": len(polynomial.terms()),
                "expression": sp.sstr(reduced),
                "ordered_stream_sha256": hashlib.sha256("".join(
                    f"{powers}:{value};" for powers, value in polynomial.terms()
                ).encode()).hexdigest().upper(),
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "rows": rows_out,
        })
    report = {
        "marker": MARKER,
        "faces": faces,
        "status": "exact motif diagnostic; no sign asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "epsilon": face["epsilon"],
                "rows": [
                    {
                        "ell": row["ell"],
                        "extra_symbols": row["extra_symbols"],
                        "monomials": row["monomials"],
                    }
                    for row in face["rows"]
                ],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
