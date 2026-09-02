"""Aggressively test local sufficient inequalities for the Toeplitz moment plane."""
from __future__ import annotations
import sympy as sp
from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma

def one(d,r,s):
 N=d+r;g=selector_gamma(N,s);a=max(0,s-N+1);gh=g[a:];m=len(gh)-1;P=d+s;p=P-2*a;n=p//2;be=sp.Rational(2*(p%2)-1,2);A=sp.Rational((n-m+1)*(n-m+1+be));R=sp.sqrt(A);q=duran_polynomial(P-a,gh);c=[q.nth(m-j)*R**(m-j) for j in range(m+1)];h=[]
 for j in range(m):h.append(sp.factor((c[j]-sum(c[m-l]*h[j-l] for l in range(1,j+1)))/c[m]))
 E=sum(x*x for x in h[:-1]);F=E+h[-1]**2;C=sum(h[j]*h[j+1] for j in range(m-1));D=sp.factor((E-1)*(F-1)-C*C)
 tests={
 'h0_abs_gt1':abs(h[0])>1,
 'h_last_top_abs_gt1':abs(h[-2])>1,
 'E_gt_absC_plus1':E>abs(C)+1,
 'both_diag_dom':E-1>abs(C) and F-1>abs(C),
 'CS_head':E*(h[0]**2-1)>F-1,
 'C_sign_nonnegative':C>=0,
 'h_alternating':all(h[j]*h[j+1]<=0 for j in range(m-1)),
 'h_one_sign':all(h[j]*h[j+1]>=0 for j in range(m-1)),
 'abs_logconvex':all(h[j]**2<=abs(h[j-1]*h[j+1]) for j in range(1,m-1)),
 'abs_logconcave':all(h[j]**2>=abs(h[j-1]*h[j+1]) for j in range(1,m-1)),
 'last_schur':abs(h[-1])<E-1,
 }
 return m,tests,[sp.N(x,12) for x in h],sp.N(D,12)
def main():
 counts={};fails={};total=0
 for d in range(5,15):
  for r in range(d-4):
   N=d+r
   for s in range(r+1,N+r+1):
    if (d,r,s)==(5,0,5):continue
    m,t,h,D=one(d,r,s);total+=1
    for key,val in t.items():
     counts[key]=counts.get(key,0)+int(bool(val))
     if not val and key not in fails:fails[key]=(d,r,s,m,h,D)
 print('total',total)
 for k in counts:print(k,counts[k],'firstfail',fails.get(k))
if __name__=='__main__':main()
