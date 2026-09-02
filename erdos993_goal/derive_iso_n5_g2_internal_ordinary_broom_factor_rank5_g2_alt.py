#!/usr/bin/env python3
"""Exact factor-preserving reduction for internal-spine ordinary g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_broom_factor_exact_rank5_g2_alt_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BROOM_FACTOR_RANK5_G2_ALT"


def ordinary_expression():
    generic_c, generic_d, _raw_g1, raw_g2 = raw_coefficients()
    x = tuple(sp.symbols("x0:7"))
    u = tuple(sp.symbols("u0:7"))
    y = tuple(sp.symbols("y0:7"))
    z = tuple(sp.symbols("z0:7"))
    e = tuple(sp.symbols("e0:7"))
    p = tuple(sp.symbols("p0:7"))
    v = tuple(sp.symbols("v0:7"))
    w = tuple(sp.symbols("w0:7"))
    crows = (
        convolve(x, e), convolve(u, e),
        convolve(x, v), convolve(u, v),
    )
    drows = (
        convolve(y, p), convolve(z, p),
        convolve(y, w), convolve(z, w),
    )
    rules = {
        symbol: value
        for generic_row, actual_row in zip(generic_c + generic_d, crows + drows)
        for symbol, value in zip(generic_row, actual_row)
    }
    constants = {row[0]: 1 for row in (x, u, y, z, e, p, v, w)}
    expression = sp.expand(raw_g2.subs(rules).subs(constants))
    return expression, {"X": x, "U": u, "Y": y, "Z": z,
                        "E": e, "P": p, "V": v, "W": w}


def main():
    expression, _rows = ordinary_expression()
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    stream = "".join(f"{powers}:{coefficient};" for powers, coefficient in polynomial.terms())
    report = {
        "marker": MARKER,
        "geometry": {
            "child_rows": "X=I(A), U=I(A-u), Y=I(A-a), Z=I(A-{a,u})",
            "parent_rows": "E=I(F), P=I(F-p), V=I(F-v), W=I(F-{p,v})",
            "C": "(XE,UE,XV,UV)", "D": "(YP,ZP,YW,ZW)",
        },
        "normalized_g2": {
            "monomials": len(polynomial.terms()),
            "total_degree": polynomial.total_degree(),
            "negative_scalar_coefficients": sum(1 for value in polynomial.coeffs() if value < 0),
            "positive_scalar_coefficients": sum(1 for value in polynomial.coeffs() if value > 0),
            "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        },
        "status": "exact internal-ordinary factor reduction; sign not asserted",
        "scope": "Internal-spine broom ordinary g2 algebra only.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
