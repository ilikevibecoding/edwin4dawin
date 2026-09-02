#!/usr/bin/env python3
"""Diagnostic only: coarse caps for adjacent marks, p adjacent to neither."""
from __future__ import annotations
import math
import numpy as np
from census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root import enumerate_forest_polynomials,row_corner,truncate
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS,K2_TERMS,L2_TERMS

def bilinear(x,y,t): return sum(q*int(x[i])*int(y[j]) for q,i,j in t)
def audit(n,polys):
    jets=sorted({truncate(p,8) for p in polys}); keys=[(o,m) for o in range(n+1) for m in (0,1)]; rows=np.asarray([row_corner(o,bool(m)) for o,m in keys],dtype=np.int64); ix={q:i for i,q in enumerate(keys)}
    cfg=[(mb,mc,bm,cm) for mb in range(n+1) for mc in range(n+1) if mb+mc>=n for bm in (0,1) for cm in (0,1)]
    mb=np.asarray([q[0] for q in cfg]);mc=np.asarray([q[1] for q in cfg]);bi=np.asarray([ix[(q[0],q[2])] for q in cfg]);ci=np.asarray([ix[(q[1],q[3])] for q in cfg]);b=rows[bi];c=rows[ci]
    kv=np.zeros(len(cfg),dtype=np.int64)
    for q,i,j in K2_TERMS:kv+=q*b[:,i]*c[:,j]
    h=n-1;h2=math.comb(h,2);h3=math.comb(h,3);neg=0;minimum=None;wit=None
    for a in jets:
        lv=np.zeros(len(rows),dtype=np.int64)
        for q,i,j in L2_TERMS:lv+=q*a[i]*rows[:,j]
        base=bilinear(a,a,A2_TERMS)+lv[bi]+lv[ci]+kv
        kpa4=-2*n-2*a[2]-5*a[3]-12*c[:,2];kpa5=n-5*a[2]+7*mc
        kpb4=-2*n-2*a[2]-5*a[3]-12*b[:,2];kpb5=n-5*a[2]+7*mb
        npw3=4*a[2]+2*a[3]+2*mb+2*b[:,2]+5*b[:,3]+2*mc+2*c[:,2]+5*c[:,3]
        kpw4=-2*n-2*a[2]-10*a[3]+mb-5*b[:,2]+mc-5*c[:,2]
        vals=base+(kpa4+kpb4)*h2+(kpa5+kpb5)*h3-npw3*h2+kpw4*h3
        neg+=int(np.count_nonzero(vals<0));i=int(np.argmin(vals));cand=(int(vals[i]),tuple(a),cfg[i])
        if minimum is None or cand<minimum:minimum=cand;wit=cand
    print(n,len(jets),neg,minimum,wit,flush=True)

f,_=enumerate_forest_polynomials(18)
for n in range(14,19):audit(n,f[n])
