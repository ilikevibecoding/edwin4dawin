#!/usr/bin/env python3
"""Corrected exact-wedge FLINT bands for the forest m1,j3 middle tail."""

from __future__ import annotations

from flint import fmpq

import probe_terminal_q3_m1_forest_j3_ratio_bands_independent_agent as base


CTX=base.CTX
x,t,u,r,w=base.x,base.t,base.u,base.r,base.w
q=base.q
choose=base.choose
one_unbounded_net=base.one_unbounded_net


def build(lo_num,lo_den,hi_num,hi_den,shift,h4mode="path"):
    s=shift+x
    ratio=q(lo_num,lo_den)+(q(hi_num,hi_den)-q(lo_num,lo_den))*t
    D=s*ratio; S=5+s; d=1+D; N=S+d
    H=(S-2)*u/2; h=1+H
    R=(S-2)*(1-u)*r; L=(S-2)*(1-u)*(1-r)
    Wlo=choose(d,2)+R+L
    # Exact correlated upper -- no extra R+L term.
    Whi=choose(d,2)+choose(R+1,2)+choose(L+1,2)
    W=Wlo+(Whi-Wlo)*w
    m=N-h
    p0=choose(N+1,3)-m*(N-1)+W+choose(N+1,2)-m
    p1=choose(N+1,2)-m+N+1
    R1=m*N-2*W
    a=choose(N,2)-(m-d)
    z2=(m-d)*(N-2)-2*(W-choose(d,2)-R)
    h2=choose(S,2)-(m-d-R)
    c0=a+z2+h2
    b=choose(N,3)-(m-d)*(N-2)+W-choose(d,2)-R
    A1=p0*a+p1*c0+p1*a-a*R1
    gap=2*p1*c0-3*a*R1
    path_f4=choose(S-3,4)
    nonzero_f4=(
        d*choose(S-2,3)-R*choose(S-3,2)
        +choose(d,2)*choose(S-1,2)-(d-1)*R*(S-2)
        +choose(d,3)*S-choose(d-1,2)*R+choose(d,4)
    )
    if h4mode.endswith("_q"):
        # Let Q=sum_i C(r_i,2) for the d root-neighbor child groups.
        # The residual wedge budget gives Q >= W-A-R-C(L+1,2).
        # Exact Taylor corrections to the one- and two-root-neighbor
        # rank-four classes then give the following correlated reserve.
        Qfloor=W-choose(d,2)-R-choose(L+1,2)
        nonzero_f4 += (
            Qfloor*((3*S-R-10)/3+d-2)+choose(R,2)
        )

    def scaled(yvalue):
        ebar_num=2*a*(1+yvalue)+3*z2
        Q0_num=8*a*c0-3*ebar_num*(p0+a)
        Q1_num=2*a*(4*(a+R1)-3*(p0+a+p1))-3*ebar_num*p1
        rem_num=p0*Q1_num+p1*Q0_num+p1*Q1_num
        n3=N-3
        common=(12*a*p1*b*n3*p0*R1+4*a*n3*p0*p0*gap
                +8*a*p1*n3*A1*p0+p1*b*n3*rem_num)
        base_mode=h4mode.removesuffix("_q")
        if base_mode=="path":
            h4floor=path_f4
        elif base_mode=="component":
            h4floor=(h+R-3)*b*yvalue/4
        elif base_mode=="edge_union":
            h4floor=choose(S,4)-(S-h-R)*choose(S-2,2)
        elif base_mode=="component_selection":
            h4floor=choose(h+R,4)
        else:
            raise ValueError(h4mode)
        Cvalue=h2+nonzero_f4+h4floor
        extra=8*a*p1*b*n3*A1*(1+yvalue)+8*a*p1*n3*A1*Cvalue
        return common+extra

    # Exact pair-exclusion cap y<=(S-2)/(S-2+3(d-2)).
    cap_num=S-2; cap_den=S-2+3*(d-2)
    pzero,pone=scaled(0),scaled(1)
    return pzero*cap_den+(pone-pzero)*cap_num


def main():
    import argparse
    import probe_terminal_q3_m1_forest_j3_tail_flint_independent_agent as core
    ap=argparse.ArgumentParser(); ap.add_argument("--lo",required=True); ap.add_argument("--hi",required=True)
    ap.add_argument("--shift",type=int,required=True); ap.add_argument("--h4",choices=("path","component","edge_union","component_selection","path_q","component_q","edge_union_q"),default="path")
    a=ap.parse_args(); ln,ld=map(int,a.lo.split("/")); hn,hd=map(int,a.hi.split("/"))
    poly=build(ln,ld,hn,hd,a.shift,a.h4); shape,values=one_unbounded_net(poly)
    print(a.lo,a.hi,a.shift,a.h4,"terms",len(poly),"degrees",poly.degrees(),
          "shape",shape,"stats",core.net_stats(values),flush=True)


if __name__=="__main__":
    main()
