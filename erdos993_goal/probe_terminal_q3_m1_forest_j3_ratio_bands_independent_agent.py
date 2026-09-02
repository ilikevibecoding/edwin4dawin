#!/usr/bin/env python3
"""Exact FLINT Bernstein probe for rational D/s bands in the corrected tail."""

from __future__ import annotations

import argparse
from math import comb, prod
from time import perf_counter

from flint import fmpq, fmpq_mpoly_ctx


CTX = fmpq_mpoly_ctx.get(["x", "t", "u", "r", "w"])
x, t, u, r, w = CTX.gens()


def q(a, b=1):
    return fmpq(a, b)


def choose(a, k):
    out = CTX.constant(1)
    for j in range(k):
        out *= a - j
    return out / (1, 1, 2, 6, 24)[k]


def build(lo_num, lo_den, hi_num, hi_den, shift, cap="pair", h4mode="path",
          tworoot_correction=False):
    s = shift + x
    ratio = q(lo_num, lo_den) + (q(hi_num, hi_den) - q(lo_num, lo_den)) * t
    D = s * ratio
    S = 5 + s
    d = 1 + D
    N = S + d
    H = (S - 2) * u / 2
    h = 1 + H
    R = (S - 2) * (1 - u) * r
    L = (S - 2) * (1 - u) * (1 - r)
    Wlo = choose(d, 2) + R + L
    Whi = Wlo + choose(R + 1, 2) + choose(L + 1, 2)
    W = Wlo + (Whi - Wlo) * w
    m = N - h
    p0 = choose(N + 1, 3) - m * (N - 1) + W + choose(N + 1, 2) - m
    p1 = choose(N + 1, 2) - m + N + 1
    R1 = m * N - 2 * W
    a = choose(N, 2) - (m - d)
    z2 = (m - d) * (N - 2) - 2 * (W - choose(d, 2) - R)
    h2 = choose(S, 2) - (m - d - R)
    c0 = a + z2 + h2
    b = choose(N, 3) - (m - d) * (N - 2) + W - choose(d, 2) - R
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    gap = 2 * p1 * c0 - 3 * a * R1
    path_f4 = choose(S - 3, 4)
    nonzero_f4 = (
        d * choose(S - 2, 3) - R * choose(S - 3, 2)
        + choose(d, 2) * choose(S - 1, 2) - (d - 1) * R * (S - 2)
        + choose(d, 3) * S - choose(d - 1, 2) * R + choose(d, 4)
    )
    if tworoot_correction:
        nonzero_f4 += choose(R, 2)
    eH = N - h - d - R
    U3 = choose(S, 3) - eH * (S - 2) + choose(eH, 2)
    B = (d * choose(S - 1, 2) - R * (S - 2)
         + choose(d, 2) * S - (d - 1) * R + choose(d, 3))
    Tden = U3 + B

    def scaled(which, yvalue):
        ebar_num = 2 * a * (1 + yvalue) + 3 * z2
        Q0_num = 8 * a * c0 - 3 * ebar_num * (p0 + a)
        Q1_num = (2 * a * (4 * (a + R1) - 3 * (p0 + a + p1))
                  - 3 * ebar_num * p1)
        rem_num = p0 * Q1_num + p1 * Q0_num + p1 * Q1_num
        n3 = N - 3
        base = (12*a*p1*b*n3*p0*R1 + 4*a*n3*p0*p0*gap
                + 8*a*p1*n3*A1*p0 + p1*b*n3*rem_num)
        if which == "coupled":
            extra = 2*a*p1*b*n3*A1*(n3+2*yvalue) + 24*a*p1*b*A1*yvalue
        else:
            if h4mode == "path":
                h4floor = path_f4
            elif h4mode == "component":
                h4floor = (h + R - 3) * b * yvalue / 4
            elif h4mode == "edge_union":
                # H has S-h-R edges.  A union bound on four-sets containing
                # at least one H-edge gives this exact all-order floor.
                h4floor = choose(S, 4) - (S - h - R) * choose(S - 2, 2)
            elif h4mode == "component_selection":
                # Fix one vertex in each component of H.  H has h+R
                # components, and every four chosen representatives are
                # independent.
                h4floor = choose(h + R, 4)
            elif h4mode == "component_quarter":
                # Valid on the separate r>=1/2,u<=1/2 face, where
                # h+R>=1+(S-2)/4.  The caller must not use it elsewhere.
                h4floor = choose(1 + (S - 2) / 4, 4)
            else:
                raise ValueError(h4mode)
            Cvalue = h2 + nonzero_f4 + h4floor
            extra = 8*a*p1*b*n3*A1*(1+yvalue) + 8*a*p1*n3*A1*Cvalue
        return base + extra

    out = []
    for which in ("coupled", "tangent"):
        pzero, pone = scaled(which, 0), scaled(which, 1)
        if cap == "pair":
            cap_num = S - 2
            cap_den = S - 2 + 3 * (d - 2)
        elif cap == "pair_residual":
            B2 = choose(d, 2) * S - (d - 1) * R
            B3 = choose(d, 3)
            cap_num = b - (d - 2) * h2 - B2 - B3
            cap_den = b
        elif cap == "fixed_edge":
            cap_num, cap_den = U3, Tden
        else:
            raise ValueError(cap)
        out.append(pzero*cap_den + (pone-pzero)*cap_num)
    return tuple(out)


def one_unbounded_net(poly):
    degrees = tuple(poly.degrees())
    shape = tuple(n + 1 for n in degrees)
    strides = tuple(prod(shape[j+1:]) for j in range(5))
    vals = [fmpq(0)] * prod(shape)
    for powers, coefficient in poly.to_dict().items():
        vals[sum(a*b for a,b in zip(powers,strides))] = coefficient / comb(degrees[0],powers[0])
    for axis in range(1,5):
        n=degrees[axis]; stride=strides[axis]; converted=[fmpq(0)]*len(vals)
        weights=[[fmpq(comb(i,k),comb(n,k)) for k in range(i+1)] for i in range(n+1)]
        for outer in range(prod(shape[:axis])):
            base=outer*shape[axis]*stride
            for inner in range(stride):
                line=[vals[base+k*stride+inner] for k in range(n+1)]
                for i in range(n+1):
                    converted[base+i*stride+inner]=sum(
                        (weights[i][k]*line[k] for k in range(i+1)),fmpq(0))
        vals=converted
    return shape, vals


def stats(vals):
    return sum(a<0 for a in vals), min(vals), sum(a==0 for a in vals)


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--lo",required=True); ap.add_argument("--hi",required=True)
    ap.add_argument("--shift",type=int,default=1)
    ap.add_argument("--cap",choices=("pair","pair_residual","fixed_edge"),default="pair")
    ap.add_argument("--h4",choices=("path","component","edge_union","component_selection","component_quarter"),default="path")
    ap.add_argument("--tworoot-correction",action="store_true")
    a=ap.parse_args()
    ln,ld=map(int,a.lo.split("/")); hn,hd=map(int,a.hi.split("/"))
    start=perf_counter(); branches=build(
        ln,ld,hn,hd,a.shift,a.cap,a.h4,a.tworoot_correction
    )
    print("BUILD",a.lo,a.hi,"shift",a.shift,"seconds",perf_counter()-start,
          [(len(p),p.degrees()) for p in branches],flush=True)
    for name,poly in zip(("Pc","Pt"),branches):
        start=perf_counter(); shape,vals=one_unbounded_net(poly)
        print(name,shape,stats(vals),"seconds",perf_counter()-start,flush=True)


if __name__ == "__main__":
    main()
