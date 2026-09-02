#!/usr/bin/env python3
"""Random test of a rectangular b2,b3,b4 box with A caps at ranks 5,6."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import sympy as sp

from search_iso_n6_bundle_g2_adjacent_fixed_cap_matrix_root import path, sample_a


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_edgeless_b4_box_search_root_20260831.json"
MARKER = "SEARCH_ISO_N6_BUNDLE_G2_ADJACENT_EDGELESS_B4_BOX_ROOT"


def row(rng, order, arow):
    out = [1.0, float(order)]
    for rank in (2, 3):
        lower = path(order, rank)
        upper = arow[rank]
        out.append(lower + (rng.randrange(1001) / 1000) * (upper - lower))
    lower4 = path(order, 4)
    upper4 = math.comb(order, 4)
    out.append(lower4 + (rng.randrange(1001) / 1000) * (upper4 - lower4))
    out.extend((arow[5], arow[6]))
    return out


def main():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")
    locals_ = {str(x): x for x in (*a, *b, *c)}
    expression = sp.expand(sum(sp.sympify(source["pieces"][label], locals=locals_)
                               for label in ("A2", "L2_AB", "L2_AC", "K2_BC")))
    evaluate = sp.lambdify((*a, *b, *c), expression, "math")
    rng = random.Random(993627)
    trials = 1000000
    minimum = None
    witness = None
    negative = 0
    completed = 0
    for trial in range(trials):
        sample = sample_a(rng)
        if sample is None:
            continue
        n, mb, mc, arow = sample
        brow = row(rng, mb, arow)
        crow = row(rng, mc, arow)
        value = float(evaluate(*arow, *brow, *crow))
        completed += 1
        if minimum is None or value < minimum:
            minimum = value
            witness = {"trial": trial, "N": n, "mB": mb, "mC": mc,
                       "value_float": value}
        if value < -1e-7:
            negative = 1
            break
    report = {"marker": MARKER, "planned_trials": trials, "completed": completed,
              "negative": negative, "minimum_float": minimum, "witness": witness,
              "status": "diagnostic float relaxation search; no theorem asserted"}
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(raw, end="")
    print(MARKER)


if __name__ == "__main__":
    main()
