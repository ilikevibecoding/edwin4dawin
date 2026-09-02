"""Probe geometric/tail-dominance sufficient conditions for quotient moments."""
from __future__ import annotations
import math, sympy as sp
from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma
def one(d,r,s):
 N=d+r;g=selector_gamma(N,s);a=max(0,s-N+1);gh=g[a:];m=len(gh)-1;P=d+s;p=P-2*a;n=p//2;be=sp.Rational(2*(p%2)-1,2);A=sp.Rational((n-m+1)*(n-m+1+be));R=sp.sqrt(A);q=duran_polynomial(P-a,gh);c=[q.nth(m-j)*R**(m-j) for j in range(m+1)];h=[]
 for j in range(m):h.append(sp.cancel((c[j]-sum(c[m-l]*h[j-l] for l in range(1,j+1)))/c[m]))
 vals=list(map(lambda z:float(sp.N(z,17)),h));squares=[v*v for v in vals];
 if m<4:return m,vals,{}
 return m,vals, {
 'tail2_over_prefix':(squares[-3]+squares[-2])/max(1e-300,sum(squares[:-3])),
 'hm2_over_prefix':squares[-2]/max(1e-300,sum(squares[:-2])),
 'hm1_over_prefix':squares[-1]/max(1e-300,sum(squares[:-1])),
 'tail_minor_over_energy':(vals[-3]*vals[-1]-vals[-2]**2)**2/(sum(squares[:-1])+sum(squares)-1),
 'tail_ratio_abs':abs(vals[-1]/vals[-2]),
 'prev_ratio_abs':abs(vals[-2]/vals[-3]),
 'local_curvature_ratio':abs(vals[-3]*vals[-1]-vals[-2]**2)/(vals[-3]**2+vals[-2]**2+1),
 }
def main():
 records=[]
 for d in range(5,15):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    m,h,z=one(d,r,s)
    if m>=4:records.append((d,r,s,m,h,z))
 for key in records[0][-1]:
  lo=min(records,key=lambda x:x[-1][key]);hi=max(records,key=lambda x:x[-1][key]);print(key,'min',lo[:4],lo[-1][key],'max',hi[:4],hi[-1][key])
if __name__=='__main__':main()
