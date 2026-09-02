#!/usr/bin/env python3
"""Exact FLINT probe for the S=2,3,4 forest m1,j3 N>=31 strips."""

from __future__ import annotations

from itertools import combinations
from math import comb, prod

from flint import fmpq, fmpq_mpoly_ctx


CTX = fmpq_mpoly_ctx.get(["E", "t", "u", "r", "w"])
E, t, u, r, w = CTX.gens()


def choose(value, rank):
    out = CTX.constant(1)
    for offset in range(rank):
        out *= value - offset
    return out / (1, 1, 2, 6, 24)[rank]


def h3_max(order, components):
    edges = list(combinations(range(order), 2))
    best = -1
    witnesses = []
    for mask in range(1 << len(edges)):
        adjacency = [set() for _ in range(order)]
        edge_count = 0
        for index, (a, b) in enumerate(edges):
            if mask >> index & 1:
                adjacency[a].add(b); adjacency[b].add(a); edge_count += 1
        # A forest with c components has exactly n-c edges; reject cyclic rows
        # by an explicit union-find pass.
        if edge_count != order - components:
            continue
        parent = list(range(order))
        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]; a = parent[a]
            return a
        good = True
        for a, b in edges:
            if b not in adjacency[a]:
                continue
            aa, bb = find(a), find(b)
            if aa == bb:
                good = False; break
            parent[aa] = bb
        if not good or len({find(v) for v in range(order)}) != components:
            continue
        count = 0
        for subset in combinations(range(order), 3):
            if all(b not in adjacency[a] for a, b in combinations(subset, 2)):
                count += 1
        if count > best:
            best = count; witnesses = [mask]
        elif count == best:
            witnesses.append(mask)
    if best < 0:
        raise AssertionError((order, components))
    return best, len(witnesses)


def build(S_value, h_value, R_value, L_value, h3_bound, branch):
    S = CTX.constant(S_value)
    h = CTX.constant(h_value)
    R = CTX.constant(R_value)
    L = CTX.constant(L_value)
    N = 31 + E
    d = N - S
    if S - (2*h + R + L):
        raise AssertionError("budget")
    Wlo = choose(d, 2) + R + L
    Whi = choose(d, 2) + choose(R + 1, 2) + choose(L + 1, 2)
    W = Wlo + (Whi - Wlo) * w
    m = N - h
    p0 = choose(N + 1, 3) - m*(N-1) + W + choose(N + 1, 2) - m
    p1 = choose(N + 1, 2) - m + N + 1
    R1 = m*N - 2*W
    a = choose(N, 2) - (m-d)
    z2 = (m-d)*(N-2) - 2*(W-choose(d,2)-R)
    h2 = choose(S,2) - (m-d-R)
    c0 = a+z2+h2
    b = choose(N,3) - (m-d)*(N-2) + W-choose(d,2)-R
    A1 = p0*a+p1*c0+p1*a-a*R1
    gap = 2*p1*c0-3*a*R1
    nonzero_f4 = (
        d*choose(S-2,3)-R*choose(S-3,2)
        +choose(d,2)*choose(S-1,2)-(d-1)*R*(S-2)
        +choose(d,3)*S-choose(d-1,2)*R+choose(d,4)
    )

    def scaled(yvalue):
        ebar_num=2*a*(1+yvalue)+3*z2
        Q0_num=8*a*c0-3*ebar_num*(p0+a)
        Q1_num=2*a*(4*(a+R1)-3*(p0+a+p1))-3*ebar_num*p1
        rem_num=p0*Q1_num+p1*Q0_num+p1*Q1_num
        n3=N-3
        common=(12*a*p1*b*n3*p0*R1+4*a*n3*p0*p0*gap
                +8*a*p1*n3*A1*p0+p1*b*n3*rem_num)
        if branch == "coupled":
            extra=2*a*p1*b*n3*A1*(n3+2*yvalue)+24*a*p1*b*A1*yvalue
        elif branch == "tangent":
            Cvalue=h2+nonzero_f4  # h4=0 identically when S<=4
            extra=8*a*p1*b*n3*A1*(1+yvalue)+8*a*p1*n3*A1*Cvalue
        else:
            raise ValueError(branch)
        return common+extra

    at0, at1 = scaled(0), scaled(1)
    # y=h3/b <= h3_bound/b and b>0 on supported rows.
    return at0*b + (at1-at0)*h3_bound


def net(poly):
    degrees=tuple(poly.degrees()); shape=tuple(int(n+1) for n in degrees)
    strides=tuple(prod(shape[j+1:]) for j in range(5)); values=[fmpq(0)]*prod(shape)
    for powers,coefficient in poly.to_dict().items():
        values[sum(a*b for a,b in zip(powers,strides))]=coefficient/comb(degrees[0],powers[0])
    for axis in range(1,5):
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


def main():
    cases=[]
    for S in (2,3,4):
        for h in range(1,S//2+1):
            for R in range(S-2*h+1):
                L=S-2*h-R
                c=h+R
                bound,witnesses=h3_max(S,c)
                cases.append((S,h,R,L,bound,witnesses))
    print("CASES",cases,flush=True)
    for case in cases:
        S,h,R,L,bound,_=case
        print("CASE",case,flush=True)
        for branch in ("coupled","tangent"):
            poly=build(S,h,R,L,bound,branch); shape,values=net(poly)
            print(branch,"terms",len(poly),"shape",shape,
                  "stats",sum(v<0 for v in values),min(values),sum(v==0 for v in values),flush=True)


if __name__ == "__main__":
    main()
