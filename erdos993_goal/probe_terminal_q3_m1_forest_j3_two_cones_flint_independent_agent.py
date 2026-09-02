#!/usr/bin/env python3
"""Probe a two-integer-cone cover of the conservative-cap m1,j3 tail."""

from __future__ import annotations

from math import comb, prod
from time import perf_counter

from flint import fmpq, fmpq_mpoly_ctx


CTX = fmpq_mpoly_ctx.get(["x", "z", "u", "r", "w"])
x, z, u, r, w = CTX.gens()


def q(n, d=1):
    return fmpq(n, d)


def choose(t, k):
    out = CTX.constant(1)
    for j in range(k):
        out *= t - j
    return out / q((1, 1, 2, 6, 24)[k])


def build(shift_s=0, shift_D=0, mode=None):
    if mode == "ratio_d":
        s = 4 + x
        D = 7 * s + z
    elif isinstance(mode, tuple) and mode[0] == "ratio_d":
        _tag, multiplier, sshift = mode
        s = sshift + x
        D = multiplier * s + z
    elif isinstance(mode, int):
        s = CTX.constant(mode)
        D = 25 - mode + z
    else:
        s = shift_s + x
        D = shift_D + z
    S = 5 + s
    d = 1 + D
    N = S + d
    H = (S - 2) * u / 2
    h = 1 + H
    R = (S - 2) * (1 - u) * r
    L = (S - 2) * (1 - u) * (1 - r)
    assert not (S - (2 * h + R + L))
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
    coarse_f4 = (
        choose(S - 3, 4)
        + d * choose(S - 2, 3) - R * choose(S - 3, 2)
        + choose(d, 2) * choose(S - 1, 2)
        - (d - 1) * R * (S - 2)
        + choose(d, 3) * S - choose(d - 1, 2) * R + choose(d, 4)
    )
    C = h2 + coarse_f4
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
        t = N - 3
        base = (12 * a * p1 * b * t * p0 * R1
                + 4 * a * t * p0 * p0 * gap
                + 8 * a * p1 * t * A1 * p0
                + p1 * b * t * rem_num)
        if which == "coupled":
            extra = (2 * a * p1 * b * t * A1 * (t + 2 * yvalue)
                     + 24 * a * p1 * b * A1 * yvalue)
        else:
            extra = (8 * a * p1 * b * t * A1 * (1 + yvalue)
                     + 8 * a * p1 * t * A1 * C)
        return base + extra

    c0p, c1p = scaled("coupled", 0), scaled("coupled", 1)
    t0p, t1p = scaled("tangent", 0), scaled("tangent", 1)
    Pc = c0p * Tden + (c1p - c0p) * U3
    Pt = t0p * Tden + (t1p - t0p) * U3
    K = (4 * C * (N - 3) * Tden
         - b * ((N - 7) * (N - 3) * Tden - 2 * (N - 9) * U3))
    assert Pt - Pc == 2 * a * p1 * A1 * K
    return Pc, Pt


def partial_bernstein(poly):
    """Keep x,z in the power basis and convert u,r,w to Bernstein."""
    degrees = tuple(poly.degrees())
    shape = tuple(n + 1 for n in degrees)
    strides = tuple(prod(shape[j + 1:]) for j in range(5))
    values = [fmpq(0)] * prod(shape)
    for powers, coefficient in poly.to_dict().items():
        values[sum(a*b for a,b in zip(powers,strides))] = coefficient
    for axis in (2, 3, 4):
        n = degrees[axis]
        stride = strides[axis]
        converted = [fmpq(0)] * len(values)
        weights = [[fmpq(comb(i,k),comb(n,k)) for k in range(i+1)]
                   for i in range(n+1)]
        for outer in range(prod(shape[:axis])):
            base = outer * shape[axis] * stride
            for inner in range(stride):
                line = [values[base+k*stride+inner] for k in range(n+1)]
                for i in range(n+1):
                    converted[base+i*stride+inner] = sum(
                        (weights[i][k]*line[k] for k in range(i+1)), fmpq(0))
        values = converted
    return shape, values


def full_two_unbounded_bernstein(poly):
    """Compactify x,z independently, then Bernstein-convert u,r,w."""
    degrees=tuple(poly.degrees()); shape=tuple(n+1 for n in degrees)
    strides=tuple(prod(shape[j+1:]) for j in range(5)); values=[fmpq(0)]*prod(shape)
    for powers,coefficient in poly.to_dict().items():
        index=sum(a*b for a,b in zip(powers,strides))
        values[index]=coefficient/(comb(degrees[0],powers[0])*comb(degrees[1],powers[1]))
    for axis in (2,3,4):
        n=degrees[axis]; stride=strides[axis]; converted=[fmpq(0)]*len(values)
        weights=[[fmpq(comb(i,k),comb(n,k)) for k in range(i+1)] for i in range(n+1)]
        for outer in range(prod(shape[:axis])):
          base=outer*shape[axis]*stride
          for inner in range(stride):
            line=[values[base+k*stride+inner] for k in range(n+1)]
            for i in range(n+1):
              converted[base+i*stride+inner]=sum(
                  (weights[i][k]*line[k] for k in range(i+1)),fmpq(0))
        values=converted
    return shape,values


def subdivide(shape,values,axis):
    n=shape[axis]-1; stride=prod(shape[axis+1:]); outer=prod(shape[:axis])
    left=[fmpq(0)]*len(values); right=[fmpq(0)]*len(values)
    for o in range(outer):
      base=o*shape[axis]*stride
      for inner in range(stride):
        level=[values[base+k*stride+inner] for k in range(n+1)]
        ls=[level[0]]; rs=[None]*(n+1); rs[n]=level[-1]
        for depth in range(1,n+1):
          level=[(level[k]+level[k+1])/2 for k in range(len(level)-1)]
          ls.append(level[0]); rs[n-depth]=level[-1]
        for k in range(n+1):
          left[base+k*stride+inner]=ls[k]; right[base+k*stride+inner]=rs[k]
    return left,right


def nstats(values):
    return (sum(a<0 for a in values),min(values),sum(a==0 for a in values))


def argmin_index(shape,values):
    flat=min(range(len(values)),key=values.__getitem__); rem=flat; out=[]
    for size in shape:
        stride=prod(shape[len(out)+1:]); out.append(rem//stride); rem%=stride
    return tuple(out),values[flat]


def main():
    # Integer tail cover: s+D=N-6>=25, so s>=13 or D>=13.
    for label, shifts, wanted in (
        ("S_LARGE", (13,0), 0),
        ("D_LARGE", (0,13), 1),
    ):
        started=perf_counter()
        branches=build(*shifts)
        print(label,"build",perf_counter()-started,
              [(len(p),p.degrees()) for p in branches],flush=True)
        desired=None
        allnets=[]
        for index,name in enumerate(("Pc","Pt")):
            started=perf_counter(); shape,values=partial_bernstein(branches[index])
            neg=[a for a in values if a<0]
            print(label,name,"net",shape,"seconds",perf_counter()-started,
                  "negative",len(neg),"minimum",min(values),"zero",sum(a==0 for a in values),
                  "WANTED" if index==wanted else "",flush=True)
            if index==wanted: desired=(shape,values)
            allnets.append((shape,values))
        shape,values=desired
        for axis,name in ((2,"u"),(3,"r"),(4,"w")):
            started=perf_counter(); children=subdivide(shape,values,axis)
            print(label,"wanted_split",name,"seconds",perf_counter()-started,
                  [nstats(c) for c in children],flush=True)
            both=[subdivide(allnets[j][0],allnets[j][1],axis) for j in range(2)]
            print(label,"both_split",name,
                  [[nstats(both[j][side]) for j in range(2)] for side in range(2)],
                  flush=True)
    for label,mode in (("V_LE_1_8_RATIO", "ratio_d"),
                       ("S_STRIP_0",0),("S_STRIP_1",1),
                       ("S_STRIP_2",2),("S_STRIP_3",3)):
        branches=build(mode=mode)
        shape,values=partial_bernstein(branches[1])
        print(label,"Pt",shape,nstats(values),flush=True)
        if mode == "ratio_d":
            for axis,name in ((2,"u"),(3,"r"),(4,"w")):
                print(label,"split",name,[nstats(c) for c in subdivide(shape,values,axis)],flush=True)
            fshape,fvalues=full_two_unbounded_bernstein(branches[1])
            print(label,"full_compact",fshape,nstats(fvalues),flush=True)
            print(label,"full_argmin",argmin_index(fshape,fvalues),flush=True)
            for axis,name in enumerate(("x","z","u","r","w")):
                print(label,"full_split",name,[nstats(c) for c in subdivide(fshape,fvalues,axis)],flush=True)
            cshape,cvalues=full_two_unbounded_bernstein(branches[0])
            print(label,"Pc_full_compact",cshape,nstats(cvalues),flush=True)
            for axis,name in enumerate(("x","z","u","r","w")):
                print(label,"Pc_full_split",name,[nstats(c) for c in subdivide(cshape,cvalues,axis)],flush=True)


if __name__=="__main__": main()
