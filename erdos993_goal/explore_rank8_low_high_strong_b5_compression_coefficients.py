#!/usr/bin/env python3
"""Exact coefficient scout for b5 terminal compression of direct H_str."""
from __future__ import annotations
import math,sys
from flint import fmpz_mpoly_ctx

from explore_rank8_low_high_strong_aux_faces import factor,convolution,stats

FULL=("h","ta","a0","a2","a3","a4","a5","a6","a7","tb","b0","b1","b2","b3","b4","b5")
GEN=("h","C","z","tb",*(f"p{i}" for i in range(1,10)),*(f"q{i}" for i in range(1,7)),*(f"u{i}" for i in range(3,10)))

def generic_coefficients():
 ctx=fmpz_mpoly_ctx.get(GEN,"degrevlex");x=dict(zip(GEN,ctx.gens()));zero,one=ctx.constant(0),ctx.constant(1);h,C,z,tb=x['h'],x['C'],x['z'],x['tb']
 p=[one]+[x[f'p{i}'] for i in range(1,10)];u=[zero,zero,zero]+[x[f'u{i}'] for i in range(3,10)];q=[one]+[x[f'q{i}'] for i in range(1,7)];q6=q[6]
 qa=q+[q6*(tb+2*h),q6*(tb+2*h)*(tb+h),q6*(tb+2*h)*(tb+h)*tb]
 qs=q+[q6*(tb+z+2*h),q6*(tb+z+2*h)*(tb+z+h),q6*(tb+z+2*h)*(tb+z+h)*(tb+z)]
 ca={r:convolution(p,qa,r,zero) for r in (7,8,9)};cs={r:convolution(p,qs,r,zero) for r in (7,8,9)};va={r:convolution(u,qa,r,zero) for r in (7,8,9)};vs={r:convolution(u,qs,r,zero) for r in (7,8,9)}
 M=lambda c:c[8]**2-c[7]*c[9]-h*c[7]*c[8]
 d=lambda c,v:2*c[8]*v[8]-v[7]*c[9]-c[7]*v[9]-h*(v[7]*c[8]+c[7]*v[8])
 D=C*(M(ca)-M(cs))+h*(d(ca,va)-d(cs,vs));zi=GEN.index('z');out={}
 for degree in (1,2,3):
  sliced={tuple(0 if i==zi else int(e) for i,e in enumerate(mon)):int(coef) for mon,coef in D.terms() if int(mon[zi])==degree}
  out[degree]=ctx.from_dict(sliced)//q6
 return out

def full_mapping(gctx):
 ctx=fmpz_mpoly_ctx.get(FULL,"degrevlex");x=dict(zip(FULL,ctx.gens()));zero,one,h=ctx.constant(0),ctx.constant(1),x['h']
 lg=[2*h+x['a0'],h,h+x['a2']]+[h+x[f'a{i}'] for i in range(3,8)];rg=[2*h+x['b0']]+[h+x[f'b{i}'] for i in range(1,6)]+[h,h]
 ratios,left=factor(x['ta'],lg,one);_,right=factor(x['tb'],rg,one);u=[zero]*3+left[3:]
 args=[]
 for name in GEN:
  if name=='h':args.append(h)
  elif name=='C':args.append(ratios[2])
  elif name=='z':args.append(zero)
  elif name=='tb':args.append(x['tb'])
  elif name.startswith('p'):args.append(left[int(name[1:])])
  elif name.startswith('q'):args.append(right[int(name[1:])])
  else:args.append(u[int(name[1:])])
 return ctx,args

def main():
 degree=int(sys.argv[1]) if len(sys.argv)>1 else 3;coeffs=generic_coefficients();ctx,args=full_mapping(coeffs[degree].context());print('GENERIC',degree,len(list(coeffs[degree].terms())),flush=True);poly=coeffs[degree].compose(*args,ctx=ctx);print('FULL',degree,stats(poly),flush=True)
if __name__=='__main__':main()
