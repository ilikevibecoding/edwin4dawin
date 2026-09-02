#!/usr/bin/env python3
"""Audit real-negative-rootedness and raw consecutive reserve interlacing."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly

from analyze_wide_reserve_order_nyquist_induction import SOURCE_PATH
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import reduced_sources


OUTPUT_PATH = Path("path_isolate_p4_affine_parameter_monotonicity_wide_reserve_sturm_interlacing_20260802.json")


def isolated_roots(values):
    while values and values[-1] == 0:
        values = values[:-1]
    counts = {"degree": len(values) - 1, "negative_real": 0, "positive_real": 0, "zero_real": 0, "nonreal": 0}
    negative = []
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            if root.real < 0:
                counts["negative_real"] += multiplicity
                negative.extend([float(root.real.mid())] * multiplicity)
            elif root.real > 0:
                counts["positive_real"] += multiplicity
            else:
                counts["zero_real"] += multiplicity
        else:
            counts["nonreal"] += multiplicity
    return counts, sorted(negative)


def audit(record):
    package = record["package"]
    parity = int(record["parity"])
    coordinate = record["coordinate"]
    c_value = int(record.get("c") or 0)
    m_value, x_value, r = int(record["m"]), int(record["x"]), int(record["r"])
    _, source = reduced_sources(package, parity, coordinate)
    a = 2 * c_value + m_value + x_value - 3 if package == "group" else m_value + x_value - 3
    b = 2 * m_value + parity - 1 if package == "group" else 2 * m_value + parity - 2
    target = m_value + r + 5 + int(coordinate == "m") - (2 if package == "bottom" else 0)
    current = aggregate(source, a, b, r, target, c_value, m_value, x_value)
    previous = aggregate(source, a, b, r - 1, target - 1, c_value, m_value, x_value)
    ca, ra = isolated_roots(current)
    cb, rb = isolated_roots(previous)
    labels = sorted([(root, "A") for root in ra] + [(root, "B") for root in rb])
    word = "".join(label for _, label in labels)
    repeats = sum(word[j] == word[j - 1] for j in range(1, len(word)))
    return {
        "package": package, "parity": parity, "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value, "x": x_value, "r": r,
        "current_roots": ca, "previous_roots": cb,
        "merged_negative_root_word": word,
        "repeat_count": repeats,
        "strict_degree_one_interlacing": (
            ca["degree"] == cb["degree"] + 1
            and ca["negative_real"] == ca["degree"]
            and cb["negative_real"] == cb["degree"]
            and repeats == 0 and word.startswith("A") and word.endswith("A")
        ),
    }


def main():
    ctx.prec = 100
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    records = [audit(record) for record in source["records"]]
    report = {
        "status": "WIDE_RESERVE_STURM_INTERLACING_AUDIT",
        "case_count": len(records),
        "current_real_negative_rooted_count": sum(r["current_roots"]["negative_real"] == r["current_roots"]["degree"] for r in records),
        "previous_real_negative_rooted_count": sum(r["previous_roots"]["negative_real"] == r["previous_roots"]["degree"] for r in records),
        "strict_interlacing_count": sum(r["strict_degree_one_interlacing"] for r in records),
        "repeat_histogram": {str(k): sum(r["repeat_count"] == k for r in records) for k in sorted({r["repeat_count"] for r in records})},
        "records": records,
        "warning": "Finite certified Arb root-isolation evidence only; floating midpoints are used solely to form the merge order after disjoint isolation.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
