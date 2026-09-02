#!/usr/bin/env python3
"""Exact all-order positivity of the consecutive path CD quotient.

For P_0=1, P_1=1+x, P_m=P_{m-1}+xP_{m-2}, define

  H_m(z,w) = (P_m(z)P_{m-1}(w)-P_m(w)P_{m-1}(z))/(z-w).

The exact recurrence

  H_1=H_2=1,
  H_m=P_{m-2}(z)P_{m-2}(w)+zw H_{m-2}

proves coefficientwise nonnegativity for every m.  The script verifies the
symbolic derivation from the path recurrence and performs a literal exact
coefficient replay through the requested finite audit range.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


z, w = sp.symbols("z w")


def path_poly(order: int, x: sp.Symbol) -> sp.Expr:
    assert order >= 0
    if order == 0:
        return sp.Integer(1)
    older, old = sp.Integer(1), 1 + x
    for _ in range(2, order + 1):
        older, old = old, sp.expand(old + x * older)
    return old


def quotient(order: int) -> sp.Expr:
    assert order >= 1
    numerator = sp.expand(
        path_poly(order, z) * path_poly(order - 1, w)
        - path_poly(order, w) * path_poly(order - 1, z)
    )
    q, rem = sp.div(numerator, z - w, z, w)
    assert rem == 0
    return sp.expand(q)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=80)
    args = parser.parse_args()
    assert args.max_order >= 2

    # Generic algebra: with A=P_(m-1), B=P_(m-2), C=P_(m-3), use
    # A=B+xC and P_m=A+xB.  The displayed numerator reduces exactly to
    # (z-w)[B(z)B(w)+zw H_(m-2)].
    Az, Aw, Bz, Bw, Cz, Cw, H = sp.symbols(
        "Az Aw Bz Bw Cz Cw H"
    )
    generic_left = sp.expand(
        (Az + z * Bz) * Aw - (Aw + w * Bw) * Az
    )
    assumptions = {Az: Bz + z * Cz, Aw: Bw + w * Cw}
    generic_left = sp.expand(generic_left.subs(assumptions))
    # H represents (Bz*Cw-Bw*Cz)/(z-w).
    generic_right = sp.expand((z - w) * (Bz * Bw + z * w * H))
    generic_left = sp.expand(
        generic_left.subs(Bz * Cw, Bw * Cz + (z - w) * H)
    )
    assert sp.expand(generic_left - generic_right) == 0

    stream = hashlib.sha256()
    coefficient_checks = 0
    recurrence_checks = 0
    minimum = None
    rows: dict[int, sp.Expr] = {}
    for order in range(1, args.max_order + 1):
        row = quotient(order)
        rows[order] = row
        poly = sp.Poly(row, z, w)
        for (i, j), value in poly.terms():
            value = int(value)
            coefficient_checks += 1
            assert value >= 0
            cell = (value, order, i, j)
            minimum = cell if minimum is None or cell < minimum else minimum
            stream.update(f"C,{order},{i},{j},{value};".encode())
        if order >= 3:
            rhs = sp.expand(
                path_poly(order - 2, z) * path_poly(order - 2, w)
                + z * w * rows[order - 2]
            )
            assert sp.expand(row - rhs) == 0
            recurrence_checks += 1
            stream.update(f"R,{order},{sp.srepr(row)};".encode())

    # The quotient used in the double-broom calculation is exactly H_(m+1).
    bridge_checks = 0
    for order in range(1, args.max_order):
        Pm_z, Pm_w = path_poly(order, z), path_poly(order, w)
        Pprev_z, Pprev_w = path_poly(order - 1, z), path_poly(order - 1, w)
        numerator = sp.expand(w * Pm_z * Pprev_w - z * Pm_w * Pprev_z)
        q, rem = sp.div(numerator, w - z, z, w)
        assert rem == 0
        assert sp.expand(q - rows[order + 1]) == 0
        bridge_checks += 1

    report = {
        "marker": "PASS_EXACT_ALL_ORDER_CONSECUTIVE_PATH_CD_COEFFICIENT_POSITIVITY",
        "theorem": (
            "H_m=(P_m(z)P_(m-1)(w)-P_m(w)P_(m-1)(z))/(z-w) "
            "has nonnegative integer coefficients for every m>=1"
        ),
        "exact_recurrence": (
            "H_1=H_2=1; H_m=P_(m-2)(z)P_(m-2)(w)+zw H_(m-2)"
        ),
        "generic_symbolic_derivation": True,
        "finite_literal_audit_max_order": args.max_order,
        "coefficient_checks": coefficient_checks,
        "recurrence_checks": recurrence_checks,
        "double_broom_bridge_checks": bridge_checks,
        "minimum_nonzero_coefficient_cell": minimum,
        "value_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "This proves only the consecutive-path CD quotient lemma. It does "
            "not by itself prove the double-broom four-minor, forest ISO, or "
            "Erdos Problem 993."
        ),
    }
    output = Path("path_consecutive_cd_positivity_exact_agent_20260829.json")
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
