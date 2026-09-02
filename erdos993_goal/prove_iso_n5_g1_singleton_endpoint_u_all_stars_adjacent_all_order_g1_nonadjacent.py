#!/usr/bin/env python3
"""Exact all-order adjacent singleton-endpoint g1 theorem.

In the canonical deepest singleton endpoint with parent p=u and uv an edge,
every other u-child component is a centred star.  This file closes an
arbitrary number of such stars by an exact pairwise concentration lemma.

Write F_d=(1+x)^d+x.  Replacing two nontrivial factors F_a F_b by
F_{a+b}F_0 keeps the deletion factor fixed and satisfies

    F_{a+b}F_0-F_aF_b=x((1+x)^a-1)((1+x)^b-1).

For the corrected endpoint residual F, the exact difference before minus
after concentration is a*b times a 73-term quotient.  An exact componentwise
deletion cone proves the quotient nonnegative for remaining v-core order
N>=2.  The only smaller cores N=0,1 are proved when another nontrivial star
remains, precisely the situation needed while reducing three or more stars.
The already-frozen two-star theorem is the terminal face.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    tensor_bernstein_sparse,
)
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import (
    at,
    block,
    n4_deleted,
)
from prove_iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_g1_nonadjacent import (
    add,
    conv,
    isolate,
    shift,
)

HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g1_singleton_endpoint_u_all_stars_adjacent_all_order_exact_g1_nonadjacent_20260830.json"
MARKER="PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_ALL_STARS_ADJACENT_ALL_ORDER_G1_NONADJACENT"
PINS={
 "derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent.py":"8100E7B132606481575C681088C30F8B7D6308E670162AC3B96E5C92982C6C89",
 "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json":"5E277A78168DE1978C9AACD6AFF12F55A624F4D8CCF4017CA290406106A3C3B1",
 "prove_iso_n5_g1_singleton_endpoint_u_two_stars_adjacent_all_order_g1_nonadjacent.py":"D25A4B31D3F636FA3EF8C1C48852D09BA4D97D0D67B9903AA5818EFFF6900E54",
 "iso_n5_g1_singleton_endpoint_u_two_stars_adjacent_all_order_exact_g1_nonadjacent_20260830.json":"2287C6CB744B7069BB444F9A4B06E476FA30849D364960E26F1CE311611F6A9E",
 "assemble_iso_n5_s_all_marked_forests_root.py":"E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
 "iso_n5_s_all_marked_forests_exact_root_20260830.json":"E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
 "assemble_iso_all_forest_n4_bundle_induction_root.py":"9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
 "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":"28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
 "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py":"E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
 "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json":"0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
 "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":"079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
 "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":"D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
 "prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent.py":"44C96FE86888B5BA34DC85C3DF76469A6D323AE3763E84C2103D6DC6DFC75BD5",
 "prove_iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_g1_nonadjacent.py":"AFCCB1575D48E16290D8E2C2EBBAD7DEC7EE248439956183171B0374771FB49B",
}

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def exact_merge_quotient():
    a,b,s=sp.symbols("a b selected_isolates_s",nonnegative=True)
    x=(sp.Integer(1),*sp.symbols("x1:8"))
    h=(sp.Integer(1),*sp.symbols("h1:8"))
    r=(sp.Integer(1),*sp.symbols("r1:8"))
    c=(sp.Integer(1),*sp.symbols("c1:8"))
    one=(1,0,0,0,0,0,0,0);xx=(0,1,0,0,0,0,0,0)
    La=isolate(one,a);Lb=isolate(one,b);Lab=isolate(one,a+b)
    pair=conv(add(La,xx),add(Lb,xx))
    concentrated=conv(add(Lab,xx),add(one,xx))
    X=conv(r,pair);Xc=conv(r,concentrated);X0=conv(c,Lab)
    P=isolate(x,s);Y=add(P,shift(h))
    def residual(Z):
        U=conv(Z,Y);W=conv(Z,P);C=conv(X0,P)
        return sp.expand(n4_deleted(U,W)+block(C,W)+block(U,C))
    gap=sp.expand(residual(X)-residual(Xc))
    assert sp.expand(gap.subs(a,0))==0 and sp.expand(gap.subs(b,0))==0
    quotient,remainder=sp.div(gap,a*b,a,b)
    assert sp.expand(remainder)==0 and sp.expand(gap-a*b*quotient)==0
    quotient=sp.expand(quotient)
    used={str(v) for v in (*x[1:],*h[1:],*r[1:],*c[1:]) if quotient.has(v)}
    assert used=={"x1","x2","x3","h1","h2","r1","r2","r3","c1","c2"}
    assert sp.diff(quotient,x[3])==-6 and sp.diff(quotient,r[3])==-6
    assert len(sp.Poly(quotient,a,b,s,*x[1:4],*h[1:3],*r[1:4],*c[1:3]).terms())==73
    return (a,b,s,x,h,r,c),quotient

def envelope(variables,quotient,N,active,inactive,deleted,da,db,k,j,d):
    a,b,s,x,h,r,c=variables
    D=j+d;R1=k+D+j
    components=active+inactive;edges=N-components;H1=N-active
    # Exact star-forest rows r1,r2,c1,c2.  Also
    # r3=C(R1,3)-D(R1-2)+sum C(d_i,2), and convex concentration gives
    # sum C(d_i,2)<=C(D-j+1,2) for j positive-degree stars.
    return sp.factor(quotient.subs({
        a:1+da,b:1+db,
        r[1]:R1,r[2]:choose(R1,2)-D,
        r[3]:choose(R1,3)-D*(R1-2)+choose(D-j+1,2),
        c[1]:D,c[2]:choose(D,2),
        x[1]:N,x[2]:choose(N,2)-edges,x[3]:choose(N,3),
        h[1]:H1,h[2]:choose(H1,2)-(edges-deleted),
    }))

def large_certificate(variables,quotient):
    t,A,B,Q,da,db,k,j,d=sp.symbols("t A B Q da db k j d",nonnegative=True)
    N=t+2;active=N*A/2;inactive=B*N*(1-A)
    deleted=active+Q*N*(1-A)*(1-B)
    expr=envelope(variables,quotient,N,active,inactive,deleted,da,db,k,j,d)
    s=variables[2]
    num,den=sp.fraction(sp.together(expr));poly=sp.Poly(num,t,A,B,Q,da,db,k,j,d,s)
    degrees,rows=tensor_bernstein_sparse(poly,3)
    negatives=[(i,p,v) for i,row in enumerate(rows) for p,v in row.items() if v<0]
    assert not negatives
    minimum=min(v for row in rows for v in row.values())
    assert degrees==[2,1,1] and len(rows)==12 and minimum==sp.Rational(1,3)
    return {"core_order":"N=2+t","cube":"A,B,Q in [0,1]","cube_degrees":degrees,
            "bernstein_rows":len(rows),"power_terms":len(poly.terms()),
            "coefficient_count":sum(len(row) for row in rows),"minimum":str(minimum),
            "denominator":str(den),"power_hash":polynomial_hash(poly),
            "coefficient_hash":coefficient_rows_hash(rows)}

def small_certificate(variables,quotient,N):
    assert N in (0,1)
    da,db,k,j0,d=sp.symbols("da db k j0 d",nonnegative=True);j=1+j0
    # N=0 is the empty core.  N=1 has its unique unselected isolated vertex;
    # a positive-degree selected core vertex cannot exist at these orders.
    expr=envelope(variables,quotient,sp.Integer(N),sp.Integer(0),sp.Integer(N),sp.Integer(0),da,db,k,j,d)
    s=variables[2];num,den=sp.fraction(sp.together(expr))
    poly=sp.Poly(num,da,db,k,j0,d,s);negative=[(p,v) for p,v in poly.terms() if v<0]
    assert not negative
    minimum=min(v for _,v in poly.terms());assert minimum==sp.Rational(1,3)
    row=[{p:v for p,v in poly.terms()}]
    return {"core_order":N,"remaining_nontrivial_stars":"j=1+j0",
            "power_terms":len(poly.terms()),"coefficient_count":len(poly.terms()),
            "minimum":str(minimum),"denominator":str(den),
            "power_hash":polynomial_hash(poly),"coefficient_hash":coefficient_rows_hash(row)}

def main():
    assert {n:sha(HERE/n) for n in PINS}==PINS
    variables,quotient=exact_merge_quotient()
    qpoly=sp.Poly(quotient,*variables[:3],*variables[3][1:4],*variables[4][1:3],*variables[5][1:4],*variables[6][1:3])
    large=large_certificate(variables,quotient)
    small=[small_certificate(variables,quotient,N) for N in (0,1)]
    base=json.loads((HERE/"iso_n5_g1_singleton_endpoint_u_two_stars_adjacent_all_order_exact_g1_nonadjacent_20260830.json").read_text())
    scalar=json.loads((HERE/"iso_n5_s_all_marked_forests_exact_root_20260830.json").read_text())
    n4=json.loads((HERE/"iso_all_forest_n4_bundle_induction_exact_root_20260829.json").read_text())
    assert base["marker"]=="PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_TWO_STARS_ADJACENT_ALL_ORDER_G1_NONADJACENT"
    assert scalar["marker"].startswith("PASS_EXACT") and n4["marker"].startswith("PASS_EXACT")
    report={
      "marker":MARKER,
      "theorem":"For every canonical deepest singleton endpoint with p=u and uv an edge (and, by symmetry, p=v), rank-five g1 is nonnegative for an arbitrary number of u-side centred-star child components.",
      "corrected_identity":"g1=S(C)+N4(C)+F, F=N4(D)+B(QE,W)+B(U,QV)",
      "deepest_geometry":"Every u-child component other than the protected v-side component has height at most one after deleting u, hence is a centred star; otherwise it contains a deeper eligible unmarked leaf support.",
      "star_factors":"X=product_i F_{d_i}, X0=(1+x)^(sum_i d_i), F_d=(1+x)^d+x; degree-zero factors are u-leaves.",
      "merge_identity":"F_{a+b}F_0-F_aF_b=x((1+x)^a-1)((1+x)^b-1); the deletion factor X0 is unchanged.",
      "residual_gap":"F(before)-F(after)=a*b*Q",
      "quotient":{"terms":len(qpoly.terms()),"polynomial_hash":polynomial_hash(qpoly),
                  "used_rows":["x1","x2","x3","h1","h2","r1","r2","r3","c1","c2"],
                  "negative_ceiling_coefficients":{"x3":"-6","r3":"-6"}},
      "component_box":"After extracting s isolated selected P-components: active=NA/2, inactive=BN(1-A), deleted_edges=active+QN(1-A)(1-B), A,B,Q in [0,1].",
      "star_row_bound":"r3=C(R1,3)-D(R1-2)+sum_i C(d_i,2) <= C(R1,3)-D(R1-2)+C(D-j+1,2).",
      "certificates":{"N_ge_2":large,"N_0_1_with_remaining_star":small},
      "induction":"If at least three nontrivial stars remain, choose two. For N>=2 the general cone proves F(before)>=F(after); for N=0,1 another nontrivial star remains, so the two small certificates apply. The merge reduces the number of nontrivial stars by one and adds one degree-zero factor. Iterate to at most two stars, where the pinned two-star theorem proves F>=0.",
      "sign_payment":"F>=0 by concentration plus the pinned two-star base theorem; universal S(C)>=0 and all-forest N4(C)>=0 are pinned, hence g1>=0.",
      "dependencies_sha256":PINS,
      "scope":"Exactly the adjacent-mark singleton_endpoint mode p=u (and p=v by symmetry). Nonadjacent u-v endpoint geometry, the other canonical modes, g2, all N5, and Problem 993 are not claimed here.",
      "source_sha256":sha(Path(__file__)),
    }
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"quotient_terms":report["quotient"]["terms"],"certificates":report["certificates"],"scope":report["scope"]},indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)

if __name__=="__main__":main()
