#!/usr/bin/env python3
"""Exact disconnected-mark singleton-endpoint g1 theorem for star systems.

The two marked components are rooted at u and v.  Every component left after
deleting either mark is a centred star (a degree-zero star is a leaf), and all
components disjoint from the two marked components are isolated vertices.
This is the canonical deepest endpoint subcase with no nontrivial unmarked
component.

For u-side factors F_d=(1+x)^d+x and deletion factors L_d=(1+x)^d,
write P=prod F_d, H=prod L_d; define Q,J analogously at v.  With t common
isolates the exact corrected endpoint rows are

 U=(1+x)^t P(Q+xJ), W=(1+x)^t PQ,
 QE=(1+x)^t H(Q+xJ), QV=(1+x)^t HQ.

The residual F=N4(D)+B(QE,W)+B(U,QV) has total Newton degree at most six.
All 28 distributions of at most six active star-degree variables between the
two marks are expanded exactly in the multivariate binomial basis.  Every one
of the 28,600 nonzero coefficients is a positive integer.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import coefficient_rows_hash
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import block,n4_deleted
from prove_iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_g1_nonadjacent import add,conv,isolate,newton,shift

HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g1_singleton_endpoint_disconnected_mark_star_systems_all_order_exact_g1_nonadjacent_20260830.json"
MARKER="PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_DISCONNECTED_MARK_STAR_SYSTEMS_ALL_ORDER_G1_NONADJACENT"
PINS={
 "derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent.py":"8100E7B132606481575C681088C30F8B7D6308E670162AC3B96E5C92982C6C89",
 "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json":"5E277A78168DE1978C9AACD6AFF12F55A624F4D8CCF4017CA290406106A3C3B1",
 "assemble_iso_n5_s_all_marked_forests_root.py":"E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
 "iso_n5_s_all_marked_forests_exact_root_20260830.json":"E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
 "assemble_iso_all_forest_n4_bundle_induction_root.py":"9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
 "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":"28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
 "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py":"E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
 "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json":"0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
 "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":"D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
 "prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent.py":"5BC22FEAC36651B2626381014F897AEE74755306A6C2A26290064AE922832BA7",
 "prove_iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_g1_nonadjacent.py":"6C4F14D645FC6E3587E2F25E08A0A7F1E436CA8C436DF20F9BE0B89B6152484F",
}
ONE=(1,0,0,0,0,0,0,0);XX=(0,1,0,0,0,0,0,0)

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def residual(U,W,QE,QV):return sp.expand(n4_deleted(U,W)+block(QE,W)+block(U,QV))

def fixed_active_certificate(mu,mv):
    k,l,t=sp.symbols("u_leaves_k v_leaves_l common_isolates_t",nonnegative=True)
    aa=sp.symbols(f"u_star_degree_0:{mu}",nonnegative=True)
    bb=sp.symbols(f"v_star_degree_0:{mv}",nonnegative=True)
    P=isolate(ONE,k);H=ONE
    for degree in aa:
        L=isolate(ONE,degree);P=conv(P,add(L,XX));H=conv(H,L)
    Q=isolate(ONE,l);J=ONE
    for degree in bb:
        L=isolate(ONE,degree);Q=conv(Q,add(L,XX));J=conv(J,L)
    Y=add(Q,shift(J));R=isolate(ONE,t)
    U=conv(R,conv(P,Y));W=conv(R,conv(P,Q))
    QE=conv(R,conv(H,Y));QV=conv(R,conv(H,Q))
    expression=residual(U,W,QE,QV);variables=(k,l,t,*aa,*bb)
    assert sp.Poly(expression,*variables).total_degree()<=6
    records=[((),expression)]
    for variable in variables:
        records=[(index+(rank,),row) for index,value in records
                 for rank,row in enumerate(newton(value,variable)) if row!=0]
    row={index:sp.expand(value) for index,value in records}
    assert all(not value.free_symbols and value.is_Integer and value>0 for value in row.values())
    return row

def main():
    assert {name:sha(HERE/name) for name in PINS}==PINS
    rows=[];records=[]
    expected_by_total=[52,124,252,462,792,1287,2002]
    for total in range(7):
      for mu in range(total+1):
        mv=total-mu;row=fixed_active_certificate(mu,mv)
        assert len(row)==expected_by_total[total]
        rows.append(row);records.append({"u_active":mu,"v_active":mv,"rows":len(row),
            "minimum":str(min(row.values())),"maximum":str(max(row.values())),
            "coefficient_hash":coefficient_rows_hash([row])})
        print("PAIR",mu,mv,len(row),min(row.values()),flush=True)
    count=sum(len(row) for row in rows);minimum=min(v for row in rows for v in row.values())
    assert len(rows)==28 and count==28600 and minimum==2
    corrected=json.loads((HERE/"iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json").read_text())
    scalar=json.loads((HERE/"iso_n5_s_all_marked_forests_exact_root_20260830.json").read_text())
    n4=json.loads((HERE/"iso_all_forest_n4_bundle_induction_exact_root_20260829.json").read_text())
    assert corrected["marker"].startswith("DERIVED_EXACT") and scalar["marker"].startswith("PASS_EXACT") and n4["marker"].startswith("PASS_EXACT")
    report={
      "marker":MARKER,
      "theorem":"In singleton_endpoint p=u with disconnected marks, if every child component at u and v is a centred star and every component containing neither mark is isolated, rank-five g1 is nonnegative for arbitrary star counts and degrees.",
      "geometry":{"P":"product of u-side F_d","H":"product of u-side L_d","Q":"product of v-side F_d","J":"product of v-side L_d","F_d":"(1+x)^d+x","L_d":"(1+x)^d","rows":"U=R P(Q+xJ), W=RPQ, QE=R H(Q+xJ), QV=RHQ, R=(1+x)^t"},
      "identity":"g1=S(C)+N4(C)+F; F=N4(D)+B(QE,W)+B(U,QV)",
      "finite_support_argument":"Every residual monomial has total coefficient rank at most six, hence the polynomial has total Newton degree at most six. A positive Newton index on a star degree consumes at least one unit, so at most six star variables are active. Every zero-index u-star is F_0=1+x and shifts k; every zero-index v-star shifts l. Binomial translation C(k+z,r)=sum_j C(z,r-j)C(k,j) is coefficientwise nonnegative, so the 28 active distributions through total six cover arbitrary star counts.",
      "certificate":{"active_distributions":28,"nonzero_coefficients":count,"minimum":str(minimum),"global_coefficient_hash":coefficient_rows_hash(rows),"expected_rows_by_active_total":expected_by_total,"pairs":records},
      "sign_payment":"All multivariate binomial coefficients of F are positive; universal S(C) and all-forest N4(C) are pinned, hence g1>=0.",
      "dependencies_sha256":PINS,
      "scope":"Disconnected marks only; both marked components must be rooted star systems and all unmarked components must be isolated. Nontrivial components containing neither mark, connected nonadjacent marks, other modes, g2, all N5, and Problem 993 remain.",
      "source_sha256":sha(Path(__file__)),
    }
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"certificate":report["certificate"]|{"pairs":"omitted"},"scope":report["scope"]},indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)

if __name__=="__main__":main()
