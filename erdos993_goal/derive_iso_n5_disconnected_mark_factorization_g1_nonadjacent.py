#!/usr/bin/env python3
"""Exact N/R factorization for marks in different forest components.

For rooted factors X=P+xP0 and Y=Q+xQ0, the four marked rows are

    (E,U,V,W)=(XY,PY,XQ,PQ).

This replay derives compact factorizations of both quadratic operators:

    R = Phi(X,P) Phi(Y,Q),
    N = Phi(X,P)L(Y,Q)+Phi(Y,Q)L(X,P)-zw Phi(X,P)Phi(Y,Q),

where Phi(A,B)=zB(z)A(w)+wA(z)B(w) and
L(A,B)=K(A+xB)-K(A)-zwK(B) is the one-leaf kernel.  It also checks the
common-unmarked-factor transport exactly.

This is algebra only.  The companion C5 theorem proves the needed central
coefficient of R is nonnegative; the displayed N factorization is a sharper
remaining reduction for M5 and does not assert its sign.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_common_factor_product_rule_root import (
    defect_form,
    multiply,
    nested,
    tuple_multiply,
    wronskian_part,
)
from derive_iso_nested_compact_operator_root import leaf_kernel, symbols, w, z


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_mark_factorization_exact_g1_nonadjacent_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_DISCONNECTED_MARK_FACTORIZATION_G1_NONADJACENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def phi(full, deleted):
    full_z, full_w, _, _ = full
    deleted_z, deleted_w, _, _ = deleted
    return sp.expand(z * deleted_z * full_w + w * full_z * deleted_w)


def main() -> None:
    X, P, Y, Q = (symbols(name) for name in ("X", "P", "Y", "Q"))
    rows = (
        multiply(X, Y),
        multiply(P, Y),
        multiply(X, Q),
        multiply(P, Q),
    )
    phi_x, phi_y = phi(X, P), phi(Y, Q)
    leaf_x, leaf_y = leaf_kernel(X, P), leaf_kernel(Y, Q)

    exact_r = defect_form(rows)
    factored_r = sp.expand(phi_x * phi_y)
    assert sp.expand(exact_r - factored_r) == 0

    exact_n = nested(rows)
    factored_n = sp.expand(
        phi_x * leaf_y + phi_y * leaf_x - z * w * phi_x * phi_y
    )
    assert sp.expand(exact_n - factored_n) == 0

    common = symbols("A")
    common_rows = tuple_multiply(common, rows)
    common_n = nested(common_rows)
    common_r = defect_form(common_rows)
    product_n = sp.expand(
        common[0] * common[1] * exact_n
        + wronskian_part(common) * exact_r
    )
    product_r = sp.expand(common[0] * common[1] * exact_r)
    assert sp.expand(common_n - product_n) == 0
    assert sp.expand(common_r - product_r) == 0

    # Absorb the common factor into the first rooted pair.  The exact leaf
    # transport is the identity that makes this agree with the product rule.
    common_x, common_p = multiply(common, X), multiply(common, P)
    absorbed_phi = phi(common_x, common_p)
    absorbed_leaf = leaf_kernel(common_x, common_p)
    assert sp.expand(absorbed_phi - common[0] * common[1] * phi_x) == 0
    assert sp.expand(
        absorbed_leaf
        - common[0] * common[1] * leaf_x
        - wronskian_part(common) * phi_x
    ) == 0
    absorbed_n = sp.expand(
        absorbed_phi * leaf_y
        + phi_y * absorbed_leaf
        - z * w * absorbed_phi * phi_y
    )
    assert sp.expand(absorbed_n - common_n) == 0

    report = {
        "marker": MARKER,
        "four_rows": "(E,U,V,W)=(XY,PY,XQ,PQ)",
        "rooted_recurrences": "X=P+xP0 and Y=Q+xQ0",
        "definitions": {
            "Phi(A,B)": "zB(z)A(w)+wA(z)B(w)",
            "L(A,B)": "K(A+xB)-K(A)-zwK(B)",
            "J(A)": "(z-w)(A'(z)A(w)-A(z)A'(w))/2",
        },
        "factorizations": {
            "R": "Phi(X,P)Phi(Y,Q)",
            "N": (
                "Phi(X,P)L(Y,Q)+Phi(Y,Q)L(X,P)-"
                "zwPhi(X,P)Phi(Y,Q)"
            ),
        },
        "common_factor_transport": {
            "Phi(AX,AP)": "A(z)A(w)Phi(X,P)",
            "L(AX,AP)": "A(z)A(w)L(X,P)+J(A)Phi(X,P)",
            "N(A*T)": "A(z)A(w)N(T)+J(A)R(T)",
            "R(A*T)": "A(z)A(w)R(T)",
        },
        "all_symbolic_residuals_zero": True,
        "consequence": (
            "M5 in the distinct-component case is twice [z^4w^5] of the "
            "displayed Phi/L expression."
        ),
        "scope": (
            "Exact algebraic reduction only. It asserts no sign for M5, "
            "M5+3C5, connected nonadjacent marks, g1, or all N5."
        ),
        "dependencies": {
            "derive_iso_common_factor_product_rule_root.py": sha256(
                HERE / "derive_iso_common_factor_product_rule_root.py"
            ),
            "derive_iso_nested_compact_operator_root.py": sha256(
                HERE / "derive_iso_nested_compact_operator_root.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
