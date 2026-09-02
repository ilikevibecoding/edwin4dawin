#!/usr/bin/env python3
"""Exact symbolic probes for the rank-four N terminal families with isolates.

This is deliberately a probe: it derives the rank-four four-minor for

  * two disconnected rooted stars plus t isolated vertices; and
  * a connected two-ended broom plus t isolated vertices,

then inspects multivariate binomial-basis coefficients.  A PASS theorem is
not emitted unless a later proof script supplies a complete nonnegative
certificate and handles every short-path boundary.
"""

from __future__ import annotations

import json
from math import factorial
from pathlib import Path

import sympy as sp


def at(row: tuple[sp.Expr, ...], k: int) -> sp.Expr:
    return row[k] if 0 <= k < len(row) else sp.Integer(0)


def nminor(rows: tuple[tuple[sp.Expr, ...], ...], r: int = 4) -> sp.Expr:
    e, u, v, w = rows
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def choose(z: sp.Expr, k: int) -> sp.Expr:
    if k < 0:
        return sp.Integer(0)
    return sp.prod(z - j for j in range(k)) / factorial(k)


def one_plus_power(z: sp.Expr, maximum: int = 5) -> tuple[sp.Expr, ...]:
    return tuple(sp.expand(choose(z, k)) for k in range(maximum + 1))


def add(*rows: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return tuple(sp.expand(sum(at(row, k) for row in rows)) for k in range(len(rows[0])))


def shift(row: tuple[sp.Expr, ...], amount: int = 1) -> tuple[sp.Expr, ...]:
    return tuple(at(row, k - amount) for k in range(len(row)))


def multiply(a: tuple[sp.Expr, ...], b: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(at(a, j) * at(b, k - j) for j in range(k + 1)))
        for k in range(len(a))
    )


def star(leaves: sp.Expr) -> tuple[sp.Expr, ...]:
    return add(one_plus_power(leaves), shift(one_plus_power(0)))


def binomial_coefficients(expr: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict[tuple[int, ...], sp.Expr]:
    """Return the tensor Newton/binomial coefficients at the zero corner."""
    degrees = [sp.Poly(expr, variable).degree() for variable in variables]
    values: dict[tuple[int, ...], sp.Expr] = {}
    import itertools

    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for lower in itertools.product(*(range(i + 1) for i in index)):
            sign = (-1) ** sum(i - j for i, j in zip(index, lower))
            weight = sp.prod(sp.binomial(i, j) for i, j in zip(index, lower))
            value += sign * weight * expr.subs(dict(zip(variables, lower)))
        values[index] = sp.factor(value)
    reconstruction = sp.expand(
        sum(
            coefficient * sp.prod(choose(variable, index) for variable, index in zip(variables, multi))
            for multi, coefficient in values.items()
        )
    )
    residual = sp.expand(reconstruction - expr)
    if residual != 0:
        raise AssertionError(
            f"tensor binomial reconstruction failed; degrees={degrees}; "
            f"residual={sp.factor(residual)}"
        )
    return values


def path_row(order: sp.Expr, maximum: int = 5) -> tuple[sp.Expr, ...]:
    """Stable independence row of P_order: i_k=binom(order-k+1,k)."""
    return tuple(sp.expand(choose(order - k + 1, k)) for k in range(maximum + 1))


def two_stars_rows(a: sp.Symbol, b: sp.Symbol, t: sp.Symbol):
    iso = one_plus_power(t)
    sa, sb = star(a), star(b)
    pa, pb = one_plus_power(a), one_plus_power(b)
    return (
        multiply(multiply(sa, sb), iso),
        multiply(multiply(pa, sb), iso),
        multiply(multiply(sa, pb), iso),
        multiply(multiply(pa, pb), iso),
    )


def double_broom_rows(a: sp.Symbol, b: sp.Symbol, t: sp.Symbol, length: sp.Symbol):
    """Stable L>=8 rows for a two-ended broom whose marked path has L edges."""
    iso = one_plus_power(t)
    pa, pb = one_plus_power(a), one_plus_power(b)
    # Condition on the two marked endpoints.  For L>=4 these four states use
    # ordinary nonnegative-order paths with no boundary coalescence.
    p_internal = path_row(length - 1)
    p_one = path_row(length - 2)
    p_both = path_row(length - 3)
    e_core = add(
        multiply(multiply(pa, pb), p_internal),
        shift(multiply(pb, p_one)),
        shift(multiply(pa, p_one)),
        shift(shift(p_both)),
    )
    # Delete u: its a leaves become isolates.  The remaining path has L
    # vertices and b leaves at v; condition on v.
    u_core = add(
        multiply(multiply(pa, pb), path_row(length - 1)),
        shift(multiply(pa, path_row(length - 2))),
    )
    v_core = add(
        multiply(multiply(pa, pb), path_row(length - 1)),
        shift(multiply(pb, path_row(length - 2))),
    )
    w_core = multiply(multiply(pa, pb), path_row(length - 1))
    return tuple(multiply(row, iso) for row in (e_core, u_core, v_core, w_core))


def summarize_coefficients(coefficients: dict[tuple[int, ...], sp.Expr]) -> dict:
    negatives = []
    zeros = 0
    minimum_integer = None
    for index, value in coefficients.items():
        if value == 0:
            zeros += 1
        elif value.is_number:
            integer = int(value)
            minimum_integer = integer if minimum_integer is None else min(minimum_integer, integer)
            if integer < 0:
                negatives.append({"index": list(index), "value": str(value)})
        elif value.is_nonnegative is not True:
            negatives.append({"index": list(index), "value": str(value)})
    return {
        "count": len(coefficients),
        "zeros": zeros,
        "minimum_numeric": minimum_integer,
        "unresolved_or_negative_count": len(negatives),
        "first_unresolved_or_negative": negatives[:50],
    }


def main() -> None:
    a, b, t, x = sp.symbols("a b t x", integer=True, nonnegative=True)

    two_expr = sp.factor(nminor(two_stars_rows(a, b, t)))
    two_coefficients = binomial_coefficients(two_expr, (a, b, t))

    # Stable connected range L=8+x.  The shift is intentionally conservative
    # for a fixed rank-four expression; short L will be handled separately.
    connected_expr = sp.factor(nminor(double_broom_rows(a, b, t, 8 + x)))
    connected_coefficients = binomial_coefficients(connected_expr, (a, b, t, x))

    report = {
        "marker": "PROBE_EXACT_ISO_N4_TERMINAL_ISOLATES_ROOT",
        "two_rooted_stars_plus_isolates": {
            "factor": str(two_expr),
            "binomial_basis": summarize_coefficients(two_coefficients),
        },
        "connected_double_broom_plus_isolates_stable_L_ge_8": {
            "factor": str(connected_expr),
            "binomial_basis": summarize_coefficients(connected_coefficients),
        },
        "scope_guard": "Probe only; short connected path lengths and any unresolved coefficients remain to be proved.",
    }
    Path("iso_n4_terminal_isolates_probe_root_20260829.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
