#!/usr/bin/env python3
"""Exact factor reduction for internal-spine ordinary-parent g1.

Let A be the protected one-ended broom containing the marked vertex u and
let F be the parent-side forest containing the other mark v and the ordinary
parent p.  Write

    X=I(A), U=I(A-u), Y=I(A-a), Z=I(A-{a,u}),
    E=I(F), P=I(F-p), V=I(F-v), W=I(F-{p,v}).

The canonical four rows are

    C=(XE,UE,XV,UV),    D=(YP,ZP,YW,ZW).

This script substitutes those product rows into the raw 54-term rank-five
g1 expression and records the exact expanded parent/child polynomial.  It
is an algebraic reduction only; no sign is asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_broom_factor_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_BROOM_FACTOR_ROOT"


def ordinary_expression():
    generic_c, generic_d, raw_g1, _raw_g2 = raw_coefficients()
    x = tuple(sp.symbols("x0:7"))
    u = tuple(sp.symbols("u0:7"))
    y = tuple(sp.symbols("y0:7"))
    zz = tuple(sp.symbols("z0:7"))
    e = tuple(sp.symbols("e0:7"))
    p = tuple(sp.symbols("p0:7"))
    v = tuple(sp.symbols("v0:7"))
    w = tuple(sp.symbols("w0:7"))

    crows = (
        convolve(x, e),
        convolve(u, e),
        convolve(x, v),
        convolve(u, v),
    )
    drows = (
        convolve(y, p),
        convolve(zz, p),
        convolve(y, w),
        convolve(zz, w),
    )
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    constants = {
        row[0]: 1 for row in (x, u, y, zz, e, p, v, w)
    }
    expression = sp.expand(raw_g1.subs(rules).subs(constants))
    return expression, {
        "X": x, "U": u, "Y": y, "Z": zz,
        "E": e, "P": p, "V": v, "W": w,
    }


def main() -> None:
    expression, _rows = ordinary_expression()
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    stream = "".join(
        f"{powers}:{coefficient};" for powers, coefficient in polynomial.terms()
    )
    report = {
        "marker": MARKER,
        "geometry": {
            "child_rows": "X=I(A), U=I(A-u), Y=I(A-a), Z=I(A-{a,u})",
            "parent_rows": "E=I(F), P=I(F-p), V=I(F-v), W=I(F-{p,v})",
            "C": "(XE,UE,XV,UV)",
            "D": "(YP,ZP,YW,ZW)",
        },
        "normalized_g1": {
            "monomials": len(polynomial.terms()),
            "total_degree": polynomial.total_degree(),
            "negative_scalar_coefficients": sum(
                coefficient.is_negative is True for coefficient in polynomial.coeffs()
            ),
            "positive_scalar_coefficients": sum(
                coefficient.is_positive is True for coefficient in polynomial.coeffs()
            ),
            "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        },
        "status": "exact ordinary-parent factor reduction; sign not asserted",
        "scope": (
            "Internal-spine broom ordinary-parent g1 algebra only.  It does not "
            "prove this mode, any other g1/g2 mode, all N5, or Erdos Problem 993."
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
