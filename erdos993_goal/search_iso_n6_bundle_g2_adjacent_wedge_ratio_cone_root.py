#!/usr/bin/env python3
"""Deterministic falsification search for the edge/wedge rank-six g2 cone.

This replaces the overly broad free A3 ratio by the exact forest identity

  a3 = C(N,3) - e(N-2) + Omega,

and only the universal relaxation 0 <= Omega <= C(e,2).  Conditional on A3,
the lower factorial-ratio chain is relaxed by its four mandatory unit drops.
B and C are independently relaxed between the path and edgeless rows.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from pathlib import Path

import sympy as sp

from search_iso_n6_bundle_g2_adjacent_fixed_cap_matrix_root import path


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_wedge_ratio_cone_search_root_20260831.json"
MARKER = "SEARCH_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_RATIO_CONE_ROOT"


def relaxed_row(rng: random.Random, order: int) -> list[float]:
    row = [1.0, float(order)]
    for rank in range(2, 7):
        lower = float(path(order, rank))
        upper = float(math.comb(order, rank)) if order >= rank else 0.0
        theta = rng.randrange(1001) / 1000
        row.append(lower + theta * (upper - lower))
    return row


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--continuous-square-cone", action="store_true")
    parser.add_argument("--trials", type=int, default=2_000_000)
    args = parser.parse_args()
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")
    locals_ = {str(x): x for x in (*a, *b, *c)}
    expression = sp.expand(sum(
        sp.sympify(source["pieces"][label], locals=locals_)
        for label in ("A2", "L2_AB", "L2_AC", "K2_BC")
    ))
    evaluate = sp.lambdify((*a, *b, *c), expression, "math")

    rng = random.Random(993629)
    trials = args.trials
    minimum = None
    witness = None
    negative = 0
    digest = hashlib.sha256()
    for trial in range(trials):
        n = rng.randrange(14, 501)
        mb = rng.randrange(7, n - 6)
        mc = rng.randrange(max(mb, n - mb), n + 1)
        overlap = mb + mc - n
        if args.continuous_square_cone:
            edges = (rng.randrange(1001) / 1000) * overlap
            # Omega<=e^2/2 is a polynomial continuous relaxation of the exact
            # integer forest ceiling C(e,2).
            omega_max = edges * edges / 2
        else:
            edges = rng.randrange(overlap + 1)
            omega_max = math.comb(edges, 2)
        omega = (rng.randrange(1001) / 1000) * omega_max
        a2 = math.comb(n, 2) - edges
        a3 = math.comb(n, 3) - edges * (n - 2) + omega
        R1 = 4 * a2
        R2 = 6 * n * a3 / a2
        assert R2 >= 4 * n - 1e-7
        assert R2 <= R1 + 1e-7
        budget = R2 - 4 * n
        sticks = [rng.randrange(1001) / 1000 for _ in range(4)]
        s0, s1, s2, s3 = sticks
        terminal = budget * s0
        d5 = budget * (1-s0) * s1
        d4 = budget * (1-s0) * (1-s1) * s2
        d3 = budget * (1-s0) * (1-s1) * (1-s2) * s3
        d2 = budget * (1-s0) * (1-s1) * (1-s2) * (1-s3)
        R3 = terminal + 3*n + d5+d4+d3
        R4 = terminal + 2*n + d5+d4
        R5 = terminal + n + d5
        R6 = terminal
        a4 = a3 * R3 / (8*n)
        a5 = a4 * R4 / (10*n)
        a6 = a5 * R5 / (12*n)
        a7 = a6 * R6 / (14*n)
        arow = [1.0, float(n), float(a2), float(a3), a4, a5, a6, a7]
        brow = relaxed_row(rng, mb)
        crow = relaxed_row(rng, mc)
        value = float(evaluate(*arow, *brow, *crow))
        digest.update(f"{trial}|{n}|{mb}|{mc}|{edges}|{omega:.12g}|{value:.12g};".encode())
        if minimum is None or value < minimum:
            minimum = value
            witness = {
                "trial": trial, "N": n, "mB": mb, "mC": mc,
                "overlap": overlap, "edges": edges, "omega": omega,
                "sticks": sticks, "a": arow, "b": brow, "c": crow,
                "value_float": value,
            }
        if value < -1e-7:
            negative = 1
            break
    report = {
        "marker": MARKER, "planned_trials": trials,
        "completed_trials": trial + 1, "negative": negative,
        "minimum_float": minimum, "witness": witness,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "continuous_square_cone": args.continuous_square_cone,
        "cone": "exact A3 edge/wedge identity; 0<=Omega<=C(e,2); lower ratio drops; path-edgeless B,C boxes",
        "status": "deterministic floating diagnostic only; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = (HERE / "iso_n6_bundle_g2_adjacent_wedge_ratio_continuous_square_cone_search_root_20260831.json"
              if args.continuous_square_cone else OUTPUT)
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(raw, end="")
    print(MARKER)


if __name__ == "__main__":
    main()
