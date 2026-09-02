#!/usr/bin/env python3
"""Random falsification of the adjacent g2 cone with coupled ratio rows A,B,C."""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_triple_ratio_cone_search_root_20260831.json"
MARKER = "SEARCH_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_TRIPLE_RATIO_CONE_ROOT"


def ratio_row(order, edges, mandatory, sticks, maximum):
    """Factorial-ratio row with delta2..delta_(mandatory+1)>=1."""
    r1 = 2 * order * (order - 1) - 4 * edges
    budget = r1 - mandatory * order
    if budget < 0:
        return None
    pieces = []
    remaining = budget
    product = 1.0
    for stick in sticks:
        pieces.append(budget * product * stick)
        product *= 1 - stick
    pieces.append(budget * product)
    # pieces = terminal, top slack, ..., D1.  Reconstruct R from the top.
    terminal, slacks = pieces[0], pieces[1:]
    ratios_reversed = [terminal]
    current = terminal
    for index, slack in enumerate(slacks, start=1):
        current += order + slack if index < len(slacks) else slack
        ratios_reversed.append(current)
    ratios = list(reversed(ratios_reversed))
    assert abs(ratios[0] - r1) <= max(1e-5, abs(r1) * 1e-10)
    values = [1.0, float(order)]
    q = 2.0 * order
    factorial = 1
    power2 = 2
    for index, ratio in enumerate(ratios, start=1):
        q = q * ratio / order
        rank = index + 1
        factorial *= rank
        power2 *= 2
        values.append(q / (power2 * factorial))
        if rank == maximum:
            break
    return values


def main():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")
    locals_ = {str(x): x for x in (*a, *b, *c)}
    adjacent = sp.expand(sum(sp.sympify(source["pieces"][label], locals=locals_)
                             for label in ("A2", "L2_AB", "L2_AC", "K2_BC")))
    evaluate = sp.lambdify((*a, *b, *c), adjacent, "math")
    rng = random.Random(993624)
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
        eA = rng.randrange(overlap + 1)
        eB = rng.randrange(min(mb - 1, eA) + 1)
        eC = rng.randrange(min(mc - 1, eA) + 1)
        arow = ratio_row(n, eA, 4, [rng.randrange(1001) / 1000 for _ in range(5)], 7)
        brow = ratio_row(mb, eB, 3, [rng.randrange(1001) / 1000 for _ in range(4)], 6)
        crow = ratio_row(mc, eC, 3, [rng.randrange(1001) / 1000 for _ in range(4)], 6)
        if arow is None or brow is None or crow is None:
            continue
        if any(brow[rank] > arow[rank] + 1e-8 or crow[rank] > arow[rank] + 1e-8
               for rank in range(2, 7)):
            continue
        value = float(evaluate(*arow, *brow, *crow))
        stream.update(f"{trial}|{n}|{mb}|{mc}|{eA}|{eB}|{eC}|{value:.12g};".encode())
        if minimum is None or value < minimum:
            minimum = value
            witness = {"trial": trial, "N": n, "mB": mb, "mC": mc,
                       "overlap": overlap, "eA": eA, "eB": eB, "eC": eC,
                       "value_float": value}
        if value < -1e-7:
            negative = 1
            break
        if trial and trial % 100000 == 0:
            print(trial, minimum, flush=True)
    report = {
        "marker": MARKER, "seed": 993624, "planned_trials": trials,
        "completed_trials": trial + 1, "negative": negative,
        "minimum_float": minimum, "witness": witness,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "status": "diagnostic float falsification of coupled ratio relaxation; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
