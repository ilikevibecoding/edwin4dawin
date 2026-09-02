#!/usr/bin/env python3
"""Exact adjacent endpoint g1 theorem with two nontrivial u-side stars."""
from __future__ import annotations
from fractions import Fraction
import functools,hashlib,itertools,json
from pathlib import Path
import networkx as nx
import sympy as sp
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import ratio_parameterization
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import coefficient_rows_hash,polynomial_hash,shift_and_simplex_homogenize,tensor_bernstein_sparse
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import at,block,n4_deleted
from prove_iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_g1_nonadjacent import add,shift,conv,isolate,newton
HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g1_singleton_endpoint_u_two_stars_adjacent_all_order_exact_g1_nonadjacent_20260830.json"
MARKER="PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_TWO_STARS_ADJACENT_ALL_ORDER_G1_NONADJACENT"
PINS={
 "prove_iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_g1_nonadjacent.py":"AFCCB1575D48E16290D8E2C2EBBAD7DEC7EE248439956183171B0374771FB49B",
 "iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_exact_g1_nonadjacent_20260830.json":"979D9AE4C0ABBF896DDB822C028FF67A3B21A968E8E4C35396DC8E4E566EAA41",
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
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
@functools.lru_cache(maxsize=1)
def generic_rows():
 x=(sp.Integer(1),*sp.symbols("x1:8"));h=(sp.Integer(1),*sp.symbols("h1:8"));s,k,a,b=sp.symbols("selected_isolates_s pendant_leaves_k star_a_leaves star_b_leaves",nonnegative=True);P=isolate(x,s);Y=add(P,shift(h));one=(1,0,0,0,0,0,0,0);xx=(0,1,0,0,0,0,0,0);La=isolate(one,a);Lb=isolate(one,b);X=isolate(conv(add(La,xx),add(Lb,xx)),k);X0=conv(La,Lb);U=conv(X,Y);W=conv(X,P);C=conv(X0,P);F=sp.expand(n4_deleted(U,W)+block(C,W)+block(U,C));raw=[]
 for ik,rk in enumerate(newton(F,k)):
  for ia,ra in enumerate(newton(rk,a)):
   for ib,rb in enumerate(newton(ra,b)):
    for iss,r in enumerate(newton(rb,s)):
     if r!=0:raw.append((ik,ia,ib,iss,r))
 assert len(raw)==126;unique=[];mapping=[]
 for rec in raw:
  expr=rec[-1]
  try:index=next(i for i,v in enumerate(unique) if v[-1]==expr)
  except StopIteration:index=len(unique);unique.append(rec)
  mapping.append({"indices":rec[:-1],"unique":index})
 assert len(unique)==65;return x,h,unique,mapping
@functools.lru_cache(maxsize=1)
def lowered_rows():
 x,h,rows,mapping=generic_rows();N,A,B,Q=sp.symbols("N A B Q",nonnegative=True);aa=N*A/2;bb=B*N*(1-A);c=aa+bb;e=N-aa;q=aa+Q*N*(1-A)*(1-B);edges=N-c;base={x[1]:N,x[2]:choose(N,2)-edges,h[1]:e,h[2]:choose(e,2)-(edges-q)};lo=choose(e,3)-(edges-q)*(e-2);hi=choose(e,3);h4=choose(e,4);pos={"-4*N + 3*x2 - 19","3*N - 4","3"};neg={"-2*(N + 11)","-2","-7","-2*(N + 10)"};out=[];signs=[]
 for *idx,row in rows:
  after=sp.expand(row.subs(base));rawc=sp.factor(sp.diff(row.subs(x[1],N),h[3]));c3=sp.factor(sp.diff(after,h[3]));c4=sp.factor(sp.diff(after,h[4]));key=str(rawc)
  if key in pos:ep=lo;direction="lower"
  elif key in neg:ep=hi;direction="upper"
  else:assert rawc==0;ep=lo;direction="irrelevant"
  assert any(sp.expand(c4-v)==0 for v in (-5*(N+2),-5*N,-5,0)),(idx,c4);value=sp.expand(after.subs({h[3]:ep,h[4]:h4}));assert not any(value.has(h[r]) for r in range(1,8));out.append((*idx,value));signs.append({"indices":idx,"h3":str(c3),"endpoint":direction,"h4":str(c4)})
 return x,(N,A,B,Q),out,mapping,signs
def exact(i,sector):
 x,core,rows,_,_=lowered_rows();*idx,row=rows[i];N,A,B,Q=core;c0,z,sub,cone,rho=ratio_parameterization(sector,N,A,B,x,5);cubes=(A,B,Q,*c0[2:]);offset=sp.symbols("large_offset",nonnegative=True);num,den=sp.fraction(sp.together(row.subs(sub).subs(N,offset+13)));poly=sp.Poly(num,offset,*cubes,*z);degrees,br=tensor_bernstein_sparse(poly,len(cubes));hom,total,minimum=shift_and_simplex_homogenize(br,len(z));assert minimum>=0;return {"unique":i,"indices":idx,"sector":sector,"order_scope":"N>=26","cone":cone,"denominator":str(den),"cube_degrees":degrees,"cube_rows":len(br),"power_terms":len(poly.terms()),"power_hash":polynomial_hash(poly),"homogeneous_terms":total,"homogeneous_hash":coefficient_rows_hash(hom),"minimum":str(minimum),"rho1":str(rho)}
def fixed(order,i,sector):
 assert 15<=order<=25;x,core,rows,_,_=lowered_rows();*idx,row=rows[i];N,A,B,Q=core;c0,z,sub,cone,rho=ratio_parameterization(sector,N,A,B,x,5);cubes=(A,B,Q,*c0[2:]);dummy=sp.symbols("fixed_order_dummy",nonnegative=True);num,den=sp.fraction(sp.together(row.subs(sub).subs(N,order)));poly=sp.Poly(num,dummy,*cubes,*z);degrees,br=tensor_bernstein_sparse(poly,len(cubes));hom,total,minimum=shift_and_simplex_homogenize(br,len(z));assert minimum>=0;return {"order":order,"unique":i,"indices":idx,"sector":sector,"cone":cone,"denominator":str(den),"cube_degrees":degrees,"cube_rows":len(br),"power_terms":len(poly.terms()),"power_hash":polynomial_hash(poly),"homogeneous_terms":total,"homogeneous_hash":coefficient_rows_hash(hom),"minimum":str(minimum),"rho1":str(rho)}
def finite():
 x,h,rows,_=generic_rows();ev=sp.lambdify((*x[1:],*h[1:]),[r for *_,r in rows],modules="math");mins=[None]*65;tot={"forests":0,"patterns":0,"checks":0};by={}
 for N in range(15):
  nf=np=0;local=[None]*65
  for g in forest_graphs(N):
   nf+=1;P=tuple(poly_forest(g));comps=[tuple(sorted(c)) for c in nx.connected_components(g)];choices=[(None,*(v for v in c if g.degree(v)>0)) for c in comps]
   for choice in itertools.product(*choices):
    sel=tuple(v for v in choice if v is not None);hg=g.copy();hg.remove_nodes_from(sel);H=tuple(poly_forest(hg));vals=[int(v) for v in ev(*(at(P,r) for r in range(1,8)),*(at(H,r) for r in range(1,8)))];assert all(v>=0 for v in vals),(N,sel,vals)
    for i,v in enumerate(vals):local[i]=v if local[i] is None else min(local[i],v);mins[i]=v if mins[i] is None else min(mins[i],v)
    np+=1
  tot["forests"]+=nf;tot["patterns"]+=np;tot["checks"]+=65*np;by[str(N)]={"forests":nf,"patterns":np,"minimum":min(local)};print("FINITE",N,nf,np,min(local),flush=True)
 return {**tot,"minima":mins,"by_order":by}
def main():
 assert {n:sha(HERE/n) for n in PINS}==PINS;f=finite();assert set(f["by_order"])=={str(order) for order in range(15)};x,core,rows,mapping,signs=lowered_rows();large=[exact(i,s) for i in range(65) for s in ("high","low")];assert len(large)==130;bridge=[fixed(order,i,s) for order in range(15,26) for i in range(65) for s in ("high","low")];assert len(bridge)==1430
 report={"marker":MARKER,"theorem":"In singleton_endpoint_p_equals_u, if uv is an edge and u has arbitrary leaf neighbours plus at most two other children, each a nontrivial centred star, then rank-five g1 is nonnegative.","geometry":"X=(1+x)^k F_a F_b, X0=(1+x)^(a+b); U=X(P+xH), W=XP, QE=QV=X0P","identity":"g1=S+N4(C)+F, F=N4(D)+B(QE,W)+B(U,QV)","raw_newton_rows":126,"distinct_newton_rows":65,"row_mapping":mapping,"endpoint_signs":signs,"finite":f,"large":{"order_scope":"N>=26","branches":130,"cube_rows":sum(r["cube_rows"] for r in large),"power_terms":sum(r["power_terms"] for r in large),"homogeneous_coefficients":sum(r["homogeneous_terms"] for r in large),"minimum":str(min(Fraction(r["minimum"]) for r in large)),"rows":large},"fixed_order_bridge":{"orders":[15,25],"branches":len(bridge),"cube_rows":sum(r["cube_rows"] for r in bridge),"power_terms":sum(r["power_terms"] for r in bridge),"homogeneous_coefficients":sum(r["homogeneous_terms"] for r in bridge),"minimum":str(min(Fraction(r["minimum"]) for r in bridge)),"rows":bridge},"dependencies_sha256":PINS,"scope":"Exactly at most two nontrivial u-side stars. Three or more stars, other placements/modes, g2, all N5, and Problem 993 remain.","source_sha256":sha(Path(__file__))};raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"finite_checks":f["checks"],"large":report["large"]|{"rows":"omitted"},"fixed_order_bridge":report["fixed_order_bridge"]|{"rows":"omitted"},"scope":report["scope"]},indent=2,sort_keys=True));print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
