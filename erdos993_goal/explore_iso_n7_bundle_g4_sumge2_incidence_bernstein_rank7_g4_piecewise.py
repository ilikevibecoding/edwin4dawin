#!/usr/bin/env python3
"""Exact reduction probe for rank-seven g4 common0/sum>=2.

W uses the frozen Omega/tau/B5 moment box.  The three deletion minors use the
safe common-edge incidence intervals for ranks through four.  This is a probe
until an exact pointwise-max Bernstein certificate is completed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n7_bundle_g4_sum1_coupled_moment_bernstein_rank7_g4_piecewise import (
    choose_poly,
    forest_moment_rows,
)


HERE = Path(__file__).resolve().parent
RESIDUAL_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_sumge2_incidence_bernstein_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_ISO_N7_BUNDLE_G4_SUMGE2_INCIDENCE_BERNSTEIN_RANK7_G4_PIECEWISE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def interval_independent_count(order, edges, rank, parameter):
    incidence = edges * choose_poly(order - 2, rank - 2)
    bad_lower = incidence / (rank - 1)
    bad = bad_lower + parameter * (incidence - bad_lower)
    return sp.expand(choose_poly(order, rank) - bad)


def build():
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    names = ["n", *[f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.sympify(upstream["residual_expression"], locals=symbols)
    m, r = sp.symbols("m r")
    a, b, c, y, z, p5 = sp.symbols("a b c y z p5")
    ea, pa4, pa5 = sp.symbols("ea pa4 pa5")
    eb, pb4, pb5 = sp.symbols("eb pb4 pb5")
    ez, pz5 = sp.symbols("ez pz5")

    total = 2 + (m - 2) * a
    x_count = total * b
    y_count = total * (1 - b)
    hA, hB, hZ = m - y_count, m - x_count, m - total
    edge_w = (m + 1 - total) * c
    omega_w, tau_w, rows_w, bad4_w = forest_moment_rows(m, edge_w, y, z)
    incidence_w = edge_w * choose_poly(m - 2, 3)
    joint_w = omega_w * choose_poly(m - 3, 2)
    floors = {
        "incidence": incidence_w / 4,
        "shadow": (m - 4) * bad4_w / 5,
        "strong": (
            (m - 4) * bad4_w - 2 * incidence_w
            + sp.Rational(5, 6) * joint_w
        ),
    }

    edge_a, edge_b, edge_z = hA * ea, hB * eb, hZ * ez
    shift = {
        symbols["n"]: m + 2,
        symbols["A2"]: hA,
        symbols["A3"]: choose_poly(hA, 2) - edge_a,
        symbols["A4"]: interval_independent_count(hA, edge_a, 3, pa4),
        symbols["A5"]: interval_independent_count(hA, edge_a, 4, pa5),
        symbols["B2"]: hB,
        symbols["B3"]: choose_poly(hB, 2) - edge_b,
        symbols["B4"]: interval_independent_count(hB, edge_b, 3, pb4),
        symbols["B5"]: interval_independent_count(hB, edge_b, 4, pb5),
        symbols["Z2"]: 1,
        symbols["Z3"]: hZ,
        symbols["Z4"]: choose_poly(hZ, 2) - edge_z,
        symbols["Z5"]: interval_independent_count(hZ, edge_z, 3, pz5),
        symbols["W2"]: rows_w[2],
        symbols["W3"]: rows_w[3],
        symbols["W4"]: rows_w[4],
    }
    variables = (r, a, b, c, y, z, ea, pa4, pa5, eb, pb4, pb5, ez, pz5)
    numerators = {}
    summaries = {}
    for label, floor in floors.items():
        bad5 = floor + p5 * (incidence_w - floor)
        boxed = sp.cancel(
            residual.subs(
                {**shift, symbols["W5"]: choose_poly(m, 5) - bad5},
                simultaneous=True,
            )
        )
        numerator, denominator = sp.fraction(boxed)
        for endpoint in (0, 1):
            key = (label, endpoint)
            polynomial = sp.Poly(
                sp.expand(numerator.subs({p5: endpoint, m: r + 6})),
                *variables,
            )
            numerators[key] = polynomial.as_expr()
            summaries[str(key)] = {
                "terms": len(polynomial.terms()),
                "degrees": list(polynomial.degree_list()),
                "denominator": str(sp.factor(denominator.subs(m, r + 6))),
            }
    return variables, numerators, summaries


def main():
    variables, _numerators, summaries = build()
    print(json.dumps(summaries, indent=2, sort_keys=True), flush=True)
    report = {
        "marker": MARKER,
        "variables": list(map(str, variables)),
        "summaries": summaries,
        "status": "exact reduction only; Bernstein certificate pending",
        "dependencies_sha256": {RESIDUAL_REPORT.name: sha256(RESIDUAL_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(MARKER)


if __name__ == "__main__":
    main()
