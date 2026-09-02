#!/usr/bin/env python3
"""Exact endpoint g1 theorem when u's other adjacent branches are leaves.

In singleton_endpoint_p_equals_u assume uv is an edge and every neighbour of
u other than v is a leaf of C.  If k is their number, then

    U=(1+x)^k(P+xH), W=(1+x)^k P, QE=QV=P,

where H is obtained from P by deleting the independent neighbours of v other
than u.  Expanding first in C(k,i), then in the isolated selected components
of P, gives 21 nonzero Newton rows.  Complete finite cores and exact high/low
forest-ratio cones prove every row nonnegative.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import ratio_parameterization
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash, polynomial_hash, shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import (
    at, block, n4_deleted,
)


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g1_singleton_endpoint_u_pendant_star_adjacent_all_order_exact_g1_nonadjacent_20260830.json"
MARKER="PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_PENDANT_STAR_ADJACENT_ALL_ORDER_G1_NONADJACENT"
PINS={
 "derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent.py":"8100E7B132606481575C681088C30F8B7D6308E670162AC3B96E5C92982C6C89",
 "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json":"5E277A78168DE1978C9AACD6AFF12F55A624F4D8CCF4017CA290406106A3C3B1",
 "prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent.py":"44C96FE86888B5BA34DC85C3DF76469A6D323AE3763E84C2103D6DC6DFC75BD5",
 "iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_exact_g1_nonadjacent_20260830.json":"2A0244A2925811F1685A0783F368F3C96DB1E5DD38EC6550CC62A3ACEC976CD5",
 "probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent.py":"72795F07C3C0A30CF0B6E05C2980AA97367763EEC6AC8B43514F873AA23D6CFF",
 "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":"D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
 "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":"DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
 "probe_iso_leaf_cross_remainder_root.py":"A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
 "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":"38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
 "verify_rank4_three_halves_forest_certificate.py":"99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
 "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":"CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
 "verify_rank5_three_halves_forest_certificate.py":"56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
 "TWO_STEP_FACTORIAL_DROP_FOREST_CERTIFICATE_2026-07-27.md":"C84F064D4E980F0CCA7AA5853385940AE0892BCE4932A37799824DA3B11C2DC1",
 "verify_two_step_factorial_drop_forest_certificate.py":"C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
}


def sha256(path): return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def isolate(row,t):
    return tuple(sp.expand(sp.expand_func(sum(
        sp.binomial(t,j)*at(row,k-j) for j in range(k+1)
    ))) for k in range(8))


def newton(expression, variable):
    degree=sp.degree(expression,variable)
    rows=[sp.expand(sum(
        (-1)**(r-j)*sp.binomial(r,j)*expression.subs(variable,j)
        for j in range(r+1)
    )) for r in range(degree+1)]
    reconstructed=sp.expand(sp.expand_func(sum(
        sp.binomial(variable,r)*row for r,row in enumerate(rows)
    )))
    assert sp.expand(expression-reconstructed)==0
    return rows


def generic_rows():
    x=(sp.Integer(1),*sp.symbols("x1:8"));h=(sp.Integer(1),*sp.symbols("h1:8"))
    s,k=sp.symbols("selected_isolates_s pendant_leaves_k",nonnegative=True)
    P=isolate(x,s)
    Y=tuple(at(P,r)+at(h,r-1) for r in range(8))
    U=isolate(Y,k);W=isolate(P,k)
    expression=sp.expand(n4_deleted(U,W)+block(P,W)+block(U,P))
    rows=[]
    for k_index,krow in enumerate(newton(expression,k)):
        for s_index,row in enumerate(newton(krow,s)):
            if row!=0: rows.append((k_index,s_index,row))
    assert len(rows)==21
    return x,h,rows


def lowered_rows():
    x,h,rows=generic_rows();N,A,B,Q=sp.symbols("N A B Q",nonnegative=True)
    a=N*A/2;b=B*N*(1-A);c=a+b;e=N-a;q=a+Q*N*(1-A)*(1-B);edges=N-c
    base={x[1]:N,x[2]:choose(N,2)-edges,h[1]:e,h[2]:choose(e,2)-(edges-q)}
    h3lo=choose(e,3)-(edges-q)*(e-2);h3hi=choose(e,3);h4hi=choose(e,4)
    lowered=[];signs=[]
    positive_h3={(0,0),(0,1),(0,2)}
    negative_h3={(1,0),(1,1),(2,0)}
    expected_h3={(0,0):3*base[x[2]],(0,1):3*N,(0,2):sp.Integer(3),(1,0):-2*(N+3),(1,1):sp.Integer(-2),(2,0):sp.Integer(-7)}
    for ki,si,row in rows:
        after=sp.expand(row.subs(base));c3=sp.factor(sp.diff(after,h[3]));c4=sp.factor(sp.diff(after,h[4]))
        assert sp.expand(c3-expected_h3.get((ki,si),0))==0
        if (ki,si) in positive_h3: endpoint3=h3lo;direction="lower"
        elif (ki,si) in negative_h3: endpoint3=h3hi;direction="upper"
        else: assert c3==0;endpoint3=h3lo;direction="irrelevant"
        assert c4 in (-5*N,-5,0)
        value=sp.expand(after.subs({h[3]:endpoint3,h[4]:h4hi}))
        assert not any(value.has(h[r]) for r in range(1,8))
        lowered.append((ki,si,value));signs.append({"k_row":ki,"s_row":si,"h3":str(c3),"h3_endpoint":direction,"h4":str(c4)})
    return x,(N,A,B,Q),lowered,signs


def exact_sector(index,sector):
    x,core,rows,_=lowered_rows();ki,si,row=rows[index];N,A,B,Q=core
    cubes0,simplex,subs,cone,rho1=ratio_parameterization(sector,N,A,B,x,5)
    cubes=(A,B,Q,*cubes0[2:]);offset=sp.symbols("large_offset",nonnegative=True)
    numerator,denominator=sp.fraction(sp.together(row.subs(subs).subs(N,offset+13)))
    poly=sp.Poly(numerator,offset,*cubes,*simplex)
    degrees,bern=tensor_bernstein_sparse(poly,len(cubes))
    hom,total,minimum=shift_and_simplex_homogenize(bern,len(simplex));assert minimum>=0
    return {"index":index,"k_row":ki,"s_row":si,"sector":sector,"order_scope":"N>=26","cone":cone,"denominator":str(denominator),"cube_degrees":degrees,"cube_rows":len(bern),"power_terms":len(poly.terms()),"power_hash":polynomial_hash(poly),"homogeneous_terms":total,"homogeneous_hash":coefficient_rows_hash(hom),"minimum":str(minimum),"rho1":str(rho1)}

def fixed_sector(order,index,sector):
    assert 15<=order<=25
    x,core,rows,_=lowered_rows();ki,si,row=rows[index];N,A,B,Q=core
    cubes0,simplex,subs,cone,rho1=ratio_parameterization(sector,N,A,B,x,5);cubes=(A,B,Q,*cubes0[2:]);dummy=sp.symbols("fixed_order_dummy",nonnegative=True)
    numerator,denominator=sp.fraction(sp.together(row.subs(subs).subs(N,order)));poly=sp.Poly(numerator,dummy,*cubes,*simplex)
    degrees,bern=tensor_bernstein_sparse(poly,len(cubes));hom,total,minimum=shift_and_simplex_homogenize(bern,len(simplex));assert minimum>=0
    return {"order":order,"index":index,"k_row":ki,"s_row":si,"sector":sector,"cone":cone,"denominator":str(denominator),"cube_degrees":degrees,"cube_rows":len(bern),"power_terms":len(poly.terms()),"power_hash":polynomial_hash(poly),"homogeneous_terms":total,"homogeneous_hash":coefficient_rows_hash(hom),"minimum":str(minimum),"rho1":str(rho1)}


def finite_certificate():
    x,h,rows=generic_rows();evaluator=sp.lambdify((*x[1:],*h[1:]),[r for _,_,r in rows],modules="math")
    totals={"forests":0,"patterns":0,"checks":0};mins=[None]*21;by={}
    for N in range(15):
        nf=np=0;local=[None]*21
        for graph in forest_graphs(N):
            nf+=1;P=tuple(poly_forest(graph));components=[tuple(sorted(c)) for c in nx.connected_components(graph)]
            choices=[(None,*(v for v in c if graph.degree(v)>0)) for c in components]
            for choice in itertools.product(*choices):
                selected=tuple(v for v in choice if v is not None);Hgraph=graph.copy();Hgraph.remove_nodes_from(selected);H=tuple(poly_forest(Hgraph))
                values=[int(v) for v in evaluator(*(at(P,r) for r in range(1,8)),*(at(H,r) for r in range(1,8)))]
                assert all(v>=0 for v in values),(N,selected,values)
                for i,v in enumerate(values):local[i]=v if local[i] is None else min(local[i],v);mins[i]=v if mins[i] is None else min(mins[i],v)
                np+=1
        totals["forests"]+=nf;totals["patterns"]+=np;totals["checks"]+=21*np;by[str(N)]={"forests":nf,"patterns":np,"minima":local};print("FINITE",N,nf,np,local,flush=True)
    return {**totals,"minima":mins,"by_order":by}


def main():
    assert {n:sha256(HERE/n) for n in PINS}==PINS
    finite=finite_certificate();assert set(finite["by_order"])=={str(order) for order in range(15)}
    _x,_core,rows,signs=lowered_rows();large=[exact_sector(i,s) for i in range(21) for s in ("high","low")];assert len(large)==42
    bridge=[fixed_sector(order,i,s) for order in range(15,26) for i in range(21) for s in ("high","low")];assert len(bridge)==462
    leaf=json.loads((HERE/"iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_exact_g1_nonadjacent_20260830.json").read_text());assert leaf["marker"]=="PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_LEAF_ADJACENT_ALL_ORDER_G1_NONADJACENT"
    report={
      "marker":MARKER,
      "theorem":"In singleton_endpoint_p_equals_u, if uv is an edge and every other neighbour of u is a leaf in C, then rank-five g1 is nonnegative.",
      "geometry":"U=(1+x)^k(P+xH), W=(1+x)^kP, QE=QV=P",
      "identity":"g1=S(C)+N4(C)+F, F=N4(D)+B(P,W)+B(U,P)",
      "newton_rows":21,"endpoint_signs":signs,"finite":finite,
      "large":{"order_scope":"N>=26","branches":42,"cube_rows":sum(r["cube_rows"] for r in large),"power_terms":sum(r["power_terms"] for r in large),"homogeneous_coefficients":sum(r["homogeneous_terms"] for r in large),"minimum":str(min(Fraction(r["minimum"]) for r in large)),"rows":large},
      "fixed_order_bridge":{"orders":[15,25],"branches":len(bridge),"cube_rows":sum(r["cube_rows"] for r in bridge),"power_terms":sum(r["power_terms"] for r in bridge),"homogeneous_coefficients":sum(r["homogeneous_terms"] for r in bridge),"minimum":str(min(Fraction(r["minimum"]) for r in bridge)),"rows":bridge},
      "sign_payment":"F>=0 by the 21-row certificate; S and N4(C) by the pinned universal theorems inherited fail-closed through the k=0 endpoint theorem.",
      "dependencies_sha256":PINS,
      "scope":"Only the adjacent pendant-star-at-u subfamily is closed. Other adjacent rooted-star branches with nonleaf centres, connected nonadjacent, disconnected nonisolated, other modes, g2, all N5, and Problem 993 remain.",
      "source_sha256":sha256(Path(__file__)),
    }
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"finite_checks":finite["checks"],"large":report["large"]|{"rows":"omitted"},"fixed_order_bridge":report["fixed_order_bridge"]|{"rows":"omitted"},"scope":report["scope"]},indent=2,sort_keys=True));print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)


if __name__=="__main__":main()
