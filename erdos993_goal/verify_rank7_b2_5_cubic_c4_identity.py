#!/usr/bin/env python3
"""Exact symbolic replay of the pure-cubic B2=5 c4 identity."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import sympy as sp


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"rank7_b2_5_cubic_c4_identity_exact_20260817.json"


def sha256(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main()->None:
    n,p,q=sp.symbols("n p q",integer=True)
    # Four branch--branch and seven branch--leaf skeleton edges.  Their
    # lengths sum to n-1.  A subdivided BB edge contributes L+2, an
    # unsubdivided one contributes one extra; a subdivided BL edge
    # contributes L, an unsubdivided one contributes one less.
    edge_moment=sp.expand((n-1)+8+(4-p)-(7-q))
    assert edge_moment==n+4-p+q
    path_c4=(n-3)*(n-4)*(n-5)*(n-6)/24
    # Universal tree motif identity:
    # i4=i4(P_n)+(n-5)B2-B3-(E-(n-3)).
    c4=sp.factor(path_c4+(n-5)*5-0-(edge_moment-(n-3)))
    target=sp.factor(path_c4+5*n-32+p-q)
    assert sp.expand(c4-target)==0
    report={
        "schema":"rank7-b2-5-cubic-c4-identity-v1",
        "status":"PASS_EXACT_RANK7_B2_5_CUBIC_C4_IDENTITY",
        "hypotheses":{"B2":5,"B3":0,"branch_branch_edges":4,"branch_leaf_edges":7,"p":"number of branch-branch edges of length at least 2","q":"number of branch-leaf edges of length at least 2"},
        "edge_moment":"E=n+4-p+q",
        "conclusion":"i4=C(n-3,4)+5n-32+p-q",
        "source_sha256":sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(report["status"]);print(f"wrote {OUTPUT.name}")


if __name__=="__main__":main()
