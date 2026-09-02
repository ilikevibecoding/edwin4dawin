#!/usr/bin/env python3
"""Diagnostic motif-bound probe for the sole stable g2 origin cell.

This file deliberately makes no theorem claim.  It expands the stable
``(h,k)=(0,0)`` parent form through the exact two-mark deletion partition

    W=A, P=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D,

then substitutes the exact rank-1/rank-2 forest formulas (and the exact
rank-3 formula for A).  The report records whether the remaining high-rank
coefficients occur in a form that permits the same one-variable bounding
strategy used in the frozen g1 certificates.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g2_internal_ordinary_broom_parameters_rank5_g2_alt import (
    stable_forms,
)
from prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root import at


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_origin_motif_bounds_probe_root_20260830.json"
MARKER = "PROBE_ISO_N5_G2_INTERNAL_ORDINARY_ORIGIN_MOTIF_BOUNDS_ROOT"


def main() -> None:
    degrees, cells, rows = stable_forms()
    assert degrees == (5, 5)
    origin = cells[(0, 0)]

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    ea, qa, eb, ec, ed = sp.symbols("ea qa eb ec ed", nonnegative=True)
    low_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - ea,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * ea + qa,
        b[1]: nb,
        b[2]: nb * (nb - 1) / 2 - eb,
        c[1]: nc,
        c[2]: nc * (nc - 1) / 2 - ec,
        d[1]: nd,
        d[2]: nd * (nd - 1) / 2 - ed,
    }
    remaining = {}
    for row, order, edges, start in (
        (a, n, ea, 4),
        (b, nb, eb, 3),
        (c, nc, ec, 3),
        (d, nd, ed, 3),
    ):
        for rank in range(start, len(row)):
            remaining[row[rank]] = (str(row[1])[0], rank, order, edges)

    base_variables = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    high_variables = tuple(remaining)
    all_variables = (*base_variables, *high_variables)
    faces = []
    for epsilon in (0, 1):
        partition = {}
        for rank in range(1, 7):
            partition.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        exact = sp.Poly(
            sp.expand(origin.subs(partition).subs(low_rules)), *all_variables
        )
        histogram = {}
        sign_histogram = {}
        maximum_high_total_degree = 0
        maximum_single_high_power = 0
        examples = []
        for powers, coefficient in exact.terms():
            high_powers = powers[len(base_variables):]
            total = sum(high_powers)
            maximum_high_total_degree = max(maximum_high_total_degree, total)
            maximum_single_high_power = max(
                maximum_single_high_power, max(high_powers, default=0)
            )
            histogram[str(total)] = histogram.get(str(total), 0) + 1
            sign = "positive" if coefficient > 0 else "negative"
            key = f"{sign}_high_degree_{total}"
            sign_histogram[key] = sign_histogram.get(key, 0) + 1
            if total > 1 and len(examples) < 12:
                factors = [
                    f"{variable}^{power}"
                    for variable, power in zip(high_variables, high_powers)
                    if power
                ]
                examples.append({
                    "coefficient": str(coefficient),
                    "high_factors": factors,
                })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "expanded_monomials": len(exact.terms()),
            "negative_scalar_monomials": sum(1 for value in exact.coeffs() if value < 0),
            "maximum_high_total_degree": maximum_high_total_degree,
            "maximum_single_high_power": maximum_single_high_power,
            "high_degree_histogram": histogram,
            "sign_high_degree_histogram": sign_histogram,
            "multi_high_examples": examples,
        })

    report = {
        "marker": MARKER,
        "stable_cell": [0, 0],
        "stable_domain": "ell=8+h, h,k>=0",
        "faces": faces,
        "scope": "Diagnostic expansion only; no sign theorem is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
