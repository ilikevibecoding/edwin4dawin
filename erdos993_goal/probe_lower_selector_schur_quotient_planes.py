"""Search coordinate positive 2-planes after triangular Gram congruences."""
from __future__ import annotations
import numpy as np, sympy as sp
from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma
from verify_lower_selector_schur_ranktwo_displacement import displacement_data

def one(d,r,s):
 N=d+r;g=selector_gamma(N,s);a=max(0,s-N+1);gh=g[a:];m=len(gh)-1;P=d+s;p=P-2*a;n=p//2;be=sp.Rational(2*(p%2)-1,2);A=sp.Rational((n-m+1)*(n-m+1+be));R=sp.sqrt(A);q=duran_polynomial(P-a,gh);c=[q.nth(m-j)*R**(m-j) for j in range(m+1)];H,Cu,Cv=displacement_data(c)
 mats={}
 W=Cu.inv()*Cv;V=Cv.inv()*Cu
 mats['Cu_left']=sp.eye(m)-W*W.T
 mats['Cu_right']=sp.eye(m)-W.T*W
 mats['Cv_left']=V*V.T-sp.eye(m)
 mats['Cv_right']=V.T*V-sp.eye(m)
 good=set()
 for name,M in mats.items():
  for i in range(m):
   for j in range(i+1,m):
    if M[i,i]>0 and sp.factor(M[i,i]*M[j,j]-M[i,j]**2)>0:
     good.add((name,i,j));good.add((name,i-m,j-m));good.add((name,i,j-m))
 return m,good
def main():
 common={};bad=0;counts={}
 for d in range(5,10):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    m,g=one(d,r,s)
    if not g:bad+=1
    common[m]=g if m not in common else common[m]&g
    for z in g:counts[z]=counts.get(z,0)+1
 print('bad',bad);print('common',common);print('best',sorted(counts.items(),key=lambda x:-x[1])[:30])
if __name__=='__main__':main()
