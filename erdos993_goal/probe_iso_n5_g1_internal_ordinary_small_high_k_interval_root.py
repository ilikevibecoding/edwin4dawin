#!/usr/bin/env python3
"""Test the large-broom interval payment on small-broom k=5,6 rows."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent import (
    H,
    P as ROOTED_P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_high_k_interval_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_HIGH_K_INTERVAL_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def add_isolates(row, amount, maximum):
    return tuple(sp.expand(sum(
        sp.binomial(amount, added) * at(row, rank - added)
        for added in range(rank + 1)
    )) for rank in range(maximum + 1))


def main() -> None:
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        child_rules = {}
        for rank in range(1, 7):
            child_rules.update({
                rows["X"][rank]: xrow[rank],
                rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank],
                rows["Z"][rank]: zrow[rank],
            })
        degree, coefficients = tensor_binomial(
            sp.expand(expression.subs(child_rules)), (k,)
        )
        assert degree == (6,)
        targets[(ell, 5)] = coefficients[(5,)]
        targets[(ell, 6)] = coefficients[(6,)]

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    interval_sum_5 = unique_expressions(interval_cells(ROOTED_P, H))[1:][3]
    vrow = (sp.Integer(1), *rows["V"][1:7])
    erow = (sp.Integer(1), *rows["E"][1:7])
    qrow = (sp.Integer(1),) + tuple(
        sp.expand(erow[index + 1] - vrow[index + 1])
        for index in range(5)
    )
    v_extended = add_isolates(vrow, 6, 6)
    q_extended = add_isolates(qrow, 6, 5)
    interval_mapping = {
        ROOTED_P[0]: 1,
        H[0]: 1,
        **{ROOTED_P[index]: v_extended[index] for index in range(1, 7)},
        **{H[index]: q_extended[index] for index in range(1, 6)},
    }
    payment_parent = sp.expand(interval_sum_5.subs(interval_mapping))

    faces = []
    for epsilon in (0, 1):
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        variables = tuple((*a[1:], *b[1:], *c[1:], *(d[1:] if epsilon else ())))
        payment = sp.expand(payment_parent.subs(rules))
        results = []
        for (ell, k_index), target_parent in sorted(targets.items()):
            target = sp.expand(target_parent.subs(rules))
            residual = sp.expand(target - (28 * payment if k_index == 5 else 0))
            polynomial = sp.Poly(residual, *variables)
            negatives = [value for value in polynomial.coeffs() if value < 0]
            stream = "".join(
                f"{powers}:{value};" for powers, value in polynomial.terms()
            )
            results.append({
                "ell": ell,
                "k_index": k_index,
                "payment_weight": 28 if k_index == 5 else 0,
                "monomials": len(polynomial.terms()),
                "negative_coefficients": len(negatives),
                "minimum_coefficient": str(min(polynomial.coeffs())),
                "residual_stream_sha256": hashlib.sha256(
                    stream.encode()
                ).hexdigest().upper(),
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "closed_rows": sum(row["negative_coefficients"] == 0 for row in results),
            "rows": results,
        })
    report = {
        "marker": MARKER,
        "payment": "28 times V_Qv interval sum 5 after adjoining six isolates",
        "faces": faces,
        "status": "exact diagnostic; zero-negative residual rows are theorem certificates",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "epsilon": face["epsilon"],
                "closed_rows": face["closed_rows"],
                "unresolved": [
                    [row["ell"], row["k_index"], row["negative_coefficients"]]
                    for row in face["rows"] if row["negative_coefficients"]
                ],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
