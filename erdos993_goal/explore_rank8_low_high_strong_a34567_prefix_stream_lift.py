#!/usr/bin/env python3
"""Low-memory streaming check of the final a7 multinomial lift (scout)."""

from __future__ import annotations

import json
import math
from pathlib import Path

from explore_rank8_low_high_strong_aux_faces import build


NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")


def lift(monomial, coefficient, output):
    degree = monomial[1]
    fact = math.factorial(degree)
    for e5 in range(degree + 1):
        for e6 in range(degree-e5+1):
            for e7 in range(degree-e5-e6+1):
                eta = degree-e5-e6-e7
                row = list(monomial); row[1] = eta
                key = tuple(row[:4]+[e5,e6,e7]+row[4:])
                mult = fact//math.factorial(eta)//math.factorial(e5)//math.factorial(e6)//math.factorial(e7)
                output[key] = output.get(key, 0)+coefficient*mult


def main():
    upstream=json.loads(Path("rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json").read_text())
    needed,used={},{}
    for allocation in upstream["allocations"]:
        target=tuple(allocation["negative_monomial"])
        low=tuple(allocation["source_low"]["monomial"])
        high=tuple(allocation["source_high"]["monomial"])
        demand=int(allocation["demand"]);u=int(allocation["source_low"]["allocated"]);v=int(allocation["source_high"]["allocated"])
        lift(target,demand,needed);lift(low,u,used);lift(high,v,used)
    print("PREDICTED",len(needed),len(used),flush=True)
    polynomial,names=build(NAMES,"strong");assert names==NAMES
    seen_negative=set();seen_used=set();terms=negative=positive=0;minimum=None
    for monomial,coefficient in polynomial.terms():
        key=tuple(map(int,monomial));value=int(coefficient);terms+=1
        minimum=value if minimum is None else min(minimum,value)
        if value<0:
            negative+=1;assert needed.get(key)==-value;seen_negative.add(key)
        elif value>0:
            positive+=1
            if key in used:
                assert used[key]<=value;seen_used.add(key)
    print("RESULT",terms,positive,negative,minimum,
          "NEG_MATCH",len(seen_negative)==len(needed),
          "USED_MATCH",len(seen_used)==len(used),flush=True)
    assert terms==4_975_819 and negative==11_883
    assert len(seen_negative)==len(needed) and len(seen_used)==len(used)
    print("PASS_STREAM_EXACT_A34567_LIFT",flush=True)


if __name__=="__main__":main()
