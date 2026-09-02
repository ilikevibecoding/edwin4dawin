#!/usr/bin/env python3
"""Symbolic replay of the three-copy affine g-curvature kernel."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


def main():
    s=sp.symbols("s1:4")
    q=sp.symbols("q1:4")
    r=sp.symbols("r1:4")
    def H(i):
        j,k=[u for u in range(3) if u!=i]
        return sp.expand(s[i]**2*(s[j]+s[k])
                         -2*s[i]*(s[j]**2+s[k]**2)
                         +s[j]*s[k]*(s[j]+s[k]))
    hs=[H(i) for i in range(3)]
    assert sp.expand(sum(hs))==0
    differences={}
    pair_sum=0
    for i,j in ((0,1),(0,2),(1,2)):
        k=3-i-j
        expected=3*(s[i]-s[j])*(s[i]*s[j]-s[k]**2)
        assert sp.expand(hs[i]-hs[j]-expected)==0
        differences[f"H{i+1}-H{j+1}"]=str(sp.factor(expected))
        pair_sum+=(q[i]*r[j]-q[j]*r[i])*r[k]*(s[i]-s[j])*(
            s[i]*s[j]-s[k]**2)
    symmetric=sum(q[i]*r[(i+1)%3]*r[(i+2)%3]*hs[i]
                  for i in range(3))
    assert sp.expand(symmetric-pair_sum)==0
    canonical=sp.srepr(sp.expand(pair_sum))
    report={
        "status":"PASS_AFFINE_BRIDGE_G_CURVATURE_KERNEL",
        "H_definition":"H_i=s_i^2(s_j+s_k)-2s_i(s_j^2+s_k^2)+s_js_k(s_j+s_k)",
        "cyclic_sum_zero":True,
        "differences":differences,
        "pair_identity":"sum_i Q_i R_j R_k H_i = sum_(i<j)(Q_iR_j-Q_jR_i)R_k(s_i-s_j)(s_is_j-s_k^2)",
        "curvature_normalization":"N_h is 1/6 of the diagonal extraction of the displayed pair identity times product_i s_i^(h-1)",
        "expanded_pair_term_count":len(sp.Poly(sp.expand(pair_sum),*q,*r,*s).terms()),
        "expanded_pair_sha256":hashlib.sha256(canonical.encode()).hexdigest(),
    }
    Path("affine_bridge_g_curvature_kernel_exact_20260812.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))


if __name__=="__main__":
    main()
