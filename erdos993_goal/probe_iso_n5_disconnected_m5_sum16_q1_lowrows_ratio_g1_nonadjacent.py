#!/usr/bin/env python3
"""Probe ratio certificates for the three hard q=1 isolate rows."""

import itertools
import math
import numpy as np
import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q1_binomial_rows_g1_nonadjacent import symbolic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


def lower_rows():
    a,g,rows=symbolic_rows(); b=sp.symbols("b0:5");e,m=sp.symbols("e m",nonnegative=True)
    sub={g[k]:a[k]-b[k-1] for k in range(2,6)}
    result=[]
    for index in range(3):
        expression=sp.expand(rows[index].subs(sub).subs({a[1]:e,a[2]:choose(e-1,2),b[1]:m}))
        # b3,b4 have nonnegative coefficients and are discarded.  The b2
        # coefficient is negative only in row0, where b2<=C(m,2).
        if index==0:
            assert sp.factor(expression.coeff(b[2]))==-6*a[3]-2*e**2+5*e+6*m-5
            expression=expression.subs(b[2],choose(m,2))
        else:
            expression=expression.subs(b[2],0)
        expression=sp.expand(expression.subs({b[3]:0,b[4]:0}))
        result.append(expression)
    return e,m,a,result


def cone(mode):
    e,m,a,rows=lower_rows();u,w,alpha=sp.symbols("u w alpha",nonnegative=True)
    mbox=u*(e-2)
    rho1=2*e-6+4/e
    rho5=(2*e-10)*w
    excess=rho1-rho5-4
    if mode=="high":
        z=sp.symbols("high_z0:4",nonnegative=True)
        r4=rho5+1+excess*z[3];r3=r4+1+excess*z[2];r2=r3+1+excess*z[1];r1=r2+1+excess*z[0]
        cubes=(u,w)
    else:
        z=sp.symbols("low_z0:3",nonnegative=True)
        r4=rho5+1+excess*z[2];r3=r4+1+excess*z[1];r2=r3+2-alpha+excess*z[0];r1=r2+alpha
        cubes=(u,w,alpha)
    product=1;sub={}
    for rank,rho in zip(range(2,7),(r1,r2,r3,r4,rho5)):
        product*=rho;sub[a[rank]]=e*product/(2**(rank-1)*sp.factorial(rank))
    expressions=[row.subs({m:mbox,**sub}) for row in rows]
    return e,z,cubes,expressions


def probe(mode):
    e,z,cubes,rows=cone(mode);rng=np.random.default_rng(993+(mode=="low"))
    for row_index,expression in enumerate(rows):
        failures=[]
        for E in (13,20,40,100):
            for corner in itertools.product((0,1),repeat=len(cubes)):
                for chosen in range(len(z)):
                    value=sp.factor(expression.subs({e:E,**dict(zip(cubes,corner)),**{v:int(i==chosen) for i,v in enumerate(z)}}))
                    if value<0:failures.append((E,corner,chosen,value))
        evaluator=sp.lambdify((e,*cubes,*z),expression,modules="numpy");best=None
        samples=200000
        for E in (13,20,40,100):
            cv=[rng.random(samples) for _ in cubes];raw=rng.exponential(size=(len(z),samples));zv=raw/raw.sum(axis=0)
            values=np.asarray(evaluator(E,*cv,*zv),dtype=float);i=int(np.argmin(values));point=(float(values[i]),E,tuple(float(v[i]) for v in cv),tuple(float(v[i]) for v in zv))
            if best is None or point<best:best=point
        print(mode,"row",row_index,"corner_neg",len(failures),"best",best,flush=True)
        for failure in failures[:10]:print("NEG",failure,flush=True)


def weak_compositions(total,length):
    if length==1:
        yield (total,);return
    for first in range(total+1):
        for rest in weak_compositions(total-first,length-1):yield(first,*rest)


def multinomial(total,exponents):
    value=math.factorial(total)
    for exponent in exponents:value//=math.factorial(exponent)
    return value


def exact(mode):
    e,z,cubes,expressions=cone(mode)
    for expression_index,expression in enumerate(expressions):
        scaled=sp.cancel(480*e**3*expression);numerator,denominator=sp.fraction(scaled);assert denominator==1
        polynomial=sp.Poly(numerator,e,*cubes,*z);terms=polynomial.terms()
        degrees=[max(m[1+i] for m,_ in terms) for i in range(len(cubes))]
        rows=[]
        for indices in itertools.product(*(range(d+1) for d in degrees)):
            row={}
            for monomial,coefficient in terms:
                powers=monomial[1:1+len(cubes)]
                if any(power>index for power,index in zip(powers,indices)):continue
                factor=sp.prod(sp.binomial(index,power)/sp.binomial(degree,power) for index,power,degree in zip(indices,powers,degrees))
                key=(monomial[0],*monomial[1+len(cubes):]);row[key]=row.get(key,0)+coefficient*factor
            rows.append({key:sp.cancel(value) for key,value in row.items() if value})
        failed=0;total=0;minimum=None
        for row in rows:
            shifted={}
            for key,coefficient in row.items():
                power=key[0]
                for tp in range(power+1):
                    new=(tp,*key[1:]);shifted[new]=shifted.get(new,0)+coefficient*sp.binomial(power,tp)*13**(power-tp)
            shifted={key:sp.cancel(value) for key,value in shifted.items() if value}
            degree=max(sum(key[1:]) for key in shifted);hom={}
            for key,coefficient in shifted.items():
                missing=degree-sum(key[1:])
                for extra in weak_compositions(missing,len(z)):
                    new=(key[0],*(left+right for left,right in zip(key[1:],extra)))
                    hom[new]=hom.get(new,0)+coefficient*multinomial(missing,extra)
            values=[value for value in hom.values() if value]
            failed+=len([value for value in values if value<0]);total+=len(values)
            local=min(values);minimum=local if minimum is None else min(minimum,local)
        print(mode,"exact row",expression_index,"power_terms",len(terms),"cube_degrees",degrees,"cube_rows",len(rows),"homogeneous_terms",total,"negative",failed,"minimum",minimum,flush=True)


if __name__=="__main__":
    probe("high");probe("low")
    exact("high");exact("low")
