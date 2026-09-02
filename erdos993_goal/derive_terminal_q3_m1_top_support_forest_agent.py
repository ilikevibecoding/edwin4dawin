#!/usr/bin/env python3
"""Derive the unnormalized top-support forest m=1 lower polynomial."""

from __future__ import annotations

import sympy as sp


def choose(value, rank):
    return sp.prod(value-k for k in range(rank))/sp.factorial(rank)


def build():
    N,j,r,h,d,R,W,y=sp.symbols(
        'N j r h d R W y', integer=True, nonnegative=True
    )
    m=N-h
    p0=sp.expand(
        choose(N+1,3)-m*(N-1)+W+choose(N+1,2)-m
    )
    p1=sp.expand(choose(N+1,2)-m+N+1)
    R1=sp.expand(m*N-2*W)
    a2=sp.expand(choose(N,2)-(m-d))
    wedges_f=W-choose(d,2)-R
    z2=sp.expand((m-d)*(N-2)-2*wedges_f)
    h2=sp.expand(choose(N-d,2)-(m-d-R))
    c0=sp.expand(a2+z2+h2)
    A1=sp.expand(p0*a2+p1*c0+p1*a2-a2*R1)

    # q_j(F)<=q_2(F): e0/b <= 1+y+j*z2/(2*a2).
    ebar_num=sp.expand(2*a2*(1+y)+j*z2)
    # Q0 omits the R0 term.  Together with A0*U1, that term is replaced
    # below using the exact FA/FQ32 identity.
    Q0_num=sp.expand(2*a2*(j+1)*c0-3*ebar_num*(p0+a2))
    Q1_num=sp.expand(
        2*a2*((j+1)*(a2+R1)-3*(p0+a2+p1))-3*ebar_num*p1
    )
    remainder_num=sp.expand(p0*Q1_num+p1*Q0_num+p1*Q1_num)

    # At j=alpha(F), i_(j+1)(F)=0.  The two exact/shadow lower rows are
    # U0/b >= 1+y+jy/r and U1/b >= 1+j/(r+1)+jy/r.
    U0_num=sp.expand(r*(1+y)+j*y)
    U1_num=sp.expand(r*(r+1)+j*r+j*y*(r+1))
    Usum_num=sp.expand((r+1)*U0_num+U1_num)

    # Exact bridge:
    # A0=(p0*Gap+a2*M)/(2*p1), R0=(3*p0*R1-M)/(2*p1).
    # If a2*(U1/b)>=p1, Gap,M>=0 leave 3*p0*R1/2.
    numerator=sp.expand((
        (j+1)*2*a2*A1*Usum_num
        + remainder_num*r*(r+1)
        + 3*a2*(j+1)*p0*R1*r*(r+1)
    ).subs(N,j+r))
    m_coefficient=sp.expand((a2*U1_num-p1*r*(r+1)).subs(N,j+r))
    return numerator,m_coefficient,(j,r,h,d,R,W,y)


def main():
    numerator,m_coefficient,variables=build()
    j,r,h,d,R,W,y=variables
    poly=sp.Poly(numerator,W)
    print('terms',len(sp.Poly(numerator,*variables).terms()))
    print('degrees',{str(v):sp.Poly(numerator,v).degree() for v in variables})
    print('W2',sp.factor(poly.coeff_monomial(W**2)))
    print('R_slope',sp.factor(sp.diff(numerator,R)))
    print('M_coefficient_y0',sp.factor(m_coefficient.subs(y,0)))
    print('M_coefficient_y_slope',sp.factor(sp.diff(m_coefficient,y)))
    linear=sp.expand(numerator-poly.coeff_monomial(W**2)*W**2)
    m=j+r-h
    for name,wvalue in (
        ('Wlow',choose(d,2)+R),('Whigh',choose(m,2))
    ):
        boundary=sp.expand(linear.subs(W,wvalue))
        rpoly=sp.Poly(boundary,R)
        print(name,'Rdegree',rpoly.degree(),'R2',
              sp.factor(rpoly.coeff_monomial(R**2)))


if __name__=='__main__':
    main()
