"""Exact probe for low-band recurrences of Durán polynomials on chart rays."""

from __future__ import annotations

import sympy as sp

from probe_lower_selector_tail3_flint_full import duran_coefficients, selector_gamma


Z = sp.symbols("z")


def poly_unforced(m: int, e: int, g: int, sigma: int) -> sp.Poly:
    d = 2*m-e
    r = e+g-4+sigma
    s = 2*m-4+sigma
    assert d >= 5 and 0 <= r <= d-5 and r < s <= d+2*r
    gamma = selector_gamma(d+r, s)
    q = duran_coefficients(d+s, gamma)
    return sp.Poly(sum(sp.Rational(str(q[k]))*Z**k for k in range(m+1)), Z).monic()


def poly_forced(m: int, e: int, a: int, sigma: int) -> sp.Poly:
    d=2*m-e
    r=e+a-3+sigma
    s=2*m+2*a-4+sigma
    N=d+r
    gamma=selector_gamma(N,s)[a:]
    q=duran_coefficients(d+s-a,gamma)
    return sp.Poly(sum(sp.Rational(str(q[k]))*Z**k for k in range(m+1)),Z).monic()


def expansion(target: sp.Poly, basis: list[sp.Poly]):
    rem=target.as_expr(); coeff=[]
    for p in basis:
        deg=sp.Poly(rem,Z).degree()
        if deg < p.degree(): coeff.append(sp.Integer(0)); continue
        c=sp.Poly(rem,Z).LC()/p.LC()
        coeff.append(sp.factor(c)); rem=sp.cancel(rem-c*p.as_expr())
    return coeff,sp.Poly(sp.expand(rem),Z)


def check(factory, params, first_m):
    ps={m:factory(m,*params) for m in range(first_m,first_m+7)}
    print("ray",factory.__name__,params)
    for m in range(first_m+2,first_m+7):
        # General multiplication-by-z expansion in descending degrees.
        basis=[ps[k] for k in range(m,m-6,-1) if k in ps]
        coeff,rem=expansion(sp.Poly(Z*ps[m-1].as_expr(),Z),basis)
        nonzero=[(m-i,c) for i,c in enumerate(coeff) if c]
        print("m",m,"bands",nonzero,"remdeg",rem.degree() if not rem.is_zero else -1)


def main():
    check(poly_unforced,(5,2,1),7)
    check(poly_unforced,(2,3,0),7)
    check(poly_forced,(4,3,0),7)
    check(poly_forced,(3,2,1),7)


if __name__ == '__main__': main()
