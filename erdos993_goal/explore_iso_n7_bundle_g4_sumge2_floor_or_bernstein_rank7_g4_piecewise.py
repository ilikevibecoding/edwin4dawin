#!/usr/bin/env python3
"""Exact three-floor OR probe for rank-seven g4 common0/sum>=2."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from explore_iso_n7_bundle_g4_sumge2_reduced_bernstein_rank7_g4_piecewise import (
    DEGREES,
    bernstein_controls,
    frozen_five_leaf_check,
    interval_independent_count,
)
from prove_iso_n7_bundle_g4_sum1_coupled_moment_bernstein_rank7_g4_piecewise import (
    choose_poly,
    forest_moment_rows,
)


HERE = Path(__file__).resolve().parent
RESIDUAL_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_sumge2_floor_or_bernstein_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_ISO_N7_BUNDLE_G4_SUMGE2_FLOOR_OR_BERNSTEIN_RANK7_G4_PIECEWISE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_polynomials(endpoint_pairs=None, floor_labels=None):
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    names = ["n", *[f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.sympify(upstream["residual_expression"], locals=symbols)
    m, r = sp.symbols("m r")
    a, b, c, y, z = sp.symbols("a b c y z")
    ea, eb, ez = sp.symbols("ea eb ez")
    endpoint_a5, endpoint_b5 = sp.symbols("endpoint_a5 endpoint_b5")
    total = 2 + (m - 2) * a
    x_count, y_count = total * b, total * (1 - b)
    hA, hB, hZ = m - y_count, m - x_count, m - total
    edge_w = (m + 1 - total) * c
    omega_w, tau_w, rows_w, bad4_w = forest_moment_rows(m, edge_w, y, z)
    incidence_w = edge_w * choose_poly(m - 2, 3)
    joint_w = omega_w * choose_poly(m - 3, 2)
    pair_incidence_w = (
        omega_w * choose_poly(m - 3, 2)
        + (choose_poly(edge_w, 2) - omega_w) * (m - 4)
    )
    triple_incidence_lower_w = tau_w * (m - 7) + omega_w * (edge_w - 2)
    floors = {
        "incidence": incidence_w / 4,
        "shadow": (m - 4) * bad4_w / 5,
        "strong": (
            (m - 4) * bad4_w - 2 * incidence_w
            + sp.Rational(5, 6) * joint_w
        ),
        # If a bad five-set spans t=1,2,3,4 forest edges, then each of
        # t-C(t,2), (2t-C(t,2))/3, and t/2-C(t,2)/6 is at most one.
        # Summing these pointwise inequalities gives three additional exact
        # floors from the first two edge-incidence moments.
        "pair12": incidence_w - pair_incidence_w,
        "pair23": (2 * incidence_w - pair_incidence_w) / 3,
        "pair34": incidence_w / 2 - pair_incidence_w / 6,
        # For t=1,...,4, t-C(t,2)+3C(t,3)/4 <= 1.  The exact third
        # incidence moment is tau*(m-6)+Omega*(e-2)-sigma, where sigma
        # counts K_1,3 edge triples and sigma<=tau.  Hence the expression
        # below is another rigorous bad-five floor.
        "triple134": (
            incidence_w - pair_incidence_w
            + sp.Rational(3, 4) * triple_incidence_lower_w
        ),
    }
    edge_a, edge_b, edge_z = hA * ea, hB * eb, hZ * ez
    fixed = {
        symbols["n"]: m + 2,
        symbols["A2"]: hA,
        symbols["A3"]: choose_poly(hA, 2) - edge_a,
        symbols["A4"]: interval_independent_count(hA, edge_a, 3, 1),
        symbols["A5"]: interval_independent_count(hA, edge_a, 4, endpoint_a5),
        symbols["B2"]: hB,
        symbols["B3"]: choose_poly(hB, 2) - edge_b,
        symbols["B4"]: interval_independent_count(hB, edge_b, 3, 1),
        symbols["B5"]: interval_independent_count(hB, edge_b, 4, endpoint_b5),
        symbols["Z2"]: 1,
        symbols["Z3"]: hZ,
        symbols["Z4"]: choose_poly(hZ, 2) - edge_z,
        symbols["Z5"]: interval_independent_count(hZ, edge_z, 3, 1),
        symbols["W2"]: rows_w[2],
        symbols["W3"]: rows_w[3],
        symbols["W4"]: rows_w[4],
    }
    variables = (r, a, b, c, y, z, ea, eb, ez)
    polynomials = {}
    selected_pairs = (
        tuple(itertools.product((0, 1), repeat=2))
        if endpoint_pairs is None else tuple(endpoint_pairs)
    )
    selected_labels = tuple(floors) if floor_labels is None else tuple(floor_labels)
    for label in selected_labels:
        floor = floors[label]
        boxed = sp.cancel(
            residual.subs(
                {**fixed, symbols["W5"]: choose_poly(m, 5) - floor},
                simultaneous=True,
            )
        )
        numerator, denominator = sp.fraction(boxed)
        denominator_factor = sp.cancel(sp.factor(denominator) / m**4)
        assert denominator_factor.is_Rational and denominator_factor > 0
        for a5, b5 in selected_pairs:
            key = (a5, b5, label)
            polynomial = sp.Poly(
                sp.expand(
                    numerator.subs({
                        endpoint_a5: a5,
                        endpoint_b5: b5,
                        m: r + 6,
                    })
                ),
                *variables,
            )
            assert tuple(polynomial.degree_list()) == DEGREES
            polynomials[key] = polynomial
            print("POLY", key, len(polynomial.terms()), flush=True)
    return polynomials


def main():
    polynomials = build_polynomials()
    certificates = {}
    for key in sorted(polynomials):
        print("CONTROLS", key, flush=True)
        _controls, scale, digest = bernstein_controls(polynomials[key])
        certificate = frozen_five_leaf_check(_controls)
        certificates[str(key)] = {
            "scale": scale,
            "digest": digest,
            "certificate": certificate,
        }
        print("CERT", key, json.dumps(certificate, sort_keys=True), flush=True)
    labels = ("incidence", "shadow", "strong")
    branch_or = {}
    leaf_labels = ("qL", "qR_cL", "qR_cR_qL", "qR_cR_qR_yL", "qR_cR_qR_yR")
    for a5, b5 in itertools.product((0, 1), repeat=2):
        branch_or[str((a5, b5))] = {}
        for leaf in leaf_labels:
            passing = [
                label for label in labels
                if int(certificates[str((a5, b5, label))]["certificate"]["leaf_minima"][leaf]) >= 0
            ]
            branch_or[str((a5, b5))][leaf] = passing
    complete = all(
        passing
        for branch in branch_or.values()
        for passing in branch.values()
    )
    report = {
        "marker": MARKER,
        "degrees": list(DEGREES),
        "certificates": certificates,
        "leafwise_floor_or": branch_or,
        "complete": complete,
        "status": "complete exact OR probe; audit/replay required" if complete else "OR cover failed",
        "dependencies_sha256": {RESIDUAL_REPORT.name: sha256(RESIDUAL_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "complete": complete, "leafwise": branch_or}, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
