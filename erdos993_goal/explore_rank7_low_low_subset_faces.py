#!/usr/bin/env python3
"""Direct exact low/low faces with an arbitrary subset of off variables."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from pathlib import Path

from flint import fmpz_mpoly_ctx

from explore_rank7_three_halves_convolution import (
    factorial_convolution,
    low_factor,
    rank7_margin,
)


ROOT = Path(__file__).resolve().parent
OFF = ("a", "a0", "a2", "b2", "b3", "b4", "b5", "b6")
BASE = ("b", "c", "ta", "a3", "a4", "a5", "a6", "tb", "b0")
REPORT = ROOT / "rank7_low_low_one_variable_faces_exact_20260816.json"


def low_low_subset_face(extras: Iterable[str]):
    extras = tuple(extras)
    if len(set(extras)) != len(extras) or any(name not in OFF for name in extras):
        raise ValueError(extras)
    names = BASE + extras
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)

    def value(name: str):
        return variables.get(name, zero)

    h = variables["b"] + variables["c"] + value("a")
    left = low_factor(
        h,
        value("a"),
        variables["ta"],
        (value("a0"), value("a2"), variables["a3"], variables["a4"], variables["a5"], variables["a6"]),
        one,
    )
    right = low_factor(
        h,
        value("a") + variables["b"],
        variables["tb"],
        (variables["b0"], value("b2"), value("b3"), value("b4"), value("b5"), value("b6")),
        one,
    )
    product = factorial_convolution(left, right, zero)
    return rank7_margin(product, h), context


def statistics(poly) -> dict:
    values = [int(coefficient) for _, coefficient in poly.terms()]
    return {
        "terms": len(values),
        "negative": sum(value < 0 for value in values),
        "minimum": min(values) if values else None,
        "maximum": max(values) if values else None,
    }


def main() -> int:
    base, _ = low_low_subset_face(())
    base_stats = statistics(base)
    rows = []
    for extra in OFF:
        face, context = low_low_subset_face((extra,))
        stats = statistics(face)
        index = tuple(str(value) for value in context.gens()).index(extra)
        new_negative = sum(
            coefficient < 0 and monomial[index] > 0
            for monomial, coefficient in face.terms()
        )
        row = {"extra": extra, **stats, "new_negative": new_negative}
        print(row, flush=True)
        rows.append(row)
    result = {
        "status": "PASS_EXACT_RANK7_LOW_LOW_ONE_VARIABLE_FACE_CLASSIFICATION",
        "base_face": base_stats,
        "rows": rows,
        "conclusion": "exact classification only; any enlarged exceptional face must be certified separately",
    }
    REPORT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
