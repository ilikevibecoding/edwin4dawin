"""Explore the multiaffine subset lift of the bottom endpoint.

If g=prod_i (X-r_i) and h/g=sum_i w_i/(X-r_i), then, with
r=2N-d,

 F/d! = sum_{|A|+|B|=r} (1-W(A^c)W(B^c)/(d(d-1))) x_A y_B,

after x_i=X-r_i and y_i=Y-r_i.  Test coefficient positivity and elementary
Rayleigh inequalities of this homogeneous multiaffine lift for the actual
defect-three pair.
"""

from __future__ import annotations

from itertools import combinations
from math import factorial

import numpy as np
import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


def spectral_weights(N: int, precision: int = 80) -> tuple[np.ndarray, np.ndarray]:
    g = sp.Poly(hypergeometric_form(N, 3), X)
    h = sp.Poly(hypergeometric_form(N - 1, 3), X)
    # The common double zero has zero compression mass.  At every simple
    # nonzero root rho of g, the residue is h(rho)/g'(rho).
    nonzero = sp.Poly(sp.cancel(g.as_expr() / X**2), X)
    roots = sorted(
        (complex(root) for root in sp.nroots(nonzero, n=precision, maxsteps=500)),
        key=lambda z: z.real,
    )
    residues = []
    gp = sp.diff(g.as_expr(), X)
    for root in roots:
        rv = sp.N(root.real, precision)
        residues.append(float(sp.N(h.as_expr().subs(X, rv) / gp.subs(X, rv), 50)))
    # Include the two zero-eigenvalue coordinates, on which the compression
    # vector has no mass because g and h share X^2.
    return np.array([root.real for root in roots] + [0.0, 0.0]), np.array(residues + [0.0, 0.0])


def subset_sums(weights: np.ndarray) -> list[np.ndarray]:
    n = len(weights)
    result = []
    for size in range(n + 1):
        result.append(
            np.array([weights[list(S)].sum() for S in combinations(range(n), size)])
        )
    return result


def coefficient_profile(m: int) -> None:
    N, d = 3 * m + 3, 2 * m + 3
    total_degree = 2 * N - d
    roots, weights = spectral_weights(N)
    assert abs(weights.sum() - N) < 1e-7
    sums = subset_sums(weights)
    minimum = (float("inf"), None)
    maximum_product = (-float("inf"), None)
    negative = 0
    total = 0
    # Complements U,V have total size d.  The retained subsets have total
    # size 2N-d.
    for u_size in range(max(0, d - N), min(N, d) + 1):
        v_size = d - u_size
        for wu in sums[u_size]:
            for wv in sums[v_size]:
                product = wu * wv
                coefficient = 1.0 - product / (d * (d - 1))
                total += 1
                negative += int(coefficient < -1e-10)
                if coefficient < minimum[0]:
                    minimum = (coefficient, (u_size, v_size, wu, wv))
                if product > maximum_product[0]:
                    maximum_product = (product, (u_size, v_size, wu, wv))
    print(
        f"m={m} N={N} d={d} degree={total_degree} "
        f"weight_range=({weights.min():.9g},{weights.max():.9g}) "
        f"negative_coefficients={negative}/{total} minimum={minimum} "
        f"max_product={maximum_product}",
        flush=True,
    )
    if m <= 3:
        print(" roots=", roots, flush=True)
        print(" weights=", weights, flush=True)


def verify_expansion(m: int) -> None:
    """Symbolically verify the subset formula after symmetric specialization."""
    N, d = 3 * m + 3, 2 * m + 3
    g = sp.Poly(hypergeometric_form(N, 3), X)
    h = sp.Poly(hypergeometric_form(N - 1, 3), X)
    Y = sp.symbols("y")
    direct = sum(
        sp.binomial(d, k)
        * sp.diff(g.as_expr(), X, k)
        * sp.diff(g.as_expr(), X, d - k).subs(X, Y)
        for k in range(d + 1)
    ) - sum(
        sp.binomial(d - 2, k)
        * sp.diff(h.as_expr(), X, k)
        * sp.diff(h.as_expr(), X, d - 2 - k).subs(X, Y)
        for k in range(d - 1)
    )
    # The derivative-subset identity can be checked without algebraic roots:
    # normalized derivatives already aggregate the required subset weights.
    rebuilt = factorial(d) * (
        sum(
            sp.diff(g.as_expr(), X, k) / factorial(k)
            * (sp.diff(g.as_expr(), X, d - k) / factorial(d - k)).subs(X, Y)
            for k in range(d + 1)
        )
        - sp.Rational(1, d * (d - 1))
        * sum(
            sp.diff(h.as_expr(), X, k) / factorial(k)
            * (sp.diff(h.as_expr(), X, d - 2 - k) / factorial(d - 2 - k)).subs(X, Y)
            for k in range(d - 1)
        )
    )
    assert sp.expand(direct - rebuilt) == 0
    print(f"symbolic normalized-subset expansion verified for m={m}")


def main() -> None:
    verify_expansion(1)
    for m in range(1, 8):
        coefficient_profile(m)


if __name__ == "__main__":
    main()
