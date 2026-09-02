#!/usr/bin/env python3
"""Exact universal subset lower bound for adjacent marked-spine ordinary G2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sympy as sp


HERE=Path(__file__).resolve().parent
OCC=HERE/"iso_n6_bundle_g2_adjacent_ordinary_marked_spine_occupation_exact_rank7_g5_finish_20260831.json"
OCC_SHA256="1A79A8F679DA504BF8CE43E98BF66E836991E24C09C25E19680B5B000C00F156"
CORNER=HERE/"iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json"
CORNER_SHA256="E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001"
OUTPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_exact_rank7_g5_finish_20260831.json"
MARKER="DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_RANK7_G5_FINISH"


def choose(v,k): return sp.prod(v-j for j in range(k))/sp.factorial(k)
def path(v,k): return choose(v-k+1,k)
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha(OCC)==OCC_SHA256 and sha(CORNER)==CORNER_SHA256
    source=json.loads(OCC.read_text(encoding="utf-8")); corner=json.loads(CORNER.read_text(encoding="utf-8"))
    a=sp.symbols("a0:8",nonnegative=True);b=sp.symbols("b0:7",nonnegative=True);c=sp.symbols("c0:7",nonnegative=True);x=sp.symbols("x0:6",nonnegative=True);y=sp.symbols("y0:5",nonnegative=True)
    local={str(z):z for z in (*a,*b,*c,*x,*y)}; target=sp.sympify(source["target"],locals=local)
    derivatives={str(z):sp.expand(sp.diff(target,z)) for z in (*x[1:6],*y[1:5])}
    n=a[1];mb=b[1]
    neg_pw3=4*a[2]+2*a[3]+2*b[1]+2*b[2]+5*b[3]+2*c[1]+2*c[2]+5*c[3]
    assert sp.expand(derivatives["x2"]-(2*a[4]-neg_pw3))==0
    no_parent=sp.expand(target-(target-sp.sympify(source["parent_correction"],locals=local)))
    # The preceding line is intentionally literal; guard it against the report identity.
    no_parent=sp.expand(target-sp.sympify(source["parent_correction"],locals=local))
    lower=sp.expand(no_parent+derivatives["y2"]*choose(mb,2)+derivatives["y3"]*choose(mb,3)-neg_pw3*choose(n,2)+derivatives["x3"]*choose(n,3))

    t=sp.Symbol("t",nonnegative=True)
    floors={
        "PA3_positive":-2*choose(n,2)+path(n,3)+7*path(n,4)-2*n,
        "PW2_positive":-2*choose(n,3)+2*path(n,4)+7*path(n,5)-4*choose(n,2),
        "minus_PA5_positive":-(8*n-5*path(n,2)),
        "minus_PW4_positive":2*path(n,2)+10*path(n,3),
        "B3_C3_lower_positive":4*n+9*path(n,2)-5*choose(n,2),
    }
    floor_records={}
    for label,value in floors.items():
        shifted=sp.Poly(sp.expand(value.subs(n,t+19)),t)
        coeffs=shifted.all_coeffs();assert all(q>0 for q in coeffs),(label,coeffs)
        floor_records[label]={"expression":str(sp.factor(value)),"shift_N_19":str(shifted.as_expr()),"power_coefficients":[str(q) for q in coeffs]}
    # Direct signs and the unchanged rank-four/five/six endpoint reductions.
    assert derivatives["y2"]==-2*n-2*a[2]-5*a[3]-12*c[2]
    assert derivatives["x3"]==-2*n-2*a[2]-10*a[3]+b[1]-5*b[2]+c[1]-5*c[2]
    assert derivatives["y4"]==7*n and derivatives["x5"]==7*n
    assert derivatives["x4"]==2*n+2*a[2]+7*b[1]+7*c[1]

    poly=sp.Poly(lower,*sorted(lower.free_symbols,key=str))
    report={"marker":MARKER,"scope":"N>=19, spine edges pu and uv, p ordinary deleted parent, marks u,v","ordinary_lower":str(sp.factor(lower)),"ordinary_lower_sha256":hashlib.sha256(str(lower).encode()).hexdigest().upper(),"subset_payment":{"beneficial_zero":["PA3","PA6","PW2","PW5","PW6"],"harmful_caps":{"PA4":"C(mB,2)","PA5":"C(mB,3)","PW4":"C(N,3)"},"mixed_PW3":"write K_PW3=2*a4-negPW3, drop 2*a4*PW3 and use PW3<=C(N,2)","negPW3":str(neg_pw3)},"cap_proofs":{"PA4":"sets contain p and v, then choose two vertices from B-p","PA5":"sets contain p and v, then choose three vertices from B-p","PW3":"sets contain p, then choose two vertices from A-p","PW4":"sets contain p, then choose three vertices from A-p"},"sign_floors":floor_records,"row_corner_reduction":{"b3_c3":"PATH; displayed strengthened derivative floor","b4_c4":"PATH; unchanged pinned no-parent derivative and N>=19 implies its N>=14 proof","b5_c5_b6_c6":"EDGELESS; unchanged nonpositive derivatives","b2_c2":"both endpoints remain","corner_count":4,"pinned_no_parent_corner_report":{"file":CORNER.name,"sha256":CORNER_SHA256}},"edge_wedge_domain":{"edge_cap":"e<=N-1 for every N-vertex forest","linear_wedge_floor":"Omega=sum_v C(d_v,2)>=sum_{d_v>0}(d_v-1)=2e-v_+>=2e-N","wedge_ceiling":"Omega<=C(e,2)<=e^2/2","high_chart_relaxation":"e=(N-1)z and Omega=(2e-N)+(e^2/2-(2e-N))w; the possibly negative lower endpoint only enlarges the actual domain","low_and_small_charts":"retain the stronger incidence edge cap e<=overlap and the safe 0<=Omega<=e^2/2"},"lower_terms":len(poly.terms()),"status":"exact lower-bound reduction; positivity of the lower polynomial remains for Bernstein certification","inputs":{"occupation":{"file":OCC.name,"sha256":OCC_SHA256}},"source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"lower_terms":report["lower_terms"],"lower_sha256":report["ordinary_lower_sha256"],"floors":floor_records},indent=2,sort_keys=True));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)


if __name__=="__main__":main()
