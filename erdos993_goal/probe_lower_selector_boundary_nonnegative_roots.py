"""Probe signs of q on the nonnegative exterior ray."""
from __future__ import annotations
import sympy as sp
from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma
Z=sp.symbols('z')
def main():
 badcoef=[];posroot=[]
 for d in range(5,15):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    g=selector_gamma(N,s);a=max(0,s-N+1);q=duran_polynomial(d+s-a,g[a:]);
    if not all(q.nth(j)>0 for j in range(q.degree()+1)):badcoef.append((d,r,s,q.degree(),[q.nth(j) for j in range(q.degree()+1)]))
    if q.count_roots(0,sp.oo):posroot.append((d,r,s))
 print('badcoef',len(badcoef),badcoef[:10]);print('positive roots',len(posroot),posroot[:10])
if __name__=='__main__':main()
