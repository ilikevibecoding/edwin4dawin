#!/usr/bin/env python3
"""Exact structural b7 terminal compression for the direct strong auxiliary."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT=Path(__file__).resolve().parent
REPORT=ROOT/"rank8_low_high_strong_terminal_compression_b7_exact_20260820.json"
NAMES=("h","C","z","tb",*(f"p{i}" for i in range(1,10)),
       *(f"q{i}" for i in range(1,9)),*(f"u{i}" for i in range(3,10)))


def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def conv(left,right,rank,zero):
 return sum((math.comb(rank,i)*left[i]*right[rank-i] for i in range(rank+1)),zero)


def main():
 ctx=fmpz_mpoly_ctx.get(NAMES,"degrevlex");x=dict(zip(NAMES,ctx.gens()))
 zero,one=ctx.constant(0),ctx.constant(1);h,C,z,tb=x["h"],x["C"],x["z"],x["tb"]
 left=[one]+[x[f"p{i}"] for i in range(1,10)]
 selected=[zero,zero,zero]+[x[f"u{i}"] for i in range(3,10)]
 common=[one]+[x[f"q{i}"] for i in range(1,9)]
 actual=common+[common[8]*tb]
 shifted=common+[common[8]*(tb+z)]
 ca={r:conv(left,actual,r,zero) for r in (7,8,9)}
 cs={r:conv(left,shifted,r,zero) for r in (7,8,9)}
 va={r:conv(selected,actual,r,zero) for r in (7,8,9)}
 vs={r:conv(selected,shifted,r,zero) for r in (7,8,9)}
 assert ca[7]==cs[7] and ca[8]==cs[8]
 assert va[7]==vs[7] and va[8]==vs[8] and va[9]==vs[9]
 def margin(c):return c[8]**2-c[7]*c[9]-h*c[7]*c[8]
 def slope(c,v):return 2*c[8]*v[8]-v[7]*c[9]-c[7]*v[9]-h*(v[7]*c[8]+c[7]*v[8])
 Ma,Ms=margin(ca),margin(cs);da,ds=slope(ca,va),slope(cs,vs)
 Ha,Hs=C*Ma+h*da,C*Ms+h*ds
 q8=common[8]
 assert Ma-Ms==z*ca[7]*q8
 assert da-ds==z*va[7]*q8
 correction=z*q8*(C*ca[7]+h*va[7])
 assert Ha-Hs==correction
 coefficients=[int(c) for _,c in correction.terms()]
 assert coefficients and min(coefficients)>0
 payload={
  "schema":"rank8-low-high-strong-terminal-compression-b7-v1",
  "status":"PASS_EXACT_STRONG_TERMINAL_COMPRESSION_B7",
  "identity":"H_actual=H_shifted+z*q8*(C*c7+h*v7), with shifted (b7=0,tb'=tb+z)",
  "row_relations":["q0..q8 agree","q9_shifted=q9_actual+z*q8"],
  "component_relations":["M_actual=M_shifted+z*c7*q8","d_actual=d_shifted+z*v7*q8"],
  "correction_terms":len(list(correction.terms())),
  "correction_minimum_coefficient":min(coefficients),
  "theorem":"Any proof of H_str>=0 with b7=0 extends to arbitrary b7, with every other low/high cone variable unchanged/arbitrary.",
  "scope_warning":"This removes b7 only. It does not remove b3..b6 and is not alone a full low/high, Q8, PGC, or Problem 993 theorem.",
  "source_sha256":sha(Path(__file__)),
 }
 REPORT.write_text(json.dumps(payload,indent=2)+"\n")
 print(payload["status"]);print("SOURCE",payload["source_sha256"]);print("REPORT",sha(REPORT))


if __name__=="__main__":main()
