#!/usr/bin/env python3
"""Tighter exact-wedge Bernstein probe for unresolved small g2 k0 cells."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from explore_rank4_three_halves_grouped import tensor_bernstein_fast
from prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root import (
    at,
    bonferroni_upper,
    choose_polynomial,
    multiplicity_upper,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_ISO_N5_G2_INTERNAL_ORDINARY_SMALL_K0_WEDGE_BERNSTEIN_ROOT"


def path_floor(order, rank):
    return choose_polynomial(order - rank + 1, rank)


def edge_union_floor(order, edges, rank):
    return sp.expand(
        choose_polynomial(order, rank)
        - edges * choose_polynomial(order - 2, rank - 2)
    )


def target_form(ell, rows, expression):
    k = sp.symbols("k", integer=True, nonnegative=True)
    xrow, urow, yrow, zrow = child_rows(ell, k)
    rules = {}
    for rank in range(1, 7):
        rules.update({
            rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
            rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
        })
    degrees, cells = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
    assert degrees == (5,)
    return cells[(0,)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ell", type=int, choices=range(1, 8), required=True)
    parser.add_argument("--epsilon", type=int, choices=(0, 1), required=True)
    parser.add_argument("--cutoff", type=int, default=11)
    args = parser.parse_args()
    theta = lam = sp.Rational(1, 2)
    expression, rows = ordinary_expression()
    target = target_form(args.ell, rows, expression)

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    ea, qa, eb, qb, ec, qc, ed, qd = sp.symbols(
        "ea qa eb qb ec qc ed qd", nonnegative=True
    )

    def rank3(order, edges, wedges):
        return sp.expand(
            choose_polynomial(order, 3) - (order - 2) * edges + wedges
        )

    low_rules = {}
    for row, order, edges, wedges in (
        (a, n, ea, qa), (b, nb, eb, qb),
        (c, nc, ec, qc), (d, nd, ed, qd),
    ):
        low_rules.update({
            row[1]: order,
            row[2]: choose_polynomial(order, 2) - edges,
            row[3]: rank3(order, edges, wedges),
        })
    edge_wedge_by_row = {a: (ea, qa), b: (eb, qb), c: (ec, qc), d: (ed, qd)}
    remaining = {}
    for row, order in ((a, n), (b, nb), (c, nc), (d, nd)):
        for rank in range(4, len(row)):
            edges, wedges = edge_wedge_by_row[row]
            remaining[row[rank]] = (order, edges, wedges, rank)
    high_variables = tuple(remaining)
    base_variables = (n, nb, nc, nd, ea, qa, eb, qb, ec, qc, ed, qd)
    variables = (*base_variables, *high_variables)

    partition = {}
    epsilon = args.epsilon
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
    exact = sp.Poly(sp.expand(target.subs(partition).subs(low_rules)), *variables)
    lower = sp.Integer(0)
    positive_high = negative_high = 0
    for powers, coefficient in exact.terms():
        high_powers = powers[len(base_variables):]
        assert sum(high_powers) <= 1
        term = coefficient
        for variable, power in zip(base_variables, powers[:len(base_variables)]):
            term *= variable**power
        if any(high_powers):
            variable = high_variables[high_powers.index(1)]
            order, edges, wedges, rank = remaining[variable]
            if coefficient > 0:
                positive_high += 1
                bound = sp.expand(
                    lam * path_floor(order, rank)
                    + (1 - lam) * edge_union_floor(order, edges, rank)
                )
            else:
                negative_high += 1
                bound = sp.expand(
                    theta * multiplicity_upper(order, edges, rank)
                    + (1 - theta) * bonferroni_upper(order, edges, wedges, rank)
                )
            term *= bound
        lower += term

    x, y, z, u, va, s, vb, w, vc, r, vd, t = sp.symbols(
        "x y z u va s vb w vc r vd t", nonnegative=True
    )
    normalized = sp.expand(lower.subs({
        nb: n * x,
        nc: n * y,
        nd: n * z,
        ea: n * u,
        qa: n**2 * u**2 * va / 2,
        eb: n * x * s,
        qb: n**2 * x**2 * s**2 * vb / 2,
        ec: n * y * w,
        qc: n**2 * y**2 * w**2 * vc / 2,
        ed: n * z * r,
        qd: n**2 * z**2 * r**2 * vd / 2,
    }).subs(n, args.cutoff + t))
    box = (x, y, u, va, s, vb, w, vc) if epsilon == 0 else (
        x, y, z, u, va, s, vb, w, vc, r, vd
    )
    degrees, controls = tensor_bernstein_fast(normalized, box)
    negative = zero = count = 0
    minimum = None
    first_negative = []
    for control_index, value in enumerate(controls.flat):
        coefficients = sp.Poly(value, t).all_coeffs()
        for coefficient_index, coefficient in enumerate(coefficients):
            count += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if len(first_negative) < 20:
                    first_negative.append({
                        "control": control_index,
                        "coefficient_index": coefficient_index,
                        "value": str(coefficient),
                    })
            elif coefficient == 0:
                zero += 1
    report = {
        "marker": MARKER,
        "ell": args.ell,
        "k_index": 0,
        "epsilon": epsilon,
        "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
        "cutoff_A_order": args.cutoff,
        "theta": str(theta),
        "lambda": str(lam),
        "expanded_monomials": len(exact.terms()),
        "positive_high_monomials": positive_high,
        "negative_high_monomials": negative_high,
        "box_variables": [str(value) for value in box],
        "bernstein_degrees": list(degrees),
        "bernstein_controls": int(controls.size),
        "power_coefficients": count,
        "negative_power_coefficients": negative,
        "zero_power_coefficients": zero,
        "minimum_power_coefficient": str(minimum),
        "first_negative": first_negative,
        "all_nonnegative": negative == 0,
        "scope": "Exact diagnostic only; no theorem marker.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        f"iso_n5_g2_internal_ordinary_small_k0_wedge_bernstein_probe_"
        f"ell{args.ell}_eps{epsilon}_n{args.cutoff}_root_20260830.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "ell": args.ell,
        "geometry": report["geometry"],
        "controls": report["bernstein_controls"],
        "power_coefficients": count,
        "negative": negative,
        "minimum": str(minimum),
        "all_nonnegative": negative == 0,
    }, indent=2, sort_keys=True))
    print("OUTPUT", output.name)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
