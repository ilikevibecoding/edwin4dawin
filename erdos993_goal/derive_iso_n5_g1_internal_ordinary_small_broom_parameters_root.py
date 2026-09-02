#!/usr/bin/env python3
"""Exact fixed-length Newton reduction for the seven small ordinary brooms.

The stable ``ell=8+h`` chart does not cover ``ell=1,...,7`` because the
short path rows truncate.  For each of those seven lengths, substitute the
literal one-ended-broom rows into internal-spine ordinary-parent ``g1`` and
expand exactly in the Newton basis ``binom(k,j)`` of the collision-leaf
count.  The output is a finite inventory of parent-side forms; no sign is
asserted here.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    choose,
    form_summary,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_broom_parameters_exact_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_BROOM_PARAMETERS_ROOT"
LENGTHS = tuple(range(1, 8))

DEPENDENCIES = {
    "derive_iso_n5_g1_internal_endpoint_broom_factor_root.py":
        "89324C9B5C2E80B4E365B208FB896F0DB7E57579CC3381EEA8798E6A34EDA4F0",
    "derive_iso_n5_g1_internal_endpoint_broom_parameters_root.py":
        "2582BFF4BBA40A2B11D27AB5A3256D291271EB45BF61827D60EC5ADB220B2879",
    "derive_iso_n5_g1_internal_ordinary_broom_factor_root.py":
        "183528806BCBEBC38C9C2D1830D86CE83BD5567FD4DA333CFFAEA8FE406C5605",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def path_row(order, maximum=6):
    """Literal I(P_order), with P_0=P_-1 empty and P_-2 the zero row."""
    if order == -2:
        return (sp.Integer(0),) * (maximum + 1)
    if order <= 0:
        return (sp.Integer(1),) + (sp.Integer(0),) * maximum
    return tuple(
        sp.Integer(comb(order - rank + 1, rank))
        if order - rank + 1 >= rank else sp.Integer(0)
        for rank in range(maximum + 1)
    )


def add(left, right, maximum=6):
    return tuple(
        sp.expand(at(left, rank) + at(right, rank))
        for rank in range(maximum + 1)
    )


def shift(row, amount=1, maximum=6):
    return tuple(at(row, rank - amount) for rank in range(maximum + 1))


def binomial_row(number, maximum=6):
    return tuple(choose(number, rank) for rank in range(maximum + 1))


def child_rows(length, collisions):
    leaves = binomial_row(collisions)
    p1 = path_row(length - 1)
    p2 = path_row(length - 2)
    p3 = path_row(length - 3)
    xrow = add(convolve(leaves, p1), shift(p2))
    urow = convolve(leaves, p1)
    yrow = add(convolve(leaves, p2), shift(p3))
    zrow = convolve(leaves, p2)
    return xrow, urow, yrow, zrow


def main() -> None:
    assert {name: sha256(HERE / name) for name in DEPENDENCIES} == DEPENDENCIES
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)

    length_reports = []
    form_stream_parts = []
    total_forms = 0
    total_negative = 0
    for length in LENGTHS:
        xrow, urow, yrow, zrow = child_rows(length, k)
        substitutions = {}
        for rank in range(1, 7):
            substitutions.update({
                rows["X"][rank]: xrow[rank],
                rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank],
                rows["Z"][rank]: zrow[rank],
            })
        reduced = sp.expand(expression.subs(substitutions))
        degrees, coefficients = tensor_binomial(reduced, (k,))
        forms = []
        for index, form in sorted(coefficients.items()):
            if form == 0:
                continue
            summary = form_summary(form)
            row = {"k_index": index[0], **summary}
            forms.append(row)
            form_stream_parts.append(
                f"{length},{index[0]}:{summary['ordered_term_stream_sha256']};"
            )
        negative = sum(row["negative_scalar_coefficients"] > 0 for row in forms)
        total_forms += len(forms)
        total_negative += negative
        length_reports.append({
            "ell": length,
            "degree_k": degrees[0],
            "coefficient_cells": len(coefficients),
            "nonzero_parent_forms": len(forms),
            "forms_with_negative_scalars": negative,
            "forms": forms,
        })

    report = {
        "marker": MARKER,
        "lengths": list(LENGTHS),
        "collision_leaf_domain": "integer k>=0",
        "parent_rows": "(E,P,V,W)=(I(F),I(F-p),I(F-v),I(F-{p,v}))",
        "path_boundary_convention": "P_0=P_-1=empty and P_-2 is the zero row",
        "total_nonzero_parent_forms": total_forms,
        "forms_with_negative_scalars": total_negative,
        "form_stream_sha256": hashlib.sha256(
            "".join(form_stream_parts).encode()
        ).hexdigest().upper(),
        "per_length": length_reports,
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact finite parent-form inventory; signs remain open",
        "scope": (
            "Internal-spine ordinary-parent g1 for ell=1..7 and every integer "
            "k>=0.  This reduction alone proves no sign, no other mode, and "
            "not Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "total_nonzero_parent_forms": total_forms,
        "forms_with_negative_scalars": total_negative,
        "per_length": [
            {
                "ell": row["ell"],
                "degree_k": row["degree_k"],
                "nonzero_parent_forms": row["nonzero_parent_forms"],
                "forms_with_negative_scalars": row["forms_with_negative_scalars"],
            }
            for row in length_reports
        ],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
