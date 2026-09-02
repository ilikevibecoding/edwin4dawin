#!/usr/bin/env python3
"""Random test of the A3-ceiling ratio cone for adjacent rank-six g2."""

from __future__ import annotations

import json
import math
import random
import argparse
from pathlib import Path

import sympy as sp

from search_iso_n6_bundle_g2_adjacent_fixed_cap_matrix_root import path, q_upper


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_a3_ceiling_cone_search_root_20260831.json"
MARKER = "SEARCH_ISO_N6_BUNDLE_G2_ADJACENT_A3_CEILING_CONE_ROOT"


def induced_row(rng, order, arow, full_induced_caps=False, drop_q3=False,
                drop_containment=False, drop_edgeless=False):
    row = [1.0, float(order)]
    for rank in (2, 3):
        lower = path(order, rank)
        upper = arow[rank]
        if full_induced_caps:
            candidates = []
            if not drop_containment:
                candidates.append(arow[rank])
            if not drop_edgeless:
                candidates.append(float(math.comb(order, rank)))
            upper = min(candidates) if candidates else max(arow[rank], float(math.comb(order, rank)))
        if upper < lower:
            return None
        row.append(lower + (rng.randrange(1001)/1000)*(upper-lower))
    lower4 = path(order, 4)
    upper4 = q_upper(row[2], row[3], 4)
    if full_induced_caps:
        candidates = [] if drop_q3 else [upper4]
        if not drop_containment:
            candidates.append(arow[4])
        if not drop_edgeless:
            candidates.append(float(math.comb(order, 4)))
        upper4 = min(candidates) if candidates else max(arow[4], float(math.comb(order, 4)))
    if upper4 < lower4:
        return None
    row.append(lower4 + (rng.randrange(1001)/1000)*(upper4-lower4))
    if full_induced_caps:
        # g2 is decreasing in ranks five and six of either induced row, so
        # their largest universally valid containment/edgeless ceilings give
        # the sharpest lower-bound diagnostic without assuming higher Newton
        # inequalities.
        def cap(rank):
            candidates = []
            if not drop_containment:
                candidates.append(arow[rank])
            if not drop_edgeless:
                candidates.append(float(math.comb(order, rank)))
            return min(candidates) if candidates else max(arow[rank], float(math.comb(order, rank)))
        row.extend((cap(5), cap(6)))
    else:
        row.extend((arow[5], arow[6]))
    return row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ceiling-through", type=int, choices=range(3, 8), default=3)
    parser.add_argument("--path-through", type=int, choices=range(1, 8), default=7)
    parser.add_argument("--full-induced-caps", action="store_true")
    parser.add_argument("--drop-q3", action="store_true")
    parser.add_argument("--drop-containment", action="store_true")
    parser.add_argument("--drop-edgeless", action="store_true")
    parser.add_argument("--skip-a-filter", action="store_true")
    parser.add_argument("--trials", type=int, default=1000000)
    args = parser.parse_args()
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")
    locals_ = {str(x): x for x in (*a, *b, *c)}
    expression = sp.expand(sum(sp.sympify(source["pieces"][label], locals=locals_)
                               for label in ("A2", "L2_AB", "L2_AC", "K2_BC")))
    evaluate = sp.lambdify((*a, *b, *c), expression, "math")
    rng = random.Random(993628)
    trials = args.trials
    completed = 0
    minimum = None
    witness = None
    negative = 0
    for trial in range(trials):
        n = rng.randrange(14, 501)
        mb = rng.randrange(7, n-6)
        mc = rng.randrange(max(mb, n-mb), n+1)
        overlap = mb+mc-n
        edges = rng.randrange(overlap+1)
        r1 = 2*n*(n-1)-4*edges
        upper_r2 = 24*n*math.comb(n, 3)/r1
        if upper_r2 < 4*n:
            continue
        r2 = 4*n + (rng.randrange(1001)/1000)*(upper_r2-4*n)
        if r2 > r1 + 1e-8:
            continue
        budget = r2-4*n
        sticks = [rng.randrange(1001)/1000 for _ in range(4)]
        u0, u1, u2, u3 = sticks
        terminal = budget*u0
        d5 = budget*(1-u0)*u1
        d4 = budget*(1-u0)*(1-u1)*u2
        d3 = budget*(1-u0)*(1-u1)*(1-u2)*u3
        d2 = budget*(1-u0)*(1-u1)*(1-u2)*(1-u3)
        r3 = terminal+3*n+d5+d4+d3
        r4 = terminal+2*n+d5+d4
        r5 = terminal+n+d5
        r6 = terminal
        arow = [1, n, r1/4, r1*r2/(24*n),
                r1*r2*r3/(192*n**2),
                r1*r2*r3*r4/(1920*n**3),
                r1*r2*r3*r4*r5/(23040*n**4),
                r1*r2*r3*r4*r5*r6/(322560*n**5)]
        if not args.skip_a_filter:
            if any(arow[rank] > math.comb(n, rank)+1e-8
                   for rank in range(4, args.ceiling_through+1)):
                continue
            if any(arow[rank] < path(n, rank)-1e-8
                   for rank in range(2, args.path_through + 1)):
                continue
        brow = induced_row(rng, mb, arow, args.full_induced_caps, args.drop_q3,
                           args.drop_containment, args.drop_edgeless)
        crow = induced_row(rng, mc, arow, args.full_induced_caps, args.drop_q3,
                           args.drop_containment, args.drop_edgeless)
        if brow is None or crow is None:
            continue
        value = float(evaluate(*arow, *brow, *crow))
        completed += 1
        if minimum is None or value < minimum:
            minimum = value
            witness = {"trial": trial, "N": n, "mB": mb, "mC": mc,
                       "overlap": overlap, "edges": edges, "value_float": value,
                       "r": [r1, r2, r3, r4, r5, r6],
                       "sticks": sticks, "a": arow, "b": brow, "c": crow}
        if value < -1e-7:
            negative = 1
            break
    report = {"marker": MARKER, "ceiling_through": args.ceiling_through,
              "path_through": args.path_through,
              "full_induced_caps": args.full_induced_caps,
              "drop_q3": args.drop_q3,
              "drop_containment": args.drop_containment,
              "drop_edgeless": args.drop_edgeless,
              "skip_a_filter": args.skip_a_filter,
              "planned_trials": trials, "completed": completed,
              "negative": negative, "minimum_float": minimum, "witness": witness,
              "status": "diagnostic float cone search; no theorem asserted"}
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    suffix = "_full_induced_caps" if args.full_induced_caps else ""
    if args.drop_q3:
        suffix += "_drop_q3"
    if args.drop_containment:
        suffix += "_drop_containment"
    if args.drop_edgeless:
        suffix += "_drop_edgeless"
    if args.skip_a_filter:
        suffix += "_skip_a_filter"
    output = HERE / f"iso_n6_bundle_g2_adjacent_a3_ceiling_through{args.ceiling_through}_paththrough{args.path_through}{suffix}_cone_search_root_20260831.json"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(raw, end="")
    print(MARKER)


if __name__ == "__main__":
    main()
