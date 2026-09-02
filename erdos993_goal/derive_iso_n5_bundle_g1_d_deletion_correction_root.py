#!/usr/bin/env python3
"""Derive the exact D=C-X correction in the rank-five bundle g1 form.

Canonical non-root modes have D obtained from C by induced deletion.  This
script substitutes coefficientwise differences X=C-D into the raw 54-term g1
and records the exact correction relative to the no-mark-root specialization.
It is algebra only; coefficientwise X>=0 need not capture all deletion-row
relations, and no sign is asserted unless the correction actually has one.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g1_d_deletion_correction_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_BUNDLE_G1_D_DELETION_CORRECTION_ROOT"


def main() -> None:
    crows, drows, g1, _g2 = raw_coefficients()
    xrows = tuple(tuple(sp.symbols(f"x{name}0:7")) for name in "EUVW")
    no_mark_rules = {
        dsymbol: csymbol
        for drow, crow in zip(drows, crows)
        for dsymbol, csymbol in zip(drow, crow)
    }
    deletion_rules = {
        dsymbol: csymbol - xsymbol
        for drow, crow, xrow in zip(drows, crows, xrows)
        for dsymbol, csymbol, xsymbol in zip(drow, crow, xrow)
    }
    no_mark = sp.expand(g1.subs(no_mark_rules))
    deletion = sp.expand(g1.subs(deletion_rules))
    correction = sp.expand(deletion - no_mark)
    variables = tuple(symbol for row in crows + xrows for symbol in row)
    polynomial = sp.Poly(correction, *variables)
    negative = [
        str(sp.Mul(coefficient, *(
            variable ** exponent
            for variable, exponent in zip(variables, powers) if exponent
        )))
        for powers, coefficient in polynomial.terms()
        if coefficient.is_negative is True
    ]
    assert sp.Poly(correction, *(symbol for row in xrows for symbol in row)).total_degree() == 1
    report = {
        "marker": MARKER,
        "identity": "g1(C,D=C-X)=g1(C,D=C)+correction(C,X)",
        "correction": str(sp.factor(correction)),
        "term_count": len(polynomial.terms()),
        "negative_scalar_coefficients": len(negative),
        "negative_terms": negative,
        "linear_in_X": True,
        "scope": "Exact algebraic reduction only; no correction sign or g1 theorem is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
