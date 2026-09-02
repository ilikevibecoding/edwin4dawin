#!/usr/bin/env python3
"""Probe the exact shifted-triangle symbols suggested by master composition.

For the group target, the coefficient split forced by kappa=(d,2) is

  P_(k+s,s) = a_s (k+1)_s p_s^(k),
  Q_(l+s,2-s) = (-1)^s a_s (l+1)_s p_s^(l),

where a_s=sqrt((d-2s)!/d!).  Reversal in the state variable carries P to
Q, so the missing question is whether P is stable.  This script searches
positive-direction affine lines for a decisive obstruction.
"""

from __future__ import annotations

import random

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


Z, U, T = sp.symbols("z u t")


def jensen(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(
        sum(sp.binomial(order, k) * sp.diff(poly, X, k) * Z**k
            for k in range(order + 1))
    )


def shifted_triangle(N: int, d: int, signed: bool = False) -> sp.Expr:
    seeds = [hypergeometric_form(N - s, 1) for s in range(3)]
    result = 0
    for s, seed in enumerate(seeds):
        scale = sp.binomial(2, s) * sp.sqrt(
            sp.factorial(d) * sp.factorial(d - 2 * s)
        ) / sp.factorial(d - s)
        if signed:
            scale *= (-1) ** s
        result += scale * (Z * U) ** s * jensen(seed, d - s)
    return sp.expand(result)


def one_slot_triangle(N: int, d: int) -> sp.Expr:
    """First polarized state contraction; Z,U are the master variables.

    A0=g_N+g_(N-1)V and A1=g_(N-1)+g_(N-2)V.  The extra variable V is
    represented by a fresh symbol so that stability is tested before the
    second state contraction.
    """
    V = sp.Symbol("v")
    a0 = hypergeometric_form(N, 1) + hypergeometric_form(N - 1, 1) * V
    a1 = hypergeometric_form(N - 1, 1) + hypergeometric_form(N - 2, 1) * V
    r = d - 2
    scale = sp.sqrt(sp.Rational(r, r - 1))
    return sp.expand(jensen(a0, r) + scale * Z * U * jensen(a1, r - 1))


def roots_on_line(poly: sp.Expr, base: tuple[int, int, int],
                  direction: tuple[int, int, int]) -> tuple[int, int, list[complex]]:
    line = sp.Poly(sp.expand(poly.subs({
        X: base[0] + direction[0] * T,
        Z: base[1] + direction[1] * T,
        U: base[2] + direction[2] * T,
    })), T)
    roots = [complex(root) for root in sp.nroots(line, n=35, maxsteps=300)]
    nonreal = [root for root in roots if abs(root.imag) > 1e-18]
    return line.degree(), len(nonreal), nonreal[:6]


def main() -> None:
    rng = random.Random(9938204)
    for m in range(1, 5):
        N, d = 3 * m + 4, 2 * m + 5
        for signed in (False, True):
            poly = shifted_triangle(N, d, signed)
            failure = None
            for trial in range(80):
                base = tuple(rng.randint(-15, 15) for _ in range(3))
                direction = tuple(rng.randint(1, 9) for _ in range(3))
                degree, nonreal, sample = roots_on_line(poly, base, direction)
                if nonreal:
                    failure = {
                        "trial": trial,
                        "base": base,
                        "direction": direction,
                        "degree": degree,
                        "nonreal": nonreal,
                        "sample": sample,
                    }
                    break
            print({"m": m, "N": N, "d": d, "signed": signed,
                   "failure": failure}, flush=True)

    V = sp.Symbol("v")
    for m in range(1, 5):
        N, d = 3 * m + 4, 2 * m + 5
        poly = one_slot_triangle(N, d)
        failure = None
        for trial in range(80):
            variables = (X, Z, U, V)
            base = tuple(rng.randint(-15, 15) for _ in variables)
            direction = tuple(rng.randint(1, 9) for _ in variables)
            line = sp.Poly(sp.expand(poly.subs({
                variable: base[i] + direction[i] * T
                for i, variable in enumerate(variables)
            })), T)
            roots = [complex(root) for root in sp.nroots(line, n=35, maxsteps=300)]
            nonreal = [root for root in roots if abs(root.imag) > 1e-18]
            if nonreal:
                failure = {"trial": trial, "base": base, "direction": direction,
                           "degree": line.degree(), "nonreal": len(nonreal),
                           "sample": nonreal[:6]}
                break
        print({"one_slot": True, "m": m, "N": N, "d": d,
               "failure": failure}, flush=True)


if __name__ == "__main__":
    main()
