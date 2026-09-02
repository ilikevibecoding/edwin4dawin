#!/usr/bin/env python3
"""Uniform bivariate Newton-index generating form of the double-broom gap.

This derives exact rational generating functions for the four universal
operator pairs.  It is a reduction of the remaining all-index sign, not by
itself a positivity proof.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp

from derive_iso_nested_compact_operator_root import add, scale_x, symbols, w, z
from prove_iso_double_broom_diagonal_gap_agent import (
    corrected_gap_newton,
    defect,
    p,
    s,
    sha256,
)
from prove_iso_double_broom_mixed_reduction_agent import CX, CXY, CZ, DX, DXY, DZ, phi


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_double_broom_diagonal_gap_newton_generating_exact_agent_20260829.json"
u, v = sp.symbols("u v")


def one_plus_x(value):
    return add(value, scale_x(value))


def jet_swap(expression, A, B):
    mapping = {
        z: w,
        w: z,
        A[0]: A[1],
        A[1]: A[0],
        A[2]: A[3],
        A[3]: A[2],
        B[0]: B[1],
        B[1]: B[0],
        B[2]: B[3],
        B[3]: B[2],
    }
    return expression.xreplace(mapping)


def tuple_kernel(value):
    pz, pw, dpz, dpw = value
    return p * pz * pw + (z - w) * (dpz * pw - pz * dpw) / 2


def product_operator(factor, left, right, c, d):
    lz, _, dlz, _ = left
    _, rw, _, drw = right
    q = factor * lz * rw
    dq = (
        (sp.diff(factor, z) - sp.diff(factor, w)) * lz * rw
        + factor * (dlz * rw - lz * drw)
    )
    return c * q + d * dq


def bb_generating(path0):
    pz, pw, _, _ = path0
    denominator = (1 - u * phi) * (1 - v * phi)
    geometric = 1 / denominator
    phi_derivative = (
        u * (1 - v * phi) + v * (1 - u * phi)
    ) / denominator**2
    return (
        s**2 * tuple_kernel(path0) * geometric
        - defect * pz * pw * (s**2 * phi_derivative + 2 * s * geometric)
    )


def terminal_generating(path0, path1, path2, A, B):
    bx = product_operator(
        w / ((1 - u * phi) * (1 - v * z)), path0, path1, CX, DX
    )
    by = product_operator(
        w / ((1 - v * phi) * (1 - u * z)), path0, path1, CX, DX
    )
    xy = product_operator(
        p / ((1 - u * z) * (1 - v * w)), path1, path1, CXY, DXY
    )
    bz = product_operator(
        w**2 / ((1 - u * z) * (1 - v * z)), path0, path2, CZ, DZ
    )
    return (
        bb_generating(path0)
        + bx
        + jet_swap(bx, A, B)
        + by
        + jet_swap(by, A, B)
        + xy
        + jet_swap(xy, A, B)
        + bz
        + jet_swap(bz, A, B)
    )


def coefficient(expression, left, right, zero):
    return sp.diff(sp.diff(expression, left), right).subs(zero)


def rational_record(expression):
    representation = sp.srepr(expression)
    return {
        "operation_count": int(sp.count_ops(expression)),
        "exact_expression_sha256": hashlib.sha256(representation.encode()).hexdigest().upper(),
    }


def main() -> None:
    A, B = symbols("A"), symbols("B")
    T = add(B, scale_x(A))
    S = add(one_plus_x(B), scale_x(A))
    R = add(one_plus_x(T), scale_x(B))
    gap = (
        terminal_generating(R, S, T, A, B)
        - terminal_generating(S, T, B, A, B)
        - p * terminal_generating(T, B, A, A, B)
    )

    Az, Aw, dAz, dAw = A
    Bz, Bw, dBz, dBw = B
    zero = {jet: 0 for jet in (*A, *B)}
    print("extract raw operator coefficients", flush=True)
    ma = 2 * coefficient(gap, dAz, Aw, zero) / (z - w)
    mb = 2 * coefficient(gap, dBz, Bw, zero) / (z - w)
    print("extract cross derivatives", flush=True)
    ca = coefficient(gap, dAz, Bw, zero)
    cb = coefficient(gap, dBz, Aw, zero)
    mc = (ca + cb) / (z - w)
    e = (ca - cb) / 2

    print("extract product coefficients", flush=True)
    aa = coefficient(gap, Az, Aw, zero) - p * ma
    bb = coefficient(gap, Bz, Bw, zero) - p * mb
    ab = coefficient(gap, Az, Bw, zero) - p * mc
    ba = coefficient(gap, Bz, Aw, zero) - p * mc
    print("assemble reserves", flush=True)
    ra = -aa / defect
    rb = -bb / defect
    rc = -(ab + ba) / (2 * defect)
    determinant_coefficient = (ba - ab) / 2
    f = (determinant_coefficient * (z - w) - 2 * e) / defect
    q = e / defect

    operators = {
        "A": (ma, ra),
        "B": (mb, rb),
        "C": (mc, rc),
        "D": (f, q),
    }
    coefficient_replays = 0
    for i, j in ((0, 0), (0, 1), (1, 0), (1, 1)):
        generated = sp.diff(gap, u, i, v, j).subs({u: 0, v: 0}) / (
            factorial(i) * factorial(j)
        )
        expected = corrected_gap_newton(i, j)[2]
        assert sp.cancel(generated - expected) == 0
        coefficient_replays += 1
    common_geometric_factors = [
        1 - u * z,
        1 - u * w,
        1 - v * z,
        1 - v * w,
        1 - u * phi,
        1 - v * phi,
    ]
    common_denominator = (
        (1 - u * phi) ** 2
        * (1 - v * phi) ** 2
        * (1 - u * z) ** 2
        * (1 - u * w) ** 2
        * (1 - v * z) ** 2
        * (1 - v * w) ** 2
    )

    report = {
        "marker": "DERIVED_EXACT_UNIFORM_DOUBLE_BROOM_NEWTON_INDEX_GENERATING_OPERATORS",
        "index_generating_function": "sum_(i,j>=0) G_(i,j) u^i v^j",
        "operator_identity": {
            "kernel": "O_(M,R)(H)=M[pH-delta partial_p H]-delta R H",
            "cd": "O_D(F,Q)(H)=delta F H+2delta^2 Q partial_p H",
        },
        "operators": {
            name: {
                "multiplier": rational_record(multiplier),
                "reserve_or_derivative": rational_record(reserve),
            }
            for name, (multiplier, reserve) in operators.items()
        },
        "common_geometric_factors": [str(factor) for factor in common_geometric_factors],
        "common_denominator_bound": str(common_denominator),
        "literal_coefficient_replays": coefficient_replays,
        "source_sha256": sha256(Path(__file__).resolve()),
        "dependency_sha256": {
            "collar_source": sha256(HERE / "prove_iso_double_broom_diagonal_gap_agent.py"),
            "mixed_source": sha256(HERE / "prove_iso_double_broom_mixed_reduction_agent.py"),
        },
        "remaining_obligation": (
            "Prove coefficientwise nonnegativity in u,v after applying the "
            "universal diagonal functional to these rational operators. The "
            "displayed rational identity alone is not a sign proof."
        ),
        "scope_guard": (
            "Uniform exact generating reduction only; it does not promote the "
            "fixed-total replays to an all-Newton theorem."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "operator_operation_counts": {
                    name: [
                        report["operators"][name]["multiplier"]["operation_count"],
                        report["operators"][name]["reserve_or_derivative"]["operation_count"],
                    ]
                    for name in operators
                },
                "source_sha256": report["source_sha256"],
                "report_sha256": sha256(OUTPUT),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
