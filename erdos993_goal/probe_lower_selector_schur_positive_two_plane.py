"""Find a uniform positive 2-plane in the lower-selector Schur form."""

from __future__ import annotations

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from audit_lower_selector_m1_schur_sturm_indices import (
    primitive_integer_coefficients,
    rational_schur_cohn_matrix,
)
from verify_lower_qsharp_reduction import selector_gamma


def one_case(d,r,s):
 N=d+r; gamma=selector_gamma(N,s); a=max(0,s-N+1); gh=gamma[a:];m=len(gh)-1
 P=d+s;p=P-2*a;n=p//2;beta=sp.Rational(2*(p%2)-1,2);A=sp.Rational((n-m+1)*(n-m+1+beta))
 q=duran_polynomial(P-a,gh); K=rational_schur_cohn_matrix(primitive_integer_coefficients(q),A)
 pairs=[]
 for i in range(m):
  for j in range(i+1,m):
   if K[i,i]>0 and K[j,j]>0 and K[i,i]*K[j,j]-K[i,j]**2>0:pairs.append((i,j))
 return m,set(pairs)

def main():
 common={}
 bad=[]
 for d in range(5,15):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    m,pairs=one_case(d,r,s)
    rel=set()
    for i,j in pairs:
     rel.add((i,j));rel.add((i-m,j-m));rel.add((i,j-m))
    if m not in common: common[m]=rel
    else: common[m]&=rel
    if not pairs:bad.append((d,r,s,m))
 print('bad no positive principal 2-plane',bad)
 print('common relative by m')
 for m,v in sorted(common.items()):print(m,sorted(v))

if __name__=='__main__':main()
