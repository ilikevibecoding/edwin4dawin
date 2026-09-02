#!/usr/bin/env python3
"""Exact replay for the rooted c4/B3/E terminal-broom reduction.

The replay proves the symbolic identities, builds the exact degree-moment
floors for n=23..38, checks the pure-cubic B2=5 specialization, and retains
an exact negative point in the still-relaxed higher-rank cone.
"""
from __future__ import annotations
import json
from functools import lru_cache
from math import comb
from pathlib import Path
import sympy as sp
from verify_rank7_terminal_broom_reduction import c,h,exact_decomposition,newton_coefficients

HERE=Path(__file__).resolve().parent
REPORT=HERE/"rank7_terminal_broom_rooted_c4_moment_exact_20260817.json"

@lru_cache(None)
def partitions(total:int,cap:int):
    if total==0:return ((),)
    out=[]
    for x in range(min(total,cap),0,-1):
        for tail in partitions(total-x,x):out.append((x,)+tail)
    return tuple(out)

def degree_table(n:int):
    table={}
    for part in partitions(n-2,n-2):
        b2=sum(comb(x,2) for x in part)
        b3=sum(comb(x,3) for x in part)
        table[b2]=min(table.get(b2,10**30),b3)
    return table

def main():
    n,e,beta,b3x,E,V=sp.symbols("n e beta b3x E V")
    wedge=beta+n-2
    degree3=beta+b3x
    c4_general=(sp.binomial(n,4)-e*sp.binomial(n-2,2)+sp.binomial(e,2)
                +(n-4)*wedge-degree3-E)
    c4_tree=sp.factor(c4_general.subs(e,n-1))
    c4_project=sp.binomial(n-3,4)+(n-5)*beta-b3x-(E-(n-3))
    assert sp.simplify(sp.expand_func(c4_tree-c4_project))==0

    x,y=sp.symbols("x y",integer=True,nonnegative=True)
    b3_smoothing=sp.simplify(sp.binomial(x,3)+sp.binomial(y,3)
        -sp.binomial(x-1,3)-sp.binomial(y+1,3))
    assert sp.simplify(b3_smoothing-(sp.binomial(x-1,2)-sp.binomial(y,2)))==0
    mm=sp.symbols("m",integer=True,positive=True)
    single_convex=sp.simplify(sp.binomial(mm-3,4)-2*sp.binomial(mm-4,4)+sp.binomial(mm-5,4))
    assert sp.simplify(sp.expand_func(single_convex-sp.binomial(mm-5,2)))==0

    p,q=sp.symbols("p q",integer=True,nonnegative=True)
    pure=sp.factor(c4_project.subs({beta:5,b3x:0,E:n+4-p+q}))
    target=sp.binomial(n-3,4)+5*n-32+p-q
    assert sp.simplify(sp.expand_func(pure-target))==0

    tables=[]
    for order in range(23,39):
        table=degree_table(order)
        tables.append({"n":order,"degree_partitions":len(partitions(order-2,order-2)),
            "feasible_B2_levels":len(table),"B2_min":min(table),"B2_max":max(table),
            "B3x_at_B2_5":table.get(5)})

    # Exact surviving abstract point after c4, degree-moment, containment,
    # and single-neighbor-class bounds are imposed.
    nn=23;rr=1;mm=21;BB=20;X=sp.Rational(3,5);A=sp.Rational(18,35)
    c2=sp.Integer(comb(22,2));c3=sp.Integer(comb(21,3)+BB);w=c2/c3
    xlo=8*w/(6-w);xhi=4*w/(3*(1-w));ratio=xlo+(xhi-xlo)*X
    c4=sp.factor(c3/ratio)
    kappa=sp.Rational(nn**3-8*nn**2-19*nn+302,6)
    c5=sp.factor(((nn-7)*(nn-8)*c4+kappa*BB)/(5*(nn-3)))
    c6=sp.factor((25*c5*c5-4*c4*c5)/(39*c4))
    c7=sp.factor((1-(2+c5/c6)/14)*c6*c6/c5)
    a=A*comb(mm,4);E4=comb(mm,4)-a
    e_lower=sp.factor(E4/comb(mm-2,2));assert e_lower==17
    neighbor_mass=mm-e_lower;assert neighbor_mass==4
    single=sp.Integer(comb(mm-int(neighbor_mass)-3,4));assert single==1001
    b=sp.factor(c5-a-single)
    lower=[sp.Rational(91,45)*a,comb(mm,5)-sp.Rational(mm-4,3)*E4,
        c6-sp.Rational(nn-6,6)*(c5-a),sp.Integer(0)]
    upper=[sp.Rational(mm-4,5)*a,comb(mm,5)-sp.Rational(mm-4,5)*E4,
        c5-a-single,c6]
    assert all(b>=z for z in lower) and all(b<=z for z in upper)
    b3floor=degree_table(nn)[BB];assert b3floor==8
    c4upper=sp.Integer(comb(nn-3,4)+(nn-5)*BB+(nn-3)-b3floor)
    assert c4<=c4upper
    raw=newton_coefficients(exact_decomposition())[0]
    delta=sp.factor(raw.subs({c[0]:1,c[1]:nn,c[2]:c2,c[3]:c3,c[4]:c4,c[5]:c5,
        c[6]:c6,c[7]:c7,h[5]:c5-a,h[6]:c6-b},simultaneous=True))
    assert delta<0

    report={
      "status":"PASS_EXACT_ROOTED_C4_MOMENT_REDUCTION_ONLY",
      "warning":"The c4 obstruction is removed, but the remaining higher-rank cone is still not positive.",
      "identities":{
        "general_forest_c4":str(c4_general),
        "tree_project_B2_c4":str(c4_project),
        "conventions":"beta=sum C(deg-1,2), b3x=sum C(deg-1,3), E=sum_edges (deg(u)-1)(deg(v)-1)",
        "rooted_B3E_lower":"B3x+E >= C(r-1,3)+sum_{u in N(q)} C(x_u,3)+(r-1)sum x_u",
        "b3_smoothing_drop":str(b3_smoothing)},
      "degree_moment_tables":tables,
      "pure_cubic_B2_5":{
        "inputs":"beta=5,b3x=0,E=n+4-p+q",
        "c4":str(target),
        "single_neighbor_discrete_convexity":str(single_convex),
        "V7_hypothesis":"A is a tree, so alpha(A)>=ceil(n/2)>=12 for n>=23.",
        "numerical_scouting_only":"At n=23, ranks 0..6, r=1..3, and the over-covering rectangle 0<=p<=4,0<=q<=7 all optimized minima were positive."},
      "exact_surviving_abstract_failure":{
        "parameters":{"n":nn,"r":rr,"m":mm,"B2":BB,"X":"3/5","A":"18/35",
          "c3":str(c3),"c4":str(c4),"c5":str(c5),"c6":str(c6),"c7":str(c7),
          "a":str(a),"b":str(b),"e_lower":str(e_lower),"single_neighbor_floor":str(single),
          "B3x_floor":b3floor,"c4_upper":str(c4upper)},
        "Delta0":str(delta),
        "classification":"exact relaxed-domain failure, not a tree counterexample",
        "lesson":"Need a joint c5/V or exact B2 decomposition across q and J; c4 and degree moments alone are insufficient."},
      "rooted_WROM_audit":{"orders":[18,19,20],"free_trees":1264887,
        "roots":24732051,"failures":0,"replay":"verify_rank7_joint_branching_surplus_tree_audit.rs"}}
    REPORT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))
    return 0
if __name__=="__main__":raise SystemExit(main())
