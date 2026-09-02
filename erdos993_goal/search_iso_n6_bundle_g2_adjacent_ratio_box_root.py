#!/usr/bin/env python3
"""Deterministic random falsification of the adjacent g2 ratio/row-box cone."""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ratio_box_search_root_20260831.json"
MARKER = "SEARCH_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_RATIO_BOX_ROOT"


def corner_row(order, mask, cap):
    row = [1, order]
    for rank in range(2, 7):
        lower_top = order - rank + 1
        lower = math.comb(lower_top, rank) if lower_top >= rank else 0
        if rank <= 3:
            upper = cap[rank]
        else:
            previous = row[rank - 1]
            two_back = row[rank - 2]
            q_upper = ((2 * (rank - 1) * previous * previous - two_back * previous)
                       / (2 * rank * two_back))
            upper = min(cap[rank], q_upper)
        row.append(upper if mask & (1 << (rank - 2)) else lower)
    return row


def main():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")
    locals_ = {str(x): x for x in (*a, *b, *c)}
    adjacent = sp.expand(sum(
        sp.sympify(source["pieces"][label], locals=locals_)
        for label in ("A2", "L2_AB", "L2_AC", "K2_BC")
    ))
    variables = (*a, *b, *c)
    evaluate = sp.lambdify(variables, adjacent, "math")

    rng = random.Random(993623)
    trials = 500000
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
        assert budget >= 0
        sticks = [rng.randrange(1001) / 1000 for _ in range(5)]
        s0, s1, s2, s3, s4 = sticks
        T = budget * s0
        D5 = budget * (1 - s0) * s1
        D4 = budget * (1 - s0) * (1 - s1) * s2
        D3 = budget * (1 - s0) * (1 - s1) * (1 - s2) * s3
        D2 = budget * (1 - s0) * (1 - s1) * (1 - s2) * (1 - s3) * s4
        R = (
            R1,
            T + 4 * n + D5 + D4 + D3 + D2,
            T + 3 * n + D5 + D4 + D3,
            T + 2 * n + D5 + D4,
            T + n + D5,
            T,
        )
        R1v, R2, R3, R4, R5, R6 = R
        arow = [
            1, n, R1v / 4,
            R1v * R2 / (24 * n),
            R1v * R2 * R3 / (192 * n**2),
            R1v * R2 * R3 * R4 / (1920 * n**3),
            R1v * R2 * R3 * R4 * R5 / (23040 * n**4),
            R1v * R2 * R3 * R4 * R5 * R6 / (322560 * n**5),
        ]
        if any(
            arow[rank] < (math.comb(n - rank + 1, rank) if n - rank + 1 >= rank else 0) - 1e-8
            or arow[rank] > math.comb(n, rank) + 1e-8
            for rank in range(2, 8)
        ):
            continue
        bmask = rng.randrange(32)
        cmask = rng.randrange(32)
        value = float(evaluate(*arow, *corner_row(mb, bmask, arow), *corner_row(mc, cmask, arow)))
        stream.update(f"{trial}|{n}|{mb}|{mc}|{edges}|{bmask}|{cmask}|{value:.12g};".encode())
        if minimum is None or value < minimum:
            minimum = value
            witness = {
                "trial": trial, "N": n, "mB": mb, "mC": mc,
                "overlap": overlap, "edges": edges,
                "sticks": sticks, "B_mask": bmask, "C_mask": cmask,
                "value_float": value,
            }
        if value < -1e-7:
            negative = 1
            break
        if trial and trial % 100000 == 0:
            print(trial, minimum, flush=True)
    report = {
        "marker": MARKER, "seed": 993623, "planned_trials": trials,
        "completed_trials": trial + 1, "negative": negative,
        "minimum_float": minimum, "witness": witness,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "status": "diagnostic float falsification of an exact relaxation; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
