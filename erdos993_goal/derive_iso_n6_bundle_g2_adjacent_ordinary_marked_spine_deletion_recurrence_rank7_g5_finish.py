#!/usr/bin/env python3
"""Substitute the exact A=H+xX and B=J+xY recurrences in spine G2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sympy as sp


HERE=Path(__file__).resolve().parent
INPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_marked_spine_occupation_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256="1A79A8F679DA504BF8CE43E98BF66E836991E24C09C25E19680B5B000C00F156"
OUTPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_marked_spine_deletion_recurrence_exact_rank7_g5_finish_20260831.json"
MARKER="DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_DELETION_RECURRENCE_RANK7_G5_FINISH"


def main():
    assert hashlib.sha256(INPUT.read_bytes()).hexdigest().upper()==INPUT_SHA256
    source=json.loads(INPUT.read_text(encoding="utf-8"))
    a=sp.symbols("a0:8",nonnegative=True); b=sp.symbols("b0:7",nonnegative=True); c=sp.symbols("c0:7",nonnegative=True)
    x=sp.symbols("x0:7",nonnegative=True); y=sp.symbols("y0:6",nonnegative=True)
    h=sp.symbols("h0:8",nonnegative=True); j=sp.symbols("j0:7",nonnegative=True)
    local={str(z):z for z in (*a,*b,*c,*x,*y,*h,*j)}
    target=sp.sympify(source["target"],locals=local)
    rules={a[0]:1,b[0]:1,x[0]:1,y[0]:1,h[0]:1,j[0]:1}
    for r in range(1,8): rules[a[r]]=h[r]+x[r-1]
    for r in range(1,7): rules[b[r]]=j[r]+y[r-1]
    reduced=sp.expand(target.subs(rules))
    variables=tuple(sorted(reduced.free_symbols,key=str)); poly=sp.Poly(reduced,*variables)
    # Group every monomial by which row families occur.
    groups={}
    for powers,coefficient in poly.terms():
        active="".join(f for f in "chjxy" if any(power for z,power in zip(variables,powers) if str(z).startswith(f))) or "constant"
        term=coefficient*sp.prod(z**power for z,power in zip(variables,powers))
        groups[active]=sp.expand(groups.get(active,0)+term)
    summaries={}
    for label,value in sorted(groups.items()):
        p=sp.Poly(value,*sorted(value.free_symbols,key=str)); summaries[label]={"terms":len(p.terms()),"negative":sum(1 for q in p.coeffs() if q<0),"minimum":str(min(p.coeffs())),"expression":str(sp.factor(value))}
    report={"marker":MARKER,"scope":"spine pu-uv; H=A-p, X=A-N_A[p], J=B-p, Y=B-N_B[p]","exact_recurrences":["a_r=h_r+x_(r-1)","b_r=j_r+y_(r-1)"],"expression":str(sp.factor(reduced)),"terms":len(poly.terms()),"negative_scalar_coefficients":sum(1 for q in poly.coeffs() if q<0),"minimum_scalar_coefficient":str(min(poly.coeffs())),"family_groups":summaries,"status":"exact recurrence normal form; no sign theorem asserted","source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"; OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"terms":report["terms"],"negative":report["negative_scalar_coefficients"],"minimum":report["minimum_scalar_coefficient"],"groups":{k:{x:v[x] for x in ("terms","negative","minimum")} for k,v in summaries.items()}},indent=2,sort_keys=True));print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)


if __name__=="__main__": main()
