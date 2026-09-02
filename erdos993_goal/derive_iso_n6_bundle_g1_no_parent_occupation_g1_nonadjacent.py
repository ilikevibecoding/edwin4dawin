#!/usr/bin/env python3
"""Exact occupation normal form for rank-six no-parent g1.

In the canonical no_parent_k0 mode D=C.  For nonadjacent marks write

    W=A, U=A+xB, V=A+xC, E=A+xB+xC+x^2D.

This source reconstructs literal rank-six g1, performs that substitution,
and extracts its five bilinear occupation kernels.  It is algebra only; the
endpoint reductions and signs are separate obligations.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_no_parent_occupation_exact_g1_nonadjacent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_NO_PARENT_OCCUPATION_G1_NONADJACENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def summary(expression: sp.Expr) -> dict[str, object]:
    polynomial = sp.Poly(expression, *sorted(expression.free_symbols, key=str))
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            1 for coefficient in polynomial.coeffs() if coefficient < 0
        ),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main() -> None:
    raw = reconstruct(1)
    names = {str(symbol): symbol for symbol in raw.free_symbols}
    d_equals_c = {
        names[f"d{family}{rank}"]: names[f"c{family}{rank}"]
        for family in "EUVW" for rank in range(8)
        if f"d{family}{rank}" in names and f"c{family}{rank}" in names
    }
    no_parent = sp.expand(raw.subs(d_equals_c))

    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    d = sp.symbols("d0:6", integer=True, nonnegative=True)
    occupation = {}
    for rank in range(8):
        w = a[rank]
        av = b[rank - 1] if rank >= 1 else 0
        bv = c[rank - 1] if rank >= 1 else 0
        zv = d[rank - 2] if rank >= 2 else 0
        values = {
            f"cW{rank}": w,
            f"cU{rank}": w + av,
            f"cV{rank}": w + bv,
            f"cE{rank}": w + av + bv + zv,
        }
        occupation.update({names[label]: value for label, value in values.items() if label in names})
    constants = {a[0]: 1, b[0]: 1, c[0]: 1, d[0]: 1}
    expression = sp.expand(no_parent.subs(occupation).subs(constants))

    families = {symbol: str(symbol)[0] for symbol in expression.free_symbols}
    pieces: dict[str, sp.Expr] = {label: sp.Integer(0) for label in ("AA", "AB", "AC", "AD", "BC")}
    variables = tuple(sorted(expression.free_symbols, key=str))
    for powers, coefficient in sp.Poly(expression, *variables).terms():
        factors = []
        monomial = sp.Integer(coefficient)
        for variable, power in zip(variables, powers):
            monomial *= variable**power
            factors.extend([families[variable]] * power)
        assert len(factors) == 2
        label = "".join(sorted(factors)).upper()
        assert label in pieces, (label, monomial)
        pieces[label] += monomial
    pieces = {label: sp.expand(value) for label, value in pieces.items()}
    assert sp.expand(expression - sum(pieces.values())) == 0
    assert sp.expand(pieces["AB"].xreplace({b[index]: c[index] for index in range(7)}) - pieces["AC"]) == 0

    derivatives = {
        str(variable): str(sp.factor(sp.diff(expression, variable)))
        for variable in (*b[2:7], *c[2:7], *d[2:6])
        if variable in expression.free_symbols
    }
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "no_parent_k0",
        "row_relation": "D=C",
        "occupation_rows_nonadjacent": "W=A,U=A+xB,V=A+xC,E=A+xB+xC+x^2D",
        "nonadjacent_split": "AA(A)+AB(A,B)+AC(A,C)+BC(B,C)+AD(A,D)",
        "adjacent_split": "AA(A)+AB(A,B)+AC(A,C)+BC(B,C)",
        "pieces": {label: str(value) for label, value in pieces.items()},
        "piece_summaries": {label: summary(value) for label, value in pieces.items()},
        "induced_row_derivatives": derivatives,
        "checks": {
            "literal_reconstruction": True,
            "D_equals_C": True,
            "five_piece_sum": True,
            "B_C_symmetry": True,
        },
        "status": "exact occupation algebra; no sign theorem asserted",
        "scope_guard": (
            "This derives only the canonical no-parent occupation identity.  "
            "It does not prove endpoint reductions, g1>=0, other canonical modes, N6, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw_report = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw_report, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "piece_summaries": report["piece_summaries"],
        "checks": report["checks"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw_report.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
