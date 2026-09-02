#!/usr/bin/env python3
"""Derive exact symbolic third-leaf cross terms for the ISO four-minor form.

This is an algebraic exploration helper.  It expands the ordinary third-leaf
polarization and the marked-support collision increments, then records compact
coefficient dictionaries that can be used for an exact forest positivity proof.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OFFSETS = range(-4, 3)


def row(name: str) -> dict[int, sp.Symbol]:
    return {k: sp.Symbol(f"{name}_{k:+d}") for k in OFFSETS}


def n_form(rank: sp.Expr, e, u, v, w) -> sp.Expr:
    return sp.expand(
        2 * rank * e[0] * w[-2]
        - (rank + 1) * e[1] * w[-3]
        + e[-1] * (2 * w[-3] - (rank + 1) * w[-1])
        + u[0] * (-(rank + 1) * v[-2] - w[-3])
        + u[-1] * (2 * rank * v[-1] + 2 * w[-2])
        + u[-2] * (-(rank + 1) * v[0] + 2 * v[-2] - w[-1])
        - v[0] * w[-3]
        + 2 * v[-1] * w[-2]
        - v[-2] * w[-1]
    )


def shifted_sum(a, b):
    return {k: a[k] + b[k - 1] for k in OFFSETS if k - 1 in b}


def shift_rank(row0):
    return {k: row0[k - 1] for k in OFFSETS if k - 1 in row0}


def monomial_terms(expr: sp.Expr) -> list[str]:
    return sorted(map(str, sp.Add.make_args(sp.expand(expr))))


def main() -> None:
    r = sp.Symbol("r", integer=True, positive=True)
    e0, u0, v0, w0 = (row(name) for name in ("E", "U", "V", "W"))
    es, us, vs, ws = (row(name) for name in ("e", "u", "v", "w"))

    full = [shifted_sum(a, b) for a, b in zip((e0, u0, v0, w0), (es, us, vs, ws))]
    ordinary = sp.expand(
        n_form(r, *full)
        - n_form(r, e0, u0, v0, w0)
        - n_form(r - 1, *(shift_rank(a) for a in (es, us, vs, ws)))
    )

    # A leaf attached at marked u.  In B, deleting u leaves the new leaf
    # isolated: E'=E+xU, U'=(1+x)U, V'=V+xW, W'=(1+x)W.
    collision_u_rows = (
        shifted_sum(e0, u0),
        shifted_sum(u0, u0),
        shifted_sum(v0, w0),
        shifted_sum(w0, w0),
    )
    collision_u = sp.expand(n_form(r, *collision_u_rows) - n_form(r, e0, u0, v0, w0))

    # The v-collision is obtained directly rather than trusting symmetry of
    # the displayed N form.
    collision_v_rows = (
        shifted_sum(e0, v0),
        shifted_sum(u0, w0),
        shifted_sum(v0, v0),
        shifted_sum(w0, w0),
    )
    collision_v = sp.expand(n_form(r, *collision_v_rows) - n_form(r, e0, u0, v0, w0))

    report = {
        "marker": "DERIVED_EXACT_ISO_FOUR_MINOR_THIRD_LEAF_CROSS_TERMS",
        "ordinary_term_count": len(sp.Add.make_args(ordinary)),
        "ordinary_terms": monomial_terms(ordinary),
        "collision_u_term_count": len(sp.Add.make_args(collision_u)),
        "collision_u_terms": monomial_terms(collision_u),
        "collision_v_term_count": len(sp.Add.make_args(collision_v)),
        "collision_v_terms": monomial_terms(collision_v),
        "ordinary_expression": str(ordinary),
        "collision_u_expression": str(collision_u),
        "collision_v_expression": str(collision_v),
    }
    Path("iso_four_minor_third_cross_symbolic_root_20260829.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(f"ordinary terms: {report['ordinary_term_count']}")
    print(ordinary)
    print(f"collision u terms: {report['collision_u_term_count']}")
    print(collision_u)
    print(f"collision v terms: {report['collision_v_term_count']}")
    print(collision_v)
    print(report["marker"])


if __name__ == "__main__":
    main()
