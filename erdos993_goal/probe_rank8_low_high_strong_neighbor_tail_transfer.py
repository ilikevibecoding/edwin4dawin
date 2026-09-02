#!/usr/bin/env python3
"""Exact coefficient probe for transferring b_r into b_(r-1) in H_str.

For r=4 or 5, compare the actual gaps (...,x,z,0,...) with the shifted
gaps (...,x+z,0,0,...).  Only the ratio B_r changes.  The corresponding
right coefficients satisfy q_actual=q_shift+z*w, so the direct-H correction
is z*L+z^2*Q.  A coefficientwise PASS for L and Q gives an exact monotone
neighbor-transfer lemma.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from explore_rank8_low_high_strong_aux_faces import factor, convolution, stats


def build(r: int, outer: str, part: str):
    assert r in (4, 5)
    tail_names = tuple(f"b{index}" for index in range(3, r))
    outer_names = ("a0", "a2") if outer == "full" else ()
    names = (
        "h", "ta", *outer_names, "a3", "a4", "a5", "a6", "a7",
        "tb", "b0", "b1", "b2", *tail_names, "z",
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero, one, h, z = (
        context.constant(0), context.constant(1), variables["h"], variables["z"]
    )
    value = lambda name: variables.get(name, zero)
    left_gaps = [
        2*h+value("a0"), h, h+value("a2"),
        h+variables["a3"], h+variables["a4"], h+variables["a5"],
        h+variables["a6"], h+variables["a7"],
    ]
    # Shift z into the preceding gap b_(r-1); gap b_r is then zero.
    right_gaps = [2*h+variables["b0"], h+variables["b1"], h+variables["b2"]]
    for index in range(3, 8):
        value = h
        if index < r:
            value += variables[f"b{index}"]
        if index == r-1:
            value += z
        right_gaps.append(value)
    left_ratios, left = factor(variables["ta"], left_gaps, one)
    right_ratios, right = factor(variables["tb"], right_gaps, one)

    # q_actual_j-q_shift_j = z*w_j for j>=r+1.
    w = [zero] * 10
    running = right[r]
    for rank in range(r+1, 10):
        if rank > r+1:
            running *= right_ratios[rank-1]
        w[rank] = running

    selected = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(selected, right, rank, zero) for rank in (7, 8, 9)}
    s = {rank: convolution(left, w, rank, zero) for rank in (7, 8, 9)}
    t = {rank: convolution(selected, w, rank, zero) for rank in (7, 8, 9)}
    C = left_ratios[2]

    if part == "linear":
        margin1 = (
            2*c[8]*s[8]-s[7]*c[9]-c[7]*s[9]
            - h*(s[7]*c[8]+c[7]*s[8])
        )
        derivative1 = (
            2*(s[8]*v[8]+c[8]*t[8])
            - t[7]*c[9]-v[7]*s[9]-s[7]*v[9]-c[7]*t[9]
            - h*(t[7]*c[8]+v[7]*s[8]+s[7]*v[8]+c[7]*t[8])
        )
        polynomial = C*margin1+h*derivative1
    else:
        margin2 = s[8]**2-s[7]*s[9]-h*s[7]*s[8]
        derivative2 = (
            2*s[8]*t[8]-t[7]*s[9]-s[7]*t[9]
            - h*(t[7]*s[8]+s[7]*t[8])
        )
        polynomial = C*margin2+h*derivative2
    return names, polynomial


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--r", type=int, required=True, choices=(4, 5))
    parser.add_argument("--outer", choices=("none", "full"), default="none")
    parser.add_argument("--part", choices=("linear", "quadratic"), required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    names, polynomial = build(args.r, args.outer, args.part)
    payload = {
        "transfer": f"b{args.r}->b{args.r-1}",
        "outer": args.outer,
        "part": args.part,
        "variables": names,
        "statistics": stats(polynomial),
    }
    if args.output:
        temporary = args.output.with_suffix(args.output.suffix + ".tmp")
        temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        temporary.replace(args.output)
    print(payload, flush=True)


if __name__ == "__main__":
    main()
