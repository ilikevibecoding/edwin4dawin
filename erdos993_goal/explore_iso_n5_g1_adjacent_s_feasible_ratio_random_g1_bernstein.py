#!/usr/bin/env python3
"""Vectorized random probe of the ratio cone with actual A path floors.

Diagnostic only.  It samples the large-large adjacent edge-budget cone,
retains ratio sequences whose induced A coefficients obey the path and
edge-incidence floors through rank six, and checks all B/C box corners.
"""

from __future__ import annotations

import argparse
import json
import math

import numpy as np


def choose(x, k):
    out = np.ones_like(x)
    for j in range(k):
        out *= x-j
    return out/math.factorial(k)


def path_row(m):
    return [np.ones_like(m), m, *[choose(m-k+1, k) for k in range(2, 6)]]


def upper_row(m):
    return [np.ones_like(m), m, *[choose(m, k) for k in range(2, 6)]]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=2_000_000)
    parser.add_argument("--batch", type=int, default=100_000)
    parser.add_argument("--sector", choices=("high", "low"), default="high")
    args = parser.parse_args()
    rng = np.random.default_rng(993)
    best = None
    feasible = 0
    for start in range(0, args.samples, args.batch):
        size = min(args.batch, args.samples-start)
        u = rng.random((8, size))
        # Heavy-tailed orders without singular endpoints.
        p = 50*u[6]/(1-u[6]+0.02)
        q = 50*u[7]/(1-u[7]+0.02)
        mb = 7+p
        mc = 7+p+q
        overlap = mb*u[0]
        n = mb+mc-overlap
        edges = overlap*u[1]
        rho1 = 2*(n-1)-4*edges/n
        budget = rho1-4
        r5 = budget*u[2]
        d4 = budget*(1-u[2])*u[3]
        d3 = budget*(1-u[2])*(1-u[3])*u[4]
        if args.sector == "high":
            d2 = budget*(1-u[2])*(1-u[3])*(1-u[4])*u[5]
            r4 = r5+1+d4
            r3 = r4+1+d3
            r2 = r3+1+d2
        else:
            bounded = u[5]
            d2 = budget*(1-u[2])*(1-u[3])*(1-u[4])
            r4 = r5+1+d4
            r3 = r4+1+d3
            r2 = r3+2-bounded+d2
        ratios = [rho1, r2, r3, r4, r5]
        qrow = [np.ones(size), 2*n]
        for ratio in ratios:
            qrow.append(qrow[-1]*ratio)
        a = [qrow[k]/(2**k*math.factorial(k)) for k in range(7)]
        okay = n >= 13
        for k in range(3, 7):
            floor = np.maximum(choose(n-k+1, k), choose(n, k)-edges*choose(n-2, k-2))
            okay &= a[k] >= floor-1e-7*np.maximum(1, floor)
        indices = np.flatnonzero(okay)
        feasible += len(indices)
        if not len(indices):
            continue
        aa = [row[indices] for row in a]
        nn, bbm, ccm = n[indices], mb[indices], mc[indices]
        bL, bU, cL, cU = path_row(bbm), upper_row(bbm), path_row(ccm), upper_row(ccm)
        h = 2*aa[1]*aa[4]-5*aa[1]*aa[5]-6*aa[1]*aa[6]+6*aa[2]*aa[3]-8*aa[2]*aa[5]+5*aa[3]**2+6*aa[3]*aa[4]
        for bmask in range(16):
            b = [bL[k] if k < 2 or not (bmask & (1 << (k-2))) else bU[k] for k in range(6)]
            lb = 2*(aa[1]*b[3]-2*aa[1]*b[4]-3*aa[1]*b[5]+2*aa[2]*b[2]+2*aa[2]*b[3]-aa[2]*b[4]+aa[3]*b[1]+2*aa[3]*b[2]+4*aa[3]*b[3]-2*aa[4]*b[1]-aa[4]*b[2]-3*aa[5]*b[1])
            for cmask in range(16):
                c = [cL[k] if k < 2 or not (cmask & (1 << (k-2))) else cU[k] for k in range(6)]
                lc = 2*(aa[1]*c[3]-2*aa[1]*c[4]-3*aa[1]*c[5]+2*aa[2]*c[2]+2*aa[2]*c[3]-aa[2]*c[4]+aa[3]*c[1]+2*aa[3]*c[2]+4*aa[3]*c[3]-2*aa[4]*c[1]-aa[4]*c[2]-3*aa[5]*c[1])
                kbc = 2*b[1]*c[2]-3*b[1]*c[3]-6*b[1]*c[4]+2*b[2]*c[1]+6*b[2]*c[2]+4*b[2]*c[3]-3*b[3]*c[1]+4*b[3]*c[2]-6*b[4]*c[1]
                values = (h+lb+lc+kbc)/nn**6
                local = int(np.argmin(values))
                value = float(values[local])
                if best is None or value < best["value"]:
                    source_index = int(indices[local])
                    best = {
                        "value": value, "sector": args.sector,
                        "bmask": bmask, "cmask": cmask,
                        "n": float(n[source_index]), "mb": float(mb[source_index]),
                        "mc": float(mc[source_index]), "edges": float(edges[source_index]),
                        "ratios": [float(row[source_index]) for row in ratios],
                        "a": [float(row[source_index]) for row in a],
                    }
        print(json.dumps({"sampled": start+size, "feasible": feasible, "best": best}), flush=True)
    print(json.dumps({"sampled": args.samples, "feasible": feasible, "best": best}, indent=2))


if __name__ == "__main__":
    main()
