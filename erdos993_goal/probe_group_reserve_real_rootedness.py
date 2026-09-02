#!/usr/bin/env python3
"""Exact/numeric probe of real negative roots and interlacing for group reserves."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly
import sympy as sp

from analyze_group_reserve_factor_prefix_crosses import sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, q, w, z
from probe_exceptional_target_neighbor_reserve_crossings import multiply_binomial
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate


OUTPUT_PATH = Path("group_reserve_real_rootedness_probe_20260802.json")


def root_intervals(values):
    roots = fmpz_poly(values).complex_roots()
    result = []
    counts = {"negative_real": 0, "positive_real": 0, "nonreal": 0}
    for root, multiplicity in roots:
        if root.imag.is_zero():
            sign = "negative_real" if root.real < 0 else "positive_real"
            counts[sign] += multiplicity
            result.extend([float(root.real.mid())] * multiplicity)
        else:
            counts["nonreal"] += multiplicity
    return counts, sorted(result)


def alternation(a, b):
    # Diagnostic only: count sign changes in labels of sorted negative roots.
    labels = sorted([(x, "A") for x in a] + [(x, "B") for x in b])
    repeats = sum(labels[i][1] == labels[i - 1][1] for i in range(1, len(labels)))
    return repeats, "".join(label for _, label in labels)


def main():
    ctx.prec = 100
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    expressions = {
        "bare": sp.Integer(1),
        "smoother": sp.expand((z + w) * (z**2 + w**2)),
        "full": sp.expand((z + w) * (z**2 + w**2) * F * G**2),
    }
    records = []
    for m, x, r in [(2, 4, 4), (3, 6, 6), (4, 8, 8), (6, 12, 12), (8, 16, 16), (12, 24, 24)]:
        for stage, expression in expressions.items():
            source = sparse(expression)
            a, b, N = m + x + 1, 2 * m + 1, m + r + 4
            current = aggregate(source, a, b, r, N, 0, 0, 0)
            raw_previous = aggregate(source, a, b, r - 1, N - 1, 0, 0, 0)
            previous = multiply_binomial(raw_previous, 1)
            ca, ra = root_intervals(current)
            cb, rb = root_intervals(previous)
            cc, rc = root_intervals(raw_previous)
            repeats, word = alternation(ra, rb)
            raw_repeats, raw_word = alternation(ra, rc)
            records.append({
                "m": m, "x": x, "r": r, "stage": stage,
                "current": ca, "reference": cb,
                "raw_previous": cc,
                "root_label_repeat_count": repeats,
                "root_label_word": word,
                "raw_previous_root_label_repeat_count": raw_repeats,
                "raw_previous_root_label_word": raw_word,
            })
    report = {"status": "GROUP_RESERVE_REAL_ROOTEDNESS_PROBE", "records": records, "warning": "Finite numerical root isolation only."}
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
