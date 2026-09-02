#!/usr/bin/env python3
"""Derive the FQ32/anchor-eliminated general forest m=1 lower.

This is an exploration aid until an exact cone certificate is supplied.
"""

from __future__ import annotations

import sympy as sp


def C(value, rank):
    return sp.prod(value-k for k in range(rank))/sp.factorial(rank)


def build():
    N,j,r,h,d,R,W,y=sp.symbols(
        "N j r h d R W y", integer=True, nonnegative=True
    )
    m=N-h
    p0=sp.expand(C(N+1,3)-m*(N-1)+W+C(N+1,2)-m)
    p1=sp.expand(C(N+1,2)-m+N+1)
    R1=sp.expand(m*N-2*W)
    a=sp.expand(C(N,2)-(m-d))
    z2=sp.expand((m-d)*(N-2)-2*(W-C(d,2)-R))
    h2=sp.expand(C(N-d,2)-(m-d-R))
    c0=sp.expand(a+z2+h2)
    A1=sp.expand(p0*a+p1*c0+p1*a-a*R1)
    ebar=sp.factor(1+y+j*z2/(2*a))
    Q0=sp.expand((j+1)*c0-3*ebar*(p0+a))
    Q1=sp.expand((j+1)*(a+R1)-3*ebar*p1-3*(p0+a+p1))
    remainder=sp.expand(p0*Q1+p1*Q0+p1*Q1)
    U1=1+j/(r+1)+j*y/r
    U0=(N-2*j+3+(j-1)*y)/(j+1)+j*y/r
    gap=sp.expand(2*p1*c0-3*a*R1)
    lower=sp.factor(
        ((j+1)*(
            sp.Rational(3,2)*p0*R1
            +p0*U1*gap/(2*p1)
            +A1*(U0+U1)
        )+remainder)
        .subs(N,j+r)
    )
    mcoef=sp.factor((a*U1-p1).subs(N,j+r))
    numerator,denominator=sp.together(lower).as_numer_denom()
    mnum,mden=sp.together(mcoef).as_numer_denom()
    return (
        sp.expand(numerator),sp.factor(denominator),
        sp.expand(mnum),sp.factor(mden),(j,r,h,d,R,W,y)
    )


def main():
    num,den,mnum,mden,variables=build()
    j,r,h,d,R,W,y=variables
    print("den",den,"mden",mden,flush=True)
    print("terms",len(sp.Poly(num,*variables).terms()),flush=True)
    print("degrees",{str(x):sp.Poly(num,x).degree() for x in variables},flush=True)
    print("Wdegree",sp.Poly(num,W).degree(),flush=True)
    print("W2",sp.factor(sp.Poly(num,W).coeff_monomial(W**2)),flush=True)
    print("M_ydegree",sp.Poly(mnum,y).degree(),flush=True)


if __name__=="__main__":
    main()
