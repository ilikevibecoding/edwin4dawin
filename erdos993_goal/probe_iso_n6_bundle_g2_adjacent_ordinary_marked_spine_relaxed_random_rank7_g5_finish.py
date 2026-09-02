#!/usr/bin/env python3
"""Random stress test of the proposed marked-spine large-order relaxation."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import random

import sympy as sp
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS,K2_TERMS,L2_TERMS


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_occupation_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "1A79A8F679DA504BF8CE43E98BF66E836991E24C09C25E19680B5B000C00F156"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_relaxed_random_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_RELAXED_RANDOM_RANK7_G5_FINISH"


def choose(x, k):
    out = 1.0
    for j in range(k):
        out *= x-j
    return out/math.factorial(k)


def path(x, k):
    return choose(x-k+1, k) if x-k+1 >= k else 0.0


def corner(order, rank, edge):
    return choose(order, rank) if edge else path(order, rank)


def bilinear(left,right,terms):
    return sum(coef*left[i]*right[j] for coef,i,j in terms)


def main():
    assert hashlib.sha256(INPUT.read_bytes()).hexdigest().upper() == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    names = {z: sp.Symbol(z) for z in (
        [f"a{i}" for i in range(8)] + [f"b{i}" for i in range(7)] +
        [f"c{i}" for i in range(7)] + [f"x{i}" for i in range(6)] +
        [f"y{i}" for i in range(5)]
    )}
    expression = sp.sympify(report["target"], locals=names)
    arguments = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(arguments, expression, "math")
    rng = random.Random(993_625)
    samples = 20_000
    negative_relaxed = negative_nested = 0
    negative_lower=0
    minimum_relaxed = minimum_nested = None
    minimum_lower=None; witness_lower=None
    witness_relaxed = witness_nested = None
    for index in range(samples):
        n = 19 + 500*rng.random()
        mb = n*(1+rng.random())/2
        mc = mb+(n-mb)*rng.random()
        if rng.getrandbits(1):
            mb, mc = mc, mb
        overlap = mb+mc-n
        edge = overlap*rng.random()
        omega = edge*edge*rng.random()/2
        a2 = choose(n,2)-edge
        a3 = choose(n,3)-edge*(n-2)+omega
        budget = 6*n*a3-4*n*a2
        u = [0.0,0.0,0.0,0.0,1.0]
        r3 = 3*n*a2+budget*sum(u[:4])
        r4 = 2*n*a2+budget*sum(u[:3])
        r5 = n*a2+budget*sum(u[:2])
        r6 = budget*u[0]
        a = [1,n,a2,a3,
             a3*r3/(8*n*a2),
             a3*r3*r4/(80*n*n*a2*a2),
             a3*r3*r4*r5/(960*n**3*a2**3),
             a3*r3*r4*r5*r6/(13440*n**4*a2**4)]
        mx = n*rng.random()
        my_relaxed = n*rng.random()
        my_nested = mx*rng.random()
        for b2edge in (0,1):
            for c2edge in (0,1):
                for x2edge in (0,1):
                    b=[1,mb]+[corner(mb,k,(k==2 and b2edge) or k in (5,6)) for k in range(2,7)]
                    c=[1,mc]+[corner(mc,k,(k==2 and c2edge) or k in (5,6)) for k in range(2,7)]
                    base=(bilinear(a,a,A2_TERMS)+bilinear(a,b,L2_TERMS)+bilinear(a,c,L2_TERMS)+bilinear(b,c,K2_TERMS))
                    k_pa4=-2*a[1]-2*a[2]-5*a[3]-12*c[2]
                    k_pa5=a[1]-5*a[2]+7*c[1]
                    k_pw4=-2*a[1]-2*a[2]-10*a[3]+b[1]-5*b[2]+c[1]-5*c[2]
                    neg_pw3=4*a[2]+2*a[3]+2*b[1]+2*b[2]+5*b[3]+2*c[1]+2*c[2]+5*c[3]
                    lower=base+k_pa4*choose(mb,2)+k_pa5*choose(mb,3)+k_pw4*choose(n,3)-neg_pw3*choose(n,2)
                    lrec={"sample":index,"N":n,"mB":mb,"mC":mc,"b2":b2edge,"c2":c2edge,"lower":lower,"base":base}
                    negative_lower+=lower<0
                    if minimum_lower is None or lower<minimum_lower: minimum_lower,witness_lower=lower,lrec
                    x=[1,mx,corner(mx,2,x2edge),choose(mx,3),path(mx,4),path(mx,5)]
                    for nested,my in ((False,my_relaxed),(True,my_nested)):
                        y=[1,my,choose(my,2),choose(my,3),path(my,4)]
                        values={**{f"a{k}":a[k] for k in range(8)},**{f"b{k}":b[k] for k in range(7)},**{f"c{k}":c[k] for k in range(7)},**{f"x{k}":x[k] for k in range(6)},**{f"y{k}":y[k] for k in range(5)}}
                        value=float(evaluate(*(values[str(z)] for z in arguments)))
                        rec={"sample":index,"N":n,"mB":mb,"mC":mc,"mX":mx,"mY":my,"b2":b2edge,"c2":c2edge,"x2":x2edge,"value":value}
                        if nested:
                            negative_nested += value < 0
                            if minimum_nested is None or value < minimum_nested:
                                minimum_nested,witness_nested=value,rec
                        else:
                            negative_relaxed += value < 0
                            if minimum_relaxed is None or value < minimum_relaxed:
                                minimum_relaxed,witness_relaxed=value,rec
        if index and index%20_000==0:
            print(index, negative_relaxed, negative_nested, negative_lower, minimum_lower, flush=True)
    out={"marker":MARKER,"samples":samples,"corner_evaluations_each":samples*8,"independent_XY":{"negative":negative_relaxed,"minimum":minimum_relaxed,"witness":witness_relaxed},"nested_Y_le_X":{"negative":negative_nested,"minimum":minimum_nested,"witness":witness_nested},"crude_subset_lower":{"negative":negative_lower,"minimum":minimum_lower,"witness":witness_lower},"status":"diagnostic only","source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(out,indent=2,sort_keys=True)+"\n"; OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps(out,indent=2,sort_keys=True)); print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper()); print(MARKER)


if __name__ == "__main__":
    main()
