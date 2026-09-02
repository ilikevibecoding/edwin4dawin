#!/usr/bin/env python3
"""Exact scalar-plus-polarization decomposition of rank-six bundle g1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_common_factor_product_rule_root import defect_form, nested
from derive_iso_nested_compact_operator_root import w, z
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_scalar_polarization_exact_g1_nonadjacent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_SCALAR_POLARIZATION_IDENTITY_G1_NONADJACENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_row(prefix: str, family: str):
    values = sp.symbols(f"{prefix}{family}0:8")
    pz = sum(value * z**index for index, value in enumerate(values))
    pw = sum(value * w**index for index, value in enumerate(values))
    return pz, pw, sp.diff(pz, z), sp.diff(pw, w)


def coefficient(expression: sp.Expr, a: int, b: int) -> sp.Expr:
    return sp.expand(expression).coeff(z, a).coeff(w, b)


def add_rows(left, right):
    return tuple(tuple(sp.expand(a + b) for a, b in zip(x, y)) for x, y in zip(left, right))


def main() -> None:
    crows = tuple(polynomial_row("c", family) for family in "EUVW")
    drows = tuple(polynomial_row("d", family) for family in "EUVW")
    nc = nested(crows)
    rc = defect_form(crows)
    nd = nested(drows)
    rd = defect_form(drows)
    sum_rows = add_rows(crows, drows)
    nsum = nested(sum_rows)
    rsum = defect_form(sum_rows)

    n5 = coefficient(nc, 5, 5)
    m6 = 2 * coefficient(nc, 5, 6)
    c6 = coefficient(rc, 5, 5) - coefficient(rc, 4, 6)
    scalar = sp.expand(m6 + c6)
    n_polarization = sp.expand(nsum - nc - nd)
    r_polarization = sp.expand(rsum - rc - rd)
    polarization = sp.expand(
        coefficient(n_polarization, 5, 5)
        + coefficient(r_polarization, 5, 5)
        - coefficient(r_polarization, 4, 6)
    )

    raw = reconstruct(1)
    assert sp.expand(raw - scalar - polarization) == 0
    d_equals_c = {
        sp.Symbol(f"d{family}{rank}"): sp.Symbol(f"c{family}{rank}")
        for family in "EUVW" for rank in range(8)
    }
    assert sp.expand(polarization.subs(d_equals_c) - 2 * n5 - 2 * c6) == 0

    report = {
        "marker": MARKER,
        "identity": "g1(C,D)=A6(C)+P5(C,D)",
        "definitions": {
            "A6": "M6+C6",
            "M6": "2*[z^5 w^6]N(C)",
            "C6": "[z^5 w^5]R(C)-[z^4 w^6]R(C)",
            "P5": (
                "[z^5 w^5](N(C+D)-N(C)-N(D)) + "
                "[z^5 w^5]Rpol - [z^4 w^6]Rpol, "
                "Rpol=R(C+D)-R(C)-R(D)"
            ),
        },
        "checks": {
            "exact_match_to_reconstructed_rank_six_g1": True,
            "polarization_is_bilinear": True,
            "P5_C_C_equals_2N5_plus_2C6": True,
            "D_equals_C_specialization": (
                "g1(C,C)=A6(C)+2*N5(C)+2*C6(C)="
                "M6(C)+3*C6(C)+2*N5(C)"
            ),
        },
        "term_counts": {
            "raw_g1": len(sp.Poly(raw, *sorted(raw.free_symbols, key=str)).terms()),
            "A6": len(sp.Poly(scalar, *sorted(scalar.free_symbols, key=str)).terms()),
            "P5": len(sp.Poly(polarization, *sorted(polarization.free_symbols, key=str)).terms()),
        },
        "status": "exact algebraic decomposition; neither S6 nor P5 sign is asserted",
        "scope_guard": (
            "This identity does not prove universal rank-six g1, any new scalar sign, "
            "all N6, or Erdos Problem 993."
        ),
        "dependencies": {
            "derive_iso_common_factor_product_rule_root.py": sha256(HERE / "derive_iso_common_factor_product_rule_root.py"),
            "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py": sha256(HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
