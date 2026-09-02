#!/usr/bin/env python3
"""Numerically probe coordinate curvature on the exact rank-7 defect cone."""

from __future__ import annotations

import random
import argparse

import sympy as sp

from verify_rank7_terminal_broom_middle_differences import abstract_numerator


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=range(3, 7))
    args = parser.parse_args()
    rng = random.Random(9931721)
    ranks = [args.rank] if args.rank is not None else range(3, 7)
    for rank in ranks:
        numerator, denominator, variables = abstract_numerator(rank)
        funcs = [
            sp.lambdify(variables, sp.diff(numerator, variable, 2), "math")
            for variable in variables[3:]
        ]
        extrema = [[float("inf"), float("-inf"), None, None] for _ in funcs]
        for _ in range(2000):
            n = rng.randint(39, 1000)
            w = rng.uniform(3/(n-3), 3*(n-1)/((n-3)*(n-4)))
            x = rng.uniform(8*w/(6-w), 4*w/(3*(1-w)))
            u = rng.uniform((2+x)/10, 1559/3575)
            x5 = x/(1-u)
            v = rng.uniform((2+x5)/12, 1/6+x5/2)
            x6 = x5/(1-v)
            z = rng.uniform((2+x6)/14, 1/7+x6/2)
            s = rng.uniform(0.5, 1)
            d = rng.uniform(0.5, 1)
            point = (n,w,x,u,v,z,s,d)
            for j, func in enumerate(funcs):
                value = float(func(*point))
                if value < extrema[j][0]: extrema[j][0],extrema[j][2]=value,point
                if value > extrema[j][1]: extrema[j][1],extrema[j][3]=value,point
        print("rank", rank)
        for variable, values in zip(variables[3:], extrema):
            print(" curvature", variable, "min", values[0], "max", values[1])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
