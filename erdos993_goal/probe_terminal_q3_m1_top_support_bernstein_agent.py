#!/usr/bin/env python3
"""Probe tensor-Bernstein certificates for the top-support forest m1 lower."""

from __future__ import annotations

import itertools
import sympy as sp

from derive_terminal_q3_m1_top_support_forest_agent import build, choose


def tensor_bernstein(expression, variables):
    polynomial=sp.Poly(sp.expand(expression),*variables)
    degrees=tuple(polynomial.degree(variable) for variable in variables)
    indices=list(itertools.product(*[range(degree+1) for degree in degrees]))
    output={index:sp.Integer(0) for index in indices}
    for powers,coefficient in polynomial.terms():
        for index in itertools.product(*[
            range(power,degrees[q]+1) for q,power in enumerate(powers)
        ]):
            output[index] += coefficient*sp.prod(
                sp.binomial(index[q],powers[q])/sp.binomial(degrees[q],powers[q])
                for q in range(len(variables))
            )
    output=[sp.expand(output[index]) for index in indices]
    return degrees,output


def positive_power(expression,variable):
    coefficients=sp.Poly(sp.expand(expression),variable).all_coeffs()
    return bool(coefficients) and all(value>=0 for value in coefficients)


def main():
    lower,mcoef,variables=build()
    j,r,h,d,R,W,y=variables
    wpoly=sp.Poly(lower,W)
    w2=wpoly.coeff_monomial(W**2)
    linear=sp.expand(lower-w2*W**2)
    m=j+r-h
    rmax=m-d
    endpoints={}
    for yv in (0,1):
        for wname,wvalue in (
            ('low',choose(d,2)+R),('high',choose(m,2))
        ):
            boundary=sp.expand(linear.subs({y:yv,W:wvalue}))
            for rname,rvalue in (('zero',0),('max',rmax)):
                endpoints[f'y{yv}_{wname}_R{rname}']=sp.expand(boundary.subs(R,rvalue))

    S,u,v,w=sp.symbols('S u v w',nonnegative=True)
    X=10+S
    substitution={
        j:X+2,
        r:1+(X+1)*w,
        h:1+X*u,
        d:1+X*(1-u)*v,
    }
    tests={
        'W2':w2,
        'M_y0':mcoef.subs(y,0),
        'M_y_slope':sp.diff(mcoef,y),
        **endpoints,
    }
    for name,expression in tests.items():
        item=sp.expand(expression.subs(substitution,simultaneous=True))
        degrees,coefficients=tensor_bernstein(item,(u,v,w))
        bad=[(index,value) for index,value in enumerate(coefficients)
             if not positive_power(value,S)]
        print(name,'degrees',degrees,'coefficients',len(coefficients),
              'bad',len(bad),flush=True)
        if bad:
            print('first_bad',[(index,str(value)) for index,value in bad[:3]],flush=True)


if __name__=='__main__':
    main()
