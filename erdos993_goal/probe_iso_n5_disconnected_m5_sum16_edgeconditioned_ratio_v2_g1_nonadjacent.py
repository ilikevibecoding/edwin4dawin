#!/usr/bin/env python3
"""Lean edge-conditioned ratio-cone probe for active-root sum16."""

import itertools
import math
import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_dense_ratio_slack_g1_nonadjacent import build_lower
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import P


def cone_expression(mode):
    (n,E,R),lower=build_lower()
    a,b,w,alpha=sp.symbols("a b w alpha",nonnegative=True)
    # 1<=E<=n, s=n-E=(n-1)a; actual forest range E<=n-1 lies inside.
    Ebox=n-(n-1)*a
    Rbox=b*(Ebox-1)
    rho1_fixed=2*n-6+4*(n-1)*a/n
    base_excess=rho1_fixed-4
    rho5_ceiling=2*n-10
    if mode=="high":
        z=sp.symbols("high_z0:4",nonnegative=True)
        rho5=rho5_ceiling*w
        excess=base_excess-rho5
        rho4=rho5+1+excess*z[3]
        rho3=rho4+1+excess*z[2]
        rho2=rho3+1+excess*z[1]
        rho1=rho2+1+excess*z[0]
        cubes=(a,b,w)
    else:
        z=sp.symbols("low_z0:3",nonnegative=True)
        rho5=rho5_ceiling*w
        excess=base_excess-rho5
        rho4=rho5+1+excess*z[2]
        rho3=rho4+1+excess*z[1]
        rho2=rho3+2-alpha+excess*z[0]
        rho1=rho2+alpha
        cubes=(a,b,w,alpha)
    product=1;sub={}
    for rank,rho in zip(range(2,7),(rho1,rho2,rho3,rho4,rho5)):
        product*=rho;sub[P[rank]]=n*product/(2**(rank-1)*sp.factorial(rank))
    expression=lower.subs({E:Ebox,R:Rbox,**sub})
    return n,z,cubes,expression


def corners():
    for mode in ("high","low"):
        n,z,cubes,expr=cone_expression(mode)
        failures=[]
        vertices=[{value:int(index==chosen) for index,value in enumerate(z)} for chosen in range(len(z))]
        for N in (13,20,40,100,1000):
            for corner in itertools.product((0,1),repeat=len(cubes)):
                for vertex in vertices:
                    value=sp.factor(expr.subs({n:N,**dict(zip(cubes,corner)),**vertex}))
                    if value<0:failures.append((N,corner,tuple(vertex[v] for v in z),value))
        print(mode,"corner_failures",len(failures),flush=True)
        for row in failures[:20]:print("NEG",row,flush=True)


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
    n,z,cubes,expr=cone_expression(mode)
    t=sp.symbols("t",nonnegative=True)
    scaled=sp.cancel(2880*n**3*expr)
    numerator,denominator=sp.fraction(scaled)
    assert denominator==1
    gens=(n,*cubes,*z)
    print(mode,"building sparse polynomial",flush=True)
    polynomial=sp.Poly(numerator,*gens)
    terms=polynomial.terms()
    cube_degrees=[max(monomial[1+index] for monomial,_ in terms) for index in range(len(cubes))]
    cube_indices=list(itertools.product(*(range(degree+1) for degree in cube_degrees)))
    cube_rows=[]
    for indices in cube_indices:
        row={}
        for monomial,coefficient in terms:
            powers=monomial[1:1+len(cubes)]
            if any(power>index for power,index in zip(powers,indices)):
                continue
            factor=sp.prod(
                sp.binomial(index,power)/sp.binomial(degree,power)
                for index,power,degree in zip(indices,powers,cube_degrees)
            )
            key=(monomial[0],*monomial[1+len(cubes):])
            row[key]=row.get(key,0)+coefficient*factor
        cube_rows.append({key:sp.cancel(value) for key,value in row.items() if value})
    print(mode,"power_terms",len(terms),"cube_degrees",cube_degrees,"cube_rows",len(cube_rows),flush=True)
    total_terms=0;failures=[];minimum=None;row_data=[]
    for row_index,row in enumerate(cube_rows):
        shifted={}
        for key,coefficient in row.items():
            n_power=key[0];z_exponents=key[1:]
            for t_power in range(n_power+1):
                shifted_key=(t_power,*z_exponents)
                shifted[shifted_key]=shifted.get(shifted_key,0)+(
                    coefficient*sp.binomial(n_power,t_power)*13**(n_power-t_power)
                )
        shifted={key:sp.cancel(value) for key,value in shifted.items() if value}
        degree=max(sum(key[1:]) for key in shifted)
        compositions={missing:list(weak_compositions(missing,len(z))) for missing in range(degree+1)}
        homogeneous={}
        for monomial,coefficient in shifted.items():
            tp=monomial[0];ze=monomial[1:];missing=degree-sum(ze)
            for extra in compositions[missing]:
                key=(tp,*(left+right for left,right in zip(ze,extra)))
                homogeneous[key]=homogeneous.get(key,0)+coefficient*multinomial(missing,extra)
        nonzero={key:value for key,value in homogeneous.items() if value}
        bad=[(key,value) for key,value in nonzero.items() if value<0]
        if bad:failures.append((row_index,len(bad),bad[:3]))
        local=min(nonzero.values());minimum=local if minimum is None else min(minimum,local)
        total_terms+=len(nonzero)
        row_data.append((degree,len(nonzero),len(bad)))
        print(mode,"row",row_index,"degree",degree,"terms",len(nonzero),"bad",len(bad),flush=True)
    print(mode,"total_terms",total_terms,"failed_rows",len(failures),"minimum",minimum,flush=True)
    for failure in failures[:20]:print("FAIL",failure,flush=True)
    return row_data,failures


if __name__=="__main__":
    corners()
    exact("high")
    exact("low")
