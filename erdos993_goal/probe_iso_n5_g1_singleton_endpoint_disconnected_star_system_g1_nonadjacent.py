#!/usr/bin/env python3
"""Symbolic reconnaissance for disconnected endpoint star systems."""
from __future__ import annotations
import sympy as sp
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import ratio_parameterization
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import tensor_bernstein_sparse,shift_and_simplex_homogenize
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import block,n4_deleted
from prove_iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_g1_nonadjacent import add,conv,isolate,newton,shift

ONE=(1,0,0,0,0,0,0,0);XX=(0,1,0,0,0,0,0,0)

def residual(U,W,QE,QV):return sp.expand(n4_deleted(U,W)+block(QE,W)+block(U,QV))

def leaf_leaf_rows():
    k,l,t=sp.symbols("u_leaves_k v_leaves_l common_isolates_t",nonnegative=True)
    P=isolate(ONE,k);Q=isolate(ONE,l)
    Y=add(Q,XX)
    R=isolate(ONE,t)
    U=conv(R,conv(P,Y));W=conv(R,conv(P,Q));QE=conv(R,Y);QV=conv(R,Q)
    F=residual(U,W,QE,QV);rows=[]
    for ik,rk in enumerate(newton(F,k)):
      for il,rl in enumerate(newton(rk,l)):
       for it,r in enumerate(newton(rl,t)):
        if r!=0:rows.append((ik,il,it,sp.factor(r)))
    return F,rows

def fixed_star_rows(mu,mv):
    k,l,t=sp.symbols("k l t",nonnegative=True)
    aa=sp.symbols(f"a0:{mu}",nonnegative=True);bb=sp.symbols(f"b0:{mv}",nonnegative=True)
    P=isolate(ONE,k);H=ONE
    for d in aa:
        L=isolate(ONE,d);P=conv(P,add(L,XX));H=conv(H,L)
    Q=isolate(ONE,l);J=ONE
    for d in bb:
        L=isolate(ONE,d);Q=conv(Q,add(L,XX));J=conv(J,L)
    X=add(P,shift(H));Y=add(Q,shift(J));R=isolate(ONE,t)
    U=conv(R,conv(P,Y));W=conv(R,conv(P,Q));QE=conv(R,conv(H,Y));QV=conv(R,conv(H,Q))
    F=residual(U,W,QE,QV);records=[((),F)]
    for var in (k,l,t,*aa,*bb):
        records=[(idx+(i,),row) for idx,r in records for i,row in enumerate(newton(r,var)) if row!=0]
    vals=[sp.factor(r) for _,r in records]
    constants=all(not v.free_symbols for v in vals)
    negatives=[(records[i][0],v) for i,v in enumerate(vals) if v.is_number and v<0]
    return {"mu":mu,"mv":mv,"rows":len(records),"constants":constants,
            "minimum":min(vals) if constants else None,"negatives":negatives[:20],
            "nonconstant_preview":[(records[i][0],v) for i,v in enumerate(vals) if v.free_symbols][:5]}

def fixed_star_generic_common(mu,mv):
    k,l,t=sp.symbols("k l t",nonnegative=True);x=(sp.Integer(1),*sp.symbols("x1:8"))
    aa=sp.symbols(f"a0:{mu}",nonnegative=True);bb=sp.symbols(f"b0:{mv}",nonnegative=True)
    P=isolate(ONE,k);H=ONE
    for d in aa:
        L=isolate(ONE,d);P=conv(P,add(L,XX));H=conv(H,L)
    Q=isolate(ONE,l);J=ONE
    for d in bb:
        L=isolate(ONE,d);Q=conv(Q,add(L,XX));J=conv(J,L)
    Y=add(Q,shift(J));R=isolate(x,t)
    U=conv(R,conv(P,Y));W=conv(R,conv(P,Q));QE=conv(R,conv(H,Y));QV=conv(R,conv(H,Q))
    records=[((),residual(U,W,QE,QV))]
    for var in (k,l,t,*aa,*bb):
        records=[(idx+(i,),row) for idx,r in records for i,row in enumerate(newton(r,var)) if row!=0]
    unique=[]
    for idx,row in records:
        row=sp.expand(row)
        if row not in unique:unique.append(row)
    return x,records,unique

def fixed_star_generic_common_no_isolate(mu,mv):
    k,l=sp.symbols("k l",nonnegative=True);x=(sp.Integer(1),*sp.symbols("x1:8"))
    aa=sp.symbols(f"a0:{mu}",nonnegative=True);bb=sp.symbols(f"b0:{mv}",nonnegative=True)
    P=isolate(ONE,k);H=ONE
    for d in aa:
        L=isolate(ONE,d);P=conv(P,add(L,XX));H=conv(H,L)
    Q=isolate(ONE,l);J=ONE
    for d in bb:
        L=isolate(ONE,d);Q=conv(Q,add(L,XX));J=conv(J,L)
    Y=add(Q,shift(J));R=x
    U=conv(R,conv(P,Y));W=conv(R,conv(P,Q));QE=conv(R,conv(H,Y));QV=conv(R,conv(H,Q))
    records=[((),residual(U,W,QE,QV))]
    for var in (k,l,*aa,*bb):
        records=[(idx+(i,),row) for idx,r in records for i,row in enumerate(newton(r,var)) if row!=0]
    unique=[]
    for idx,row in records:
        row=sp.expand(row)
        if row not in unique:unique.append(row)
    return x,records,unique

def common_large_check(mu,mv):
    x,records,rows=fixed_star_generic_common(mu,mv);N,A,B=sp.symbols("N A B",nonnegative=True)
    out=[]
    for i,row in enumerate(rows):
      for sector in ("high","low"):
        cubes,z,sub,cone,rho=ratio_parameterization(sector,N,A,B,x,5)
        num,den=sp.fraction(sp.together(row.subs(x[1],N).subs(sub)))
        poly=sp.Poly(num,N,*cubes,*z);deg,br=tensor_bernstein_sparse(poly,len(cubes));hom,total,minimum=shift_and_simplex_homogenize(br,len(z))
        out.append((i,sector,minimum,total,len(br),len(poly.terms())))
    return {"mu":mu,"mv":mv,"unique":len(rows),"branches":len(out),"minimum":min(v[2] for v in out),"negative":[v for v in out if v[2]<0][:20],"coefficients":sum(v[3] for v in out)}

def common_no_isolate_large_check(mu,mv):
    x,records,rows=fixed_star_generic_common_no_isolate(mu,mv);N,A,B=sp.symbols("N A B",nonnegative=True);out=[]
    for i,row in enumerate(rows):
      for sector in ("high","low"):
        cubes,z,sub,cone,rho=ratio_parameterization(sector,N,A,B,x,5)
        num,den=sp.fraction(sp.together(row.subs(x[1],N).subs(sub)))
        poly=sp.Poly(num,N,*cubes,*z);deg,br=tensor_bernstein_sparse(poly,len(cubes));hom,total,minimum=shift_and_simplex_homogenize(br,len(z));out.append((i,sector,minimum,total))
    return {"mu":mu,"mv":mv,"raw":len(records),"unique":len(rows),"minimum":min(v[2] for v in out),"negative":[v for v in out if v[2]<0][:20],"coefficients":sum(v[3] for v in out)}

def collect_common_rows(max_total=6):
    unique={};stats=[]
    for total in range(max_total+1):
      for mu in range(total+1):
        mv=total-mu;x,records,_=fixed_star_generic_common(mu,mv)
        before=len(unique)
        for idx,row in records:
            row=sp.expand(row);unique.setdefault(row,(mu,mv,idx))
        stats.append((mu,mv,len(records),len(unique)-before,len(unique)))
        print("COLLECT",stats[-1],flush=True)
    return x,list(unique),unique,stats

def collect_common_no_isolate_rows(max_total=6):
    unique={};stats=[]
    for total in range(max_total+1):
      for mu in range(total+1):
        mv=total-mu;x,records,_=fixed_star_generic_common_no_isolate(mu,mv);before=len(unique)
        for idx,row in records:unique.setdefault(sp.expand(row),(mu,mv,idx))
        stats.append((mu,mv,len(records),len(unique)-before,len(unique)));print("COLLECT_NOISO",stats[-1],flush=True)
    return x,list(unique),unique,stats

def main():
    F,rows=leaf_leaf_rows();print("DEG",*[sp.degree(F,v) for v in sorted(F.free_symbols,key=str)])
    print("ROWS",len(rows));
    for rec in rows:print(rec)
    for mu,mv in ((1,0),(0,1),(1,1),(2,0),(2,1),(2,2),(3,0),(3,1)):
        print("FIXED",fixed_star_rows(mu,mv),flush=True)

if __name__=="__main__":main()
