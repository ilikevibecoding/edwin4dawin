#!/usr/bin/env python3
"""Independent streaming replay of the full left-prefix direct-H core theorem."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT=Path(__file__).resolve().parent
OUT=ROOT/"rank8_low_high_strong_core_multinomial_lift_independent_audit_20260820.json"
NAMES=("h","ta","a3","a4","a5","a6","a7","tb","b0","b1","b2")
PINS={
 "verify_rank8_low_high_strong_core_multinomial_lift.py":"7CD865F1FCFAC817A96EE52AF4C953F671848104F25372FDDD3AE919C937CDAB",
 "rank8_low_high_strong_core_multinomial_lift_exact_20260820.json":"FD6D13C4B290594EBD7D0763E0542683EBCE94B61D9C7F58EA0F508EA8F7786F",
 "verify_rank8_low_high_strong_a34_prefix_amgm.py":"F3CDCD90041A30757173CD256F2367A39E44A18D443FBB639C691CB08A3D4118",
 "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json":"795D3FB211BAAFC3ECDEE2A594A2378E79BF9A6299B19D224CD78964D9F282A8",
 "audit_rank8_low_high_strong_a34_prefix_amgm.py":"4A500C2E3D27DEC793AC6F47543A4BF0C8341FB40CEA69A32AC3536D0B91E43A",
 "rank8_low_high_strong_a34_prefix_amgm_independent_audit_20260820.json":"C7BCA108DF5111227B313563AD49E148E108830A8B0CD4A2A368AFD5BB0CED11",
}


def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def map_sha(values):
 wire=[[list(k),values[k]] for k in sorted(values)]
 return hashlib.sha256(json.dumps(wire,separators=(",",":")).encode()).hexdigest().upper()


def make_row(terminal,gaps,one):
 ratios=[None]*9;ratios[8]=terminal
 for i in range(7,-1,-1):ratios[i]=ratios[i+1]+gaps[i]
 products=[one]
 for ratio in ratios:products.append(products[-1]*ratio)
 return ratios,products


def cv(left,right,rank,zero):
 value=zero
 for i in range(rank+1):value+=math.comb(rank,i)*left[i]*right[rank-i]
 return value


def independent_polynomial():
 ctx=fmpz_mpoly_ctx.get(NAMES,"degrevlex");x=dict(zip(NAMES,ctx.gens()))
 zero,one,h=ctx.constant(0),ctx.constant(1),x["h"]
 ratios,left=make_row(x["ta"],[2*h,h,h,h+x["a3"],h+x["a4"],h+x["a5"],h+x["a6"],h+x["a7"]],one)
 _,right=make_row(x["tb"],[2*h+x["b0"],h+x["b1"],h+x["b2"],h,h,h,h,h],one)
 selected=[zero,zero,zero]+left[3:]
 c={r:cv(left,right,r,zero) for r in (7,8,9)};v={r:cv(selected,right,r,zero) for r in (7,8,9)}
 base=c[8]*c[8]-c[7]*c[9]-h*c[7]*c[8]
 derivative=2*c[8]*v[8]-v[7]*c[9]-c[7]*v[9]-h*v[7]*c[8]-h*c[7]*v[8]
 return ratios[2]*base+h*derivative


def expand(monomial,coefficient,output):
 degree=monomial[1];fact=math.factorial(degree)
 for e5 in range(degree+1):
  for e6 in range(degree-e5+1):
   for e7 in range(degree-e5-e6+1):
    eta=degree-e5-e6-e7;old=list(monomial);old[1]=eta
    key=tuple(old[:4]+[e5,e6,e7]+old[4:])
    mult=fact//math.factorial(eta)//math.factorial(e5)//math.factorial(e6)//math.factorial(e7)
    output[key]=output.get(key,0)+coefficient*mult


def main():
 pins={name:sha(ROOT/name) for name in PINS};assert pins==PINS
 theorem=json.loads((ROOT/"rank8_low_high_strong_core_multinomial_lift_exact_20260820.json").read_text())
 upstream=json.loads((ROOT/"rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json").read_text())
 needed,used={},{}
 for a in upstream["allocations"]:
  t=tuple(a["negative_monomial"]);l=tuple(a["source_low"]["monomial"]);r=tuple(a["source_high"]["monomial"])
  d=int(a["demand"]);u=int(a["source_low"]["allocated"]);v=int(a["source_high"]["allocated"])
  assert all(l[i]+r[i]==2*t[i] for i in range(8)) and 4*u*v>=d*d
  expand(t,d,needed);expand(l,u,used);expand(r,v,used)
 assert map_sha(needed)==theorem["negative_map_sha256"]
 assert map_sha(used)==theorem["lifted_used_map_sha256"]
 seen_n=set();seen_u=set();terms=pos=neg=0;minimum=maximum=None;min_remainder=None
 for monomial,coefficient in independent_polynomial().terms():
  key=tuple(map(int,monomial));value=int(coefficient);terms+=1
  minimum=value if minimum is None else min(minimum,value);maximum=value if maximum is None else max(maximum,value)
  if value<0:
   neg+=1;assert needed.get(key)==-value;seen_n.add(key)
  elif value>0:
   pos+=1
   if key in used:
    remainder=value-used[key];assert remainder>=0;seen_u.add(key)
    min_remainder=remainder if min_remainder is None else min(min_remainder,remainder)
 assert seen_n==set(needed) and seen_u==set(used)
 assert (terms,pos,neg,minimum,maximum)==(theorem["terms"],theorem["positive_terms"],theorem["negative_terms"],theorem["minimum_coefficient"],theorem["maximum_coefficient"])
 assert min_remainder==theorem["minimum_used_source_remainder"]
 payload={
  "schema":"rank8-low-high-strong-core-multinomial-lift-audit-v1",
  "status":"PASS_INDEPENDENT_AUDIT_STRONG_FULL_LEFT_PREFIX_CORE",
  "pinned_inputs":pins,"terms":terms,"positive_terms":pos,"negative_terms":neg,
  "upstream_rows_replayed":len(upstream["allocations"]),"lifted_used_positive_sources":len(used),
  "minimum_used_source_remainder":min_remainder,"negative_map_sha256":map_sha(needed),
  "lifted_used_map_sha256":map_sha(used),"scope_warning":theorem["scope_warning"],
  "source_sha256":sha(Path(__file__)),
 }
 OUT.write_text(json.dumps(payload,indent=2)+"\n")
 print(payload["status"]);print("SOURCE",payload["source_sha256"]);print("REPORT",sha(OUT))


if __name__=="__main__":main()
