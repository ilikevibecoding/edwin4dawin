#!/usr/bin/env python3
"""Probe the eliminated general-forest m1 cone for every j>=8."""

from __future__ import annotations

import itertools
import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import build, C


def tensor_bernstein(expression, variables):
    polynomial=sp.Poly(sp.expand(expression),*variables)
    degrees=tuple(polynomial.degree(variable) for variable in variables)
    indices=list(itertools.product(*[range(degree+1) for degree in degrees]))
    output={index:sp.Integer(0) for index in indices}
    for powers,coefficient in polynomial.terms():
        for index in itertools.product(*[
            range(power,degrees[k]+1) for k,power in enumerate(powers)
        ]):
            output[index]+=coefficient*sp.prod(
                sp.binomial(index[k],powers[k])/sp.binomial(degrees[k],powers[k])
                for k in range(len(variables))
            )
    return degrees,[sp.expand(output[index]) for index in indices]


def main():
    num,den,mnum,mden,variables=build()
    j,r,h,d,R,W,y=variables
    wpoly=sp.Poly(num,W); w2=sp.expand(wpoly.coeff_monomial(W**2))
    linear=sp.expand(num-w2*W**2)
    # With h other nontrivial components, at least h edges lie outside the
    # marked component.  Hence R<=N-2h-d.  Two simultaneous wedge bounds are
    # W>=A=C(d,2)+R and W>=B=N-2h-1.  For B>0, the structural inequality
    # d-1<=B makes lambda=(d-1)/B lie in [0,1], hence
    # W>=max(A,B)>=lambda*A+(1-lambda)*B.  Under the cone map lambda=v, so
    # this bound is exact on both the path and star extremes.  The B=0 face
    # is certified separately.  Convexity of C(m_i,2) over the h+1 positive
    # component edge counts gives W<=C(N-2h,2).
    N=j+r
    rmax=N-2*h-d
    endpoints={}
    B=N-2*h-1
    A=C(d,2)+R
    lam=(d-1)/B
    correlated_low=sp.factor(lam*A+(1-lam)*B)
    for yv in (0,1):
        for wn,wv in (("low",correlated_low),("high",C(N-2*h,2))):
            rational=sp.cancel(linear.subs({y:yv,W:wv}))
            boundary,boundary_den=sp.together(rational).as_numer_denom()
            boundary=sp.expand(boundary)
            boundary_den=sp.factor(boundary_den)
            if wn=="low":
                print("low denominator",boundary_den,flush=True)
            else:
                assert boundary_den>0
            rp=sp.Poly(boundary,R)
            if wn=="low":
                assert rp.degree()==2
                assert sp.factor(rp.LC()).could_extract_minus_sign()
            else:
                assert rp.degree()<=1
            for rn,rv in (("zero",0),("max",rmax)):
                endpoints[f"y{yv}_{wn}_{rn}"]=sp.expand(boundary.subs(R,rv))

    S,u,v,w=sp.symbols("S u v w",nonnegative=True)
    substitution={
        j:8+S*w,
        r:1+S*(1-w),
        h:1+(S+6)*u/2,
        d:1+(S+6)*(1-u)*v,
    }
    tests={
        "W2_y0":w2.subs(y,0),
        "W2_y1":w2.subs(y,1),
        "M_y0":mnum.subs(y,0),
        "M_y_slope":sp.diff(mnum,y),
        "Bzero_y0":sp.expand(num.subs({
            h:(N-1)/2,d:1,R:0,W:0,y:0,
        })),
        "Bzero_y1":sp.expand(num.subs({
            h:(N-1)/2,d:1,R:0,W:0,y:1,
        })),
        **endpoints,
    }
    for name,expression in tests.items():
        transformed=sp.expand(expression.subs(substitution,simultaneous=True))
        degrees,coefficients=tensor_bernstein(transformed,(u,v,w))
        bad=[]
        for index,coefficient in enumerate(coefficients):
            powers=sp.Poly(coefficient,S).all_coeffs()
            if not powers or any(value<0 for value in powers):
                bad.append((index,coefficient))
        print(name,"degrees",degrees,"coefficients",len(coefficients),
              "bad",len(bad),flush=True)
        if bad:
            print("first_bad",[(index,str(value)) for index,value in bad[:3]],flush=True)


if __name__=="__main__":
    main()
