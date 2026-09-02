#!/usr/bin/env python3
"""Exact structural certificate for terminal-broom residuals at B2=0,1.

B2=sum_v binom(deg(v)-1,2).  After suppressing degree-two vertices, B2=0
is a path and B2=1 is a three-arm claw.  Positive arm-length compositions
therefore give a complete, nonredundant finite cover (up to the declared
arm ordering) for each order.
"""
from __future__ import annotations

import hashlib
import json
from itertools import combinations
from math import comb
from pathlib import Path

FIRST,LAST=23,38
OUT=Path(__file__).with_name("rank7_terminal_broom_b2_0_1_exact_20260816.json")

def mul(a,b):
    z=[0]*8
    for i,x in enumerate(a):
        for j,y in enumerate(b[:8-i]): z[i+j]+=x*y
    return tuple(z)

def state(adj,v,p):
    ex=(1,0,0,0,0,0,0,0); inc=(0,1,0,0,0,0,0,0)
    for u in adj[v]:
        if u==p: continue
        a,b=state(adj,u,v)
        ex=mul(ex,tuple(a[i]+b[i] for i in range(8)));inc=mul(inc,a)
    return ex,inc

def polynomials(adj,root):
    h,inc=state(adj,root,-1)
    return tuple(h[i]+inc[i] for i in range(8)),h

def residual(c,h,t):
    def smooth(r):return sum(comb(t,j)*c[r-j] for j in range(min(r,t)+1))
    p6,p7=smooth(6)+h[5],smooth(7)+h[6]
    p8o=sum(comb(t,j)*c[8-j] for j in range(1,min(8,t)+1))
    return 7*c[6]*h[5]*(14*p7*p7-p6*p7-16*p6*p8o)-7*h[5]*p6*(14*c[7]*c[7]-c[6]*c[7])-8*c[6]*p6*(12*h[6]*h[6]-h[5]*h[6])

def differences(c,h):
    values=[residual(c,h,t) for t in range(1,16)];out=[]
    for _ in range(14):out.append(values[0]);values=[b-a for a,b in zip(values,values[1:])]
    return out

def path(n):
    a=[[] for _ in range(n)]
    for v in range(n-1):a[v].append(v+1);a[v+1].append(v)
    return a

def claw(lengths):
    n=1+sum(lengths);a=[[] for _ in range(n)];nxt=1
    for length in lengths:
        prev=0
        for _ in range(length):a[prev].append(nxt);a[nxt].append(prev);prev=nxt;nxt+=1
    return a

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def main():
    rows=[]
    for n in range(FIRST,LAST+1):
        minima0=None; roots0=0
        a=path(n)
        for root in range(n):
            vals=differences(*polynomials(a,root));roots0+=1
            minima0=vals if minima0 is None else [min(x,y) for x,y in zip(minima0,vals)]
        minima1=None;trees1=roots1=0
        # unordered positive triples summing to n-1
        for x in range(1,n-2):
            for y in range(x,n-1-x):
                z=n-1-x-y
                if y>z:continue
                a=claw((x,y,z));trees1+=1
                for root in range(n):
                    vals=differences(*polynomials(a,root));roots1+=1
                    minima1=vals if minima1 is None else [min(u,v) for u,v in zip(minima1,vals)]
        assert minima0 is not None and minima1 is not None
        assert min(minima0)>=0 and min(minima1)>=0
        rows.append({"order":n,"b2_0_trees":1,"b2_0_roots":roots0,"b2_0_minima":minima0,"b2_1_trees":trees1,"b2_1_roots":roots1,"b2_1_minima":minima1})
        print(f"order={n} B2=0,1 PASS path_roots={roots0} claw_trees={trees1} claw_roots={roots1}",flush=True)
    payload={"schema":"rank7-terminal-broom-b2-0-1-v1","status":"PASS_EXACT_RANK7_TERMINAL_BROOM_B2_0_1_ORDERS_23_THROUGH_38","classification":"B2=0 path; B2=1 subdivision of a three-arm claw with unordered positive arm lengths","newton_conclusion":"Delta^j R_1>=0 for j=0,...,13, hence R_t>=0 for every integer t>=1","rows":rows}
    OUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(payload["status"]);print(OUT.name,sha(OUT))

if __name__=="__main__":main()
