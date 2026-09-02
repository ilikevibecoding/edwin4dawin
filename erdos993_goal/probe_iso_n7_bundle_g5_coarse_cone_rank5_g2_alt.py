#!/usr/bin/env python3
"""Diagnostic coarse large-order cone for rank-seven bundle g5; no theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE=Path(__file__).resolve().parent
PARTITION_REPORT=HERE/"iso_n7_bundle_g5_marked_partition_exact_rank5_g2_alt_20260830.json"
OUTPUT=HERE/"iso_n7_bundle_g5_coarse_cone_probe_rank5_g2_alt_20260830.json"
MARKER="PROBE_EXACT_ISO_N7_BUNDLE_G5_COARSE_CONE_RANK5_G2_ALT"


def main():
    source=json.loads(PARTITION_REPORT.read_text(encoding="utf-8"))
    names=source["summary"]["free_symbols"]
    symbols={name:sp.Symbol(name,nonnegative=True) for name in names}
    p=sp.expand(sp.sympify(source["partitioned_expression"],locals=symbols))
    n=symbols["n"]
    W=[None,None]+[symbols[f"W{k}"] for k in range(2,8)]
    A=[None,None]+[symbols[f"A{k}"] for k in range(2,8)]
    B=[None,None]+[symbols[f"B{k}"] for k in range(2,8)]
    Z=[None,None]+[symbols[f"Z{k}"] for k in range(2,8)]
    dnames=("DE5","DE6","DU4","DU5","DU6","DV4","DV5","DV6","DW3","DW4","DW5")
    c_only=sp.expand(p.subs({symbols[name]:0 for name in dnames}))
    cE5=W[5]+A[5]+B[5]+Z[5]
    cU4=W[4]+A[4]
    cV4=W[4]+B[4]
    cU6=W[6]+A[6]
    cV6=W[6]+B[6]
    negative_dw3=(A[2]+B[2]+8*A[3]+8*B[3]+2*W[2]+8*W[3]+8*Z[3])
    d_lower=sp.expand(
        -(8*n-16)*cE5
        -(8*B[2]+8*W[2]+n-4)*cU4
        -(8*A[2]+8*W[2]+n-4)*cV4
        -8*(cU6+cV6)
        -negative_dw3*W[3]
        -(8*n+2)*W[5]
    )
    coarse=sp.expand(c_only+d_lower)
    variables=tuple(sorted(coarse.free_symbols,key=str))
    poly=sp.Poly(coarse,*variables)
    terms=poly.terms()
    negative=[(powers,value) for powers,value in terms if value<0]
    report={
        "marker":MARKER,
        "D_lower_bound":str(d_lower),
        "coarse_C_only_lower_bound":str(sp.factor(coarse)),
        "coarse_summary":{
            "monomials":len(terms),
            "negative_scalar_coefficients":len(negative),
            "minimum_scalar_coefficient":str(min(poly.coeffs())),
        },
        "negative_terms":[{"powers":list(powers),"coefficient":str(value)} for powers,value in negative],
        "validity":(
            "For n>=11: DE5<=CE5, DU4<=CU4, DV4<=CV4, DU6<=CU6, "
            "DV6<=CV6, DW3<=W3, DW5<=W5; all omitted D terms have "
            "nonnegative multipliers. This is a diagnostic lower bound only."
        ),
        "status":"non-promotional coarse reduction",
        "source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(encoded,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,**report["coarse_summary"]},indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":
    main()
