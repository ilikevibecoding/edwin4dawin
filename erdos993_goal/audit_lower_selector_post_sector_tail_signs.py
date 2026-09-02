"""Targeted exact audit of local tail sign/amplitude sublemmas.

Finite evidence only.  The purpose is to identify a simple analytic
replacement for the very loose W>3T target.
"""

from __future__ import annotations

from flint import fmpq

from probe_lower_selector_tail3_flint_full import duran_coefficients, selector_gamma


def main(max_d: int = 30):
    counts = {"ac_negative": 0, "ac_nonnegative": 0, "zeros": 0}
    minima = {name: None for name in (
        "a2_over_T", "b2_over_T", "c2_over_T", "absac_over_T", "b2_over_absac",
        "a2", "b2", "c2",
    )}
    witnesses = {}
    pos_k_below = None
    pos_k_above = None
    pos_k_below_cell = None
    pos_k_above_cell = None
    for d in range(5, max_d+1):
        for r in range(d-4):
            N=d+r
            for s in range(r+1,N+r+1):
                forced=max(0,s-N+1)
                gh=selector_gamma(N,s)[forced:]
                m=len(gh)-1
                if m<7: continue
                p=d+s-2*forced; n=p//2; x=n-m+1
                A=fmpq(x)*fmpq(2*x+(1 if p%2 else -1),2)
                if A>(m-1)**2: continue
                q=duran_coefficients(d+s-forced,gh)
                H=[]
                for j in range(m):
                    v=q[m-j]-sum(q[k]*A**k*H[j-k] for k in range(1,j+1))
                    H.append(v/q[0])
                aa=A**3*H[-3]**2; bb=A**2*H[-2]**2; cc=A*H[-1]**2
                T=aa+bb+cc
                ac=A**2*H[-3]*H[-1]
                if H[-3]==0 or H[-2]==0 or H[-1]==0: counts["zeros"]+=1
                if ac<0: counts["ac_negative"]+=1
                else:
                    counts["ac_nonnegative"]+=1
                    kval=bb/ac
                    if kval<1 and (pos_k_below is None or kval>pos_k_below):
                        pos_k_below=kval; pos_k_below_cell=(d,r,s,forced,m)
                    if kval>1 and (pos_k_above is None or kval<pos_k_above):
                        pos_k_above=kval; pos_k_above_cell=(d,r,s,forced,m)
                vals={
                    "a2_over_T":aa/T,"b2_over_T":bb/T,"c2_over_T":cc/T,
                    "absac_over_T":abs(ac)/T,
                    "b2_over_absac":bb/abs(ac) if ac else fmpq(10)**100,
                    "a2":aa,
                    "b2":bb,
                    "c2":cc,
                }
                cell=(d,r,s,forced,m)
                for name,val in vals.items():
                    if minima[name] is None or val<minima[name]:
                        minima[name]=val; witnesses[name]=cell
    print(counts)
    print("positive ac closest k below",None if pos_k_below is None else float(pos_k_below),pos_k_below_cell)
    print("positive ac closest k above",None if pos_k_above is None else float(pos_k_above),pos_k_above_cell)
    for name,val in minima.items(): print(name,float(val),witnesses[name])


if __name__=='__main__': main()
