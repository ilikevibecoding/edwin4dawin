#!/usr/bin/env python3
"""Probe edge-conditioned ratio cones for dense active-root sum16."""

import itertools
import math
import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_dense_ratio_slack_g1_nonadjacent import build_lower
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import P, tensor_bernstein


def cone_expression(mode):
    (n,E,R),lower=build_lower()
    a,b,alpha=sp.symbols("a b alpha",nonnegative=True)
    # Stronger all-edge box for n>=13: 1<=E<=n, equivalently
    # s=n-E=(n-1)a with 0<=a<=1.  The actual forest range has E<=n-1,
    # so including E=n at a=0 is a harmless relaxation.
    Ebox=n-(n-1)*a
    Rbox=b*(Ebox-1)
    mandatory=4*(n-1)*a/n               # 4s/n=4(1-E/n)
    remaining=2*n-10                    # rho5<=2(n-5)
    if mode=="high":
        y=sp.symbols("high_y0:5",nonnegative=True)
        z=sp.symbols("high_z0:4",nonnegative=True)
        rho5=remaining*y[0]
        rho4=rho5+1+mandatory*z[3]+remaining*y[4]
        rho3=rho4+1+mandatory*z[2]+remaining*y[3]
        rho2=rho3+1+mandatory*z[1]+remaining*y[2]
        rho1=rho2+1+mandatory*z[0]+remaining*y[1]
        cubes=(a,b)
    else:
        y=sp.symbols("low_y0:4",nonnegative=True)
        z=sp.symbols("low_z0:3",nonnegative=True)
        rho5=remaining*y[0]
        rho4=rho5+1+mandatory*z[2]+remaining*y[3]
        rho3=rho4+1+mandatory*z[1]+remaining*y[2]
        rho2=rho3+2-alpha+mandatory*z[0]+remaining*y[1]
        rho1=rho2+alpha
        cubes=(a,b,alpha)
    product=1;subs={}
    for rank,rho in zip(range(2,7),(rho1,rho2,rho3,rho4,rho5)):
        product*=rho;subs[P[rank]]=n*product/(2**(rank-1)*sp.factorial(rank))
    # Keep the probe factored until a simplex/cube corner is substituted;
    # expanding all nine variables here is needlessly large.
    expression=lower.subs({E:Ebox,R:Rbox,**subs})
    return n,a,b,alpha,y,z,cubes,expression


def corners():
    for mode in ("high","low"):
        n,a,b,alpha,y,z,cubes,expr=cone_expression(mode)
        failures=[]
        yverts=[{u:int(i==j) for i,u in enumerate(y)} for j in range(len(y))]
        zverts=[{u:int(i==j) for i,u in enumerate(z)} for j in range(len(z))]
        for N in (20,21,40,100,1000):
            for corner in itertools.product((0,1),repeat=len(cubes)):
                for yv in yverts:
                    for zv in zverts:
                        val=sp.factor(expr.subs({n:N,**dict(zip(cubes,corner)),**yv,**zv}))
                        if val<0:failures.append((N,corner,tuple(yv[u] for u in y),tuple(zv[u] for u in z),val))
        print(mode,"corner failures",len(failures),flush=True)
        for failure in failures[:30]:print("NEG",failure,flush=True)


def weak_compositions(total, length):
    if length == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in weak_compositions(total - first, length - 1):
            yield (first, *rest)


def multinomial(total, exponents):
    value = math.factorial(total)
    for exponent in exponents:
        value //= math.factorial(exponent)
    return value


def exact(mode):
    n,a,b,alpha,y,z,cubes,expr=cone_expression(mode)
    t=sp.symbols("t",nonnegative=True)
    scaled=sp.cancel(2880*n**3*expr)
    numerator,denominator=sp.fraction(scaled)
    assert denominator==1
    cube_rows=tensor_bernstein(sp.expand(numerator),cubes)
    print(mode,"cube rows",len(cube_rows),flush=True)
    failures=[];total_terms=0;minimum=None
    for row_index,row in enumerate(cube_rows):
        poly=sp.Poly(sp.expand(row.subs(n,t+13)),t,*y,*z)
        dy=max(sum(m[1:1+len(y)]) for m,_ in poly.terms())
        dz=max(sum(m[1+len(y):]) for m,_ in poly.terms())
        homogeneous={}
        y_comps={degree:list(weak_compositions(degree,len(y))) for degree in range(dy+1)}
        z_comps={degree:list(weak_compositions(degree,len(z))) for degree in range(dz+1)}
        for monomial,coefficient in poly.terms():
            tp=monomial[0]; ye=monomial[1:1+len(y)]; ze=monomial[1+len(y):]
            ym=dy-sum(ye);zm=dz-sum(ze)
            for yc in y_comps[ym]:
                yfactor=multinomial(ym,yc)
                yn=tuple(left+right for left,right in zip(ye,yc))
                for zc in z_comps[zm]:
                    key=(tp,*yn,*(left+right for left,right in zip(ze,zc)))
                    homogeneous[key]=homogeneous.get(key,0)+coefficient*yfactor*multinomial(zm,zc)
        values=[value for value in homogeneous.values() if value]
        bad=[(key,value) for key,value in homogeneous.items() if value<0]
        if bad:failures.append((row_index,len(bad),bad[:3]))
        total_terms+=len(values)
        if values:
            local=min(values);minimum=local if minimum is None else min(minimum,local)
        print(mode,"row",row_index,"dy",dy,"dz",dz,"terms",len(values),"bad",len(bad),flush=True)
    print(mode,"total terms",total_terms,"failures",len(failures),"minimum",minimum,flush=True)
    for failure in failures[:20]:print("FAIL",failure,flush=True)


if __name__=="__main__":
    corners()
    exact("high")
    exact("low")
