#!/usr/bin/env python3
"""Exact finite reconnaissance for the q=e star-forest boundary of sum 16.

If the selected transversal S meets every edge, each component is a star
centered at its selected vertex.  For center degrees d_i, the two relevant
independence polynomials are

    P(x)=prod_i ((1+x)^d_i+x),   H(x)=(1+x)^sum(d_i).

This script enumerates integer degree partitions exactly to identify the
extremal star shapes.  It is reconnaissance only, not an all-order proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from sympy.utilities.iterables import partitions


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_sum16_star_boundary_exploration_root_20260830.json"
MARKER = "EXPLORED_EXACT_ISO_N5_DISCONNECTED_SUM16_STAR_BOUNDARY_ROOT"


def multiply(left, right, degree=6):
    out = [0] * (degree + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= degree:
                out[i + j] += a * b
    return out


def star_row(degrees):
    row = [1, 0, 0, 0, 0, 0, 0]
    for degree in degrees:
        factor = [math.comb(degree, rank) if rank <= degree else 0 for rank in range(7)]
        factor[1] += 1
        row = multiply(row, factor)
    return row


def sum16(p, h):
    return (
        h[1] * p[3] - 6 * h[1] * p[5]
        + 2 * h[2] * p[2] - 2 * h[2] * p[4]
        + h[3] * p[1] + 8 * h[3] * p[3]
        - 2 * h[4] * p[2] - 6 * h[5] * p[1]
        + p[1] * p[4] - p[1] * p[5] - 6 * p[1] * p[6]
        + 3 * p[2] * p[3] - 8 * p[2] * p[5]
        + p[3] ** 2 + 6 * p[3] * p[4]
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=32)
    args = parser.parse_args()
    rows = {}
    total = 0
    global_minimum = None
    global_witness = None
    for n in range(1, args.max_order + 1):
        minimum = None
        witness = None
        checks = 0
        for edges in range(n):
            components = n - edges
            for size, multiplicities in partitions(edges, m=components, size=True):
                positive = [
                    degree
                    for degree, count in multiplicities.items()
                    for _ in range(count)
                ]
                degrees = positive + [0] * (components - size)
                p = star_row(degrees)
                h = [math.comb(edges, rank) if rank <= edges else 0 for rank in range(7)]
                doubled = sum16(p, h)
                value = Fraction(doubled, 2)
                checks += 1
                total += 1
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {"edges": edges, "center_degrees": degrees, "value": value}
                if global_minimum is None or value < global_minimum:
                    global_minimum = value
                    global_witness = {"order": n, **witness}
                assert value >= 0, (n, edges, degrees, value)
        rows[str(n)] = {"checks": checks, "minimum": str(minimum), "witness": witness}
        print(json.dumps({"order": n, "checks": checks, "minimum": str(minimum), "witness": witness}, default=str))
    report = {
        "marker": MARKER,
        "orders": [1, args.max_order],
        "star_degree_partitions": total,
        "negative": 0,
        "global_minimum": str(global_minimum),
        "global_witness": global_witness,
        "rows": rows,
        "scope": "finite q=e star-boundary reconnaissance only; no all-order theorem claim",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in ("marker", "orders", "star_degree_partitions", "negative", "global_minimum", "global_witness")}, indent=2, default=str))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
