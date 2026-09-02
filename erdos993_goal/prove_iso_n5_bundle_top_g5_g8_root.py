#!/usr/bin/env python3
"""Prove the four top binomial coefficients of the rank-five bundle payment.

For every forest-realizable marked bundle cell, the exact rank-five payment
has degree eight in the bundle size M.  This script proves its coefficients
g5,g6,g7,g8 are nonnegative.  The only nontrivial coefficient, g5, is reduced
to a two-mark degree-excess cone and certified in an exact tensor Bernstein
basis from the minimum possible core order n=2.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_top_g5_g8_exact_root_20260829.json"


def choose2(value):
    return value * (value - 1) / 2


def choose3(value):
    return value * (value - 1) * (value - 2) / 6


def i2(order, edges):
    return choose2(order) - edges


def i3(order, edges, wedges):
    return choose3(order) - edges * (order - 2) + wedges


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


def reconstruct_bernstein(records, variables, degrees):
    total = 0
    for index, coefficient in records:
        term = coefficient
        for variable, degree, position in zip(variables, degrees, index):
            term *= (
                sp.binomial(degree, position)
                * variable**position
                * (1 - variable) ** (degree - position)
            )
        total += term
    return sp.expand(total)


def invariant_substitution(raw):
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
    return sp.factor(raw.subs({names[key]: value for key, value in values.items() if key in names})), {
        "n": n, "q": q, "e": e, "du": du, "dv": dv,
        "adjacent": adjacent, "wedges": wedges, "xu": xu, "xv": xv,
        "common": common, "de": de, "ddu": ddu, "ddv": ddv,
        "dadj": dadj, "eu": eu, "ev": ev,
    }


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    raw = {
        index: sp.sympify(dependency["binomial_coefficients"][index]["factor"])
        for index in range(5, 9)
    }

    g5, symbols = invariant_substitution(raw[5])
    n, q = symbols["n"], symbols["q"]
    e, du, dv, adjacent = symbols["e"], symbols["du"], symbols["dv"], symbols["adjacent"]
    wedges, xu, xv, common = symbols["wedges"], symbols["xu"], symbols["xv"], symbols["common"]
    de, ddu, ddv, dadj = symbols["de"], symbols["ddu"], symbols["ddv"], symbols["dadj"]
    eu, ev = symbols["eu"], symbols["ev"]
    assert len(sp.Poly(g5, *sorted(g5.free_symbols, key=str)).terms()) == 35

    d_block = -10 * dadj + 4 * ddu + 4 * ddv + 2 * de
    epsilon_block = (
        2 * eu**2 + 10 * eu * ev + 6 * eu * n - 4 * eu * q + 4 * eu
        + 2 * ev**2 + 6 * ev * n - 4 * ev * q + 4 * ev
    )
    q_block = -6 * n * q - q**2 - q
    assert sp.diff(g5, common) == -20
    assert sp.diff(g5, xu) == 36 and sp.diff(g5, xv) == 36
    assert sp.diff(g5, wedges) == -42

    # If dadj=1, the two D marks are present and adjacent, so
    # de,ddu,ddv>=1 and d_block>=0; if dadj=0 it is manifestly nonnegative.
    # Check the binary mark-survival block after q=n-h exactly.
    h = sp.symbols("h", nonnegative=True)
    epsilon_branches = {}
    for left, right in itertools.product((0, 1), repeat=2):
        branch = sp.factor(epsilon_block.subs({eu: left, ev: right, q: n - h}))
        assert all(
            coefficient >= 0
            for coefficient in sp.Poly(sp.expand(branch), n, h).coeffs()
        )
        epsilon_branches[f"{left}{right}"] = str(branch)

    # q_block(q)-q_block(n)=h(8n+1-h)>=h(7n+1), since h=n-q<=n.
    q_difference = sp.factor(q_block.subs(q, n - h) - q_block.subs(q, n))
    assert q_difference == -h * (h - 8 * n - 1)

    stripped = sp.factor(g5 - d_block - epsilon_block - q_block)
    assert not any(
        symbol in stripped.free_symbols
        for symbol in (de, ddu, ddv, dadj, eu, ev, q)
    )
    relaxed = sp.factor(
        (stripped + q_block.subs(q, n)).subs({common: 1, xu: 0, xv: 0})
    )

    # For e>=1 use the exact two-mark excess cone.
    qn = sp.symbols("qn", nonnegative=True)
    box = sp.symbols("a b c", nonnegative=True)
    a, b, c = box
    total = qn  # n-2, since n=2+qn
    x = total * a
    y = total * (1 - a) * b
    r = total * (1 - a) * (1 - b) * c
    branches = 0
    coefficient_count = 0
    profiles = set()
    minimum = None
    stream = []
    for auv, zu, zv in itertools.product((0, 1), repeat=3):
        if auv and not (zu and zv):
            continue
        d_u, d_v = zu + x, zv + y
        edge_count = 1 + x + y + r
        wedge_upper = choose2(d_u) + choose2(d_v) + choose2(r + 1)
        branch_form = sp.cancel(
            relaxed.subs(
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
        records = []
        branch_key = [auv, zu, zv]
        for degrees, index, coefficient in tensor_bernstein(branch_form, box):
            profiles.add(degrees)
            q_coefficients = sp.Poly(sp.expand(coefficient), qn).all_coeffs()
            assert all(value >= 0 for value in q_coefficients)
            at_zero = sp.factor(coefficient.subs(qn, 0))
            minimum = at_zero if minimum is None else min(minimum, at_zero)
            records.append((index, coefficient))
            stream.append({
                "branch_adj_zu_zv": branch_key,
                "index": list(index),
                "coefficient": str(coefficient),
            })
            coefficient_count += 1
        assert sp.expand(reconstruct_bernstein(records, box, degrees) - branch_form) == 0
        branches += 1
    assert branches == 5
    assert coefficient_count == 135
    assert profiles == {(2, 2, 2)}
    assert minimum == 378

    # Edgeless C is outside the e-1 cone; the same relaxed lower bound is
    # positive directly for every n>=2.
    edgeless_lower = sp.factor(
        relaxed.subs({e: 0, du: 0, dv: 0, adjacent: 0, wedges: 0})
    )
    assert edgeless_lower == 84 * n**2 + 69 * n + 8
    assert edgeless_lower.subs(n, 2) > 0
    assert sp.diff(edgeless_lower, n).subs(n, 2) > 0

    # The top three coefficients collapse after constant/first/second-row
    # forest substitutions.
    g6, symbols6 = invariant_substitution(raw[6])
    rename6 = {str(symbol): symbol for symbol in g6.free_symbols}
    expected_g6 = (
        36 * rename6["adjacent"] - 42 * rename6["du"] - 42 * rename6["dv"]
        + 28 * rename6["e"] + 6 * rename6["eu"] + 6 * rename6["ev"]
        + 182 * rename6["n"] - 6 * rename6["q"] + 161
    )
    assert sp.expand(g6 - expected_g6) == 0
    g6_payment = (
        28 * (rename6["e"] - rename6["du"] - rename6["dv"] + rename6["adjacent"])
        + 14 * (rename6["n"] - rename6["du"] - rename6["dv"])
        + 162 * rename6["n"] + 8 * rename6["adjacent"]
        + 6 * (rename6["n"] - rename6["q"])
        + 6 * rename6["eu"] + 6 * rename6["ev"] + 161
    )
    assert sp.expand(g6 - g6_payment) == 0

    g7, _ = invariant_substitution(raw[7])
    g8, _ = invariant_substitution(raw[8])
    assert g7 == 182
    assert g8 == 0

    report = {
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_TOP_BINOMIAL_COEFFICIENTS_G5_G8_ROOT",
        "theorem": (
            "For every forest-realizable marked rank-five sibling-bundle cell, "
            "the binomial coefficients g5,g6,g7,g8 are nonnegative."
        ),
        "g5": {
            "forest_invariant_form": str(g5),
            "D_edge_block": str(d_block),
            "mark_survival_branches_after_q=n-h": epsilon_branches,
            "q_monotonicity_difference": str(q_difference),
            "relaxed_form": str(relaxed),
            "monotone_replacements": (
                "drop the nonnegative D-edge, mark-survival, and marked-neighbor-"
                "excess blocks; set q=n, common=1, and W to the two-mark "
                "degree-excess upper bound"
            ),
            "degree_excess_cone": (
                "W<=C(d_u,2)+C(d_v,2)+C(r+1,2), with "
                "r=e-1-(d_u-z_u)-(d_v-z_v)"
            ),
            "bernstein": {
                "orders": "n>=2",
                "branches": branches,
                "coefficients": coefficient_count,
                "degree_profiles": [list(profile) for profile in sorted(profiles)],
                "minimum_at_n2": str(minimum),
                "exact_inversions": branches,
                "ordered_stream_sha256": hashlib.sha256(
                    json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
                ).hexdigest().upper(),
            },
            "edgeless_lower": str(edgeless_lower),
        },
        "g6": {
            "form": str(g6),
            "nonnegative_payment_terms": [
                "28*(e-d_u-d_v+adjacent)",
                "14*(n-d_u-d_v)",
                "162*n",
                "8*adjacent",
                "6*(n-q)",
                "6*epsilon_u+6*epsilon_v",
                "161",
            ],
            "forest_facts": (
                "e-d_u-d_v+adjacent>=0, d_u+d_v<=n, q<=n, "
                "and all indicators/counts are nonnegative"
            ),
        },
        "g7": str(g7),
        "g8": str(g8),
        "open_coefficients": [1, 2, 3, 4],
        "scope": (
            "Exact universal theorem for rank-five bundle coefficients g5-g8. "
            "It does not prove g1-g4, the full rank-five Bundle Payment Lemma, "
            "all N5, or Erdos Problem 993."
        ),
        "dependency": {
            "report": DEPENDENCY.name,
            "sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
