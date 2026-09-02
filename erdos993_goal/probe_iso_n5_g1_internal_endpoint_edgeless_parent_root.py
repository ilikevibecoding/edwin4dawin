#!/usr/bin/env python3
"""Exact diagnostic for the internal-endpoint g1 with an edgeless parent side.

Set R=Q=(1+x)^n, corresponding after removal of the bundle support to a
marked parent v that is isolated from n common isolated vertices.  Substitute
the exact one-ended-broom child rows and scan a bounded integer box.  This is
a diagnostic subfamily only: a nonnegative scan is not an all-order theorem,
while any negative exact value is a genuine obstruction to universal g1.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import endpoint_expression


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_edgeless_parent_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_EDGELESS_PARENT_ROOT"


def choose(variable, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(
        sp.prod(variable - offset for offset in range(rank)) / sp.Integer(factorial(rank))
    )


def path_coefficient(order, rank):
    if rank < 0:
        return sp.Integer(0)
    return choose(order - rank + 1, rank)


def isolate_times_path(isolates, order, rank):
    return sp.expand(sum(
        choose(isolates, j) * path_coefficient(order, rank - j)
        for j in range(rank + 1)
    ))


def main() -> None:
    expression, rows = endpoint_expression()
    h, k, n = sp.symbols("h k n", integer=True, nonnegative=True)
    ell = 8 + h
    substitutions = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        substitutions.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
            rows["R"][rank]: choose(n, rank),
            rows["Q"][rank]: choose(n, rank),
        })
    reduced = sp.factor(sp.expand(expression.subs(substitutions)))
    polynomial = sp.Poly(sp.expand(reduced), h, k, n)
    negatives = []
    minimum = None
    checks = 0
    for hv in range(0, 17):
        for kv in range(0, 33):
            for nv in range(0, 129):
                value = int(reduced.subs({h: hv, k: kv, n: nv}))
                checks += 1
                row = {"ell": 8 + hv, "h": hv, "k": kv, "n": nv, "g1": value}
                if minimum is None or value < minimum["g1"]:
                    minimum = row
                if value < 0:
                    negatives.append(row)
                    if len(negatives) >= 20:
                        break
            if len(negatives) >= 20:
                break
        if len(negatives) >= 20:
            break

    report = {
        "marker": MARKER,
        "subfamily": "internal endpoint, R=Q=(1+x)^n, ell=8+h",
        "exact_reduced_factor": str(reduced),
        "polynomial_terms": len(polynomial.terms()),
        "polynomial_total_degree": polynomial.total_degree(),
        "scan_box": {"h": [0, 16], "k": [0, 32], "n": [0, 128]},
        "checks": checks,
        "minimum": minimum,
        "negative_count_stored": len(negatives),
        "first_negatives": negatives,
        "interpretation": (
            "A negative row is an exact obstruction to universal endpoint g1.  "
            "No negative row would be bounded evidence only."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "checks": checks,
        "minimum": minimum,
        "negative_count_stored": len(negatives),
        "first_negative": negatives[0] if negatives else None,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
