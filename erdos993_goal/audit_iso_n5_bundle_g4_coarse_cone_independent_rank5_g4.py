#!/usr/bin/env python3
"""Independent exact audit of the universal rank-five bundle g4 theorem.

This audit does not import the producer proof or its algebraic derivation.
It reconstructs g4 as a fourth forward difference of the defining payment,
reconstructs the 103-term forest invariant, verifies the coarse D payment,
and independently replays every tensor-Bernstein branch of the C cone.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = HERE / "prove_iso_n5_bundle_g4_coarse_cone_root.py"
PRODUCER_REPORT = HERE / "iso_n5_bundle_g4_coarse_cone_exact_root_20260829.json"
CONFIG = HERE / "iso_n5_bundle_g4_forest_invariant_root_20260829.json"
DIRECT_CENSUS = HERE / "iso_n5_bundle_g4_forest_census_probe_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g4_coarse_cone_independent_audit_rank5_g4_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank: int):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose_polynomial(number, rank: int):
    if rank < 0:
        return sp.Integer(0)
    return sp.prod(number - j for j in range(rank)) / factorial(rank)


def isolate_rows(rows, number: int, maximum: int):
    return tuple(
        tuple(
            sp.expand(sum(comb(number, shift) * at(row, rank - shift)
                          for shift in range(rank + 1)))
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_support(rows, drows):
    return tuple(
        tuple(sp.expand(at(row, rank) + at(drow, rank - 1))
              for rank in range(len(row)))
        for row, drow in zip(rows, drows)
    )


def nested(rows, rank: int):
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


def independently_derive_raw_g4():
    """Use integer bundle sizes only; no producer Bernoulli-sum code."""
    maximum = 6
    crows = tuple(tuple(sp.symbols(f"c{name}0:{maximum + 1}")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:{maximum + 1}")) for name in "EUVW")
    t0 = add_support(crows, drows)

    def gamma(number: int):
        tm = add_support(isolate_rows(crows, number, maximum), drows)
        lower = sum(nested(isolate_rows(crows, t, 5), 4) for t in range(number))
        return sp.expand(nested(tm, 5) - nested(t0, 5) - lower)

    # binom(M,4) coefficient is Delta^4 Gamma(0), regardless of later terms.
    return sp.expand(sum((-1) ** (4 - number) * comb(4, number) * gamma(number)
                         for number in range(5)))


def c2(value):
    return value * (value - 1) / 2


def c3(value):
    return value * (value - 1) * (value - 2) / 6


def c4(value):
    return value * (value - 1) * (value - 2) * (value - 3) / 24


def i2(order, edges):
    return c2(order) - edges


def i3(order, edges, wedges):
    return c3(order) - edges * (order - 2) + wedges


def i4(order, edges, wedges, connected3):
    return c4(order) - edges * c2(order - 2) + wedges * (order - 4) + c2(edges) - connected3


def independently_reduce_to_forest_invariants(raw):
    names = {str(symbol): symbol for symbol in raw.free_symbols}
    n, q = sp.symbols("n q", integer=True, nonnegative=True)
    e, du, dv, adjacent = sp.symbols(
        "C_edges C_degree_u C_degree_v C_adjacent", integer=True, nonnegative=True
    )
    wedges, xu, xv, common = sp.symbols(
        "C_wedges C_neighbor_excess_u C_neighbor_excess_v C_common_neighbor",
        integer=True, nonnegative=True,
    )
    re, ru, rv, rw = sp.symbols(
        "C_connected3_E C_connected3_U C_connected3_V C_connected3_W",
        integer=True, nonnegative=True,
    )
    de, ddu, ddv, dadjacent = sp.symbols(
        "D_edges D_degree_u D_degree_v D_adjacent", integer=True, nonnegative=True
    )
    dwedges, dxu, dxv, dcommon = sp.symbols(
        "D_wedges D_neighbor_excess_u D_neighbor_excess_v D_common_neighbor",
        integer=True, nonnegative=True,
    )
    eu, ev = sp.symbols("epsilon_u epsilon_v", integer=True, nonnegative=True)
    cuw = wedges - c2(du) - xu
    cvw = wedges - c2(dv) - xv
    cww = wedges - c2(du) - c2(dv) - xu - xv + adjacent * (du + dv - 2) + common
    duw = dwedges - c2(ddu) - dxu
    dvw = dwedges - c2(ddv) - dxv
    dww = dwedges - c2(ddu) - c2(ddv) - dxu - dxv + dadjacent * (ddu + ddv - 2) + dcommon
    values = {
        "cE0": 1, "cU0": 1, "cV0": 1, "cW0": 1,
        "dE0": 1, "dU0": 1, "dV0": 1, "dW0": 1,
        "cE1": n, "cU1": n - 1, "cV1": n - 1, "cW1": n - 2,
        "dE1": q, "dU1": q - eu, "dV1": q - ev, "dW1": q - eu - ev,
        "cE2": i2(n, e),
        "cU2": i2(n - 1, e - du),
        "cV2": i2(n - 1, e - dv),
        "cW2": i2(n - 2, e - du - dv + adjacent),
        "cE3": i3(n, e, wedges),
        "cU3": i3(n - 1, e - du, cuw),
        "cV3": i3(n - 1, e - dv, cvw),
        "cW3": i3(n - 2, e - du - dv + adjacent, cww),
        "cE4": i4(n, e, wedges, re),
        "cU4": i4(n - 1, e - du, cuw, ru),
        "cV4": i4(n - 1, e - dv, cvw, rv),
        "cW4": i4(n - 2, e - du - dv + adjacent, cww, rw),
        "dE2": i2(q, de),
        "dU2": i2(q - eu, de - ddu),
        "dV2": i2(q - ev, de - ddv),
        "dW2": i2(q - eu - ev, de - ddu - ddv + dadjacent),
        "dE3": i3(q, de, dwedges),
        "dU3": i3(q - eu, de - ddu, duw),
        "dV3": i3(q - ev, de - ddv, dvw),
        "dW3": i3(q - eu - ev, de - ddu - ddv + dadjacent, dww),
    }
    return sp.factor(raw.subs({names[key]: value for key, value in values.items() if key in names}))


def bernstein_coefficients(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(max(0, polynomial.degree(variable)) for variable in variables)
    power_terms = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        coefficient = 0
        for powers, scalar in power_terms.items():
            if all(power <= position for power, position in zip(powers, index)):
                coefficient += scalar * sp.prod(
                    sp.binomial(position, power) / sp.binomial(degree, power)
                    for power, position, degree in zip(powers, index, degrees)
                )
        yield degrees, index, sp.factor(coefficient)


def reconstruct_bernstein(records, variables, degrees):
    answer = 0
    for index, coefficient in records:
        answer += coefficient * sp.prod(
            sp.binomial(degree, position) * variable**position * (1 - variable)**(degree - position)
            for variable, degree, position in zip(variables, degrees, index)
        )
    return sp.expand(answer)


def main() -> None:
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    census = json.loads(DIRECT_CENSUS.read_text(encoding="utf-8"))
    assert producer["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G4_COARSE_CONE_ROOT"
    assert config["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_G4_FOREST_INVARIANT_ROOT"
    assert census["marker"] == "PROBE_EXACT_ISO_N5_BUNDLE_G4_FOREST_CENSUS_ROOT"

    raw = independently_derive_raw_g4()
    frozen_raw = sp.sympify(config["raw_form"])
    assert sp.expand(raw - frozen_raw) == 0
    form = independently_reduce_to_forest_invariants(raw)
    frozen_form = sp.sympify(config["forest_invariant_form"])
    frozen_names = {str(symbol): symbol for symbol in frozen_form.free_symbols}
    form = form.xreplace({symbol: frozen_names[str(symbol)] for symbol in form.free_symbols})
    assert sp.expand(form - frozen_form) == 0
    assert len(sp.Poly(sp.expand(form), *sorted(form.free_symbols, key=str)).terms()) == 103

    names = {str(symbol): symbol for symbol in form.free_symbols}
    n, q = names["n"], names["q"]
    eu, ev = names["epsilon_u"], names["epsilon_v"]
    d_symbols = tuple(symbol for symbol in form.free_symbols if str(symbol).startswith("D_"))
    d_block = sp.Add(*[
        term for term in sp.expand(form).as_ordered_terms()
        if any(symbol in term.free_symbols for symbol in d_symbols)
    ])
    c_block = sp.expand(form - d_block)
    ddu, ddv = names["D_degree_u"], names["D_degree_v"]
    dadjacent, dcommon = names["D_adjacent"], names["D_common_neighbor"]
    de, dwedges = names["D_edges"], names["D_wedges"]
    dxu, dxv = names["D_neighbor_excess_u"], names["D_neighbor_excess_v"]
    degree_payment = (
        ddu * (4 * n + 4 * q + 3 - 4 * eu + 6 * ev)
        + ddv * (4 * n + 4 * q + 3 + 6 * eu - 4 * ev)
    )
    adjacency_block = dadjacent * (
        -6 * (ddu + ddv) - 6 * (eu + ev) - 10 * n + 6 * q - 4
    )
    edge_coefficient = 4 * (eu + ev) + 2 * n - 8 * q + 2
    edge_floor = -6 * q + 2
    d_decomposition = (
        -2 * (ddu**2 + ddv**2) + degree_payment + adjacency_block
        - 6 * dcommon + de * edge_coefficient
        + 8 * dwedges - 4 * dxu - 4 * dxv
    )
    assert sp.expand(d_block - d_decomposition) == 0
    d_lower = -8 * q**2 + 8 * q - 10 * n - 24
    payment_identity = (
        2 * (q**2 - ddu**2 - ddv**2)
        + degree_payment
        + adjacency_block + 10 * n + 16
        + 6 * (1 - dcommon)
        + de * edge_coefficient - edge_floor * (q - 1)
        + 4 * (2 * dwedges - dxu - dxv)
    )
    assert sp.expand((d_block - d_lower) - payment_identity) == 0
    # Each summand has the stated elementary forest proof:
    # * ddu+ddv<=q => ddu^2+ddv^2<=q^2;
    # * degree_payment has coefficients >=7 for n>=2;
    # * if dadjacent=0 its payment is 10n+16, while if dadjacent=1,
    #   eu=ev=1 and it is 6(q-ddu-ddv);
    # * dcommon<=1;
    # * edge_coefficient=edge_floor+4(eu+ev)+2(n-q), and de<=q-1;
    #   q=0 is the separate trivial de=0 branch;
    # * 2*D_wedges>=DXu+DXv center by center.

    connected3 = tuple(names[key] for key in (
        "C_connected3_E", "C_connected3_U", "C_connected3_V", "C_connected3_W"
    ))
    cxu, cxv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    ccommon, cwedges = names["C_common_neighbor"], names["C_wedges"]
    assert tuple(sp.diff(c_block, symbol) for symbol in connected3) == (2, 14, 14, 6)
    assert sp.diff(c_block, cxu) == sp.diff(c_block, cxv) == 36 * n - 61
    assert sp.diff(c_block, ccommon) == 13 - 20 * n
    assert sp.diff(c_block, cwedges) == 113 - 42 * n
    relaxed = sp.expand(
        c_block.subs({symbol: 0 for symbol in (*connected3, cxu, cxv)}).subs(ccommon, 1)
        + d_lower
    )

    t, d = sp.symbols("t d", nonnegative=True)
    edgeless_substitutions = {
        names["C_adjacent"]: 0, names["C_degree_u"]: 0,
        names["C_degree_v"]: 0, names["C_edges"]: 0,
        cwedges: 0, cxu: 0, cxv: 0, ccommon: 0,
        **{symbol: 0 for symbol in connected3},
        **{symbol: 0 for symbol in d_symbols},
    }
    edgeless_count = 0
    edgeless_minimum = None
    for epsilon_u, epsilon_v in itertools.product((0, 1), repeat=2):
        value = sp.factor(form.subs(edgeless_substitutions).subs({
            n: t + 2, q: (t + 2) * (1 - d), eu: epsilon_u, ev: epsilon_v,
        }))
        records = []
        for degrees, index, coefficient in bernstein_coefficients(value, (d,)):
            assert all(entry >= 0 for entry in sp.Poly(sp.expand(coefficient), t).all_coeffs())
            records.append((index, coefficient))
            value0 = coefficient.subs(t, 0)
            edgeless_minimum = value0 if edgeless_minimum is None else min(edgeless_minimum, value0)
            edgeless_count += 1
        assert sp.expand(reconstruct_bernstein(records, (d,), degrees) - value) == 0

    a, b, c = sp.symbols("a b c", nonnegative=True)
    box = (a, b, c, d)
    branches = ((0, 0, 0), (0, 0, 1), (0, 1, 0), (0, 1, 1), (1, 1, 1))
    stream = []
    profiles = set()
    minimum_at_t0 = None
    branch_counts = {}
    for adjacent, zu, zv in branches:
        for epsilon_u, epsilon_v in itertools.product((0, 1), repeat=2):
            x = t * a if zu else 0
            remainder = t * (1 - a) if zu else t
            y = remainder * b if zv else 0
            remainder = remainder * (1 - b) if zv else remainder
            r = remainder * c
            degree_u, degree_v = zu + x, zv + y
            edge_count = 1 + x + y + r
            wedge_cap = c2(degree_u) + c2(degree_v) + c2(r + 1)
            lower = sp.factor(relaxed.subs({
                n: t + 2, q: (t + 2) * (1 - d),
                eu: epsilon_u, ev: epsilon_v,
                names["C_adjacent"]: adjacent,
                names["C_degree_u"]: degree_u,
                names["C_degree_v"]: degree_v,
                names["C_edges"]: edge_count,
                cwedges: wedge_cap,
            }))
            branch = (adjacent, zu, zv, epsilon_u, epsilon_v)
            records = []
            count = 0
            for degrees, index, coefficient in bernstein_coefficients(lower, box):
                profiles.add(degrees)
                t_coefficients = sp.Poly(sp.expand(coefficient), t).all_coeffs()
                assert all(entry >= 0 for entry in t_coefficients)
                records.append((index, coefficient))
                witness = {
                    "branch_adj_zu_zv_eu_ev": list(branch),
                    "degree_profile": list(degrees),
                    "index": list(index),
                    "coefficient": str(coefficient),
                    "t_power_coefficients": list(map(str, t_coefficients)),
                }
                stream.append(witness)
                at_zero = coefficient.subs(t, 0)
                minimum_at_t0 = at_zero if minimum_at_t0 is None else min(minimum_at_t0, at_zero)
                count += 1
            assert sp.expand(reconstruct_bernstein(records, box, degrees) - lower) == 0
            branch_counts["".join(map(str, branch))] = count

    assert len(stream) == 1200
    assert minimum_at_t0 == 2
    assert profiles == {(0, 0, 2, 3), (0, 2, 2, 3), (2, 0, 2, 3), (2, 2, 2, 3)}
    stream_sha = hashlib.sha256(json.dumps(stream, sort_keys=True).encode()).hexdigest().upper()
    frozen_certificate = producer["nonempty_C_bernstein"]
    assert frozen_certificate["coefficient_count"] == len(stream)
    assert frozen_certificate["minimum_at_n2"] == str(minimum_at_t0)
    assert frozen_certificate["ordered_stream_sha256"] == stream_sha
    assert {key: row["coefficients"] for key, row in frozen_certificate["branches"].items()} == branch_counts
    assert census["configuration_cells"] == 10932
    assert census["negative_g4_cells"] == 0
    assert census["minima_g1_to_g4"]["4"] == 175

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_BUNDLE_G4_COARSE_CONE_AUDIT_RANK5_G4",
        "theorem_audited": producer["theorem"],
        "independent_reconstruction": {
            "raw_g4": "fourth forward difference of the defining Gamma at M=0,1,2,3,4",
            "raw_term_count": len(sp.Poly(raw, *sorted(raw.free_symbols, key=str)).terms()),
            "forest_invariant_term_count": 103,
            "exact_match_to_frozen_invariant": True,
        },
        "D_lower_audit": {
            "lower_bound": str(d_lower),
            "exact_payment_identity": str(sp.factor(payment_identity)),
            "edge_q0_branch": "q=0 forces D_edges=0; for q>=1 the edge floor is nonpositive",
            "status": "verified from elementary forest inequalities",
        },
        "C_cone_audit": {
            "wedge_cap_proof": (
                "For nonmark nonisolated vertices w put z_w=deg(w)-1.  If c is the "
                "number of nontrivial forest components, sum z_w<=r with the exact "
                "slack c-1; convexity gives sum C(z_w+1,2)<=C(r+1,2)."
            ),
            "wedge_sign_boundary": (
                "At n=2 the only nonempty forest is K2 and both wedge terms are zero; "
                "for integer n>=3 the wedge coefficient 113-42n is negative."
            ),
            "edgeless_bernstein_coefficients": edgeless_count,
            "edgeless_minimum_at_n2": str(edgeless_minimum),
            "nonempty_branches": len(branch_counts),
            "nonempty_bernstein_coefficients": len(stream),
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "minimum_at_n2": str(minimum_at_t0),
            "ordered_stream_sha256": stream_sha,
            "exact_bernstein_reconstructions": len(branch_counts) + 4,
        },
        "independent_direct_census_cross_check": {
            "cells": census["configuration_cells"],
            "negative": census["negative_g4_cells"],
            "minimum": census["minima_g1_to_g4"]["4"],
        },
        "dependencies": {
            path.name: sha256(path)
            for path in (PRODUCER_SOURCE, PRODUCER_REPORT, CONFIG, DIRECT_CENSUS)
        },
        "scope": (
            "Independent exact audit of universal rank-five g4 positivity only. "
            "It does not prove g1-g3, all N5, or Erdos Problem #993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "raw_term_count": report["independent_reconstruction"]["raw_term_count"],
        "forest_invariant_term_count": 103,
        "bernstein_coefficients": len(stream),
        "minimum_at_n2": str(minimum_at_t0),
        "stream_sha256": stream_sha,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
