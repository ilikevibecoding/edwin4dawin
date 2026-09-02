#!/usr/bin/env python3
"""Diagnose the exact adjacent-parent branch factorization for k=0.

When the ordinary parent p and mark v are adjacent, deleting the edge pv
separates the parent component into a p-side rooted branch, a v-side rooted
branch, and unrelated components.  Thus, with convolution denoted by ``*``,

    W = R*A*B,
    P = W + x R*A*B0,
    V = W + x R*A0*B,
    E = W + x R*A*B0 + x R*A0*B.

This script substitutes that stronger exact structure into the five unresolved
short-broom k=0 targets and records whether progressively specialized forms
are literally coefficientwise nonnegative.  It is a route diagnostic only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_adjacent_factorization_diagnostic_root_20260830.json"
MARKER = "DIAGNOSTIC_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ADJACENT_FACTORIZATION_ROOT"


def add(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def shift(row):
    return tuple(sp.Integer(0) if index == 0 else row[index - 1] for index in range(7))


def symbolic_row(prefix):
    return (sp.Integer(1), *sp.symbols(f"{prefix}1:7"))


def polynomial_summary(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = (
        sp.Poly(sp.expand(expression), *variables)
        if variables else sp.Poly(sp.expand(expression), sp.Symbol("_constant_dummy"))
    )
    coefficients = polynomial.coeffs()
    stream = "".join(
        f"{powers}:{coefficient};" for powers, coefficient in polynomial.terms()
    )
    return {
        "variables": len(variables),
        "monomials": len(polynomial.terms()),
        "negative_coefficients": sum(
            coefficient.is_negative is True for coefficient in coefficients
        ),
        "minimum_coefficient": str(min(coefficients)),
        "term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def main() -> None:
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    for ell in (1, 2, 3):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        degrees, coefficients = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
        assert degrees == (6,)
        targets[ell] = coefficients[(0,)]

    r = symbolic_row("r")
    a = symbolic_row("a")
    a0 = symbolic_row("c")
    b = symbolic_row("b")
    b0 = symbolic_row("d")
    w = convolve(convolve(r, a), b)
    rb0 = convolve(convolve(r, a), b0)
    ra0 = convolve(convolve(r, a0), b)
    p = add(w, shift(rb0))
    v = add(w, shift(ra0))
    e = add(add(w, shift(rb0)), shift(ra0))
    parent_rules = {}
    for generic, actual in zip(
        (rows["E"], rows["P"], rows["V"], rows["W"]),
        (e, p, v, w),
    ):
        parent_rules.update(dict(zip(generic[1:7], actual[1:7])))

    unit = (sp.Integer(1),) + (sp.Integer(0),) * 6
    specializations = {
        "full_factorization": {},
        "no_unrelated_components": dict(zip(r, unit)),
        "no_p_side_branches": {
            **dict(zip(r, unit)), **dict(zip(a, unit)), **dict(zip(a0, unit)),
        },
        "bare_parent_edge": {
            **dict(zip(r, unit)), **dict(zip(a, unit)), **dict(zip(a0, unit)),
            **dict(zip(b, unit)), **dict(zip(b0, unit)),
        },
    }
    reports = []
    for ell, target in targets.items():
        factored = sp.expand(target.subs(parent_rules))
        reports.append({
            "ell": ell,
            "specializations": {
                name: polynomial_summary(sp.expand(factored.subs(ruleset)))
                for name, ruleset in specializations.items()
            },
        })

    report = {
        "marker": MARKER,
        "geometry": "adjacent p-v parent edge with exact separated branch factors",
        "rows": reports,
        "status": "exact structural diagnostic; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
