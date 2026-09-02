#!/usr/bin/env python3
"""Random falsification of 64 nested containment/Q cap branches for adjacent g2."""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_nested_q_branches_search_root_20260831.json"
MARKER = "SEARCH_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_NESTED_Q_BRANCHES_ROOT"


def path(order, rank):
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank else 0


def q_upper(previous2, previous1, rank):
    return ((2 * (rank - 1) * previous1 * previous1 - previous2 * previous1)
            / (2 * rank * previous2))


def branch_row(rng, order, arow, branch):
    row = [1.0, float(order)]
    for rank in (2, 3):
        lower = path(order, rank)
        upper = arow[rank]
        if upper < lower:
            return None
        theta = rng.randrange(1001) / 1000
        row.append(lower + theta * (upper - lower))
    lower4 = path(order, 4)
    containment4 = arow[4]
    newton4 = q_upper(row[2], row[3], 4)
    choose_containment4 = bool(branch & 1)
    if choose_containment4 != (containment4 <= newton4):
        return None
    cap4 = containment4 if choose_containment4 else newton4
    if cap4 < lower4:
        return None
    theta4 = rng.randrange(1001) / 1000
    row.append(lower4 + theta4 * (cap4 - lower4))
    containment5 = arow[5]
    newton5 = q_upper(row[3], row[4], 5)
    choose_containment5 = bool(branch & 2)
    if choose_containment5 != (containment5 <= newton5):
        return None
    cap5 = containment5 if choose_containment5 else newton5
    if cap5 < path(order, 5):
        return None
    row.append(cap5)
    containment6 = arow[6]
    newton6 = q_upper(row[4], row[5], 6)
    choose_containment6 = bool(branch & 4)
    if choose_containment6 != (containment6 <= newton6):
        return None
    cap6 = containment6 if choose_containment6 else newton6
    if cap6 < path(order, 6):
        return None
    row.append(cap6)
    return row


def main():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")
    locals_ = {str(x): x for x in (*a, *b, *c)}
    adjacent = sp.expand(sum(sp.sympify(source["pieces"][label], locals=locals_)
                             for label in ("A2", "L2_AB", "L2_AC", "K2_BC")))
    evaluate = sp.lambdify((*a, *b, *c), adjacent, "math")
    rng = random.Random(993625)
    trials = 1000000
    minimum = None
    witness = None
    negative = 0
    stream = hashlib.sha256()
    for trial in range(trials):
        n = rng.randrange(26, 501)
        mb = rng.randrange(13, n - 12)
        mc = rng.randrange(max(13, n - mb), n + 1)
        overlap = mb + mc - n
        edges = rng.randrange(overlap + 1)
        R1 = 2 * n * (n - 1) - 4 * edges
        budget = R1 - 4 * n
        sticks = [rng.randrange(1001) / 1000 for _ in range(5)]
        s0, s1, s2, s3, s4 = sticks
        T = budget * s0
        D5 = budget * (1 - s0) * s1
        D4 = budget * (1 - s0) * (1 - s1) * s2
        D3 = budget * (1 - s0) * (1 - s1) * (1 - s2) * s3
        D2 = budget * (1 - s0) * (1 - s1) * (1 - s2) * (1 - s3) * s4
        R = (R1, T + 4*n + D5+D4+D3+D2, T + 3*n + D5+D4+D3,
             T + 2*n + D5+D4, T + n + D5, T)
        r1, r2, r3, r4, r5, r6 = R
        arow = [1, n, r1/4, r1*r2/(24*n), r1*r2*r3/(192*n**2),
                r1*r2*r3*r4/(1920*n**3), r1*r2*r3*r4*r5/(23040*n**4),
                r1*r2*r3*r4*r5*r6/(322560*n**5)]
        if any(arow[k] < path(n, k) - 1e-8 or arow[k] > math.comb(n, k) + 1e-8
               for k in range(2, 8)):
            continue
        bbranch = rng.randrange(8)
        cbranch = rng.randrange(8)
        brow = branch_row(rng, mb, arow, bbranch)
        crow = branch_row(rng, mc, arow, cbranch)
        if brow is None or crow is None:
            continue
        value = float(evaluate(*arow, *brow, *crow))
        stream.update(f"{trial}|{n}|{mb}|{mc}|{edges}|{bbranch}|{cbranch}|{value:.12g};".encode())
        if minimum is None or value < minimum:
            minimum = value
            witness = {"trial": trial, "N": n, "mB": mb, "mC": mc,
                       "overlap": overlap, "edges": edges,
                       "B_branch": bbranch, "C_branch": cbranch,
                       "value_float": value}
        if value < -1e-7:
            negative = 1
            break
        if trial and trial % 200000 == 0:
            print(trial, minimum, flush=True)
    report = {
        "marker": MARKER, "seed": 993625, "planned_trials": trials,
        "completed_trials": trial + 1, "negative": negative,
        "minimum_float": minimum, "witness": witness,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "status": "diagnostic float falsification of 64 broad cap branches; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
