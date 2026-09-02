#!/usr/bin/env python3
"""Random diagnostic for the coarse two-deficit ratio cone.

This is not a proof artifact.  It uses the exact edge/component allocation,
the rank-five high/low factorial-drop parametrizations, both x2 endpoints,
and either the literal min upper bound for x3 or its simpler d*C(n-1,2)
relaxation.
"""

from __future__ import annotations

import argparse
import json
import math

import numpy as np


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=1_000_000)
    parser.add_argument("--batch", type=int, default=100_000)
    parser.add_argument("--sector", choices=("high", "low"), default="high")
    parser.add_argument("--use-min", action="store_true")
    parser.add_argument("--x3-bound", choices=("min", "path", "subset"), default="min")
    parser.add_argument("--raw-lower", action="store_true")
    parser.add_argument("--adaptive-lower", action="store_true")
    parser.add_argument("--raw-comb", action="store_true")
    parser.add_argument("--floor-a4", action="store_true")
    parser.add_argument("--coupled-x2", action="store_true")
    args = parser.parse_args()
    rng = np.random.default_rng(993)
    best = None
    for start in range(0, args.samples, args.batch):
        size = min(args.batch, args.samples-start)
        u = rng.random((8, size))
        # t has a broad heavy tail and n=13+t.
        t = 100*u[7]/(1-u[7]+0.01)
        n = 13+t
        residual = n-2
        dx = 1+residual*u[0]
        dy = 1+residual*(1-u[0])*u[1]
        slack = residual*(1-u[0])*(1-u[1])*u[2]
        edges = residual*(1-u[0])*(1-u[1])*(1-u[2])
        assert np.max(np.abs(n-dx-dy-slack-edges)) < 1e-8
        rho1 = 2*(n-1)-4*edges/n
        budget = rho1-4
        r5 = budget*u[3]
        d4 = budget*(1-u[3])*u[4]
        d3 = budget*(1-u[3])*(1-u[4])*u[5]
        if args.sector == "high":
            d2 = budget*(1-u[3])*(1-u[4])*(1-u[5])*u[6]
            r4 = r5+1+d4
            r3 = r4+1+d3
            r2 = r3+1+d2
        else:
            bounded = u[6]
            d2 = budget*(1-u[3])*(1-u[4])*(1-u[5])
            r4 = r5+1+d4
            r3 = r4+1+d3
            r2 = r3+2-bounded+d2
        ratios = (rho1,r2,r3,r4,r5)
        qrow = [np.ones(size),2*n]
        for ratio in ratios:
            qrow.append(qrow[-1]*ratio)
        a = [qrow[k]/(2**k*math.factorial(k)) for k in range(7)]
        effective_a4 = (n-3)*(n-4)*(n-5)*(n-6)/24 if args.floor_a4 else a[4]
        face = 4*a[1]*a[2]+2*a[1]*a[3]-26*a[1]*effective_a4-29*a[1]*a[5]-6*a[1]*a[6]+14*a[2]**2+30*a[2]*a[3]-8*a[2]*effective_a4-8*a[2]*a[5]+21*a[3]**2+6*a[3]*effective_a4
        c1 = 2*a[2]-a[3]-10*effective_a4-6*a[5]
        c2 = 2*(a[1]+5*a[2]+4*a[3]-effective_a4)
        c3 = -a[1]+8*a[2]+8*a[3]
        ux3 = dx*(n-1)*(n-2)/2
        uy3 = dy*(n-1)*(n-2)/2
        if args.use_min:
            # Also use B's path floor and the exact subset union ceiling:
            # x3 counts independent triples meeting the d-root set.
            path_b3 = np.maximum(0, (n-dx-2)*(n-dx-3)*(n-dx-4)/6)
            path_c3 = np.maximum(0, (n-dy-2)*(n-dy-3)*(n-dy-4)/6)
            subset_x3 = n*(n-1)*(n-2)/6-(n-dx)*(n-dx-1)*(n-dx-2)/6
            subset_y3 = n*(n-1)*(n-2)/6-(n-dy)*(n-dy-1)*(n-dy-2)/6
            path_x3 = a[3]-path_b3
            path_y3 = a[3]-path_c3
            if args.x3_bound == "path":
                ux3, uy3 = path_x3, path_y3
            elif args.x3_bound == "subset":
                ux3, uy3 = subset_x3, subset_y3
            else:
                ux3 = np.minimum(path_x3, subset_x3)
                uy3 = np.minimum(path_y3, subset_y3)
            # S is increasing in x4,x5.  Retain the subset-ceiling lower
            # bounds instead of the asymptotically lossy zero relaxation.
            bx4_ceiling = (n-dx)*(n-dx-1)*(n-dx-2)*(n-dx-3)/24
            by4_ceiling = (n-dy)*(n-dy-1)*(n-dy-2)*(n-dy-3)/24
            bx5_ceiling = (n-dx)*(n-dx-1)*(n-dx-2)*(n-dx-3)*(n-dx-4)/120
            by5_ceiling = (n-dy)*(n-dy-1)*(n-dy-2)*(n-dy-3)*(n-dy-4)/120
            if not args.raw_comb:
                bx4_ceiling, by4_ceiling = np.maximum(0, bx4_ceiling), np.maximum(0, by4_ceiling)
                bx5_ceiling, by5_ceiling = np.maximum(0, bx5_ceiling), np.maximum(0, by5_ceiling)
            lx4 = effective_a4-bx4_ceiling
            ly4 = effective_a4-by4_ceiling
            lx5 = a[5]-bx5_ceiling
            ly5 = a[5]-by5_ceiling
            if args.adaptive_lower:
                full4 = n*(n-1)*(n-2)*(n-3)/24
                full5 = n*(n-1)*(n-2)*(n-3)*(n-4)/120
                lx4 *= effective_a4/full4
                ly4 *= effective_a4/full4
                lx5 *= a[5]/full5
                ly5 *= a[5]/full5
            elif not args.raw_lower:
                lx4, ly4 = np.maximum(0, lx4), np.maximum(0, ly4)
                lx5, ly5 = np.maximum(0, lx5), np.maximum(0, ly5)
        else:
            lx4 = ly4 = lx5 = ly5 = 0
        qx = dx*n-dx*(dx+1)/2
        qy = dy*n-dy*(dy+1)/2
        x2_states = (
            [(False, False, np.zeros(size), np.zeros(size)),
             (True, False, edges, np.zeros(size)),
             (False, True, np.zeros(size), edges)]
            if args.coupled_x2 else
            [(low_x, low_y, edges if low_x else np.zeros(size), edges if low_y else np.zeros(size))
             for low_x in (False, True) for low_y in (False, True)]
        )
        for low_x, low_y, incident_x, incident_y in x2_states:
                x2 = qx-incident_x
                y2 = qy-incident_y
                tx = c1*dx+c2*x2+c3*ux3-2*(5*a[1]+a[2])*lx4-6*a[1]*lx5
                ty = c1*dy+c2*y2+c3*uy3-2*(5*a[1]+a[2])*ly4-6*a[1]*ly5
                kxy = 2*dx*y2-3*dx*uy3-6*dx*ly4+2*x2*dy+6*x2*y2+4*x2*uy3-3*ux3*dy+4*ux3*y2-6*lx4*dy
                values = (face-tx-ty+kxy)/n**6
                index = int(np.argmin(values))
                value = float(values[index])
                if best is None or value < best["value"]:
                    best = {
                        "value": value, "sector": args.sector,
                        "use_min": args.use_min, "low_x": low_x, "low_y": low_y,
                        "x3_bound": args.x3_bound, "raw_lower": args.raw_lower,
                        "adaptive_lower": args.adaptive_lower,
                        "raw_comb": args.raw_comb,
                        "floor_a4": args.floor_a4,
                        "coupled_x2": args.coupled_x2,
                        "n": float(n[index]), "edges": float(edges[index]),
                        "dx": float(dx[index]), "dy": float(dy[index]),
                        "slack": float(slack[index]),
                        "ratios": [float(row[index]) for row in ratios],
                        "a": [float(row[index]) for row in a],
                    }
        print(json.dumps({"sampled": start+size, "best": best}), flush=True)
    print(json.dumps({"sampled": args.samples, "best": best}, indent=2))


if __name__ == "__main__":
    main()
