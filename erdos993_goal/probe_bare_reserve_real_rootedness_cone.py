#!/usr/bin/env python3
"""Map real-rootedness of the bare A^a T^b reserve inside/outside its cone."""

from __future__ import annotations

import json
import random
from pathlib import Path

from flint import ctx, fmpz_poly
import sympy as sp

from analyze_group_reserve_factor_prefix_crosses import sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate


OUTPUT_PATH = Path("bare_reserve_real_rootedness_cone_probe_20260802.json")


def root_counts(values):
    while values and values[-1] == 0:
        values = values[:-1]
    degree = len(values) - 1
    negative = positive = zero = nonreal = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            if root.real < 0: negative += multiplicity
            elif root.real > 0: positive += multiplicity
            else: zero += multiplicity
        else: nonreal += multiplicity
    return {"degree": degree, "negative": negative, "positive": positive, "zero": zero, "nonreal": nonreal}


def main():
    ctx.prec = 80
    rng = random.Random(9930202)
    source = sparse(sp.Integer(1))
    records = []
    for regime in ("group_cone", "arbitrary"):
        for trial in range(250):
            if regime == "group_cone":
                m = rng.randint(1, 15)
                e = rng.randint(0, 6 * m)
                s = rng.randint(0, m)
                a, b, r, N = 3 * m + 1 + e, 2 * m + 1, m + s, 2 * m + s + 4
            else:
                a, b, r = rng.randint(0, 30), rng.randint(0, 24), rng.randint(2, 20)
                N = rng.randint(1, min(a + 2 * b + r, 32))
            values = aggregate(source, a, b, r, N, 0, 0, 0)
            counts = root_counts(values)
            records.append({"regime": regime, "a": a, "b": b, "r": r, "N": N, **counts})
    report = {
        "status": "BARE_RESERVE_REAL_ROOTEDNESS_CONE_PROBE",
        "counts": {
            regime: {
                "trials": sum(r["regime"] == regime for r in records),
                "all_negative_real": sum(r["regime"] == regime and r["negative"] == r["degree"] for r in records),
                "nonreal_failures": sum(r["regime"] == regime and r["nonreal"] > 0 for r in records),
            }
            for regime in ("group_cone", "arbitrary")
        },
        "first_failures": [r for r in records if r["negative"] != r["degree"]][:20],
        "warning": "Finite numerical root isolation only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
