#!/usr/bin/env python3
"""Exact factor-preserving reduction for internal-spine endpoint g1.

In the canonical endpoint mode the parent p of the deepest support is the
marked vertex v.  With A the protected one-ended broom containing u and F
the parent-side rooted forest containing v, write

    X=I(A), U=I(A-u), Y=I(A-a), Z=I(A-{a,u}),
    R=I(F-v), Q=I(F-N[v]), so I(F)=R+xQ.

The canonical rows become

    C=(X(R+xQ), U(R+xQ), XR, UR),
    D=(YR, ZR, YR, ZR).

This script substitutes those rows into the defining raw 54-term rank-five
g1 and records an exact normalized polynomial hash.  It is a reusable
algebraic reduction only; no sign is inferred.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_broom_factor_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_BROOM_FACTOR_ROOT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def convolve(left, right, maximum=6):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, rank - j) for j in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def endpoint_expression():
    generic_c, generic_d, raw_g1, _raw_g2 = raw_coefficients()
    x = tuple(sp.symbols("x0:7"))
    u = tuple(sp.symbols("u0:7"))
    y = tuple(sp.symbols("y0:7"))
    z = tuple(sp.symbols("z0:7"))
    r = tuple(sp.symbols("r0:7"))
    q = tuple(sp.symbols("q0:7"))
    r0 = tuple(sp.expand(r[rank] + at(q, rank - 1)) for rank in range(7))

    crows = (
        convolve(x, r0),
        convolve(u, r0),
        convolve(x, r),
        convolve(u, r),
    )
    drows = (
        convolve(y, r),
        convolve(z, r),
        convolve(y, r),
        convolve(z, r),
    )
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    constants = {row[0]: 1 for row in (x, u, y, z, r, q)}
    expression = sp.expand(raw_g1.subs(rules).subs(constants))

    # Independently confirm the recurrence-normalized rows equal the direct
    # canonical endpoint rows with R0=R+xQ and Rv=R.
    assert crows[0] == convolve(x, r0)
    assert crows[1] == convolve(u, r0)
    assert crows[2] == convolve(x, r)
    assert crows[3] == convolve(u, r)
    assert drows[0] == drows[2] and drows[1] == drows[3]
    return expression, {"X": x, "U": u, "Y": y, "Z": z, "R": r, "Q": q}


def main() -> None:
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
        "normalized_g1": {
            "monomials": len(polynomial.terms()),
            "total_degree": polynomial.total_degree(),
            "negative_scalar_coefficients": sum(
                coefficient.is_negative is True for coefficient in coefficients
            ),
            "positive_scalar_coefficients": sum(
                coefficient.is_positive is True for coefficient in coefficients
            ),
            "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        },
        "status": "exact endpoint factor reduction; sign not asserted",
        "scope": (
            "Internal-spine broom endpoint g1 algebra only.  This does not prove "
            "g1>=0 in the endpoint mode, any other g1/g2 mode, all N5, or "
            "Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
