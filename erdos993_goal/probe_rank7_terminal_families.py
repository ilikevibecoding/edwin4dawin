#!/usr/bin/env python3
"""Exact family probe for terminal-broom Newton minima."""
from __future__ import annotations
from math import comb


def mul(a,b,k=8):
    z=[0]*(k+1)
    for i,x in enumerate(a):
        for j,y in enumerate(b[:k+1-i]): z[i+j]+=x*y
    return z


def rooted(adj, root, parent=-1):
    ex=[1]+[0]*8; inc=[0,1]+[0]*7
    for u in adj[root]:
        if u==parent: continue
        a,b=rooted(adj,u,root)
        ex=mul(ex,[a[i]+b[i] for i in range(9)])
        inc=mul(inc,a)
    return ex,inc


def residual(c,h,t):
    def smooth(r): return sum(comb(t,l)*c[r-l] for l in range(min(r,t)+1))
    p6=smooth(6)+h[5]; p7=smooth(7)+h[6]
    p8o=sum(comb(t,l)*c[8-l] for l in range(1,min(8,t)+1))
    return 7*c[6]*h[5]*(14*p7*p7-p6*p7-16*p6*p8o)-7*h[5]*p6*(14*c[7]*c[7]-c[6]*c[7])-8*c[6]*p6*(12*h[6]*h[6]-h[5]*h[6])


def deltas(adj,root):
    h,inc=rooted(adj,root); c=[h[i]+inc[i] for i in range(9)]
    vals=[residual(c,h,t) for t in range(1,16)]; out=[]
    for _ in range(14): out.append(vals[0]); vals=[b-a for a,b in zip(vals,vals[1:])]
    return out


def path(n):
    a=[[] for _ in range(n)]
    for i in range(n-1): a[i].append(i+1);a[i+1].append(i)
    return a


def star(n):
    a=[[] for _ in range(n)]
    for i in range(1,n): a[0].append(i);a[i].append(0)
    return a


def main():
    for n in range(13,40):
        for name,a in (("path",path(n)),("star",star(n))):
            pairs=[min((deltas(a,r)[j],r) for r in range(n)) for j in range(7)]
            print(n,name,pairs)

if __name__=="__main__":main()
