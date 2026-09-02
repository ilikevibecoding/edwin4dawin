#!/usr/bin/env python3
"""Exact mode-transfer diagnostic for the short internal k=0 cells.

After the deepest support is deleted, the child broom A and parent forest F
are disconnected.  Keeping A while deleting the ordinary parent p gives a
genuine singleton-ordinary configuration.  The internal cell instead also
deletes A's attachment vertex a in its D rows.  This script computes the
exact difference

    internal_short_cell - singleton_ordinary(A disjoint union F, p)

for ell=1,2,3 on both parent-mark faces and tests literal coefficient signs.
No sign inference is made when the difference has mixed coefficients.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_singleton_transfer_diagnostic_root_20260830.json"
MARKER = "DIAGNOSTIC_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_SINGLETON_TRANSFER_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def summary(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    stream = "".join(
        f"{powers}:{coefficient};" for powers, coefficient in polynomial.terms()
    )
    return {
        "monomials": len(polynomial.terms()),
        "negative_coefficients": sum(
            coefficient.is_negative is True for coefficient in coefficients
        ),
        "positive_coefficients": sum(
            coefficient.is_positive is True for coefficient in coefficients
        ),
        "minimum_coefficient": str(min(coefficients)),
        "term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def singleton_expression(rows):
    generic_c, generic_d, raw_g1, _raw_g2 = raw_coefficients()
    crows = (
        convolve(rows["X"], rows["E"]), convolve(rows["U"], rows["E"]),
        convolve(rows["X"], rows["V"]), convolve(rows["U"], rows["V"]),
    )
    drows = (
        convolve(rows["X"], rows["P"]), convolve(rows["U"], rows["P"]),
        convolve(rows["X"], rows["W"]), convolve(rows["U"], rows["W"]),
    )
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    constants = {
        row[0]: 1 for row in rows.values()
    }
    return sp.expand(raw_g1.subs(rules).subs(constants))


def main() -> None:
    internal, rows = ordinary_expression()
    singleton = singleton_expression(rows)
    k = sp.symbols("k", integer=True, nonnegative=True)
    exact = {}
    for ell in (1, 2, 3):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        child_rules = {}
        for rank in range(1, 7):
            child_rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        idegrees, icoefficients = tensor_binomial(
            sp.expand(internal.subs(child_rules)), (k,)
        )
        sdegrees, scoefficients = tensor_binomial(
            sp.expand(singleton.subs(child_rules)), (k,)
        )
        assert idegrees == sdegrees == (6,)
        exact[ell] = (
            sp.expand(icoefficients[(0,)]),
            sp.expand(scoefficients[(0,)]),
        )

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    reports = []
    for epsilon in (0, 1):
        parent_rules = {}
        for rank in range(1, 7):
            parent_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        variables = tuple(
            symbol
            for row in ((a, b, c) if epsilon == 0 else (a, b, c, d))
            for symbol in row[1:]
        )
        for ell, (internal_target, singleton_target) in exact.items():
            transformed_internal = sp.expand(internal_target.subs(parent_rules))
            transformed_singleton = sp.expand(singleton_target.subs(parent_rules))
            difference = sp.expand(transformed_internal - transformed_singleton)
            reports.append({
                "epsilon": epsilon,
                "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
                "ell": ell,
                "internal": summary(transformed_internal, variables),
                "singleton": summary(transformed_singleton, variables),
                "internal_minus_singleton": summary(difference, variables),
            })

    report = {
        "marker": MARKER,
        "rows": reports,
        "identity": (
            "same C rows; singleton D=(XP,UP,XW,UW), internal D=(YP,ZP,YW,ZW)"
        ),
        "status": "exact mode-transfer diagnostic; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
