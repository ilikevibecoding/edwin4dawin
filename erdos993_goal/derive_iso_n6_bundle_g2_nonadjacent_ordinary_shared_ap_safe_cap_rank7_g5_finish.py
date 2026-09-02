#!/usr/bin/env python3
"""Exact shared-A-p safe-cap reduction for nonadjacent marks, p nonadjacent."""

from __future__ import annotations
import hashlib,json
from pathlib import Path
import sympy as sp

HERE=Path(__file__).resolve().parent
LOSS=HERE/"iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
LOSS_SHA256="9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"
NOPARENT=HERE/"iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
NOPARENT_SHA256="106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"
OUTPUT=HERE/"iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_safe_cap_exact_rank7_g5_finish_20260831.json"
MARKER="DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_SAFE_CAP_RANK7_G5_FINISH"

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def choose(v,k):return sp.prod(v-j for j in range(k))/sp.factorial(k)
def path(v,k):return choose(v-k+1,k)

def main():
    assert sha(LOSS)==LOSS_SHA256 and sha(NOPARENT)==NOPARENT_SHA256
    loss=json.loads(LOSS.read_text(encoding="utf-8"));no_parent_report=json.loads(NOPARENT.read_text(encoding="utf-8"));assert loss["marker"]=="DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PARENT_LOSS_ROOT"
    a=sp.symbols("a0:8",nonnegative=True);b=sp.symbols("b0:7",nonnegative=True);c=sp.symbols("c0:7",nonnegative=True);d=sp.symbols("d0:7",nonnegative=True)
    PA={r:sp.Symbol(f"PA{r}",nonnegative=True) for r in range(3,7)};PB={r:sp.Symbol(f"PB{r}",nonnegative=True) for r in range(3,7)};PW={r:sp.Symbol(f"PW{r}",nonnegative=True) for r in range(2,7)};PZ={r:sp.Symbol(f"PZ{r}",nonnegative=True) for r in range(4,7)}
    local={str(q):q for q in (*a,*b,*c,*d,*PA.values(),*PB.values(),*PW.values(),*PZ.values())};correction=sp.sympify(loss["adjacency_masks"]["u0_v0"]["correction"],locals=local);variables=(*PA.values(),*PB.values(),*PW.values(),*PZ.values());coeff={str(q):sp.expand(sp.diff(correction,q)) for q in variables}
    np_local={str(q):q for q in (*a,*b,*c,*d)};pieces=no_parent_report["pieces"];no_parent=sp.expand(sum(sp.sympify(pieces[label],locals=np_local) for label in ("A2","L2_AB","L2_AC","K2_BC","J2_AD")))
    n=a[1];mb=b[1];mc=c[1];delta=d[1];H=n-1
    neg_pw3=4*a[2]+2*a[3]+2*mb+2*b[2]+5*b[3]+2*mc+2*c[2]+5*c[3]+12*d[2]
    assert sp.expand(coeff["PW3"]-(2*a[4]-neg_pw3))==0
    lower=sp.expand(no_parent+coeff["PA4"]*choose(mb-1,2)+coeff["PA5"]*choose(mb-1,3)+coeff["PB4"]*choose(mc-1,2)+coeff["PB5"]*choose(mc-1,3)-neg_pw3*choose(H,2)+coeff["PW4"]*choose(H,3)+coeff["PZ5"]*choose(delta-1,2))

    t=sp.Symbol("t",nonnegative=True)
    sign_floors={
        "PA3_PB3_positive":(-2*choose(n,2)+path(n,3)+7*path(n,4)-2*n,9),
        "minus_PA5_PB5_positive":(-(8*n-5*path(n,2)),6),
        "minus_PW4_positive":(2*path(n,2)+10*path(n,3)-7*n,6),
        "PZ4_positive":(-2*n+7*path(n,3),6),
    }
    sign_records={}
    for label,(expression,threshold) in sign_floors.items():
        shifted=sp.Poly(sp.expand(expression.subs(n,t+threshold)),t);coefs=shifted.all_coeffs();assert all(q>0 for q in coefs),(label,coefs);sign_records[label]={"expression":str(sp.factor(expression)),"threshold":threshold,"shifted_polynomial":str(shifted.as_expr()),"power_coefficients":[str(q) for q in coefs]}
    # Uniform integer-order lower for K_PW2.  For S(m) below, binomials use
    # their combinatorial zero convention in the finite audit m=0,...,8.
    finite_S=[-2*sp.binomial(m,2)+(sp.binomial(m-2,3) if m>=5 else 0)+7*(sp.binomial(m-3,4) if m>=7 else 0) for m in range(9)]
    finite_S=list(map(int,finite_S));assert min(finite_S)==-26
    m=sp.Symbol("m",nonnegative=True);S_poly=-2*choose(m,2)+path(m,3)+7*path(m,4);S_shift=sp.Poly(sp.expand((S_poly+26).subs(m,t+9)),t);assert all(q>0 for q in S_shift.all_coeffs())
    ambient=-2*choose(n,3)+2*path(n,4)+7*path(n,5)-2*n-52;ambient_shift=sp.Poly(sp.expand(ambient.subs(n,t+12)),t);assert all(q>0 for q in ambient_shift.all_coeffs())
    pw2_proof={"subset_function":"S(m)=-2*C(m,2)+P(m,3)+7*P(m,4)","finite_S_m0_8":finite_S,"uniform_subset_floor":-26,"shift_m9_S_plus_26":str(S_shift.as_expr()),"shift_m9_power_coefficients":[str(q) for q in S_shift.all_coeffs()],"geometry":"mB,mC,d are nonnegative integer orders and d<=N","coefficient_floor":"K_PW2 >= -2*C(N,3)+2*P(N,4)+7*P(N,5)+S(mB)+S(mC)-2d >= ambient(N)-2N-52","ambient_N12":str(ambient_shift.as_expr()),"ambient_N12_power_coefficients":[str(q) for q in ambient_shift.all_coeffs()],"conclusion":"K_PW2>0 for every feasible nonadjacent occupation row once N>=12"}
    assert coeff["PZ4"]==-2*n+7*a[3] and coeff["PZ5"]==-12*a[2] and coeff["PZ6"]==7*n
    poly=sp.Poly(lower,*sorted(lower.free_symbols,key=str))
    report={"marker":MARKER,"scope":"nonadjacent marks u,v; ordinary p adjacent to neither mark; N>=12 sign reduction (Bernstein use N>=19/22 separately)","occupation_identity":{"Q":"G-N[p] retains nonadjacent u,v","W":"Q-{u,v}","U":"Q-N[v]","V":"Q-N[u]","Z":"Q-(N[u] union N[v])","losses":"PW_r=i_(r-1)(W), PA_r=i_(r-2)(U), PB_r=i_(r-2)(V), PZ_r=i_(r-3)(Z)","orders":"|W|<=N-1, |U|<=mB-1, |V|<=mC-1, |Z|<=d-1; every row is an induced subforest of A-p"},"safe_cap_payment":{"beneficial_zero":["PA3","PB3","PA6","PB6","PW2","PW5","PW6","PZ4","PZ6"],"harmful_caps":{"PA4":"C(mB-1,2)","PA5":"C(mB-1,3)","PB4":"C(mC-1,2)","PB5":"C(mC-1,3)","PW4":"C(N-1,3)","PZ5":"C(d-1,2)"},"mixed_PW3":"K_PW3=2*a4-negPW3; drop 2*a4*PW3 and use PW3<=C(N-1,2)","negPW3":str(neg_pw3)},"surviving_D_PZ_terms":{"no_parent":"J2(A,D) is retained exactly","PW2":"-2*d1+7*d3 retained in the sign proof","PW3":"-12*d2 is included in negPW3","PW4":"+7*d1 retained exactly","PZ4":"positive and discarded","PZ5":"-12*a2*C(d-1,2)","PZ6":"positive and discarded"},"sign_floors":sign_records,"PW2_uniform_sign_proof":pw2_proof,"ordinary_lower":str(sp.factor(lower)),"ordinary_lower_sha256":hashlib.sha256(str(lower).encode()).hexdigest().upper(),"lower_terms":len(poly.terms()),"status":"exact shared-A-p lower-bound reduction; positivity remains for chartwise Bernstein certification","pins":{"loss":{"file":LOSS.name,"sha256":LOSS_SHA256},"no_parent":{"file":NOPARENT.name,"sha256":NOPARENT_SHA256}},"source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"lower_terms":report["lower_terms"],"lower_sha256":report["ordinary_lower_sha256"],"PW2_threshold":12},indent=2,sort_keys=True));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
