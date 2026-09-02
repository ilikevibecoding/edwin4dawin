#!/usr/bin/env python3
"""Search-only exact scan of d=1 terminal-m0 nonstable B<=Y+1 band."""

from __future__ import annotations

import argparse
from collections import Counter
from fractions import Fraction
from math import comb

from derive_terminal_q3_m0_d1_h_matching_cone_adversary import low_block
from prove_balanced_subdivided_star_m0_row_correlation_adversary import (
    h_max_row, k_min_row,
)
from prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary import (
    linear_q2, linear_q3,
)
from prove_d1_spider_one_edge_decomposition_adversary import (
    path_independence, product,
)
from prove_d1_spider_quantitative_qgap_cap_adversary import h_concentrated_row


def C(n, k):
    return comb(n, k) if 0 <= k <= n else 0


def coeff(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def kmax_row(B, Y):
    return product([path_independence(1)] * (Y - 1) + [path_independence(B + 1)])


def evaluate(A, B, Y, j):
    R=A+Y; T=B+Y; S=R+T
    block=low_block(R,T,Y)
    a,c0,P,R0,A0=(block[k] for k in ("a","c0","P","R0","A0"))
    qH=linear_q3(S,R,Y,int(B>0))
    qK=(Fraction(0) if C(T,2)-B==0
        else linear_q2(T,Y,min(Y,B)))
    lead=(j+1)*A0; U=P*(c0+R0); V=P*(P+a)
    BH=2*(j+1)*A0+(j+1)*U-6*V-3*j*V*qH
    uI=Fraction((j-1)*qK+R,j)
    BK=(j+1)*A0+(j+1)*U-3*V-3*j*V*uI
    H=h_concentrated_row(R,T,Y)
    Kmin=tuple(k_min_row(T,Y,j+1))
    Kmax=kmax_row(B,Y)
    J=lead*(coeff(H,j-1)+coeff(H,j+1)+coeff(Kmin,j))+BH*coeff(H,j)
    G=J+BK*coeff(Kmax,j-1)
    sufficient=J if BK>=0 else G
    Hmax=h_max_row(R,T,Y,j)
    potentially_supported=coeff(Hmax,j)+coeff(Kmax,j-1)>0
    canonical_supported=coeff(H,j)+coeff(Kmin,j-1)>0
    return sufficient,J,G,BK,potentially_supported,canonical_supported,(
        coeff(H,j-1),coeff(H,j),coeff(H,j+1),coeff(Kmin,j),coeff(Kmax,j-1)
    )


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--s-max",type=int,default=160)
    ap.add_argument("--j-max",type=int,default=100); args=ap.parse_args()
    count=Counter(); minima={}; negative=[]; zeros=[]
    for S in range(14,args.s_max+1):
      for Y in range(1,S//2+1):
       for B in range(0,min(Y+1,S-2*Y)+1):
        A=S-B-2*Y
        if A<0: continue
        R=A+Y; T=B+Y
        block=low_block(R,T,Y)
        a,c0,P,R0,A0=(block[k] for k in ("a","c0","P","R0","A0"))
        qH=linear_q3(S,R,Y,int(B>0))
        qK=(Fraction(0) if C(T,2)-B==0
            else linear_q2(T,Y,min(Y,B)))
        H=h_concentrated_row(R,T,Y)
        maxj=min(args.j_max,S)
        Kmin=tuple(k_min_row(T,Y,maxj+1))
        Kmax=kmax_row(B,Y)
        Hmax=h_max_row(R,T,Y,maxj)
        for j in range(6,min(args.j_max,S)+1):
            lead=(j+1)*A0; U=P*(c0+R0); V=P*(P+a)
            BH=2*(j+1)*A0+(j+1)*U-6*V-3*j*V*qH
            uI=Fraction((j-1)*qK+R,j)
            BK=(j+1)*A0+(j+1)*U-3*V-3*j*V*uI
            J=lead*(coeff(H,j-1)+coeff(H,j+1)+coeff(Kmin,j))+BH*coeff(H,j)
            G=J+BK*coeff(Kmax,j-1)
            v=J if BK>=0 else G
            supported=coeff(Hmax,j)+coeff(Kmax,j-1)>0
            canonical=coeff(H,j)+coeff(Kmin,j-1)>0
            rows=(coeff(H,j-1),coeff(H,j),coeff(H,j+1),
                  coeff(Kmin,j),coeff(Kmax,j-1))
            if not supported: continue
            key=("B<Y" if B<Y else ("B=Y" if B==Y else "B=Y+1"),
                 "BK+" if BK>=0 else "BK-","canon+" if canonical else "canon0")
            count[key]+=1
            rec=(v,S,j,A,B,Y,J,G,BK,rows)
            minima[key]=rec if key not in minima else min(minima[key],rec)
            if v<0 and len(negative)<50: negative.append(rec)
            if v==0 and len(zeros)<50: zeros.append(rec)
    print("SEARCH_ONLY",flush=True); print("counts",count,flush=True)
    print("minima",minima,flush=True); print("negative",negative,flush=True)
    print("zeros",zeros,flush=True)


if __name__=="__main__": main()
