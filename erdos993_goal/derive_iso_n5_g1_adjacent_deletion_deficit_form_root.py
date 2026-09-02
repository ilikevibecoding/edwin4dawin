#!/usr/bin/env python3
"""Exact deletion-deficit form for adjacent-mark S=M5+3*C5.

For adjacent marks, put x_k=a_k-b_k and y_k=a_k-c_k, where A is the
twice-deleted forest and B,C are obtained from A by deleting the two
disjoint neighbor sets.  This artifact rewrites the exact compact rank-five
target around the correlated face B=C=A.  It is an algebraic reduction only;
no sign of the deficit form is asserted.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_deletion_deficit_form_exact_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_ADJACENT_DELETION_DEFICIT_FORM_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def h_form(a):
    return (
        2*a[1]*a[4] - 5*a[1]*a[5] - 6*a[1]*a[6]
        + 6*a[2]*a[3] - 8*a[2]*a[5]
        + 5*a[3]**2 + 6*a[3]*a[4]
    )


def ell_form(a, b):
    return 2 * (
        a[1]*b[3] - 2*a[1]*b[4] - 3*a[1]*b[5]
        + 2*a[2]*b[2] + 2*a[2]*b[3] - a[2]*b[4]
        + a[3]*b[1] + 2*a[3]*b[2] + 4*a[3]*b[3]
        - 2*a[4]*b[1] - a[4]*b[2] - 3*a[5]*b[1]
    )


def k_form(b, c):
    return (
        2*b[1]*c[2] - 3*b[1]*c[3] - 6*b[1]*c[4]
        + 2*b[2]*c[1] + 6*b[2]*c[2] + 4*b[2]*c[3]
        - 3*b[3]*c[1] + 4*b[3]*c[2] - 6*b[4]*c[1]
    )


def main() -> None:
    a = (sp.Integer(1), *sp.symbols("a1:7", nonnegative=True))
    x = (sp.Integer(0), *sp.symbols("x1:6", nonnegative=True), sp.Integer(0))
    y = (sp.Integer(0), *sp.symbols("y1:6", nonnegative=True), sp.Integer(0))
    b = tuple(a[index] - x[index] for index in range(7))
    c = tuple(a[index] - y[index] for index in range(7))

    target = sp.expand(h_form(a) + ell_form(a, b) + ell_form(a, c) + k_form(b, c))
    face = sp.expand(h_form(a) + 2*ell_form(a, a) + k_form(a, a))
    deficit = sp.expand(target - face)

    # The correction has a compact polar form.  T(A,X)=L(A,X)+K(A,X).
    tx = sp.expand(ell_form(a, x) + k_form(a, x))
    ty = sp.expand(ell_form(a, y) + k_form(a, y))
    claimed = sp.expand(-tx - ty + k_form(x, y))
    assert sp.expand(deficit - claimed) == 0

    t_coefficients = {
        str(x[index]): str(sp.factor(sp.diff(tx, x[index])))
        for index in range(1, 6)
    }
    expected_t = {
        x[1]: 2*a[2] - a[3] - 10*a[4] - 6*a[5],
        x[2]: 2*a[1] + 10*a[2] + 8*a[3] - 2*a[4],
        x[3]: -a[1] + 8*a[2] + 8*a[3],
        x[4]: -10*a[1] - 2*a[2],
        x[5]: -6*a[1],
    }
    assert all(
        sp.expand(sp.diff(tx, variable) - expression) == 0
        for variable, expression in expected_t.items()
    )

    # B=C=A is exactly x=y=0.  This records rather than assumes the face.
    assert sp.expand(target.subs({**{v: 0 for v in x[1:6]}, **{v: 0 for v in y[1:6]}}) - face) == 0

    report = {
        "marker": MARKER,
        "definitions": {
            "x_k": "a_k-b_k counts independent k-sets of A meeting the B-deleted neighbor set",
            "y_k": "a_k-c_k counts independent k-sets of A meeting the C-deleted neighbor set",
            "deletion_deficits": "dB=x1=|A|-|B| and dC=y1=|A|-|C|",
            "order_overlap": "r=|B|+|C|-|A|=|A|-dB-dC",
        },
        "exact_identity": "S(A,B,C)=S(A,A,A)-T(A,X)-T(A,Y)+K(X,Y)",
        "T_definition": "T(A,X)=L(A,X)+K(A,X)",
        "K_definition": str(sp.factor(k_form(x, y))),
        "S_AAA": str(sp.factor(face)),
        "T_A_X": str(sp.factor(tx)),
        "T_coefficient_by_deficit_rank": t_coefficients,
        "expanded_residual_zero": True,
        "geometric_face": (
            "dB=dC=0 forces B=C=A, hence x=y=0 exactly; independent coefficient "
            "boxes on this face are invalid"
        ),
        "elementary_bounds": (
            "For a d-vertex deletion set, 0<=x_k<=dB*binom(|A|-1,k-1) and "
            "0<=y_k<=dC*binom(|A|-1,k-1) by union-bounding sets through a deleted vertex"
        ),
        "status": "Exact correlated-coordinate reduction only; no positivity claim.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
