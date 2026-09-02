#!/usr/bin/env python3
"""Exact replay of the generalized-Vandermonde pencil reduction.

For Q(z)=prod_i (z-lambda_i), put

    P_C(x)=L_C^{-1}Q=sum_j q_j (x)_j^fall/(C)_j^rise.

In the shifted-power basis 1,(1+z),...,(1+z)^(m-1), multiplication by
z on R[z]/(Q) has matrix Z=V^{-1} Lambda V, while

    (1+z)d/dz+C

has diagonal matrix D_C=diag(C,...,C+m-1).  Hence the zeros of P_C are
the generalized eigenvalues of

    A_C(x)=x V-Lambda V D_C,

whose entries are (x-lambda_i(C+j))(1+lambda_i)^j.

For the two-outlier source

    (z+a)(z+b) prod_i(z-lambda_i),

with C=B, deleting the two rows belonging to -a,-b and the first two
columns leaves, up to positive row factors (1+lambda_i)^2, exactly the
pencil for prod_i(z-lambda_i) with parameter B+2.  This is an all-degree
identity.  The checks below are deterministic exact-rational replays.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_normalized_pochhammer_vandermonde_pencil_exact_20260809.json"
X, Z = sp.symbols("x z")


def falling(j: int) -> sp.Expr:
    return sp.prod((X - k for k in range(j)), start=sp.Integer(1))


def source(nodes: list[sp.Expr]) -> sp.Poly:
    return sp.Poly(sp.expand(sp.prod((Z - node for node in nodes), start=sp.Integer(1))), Z)


def inverse_normalized_pochhammer(nodes: list[sp.Expr], parameter: sp.Expr) -> sp.Poly:
    q = source(nodes)
    value = sum(q.nth(j) * falling(j) / sp.rf(parameter, j) for j in range(q.degree() + 1))
    return sp.Poly(sp.expand(value), X)


def vandermonde(nodes: list[sp.Expr]) -> sp.Matrix:
    return sp.Matrix([[(1 + node) ** j for j in range(len(nodes))] for node in nodes])


def pencil(nodes: list[sp.Expr], parameter: sp.Expr) -> sp.Matrix:
    return sp.Matrix(
        [
            [
                (X - node * (parameter + j)) * (1 + node) ** j
                for j in range(len(nodes))
            ]
            for node in nodes
        ]
    )


def monic(poly: sp.Poly) -> sp.Poly:
    return sp.Poly(sp.cancel(poly.as_expr() / poly.LC()), X)


def check_case(nodes: list[sp.Rational], parameter: int) -> dict[str, object]:
    assert len(nodes) == len(set(nodes))
    assert all(node != -1 for node in nodes)
    V = vandermonde(nodes)
    A = pencil(nodes, parameter)
    transformed = inverse_normalized_pochhammer(nodes, parameter)
    characteristic = sp.Poly(sp.cancel(A.det() / V.det()), X)
    assert monic(characteristic) == monic(transformed)

    diagonal = sp.diag(*[parameter + j for j in range(len(nodes))])
    multiplication = V.inv() * sp.diag(*nodes) * V
    operator = multiplication * diagonal
    assert sp.Poly(operator.charpoly(X).as_expr(), X) == monic(transformed)
    return {
        "degree": len(nodes),
        "parameter": parameter,
        "nodes": list(map(str, nodes)),
        "vandermonde_determinant": str(sp.factor(V.det())),
    }


def check_complementary_minor(
    positive_nodes: list[sp.Rational], B: int, a: sp.Rational, b: sp.Rational
) -> dict[str, object]:
    assert positive_nodes and all(node > 0 for node in positive_nodes)
    assert 0 < a <= sp.Rational(1, 4)
    assert 0 < b <= sp.Rational(1, 4)
    assert a != b
    full_nodes = [-a, -b] + positive_nodes
    assert len(full_nodes) == len(set(full_nodes))
    full = pencil(full_nodes, B)
    complement = full.extract(range(2, len(full_nodes)), range(2, len(full_nodes)))
    old = pencil(positive_nodes, B + 2)
    row_scale = sp.diag(*[(1 + node) ** 2 for node in positive_nodes])
    assert complement == row_scale * old
    assert sp.factor(complement.det() - sp.prod((1 + node) ** 2 for node in positive_nodes) * old.det()) == 0
    return {
        "r": len(positive_nodes),
        "B": B,
        "a": str(a),
        "b": str(b),
        "positive_nodes": list(map(str, positive_nodes)),
        "deleted_rows": [0, 1],
        "deleted_columns": [0, 1],
        "row_factor_product": str(sp.prod((1 + node) ** 2 for node in positive_nodes)),
    }


def main() -> None:
    rational_cases = [
        ([sp.Rational(1, 7)], 9),
        ([sp.Rational(1, 11), sp.Rational(3, 5)], 13),
        ([sp.Rational(1, 13), sp.Rational(2, 7), sp.Rational(5, 3)], 17),
        ([sp.Rational(1, 17), sp.Rational(1, 3), sp.Rational(4, 3), sp.Rational(11, 2)], 23),
        ([sp.Rational(1, 19), sp.Rational(2, 9), sp.Rational(5, 7), sp.Rational(7, 3), sp.Rational(13, 2)], 29),
        ([sp.Rational(1, 23), sp.Rational(2, 11), sp.Rational(3, 7), sp.Rational(8, 5), sp.Rational(19, 4), sp.Rational(17, 2)], 37),
    ]
    pencil_checks = [check_case(nodes, parameter) for nodes, parameter in rational_cases]

    minor_checks = []
    for r in range(1, 7):
        B = 3 * r + 4
        nodes = [sp.Rational((k + 1) ** 2, 5 * r + 7) for k in range(r)]
        minor_checks.append(
            check_complementary_minor(nodes, B, sp.Rational(1, 20), sp.Rational(1, 5))
        )
        minor_checks.append(
            check_complementary_minor(nodes, B + 5, sp.Rational(1, 8), sp.Rational(1, 4))
        )

    report = {
        "status": "PASS_EXACT_ALL_DEGREE_REDUCTION_AND_RATIONAL_REPLAY",
        "proved_reductions": [
            "L_C^{-1}Q is the characteristic polynomial of Z_Q D_C",
            "det(xV-Lambda V D_C)/det(V) is its monic form",
            "the B+2 source pencil is the complementary minor of the B two-outlier pencil",
        ],
        "remaining_theorem": (
            "derive the positive-root product comparison from the codimension-two "
            "generalized-Vandermonde minor embedding"
        ),
        "pencil_checks": pencil_checks,
        "complementary_minor_checks": minor_checks,
    }
    canonical = json.dumps(report, sort_keys=True, separators=(",", ":")).encode()
    report["content_sha256"] = hashlib.sha256(canonical).hexdigest()
    REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
