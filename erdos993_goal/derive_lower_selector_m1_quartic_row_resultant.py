"""Derive the reciprocal product-boundary resultant for lower row s=4."""

from __future__ import annotations

import sympy as sp

from derive_lower_selector_m1_cubic_rows import duran, selector_gamma


X, Z = sp.symbols("x z")


def one_family(r: int, parity: int) -> None:
    k = sp.symbols("k", integer=True, nonnegative=True)
    d0 = 5 if parity else 6
    d = 2 * k + d0
    s = 4
    N = d + r
    gamma = selector_gamma(N, s)
    assert len(gamma) == 5
    P = d + s
    epsilon = int((d0 + s) % 2)
    n = sp.expand((P - epsilon) / 2)
    beta = sp.Rational(2 * epsilon - 1, 2)
    x0 = sp.expand(n - 4 + 1)
    A = sp.factor(x0 * (x0 + beta))
    q = duran(P, gamma)
    lc = sp.factor(q.LC())
    q0 = sp.factor(q.TC())
    C = sp.factor(q0 / lc)
    threshold = sp.factor(C / A)
    F = sp.Poly(sp.expand(q.as_expr().subs(Z, -X)), X)
    reciprocal = sp.Poly(sp.cancel(X**4 * F.as_expr().subs(X, threshold / X)), X)
    print('starting resultant',r,parity)
    resultant = sp.factor(sp.resultant(F.as_expr(), reciprocal.as_expr(), X))
    num, den = sp.cancel(resultant).as_numer_denom()
    print('family',r,parity,'A',A,'T',threshold)
    print('factor',sp.factor(resultant))
    print('num degree',sp.degree(num,k),'coeff signs',set(sp.sign(v) for v in sp.Poly(num,k).all_coeffs()))
    print('den degree',sp.degree(den,k),'coeff signs',set(sp.sign(v) for v in sp.Poly(den,k).all_coeffs()))
    positive_factor_roots=[]
    for factor, exponent in sp.factor_list(num,k)[1]:
        if sp.degree(factor,k) < 2: continue
        rr=[complex(root) for root in sp.nroots(factor,n=25,maxsteps=500)]
        pos=sorted(root.real for root in rr if abs(root.imag)<1e-10 and root.real>=0)
        if pos: positive_factor_roots.append((sp.degree(factor,k),exponent,pos))
    print('positive factor roots',positive_factor_roots)


def main():
    for r in range(4):
        for parity in (1,0):
            one_family(r,parity)


if __name__=='__main__':main()
