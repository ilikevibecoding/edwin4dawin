#!/usr/bin/env python3
"""Exact factor-preserving reduction for internal-spine endpoint g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_endpoint_broom_factor_exact_rank5_g2_alt_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ENDPOINT_BROOM_FACTOR_RANK5_G2_ALT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def convolve(left, right, maximum=6):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, rank - j) for j in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def endpoint_expression():
    generic_c, generic_d, _raw_g1, raw_g2 = raw_coefficients()
    x = tuple(sp.symbols("x0:7"))
    u = tuple(sp.symbols("u0:7"))
    y = tuple(sp.symbols("y0:7"))
    z = tuple(sp.symbols("z0:7"))
    r = tuple(sp.symbols("r0:7"))
    q = tuple(sp.symbols("q0:7"))
    r0 = tuple(sp.expand(r[rank] + at(q, rank - 1)) for rank in range(7))
    crows = (
        convolve(x, r0), convolve(u, r0),
        convolve(x, r), convolve(u, r),
    )
    drows = (
        convolve(y, r), convolve(z, r),
        convolve(y, r), convolve(z, r),
    )
    rules = {
        symbol: value
        for generic_row, actual_row in zip(generic_c + generic_d, crows + drows)
        for symbol, value in zip(generic_row, actual_row)
    }
    constants = {row[0]: 1 for row in (x, u, y, z, r, q)}
    expression = sp.expand(raw_g2.subs(rules).subs(constants))
    return expression, {"X": x, "U": u, "Y": y, "Z": z, "R": r, "Q": q}


def main():
    expression, _rows = endpoint_expression()
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    stream = "".join(
        f"{powers}:{coefficient};" for powers, coefficient in polynomial.terms()
    )
    coefficients = polynomial.coeffs()
    report = {
        "marker": MARKER,
        "geometry": {
            "child_rows": "X=I(A), U=I(A-u), Y=I(A-a), Z=I(A-{a,u})",
            "parent_recurrence": "I(F)=R+xQ with R=I(F-v), Q=I(F-N[v])",
            "C": "(X(R+xQ),U(R+xQ),XR,UR)",
            "D": "(YR,ZR,YR,ZR)",
        },
        "normalized_g2": {
            "monomials": len(polynomial.terms()),
            "total_degree": polynomial.total_degree(),
            "negative_scalar_coefficients": sum(1 for c in coefficients if c < 0),
            "positive_scalar_coefficients": sum(1 for c in coefficients if c > 0),
            "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        },
        "status": "exact internal-endpoint factor reduction; sign not asserted",
        "scope": "Internal-spine broom endpoint g2 algebra only.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
