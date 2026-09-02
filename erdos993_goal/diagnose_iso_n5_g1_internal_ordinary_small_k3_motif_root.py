#!/usr/bin/env python3
"""Exact low-motif diagnostic for all seven small-broom k=3 rows.

This expands the k-Newton coefficient at index three and substitutes exact
forest formulas through independence rank four. It is diagnostic only and
makes no sign claim.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k3_motif_diagnostic_root_20260830.json"
MARKER = "DIAGNOSE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K3_MOTIF_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def choose_polynomial(order, rank):
    product = sp.Integer(1)
    for offset in range(rank):
        product *= order - offset
    return sp.expand(product / sp.factorial(rank))


def forest_rows(prefix, maximum):
    order, edges, wedges, trees4 = sp.symbols(
        f"n{prefix} e{prefix} q{prefix} t{prefix}", integer=True, nonnegative=True
    )
    row = [sp.Integer(1), order]
    if maximum >= 2:
        row.append(sp.expand(choose_polynomial(order, 2) - edges))
    if maximum >= 3:
        row.append(sp.expand(
            choose_polynomial(order, 3) - (order - 2) * edges + wedges
        ))
    if maximum >= 4:
        row.append(sp.expand(
            choose_polynomial(order, 4)
            - edges * choose_polynomial(order - 2, 2)
            + wedges * (order - 4)
            + edges * (edges - 1) / 2
            - trees4
        ))
    return tuple(row), (order, edges, wedges, trees4)


def summarize(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    negative = [
        (powers, value) for powers, value in polynomial.terms() if value < 0
    ]
    negative.sort(key=lambda item: (item[1], item[0]))
    stream = "".join(
        f"{powers}:{value};" for powers, value in polynomial.terms()
    )
    return {
        "variables": [str(variable) for variable in variables],
        "expression": sp.sstr(polynomial.as_expr()),
        "monomials": len(polynomial.terms()),
        "negative_monomials": len(negative),
        "minimum_scalar": str(min(polynomial.coeffs())),
        "negative_terms": [
            {"powers": list(powers), "coefficient": str(value)}
            for powers, value in negative
        ],
        "ordered_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


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
        degree, coefficients = tensor_binomial(
            sp.expand(expression.subs(child_rules)), (k,)
        )
        assert degree == (6,)
        targets[ell] = coefficients[(3,)]

    araw = (sp.Integer(1), *sp.symbols("a1:7"))
    braw = (sp.Integer(1), *sp.symbols("b1:6"))
    craw = (sp.Integer(1), *sp.symbols("c1:6"))
    draw = (sp.Integer(1), *sp.symbols("d1:5"))
    arow, astats = forest_rows("a", 4)
    brow, bstats = forest_rows("b", 3)
    crow, cstats = forest_rows("c", 3)
    drow, dstats = forest_rows("d", 2)
    motif_rules = {}
    for raw, motif in ((araw, arow), (braw, brow), (craw, crow), (draw, drow)):
        motif_rules.update({raw[index]: value for index, value in enumerate(motif)})

    face_reports = []
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(araw, rank),
                rows["P"][rank]: at(araw, rank) + at(braw, rank - 1),
                rows["V"][rank]: at(araw, rank) + at(craw, rank - 1),
                rows["E"][rank]: (
                    at(araw, rank) + at(braw, rank - 1) + at(craw, rank - 1)
                    + epsilon * at(draw, rank - 2)
                ),
            })
        reduced = []
        for ell, target in sorted(targets.items()):
            value = sp.expand(target.subs(partition_rules).subs(motif_rules))
            reduced.append({"ell": ell, "motif_polynomial": summarize(value)})
        face_reports.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "rows": reduced,
        })

    report = {
        "marker": MARKER,
        "small_lengths": [1, 7],
        "k_index": 3,
        "motif_statistics": {
            "A": [str(value) for value in astats],
            "B": [str(value) for value in bstats],
            "C": [str(value) for value in cstats],
            "D": [str(value) for value in dstats],
        },
        "faces": face_reports,
        "status": "exact motif diagnostic; sign remains open",
        "scope": (
            "Only k-Newton index 3 for ell=1..7 in internal-spine/broom "
            "ordinary-parent g1."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "geometry": face["geometry"],
                "rows": [
                    {
                        "ell": row["ell"],
                        "monomials": row["motif_polynomial"]["monomials"],
                        "negative_monomials": row["motif_polynomial"]["negative_monomials"],
                        "minimum_scalar": row["motif_polynomial"]["minimum_scalar"],
                    }
                    for row in face["rows"]
                ],
            }
            for face in face_reports
        ],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
