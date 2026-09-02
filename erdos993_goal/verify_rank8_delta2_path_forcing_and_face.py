#!/usr/bin/env python3
"""Exact path forcing and path-face theorem for rank-eight terminal Delta2.

This removes the degree-surplus-zero face from the four-tensor relaxation and
shows why w-r coupling alone is insufficient on the first nonpath layer.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_source_curvatures import build
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def path_polynomial(order: sp.Expr, rank: int) -> sp.Expr:
    return choose_poly(order - rank + 1, rank)


def fixed_path_count(order: int, rank: int) -> sp.Integer:
    top = order - rank + 1
    return sp.Integer(math.comb(top, rank) if top >= rank >= 0 else 0)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    here = Path(__file__).resolve().parent
    n, excess, tau = sp.symbols("n excess tau", integer=True, nonnegative=True)

    # Exact motif-sensitive i3/i4 coordinates for every tree.
    i2 = choose_poly(n - 1, 2)
    path_i3 = choose_poly(n - 2, 3)
    path_i4 = choose_poly(n - 3, 4)
    i3 = path_i3 + excess
    i4 = path_i4 + (n - 4) * excess - tau
    w_joint = sp.factor(sp.combsimp(i2 / i3))
    r_joint = sp.factor(sp.combsimp(i3**2 / (i2 * i4)))
    w_path = sp.factor(sp.combsimp(i2 / path_i3))
    r_path = sp.factor(sp.combsimp(path_i3**2 / (i2 * path_i4)))
    w_nonpath_high = sp.factor(sp.combsimp(i2 / (path_i3 + 1)))
    w_gap = sp.factor(w_path - w_nonpath_high)
    assert sp.factor(w_path - 3 * (n - 1) / ((n - 4) * (n - 3))) == 0
    assert sp.factor(
        r_path
        - 4 * (n - 4) * (n - 3) * (n - 2)
        / (3 * (n - 6) * (n - 5) * (n - 1))
    ) == 0
    assert sp.factor(w_nonpath_high - 3 * (n - 2) / (n**2 - 8 * n + 18)) == 0
    assert sp.factor(
        w_gap - 18 / ((n - 4) * (n - 3) * (n**2 - 8 * n + 18))
    ) == 0

    # excess=sum_v C(deg(v)-1,2).  Thus excess=0 forces maximum degree at
    # most two, and a connected tree is exactly P_n.  At n=23 this fixes both
    # w and r, excluding the independent W=A=1 corner.
    order = sp.Integer(23)
    path_w_23 = sp.factor(w_path.subs(n, order))
    path_r_23 = sp.factor(r_path.subs(n, order))
    nonpath_w_23 = sp.factor(w_nonpath_high.subs(n, order))
    assert path_w_23 == sp.Rational(33, 190)
    assert path_r_23 == sp.Rational(2660, 1683)
    assert nonpath_w_23 == sp.Rational(21, 121)

    # Reconstruct the two exact relaxed points on k=1/lower-cross.
    relaxed, (source_n, source_w, source_x, U, V, Z) = build(1, "lcross")
    loose_r = sp.Rational(760, 471)
    loose_x = sp.factor(path_w_23 * loose_r)
    loose_value = sp.factor(
        relaxed.subs(
            {
                source_n: order,
                source_w: path_w_23,
                source_x: loose_x,
                U: 0,
                V: 1,
                Z: 0,
            }
        )
    )
    expected_loose = sp.Rational(
        -46118001266220013471262329145921153,
        3615139476355047704526848000,
    )
    assert loose_x == sp.Rational(44, 157)
    assert loose_value == expected_loose and loose_value < 0

    path_x_23 = sp.factor(path_w_23 * path_r_23)
    path_r_forced_value = sp.factor(
        relaxed.subs(
            {
                source_n: order,
                source_w: path_w_23,
                source_x: path_x_23,
                U: 0,
                V: 1,
                Z: 0,
            }
        )
    )
    expected_path_r_forced = sp.Rational(
        -199557257973988854307436556711,
        13073164910200750243840,
    )
    assert path_x_23 == sp.Rational(14, 51)
    assert path_r_forced_value == expected_path_r_forced and path_r_forced_value < 0

    # But the w endpoint forces all path coefficients, not only r.  The U=0
    # relaxed point has the wrong normalized c5.
    d4_low = sp.factor((2 + path_x_23) / 10)
    relaxed_c5 = sp.factor((1 - d4_low) / path_x_23**2)
    actual_path_c5 = sp.factor(sp.binomial(19, 5) / sp.binomial(21, 3))
    assert relaxed_c5 == sp.Rational(10047, 980)
    assert actual_path_c5 == sp.Rational(306, 35)
    assert relaxed_c5 != actual_path_c5

    # Close the complete actual path face, every root and every n>=23.  By
    # symmetry write A-q=P_l union P_r with l<=r.
    delta2 = sp.expand(newton_coefficients(residual())[2])
    path_c = {c[rank]: path_polynomial(n, rank) for rank in range(9)}
    m = sp.symbols("m", nonnegative=True)
    boundary_rows = []
    for left in range(6):
        def deletion_count(rank: int) -> sp.Expr:
            return sp.expand(
                sum(
                    fixed_path_count(left, j)
                    * path_polynomial(n - 1 - left, rank - j)
                    for j in range(rank + 1)
                )
            )

        expression = sp.factor(
            delta2.subs(
                {
                    **path_c,
                    h[6]: deletion_count(6),
                    h[7]: deletion_count(7),
                },
                simultaneous=True,
            )
        )
        shifted = sp.Poly(sp.expand(expression.subs(n, m + 23)), m)
        assert all(value > 0 for value in shifted.all_coeffs())
        boundary_rows.append(
            {
                "left_order": left,
                "right_order": f"n-1-{left}",
                "shift": "n=m+23",
                "degree": shifted.degree(),
                "terms": len(shifted.terms()),
                "minimum_coefficient": str(min(shifted.all_coeffs())),
            }
        )

    left, d = sp.symbols("left d", nonnegative=True)
    interior_h = {}
    for rank in (6, 7):
        interior_h[rank] = sp.expand(
            sum(
                path_polynomial(left, j)
                * path_polynomial(n - 1 - left, rank - j)
                for j in range(rank + 1)
            )
        )
    interior_expression = sp.factor(
        delta2.subs(
            {**path_c, h[6]: interior_h[6], h[7]: interior_h[7]},
            simultaneous=True,
        )
    )
    L = sp.symbols("L", nonnegative=True)
    # left=L+6 and right=left+d, so n=2L+13+d.
    interior_shifted = sp.Poly(
        sp.expand(interior_expression.subs({left: L + 6, n: 2 * L + 13 + d})),
        L,
        d,
    )
    assert all(value > 0 for value in interior_shifted.coeffs())

    # The first nonpath layer has excess=1, hence exactly one degree-3 vertex:
    # a subdivided claw.  If s arms have length one, tau=3-s is 1,2,or3 for
    # n=23.  Even these exact w-r lattice points remain negative when c5 and
    # later data are left at U=0,V=1,k=1, proving w-r coupling alone is not
    # enough.
    e1_rows = []
    expected_e1 = {
        1: sp.Rational(
            -466565099128088504523847552359340577862520390610934134102037947433,
            29816112424637191926744463536962679132402894884849111168000,
        ),
        2: sp.Rational(
            -5068189680190929499193066147146102530794034423,
            324442738979785468198081422422913300544,
        ),
        3: sp.Rational(
            -193654067656729943050918419614181090675127436753601981780276009,
            12418205924463636787482075608897409051396457677987968000,
        ),
    }
    I2_23 = sp.binomial(22, 2)
    I3_e1 = sp.binomial(21, 3) + 1
    for tau_value in (1, 2, 3):
        I4_e1 = sp.binomial(20, 4) + 19 - tau_value
        w_value = sp.factor(I2_23 / I3_e1)
        x_value = sp.factor(I3_e1 / I4_e1)
        r_value = sp.factor(x_value / w_value)
        value = sp.factor(
            relaxed.subs(
                {
                    source_n: order,
                    source_w: w_value,
                    source_x: x_value,
                    U: 0,
                    V: 1,
                    Z: 0,
                }
            )
        )
        assert value == expected_e1[tau_value] and value < 0
        e1_rows.append(
            {
                "tau": tau_value,
                "w": str(w_value),
                "x": str(x_value),
                "r": str(r_value),
                "relaxed_Delta2": str(value),
            }
        )

    payload = {
        "status": "PASS_EXACT_RANK8_DELTA2_PATH_FACE_AND_DEGREE_SURPLUS_SPLIT",
        "scope": "closes Delta2 for every rooted path core P_n, n>=23, and designs the exact nonpath face; does not prove Delta2 for all trees",
        "tree_motif_coordinates": {
            "excess": "sum_v C(deg(v)-1,2)",
            "tau": "number of connected three-edge subtrees minus (n-3)",
            "i2": str(i2),
            "i3": str(i3),
            "i4": str(i4),
            "w": str(w_joint),
            "r": str(r_joint),
        },
        "path_forcing": {
            "reason": "excess=0 forces maximum degree at most two, hence A=P_n",
            "w_path": str(w_path),
            "r_path": str(r_path),
            "n23_w": str(path_w_23),
            "n23_r": str(path_r_23),
            "n23_x": str(path_x_23),
            "actual_normalized_c5": str(actual_path_c5),
        },
        "all_order_path_face_certificate": {
            "boundary_root_cases": boundary_rows,
            "interior_coordinates": "left=L+6, right=left+d, n=2L+13+d",
            "interior_degrees": list(interior_shifted.degree_list()),
            "interior_terms": len(interior_shifted.terms()),
            "interior_minimum_coefficient": str(min(interior_shifted.coeffs())),
            "conclusion": "Delta2>0 for every root of every P_n with n>=23",
        },
        "relaxed_path_point_exclusions": {
            "independent_r_corner": {
                "coordinates": "n=23,w=33/190,r=760/471,x=44/157,k=1,U=0,V=1,Z=0",
                "Delta2": str(loose_value),
                "exclusion": "w=33/190 forces r=2660/1683",
            },
            "after_exact_r": {
                "coordinates": "n=23,w=33/190,r=2660/1683,x=14/51,k=1,U=0,V=1,Z=0",
                "Delta2": str(path_r_forced_value),
                "relaxed_normalized_c5": str(relaxed_c5),
                "actual_path_normalized_c5": str(actual_path_c5),
                "exclusion": "w endpoint forces the full path coefficient jet; U=0 has the wrong c5",
            },
            "classification": "relaxed-jet obstructions only; not path or tree counterexamples",
        },
        "nonpath_face": {
            "condition": "excess>=1",
            "w_upper": str(w_nonpath_high),
            "gap_below_path": str(w_gap),
            "n23_w_upper": str(nonpath_w_23),
            "e1_structure": "subdivided claw; tau in {1,2,3}",
            "e1_exact_w_r_rows": e1_rows,
            "next_required_coupling": "retain c5 (then c6,c7 and rooted deletion h6,h7) as motif/path data; w-r or excess-tau alone is insufficient",
        },
        "warning": "Only the path face is closed. The nonpath Delta2 tensors remain unsigned.",
    }
    output = here / "rank8_delta2_path_forcing_and_face_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
