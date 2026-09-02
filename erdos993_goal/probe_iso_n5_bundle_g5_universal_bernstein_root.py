#!/usr/bin/env python3
"""Probe a universal positivity certificate for rank-five bundle coefficient g5.

The exact rank-five bundle polynomial has degree eight.  After substituting
forest invariants through independent triples in C and independent pairs in D,
its fifth binomial coefficient has a compact 35-term form.  This script pays
the manifestly nonnegative D/mark-survival blocks and tests the remaining
two-mark degree-excess cone in an exact Bernstein basis.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g5_universal_bernstein_probe_root_20260829.json"


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    power = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(j <= k for j, k in zip(monomial, index)):
                multiplier = 1
                for j, k, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(k, j) / sp.binomial(degree, j)
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def choose2(value):
    return value * (value - 1) / 2


def choose3(value):
    return value * (value - 1) * (value - 2) / 6


def i2(order, edges):
    return choose2(order) - edges


def i3(order, edges, wedges):
    return choose3(order) - edges * (order - 2) + wedges


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    raw = sp.sympify(dependency["binomial_coefficients"][5]["factor"])
    names = {str(symbol): symbol for symbol in raw.free_symbols}

    n, q = sp.symbols("n q", integer=True, nonnegative=True)
    e, du, dv, adjacent = sp.symbols("e du dv adjacent", integer=True, nonnegative=True)
    wedges, xu, xv, common = sp.symbols("W xu xv common", integer=True, nonnegative=True)
    de, ddu, ddv, dadj = sp.symbols("de ddu ddv dadj", integer=True, nonnegative=True)
    eu, ev = sp.symbols("eu ev", integer=True, nonnegative=True)

    values = {
        "cE0": 1, "cU0": 1, "cV0": 1, "cW0": 1,
        "dE0": 1, "dU0": 1, "dV0": 1, "dW0": 1,
        "cE1": n, "cU1": n - 1, "cV1": n - 1, "cW1": n - 2,
        "dE1": q, "dU1": q - eu, "dV1": q - ev,
        "dW1": q - eu - ev,
        "cE2": i2(n, e),
        "cU2": i2(n - 1, e - du),
        "cV2": i2(n - 1, e - dv),
        "cW2": i2(n - 2, e - du - dv + adjacent),
        "cE3": i3(n, e, wedges),
        "cU3": i3(n - 1, e - du, wedges - choose2(du) - xu),
        "cV3": i3(n - 1, e - dv, wedges - choose2(dv) - xv),
        "cW3": i3(
            n - 2,
            e - du - dv + adjacent,
            wedges - choose2(du) - choose2(dv) - xu - xv
            + adjacent * (du + dv - 2) + common,
        ),
        "dU2": i2(q - eu, de - ddu),
        "dV2": i2(q - ev, de - ddv),
        "dW2": i2(q - eu - ev, de - ddu - ddv + dadj),
    }
    invariant = sp.factor(raw.subs({names[key]: value for key, value in values.items() if key in names}))
    assert len(sp.Poly(invariant, *sorted(invariant.free_symbols, key=str)).terms()) == 35

    d_block = -10 * dadj + 4 * ddu + 4 * ddv + 2 * de
    epsilon_block = (
        2 * eu**2 + 10 * eu * ev + 6 * eu * n - 4 * eu * q + 4 * eu
        + 2 * ev**2 + 6 * ev * n - 4 * ev * q + 4 * ev
    )
    q_block = -6 * n * q - q**2 - q
    assert sp.diff(invariant, common) == -20
    assert sp.diff(invariant, xu) == 36 and sp.diff(invariant, xv) == 36

    # dadj=1 forces de,ddu,ddv>=1, so d_block>=0.  For binary eu,ev and
    # q<=n, epsilon_block>=0.  q_block is decreasing in q>=0, hence q=n is
    # its minimum on 0<=q<=n.
    stripped = sp.factor(invariant - d_block - epsilon_block - q_block)
    assert not any(symbol in stripped.free_symbols for symbol in (de, ddu, ddv, dadj, eu, ev, q))
    lower = sp.factor(
        stripped
        + q_block.subs(q, n)
        .subs({common: 1, xu: 0, xv: 0})
    )
    # The chained call above only substitutes inside q_block; apply the C
    # monotone replacements to the whole expression explicitly.
    lower = sp.factor((stripped + q_block.subs(q, n)).subs({common: 1, xu: 0, xv: 0}))

    qn = sp.symbols("qn", nonnegative=True)
    box = sp.symbols("a b c", nonnegative=True)
    a, b, c = box
    rows = []
    for threshold in range(2, 13):
        total = sp.Integer(threshold - 2) + qn
        x = total * a
        y = total * (1 - a) * b
        r = total * (1 - a) * (1 - b) * c
        branches = 0
        coefficient_count = 0
        bad = 0
        first_bad = None
        minimum = None
        profiles = set()
        for auv, zu, zv in itertools.product((0, 1), repeat=3):
            if auv and not (zu and zv):
                continue
            d_u, d_v = zu + x, zv + y
            edge_count = 1 + x + y + r
            wedge_upper = choose2(d_u) + choose2(d_v) + choose2(r + 1)
            branch_form = sp.cancel(
                lower.subs(
                    {
                        n: total + 2,
                        e: edge_count,
                        du: d_u,
                        dv: d_v,
                        adjacent: auv,
                        wedges: wedge_upper,
                    }
                )
            )
            branches += 1
            for degrees, index, coefficient in tensor_bernstein(branch_form, box):
                profiles.add(degrees)
                coefficient_count += 1
                q_coefficients = sp.Poly(sp.expand(coefficient), qn).all_coeffs()
                if not all(value >= 0 for value in q_coefficients):
                    bad += 1
                    if first_bad is None:
                        first_bad = {
                            "branch_adj_zu_zv": [auv, zu, zv],
                            "index": list(index),
                            "coefficient": str(coefficient),
                        }
                at_zero = sp.factor(coefficient.subs(qn, 0))
                minimum = at_zero if minimum is None else min(minimum, at_zero)
        row = {
            "threshold_n": threshold,
            "branches": branches,
            "bernstein_coefficients": coefficient_count,
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "bad": bad,
            "first_bad": first_bad,
            "minimum_at_threshold": str(minimum),
        }
        rows.append(row)
        print(json.dumps(row, sort_keys=True), flush=True)
        if bad == 0:
            break

    report = {
        "marker": "PROBE_EXACT_ISO_N5_BUNDLE_G5_UNIVERSAL_BERNSTEIN_ROOT",
        "invariant_form": str(invariant),
        "nonnegative_blocks": {
            "D_edge_block": str(d_block),
            "mark_survival_block": str(epsilon_block),
        },
        "relaxed_lower_form": str(lower),
        "rows": rows,
        "passing_threshold": next((row["threshold_n"] for row in rows if row["bad"] == 0), None),
        "scope": (
            "Exact discovery probe for rank-five coefficient g5. The D-block, "
            "binary mark-survival block, q monotonicity, wedge cone, and finite "
            "complement still require theorem-grade assembly/audit."
        ),
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
