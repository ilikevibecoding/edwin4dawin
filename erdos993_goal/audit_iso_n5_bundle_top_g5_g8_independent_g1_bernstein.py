#!/usr/bin/env python3
"""Independent exact audit of the universal rank-five bundle top coefficients.

No producer proof functions are imported.  Starting from the defining rank-five
whole-bundle Gamma identity, the audit rebuilds its binomial coefficients by
finite differences, derives the forest-invariant forms of g5 through g8, and
checks every payment used in the sign proof.  The g5 cone is certified in a
total-degree Bernstein basis on the three-variable simplex, with exact inverse
reconstruction in every branch.  The edgeless branch is checked separately.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DISCOVERY = HERE / "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json"
PRODUCER_SOURCE = HERE / "prove_iso_n5_bundle_top_g5_g8_root.py"
PRODUCER_REPORT = HERE / "iso_n5_bundle_top_g5_g8_exact_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_top_g5_g8_independent_audit_g1_bernstein_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def nested(rows, rank):
    """The four-minor Newton functional, written locally for the audit."""
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def choose_polynomial(value, rank):
    if rank < 0:
        return sp.Integer(0)
    answer = sp.Integer(1)
    for offset in range(rank):
        answer *= value - offset
    return sp.expand(answer / factorial(rank))


def isolate_rows(rows, number, maximum):
    return tuple(
        tuple(
            sp.expand(
                sum(choose_polynomial(number, offset) * at(row, rank - offset)
                    for offset in range(rank + 1))
            )
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(crows, drows):
    return tuple(
        tuple(sp.expand(at(crow, rank) + at(drow, rank - 1)) for rank in range(len(crow)))
        for crow, drow in zip(crows, drows)
    )


def binomial_basis(expression, variable):
    """Exact forward-difference conversion, including inverse verification."""
    polynomial = sp.Poly(sp.expand(expression), variable)
    values = [sp.expand(expression.subs(variable, integer)) for integer in range(polynomial.degree() + 1)]
    coefficients = []
    while values:
        coefficients.append(sp.expand(values[0]))
        values = [sp.expand(values[index + 1] - values[index]) for index in range(len(values) - 1)]
    reconstruction = sp.expand(
        sum(coefficient * choose_polynomial(variable, rank)
            for rank, coefficient in enumerate(coefficients))
    )
    assert sp.expand(reconstruction - expression) == 0
    return coefficients


def raw_binomial_coefficients():
    """Rebuild Gamma_M directly, summing the lower-rank telescope in binomial basis."""
    rank = 5
    maximum = 6
    bundle_size, time = sp.symbols("M t", integer=True, nonnegative=True)
    crows = tuple(tuple(sp.symbols(f"c{name}0:{maximum + 1}")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:{maximum + 1}")) for name in "EUVW")

    bundled = add_xd(isolate_rows(crows, bundle_size, maximum), drows)
    initial = add_xd(crows, drows)
    lower_at_time = nested(isolate_rows(crows, time, rank), rank - 1)
    lower_coefficients = binomial_basis(lower_at_time, time)
    lower_sum = sp.expand(
        sum(coefficient * choose_polynomial(bundle_size, index + 1)
            for index, coefficient in enumerate(lower_coefficients))
    )
    gamma = sp.expand(nested(bundled, rank) - nested(initial, rank) - lower_sum)
    assert sp.expand(gamma.subs(bundle_size, 0)) == 0
    coefficients = binomial_basis(gamma, bundle_size)
    assert sp.Poly(gamma, bundle_size).degree() == 8
    assert len(coefficients) == 9
    return coefficients


def choose2(value):
    return sp.expand(value * (value - 1) / 2)


def choose3(value):
    return sp.expand(value * (value - 1) * (value - 2) / 6)


def i2(order, edges):
    return sp.expand(choose2(order) - edges)


def i3(order, edges, wedges):
    return sp.expand(choose3(order) - edges * (order - 2) + wedges)


def invariant_form(raw):
    """Substitute independent-set formulas through the rows actually used by g5."""
    names = {str(symbol): symbol for symbol in raw.free_symbols}
    n, q = sp.symbols("n q", integer=True, nonnegative=True)
    e, du, dv, adjacent = sp.symbols("e du dv adjacent", integer=True, nonnegative=True)
    wedges, xu, xv, common = sp.symbols("W xu xv common", integer=True, nonnegative=True)
    de, ddu, ddv, dadj = sp.symbols("de ddu ddv dadj", integer=True, nonnegative=True)
    eu, ev = sp.symbols("eu ev", integer=True, nonnegative=True)
    rules = {
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
    form = sp.factor(raw.subs({names[key]: value for key, value in rules.items() if key in names}))
    unresolved = [
        symbol for symbol in form.free_symbols
        if len(str(symbol)) >= 2
        and str(symbol)[0] in "cd"
        and str(symbol)[1] in "EUVW"
    ]
    assert not unresolved
    return form, {
        "n": n, "q": q, "e": e, "du": du, "dv": dv,
        "adjacent": adjacent, "W": wedges, "xu": xu, "xv": xv,
        "common": common, "de": de, "ddu": ddu, "ddv": ddv,
        "dadj": dadj, "eu": eu, "ev": ev,
    }


def compositions(total, parts):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in compositions(total - first, parts - 1):
            yield (first, *rest)


def falling(value, degree):
    answer = sp.Integer(1)
    for offset in range(degree):
        answer *= value - offset
    return answer


def simplex_bernstein(expression, variables):
    """Total-degree Bernstein conversion on {x_i>=0, sum x_i<=1}."""
    polynomial = sp.Poly(sp.expand(expression), *variables)
    power = dict(polynomial.terms())
    degree = max(sum(monomial) for monomial in power)
    for alpha in compositions(degree, len(variables) + 1):
        selected = alpha[1:]
        value = sp.Integer(0)
        for beta, coefficient in power.items():
            if all(power_beta <= power_alpha for power_beta, power_alpha in zip(beta, selected)):
                multiplier = sp.Integer(1)
                for power_alpha, power_beta in zip(selected, beta):
                    multiplier *= falling(power_alpha, power_beta)
                multiplier /= falling(degree, sum(beta))
                value += coefficient * multiplier
        yield degree, alpha, sp.factor(value)


def multinomial(alpha):
    answer = factorial(sum(alpha))
    for part in alpha:
        answer //= factorial(part)
    return answer


def total_simplex_certificate(relaxed, symbols):
    n, e = symbols["n"], symbols["e"]
    du, dv, adjacent = symbols["du"], symbols["dv"], symbols["adjacent"]
    wedges = symbols["W"]
    excess = sp.symbols("m", nonnegative=True)
    sx, sy, sr = sp.symbols("sx sy sr", nonnegative=True)
    slack = 1 - sx - sy - sr
    x, y, r = excess * sx, excess * sy, excess * sr
    rows = []
    stream = []
    global_minimum = None
    for auv, zu, zv in itertools.product((0, 1), repeat=3):
        if auv and not (zu and zv):
            continue
        d_u, d_v = zu + x, zv + y
        edge_count = 1 + x + y + r
        wedge_upper = choose2(d_u) + choose2(d_v) + choose2(r + 1)
        branch = sp.factor(
            relaxed.subs({
                n: excess + 2,
                e: edge_count,
                du: d_u,
                dv: d_v,
                adjacent: auv,
                wedges: wedge_upper,
            })
        )
        records = list(simplex_bernstein(branch, (sx, sy, sr)))
        degrees = {degree for degree, _alpha, _coefficient in records}
        assert degrees == {2}
        reconstruction = sp.Integer(0)
        local_minimum = None
        for degree, alpha, coefficient in records:
            power_coefficients = sp.Poly(sp.expand(coefficient), excess).all_coeffs()
            assert all(value >= 0 for value in power_coefficients)
            at_zero = sp.factor(coefficient.subs(excess, 0))
            local_minimum = at_zero if local_minimum is None else min(local_minimum, at_zero)
            global_minimum = at_zero if global_minimum is None else min(global_minimum, at_zero)
            basis = multinomial(alpha) * slack ** alpha[0]
            for variable, power in zip((sx, sy, sr), alpha[1:]):
                basis *= variable**power
            reconstruction += coefficient * basis
            stream.append({
                "branch_adj_zu_zv": [auv, zu, zv],
                "alpha": list(alpha),
                "coefficient": str(coefficient),
            })
        assert sp.expand(reconstruction - branch) == 0
        rows.append({
            "branch_adj_zu_zv": [auv, zu, zv],
            "degree": 2,
            "coefficients": len(records),
            "minimum_at_n2": str(local_minimum),
        })
    assert len(rows) == 5
    assert len(stream) == 50
    assert global_minimum == 378
    return {
        "domain": "n>=2 and e>=1",
        "basis": "total-degree Bernstein on sx+sy+sr<=1",
        "branches": len(rows),
        "degree": 2,
        "coefficients": len(stream),
        "exact_inversions": len(rows),
        "all_m_power_coefficients_nonnegative": True,
        "minimum_at_n2": str(global_minimum),
        "ordered_stream_sha256": hashlib.sha256(
            json.dumps(stream, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest().upper(),
        "rows": rows,
    }


def main():
    discovery = json.loads(DISCOVERY.read_text(encoding="utf-8"))
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert discovery["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    assert producer["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_TOP_BINOMIAL_COEFFICIENTS_G5_G8_ROOT"

    coefficients = raw_binomial_coefficients()
    raw = {index: sp.factor(coefficients[index]) for index in range(5, 9)}
    for index in range(5, 9):
        claimed = sp.sympify(discovery["binomial_coefficients"][index]["factor"])
        assert sp.expand(raw[index] - claimed) == 0

    g5, symbols = invariant_form(raw[5])
    n, q = symbols["n"], symbols["q"]
    e, du, dv = symbols["e"], symbols["du"], symbols["dv"]
    adjacent, wedges = symbols["adjacent"], symbols["W"]
    xu, xv, common = symbols["xu"], symbols["xv"], symbols["common"]
    de, ddu, ddv, dadj = symbols["de"], symbols["ddu"], symbols["ddv"], symbols["dadj"]
    eu, ev = symbols["eu"], symbols["ev"]
    assert len(sp.Poly(g5, *sorted(g5.free_symbols, key=str)).terms()) == 35
    local_symbols = {str(symbol): symbol for symbol in g5.free_symbols}
    assert sp.expand(
        g5 - sp.sympify(producer["g5"]["forest_invariant_form"], locals=local_symbols)
    ) == 0

    d_block = -10 * dadj + 4 * ddu + 4 * ddv + 2 * de
    epsilon_block = (
        2 * eu**2 + 10 * eu * ev + 6 * eu * n - 4 * eu * q + 4 * eu
        + 2 * ev**2 + 6 * ev * n - 4 * ev * q + 4 * ev
    )
    q_block = -6 * n * q - q**2 - q
    h = sp.symbols("h", integer=True, nonnegative=True)
    d_branches = {
        "dadj=0": "4*ddu+4*ddv+2*de>=0",
        "dadj=1": "4*(ddu-1)+4*(ddv-1)+2*(de-1)>=0",
    }
    assert sp.expand(d_block.subs(dadj, 1) - (4 * (ddu - 1) + 4 * (ddv - 1) + 2 * (de - 1))) == 0
    epsilon_branches = {}
    for left, right in itertools.product((0, 1), repeat=2):
        branch = sp.factor(epsilon_block.subs({eu: left, ev: right, q: n - h}))
        assert all(value >= 0 for value in sp.Poly(sp.expand(branch), n, h).coeffs())
        epsilon_branches[f"{left}{right}"] = str(branch)
    assert epsilon_branches == {
        "00": "0",
        "01": "2*(2*h + n + 3)",
        "10": "2*(2*h + n + 3)",
        "11": "2*(4*h + 2*n + 11)",
    }
    q_difference = sp.factor(q_block.subs(q, n - h) - q_block.subs(q, n))
    assert q_difference == -h * (h - 8 * n - 1)

    assert sp.diff(g5, common) == -20
    assert sp.diff(g5, xu) == 36 and sp.diff(g5, xv) == 36
    assert sp.diff(g5, wedges) == -42
    stripped = sp.factor(g5 - d_block - epsilon_block - q_block)
    assert not any(symbol in stripped.free_symbols for symbol in (de, ddu, ddv, dadj, eu, ev, q))
    relaxed = sp.factor((stripped + q_block.subs(q, n)).subs({common: 1, xu: 0, xv: 0}))
    assert sp.expand(
        relaxed - sp.sympify(producer["g5"]["relaxed_form"], locals=local_symbols)
    ) == 0
    certificate = total_simplex_certificate(relaxed, symbols)

    edgeless = sp.factor(relaxed.subs({e: 0, du: 0, dv: 0, adjacent: 0, wedges: 0}))
    assert edgeless == 84 * n**2 + 69 * n + 8
    assert edgeless.subs(n, 2) > 0
    assert sp.diff(edgeless, n).subs(n, 2) > 0

    g6, symbols6 = invariant_form(raw[6])
    s6 = {str(symbol): symbol for symbol in g6.free_symbols}
    expected6 = (
        36 * s6["adjacent"] - 42 * s6["du"] - 42 * s6["dv"]
        + 28 * s6["e"] + 6 * s6["eu"] + 6 * s6["ev"]
        + 182 * s6["n"] - 6 * s6["q"] + 161
    )
    assert sp.expand(g6 - expected6) == 0
    payment6 = (
        28 * (s6["e"] - s6["du"] - s6["dv"] + s6["adjacent"])
        + 14 * (s6["n"] - s6["du"] - s6["dv"])
        + 162 * s6["n"] + 8 * s6["adjacent"]
        + 6 * (s6["n"] - s6["q"])
        + 6 * s6["eu"] + 6 * s6["ev"] + 161
    )
    assert sp.expand(g6 - payment6) == 0

    g7, _ = invariant_form(raw[7])
    g8, _ = invariant_form(raw[8])
    assert g7 == 182
    assert g8 == 0

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_BUNDLE_TOP_G5_G8_AUDIT_G1_BERNSTEIN",
        "theorem": (
            "For every forest-realizable marked rank-five sibling-bundle cell, "
            "g5,g6,g7,g8 are nonnegative."
        ),
        "direct_gamma_reconstruction": {
            "identity": "Gamma_M=N5((1+x)^M C+xD)-N5(C+xD)-sum_(t=0)^(M-1)N4((1+x)^t C)",
            "degree": 8,
            "binomial_inverse_verified": True,
            "g5_through_g8_match_discovery": True,
            "raw_monomials": {
                str(index): len(sp.Poly(raw[index], *sorted(raw[index].free_symbols, key=str)).terms()) if raw[index] else 0
                for index in range(5, 9)
            },
        },
        "g5": {
            "forest_invariant_terms": 35,
            "forest_invariant_form": str(g5),
            "D_edge_payment": {"form": str(d_block), "branches": d_branches},
            "epsilon_payment_after_q=n-h": epsilon_branches,
            "q_monotonicity_difference": str(q_difference),
            "q_monotonicity_domain": "h=n-q with 0<=h<=n",
            "C_monotone_directions": {
                "common": "-20; use common<=1",
                "marked_neighbor_excess_u": "36; set xu=0",
                "marked_neighbor_excess_v": "36; set xv=0",
                "wedges": "-42; use the degree-excess upper bound",
            },
            "degree_excess_cone": {
                "parameters": "x=du-1[du>0], y=dv-1[dv>0], r=e-1-x-y",
                "simplex_constraint": "x+y+r=e-1<=n-2",
                "wedge_upper": "W<=C(du,2)+C(dv,2)+C(r+1,2)",
                "proof": (
                    "If c is the number of nontrivial forest components, total positive-degree "
                    "excess is e-c.  Unselected excess is e-c-x-y, so r is that excess plus c-1; "
                    "convex concentration bounds the unselected wedge contribution by C(r+1,2)."
                ),
            },
            "relaxed_form": str(relaxed),
            "total_simplex_bernstein": certificate,
            "edgeless_lower": str(edgeless),
        },
        "g6": {
            "form": str(g6),
            "exact_nonnegative_decomposition": [
                "28*(e-du-dv+adjacent)",
                "14*(n-du-dv)",
                "162*n",
                "8*adjacent",
                "6*(n-q)",
                "6*eu",
                "6*ev",
                "161",
            ],
            "forest_facts": [
                "e-du-dv+adjacent is the edge count after deleting both marks",
                "du+dv<=n for distinct vertices in a forest",
                "q<=n",
                "adjacent,eu,ev are nonnegative indicators",
            ],
        },
        "g7": str(g7),
        "g8": str(g8),
        "scope": (
            "Exact universal audit only for rank-five bundle coefficients g5 through g8. "
            "It does not prove g1 through g4, the rank-five Bundle Payment Lemma, all N5, "
            "rank-four FML, or Erdos Problem 993."
        ),
        "dependencies": {
            DISCOVERY.name: sha256(DISCOVERY),
            PRODUCER_SOURCE.name: sha256(PRODUCER_SOURCE),
            PRODUCER_REPORT.name: sha256(PRODUCER_REPORT),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "direct_gamma_reconstruction": report["direct_gamma_reconstruction"],
        "g5_certificate": certificate,
        "g6": report["g6"],
        "g7": report["g7"],
        "g8": report["g8"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", sha256(OUTPUT))
    print(report["marker"])


if __name__ == "__main__":
    main()
