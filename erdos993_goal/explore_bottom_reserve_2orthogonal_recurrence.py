#!/usr/bin/env python3
"""Test whether fixed-m bottom reserves form a standard 2-orthogonal sequence."""

from __future__ import annotations

import math

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m as M, q, w, z


Y = sp.symbols("Y")


def bottom_source() -> sp.Expr:
    F = sp.expand(2*A*(A-1)+(V+1)**2)
    G = sp.expand(A*T**2-q)
    L = sp.expand(G*(T+(2*M+3)*q*A)+2*q**2*A)
    return sp.expand((z+w)*(z**2+w**2)*(A-1)*F*L)


SOURCE = bottom_source()


def reserve(m_value: int, r: int) -> sp.Poly:
    a = 3*m_value-1
    b = 2*m_value+1
    N = m_value+r+3
    terms = sp.Poly(SOURCE.subs(M, m_value), z, w).terms()
    coefficients = []
    for j in range(r+1):
        total = sp.Integer(0)
        for (p, qpower), source_coefficient in terms:
            for k in range(b+1):
                left_bottom = N-p-k
                right_bottom = N-j-qpower-b+k
                if not (0 <= left_bottom <= a+k+r-j):
                    continue
                if not (0 <= right_bottom <= a+b-k):
                    continue
                total += (
                    source_coefficient
                    * sp.binomial(b, k)
                    * sp.binomial(a+k+r-j, left_bottom)
                    * sp.binomial(a+b-k, right_bottom)
                )
        coefficients.append(sp.binomial(r, j)*total)
    polynomial = sp.Poly(sum(coefficients[j]*Y**j for j in range(r+1)), Y)
    return polynomial


def monic(poly: sp.Poly) -> sp.Poly:
    return sp.Poly(poly.as_expr()/poly.LC(), Y)


def main() -> None:
    for m_value in range(2, 9):
        raw = [reserve(m_value, r) for r in range(0, 2*m_value+1)]
        print({"m": m_value, "raw_degrees": [p.degree() for p in raw]}, flush=True)
        # Test only a contiguous tail whose reserve has its nominal degree.
        start = next(r for r, p in enumerate(raw) if all(raw[s].degree() == s for s in range(r, len(raw))))
        polynomials = {r: monic(raw[r]) for r in range(start, len(raw))}
        failures = []
        coefficients = []
        # Index n below is the ordinary degree; the stored list starts at degree 1.
        for n in range(max(start+3, 3), 2*m_value):
            p_next = polynomials[n+1]
            p = polynomials[n]
            p_prev = polynomials[n-1]
            p_prev2 = polynomials[n-2]
            first = sp.Poly(p_next.as_expr()-Y*p.as_expr(), Y)
            beta = -first.coeff_monomial(Y**n)
            second = sp.Poly(first.as_expr()+beta*p.as_expr(), Y)
            alpha = -second.coeff_monomial(Y**(n-1))
            residual = sp.Poly(second.as_expr()+alpha*p_prev.as_expr(), Y)
            gamma = -residual.coeff_monomial(Y**(n-2))
            final = sp.Poly(residual.as_expr()+gamma*p_prev2.as_expr(), Y)
            ok = final.is_zero
            coefficients.append((n, beta, alpha, gamma, ok))
            if not ok:
                failures.append({"n": n, "residual_degree": final.degree()})
        print({
            "m": m_value,
            "full_degree_start": start,
            "standard_four_term_checks": len(coefficients),
            "failures": failures[:5],
            "first_coefficients": [tuple(map(str, row[:4])) for row in coefficients[:3]],
        }, flush=True)


if __name__ == "__main__":
    main()
