"""Test the first two quotient-Toeplitz directions in the Schur form."""

from __future__ import annotations

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


def one(d,r,s):
 N=d+r;g=selector_gamma(N,s);a=max(0,s-N+1);gh=g[a:];m=len(gh)-1;P=d+s;p=P-2*a;n=p//2;be=sp.Rational(2*(p%2)-1,2);A=sp.Rational((n-m+1)*(n-m+1+be));R=sp.sqrt(A);q=duran_polynomial(P-a,gh)
 c=[q.nth(m-j)*R**(m-j) for j in range(m+1)]
 w0=sp.cancel(c[m]/c[0]);w1=sp.cancel((c[0]*c[m-1]-c[1]*c[m])/c[0]**2)
 D0=sp.simplify(1-w0**2);D1=sp.simplify((1-w0**2)**2-w1**2)
 return D0,D1,w0,w1

def main():
 bad=[];mins=[]
 for d in range(5,15):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    D0,D1,w0,w1=one(d,r,s)
    if not (D0>0 and D1>0):bad.append((d,r,s,str(D0),str(D1),str(w0),str(w1)))
 print('bad',len(bad),bad[:20])

if __name__=='__main__':main()
