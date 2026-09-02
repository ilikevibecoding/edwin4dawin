#!/usr/bin/env python3
"""Certified slice-root audit for the homogeneous ternary reserve candidate."""

from __future__ import annotations

import json
import math
from pathlib import Path

from flint import ctx, fmpz_poly
import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A as Ae, T as Te, V, q, w, z
from probe_path_isolate_p4_affine_target_rows import A, T, expression_dict, multiply, power


OUTPUT_PATH = Path("group_reserve_homogeneous_slice_interlacing_certificate_20260802.json")


def negative_roots(values):
    roots = []
    nonnegative = nonreal = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            if root.real < 0:
                roots.extend([float(root.real.mid())] * multiplicity)
            else:
                nonnegative += multiplicity
        else:
            nonreal += multiplicity
    return sorted(roots), nonnegative, nonreal


def main():
    ctx.prec = 100
    F = sp.expand(2 * Ae * (Ae - 1) + (V + 1) ** 2)
    G = sp.expand(Ae * Te**2 - q)
    sources = {
        "bare": sp.Integer(1),
        "smoother": sp.expand((z + w) * (z**2 + w**2)),
        "full": sp.expand((z + w) * (z**2 + w**2) * F * G**2),
    }
    records = []
    for m, e, s_value in [(2, 0, 2), (4, 0, 4), (6, 0, 6), (6, 12, 3)]:
        a, b, r, N = 3 * m + 1 + e, 2 * m + 1, m + s_value, 2 * m + s_value + 4
        for stage, source_expression in sources.items():
            K = multiply(
                multiply(expression_dict(source_expression, N), power(A, a, N), N),
                power(T, b, N), N,
            )
            slices = []
            root_lists = []
            for j in range(r + 1):
                values = [
                    math.comb(r, j) * math.comb(r - j, h) * K.get((N - h, N - j), 0)
                    for h in range(r - j + 1)
                ]
                roots, nonnegative, nonreal = negative_roots(values)
                root_lists.append(roots)
                slices.append({
                    "j": j, "degree": len(values) - 1,
                    "negative_real_count": len(roots),
                    "nonnegative_real_count": nonnegative,
                    "nonreal_count": nonreal,
                })
            pairs = []
            for j in range(r):
                word = "".join(label for _, label in sorted(
                    [(root, "A") for root in root_lists[j]]
                    + [(root, "B") for root in root_lists[j + 1]]
                ))
                pairs.append({
                    "j": j, "word": word,
                    "repeat_count": sum(word[k] == word[k - 1] for k in range(1, len(word))),
                })
            records.append({"m": m, "e": e, "s": s_value, "r": r, "stage": stage, "slices": slices, "pairs": pairs})
    all_rooted = all(item["negative_real_count"] == item["degree"] for record in records for item in record["slices"])
    all_interlace = all(item["repeat_count"] == 0 for record in records for item in record["pairs"])
    report = {
        "status": "PASS_HOMOGENEOUS_SLICE_INTERLACING_CERTIFICATE" if all_rooted and all_interlace else "HOMOGENEOUS_SLICE_INTERLACING_FAILURE",
        "case_count": len(records),
        "all_slices_negative_real_rooted": all_rooted,
        "all_adjacent_slices_strictly_interlace": all_interlace,
        "records": records,
        "warning": "Finite Arb-certified slice evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
