"""Probe structured evaluation-vector positive 2-planes in Schur--Cohn form."""

from __future__ import annotations

import numpy as np
import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


def one_case(d,r,s):
 N=d+r;g=selector_gamma(N,s);a=max(0,s-N+1);gh=g[a:];m=len(gh)-1;P=d+s;p=P-2*a;n=p//2;beta=float(sp.Rational(2*(p%2)-1,2));x=n-m+1;A=x*(x+beta);R=A**.5;L=x+beta
 q=duran_polynomial(P-a,gh); coeff=np.array([float(q.nth(m-j))*R**(m-j) for j in range(m+1)])
 U=np.zeros((m,m));V=np.zeros((m,m))
 for i in range(m):
  for j in range(i+1):U[i,j]=coeff[i-j];V[i,j]=coeff[m-(i-j)]
 H=U.T@U-V.T@V
 cand={'0':0.,'half':.5,'-half':-.5,'L/R':L/R,'R/L':R/L,'x/R':x/R,'R/x':R/x,'1':1.,'-1':-1.}
 good=[]
 for ka,ta in cand.items():
  va=np.array([ta**j for j in range(m)])
  for kb,tb in cand.items():
   if ka>=kb:continue
   vb=np.array([tb**j for j in range(m)])
   G=np.array([[va@H@va,va@H@vb],[vb@H@va,vb@H@vb]])
   if G[0,0]>1e-8 and np.linalg.det(G)>1e-5*max(1,abs(G).max()**2):good.append((ka,kb))
 return set(good)

def main():
 common=None;bad=[]; counts={}
 for d in range(5,15):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    g=one_case(d,r,s)
    common=g if common is None else common&g
    if not g:bad.append((d,r,s))
    for pair in g:counts[pair]=counts.get(pair,0)+1
 print('common',common,'bad',bad[:10],len(bad))
 print('xL',counts.get(('L/R','x/R')),counts.get(('x/R','L/R')))
 print('best',sorted(counts.items(),key=lambda x:-x[1])[:20])

if __name__=='__main__':main()
