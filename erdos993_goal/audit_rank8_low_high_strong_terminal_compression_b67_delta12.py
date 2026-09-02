#!/usr/bin/env python3
"""Independent exact audit of the restored direct-H b7/b6 compression."""
from __future__ import annotations
import hashlib,json,math
from pathlib import Path
from flint import fmpz_mpoly_ctx

ROOT=Path(__file__).resolve().parent
OUT=ROOT/"rank8_low_high_strong_terminal_compression_b67_delta12_independent_audit_20260820.json"
FULL=("h","ta","a0","a2","a3","a4","a5","a6","a7","tb","b0","b1","b2","b3","b4","b5")
PINS={
 "verify_rank8_low_high_strong_terminal_compression_b67.py":"2B9B3E09985DE6CCF0CFABE63A84999E894D433204FACF006844048D2F2EBF48",
 "rank8_low_high_strong_terminal_compression_b67_exact_20260820.json":"609A3E83AD7E8A08EC24DDF581E775958ED63DE7F9468AF59E633D4A010661C1",
 "explore_rank8_low_high_b6_compression_q.py":"EA9FFF351AB12C0C2170595CE763335BA535D5A7D9D8CE718B38D94636C5F465",
}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest().upper()
def row(t,g,one):
 r=[None]*9;r[8]=t
 for i in range(7,-1,-1):r[i]=r[i+1]+g[i]
 p=[one]
 for x in r:p.append(p[-1]*x)
 return r,p
def cv(a,b,k,z):return sum((math.comb(k,i)*a[i]*b[k-i] for i in range(k+1)),z)
def statistics(p):
 n=neg=0;mn=mx=None;first=None
 for m,c in p.terms():
  v=int(c);n+=1;neg+=v<0;mn=v if mn is None else min(mn,v);mx=v if mx is None else max(mx,v)
  if v<0 and first is None:first={"monomial":list(map(int,m)),"coefficient":v}
 return {"terms":n,"negative":neg,"minimum":mn,"maximum":mx,"first_negative":first}
def identity_check():
 names=("h","C","z","tb",*(f"p{i}" for i in range(1,10)),*(f"q{i}" for i in range(1,8)),*(f"u{i}" for i in range(3,10)))
 ctx=fmpz_mpoly_ctx.get(names,"degrevlex");x=dict(zip(names,ctx.gens()));zero,one=ctx.constant(0),ctx.constant(1);h,C,z,t=x['h'],x['C'],x['z'],x['tb'];p=[one]+[x[f'p{i}'] for i in range(1,10)];u=[zero]*3+[x[f'u{i}'] for i in range(3,10)];q=[one]+[x[f'q{i}'] for i in range(1,8)];q7=q[7]
 qa=q+[q7*(t+h),q7*(t+h)*t];qs=q+[q7*(t+h+z),q7*(t+h+z)*(t+z)]
 ca={r:cv(p,qa,r,zero) for r in (7,8,9)};cs={r:cv(p,qs,r,zero) for r in (7,8,9)};va={r:cv(u,qa,r,zero) for r in (7,8,9)};vs={r:cv(u,qs,r,zero) for r in (7,8,9)}
 M=lambda c:c[8]**2-c[7]*c[9]-h*c[7]*c[8];d=lambda c,v:2*c[8]*v[8]-v[7]*c[9]-c[7]*v[9]-h*(v[7]*c[8]+c[7]*v[8])
 L=2*t+2*h+9*p[1];Q=C*(ca[7]*L-2*ca[8])+h*(va[7]*L-2*va[8]);R=C*(ca[7]-q7)+h*va[7]
 return C*M(ca)+h*d(ca,va)-(C*M(cs)+h*d(cs,vs))-z*q7*Q-z**2*q7*R==0
def main():
 pins={n:sha(ROOT/n) for n in PINS};assert pins==PINS;assert identity_check()
 theorem=json.loads((ROOT/"rank8_low_high_strong_terminal_compression_b67_exact_20260820.json").read_text())
 ctx=fmpz_mpoly_ctx.get(FULL,"degrevlex");x=dict(zip(FULL,ctx.gens()));zero,one,h=ctx.constant(0),ctx.constant(1),x['h'];lg=[2*h+x['a0'],h,h+x['a2']]+[h+x[f'a{i}'] for i in range(3,8)];rg=[2*h+x['b0']]+[h+x[f'b{i}'] for i in range(1,6)]+[h,h]
 ratios,left=row(x['ta'],lg,one);_,right=row(x['tb'],rg,one);u=[zero]*3+left[3:];c7=cv(left,right,7,zero);c8=cv(left,right,8,zero);v7=cv(u,right,7,zero);v8=cv(u,right,8,zero);L=2*x['tb']+2*h+9*left[1]
 Q=ratios[2]*(c7*L-2*c8)+h*(v7*L-2*v8);R=ratios[2]*(c7-right[7])+h*v7;qs,rs=statistics(Q),statistics(R)
 expected=dict(theorem['b6_Q_coefficient_certificate']);assert expected.pop('variables')==list(FULL)
 assert qs==expected;assert rs['negative']==0 and rs['minimum']>0
 payload={"schema":"rank8-low-high-strong-terminal-compression-b67-delta12-audit-v1","status":"PASS_INDEPENDENT_AUDIT_STRONG_TERMINAL_COMPRESSION_B7_B6","pinned_inputs":pins,"b6_Q_coefficient_certificate":qs,"b6_quadratic_factor_statistics":rs,"identities":theorem['identities'],"scope_warning":theorem['scope_warning'],"source_sha256":sha(Path(__file__))}
 OUT.write_text(json.dumps(payload,indent=2)+"\n");print(payload['status']);print('SOURCE',payload['source_sha256']);print('REPORT',sha(OUT))
if __name__=='__main__':main()
