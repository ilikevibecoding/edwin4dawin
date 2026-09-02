#!/usr/bin/env python3
"""Exact symbolic bridge-extension cells for the thin e=2 double claw.

The source has four pendant lengths one and bridge length g>=18, hence order
g+5>=23.  This is a scoped all-order family, not the full e=2 theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import (
    claw_count,
    path_count,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
RANKS = (0, 1, 2, 3)
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
DELTA = {
    rank: sp.expand(newton_coefficients(residual())[rank]) for rank in RANKS
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(*vectors):
    return [sp.expand(sum(vector[k] for vector in vectors)) for k in range(9)]


def multiply(left, right):
    return [
        sp.expand(sum(left[j] * right[k - j] for j in range(k + 1)))
        for k in range(9)
    ]


def path(order):
    return [path_count(order, rank) for rank in range(9)]


def shift(vector):
    return [sp.Integer(0)] + vector[:8]


def two_arm_states(first, second):
    excluded = multiply(path(first), path(second))
    included = shift(multiply(path(first - 1), path(second - 1)))
    return excluded, included


def double_claw(left_a, left_b, bridge, right_a, right_b):
    left0, left1 = two_arm_states(left_a, left_b)
    right0, right1 = two_arm_states(right_a, right_b)
    return add(
        multiply(multiply(left0, right0), path(bridge - 1)),
        multiply(multiply(left1, right0), path(bridge - 2)),
        multiply(multiply(left0, right1), path(bridge - 2)),
        multiply(multiply(left1, right1), path(bridge - 3)),
    )


def claw_vector(arms):
    return [claw_count(arms, rank) for rank in range(9)]


def value(rank, core, deleted):
    substitutions = {
        **{c[k]: core[k] for k in range(3, 9)},
        h[6]: deleted[6],
        h[7]: deleted[7],
    }
    return sp.expand(DELTA[rank].subs(substitutions, simultaneous=True))


def signs(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    negative = len([coefficient for coefficient in coefficients if coefficient < 0])
    zero = len([coefficient for coefficient in coefficients if coefficient == 0])
    constant = polynomial.coeff_monomial((0,) * len(variables))
    return {
        "degrees": list(polynomial.degree_list()),
        "terms": len(polynomial.terms()),
        "negative": negative,
        "zero": zero,
        "positive": len(coefficients) - negative - zero,
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(constant),
    }


def main() -> None:
    G = sp.symbols("G", integer=True, nonnegative=True)
    old_g = G + 18
    new_g = old_g + 1
    old_core = double_claw(1, 1, old_g, 1, 1)
    new_core = double_claw(1, 1, new_g, 1, 1)

    # Existing branch root; deleting it leaves two isolated pendant vertices
    # and a claw at the other branch with bridge arm g-1.
    old_branch_h = multiply(multiply(path(1), path(1)), claw_vector((1, 1, old_g - 1)))
    new_branch_h = multiply(multiply(path(1), path(1)), claw_vector((1, 1, new_g - 1)))

    # Existing pendant leaf root; deleting it simply sets that arm length to 0.
    old_leaf_h = double_claw(0, 1, old_g, 1, 1)
    new_leaf_h = double_claw(0, 1, new_g, 1, 1)

    # Inserted bridge root: the new vertex is placed in the final source edge,
    # so deletion gives the left prefix claw times the right two-arm branch.
    inserted_h = multiply(claw_vector((1, 1, old_g - 1)), claw_vector((1, 1, 0)))

    rows = []
    for label, old_h, new_h in (
        ("existing_branch_root_increment", old_branch_h, new_branch_h),
        ("existing_pendant_leaf_root_increment", old_leaf_h, new_leaf_h),
    ):
        rank_rows = {}
        for rank in RANKS:
            expression = value(rank, new_core, new_h) - value(rank, old_core, old_h)
            rank_rows[str(rank)] = signs(expression, (G,))
        rows.append({"cell": label, "variables": ["G"], "ranks": rank_rows})

    rank_rows = {
        str(rank): signs(value(rank, new_core, inserted_h), (G,))
        for rank in RANKS
    }
    rows.append(
        {"cell": "inserted_bridge_root_value", "variables": ["G"], "ranks": rank_rows}
    )

    # Every internal bridge root has x,y>=0 vertices strictly between it and
    # the two branches.  Source g=x+y+2 and n=x+y+7, so n>=23 iff x+y>=16.
    # A symbolic path order must start at 7 for ranks through 8.  Therefore
    # split each of x,y into literal short 0..6 or symbolic long X+7.  With
    # both long, the residual offset sum is at least 2 and is covered by
    # shifting x or y by 1.  With exactly one long and other short s, shift
    # the long coordinate by the exact 9-s.  Two short coordinates cannot
    # meet x+y>=16.
    X, Y = sp.symbols("X Y", integer=True, nonnegative=True)
    internal_cells = [
        ("both_long_x_offset_ge_1", X + 8, Y + 7, (X, Y)),
        ("both_long_y_offset_ge_1", X + 7, Y + 8, (X, Y)),
    ]
    for short in range(7):
        internal_cells.append(
            (f"x_long_y_short_{short}", X + 16 - short, short, (X,))
        )
        internal_cells.append(
            (f"x_short_{short}_y_long", short, Y + 16 - short, (Y,))
        )
    for label, x, y, variables in internal_cells:
        bridge = x + y + 2
        core0 = double_claw(1, 1, bridge, 1, 1)
        core1 = double_claw(1, 1, bridge + 1, 1, 1)
        deleted0 = multiply(claw_vector((1, 1, x)), claw_vector((1, 1, y)))
        deleted1 = multiply(claw_vector((1, 1, x)), claw_vector((1, 1, y + 1)))
        rank_rows = {}
        for rank in RANKS:
            expression = value(rank, core1, deleted1) - value(rank, core0, deleted0)
            rank_rows[str(rank)] = signs(expression, variables)
        rows.append(
            {
                "cell": f"existing_internal_bridge_root_increment_{label}",
                "variables": [str(variable) for variable in variables],
                "ranks": rank_rows,
            }
        )

    bad = [
        {"cell": row["cell"], "rank": rank, "signs": row["ranks"][str(rank)]}
        for row in rows
        for rank in RANKS
        if row["ranks"][str(rank)]["negative"]
        or sp.Rational(row["ranks"][str(rank)]["constant_coefficient"]) <= 0
    ]
    payload = {
        "schema": "rank8-delta013-e2-thin-bridge-extension-all-order-v1",
        "status": (
            "PASS_EXACT_RANK8_DELTA013_E2_THIN_BRIDGE_EXTENSION_ALL_ORDER"
            if not bad
            else "POWER_BASIS_METHOD_OBSTRUCTION"
        ),
        "scope": (
            "source double claws (1,1,g,1,1), g>=18/order>=23; bridge length "
            "extension; both branch roots, all four pendant-leaf roots, every "
            "internal bridge root, and the inserted bridge root; Delta0..3"
        ),
        "core_identity": (
            "I=D00*P_(g-1)+(D10+D01)*P_(g-2)+D11*P_(g-3), with branch "
            "endpoint states D_ij"
        ),
        "internal_root_no_gap": (
            "x,y are literal short 0..6 or symbolic long X+7; both long use "
            "the two offset>=1 cells, exactly one long and short s uses long "
            "shift 9-s, and two short cannot satisfy x+y>=16"
        ),
        "cells": rows,
        "bad_rank_cells": bad,
        "warning": (
            "The earlier two-cell unsafe continuation report SHA256 "
            "8977E684CE2C2830B8002FF0C294D83B2D9352A384AC9FFBC719679F06737447 "
            "is withdrawn and superseded. Any negative power coefficient here is "
            "only a symbolic-method obstruction; it is not a negative literal value "
            "or tree counterexample."
        ),
    }
    output = HERE / "rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("bad_rank_cells", len(bad))
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
