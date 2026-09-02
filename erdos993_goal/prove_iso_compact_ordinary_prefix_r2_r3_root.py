#!/usr/bin/env python3
"""Prove the two surviving compact ordinary pieces at ranks two and three.

For an ordinary unmarked leaf z--s in a marked forest, write C for the
four-minor tuple on B-{z,s}, H for the support-excluded tuple, and S=C+H.
The compact ordinary third-leaf gap splits, in doubled diagonal units, as

    A_r = diag((z+w)N(C)+2zw B_N(H,C)),
    B_r = diag(-(z-w)^2 [R(C+H)-R(H)]/2).

This script derives exact coefficient formulas and proves A_r,B_r>0 for
every forest-realizable ordinary cell at r=2 and r=3, including the small
orders outside the local-prefix shortcut.  It does not claim the split for
r>=4 or close the full strict prefix.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_compact_ordinary_prefix_r2_r3_exact_root_20260829.json"


def at(row: tuple[sp.Expr, ...], rank: int) -> sp.Expr:
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def add(left: tuple[sp.Expr, ...], right: tuple[sp.Expr, ...]):
    return tuple(
        at(left, rank) + at(right, rank)
        for rank in range(max(len(left), len(right)))
    )


def shift(row: tuple[sp.Expr, ...]):
    return (sp.Integer(0), *row)


def add_rows(left, right):
    return tuple(add(a, b) for a, b in zip(left, right))


def kernel2(row, a: int, b: int):
    """Twice [z^a w^b] of the symmetric one-row ISO kernel."""
    return sp.expand(
        2 * at(row, a - 1) * at(row, b - 1)
        + (a + b) * at(row, a) * at(row, b)
        - (b + 1) * at(row, a - 1) * at(row, b + 1)
        - (a + 1) * at(row, a + 1) * at(row, b - 1)
    )


def leaf2(A, C, a: int, b: int):
    return sp.expand(
        kernel2(add(A, shift(C)), a, b)
        - kernel2(A, a, b)
        - kernel2(C, a - 1, b - 1)
    )


def nested2(rows, a: int, b: int):
    """Twice [z^a w^b]N for a four-minor tuple."""
    E, U, V, W = rows
    return sp.expand(
        leaf2(add(E, shift(U)), add(V, shift(W)), a, b)
        - leaf2(E, V, a, b)
        - leaf2(U, W, a - 1, b - 1)
    )


def rcoefficient(rows, a: int, b: int):
    E, U, V, W = rows
    return sp.expand(
        at(W, a - 2) * at(E, b)
        + at(E, a) * at(W, b - 2)
        + at(V, a - 1) * at(U, b - 1)
        + at(U, a - 1) * at(V, b - 1)
    )


def generic_rows(prefix: str, degree: int = 6):
    return tuple(
        tuple(
            [sp.Integer(1)]
            + [sp.Symbol(f"{prefix}{name}{rank}") for rank in range(1, degree + 1)]
        )
        for name in "EUVW"
    )


def compact_pieces(C, H, rank: int):
    S = add_rows(C, H)
    A = sp.expand(
        2 * nested2(C, rank - 1, rank)
        + nested2(S, rank - 1, rank - 1)
        - nested2(H, rank - 1, rank - 1)
        - nested2(C, rank - 1, rank - 1)
    )
    B = sp.expand(
        2
        * (
            rcoefficient(S, rank - 1, rank - 1)
            - rcoefficient(H, rank - 1, rank - 1)
            - rcoefficient(S, rank - 2, rank)
            + rcoefficient(H, rank - 2, rank)
        )
    )
    return A, B


def choose2(value):
    return sp.expand(value * (value - 1) / 2)


def choose3(value):
    return sp.expand(value * (value - 1) * (value - 2) / 6)


def boolean_reduce(expression, *indicators):
    """Reduce a polynomial modulo x^2-x for each 0/1 indicator."""
    polynomial = sp.Poly(sp.expand(expression), *indicators)
    out = sp.Integer(0)
    for powers, coefficient in polynomial.terms():
        term = coefficient
        for indicator, power in zip(indicators, powers):
            if power:
                term *= indicator
        out += term
    return sp.expand(out)


def main() -> None:
    C = generic_rows("c")
    H = generic_rows("h")

    # Rank two: only the constant and linear coefficients survive.  Every
    # independence polynomial has constant coefficient one.  If D has n
    # vertices and the distinct marks u,v are present, the four linear
    # coefficients are n,n-1,n-1,n-2.
    A2, B2 = compact_pieces(C, H, 2)
    expected_A2_generic = (
        2 * sp.Symbol("cE1")
        + 2 * sp.Symbol("cU1")
        + 2 * sp.Symbol("cV1")
        - 6 * sp.Symbol("cW1")
        + 4
    )
    assert sp.expand(A2 - expected_A2_generic) == 0
    assert B2 == 6
    n = sp.Symbol("n", integer=True, nonnegative=True)
    A2_forest = sp.expand(
        A2.subs(
            {
                sp.Symbol("cE1"): n,
                sp.Symbol("cU1"): n - 1,
                sp.Symbol("cV1"): n - 1,
                sp.Symbol("cW1"): n - 2,
            }
        )
    )
    assert A2_forest == 12

    # Rank three forest invariants for D=B-{z,s}.
    m, du, dv, e = sp.symbols("m du dv e", integer=True, nonnegative=True)
    P, su, sv = sp.symbols("P su sv", integer=True, nonnegative=True)
    h, mh = sp.symbols("h mh", integer=True, nonnegative=True)
    hu, hv = sp.symbols("hu hv", integer=True, nonnegative=True)
    a, b = sp.symbols("a b", integer=True, nonnegative=True)

    # P=sum_x binom(deg_D(x),2), and su=sum_{x~u}(deg_D(x)-1),
    # with the analogous definition for sv.  The standard triangle-free
    # triple count is i_3(D)=C(n,3)-m(n-2)+P.
    E3 = choose3(n) - m * (n - 2) + P
    U3 = choose3(n - 1) - (m - du) * (n - 3) + P - choose2(du) - su
    V3 = choose3(n - 1) - (m - dv) * (n - 3) + P - choose2(dv) - sv

    c_subs = {
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("cE2"): choose2(n) - m,
        sp.Symbol("cU2"): choose2(n - 1) - m + du,
        sp.Symbol("cV2"): choose2(n - 1) - m + dv,
        sp.Symbol("cW2"): choose2(n - 2) - m + du + dv - e,
        sp.Symbol("cE3"): E3,
        sp.Symbol("cU3"): U3,
        sp.Symbol("cV3"): V3,
    }

    # a,b are the 0/1 indicators that the two marks survive in H=B-N[s].
    h_subs = {
        sp.Symbol("hE1"): h,
        sp.Symbol("hU1"): h - a,
        sp.Symbol("hV1"): h - b,
        sp.Symbol("hW1"): h - a - b,
        sp.Symbol("hE2"): choose2(h) - mh,
        sp.Symbol("hU2"): choose2(h - a) - mh + a * hu,
        sp.Symbol("hV2"): choose2(h - b) - mh + b * hv,
        sp.Symbol("hW2"): (
            choose2(h - a - b) - mh + a * hu + b * hv
        ),
    }

    A3_raw, B3_raw = compact_pieces(C, H, 3)
    A3 = sp.expand(A3_raw.subs(c_subs).subs(h_subs))
    B3 = sp.expand(B3_raw.subs(c_subs).subs(h_subs))

    # Reduce only by the exact Boolean relations a^2=a and b^2=b.
    A3 = boolean_reduce(A3, a, b)
    B3 = boolean_reduce(B3, a, b)
    expected_A3 = sp.expand(
        -12 * P
        + a * (2 + 6 * h - 6 * hu - 2 * n)
        + b * (2 + 6 * h - 6 * hv - 2 * n)
        + 4 * du**2
        + (-12 * n + 8) * du
        + 4 * dv**2
        + (-12 * n + 8) * dv
        + (8 * n + 4) * e
        - 2 * h**2
        + 4 * h * n
        + 2 * h
        + 8 * m * n
        - 20 * m
        + 4 * mh
        + 14 * n**2
        - 6 * n
        + 8 * su
        + 8 * sv
        - 4
    )
    expected_B3 = sp.expand(
        a * (2 + 2 * h - 2 * hu - 2 * n)
        + b * (2 + 2 * h - 2 * hv - 2 * n)
        - 4 * du
        - 4 * dv
        + 4 * h * n
        - 4 * h
        + 2 * n**2
        + 4 * n
        - 4
    )
    assert sp.expand(A3 - expected_A3) == 0
    assert sp.expand(B3 - expected_B3) == 0

    # Machine-check the algebra behind the two only nontrivial lower-bound
    # transformations.  Their signs use 0<=m<=n-1 and 0<=S<=n.
    S = sp.Symbol("S", integer=True, nonnegative=True)
    pm_after_P_bound = sp.expand(-12 * choose2(m) + 8 * m * n - 20 * m)
    assert sp.expand(
        pm_after_P_bound - m * (2 * n - 8) - 6 * m * (n - 1 - m)
    ) == 0
    degree_after_squares = sp.expand(2 * S**2 + (-12 * n + 8) * S)
    assert sp.expand(
        degree_after_squares
        - (-10 * n**2 + 8 * n)
        - 2 * (n - S) * (5 * n - 4 - S)
    ) == 0

    A3_floor_n_ge_4 = 4 * n**2 - 2 * n + 12
    A3_floor_n_2_3 = 4 * n**2 + 2 * n - 8
    B3_floor = 2 * n**2 - 4 * n + 4
    assert sp.expand(B3_floor - 2 * ((n - 1) ** 2 + 1)) == 0
    assert A3_floor_n_2_3.subs(n, 2) == 12
    assert A3_floor_n_2_3.subs(n, 3) == 34

    # For n=2,3, the edge-pair block can be mildly negative.  Directly
    # enumerate its exact lower polynomial m(8n-14-6m) over 0<=m<=n-1.
    small_edge_floors = {
        order: min(
            edges * (8 * order - 14 - 6 * edges)
            for edges in range(order)
        )
        for order in (2, 3)
    }
    assert small_edge_floors == {2: -4, 3: -4}

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_COMPACT_ORDINARY_PREFIX_R2_R3_SPLIT",
        "normalization": "All A_r, B_r, and floors are in doubled diagonal units.",
        "definitions": {
            "A_r": "diag((z+w)N(C)+2zw B_N(H,C))",
            "B_r": "diag(-(z-w)^2[R(C+H)-R(H)]/2)",
            "D": "B-{z,s}, with n vertices and m edges",
            "H": "B-N[s], with h vertices and mh edges",
            "a_b": "0/1 indicators that marked u,v survive in H",
            "P": "sum_x binom(deg_D(x),2)",
            "su_sv": "sum_(x~u)(deg_D(x)-1), and analogously for v",
        },
        "rank_2": {
            "A_2_generic": str(expected_A2_generic),
            "linear_minor_rows": ["n", "n-1", "n-1", "n-2"],
            "A_2": 12,
            "B_2": 6,
            "full_gap": 18,
        },
        "rank_3": {
            "A_3_exact_invariants": str(expected_A3),
            "B_3_exact_invariants": str(expected_B3),
            "A_3_floor_n_2_3": "4n^2+2n-8 (12 at n=2; 34 at n=3)",
            "A_3_floor_n_ge_4": "4n^2-2n+12",
            "B_3_floor_all_n_ge_2": "2n^2-4n+4=2[(n-1)^2+1]",
            "domain": (
                "Every ordinary cell has n>=2 because D contains the two "
                "distinct marks. The proof covers n=2,3 separately and "
                "all n>=4; no cutoff hypothesis is needed."
            ),
        },
        "forest_bounds": [
            "P<=binom(m,2), because P counts adjacent edge pairs",
            "m<=n-1",
            "du+dv<=n",
            "du^2+dv^2>=(du+dv)^2/2",
            "0<=h<=n and mh,su,sv,e>=0",
            "if a=1 then hu<=h-1; if a=0 its marked term vanishes",
            "the analogous statement holds for b,hv",
        ],
        "lower_bound_chain": {
            "edge_pair_block": (
                "-12P+8mn-20m >= m(8n-14-6m) "
                ">= m(2n-8)>=0 for n>=4"
            ),
            "small_edge_pair_block": (
                "For n=2,3 and integer 0<=m<=n-1, direct evaluation gives "
                "m(8n-14-6m)>=-4. Each A mark block is then >=0."
            ),
            "marked_degree_block": (
                "with S=du+dv<=n, it is >=-10n^2+8n; "
                "the residual is 2(n-S)(5n-4-S)"
            ),
            "each_A_mark_block": ">=8-2n",
            "each_B_mark_block": ">=4-2n",
        },
        "scope": (
            "Exact all-ordinary-cell theorem for ranks 2 and 3 only. It does not "
            "prove either compact piece for r>=4, the full strict prefix, "
            "forest ISO, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    report_sha256 = hashlib.sha256(raw.encode("utf-8")).hexdigest().upper()
    print(json.dumps(report, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", report_sha256)
    print(report["marker"])


if __name__ == "__main__":
    main()
