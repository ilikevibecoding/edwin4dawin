#!/usr/bin/env python3
"""Independent exact audit of the universal rank-six coefficients g8,g9,g10.

The defining N6/N5 telescope is reconstructed at the eleven integer bundle
sizes 0,...,10.  No algebra or proof routine is imported from the producer.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_top_coefficients_independent_audit_exact_"
    "g2_structure_nonadjacent_20260830.json"
)
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_TOP_COEFFICIENTS_G2_STRUCTURE_NONADJACENT"

PINS = {
    "identity_source": (
        "derive_iso_n6_bundle_polynomial_root.py",
        "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    ),
    "identity_report": (
        "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    ),
    "producer_source": (
        "prove_iso_n6_bundle_top_coefficients_root.py",
        "D66274CD4E4F1D7B681662DDAA68B97985E2684B16588234C287B4115D12A970",
    ),
    "producer_report": (
        "iso_n6_bundle_top_coefficients_exact_root_20260830.json",
        "628BFD655335BF703C031687B73F32824D368466E57241E745FD48C6E82FC4BF",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def nested(rows, rank):
    """Literal marked four-minor functional N_rank on four coefficient rows."""
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


def isolate_multiply(rows, amount, maximum):
    return tuple(
        tuple(
            sp.expand(
                sum(
                    sp.Integer(comb(amount, offset)) * at(row, degree - offset)
                    for offset in range(degree + 1)
                )
            )
            for degree in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(crows, drows, maximum):
    return tuple(
        tuple(
            sp.expand(at(crow, degree) + at(drow, degree - 1))
            for degree in range(maximum + 1)
        )
        for crow, drow in zip(crows, drows)
    )


def forward_differences(values):
    row = list(values)
    result = []
    while row:
        result.append(sp.expand(row[0]))
        row = [sp.expand(row[index + 1] - row[index]) for index in range(len(row) - 1)]
    return result


def reconstruct_top_coefficients():
    maximum = 7
    crows = tuple(tuple(sp.symbols(f"c{name}0:{maximum + 1}")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:{maximum + 1}")) for name in "EUVW")
    base = add_xd(crows, drows, maximum)
    base_n6 = nested(base, 6)
    gamma = []
    for amount in range(11):
        enlarged = add_xd(isolate_multiply(crows, amount, maximum), drows, maximum)
        lower = sum(nested(isolate_multiply(crows, offset, maximum), 5) for offset in range(amount))
        gamma.append(sp.expand(nested(enlarged, 6) - base_n6 - lower))
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 11 and coefficients[0] == 0
    return coefficients, crows, drows


def main() -> None:
    checked = {}
    for key, (name, expected) in PINS.items():
        actual = sha256(HERE / name)
        assert actual == expected, (key, expected, actual)
        checked[key] = {"file": name, "sha256": actual}

    identity_report = json.loads((HERE / PINS["identity_report"][0]).read_text())
    producer = json.loads((HERE / PINS["producer_report"][0]).read_text())
    assert identity_report["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    assert producer["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_TOP_COEFFICIENTS_ROOT"
    assert producer["source_sha256"] == PINS["producer_source"][1]

    coefficients, crows, drows = reconstruct_top_coefficients()
    symbols = {
        str(symbol): symbol
        for expression in coefficients
        for symbol in expression.free_symbols
    }
    reported_matches = {}
    for index in (8, 9, 10):
        recorded = identity_report["binomial_coefficients"][index]
        assert recorded["binomial_rank"] == index
        recorded_expression = sp.sympify(recorded["factor"], locals=symbols)
        assert sp.expand(coefficients[index] - recorded_expression) == 0
        reported_matches[f"g{index}"] = True

    n, q, epsilon_u, epsilon_v = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    edge_count, degree_u, degree_v, adjacent = sp.symbols(
        "edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    symbols.update({
        "n": n,
        "q": q,
        "epsilon_u": epsilon_u,
        "epsilon_v": epsilon_v,
        "edge_count": edge_count,
        "degree_u": degree_u,
        "degree_v": degree_v,
        "adjacent": adjacent,
    })
    structural = {}
    for row in crows + drows:
        structural[row[0]] = 1
    c_by_name = dict(zip("EUVW", crows))
    d_by_name = dict(zip("EUVW", drows))
    structural.update({
        c_by_name["E"][1]: n,
        c_by_name["U"][1]: n - 1,
        c_by_name["V"][1]: n - 1,
        c_by_name["W"][1]: n - 2,
        d_by_name["E"][1]: q,
        d_by_name["U"][1]: q - epsilon_u,
        d_by_name["V"][1]: q - epsilon_v,
        d_by_name["W"][1]: q - epsilon_u - epsilon_v,
    })
    second_counts = {
        c_by_name["E"][2]: sp.binomial(n, 2) - edge_count,
        c_by_name["U"][2]: sp.binomial(n - 1, 2) - edge_count + degree_u,
        c_by_name["V"][2]: sp.binomial(n - 1, 2) - edge_count + degree_v,
        c_by_name["W"][2]: (
            sp.binomial(n - 2, 2) - edge_count + degree_u + degree_v - adjacent
        ),
    }

    g10 = sp.factor(coefficients[10].subs(structural))
    g9 = sp.factor(coefficients[9].subs(structural))
    g8_first = sp.factor(coefficients[8].subs(structural))
    g8_counts = sp.factor(sp.expand_func(g8_first.subs(second_counts)))
    expected_g8 = 14 * (
        8 * adjacent - 9 * degree_u - 9 * degree_v + 6 * edge_count + 45 * n + 63
    )
    lower_bound = 14 * (36 * n + 63)
    remainder = 14 * (
        8 * adjacent + 6 * edge_count + 9 * (n - degree_u - degree_v)
    )
    assert g10 == 0
    assert sp.expand(g9 - 630) == 0
    assert sp.expand(g8_counts - expected_g8) == 0
    assert sp.expand(g8_counts - lower_bound - remainder) == 0

    producer_values = producer["proved_top_coefficients"]
    assert sp.expand(sp.sympify(producer_values["g10"]) - g10) == 0
    assert sp.expand(sp.sympify(producer_values["g9"]) - g9) == 0
    assert sp.expand(sp.sympify(producer_values["g8_first_face"], locals=symbols) - g8_first) == 0
    count_locals = {
        "n": n,
        "edge_count": edge_count,
        "degree_u": degree_u,
        "degree_v": degree_v,
        "adjacent": adjacent,
    }
    assert sp.expand(sp.sympify(producer_values["g8_forest_counts"], locals=count_locals) - g8_counts) == 0
    assert sp.expand(sp.sympify(producer_values["g8_lower_bound"], locals=count_locals) - lower_bound) == 0
    assert sp.expand(
        sp.sympify(producer_values["g8_nonnegative_remainder"], locals=count_locals) - remainder
    ) == 0

    expression_stream = "".join(sp.srepr(sp.expand(coefficients[index])) for index in (8, 9, 10))
    report = {
        "marker": MARKER,
        "theorem_audited": (
            "For every actual rank-six marked-forest bundle cell, "
            "g8>=504*n+882>0, g9=630, and g10=0."
        ),
        "independent_reconstruction": {
            "definition": (
                "Gamma_M=N6((1+x)^M C+xD)-N6(C+xD)-"
                "sum_(t=0)^(M-1)N5((1+x)^t C)"
            ),
            "integer_nodes": list(range(11)),
            "forward_differences": 11,
            "identity_report_matches": reported_matches,
            "top_expression_stream_sha256": hashlib.sha256(expression_stream.encode()).hexdigest().upper(),
        },
        "forest_substitution": {
            "g8": str(g8_counts),
            "g8_lower_bound": str(lower_bound),
            "g8_nonnegative_remainder": str(remainder),
            "g9": str(g9),
            "g10": str(g10),
            "degree_sum_lemma": (
                "For adjacent u,v, their neighbors other than each other are disjoint, so "
                "deg(u)+deg(v)<=n. For nonadjacent u,v, two common neighbors would form a cycle, "
                "so deg(u)+deg(v)<=n-1<=n."
            ),
            "sign_inputs": [
                "edge_count>=0",
                "adjacent is 0 or 1",
                "n-degree_u-degree_v>=0",
                "n>=2 for two distinct marks",
            ],
        },
        "pins": checked,
        "scope_guard": (
            "This independently certifies only g8,g9,g10. It does not certify g1,...,g7, "
            "the complete rank-six bundle payment, all-N6, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": report["marker"],
        "g8": report["forest_substitution"]["g8"],
        "g8_lower_bound": report["forest_substitution"]["g8_lower_bound"],
        "g9": report["forest_substitution"]["g9"],
        "g10": report["forest_substitution"]["g10"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
