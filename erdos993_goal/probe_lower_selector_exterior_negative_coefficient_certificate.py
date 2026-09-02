"""Probe coefficient certificates excluding nonnegative exterior roots."""
from __future__ import annotations
import sympy as sp
from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma
W=sp.symbols('w')
def main():
 plus=[];minus=[];either=[]
 for d in range(5,15):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    g=selector_gamma(N,s);a=max(0,s-N+1);m=len(g[a:])-1;P=d+s;p=P-2*a;n=p//2;be=sp.Rational(2*(p%2)-1,2);A=sp.Rational((n-m+1)*(n-m+1+be));R=sp.sqrt(A);q=duran_polynomial(P-a,g[a:])
    for sign,target in [(1,plus),(-1,minus)]:
     f=sp.Poly(sp.cancel((1-W)**m*q.as_expr().subs(q.gens[0],sign*R*(1+W)/(1-W))),W,extension=R)
     target.append(all(f.nth(j)>0 for j in range(m+1)) or all(f.nth(j)<0 for j in range(m+1)))
 print('plus coefficient sign',sum(plus),len(plus),'minus',sum(minus),len(minus))
if __name__=='__main__':main()
