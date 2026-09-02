#!/usr/bin/env python3
"""Derive path-plus-isolates coefficients directly in binomial basis.

This avoids evaluating the terminal gap at t=0,...,j.  A residual
moment row after adjoining t isolates has exact binomial layers

  N[j] = n_(k-j),
  S[j] = s_(k-j) + j n_(k-j+1),
  H[j] = h_(k-j) + 2j s_(k-j+1)
         + j n_(k-j+1) + j(j-1)n_(k-j+2),
  C[j] = c_(k-j) + j n_(k-j+1).

Products use the nonnegative linearization

  binom(t,a)binom(t,b)
    = sum_k k!/((a+b-k)!(k-a)!(k-b)!) binom(t,k).

The resulting engine propagates a truncated binomial series through
the complete terminal phase identity and returns c_(q,j)(L)
directly.  It is both faster at high layers and records the subset-
union structure needed for a possible uniform proof in j.
"""

from __future__ import annotations

import argparse
import functools
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_bare_path_terminal_phase_gap import path_row


Series = tuple[sp.Expr, ...]


def zero_series(maximum: int) -> Series:
    return tuple(sp.Integer(0) for _ in range(maximum + 1))


def constant_series(value: sp.Expr, maximum: int) -> Series:
    return (value,) + tuple(
        sp.Integer(0) for _ in range(maximum)
    )


def add(*values: Series) -> Series:
    return tuple(
        sum(items)
        for items in zip(*values, strict=True)
    )


def neg(value: Series) -> Series:
    return tuple(-item for item in value)


def sub(left: Series, *right: Series) -> Series:
    return add(left, *(neg(value) for value in right))


def scale(value: Series, scalar: sp.Expr) -> Series:
    return tuple(scalar * item for item in value)


def multiply(left: Series, right: Series) -> Series:
    maximum = len(left) - 1
    assert len(right) == maximum + 1
    result = [sp.Integer(0) for _ in range(maximum + 1)]
    for a, left_value in enumerate(left):
        if left_value == 0:
            continue
        for b, right_value in enumerate(right):
            if right_value == 0:
                continue
            for union in range(
                max(a, b), min(a + b, maximum) + 1
            ):
                coefficient = sp.factorial(union) / (
                    sp.factorial(a + b - union)
                    * sp.factorial(union - a)
                    * sp.factorial(union - b)
                )
                result[union] += (
                    coefficient * left_value * right_value
                )
    return tuple(result)


@functools.cache
def path_row_series(
    order: sp.Expr,
    rank: sp.Expr,
    maximum: int,
) -> tuple[Series, Series, Series, Series]:
    rows = {
        shift: path_row(order, rank - shift)
        for shift in range(maximum + 1)
    }

    def count(shift: int) -> sp.Expr:
        if shift < 0:
            return sp.Integer(0)
        if shift not in rows:
            rows[shift] = path_row(order, rank - shift)
        return rows[shift][0]

    counts = []
    masses = []
    squares = []
    components = []
    for layer in range(maximum + 1):
        n, s, h, c = rows[layer]
        previous_mass = (
            rows[layer - 1][1]
            if layer >= 1
            else sp.Integer(0)
        )
        counts.append(n)
        masses.append(s + layer * count(layer - 1))
        squares.append(
            h
            + 2 * layer * previous_mass
            + layer * count(layer - 1)
            + layer * (layer - 1) * count(layer - 2)
        )
        components.append(c + layer * count(layer - 1))
    return tuple(
        tuple(sp.expand(value) for value in sequence)
        for sequence in (counts, masses, squares, components)
    )


def core_blocks(
    q: sp.Expr,
    A: tuple[Series, ...],
    M: tuple[Series, ...],
    P: tuple[Series, ...],
) -> dict[str, Series]:
    N, S, H, C, X, Y, HX = A
    m_count, T, J2, D = M
    p_count, U, K2, E = P
    root = scale(multiply(X, sub(N, X)), -4)
    phi = scale(
        add(
            scale(multiply(m_count, sub(S, HX)), 2),
            scale(multiply(sub(N, X), T), -2),
            multiply(m_count, add(X, Y)),
        ),
        4,
    )
    psi = scale(
        add(
            scale(multiply(N, p_count), 2 * (q - 3)),
            multiply(p_count, C),
            scale(multiply(p_count, Y), 2),
            multiply(N, E),
            neg(
                multiply(
                    p_count,
                    add(H, scale(HX, 4), scale(X, 4)),
                )
            ),
            neg(multiply(N, K2)),
            scale(multiply(add(S, scale(X, 2)), U), 2),
        ),
        2,
    )
    chi = scale(
        add(
            scale(
                multiply(m_count, p_count),
                2 * q - 6,
            ),
            multiply(p_count, D),
            multiply(m_count, E),
            neg(multiply(p_count, J2)),
            neg(multiply(m_count, K2)),
            scale(multiply(p_count, T), -2),
            scale(multiply(T, U), 2),
            scale(multiply(m_count, U), 2),
        ),
        2,
    )
    return {
        "root": root,
        "phi": phi,
        "psi": psi,
        "chi": chi,
        "mass": scale(multiply(m_count, m_count), 8),
    }


def terminal_series(
    q: sp.Expr,
    length: sp.Expr,
    maximum: int,
    *,
    return_states: bool = False,
):
    def prow(order, rank):
        return path_row_series(order, rank, maximum)

    def pcount(order, rank):
        return prow(order, rank)[0]

    N, S, H, C = prow(length + 1, q)
    X = pcount(length, q)
    root_residual = pcount(length - 1, q)
    Y = sub(X, root_residual)
    HX = add(prow(length, q)[1], root_residual)
    old_a = (N, S, H, C, X, Y, HX)
    old_m = prow(length, q - 1)
    old_p = prow(length, q - 2)

    support_absent = pcount(length, q)
    support_residual = pcount(length - 1, q)
    support_hit = sub(support_absent, support_residual)
    support_absent_mass = add(
        prow(length, q)[1], support_residual
    )
    root_support_absent = pcount(length - 1, q)

    lower_n, lower_s, lower_h, lower_c = prow(
        length, q - 1
    )
    lower_x = pcount(length - 1, q - 1)
    lower_root_residual = pcount(length - 2, q - 1)
    lower_y = sub(lower_x, lower_root_residual)
    lower_hx = add(
        prow(length - 1, q - 1)[1],
        lower_root_residual,
    )
    lower_a = (
        lower_n,
        lower_s,
        lower_h,
        lower_c,
        lower_x,
        lower_y,
        lower_hx,
    )
    lower_m = prow(length - 1, q - 2)
    lower_p = prow(length - 1, q - 3)

    M, T, J2, D = old_m
    A1 = pcount(length - 1, q - 1)
    residual1 = pcount(length - 2, q - 1)
    B1 = sub(A1, residual1)
    HA1 = add(prow(length - 1, q - 1)[1], residual1)
    m, u, k2, e = lower_m

    P, U, K2, E = old_p
    A2 = pcount(length - 1, q - 2)
    residual2 = pcount(length - 2, q - 2)
    B2 = sub(A2, residual2)
    HA2 = add(prow(length - 1, q - 2)[1], residual2)
    p, V, L2, F = lower_p

    new_a = (
        add(N, lower_n),
        add(S, support_absent, lower_s),
        add(
            H,
            scale(support_absent_mass, 2),
            support_absent,
            lower_h,
        ),
        add(C, support_hit, lower_c),
        add(X, lower_x),
        add(Y, lower_y),
        add(HX, root_support_absent, lower_hx),
    )
    new_m = (
        add(M, m),
        add(T, A1, u),
        add(J2, scale(HA1, 2), A1, k2),
        add(D, B1, e),
    )
    new_p = (
        add(P, p),
        add(U, A2, V),
        add(K2, scale(HA2, 2), A2, L2),
        add(E, B2, F),
    )

    if return_states:
        return {
            "new": (q, new_a, new_m, new_p),
            "old": (q, old_a, old_m, old_p),
            "lower": (q - 1, lower_a, lower_m, lower_p),
        }
    old_blocks = core_blocks(q, old_a, old_m, old_p)
    lower_blocks = core_blocks(
        q - 1, lower_a, lower_m, lower_p
    )
    new_blocks = core_blocks(q, new_a, new_m, new_p)
    total = zero_series(maximum)
    for name in old_blocks:
        total = add(
            total,
            sub(
                new_blocks[name],
                old_blocks[name],
                lower_blocks[name],
            ),
        )
    return total


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--layer", type=int, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    layer = args.layer
    if layer < 0:
        raise ValueError("layer must be nonnegative")
    output = args.output or Path(
        f"path_isolate_layer_{layer}_direct_20260730.json"
    )
    q, length, x, r = sp.symbols(
        "q L x r", integer=True, nonnegative=True
    )
    print("propagating binomial layers", flush=True)
    coefficient = terminal_series(q, length, layer)[layer]
    print("shifting stable path range", flush=True)
    shifted = sp.factor(
        sp.combsimp(
            sp.expand(
                coefficient.subs(length, 2 * q - 4 + x)
            )
        )
    )
    print("normalizing stable range", flush=True)
    positive_factor = (
        2
        * sp.factorial(q + x - 4)
        * sp.factorial(q + x - 2)
        / (
            sp.factorial(q)
            * sp.factorial(q - 2)
            * sp.factorial(x + 2 * layer)
            * sp.factorial(x + 2 * layer + 2)
        )
    )
    remainder = sp.factor(sp.cancel(shifted / positive_factor))
    shifted_remainder = sp.factor(
        sp.cancel(
            sp.expand_func(
                sp.combsimp(
                    sp.gammasimp(remainder.subs(q, r + 4))
                )
            )
        )
    )
    numerator, denominator = map(
        sp.factor, sp.fraction(shifted_remainder)
    )
    numerator_poly = sp.Poly(sp.expand(numerator), r, x)
    denominator_poly = sp.Poly(sp.expand(denominator), r, x)
    numerator_terms = numerator_poly.terms()
    denominator_terms = denominator_poly.terms()
    numerator_negative = [
        (monomial, value)
        for monomial, value in numerator_terms
        if value < 0
    ]
    denominator_negative = [
        (monomial, value)
        for monomial, value in denominator_terms
        if value < 0
    ]
    canonical = "\n".join(
        f"{monomial}:{value}"
        for monomial, value in numerator_terms
    )
    passed = not numerator_negative and not denominator_negative
    report = {
        "status": (
            f"PASS_PATH_ISOLATE_LAYER_{layer}_DIRECT"
            if passed
            else f"FAIL_PATH_ISOLATE_LAYER_{layer}_DIRECT"
        ),
        "isolate_binomial_layer": layer,
        "theorem_if_pass": (
            f"c_(q,{layer})(L)>=0 for q>=4 and L>=2q-4"
        ),
        "derivation": (
            "direct truncated binomial-series propagation using the "
            "nonnegative subset-union product linearization"
        ),
        "coefficient_c_qj_unfactored": str(coefficient),
        "positive_factor": str(positive_factor),
        "remainder_in_q_x": str(remainder),
        "rank_shift": "q=4+r",
        "remainder_numerator_in_r_x": str(numerator),
        "remainder_denominator_in_r_x": str(denominator),
        "numerator_degree_r_x": list(
            numerator_poly.degree_list()
        ),
        "numerator_nonzero_monomial_count": len(
            numerator_terms
        ),
        "negative_numerator_coefficient_count": len(
            numerator_negative
        ),
        "negative_denominator_coefficient_count": len(
            denominator_negative
        ),
        "smallest_numerator_coefficient": (
            min(int(value) for _, value in numerator_terms)
            if numerator_terms
            else None
        ),
        "canonical_numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
