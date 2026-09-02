"""Probe local expansions certifying q(z)>0 on the nonnegative exterior ray."""
from __future__ import annotations
import sympy as sp
from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma
Z,X=sp.symbols('z x')
def main():
 counts={'taylor_L':0,'taylor_0':0,'taylor_R':0,'bern_R_infty':0};fails={};total=0
 for d in range(5,15):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    if (d,r,s)==(5,0,5):continue
    g=selector_gamma(N,s);a=max(0,s-N+1);gh=g[a:];m=len(gh)-1;P=d+s;p=P-2*a;n=p//2;be=sp.Rational(2*(p%2)-1,2);x=n-m+1;L=x+be;A=sp.Rational(x*L);R=sp.sqrt(A);q=duran_polynomial(P-a,gh)
    checks={
     'taylor_L':all(q.diff((Z,j)).eval(L)>=0 for j in range(m+1)),
     'taylor_0':all(q.nth(j)>=0 for j in range(m+1)),
     'taylor_R':all(q.diff((Z,j)).eval(R)>=0 for j in range(m+1)),
    }
    checks['bern_R_infty']=False
    total+=1
    for k,v in checks.items():
     counts[k]+=int(v)
     if not v and k not in fails:fails[k]=(d,r,s,m)
 print(total,counts,fails)
if __name__=='__main__':main()
