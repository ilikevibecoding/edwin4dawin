#!/usr/bin/env python3
"""Independent exact audit of the rank-four internal-spine broom mode.

This file intentionally rebuilds the four-minor functional and all row
reductions locally.  It does not import any producer proof functions.

The geometric input is a deepest whole-bundle support s lying internally on
the protected u--v connector.  Its child side is a one-ended broom B_(ell,k):
a path of ell>=1 vertices from the attachment a to the marked endpoint u,
plus k>=0 leaves at u.  The parent side is a forest F containing p and v in
one component.  The ordinary and endpoint (p=v) modes are both treated.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import sys
from collections import Counter
from functools import lru_cache
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_internal_spine_broom_g12_independent_exact_g1_bernstein_20260829.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_G12_G1_BERNSTEIN"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank: int):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose_poly(value, rank: int):
    return sp.expand(
        sp.prod(sp.sympify(value) - offset for offset in range(rank))
        / sp.factorial(rank)
    )


def add_rows(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def shift_x(row):
    return tuple(at(row, rank - 1) for rank in range(len(row)))


def multiply(left, right, maximum: int = 5):
    return tuple(
        sp.expand(
            sum(at(left, shift) * at(right, rank - shift) for shift in range(rank + 1))
        )
        for rank in range(maximum + 1)
    )


def isolate_row(number, maximum: int = 5):
    return tuple(choose_poly(number, rank) for rank in range(maximum + 1))


def path_row(order, maximum: int = 5):
    """I_j(P_order), with P_0 and the coalescence P_-1 both equal to 1."""
    order = sp.sympify(order)
    if order.is_Integer:
        value = int(order)
        if value <= 0:
            return (sp.Integer(1),) + (sp.Integer(0),) * maximum
        return tuple(
            sp.Integer(comb(value - rank + 1, rank))
            if value - rank + 1 >= rank
            else sp.Integer(0)
            for rank in range(maximum + 1)
        )
    return tuple(
        choose_poly(order - rank + 1, rank) for rank in range(maximum + 1)
    )


def broom_factors(length, leaves):
    """Return X=I(A), U=I(A-u), Y=I(A-a), Z=I(A-{a,u})."""
    length = sp.sympify(length)
    leaf_isolates = isolate_row(leaves)
    p_lm1 = path_row(length - 1)
    p_lm2 = path_row(length - 2)
    u_deleted = multiply(leaf_isolates, p_lm1)
    both_deleted = multiply(leaf_isolates, p_lm2)
    whole = add_rows(u_deleted, shift_x(p_lm2))
    if length.is_Integer and int(length) == 1:
        attachment_deleted = leaf_isolates
    else:
        attachment_deleted = add_rows(
            multiply(leaf_isolates, p_lm2), shift_x(path_row(length - 3))
        )
    return whole, u_deleted, attachment_deleted, both_deleted


def nested(rows, rank: int):
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2)
        * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def convolve_isolates(rows, number: int, maximum: int = 5):
    factor = isolate_row(number, maximum)
    return tuple(multiply(row, factor, maximum) for row in rows)


def add_xd(crows, drows):
    return tuple(
        tuple(at(crow, rank) + at(drow, rank - 1) for rank in range(6))
        for crow, drow in zip(crows, drows)
    )


def raw_forms():
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve_isolates(crows, 1), drows)
    t2 = add_xd(convolve_isolates(crows, 2), drows)
    lower0 = nested(crows, 3)
    lower1 = nested(convolve_isolates(crows, 1, 4), 3)
    gamma1 = sp.expand(nested(t1, 4) - nested(t0, 4) - lower0)
    gamma2 = sp.expand(nested(t2, 4) - nested(t0, 4) - lower0 - lower1)
    return gamma1, sp.expand(gamma2 - 2 * gamma1)


RAW_G1, RAW_G2 = raw_forms()


def i2(order, edges):
    return sp.expand(choose_poly(order, 2) - edges)


def i3(order, edges, wedges):
    return sp.expand(choose_poly(order, 3) - edges * (order - 2) + wedges)


def i4(order, edges, wedges, connected3):
    return sp.expand(
        choose_poly(order, 4)
        - edges * choose_poly(order - 2, 2)
        + choose_poly(edges, 2)
        + wedges * (order - 4)
        - connected3
    )


def i5(order, edges, wedges, connected3, three_edge_five, connected4):
    return sp.expand(
        choose_poly(order, 5)
        - edges * choose_poly(order - 2, 3)
        + choose_poly(edges, 2) * (order - 4)
        + wedges * choose_poly(order - 4, 2)
        - connected3 * (order - 4)
        - three_edge_five
        + connected4
    )


def symbolic_rows(prefix: str):
    return tuple(sp.Symbol(f"{prefix}_{rank}") for rank in range(6))


def row_rules(crows, drows):
    rules = {}
    for name, row in zip("EUVW", crows):
        for rank in range(6):
            rules[sp.Symbol(f"c{name}{rank}")] = row[rank]
    for name, row in zip("EUVW", drows):
        for rank in range(6):
            rules[sp.Symbol(f"d{name}{rank}")] = row[rank]
    return rules


def forest_invariant_rules(endpoint: bool, rows):
    r0, rv, rp, rpv = rows
    m, edges, dp, dv, adjacent = sp.symbols(
        "m F_edges F_degree_p F_degree_v F_adjacent"
    )
    common = sp.Symbol("F_common_neighbor")
    xp, xv, wedges = sp.symbols(
        "F_neighbor_excess_p F_neighbor_excess_v F_wedges_E"
    )
    re, rp3, rv3 = sp.symbols(
        "F_connected3_E F_connected3_P F_connected3_V"
    )
    q35, r4 = sp.symbols("F_three_edge_five F_connected4_E")
    wv = wedges - choose_poly(dv, 2) - xv
    rules = {
        r0[0]: 1,
        r0[1]: m,
        r0[2]: i2(m, edges),
        r0[3]: i3(m, edges, wedges),
        r0[4]: i4(m, edges, wedges, re),
        r0[5]: i5(m, edges, wedges, re, q35, r4),
        rv[0]: 1,
        rv[1]: m - 1,
        rv[2]: i2(m - 1, edges - dv),
        rv[3]: i3(m - 1, edges - dv, wv),
        rv[4]: i4(m - 1, edges - dv, wv, rv3),
    }
    if not endpoint:
        wp = wedges - choose_poly(dp, 2) - xp
        wpv = (
            wedges
            - choose_poly(dp, 2)
            - choose_poly(dv, 2)
            - xp
            - xv
            + adjacent * (dp + dv - 2)
            + common
        )
        epv = edges - dp - dv + adjacent
        rules.update(
            {
                rp[0]: 1,
                rp[1]: m - 1,
                rp[2]: i2(m - 1, edges - dp),
                rp[3]: i3(m - 1, edges - dp, wp),
                rp[4]: i4(m - 1, edges - dp, wp, rp3),
                rpv[0]: 1,
                rpv[1]: m - 2,
                rpv[2]: i2(m - 2, epv),
                rpv[3]: i3(m - 2, epv, wpv),
            }
        )
    names = {
        str(symbol): symbol
        for symbol in (
            m,
            edges,
            dp,
            dv,
            adjacent,
            common,
            xp,
            xv,
            wedges,
            re,
            rp3,
            rv3,
            q35,
            r4,
        )
    }
    return rules, names


@lru_cache(maxsize=None)
def derive_invariant_forms(length, leaves, endpoint: bool):
    whole, u_deleted, attachment_deleted, both_deleted = broom_factors(
        length, leaves
    )
    r0, rv, rp, rpv = tuple(
        symbolic_rows(name) for name in ("r0", "rv", "rp", "rpv")
    )
    crows = (
        multiply(whole, r0),
        multiply(u_deleted, r0),
        multiply(whole, rv),
        multiply(u_deleted, rv),
    )
    if endpoint:
        drows = (
            multiply(attachment_deleted, rv),
            multiply(both_deleted, rv),
            multiply(attachment_deleted, rv),
            multiply(both_deleted, rv),
        )
    else:
        drows = (
            multiply(attachment_deleted, rp),
            multiply(both_deleted, rp),
            multiply(attachment_deleted, rpv),
            multiply(both_deleted, rpv),
        )
    rr = row_rules(crows, drows)
    inv, names = forest_invariant_rules(endpoint, (r0, rv, rp, rpv))
    return (
        sp.factor(RAW_G1.subs(rr).subs(inv)),
        sp.factor(RAW_G2.subs(rr).subs(inv)),
        names,
    )


MOTIF_NAMES = (
    "F_connected3_E",
    "F_connected3_P",
    "F_connected3_V",
    "F_three_edge_five",
    "F_connected4_E",
)


def split_motifs(expression):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    symbols = tuple(names[name] for name in MOTIF_NAMES if name in names)
    motif = sp.expand(sum(sp.diff(expression, symbol) * symbol for symbol in symbols))
    return sp.factor(motif), sp.factor(expression - motif)


def newton_coefficients(expression, variable):
    degree = sp.Poly(sp.expand(expression), variable).degree()
    values = [sp.expand(expression.subs(variable, value)) for value in range(degree + 1)]
    answer = []
    while values:
        answer.append(sp.factor(values[0]))
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
    reconstruction = sp.expand(
        sum(value * choose_poly(variable, rank) for rank, value in enumerate(answer))
    )
    assert sp.expand(reconstruction - expression) == 0
    return answer


def coefficient_audit(expression, variables):
    variables = tuple(variable for variable in variables if variable in expression.free_symbols)
    if variables:
        terms = sp.Poly(sp.expand(expression), *variables).terms()
    else:
        terms = [((), sp.expand(expression))]
    bad = [(monomial, coefficient) for monomial, coefficient in terms if coefficient < 0]
    return {
        "term_count": len(terms),
        "minimum": min(coefficient for _, coefficient in terms),
        "bad": bad,
    }


def debug_derivatives():
    leaves = sp.Symbol("k", integer=True, nonnegative=True)
    ell = sp.Symbol("ell", integer=True, positive=True)
    for endpoint in (False, True):
        print("MODE", "endpoint" if endpoint else "ordinary", flush=True)
        for length in (1, 2, ell):
            print("LENGTH", length, flush=True)
            g1, g2, _ = derive_invariant_forms(length, leaves, endpoint)
            for index, expression in enumerate((g1, g2), 1):
                _motif, residual = split_motifs(expression)
                symbols = {str(symbol): symbol for symbol in residual.free_symbols}
                targets = ["F_neighbor_excess_v", "F_wedges_E"]
                if not endpoint:
                    targets = [
                        "F_neighbor_excess_p",
                        "F_neighbor_excess_v",
                        "F_common_neighbor",
                        "F_wedges_E",
                    ]
                print(
                    "g",
                    index,
                    [(name, sp.factor(sp.diff(residual, symbols[name]))) for name in targets],
                    flush=True,
                )


def cone_audit_one(length, endpoint: bool):
    leaves = sp.Symbol("k", integer=True, nonnegative=True)
    tail = sp.Symbol("L", integer=True, nonnegative=True)
    x, y, remainder, components = sp.symbols(
        "x y remainder components", nonnegative=True
    )
    g1, g2, _ = derive_invariant_forms(length, leaves, endpoint)
    m = next(symbol for symbol in g1.free_symbols if str(symbol) == "m")
    total_order = sp.expand(m + sp.sympify(length) + leaves)
    rows = []
    for index, expression in enumerate((g1, g2), 1):
        motif, residual = split_motifs(expression)
        names = {str(symbol): symbol for symbol in residual.free_symbols}
        all_names = {str(symbol): symbol for symbol in expression.free_symbols}
        re = all_names["F_connected3_E"]
        rv3 = all_names["F_connected3_V"]
        expected_motif = 7 * re + 5 * rv3 if index == 2 else (
            (7 * total_order - 12) * re
            + (5 * total_order + (1 if endpoint else -4)) * rv3
            + 5 * all_names["F_three_edge_five"]
            - 5 * all_names["F_connected4_E"]
        )
        if not endpoint and index == 1:
            expected_motif += 5 * all_names["F_connected3_P"]
        assert sp.expand(motif - expected_motif) == 0
        branches = []
        if endpoint:
            # Positive-edge branches distinguished by whether d_v is zero.
            for positive_degree in (0, 1):
                edge_x = x if positive_degree else sp.Integer(0)
                edge_count = 1 + edge_x + remainder
                degree_v = positive_degree + edge_x
                order = 2 + edge_x + remainder + components
                wedge_cap = choose_poly(degree_v, 2) + choose_poly(remainder + 1, 2)
                rules = {
                    names["F_edges"]: edge_count,
                    names["F_degree_v"]: degree_v,
                    names["m"]: order,
                    names["F_neighbor_excess_v"]: 0,
                    names["F_wedges_E"]: wedge_cap,
                }
                branches.append((f"positive_edges_degree_v_{positive_degree}", rules))
            branches.append(
                (
                    "edgeless",
                    {
                        names["F_edges"]: 0,
                        names["F_degree_v"]: 0,
                        names["m"]: 1 + components,
                        names["F_neighbor_excess_v"]: 0,
                        names["F_wedges_E"]: 0,
                    },
                )
            )
        else:
            for adjacent in (0, 1):
                rooted_remainder = remainder + 1 - adjacent
                rules = {
                    names["F_edges"]: 1 + x + y + rooted_remainder,
                    names["F_degree_p"]: 1 + x,
                    names["F_degree_v"]: 1 + y,
                    names["m"]: 2 + x + y + rooted_remainder + components,
                    names["F_adjacent"]: adjacent,
                    names["F_common_neighbor"]: 1,
                    names["F_neighbor_excess_p"]: 0,
                    names["F_neighbor_excess_v"]: 0,
                    names["F_wedges_E"]: (
                        choose_poly(1 + x, 2)
                        + choose_poly(1 + y, 2)
                        + choose_poly(rooted_remainder + 1, 2)
                    ),
                }
                branches.append((f"adjacent_{adjacent}", rules))
        branch_rows = []
        for label, rules in branches:
            lower = sp.cancel(sp.expand_func(residual.subs(rules)))
            assert sp.denom(lower) == 1
            newton = newton_coefficients(lower, leaves)
            coefficient_rows = []
            ordered_digest = hashlib.sha256()
            for newton_rank, coefficient in enumerate(newton):
                ordered_digest.update(
                    f"{newton_rank}:{sp.srepr(sp.expand(coefficient))}\n".encode()
                )
                audit = coefficient_audit(
                    coefficient, (tail, x, y, remainder, components)
                )
                assert not audit["bad"], (length, endpoint, index, label, newton_rank, audit)
                coefficient_rows.append(
                    {
                        "newton_rank_k": newton_rank,
                        "term_count": audit["term_count"],
                        "minimum": str(audit["minimum"]),
                    }
                )
            branch_rows.append(
                {
                    "branch": label,
                    "degree_k": len(newton) - 1,
                    "term_count": sum(row["term_count"] for row in coefficient_rows),
                    "minimum": str(min(sp.sympify(row["minimum"]) for row in coefficient_rows)),
                    "ordered_coefficient_sha256": ordered_digest.hexdigest().upper(),
                    "newton_rows": coefficient_rows,
                }
            )
        rows.append(
            {
                "coefficient": f"g{index}",
                "motif": str(motif),
                "branches": branch_rows,
            }
        )
    return rows


def monotonicity_audit():
    """Reconstruct every exact excess/wedge derivative and its sign floor."""
    leaves = sp.Symbol("k", integer=True, nonnegative=True)
    ell = sp.Symbol("ell", integer=True, positive=True)
    records = {}
    for endpoint in (False, True):
        mode = "endpoint" if endpoint else "ordinary"
        records[mode] = {}
        for length in (1, 2, ell):
            label = str(length)
            g1, g2, _ = derive_invariant_forms(length, leaves, endpoint)
            mode_rows = {}
            for index, expression in enumerate((g1, g2), 1):
                _motif, residual = split_motifs(expression)
                names = {str(symbol): symbol for symbol in residual.free_symbols}
                m = names["m"]
                edges = names["F_edges"]
                dv = names["F_degree_v"]
                n = sp.expand(m + leaves + sp.sympify(length))
                if index == 2:
                    expected = {
                        "F_neighbor_excess_v": (12 * n - (17 if endpoint else 14)),
                        "F_wedges_E": -3 * (5 * n - 11),
                    }
                    if not endpoint:
                        expected.update(
                            {
                                "F_neighbor_excess_p": 2,
                                "F_common_neighbor": -5,
                            }
                        )
                elif length == 1:
                    q = m + leaves
                    if endpoint:
                        expected = {
                            "F_neighbor_excess_v": (
                                -2 * edges
                                + 6 * leaves**2
                                + 12 * leaves * m
                                - 6 * leaves
                                + 6 * m**2
                                - m
                                - 22
                            ),
                            "F_wedges_E": -(
                                -12 * dv
                                + 8 * edges
                                + 15 * leaves**2
                                + 30 * leaves * m
                                - 51 * leaves
                                + 15 * m**2
                                - 37 * m
                                - 42
                            )
                            / 2,
                        }
                    else:
                        expected = {
                            "F_neighbor_excess_p": 7 * n - 22,
                            "F_neighbor_excess_v": (
                                -2 * edges
                                + 6 * leaves**2
                                + 12 * leaves * m
                                - 8 * leaves
                                + 6 * m**2
                                - 3 * m
                                - 6
                            ),
                            "F_common_neighbor": 4 - 5 * n,
                            "F_wedges_E": -(
                                -12 * dv
                                + 8 * edges
                                + 15 * leaves**2
                                + 30 * leaves * m
                                - 51 * leaves
                                + 15 * m**2
                                - 37 * m
                                - 36
                            )
                            / 2,
                        }
                elif length == 2:
                    if endpoint:
                        expected = {
                            "F_neighbor_excess_v": (
                                -2 * edges
                                + 6 * leaves**2
                                + 12 * leaves * m
                                + 6 * leaves
                                + 6 * m**2
                                + 11 * m
                                - 27
                            ),
                            "F_wedges_E": -(
                                -12 * dv
                                + 8 * edges
                                + 15 * leaves**2
                                + 30 * leaves * m
                                - 21 * leaves
                                + 15 * m**2
                                - 7 * m
                                - 72
                            )
                            / 2,
                        }
                    else:
                        expected = {
                            "F_neighbor_excess_p": 7 * n - 22,
                            "F_neighbor_excess_v": (
                                -2 * edges
                                + 6 * leaves**2
                                + 12 * leaves * m
                                + 4 * leaves
                                + 6 * m**2
                                + 9 * m
                                - 13
                            ),
                            "F_common_neighbor": 4 - 5 * n,
                            "F_wedges_E": -(
                                -12 * dv
                                + 8 * edges
                                + 15 * leaves**2
                                + 30 * leaves * m
                                - 21 * leaves
                                + 15 * m**2
                                - 7 * m
                                - 66
                            )
                            / 2,
                        }
                else:
                    if endpoint:
                        expected = {
                            "F_neighbor_excess_v": (
                                -2 * edges
                                + 6 * n**2
                                - 13 * n
                                - 2 * ell
                                - 5 * leaves
                                - 21
                            ),
                            "F_wedges_E": -(
                                -12 * dv
                                + 8 * edges
                                + 15 * n**2
                                - 67 * n
                                - 2 * ell
                                - 14 * leaves
                                + 6
                            )
                            / 2,
                        }
                    else:
                        expected = {
                            "F_neighbor_excess_p": 7 * n - 22,
                            "F_neighbor_excess_v": (
                                -2 * edges
                                + 6 * n**2
                                - 15 * n
                                - 2 * ell
                                - 5 * leaves
                                - 3
                            ),
                            "F_common_neighbor": 4 - 5 * n,
                            "F_wedges_E": -(
                                -12 * dv
                                + 8 * edges
                                + 15 * n**2
                                - 67 * n
                                - 2 * ell
                                - 14 * leaves
                                + 12
                            )
                            / 2,
                        }
                actual = {
                    name: sp.factor(sp.diff(residual, names[name])) for name in expected
                }
                assert all(
                    sp.expand(actual[name] - value) == 0
                    for name, value in expected.items()
                )
                mode_rows[f"g{index}"] = {
                    name: str(value) for name, value in actual.items()
                }
            records[mode][label] = mode_rows

    t = sp.Symbol("t", integer=True, nonnegative=True)
    floors = {
        "ordinary_g1_xv": 6 * (5 + t) ** 2 - 20 * (5 + t) + 8,
        "ordinary_g1_negative_twice_wedge": (
            15 * (5 + t) ** 2 - 81 * (5 + t) + 48
        ),
        "ordinary_g1_xp": 7 * (5 + t) - 22,
        "ordinary_g1_negative_common": 5 * (5 + t) - 4,
        "endpoint_g1_xv": 6 * (5 + t) ** 2 - 18 * (5 + t) - 13,
        "endpoint_g1_negative_twice_wedge": (
            15 * (5 + t) ** 2 - 81 * (5 + t) + 32
        ),
        "g2_xv_ordinary_n3": 12 * (3 + t) - 14,
        "g2_xv_endpoint_n3": 12 * (3 + t) - 17,
        "g2_negative_wedge_n3": 3 * (5 * (3 + t) - 11),
    }
    for value in floors.values():
        assert all(coefficient >= 0 for coefficient in sp.Poly(sp.expand(value), t).all_coeffs())
    return {
        "exact_derivatives": records,
        "sign_floors": {key: str(sp.expand(value)) for key, value in floors.items()},
        "range": (
            "For g1 the monotone replacements hold for total order n=m+ell+k>=5. "
            "For g2 they hold for n>=3.  The bounds use e<=m-1, d_v<=e, "
            "k<=n-3 in the ordinary mode and k<=n-2 in the endpoint mode."
        ),
    }


def independent_row(graph: nx.Graph, maximum: int = 5):
    nodes = list(graph.nodes())
    answer = [0] * (maximum + 1)
    for mask in range(1 << len(nodes)):
        size = mask.bit_count()
        if size > maximum:
            continue
        selected = [nodes[index] for index in range(len(nodes)) if mask & (1 << index)]
        if all(not graph.has_edge(left, right) for left, right in itertools.combinations(selected, 2)):
            answer[size] += 1
    return tuple(sp.Integer(value) for value in answer)


def deleted_row(graph: nx.Graph, deleted):
    copy = graph.copy()
    copy.remove_nodes_from(deleted)
    return independent_row(copy)


def direct_rows(forest: nx.Graph, length: int, leaves: int, p: int, v: int, endpoint: bool):
    whole, u_deleted, attachment_deleted, both_deleted = broom_factors(length, leaves)
    r0 = independent_row(forest)
    rv = deleted_row(forest, (v,))
    if endpoint:
        rp = rv
        rpv = rv
    else:
        rp = deleted_row(forest, (p,))
        rpv = deleted_row(forest, (p, v))
    crows = (
        multiply(whole, r0),
        multiply(u_deleted, r0),
        multiply(whole, rv),
        multiply(u_deleted, rv),
    )
    drows = (
        multiply(attachment_deleted, rp),
        multiply(both_deleted, rp),
        multiply(attachment_deleted, rpv),
        multiply(both_deleted, rpv),
    )
    return crows, drows


def direct_g12(crows, drows):
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve_isolates(crows, 1), drows)
    t2 = add_xd(convolve_isolates(crows, 2), drows)
    lower0 = nested(crows, 3)
    lower1 = nested(convolve_isolates(crows, 1, 4), 3)
    g1 = sp.expand(nested(t1, 4) - nested(t0, 4) - lower0)
    gamma2 = sp.expand(nested(t2, 4) - nested(t0, 4) - lower0 - lower1)
    return int(g1), int(sp.expand(gamma2 - 2 * g1))


def gamma_value(crows, drows, number: int):
    t0 = add_xd(crows, drows)
    tm = add_xd(convolve_isolates(crows, number), drows)
    lower = sum(
        nested(convolve_isolates(crows, shift, 4), 3) for shift in range(number)
    )
    return int(sp.expand(nested(tm, 4) - nested(t0, 4) - lower))


def binomial_differences(values):
    values = list(values)
    answer = []
    while values:
        answer.append(values[0])
        values = [values[index + 1] - values[index] for index in range(len(values) - 1)]
    return answer


@lru_cache(maxsize=1)
def graph_atlas():
    return tuple(nx.graph_atlas_g())


@lru_cache(maxsize=None)
def unlabeled_forests(order: int):
    result = []
    for graph in graph_atlas():
        if len(graph) == order and nx.is_forest(graph):
            result.append(nx.convert_node_labels_to_integers(graph))
    return tuple(result)


def finite_census():
    expected_counts = {1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37}
    assert {order: len(unlabeled_forests(order)) for order in expected_counts} == expected_counts
    cells = Counter()
    minima = {}
    negatives = []
    small = {
        "ordinary_g1_n_lt_5": [],
        "endpoint_g1_n_lt_5": [],
        "endpoint_g2_n_eq_2": [],
    }
    # This extended replay is evidence only.  The proof itself is the all-order
    # motif/cone/Newton certificate above.
    for order in range(1, 8):
        for forest in unlabeled_forests(order):
            graph6 = nx.to_graph6_bytes(forest, header=False).decode().strip()
            base_rows = {
                vertex: deleted_row(forest, (vertex,)) for vertex in forest.nodes()
            }
            pair_rows = {
                (p, v): deleted_row(forest, (p, v))
                for p in forest.nodes()
                for v in forest.nodes()
                if p != v
            }
            r0 = independent_row(forest)
            for length in range(1, 7):
                for leaves in range(0, 7):
                    total_order = order + length + leaves
                    factors = broom_factors(length, leaves)
                    whole, u_deleted, attachment_deleted, both_deleted = factors
                    for v in forest.nodes():
                        rv = base_rows[v]
                        crows = (
                            multiply(whole, r0),
                            multiply(u_deleted, r0),
                            multiply(whole, rv),
                            multiply(u_deleted, rv),
                        )
                        drows = (
                            multiply(attachment_deleted, rv),
                            multiply(both_deleted, rv),
                            multiply(attachment_deleted, rv),
                            multiply(both_deleted, rv),
                        )
                        values = direct_g12(crows, drows)
                        record = {
                            "values": list(values),
                            "total_order": total_order,
                            "F_order": order,
                            "ell": length,
                            "k": leaves,
                            "graph6": graph6,
                            "p": v,
                            "v": v,
                        }
                        cells["endpoint"] += 1
                        if values[0] < 0 or values[1] < 0:
                            negatives.append({"mode": "endpoint", **record})
                        if "endpoint" not in minima or values < tuple(minima["endpoint"]["values"]):
                            minima["endpoint"] = record
                        if total_order < 5:
                            small["endpoint_g1_n_lt_5"].append(record)
                        if total_order == 2:
                            small["endpoint_g2_n_eq_2"].append(record)

                        for p in forest.nodes():
                            if p == v or not nx.has_path(forest, p, v):
                                continue
                            rp = base_rows[p]
                            rpv = pair_rows[(p, v)]
                            drows = (
                                multiply(attachment_deleted, rp),
                                multiply(both_deleted, rp),
                                multiply(attachment_deleted, rpv),
                                multiply(both_deleted, rpv),
                            )
                            values = direct_g12(crows, drows)
                            record = {
                                "values": list(values),
                                "total_order": total_order,
                                "F_order": order,
                                "ell": length,
                                "k": leaves,
                                "graph6": graph6,
                                "p": p,
                                "v": v,
                            }
                            cells["ordinary"] += 1
                            if values[0] < 0 or values[1] < 0:
                                negatives.append({"mode": "ordinary", **record})
                            if "ordinary" not in minima or values < tuple(minima["ordinary"]["values"]):
                                minima["ordinary"] = record
                            if total_order < 5:
                                small["ordinary_g1_n_lt_5"].append(record)
    assert not negatives
    assert minima["endpoint"]["values"] == [2, 24]
    assert minima["ordinary"]["values"] == [16, 78]
    for key, records in small.items():
        assert records
        if key.endswith("g1_n_lt_5"):
            assert min(record["values"][0] for record in records) > 0
        else:
            assert min(record["values"][1] for record in records) > 0
    witness_f = nx.path_graph(2)
    witness_c, witness_d = direct_rows(witness_f, 1, 0, 0, 1, False)
    witness_gamma = [gamma_value(witness_c, witness_d, number) for number in range(7)]
    witness_coefficients = binomial_differences(witness_gamma)
    assert witness_coefficients == [0, 16, 78, 174, 158, 50, 0]
    return {
        "forest_orders": [1, 7],
        "forest_counts": expected_counts,
        "ell_range": [1, 6],
        "k_range": [0, 6],
        "cell_counts": dict(cells),
        "minima": minima,
        "negative_count": 0,
        "tiny_exact_exceptions": {
            key: {
                "cell_count": len(records),
                "minimum_g1": min(record["values"][0] for record in records),
                "minimum_g2": min(record["values"][1] for record in records),
            }
            for key, records in small.items()
        },
        "path_witness": {
            "C": [[int(value) for value in row] for row in witness_c],
            "D": [[int(value) for value in row] for row in witness_d],
            "Gamma_values": witness_gamma,
            "Gamma_binomial_coefficients": witness_coefficients,
        },
        "scope": "Finite exact replay only; it is not used as the all-order sign proof.",
    }


def debug_cone(mode: str, branch: str):
    endpoint = mode == "endpoint"
    length = 7 + sp.Symbol("L", integer=True, nonnegative=True) if branch == "tail" else int(branch)
    result = cone_audit_one(length, endpoint)
    print(json.dumps(result, indent=2, sort_keys=True), flush=True)


def assemble_report():
    tail = sp.Symbol("L", integer=True, nonnegative=True)
    totals = {"g1": 0, "g2": 0}
    minima = {"g1": None, "g2": None}
    branch_counts = {
        "ordinary": {"g1": 0, "g2": 0},
        "endpoint": {"g1": 0, "g2": 0},
    }
    ordered_certificate_digest = hashlib.sha256()
    for endpoint in (False, True):
        mode = "endpoint" if endpoint else "ordinary"
        for length in (*range(1, 7), 7 + tail):
            label = "ell_7_plus_L" if not sp.sympify(length).is_Integer else f"ell_{length}"
            rows = cone_audit_one(length, endpoint)
            for row in rows:
                key = row["coefficient"]
                for branch in row["branches"]:
                    branch_counts[mode][key] += 1
                    totals[key] += branch["term_count"]
                    value = sp.sympify(branch["minimum"])
                    if minima[key] is None or value < minima[key]:
                        minima[key] = value
                    ordered_certificate_digest.update(
                        (
                            f"{mode}|{label}|{key}|{branch['branch']}|"
                            f"{branch['degree_k']}|{branch['term_count']}|"
                            f"{branch['minimum']}|{branch['ordered_coefficient_sha256']}\n"
                        ).encode()
                    )

    monotonicity = monotonicity_audit()
    census = finite_census()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every canonical deepest rank-four whole-bundle support lying "
            "internally on the protected u-v connector, whose child side is the "
            "one-ended broom B_(ell,k), both binomial coefficients g1 and g2 are "
            "nonnegative for all ell>=1 and k>=0, in both the ordinary p!=v and "
            "endpoint p=v parent modes, with arbitrary extra forest components."
        ),
        "structural_classification": {
            "statement": (
                "Root the marked component at v.  A deepest eligible support s "
                "on the protected connector has parent p toward v and exactly one "
                "nonbundle child branch toward u.  Every unmarked off-path branch "
                "would contain a deeper eligible support, so the only off-path "
                "leaves can be supported by the protected marked vertex u.  Thus "
                "the child component is a path of ell vertices from a to u with "
                "k leaves at u: the one-ended broom B_(ell,k)."
            ),
            "parent_side": (
                "After deleting s and its bundle, C=A disjoint_union F; p and v "
                "belong to one component of the arbitrary forest F.  Other "
                "components of F are allowed.  Closed-neighborhood deletion removes "
                "a and p, so D=C-{a,p}."
            ),
            "factors": {
                "S": "(1+x)^k",
                "X": "I(B_(ell,k))=S*I(P_(ell-1))+x*I(P_(ell-2))",
                "U": "I(B_(ell,k)-u)=S*I(P_(ell-1))",
                "Y": (
                    "I(B_(ell,k)-a)=S*I(P_(ell-2))+x*I(P_(ell-3)) "
                    "for ell>=2; Y=S for ell=1"
                ),
                "Z": "I(B_(ell,k)-{a,u})=S*I(P_(ell-2))",
            },
            "ordinary_rows": {
                "C": "(X R0,U R0,X Rv,U Rv)",
                "D": "(Y Rp,Z Rp,Y Rpv,Z Rpv)",
            },
            "endpoint_rows": {
                "condition": "p=v",
                "C": "(X R0,U R0,X Rv,U Rv)",
                "D": "(Y Rv,Z Rv,Y Rv,Z Rv)",
            },
            "boundaries": (
                "ell=1 is the attachment/mark coalescence and is derived exactly; "
                "k=0 recovers the bare-path geometry."
            ),
        },
        "gamma_reconstruction": {
            "g1": "N4(T1)-N4(T0)-N3(C)",
            "g2": (
                "[N4(T2)-N4(T0)-N3(C)-N3((1+x)C)]"
                "-2[N4(T1)-N4(T0)-N3(C)]"
            ),
            "four_minor_functional": "rebuilt locally from the defining nine-term nested identity",
            "producer_proof_imports": False,
        },
        "high_motif_payment": {
            "ordinary_g1": (
                "(7n-12)R3(F)+5R3(F-p)+(5n-4)R3(F-v)+5Q35(F)-5R4(F)"
            ),
            "endpoint_g1": (
                "(7n-12)R3(F)+(5n+1)R3(F-v)+5Q35(F)-5R4(F)"
            ),
            "g2": "7R3(F)+5R3(F-v)",
            "proof": (
                "For F of order m<=n, count containments of connected 3-edge "
                "subtrees in connected 4-edge subtrees.  If a five-vertex tree B "
                "has L leaves, leaf deletions contribute L containments and the "
                "4-L internal-edge deletions inject into Q35.  Therefore "
                "2(m-4)R3+5Q35-5R4 >= sum_B(15-3L)>=0.  Replacing m by n only "
                "adds 2(n-m)R3.  The displayed remaining R3 coefficients are "
                "nonnegative."
            ),
        },
        "monotonicity": monotonicity,
        "forest_cone": {
            "wedge_cap_proof": (
                "For nonisolated vertices write degree=1+excess.  In each forest "
                "component the sum of degree excesses is edges-1.  After reserving "
                "the excesses at p and v, the remaining excess mass is at most r; "
                "convexity and superadditivity of C(t+1,2) give "
                "W<=C(d_p,2)+C(d_v,2)+C(r+1,2).  The endpoint version omits d_p."
            ),
            "ordinary_parameterization": (
                "x=d_p-1, y=d_v-1, r=e-1-x-y.  Connectivity gives "
                "r>=1-adjacent, so r=remainder+1-adjacent; "
                "m=e+1+components."
            ),
            "endpoint_parameterization": (
                "For e>0 branch on z=1[d_v>0], put x=d_v-z and "
                "r=e-1-x; m=e+1+components.  The e=0 branch is exact separately."
            ),
            "other_bounds": (
                "neighbor excesses are nonnegative; common_neighbor<=1; "
                "all cone coordinates are nonnegative integers."
            ),
        },
        "coefficient_certificate": {
            "basis": (
                "Newton/binomial basis C(k,j) in the broom-leaf count k, followed "
                "by the ordinary power basis in the nonnegative forest-cone slacks. "
                "For ell>=7 write ell=7+L and include L in that power basis."
            ),
            "exact_inversion": (
                "Every Newton conversion is reconstructed symbolically before its "
                "power coefficients are inspected."
            ),
            "path_ranges": (
                "ell=1..6 are exact truncated branches.  The stable formula is "
                "used only for ell=7+L, L>=0, where every path-binomial top is "
                "nonnegative."
            ),
            "total_power_coefficients": totals,
            "global_minimum_power_coefficient": {
                key: str(value) for key, value in minima.items()
            },
            "branch_counts": branch_counts,
            "ordered_certificate_sha256": ordered_certificate_digest.hexdigest().upper(),
            "all_nonnegative": True,
        },
        "finite_replay": census,
        "scope": (
            "This proves exactly g1,g2 for the canonical deepest internal-spine "
            "two-neighbour broom mode, ordinary and endpoint.  It does not prove "
            "rank-four FML for arbitrary configurations, all N4, the full bundle "
            "positivity lemma, or Erdos Problem #993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    assert totals["g1"] > 0 and totals["g2"] > 0
    assert minima == {"g1": sp.Rational(5, 8), "g2": sp.Integer(6)}
    return report


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--debug-derivatives":
        debug_derivatives()
        return
    if len(sys.argv) > 3 and sys.argv[1] == "--debug-cone":
        debug_cone(sys.argv[2], sys.argv[3])
        return
    report = assemble_report()
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    print("REPORT_JSON_BEGIN")
    print(encoded, end="")
    print("REPORT_JSON_END")
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
