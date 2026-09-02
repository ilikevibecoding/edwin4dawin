#!/usr/bin/env python3
"""Diagnostic matrix for the 64 fixed containment/Newton cap choices."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_fixed_cap_matrix_search_root_20260831.json"
MARKER = "SEARCH_ISO_N6_BUNDLE_G2_ADJACENT_FIXED_CAP_MATRIX_ROOT"


def path(order: int, rank: int) -> int:
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank else 0


def q_upper(previous2: float, previous1: float, rank: int) -> float:
    return ((2 * (rank - 1) * previous1 * previous1 - previous2 * previous1)
            / (2 * rank * previous2))


def branch_row(rng: random.Random, order: int, arow: list[float], branch: int):
    row = [1.0, float(order)]
    for rank in (2, 3):
        lower = path(order, rank)
        upper = arow[rank]
        if upper < lower:
            return None
        theta = rng.randrange(1001) / 1000
        row.append(lower + theta * (upper - lower))
    lower4 = path(order, 4)
    cap4 = arow[4] if branch & 1 else q_upper(row[2], row[3], 4)
    if cap4 < lower4:
        return None
    row.append(lower4 + (rng.randrange(1001) / 1000) * (cap4 - lower4))
    cap5 = arow[5] if branch & 2 else q_upper(row[3], row[4], 5)
    if cap5 < path(order, 5):
        return None
    row.append(cap5)
    cap6 = arow[6] if branch & 4 else q_upper(row[4], row[5], 6)
    if cap6 < path(order, 6):
        return None
    row.append(cap6)
    return row


def sample_a(rng: random.Random):
    n = rng.randrange(26, 501)
    mb = rng.randrange(13, n - 12)
    mc = rng.randrange(max(13, n - mb), n + 1)
    overlap = mb + mc - n
    edges = rng.randrange(overlap + 1)
    r1 = 2 * n * (n - 1) - 4 * edges
    budget = r1 - 4 * n
    s0, s1, s2, s3, s4 = [rng.randrange(1001) / 1000 for _ in range(5)]
    terminal = budget * s0
    d5 = budget * (1 - s0) * s1
    d4 = budget * (1 - s0) * (1 - s1) * s2
    d3 = budget * (1 - s0) * (1 - s1) * (1 - s2) * s3
    d2 = budget * (1 - s0) * (1 - s1) * (1 - s2) * (1 - s3) * s4
    r2 = terminal + 4*n + d5+d4+d3+d2
    r3 = terminal + 3*n + d5+d4+d3
    r4 = terminal + 2*n + d5+d4
    r5 = terminal + n + d5
    r6 = terminal
    arow = [1, n, r1/4, r1*r2/(24*n), r1*r2*r3/(192*n**2),
            r1*r2*r3*r4/(1920*n**3),
            r1*r2*r3*r4*r5/(23040*n**4),
            r1*r2*r3*r4*r5*r6/(322560*n**5)]
    if any(arow[k] < path(n, k) - 1e-8 or arow[k] > math.comb(n, k) + 1e-8
           for k in range(2, 8)):
        return None
    return n, mb, mc, arow


def main():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")
    locals_ = {str(x): x for x in (*a, *b, *c)}
    adjacent = sp.expand(sum(sp.sympify(source["pieces"][label], locals=locals_)
                             for label in ("A2", "L2_AB", "L2_AC", "K2_BC")))
    evaluate = sp.lambdify((*a, *b, *c), adjacent, "math")
    rows = []
    trials = 50000
    for bbranch in range(8):
        for cbranch in range(8):
            rng = random.Random(993626 + 8*bbranch + cbranch)
            minimum = None
            negative = 0
            completed = 0
            for _ in range(trials):
                sample = sample_a(rng)
                if sample is None:
                    continue
                _, mb, mc, arow = sample
                brow = branch_row(rng, mb, arow, bbranch)
                crow = branch_row(rng, mc, arow, cbranch)
                if brow is None or crow is None:
                    continue
                value = float(evaluate(*arow, *brow, *crow))
                completed += 1
                minimum = value if minimum is None else min(minimum, value)
                if value < -1e-7:
                    negative += 1
                    break
            row = {"B_branch": bbranch, "C_branch": cbranch,
                   "completed": completed, "negative": negative,
                   "minimum_float": minimum}
            rows.append(row)
            print(row, flush=True)
    passing = [(row["B_branch"], row["C_branch"]) for row in rows if row["negative"] == 0]
    report = {"marker": MARKER, "trials_per_branch_pair": trials,
              "passing_fixed_branch_pairs": passing, "passing_count": len(passing),
              "rows": rows,
              "status": "diagnostic float search only; no theorem asserted"}
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"passing_count": len(passing), "passing": passing}, indent=2))
    print(MARKER)


if __name__ == "__main__":
    main()
