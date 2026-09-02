#!/usr/bin/env python3
"""Search-only scalar factorization for the d=1 nonstable m0 band."""

import sympy as sp


def C(n,k):
    out=sp.Integer(1)
    for i in range(k): out*=n-i
    return sp.expand(out/sp.factorial(k))


def build():
    A,B,Y=sp.symbols('A B Y', integer=True, nonnegative=True)
    R=A+Y;T=B+Y;S=R+T
    a=C(S,2)
    c0=R**2+4*R*T-R+2*T**2-5*T
    P=(R**3+3*R**2*T+3*R**2+3*R*T**2+2*R+T**3+5*T)/6
    R0=(R**2*T+3*R*T**2-6*R*T+6*R*Y+T**3-4*T**2+9*T-6*Y)/2
    L=sp.factor(P*c0-a*R0);U=sp.factor(P*(c0+R0));V=sp.factor(P*(P+a))
    f3=sp.factor(C(S,3)-T*(S-2)+B)
    z3=sp.factor(T*C(S-2,2)-2*(B*(S-3)+C(T,2)-B)+3*(B-1))
    qH=sp.cancel(z3/(3*f3))
    f2=sp.factor(C(T,2)-B)
    z2lo=sp.factor(B*(T-2))
    qKlo=sp.cancel(z2lo/(2*f2))
    return (A,B,Y),(S,R,T),(a,P,L,U,V),qH,qKlo


def main():
    vars_,sizes,blocks,qH,qK=build();A,B,Y=vars_;a,P,L,U,V=blocks
    for name,value in [('P',P),('L',L),('U',U),('V',V),('qH',qH),('qK',qK)]:
        print(name,sp.factor(value))
    aH=sp.factor(2*L+U-3*V*qH);bH=sp.factor(2*L+U-6*V)
    aK=sp.factor(L+U-3*V*qK);bK=sp.factor(L+U-3*V+3*V*qK-3*V*(A+Y))
    for name,value in [('aH',aH),('bH',bH),('aK',aK),('bK',bK),('aK+bK',aK+bK)]:
        num,den=sp.together(value).as_numer_denom()
        print(name+'_DEN',sp.factor(den)); print(name+'_NUM',sp.factor(num))


if __name__=='__main__':main()
