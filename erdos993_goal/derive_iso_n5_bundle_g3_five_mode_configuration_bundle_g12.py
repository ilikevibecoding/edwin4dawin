#!/usr/bin/env python3
"""Exact configuration reduction for rank-five whole-bundle g3.

The reduction starts from the third forward difference of the defining
rank-five payment, checks the frozen degree-eight coefficient, substitutes
exact forest independent-set formulas through i5, and specializes the two
one-neighbour modes.  It also freezes the exact polynomial-row substitutions
for both corrected internal-spine broom modes.  Positivity is not asserted.
"""

from __future__ import annotations

import hashlib
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import add_xd, isolate_multiply, nested_rank


HERE = Path(__file__).resolve().parent
ROOT = HERE / "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G3_FIVE_MODE_CONFIGURATION_BUNDLE_G12"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose_poly(value, rank):
    value = sp.sympify(value)
    return sp.expand(sp.prod(value - j for j in range(rank)) / sp.Integer(factorial(rank)))


def multiply(left, right, maximum=5):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, rank - j) for j in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def add_rows(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def shift_x(row):
    return tuple(at(row, rank - 1) for rank in range(len(row)))


def isolate_row(number, maximum=5):
    return tuple(choose_poly(number, rank) for rank in range(maximum + 1))


def path_row(order, maximum=5):
    order = sp.sympify(order)
    if order.is_Integer:
        value = int(order)
        if value == -2:
            return (sp.Integer(0),) * (maximum + 1)
        if value <= 0:
            return (sp.Integer(1),) + (sp.Integer(0),) * maximum
        return tuple(
            sp.Integer(comb(value - rank + 1, rank))
            if value - rank + 1 >= rank else sp.Integer(0)
            for rank in range(maximum + 1)
        )
    return tuple(choose_poly(order - rank + 1, rank) for rank in range(maximum + 1))


def broom_rows(length, collisions):
    """X=I(A), U=I(A-u), Y=I(A-a), Z=I(A-{a,u})."""
    leaves = isolate_row(collisions)
    p1, p2, p3 = path_row(length - 1), path_row(length - 2), path_row(length - 3)
    u_deleted = multiply(leaves, p1)
    both_deleted = multiply(leaves, p2)
    whole = add_rows(u_deleted, shift_x(p2))
    if sp.sympify(length).is_Integer and int(length) == 1:
        attachment_deleted = leaves
    else:
        attachment_deleted = add_rows(both_deleted, shift_x(p3))
    return whole, u_deleted, attachment_deleted, both_deleted


def raw_g3():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    t0 = add_xd(crows, drows)
    values = []
    for number in range(4):
        tm = add_xd(isolate_multiply(crows, number, 6), drows)
        lower = sum(nested_rank(isolate_multiply(crows, t, 5), 4) for t in range(number))
        values.append(sp.expand(nested_rank(tm, 5) - nested_rank(t0, 5) - lower))
    return sp.expand(values[3] - 3 * values[2] + 3 * values[1] - values[0])


def i2(n, e):
    return sp.expand(choose_poly(n, 2) - e)


def i3(n, e, wedges):
    return sp.expand(choose_poly(n, 3) - e * (n - 2) + wedges)


def i4(n, e, wedges, connected3):
    return sp.expand(
        choose_poly(n, 4) - e * choose_poly(n - 2, 2)
        + choose_poly(e, 2) + wedges * (n - 4) - connected3
    )


def i5(n, e, wedges, connected3, three_edge_five, connected4):
    return sp.expand(
        choose_poly(n, 5) - e * choose_poly(n - 2, 3)
        + choose_poly(e, 2) * (n - 4) + wedges * choose_poly(n - 4, 2)
        - connected3 * (n - 4) - three_edge_five + connected4
    )


def c_forest_rules():
    n, e, du, dv, adjacent = sp.symbols("n C_edges C_degree_u C_degree_v C_adjacent")
    wedges, xu, xv, common = sp.symbols(
        "C_wedges C_neighbor_excess_u C_neighbor_excess_v C_common_neighbor"
    )
    re, ru, rv, rw = sp.symbols(
        "C_connected3_E C_connected3_U C_connected3_V C_connected3_W"
    )
    qe, qu, qv = sp.symbols("C_three_edge_five_E C_three_edge_five_U C_three_edge_five_V")
    te, tu, tv = sp.symbols("C_connected4_E C_connected4_U C_connected4_V")
    wu = wedges - choose_poly(du, 2) - xu
    wv = wedges - choose_poly(dv, 2) - xv
    ww = (
        wedges - choose_poly(du, 2) - choose_poly(dv, 2) - xu - xv
        + adjacent * (du + dv - 2) + common
    )
    order = {"E": n, "U": n - 1, "V": n - 1, "W": n - 2}
    edges = {"E": e, "U": e - du, "V": e - dv, "W": e - du - dv + adjacent}
    wedge = {"E": wedges, "U": wu, "V": wv, "W": ww}
    r3 = {"E": re, "U": ru, "V": rv, "W": rw}
    q35 = {"E": qe, "U": qu, "V": qv}
    r4 = {"E": te, "U": tu, "V": tv}
    rules = {}
    for name in "EUVW":
        rules[sp.Symbol(f"c{name}0")] = 1
        rules[sp.Symbol(f"c{name}1")] = order[name]
        rules[sp.Symbol(f"c{name}2")] = i2(order[name], edges[name])
        rules[sp.Symbol(f"c{name}3")] = i3(order[name], edges[name], wedge[name])
        rules[sp.Symbol(f"c{name}4")] = i4(order[name], edges[name], wedge[name], r3[name])
        if name != "W":
            rules[sp.Symbol(f"c{name}5")] = i5(
                order[name], edges[name], wedge[name], r3[name], q35[name], r4[name]
            )
    variables = {
        "base": (n, e, du, dv, adjacent, wedges, xu, xv, common),
        "connected3": (re, ru, rv, rw),
        "three_edge_five": (qe, qu, qv),
        "connected4": (te, tu, tv),
    }
    return rules, variables


def d_forest_rules():
    q, eu, ev = sp.symbols("q epsilon_u epsilon_v")
    e, du, dv, adjacent = sp.symbols("D_edges D_degree_u D_degree_v D_adjacent")
    wedges, xu, xv, common = sp.symbols(
        "D_wedges D_neighbor_excess_u D_neighbor_excess_v D_common_neighbor"
    )
    re, ru, rv = sp.symbols("D_connected3_E D_connected3_U D_connected3_V")
    wu = wedges - choose_poly(du, 2) - xu
    wv = wedges - choose_poly(dv, 2) - xv
    ww = (
        wedges - choose_poly(du, 2) - choose_poly(dv, 2) - xu - xv
        + adjacent * (du + dv - 2) + common
    )
    order = {"E": q, "U": q - eu, "V": q - ev, "W": q - eu - ev}
    edges = {"E": e, "U": e - du, "V": e - dv, "W": e - du - dv + adjacent}
    wedge = {"E": wedges, "U": wu, "V": wv, "W": ww}
    r3 = {"E": re, "U": ru, "V": rv}
    rules = {}
    for name in "EUVW":
        rules[sp.Symbol(f"d{name}0")] = 1
        rules[sp.Symbol(f"d{name}1")] = order[name]
        rules[sp.Symbol(f"d{name}2")] = i2(order[name], edges[name])
        rules[sp.Symbol(f"d{name}3")] = i3(order[name], edges[name], wedge[name])
        if name != "W":
            rules[sp.Symbol(f"d{name}4")] = i4(order[name], edges[name], wedge[name], r3[name])
    variables = {
        "base": (q, eu, ev, e, du, dv, adjacent, wedges, xu, xv, common),
        "connected3": (re, ru, rv),
    }
    return rules, variables


def expression_record(expression, motif_symbols=()):
    expression = sp.factor(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    motif = sp.factor(sum(sp.diff(expression, symbol) * symbol for symbol in motif_symbols))
    residual = sp.factor(expression - motif)
    return {
        "form": str(expression),
        "expanded_term_count": len(polynomial.terms()),
        "negative_scalar_coefficient_count": sum(c.is_negative is True for c in polynomial.coeffs()),
        "high_motif_part": str(motif),
        "residual_without_high_motifs": str(residual),
    }


def internal_rules(length, collisions, endpoint):
    r0 = tuple(sp.Symbol(f"r0_{j}") for j in range(6))
    rv = tuple(sp.Symbol(f"rv_{j}") for j in range(6))
    rp = tuple(sp.Symbol(f"rp_{j}") for j in range(6))
    rpv = tuple(sp.Symbol(f"rpv_{j}") for j in range(6))
    x, u, y, z = broom_rows(length, collisions)
    crows = (multiply(x, r0), multiply(u, r0), multiply(x, rv), multiply(u, rv))
    if endpoint:
        drows = (multiply(y, rv), multiply(z, rv), multiply(y, rv), multiply(z, rv))
    else:
        drows = (multiply(y, rp), multiply(z, rp), multiply(y, rpv), multiply(z, rpv))
    rules = {
        **{sp.Symbol(f"c{name}{j}"): row[j] for name, row in zip("EUVW", crows) for j in range(6)},
        **{sp.Symbol(f"d{name}{j}"): row[j] for name, row in zip("EUVW", drows) for j in range(6)},
    }
    return rules


def main():
    root = json.loads(ROOT.read_text(encoding="utf-8"))
    raw = raw_g3()
    symbols = {str(s): s for s in raw.free_symbols}
    frozen = sp.sympify(root["binomial_coefficients"][3]["factor"], locals=symbols)
    assert sp.expand(raw - frozen) == 0

    crules, cvars = c_forest_rules()
    drules, dvars = d_forest_rules()
    generic = sp.factor(raw.subs(crules).subs(drules))
    all_motifs = cvars["connected3"] + cvars["three_edge_five"] + cvars["connected4"] + dvars["connected3"]

    d_equals_c = {sp.Symbol(f"d{name}{j}"): sp.Symbol(f"c{name}{j}") for name in "EUVW" for j in range(5)}
    no_mark_root = sp.factor(raw.subs(d_equals_c).subs(crules))
    endpoint_rows = {}
    for j in range(5):
        endpoint_rows.update({
            sp.Symbol(f"dE{j}"): sp.Symbol(f"cU{j}"),
            sp.Symbol(f"dU{j}"): sp.Symbol(f"cU{j}"),
            sp.Symbol(f"dV{j}"): sp.Symbol(f"cW{j}"),
            sp.Symbol(f"dW{j}"): sp.Symbol(f"cW{j}"),
        })
    singleton_endpoint = sp.factor(raw.subs(endpoint_rows).subs(crules))

    ell, k = sp.symbols("ell k", integer=True, nonnegative=True)
    internal = {}
    for endpoint, label in ((False, "internal_spine_ordinary"), (True, "internal_spine_endpoint")):
        tail = sp.factor(raw.subs(internal_rules(ell, k, endpoint)))
        small = {
            str(length): expression_record(sp.factor(raw.subs(internal_rules(sp.Integer(length), k, endpoint))))
            for length in range(1, 6)
        }
        internal[label] = {"tail": expression_record(tail), "small_ell_1_through_5": small}

    report = {
        "marker": MARKER,
        "identity": "g3=Delta_M^3 Gamma_M at M=0 for rank five",
        "generic_raw_exact_match": True,
        "raw_term_count": len(sp.Poly(raw, *sorted(raw.free_symbols, key=str)).terms()),
        "generic_forest_invariant": expression_record(generic, all_motifs),
        "modes": {
            "no_mark_root_k0": expression_record(
                no_mark_root,
                cvars["connected3"] + cvars["three_edge_five"] + cvars["connected4"],
            ),
            "singleton_ordinary": {
                "configuration": "C is a two-marked forest G; D=G-p for an unmarked p distinct from u,v",
                "form": "generic_forest_invariant with q=n-1, epsilon_u=epsilon_v=1 and D the indicated vertex-deletion invariants",
                "exact_generic_form_key": "generic_forest_invariant",
            },
            "singleton_endpoint": expression_record(
                singleton_endpoint,
                cvars["connected3"] + cvars["three_edge_five"] + cvars["connected4"],
            ),
            **internal,
        },
        "corrected_internal_child_rows": {
            "X": "I(A)", "U": "I(A-u)", "Y": "I(A-a)", "Z": "I(A-{a,u})",
            "ordinary_C": "(X R0,U R0,X Rv,U Rv)",
            "ordinary_D": "(Y Rp,Z Rp,Y Rpv,Z Rpv)",
            "endpoint_D": "(Y Rv,Z Rv,Y Rv,Z Rv)",
            "tail": "ell symbolic (valid ell>=6), k>=0",
            "small": "ell=1,...,5 exact truncated path branches, k>=0",
        },
        "proof_status": (
            "Exact reduction only. Scalar coefficient signs in these polynomial-coordinate "
            "forms are not a valid independent cone, and no all-order sign theorem is asserted."
        ),
        "scope": "Rank-five whole-bundle coefficient g3 only; no N5 induction or Problem 993 claim.",
        "dependencies": {ROOT.name: sha256(ROOT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "raw_term_count": report["raw_term_count"],
        "generic_terms": report["generic_forest_invariant"]["expanded_term_count"],
        "mode_terms": {
            name: (value["expanded_term_count"] if "expanded_term_count" in value else value["tail"]["expanded_term_count"] if "tail" in value else None)
            for name, value in report["modes"].items()
        },
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
