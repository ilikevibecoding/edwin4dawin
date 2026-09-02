#!/usr/bin/env python3
"""Exact formal row correction for joining two forest components at leaves."""

import sympy as sp


def delta1(rows,j):
    p0,p1,r0,r1,u0,u1,a,b,c0,e0=rows
    A0=p0*c0-a*r0
    A1=p0*a+p1*c0+p1*a-a*r1
    Q0=(j+1)*b*(c0+r0)-3*(p0+a)*e0
    Q1=(j+1)*b*(a+r1)-3*p1*e0-3*b*(p0+a+p1)
    return sp.expand(
        (j+1)*a*(A0*u1+A1*u0+A1*u1)
        +a*(p0*Q1+p1*Q0+p1*Q1)
    )


def symbolic():
    j=sp.symbols('j', integer=True, positive=True)
    base=sp.symbols('p0 p1 r0 r1 u0 u1 a2 b c0 e0', nonnegative=True)
    p0,p1,r0,r1,u0,u1,a2,b,c0,e0=base
    # The q3 low block is fixed at ranks 3 and 4 for every target j.
    # Consequently the whole-graph independence correction needs K_0,K_1
    # separately from the target-window K_{j-3},...,K_{j-1} rows.
    k0,k1=sp.symbols('k0 k1', nonnegative=True)
    kjm3,kjm2,kjm1=sp.symbols('kjm3 kjm2 kjm1', nonnegative=True)
    l0,l1,l2=sp.symbols('l0 l1 l2')
    fk0,fkjm2=sp.symbols('fk0 fkjm2', nonnegative=True)
    fl1,fljm1=sp.symbols('fl1 fljm1')
    hk0,hkjm2=sp.symbols('hk0 hkjm2', nonnegative=True)
    corrections=(
        k0,k1,kjm3,kjm2,kjm1,l0,l1,l2,
        fk0,fkjm2,fl1,fljm1,hk0,hkjm2,
    )
    delta=(
        -(k1+k0),                 # delta(i_3+i_2)
        -k0,                      # delta(i_2+i_1)
        l2+l1,                    # delta(s_4+s_3)
        l1+l0,                    # delta(s_3+s_2)
        -(kjm1+kjm2),             # delta(i_{j+1}+i_j)
        -(kjm2+kjm3),             # delta(i_j+i_{j-1})
        -fk0,                     # delta a2=delta i_2(F)
        -fkjm2,                   # delta i_j(F)
        fl1-hk0-fk0,              # delta c(1)=delta(z2+h2+a2)
        fljm1-hkjm2-fkjm2,        # delta e(1)
    )
    lam=sp.symbols('lam')
    tree=tuple(x+lam*y for x,y in zip(base,delta))
    forest_value=delta1(base,j)
    correction=sp.factor(forest_value-delta1(tree,j))
    return {
        'j':j,'base':base,'corrections':corrections,'delta':delta,
        'lambda':lam,'expression':correction,
    }


def main():
    data=symbolic(); lam=data['lambda']; expr=data['expression']
    poly=sp.Poly(expr,lam)
    print('lambda degree',poly.degree())
    for power in range(1,poly.degree()+1):
        coefficient=sp.factor(poly.coeff_monomial(lam**power))
        print('lambda',power,'terms',len(sp.Poly(sp.expand(coefficient),*data['base'],*data['corrections'],data['j']).terms()))
        print(coefficient)


if __name__=='__main__': main()
