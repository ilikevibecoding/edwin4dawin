#!/usr/bin/env python3
"""Exact compact identity for the no-parent rank-six bundle g1 mode.

This artifact is algebra only.  It proves

  g1(D=C) = M6 + 3*C6 + 2*N5,

where the three terms are diagonal coefficients of the common nested and
defect forms.  It deliberately makes no sign assertion for M6+3*C6.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_common_factor_product_rule_root import (
    defect_form,
    nested,
    tuple_multiply,
)
from derive_iso_nested_compact_operator_root import symbols, w, z
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_no_mark_root_compact_exact_g1_nonadjacent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_NO_MARK_ROOT_COMPACT_IDENTITY_G1_NONADJACENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def linear_factor(amount: int):
    return 1 + amount * z, 1 + amount * w, amount, amount


def polynomial_row(coefficients):
    pz = sum(value * z**index for index, value in enumerate(coefficients))
    pw = sum(value * w**index for index, value in enumerate(coefficients))
    return pz, pw, sp.diff(pz, z), sp.diff(pw, w)


def coefficient(expression: sp.Expr, a: int, b: int) -> sp.Expr:
    return sp.expand(expression).coeff(z, a).coeff(w, b)


def main() -> None:
    abstract = tuple(symbols(name) for name in "EUVW")
    n_abstract = nested(abstract)
    r_abstract = defect_form(abstract)
    direct = sp.expand(
        nested(tuple_multiply(linear_factor(2), abstract))
        - nested(tuple_multiply(linear_factor(1), abstract))
        - z * w * n_abstract
    )
    compact = sp.expand(
        (z + w + 2 * z * w) * n_abstract
        - 3 * (z - w) ** 2 * r_abstract / 2
    )
    assert sp.expand(direct - compact) == 0

    raw_g1 = reconstruct(1)
    names = {str(symbol): symbol for symbol in raw_g1.free_symbols}
    generic_c = tuple(
        tuple(names.get(f"c{family}{rank}", sp.Symbol(f"c{family}{rank}")) for rank in range(8))
        for family in "EUVW"
    )
    concrete = tuple(polynomial_row(row) for row in generic_c)
    n_concrete = nested(concrete)
    r_concrete = defect_form(concrete)
    n5 = coefficient(n_concrete, 5, 5)
    m6 = 2 * coefficient(n_concrete, 5, 6)
    c6 = coefficient(r_concrete, 5, 5) - coefficient(r_concrete, 4, 6)
    diagonal = sp.expand(m6 + 3 * c6 + 2 * n5)

    rules = {
        names[f"d{family}{rank}"]: names[f"c{family}{rank}"]
        for family in "EUVW"
        for rank in range(8)
        if f"d{family}{rank}" in names and f"c{family}{rank}" in names
    }
    raw_no_parent = sp.expand(raw_g1.subs(rules))
    assert sp.expand(raw_no_parent - diagonal) == 0

    report = {
        "marker": MARKER,
        "bivariate_identity": (
            "N((1+2x)T)-N((1+x)T)-zwN(T)="
            "(z+w+2zw)N(T)-3(z-w)^2R(T)/2"
        ),
        "diagonal_definitions": {
            "M6": "2*[z^5 w^6]N(T)",
            "C6": "[z^5 w^5]R(T)-[z^4 w^6]R(T)",
            "N5": "[z^5 w^5]N(T)",
        },
        "rank_six_identity": "g1(no-parent,D=C)=M6+3*C6+2*N5",
        "exact_match_to_reconstructed_rank_six_g1": True,
        "term_counts": {
            "raw_no_parent": len(sp.Poly(raw_no_parent, *sorted(raw_no_parent.free_symbols, key=str)).terms()),
            "M6": len(sp.Poly(m6, *sorted(m6.free_symbols, key=str)).terms()),
            "C6": len(sp.Poly(c6, *sorted(c6.free_symbols, key=str)).terms()),
            "N5": len(sp.Poly(n5, *sorted(n5.free_symbols, key=str)).terms()),
        },
        "remaining_sufficient_inequality": "M6+3*C6>=0, assuming the separately proved N5>=0",
        "status": "exact compact reduction; remaining sufficient inequality not asserted",
        "scope": (
            "No-parent rank-six g1 identity only; this does not prove the sign of "
            "M6+3*C6, the other canonical g1 modes, or Erdos Problem 993."
        ),
        "dependencies": {
            "derive_iso_common_factor_product_rule_root.py": sha256(HERE / "derive_iso_common_factor_product_rule_root.py"),
            "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py": sha256(HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(raw)
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
