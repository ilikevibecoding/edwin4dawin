#!/usr/bin/env python3
"""Exploratory exact sibling-isolate compression for the rank-six G1 leaf delta.

This is a diagnostic, not a theorem producer.  A deepest ordinary support
with one chosen leaf leaves ``t`` sibling leaves isolated in H.  The script
expands the complete parent/leaf-retained delta in the binomial basis in t,
both when the distinguished singleton parent p is the support parent q and
when p and q are distinct.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import itertools

import networkx as nx
import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import (
    add_xd, binomial_basis, isolate_multiply, nested_rank,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows
from derive_iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_g1_nonadjacent import occupation


def replace_rows(expression, **blocks):
    rules = {}
    for prefix, actual in blocks.items():
        generic = symbolic_rows(prefix)
        for grow, arow in zip(generic, actual):
            rules.update(dict(zip(grow, arow)))
    return sp.expand(expression.subs(rules))


def summary(value):
    variables = tuple(sorted(value.free_symbols, key=str))
    if not variables:
        return {
            "terms": int(value != 0), "variables": 0,
            "negative": 1 if value < 0 else 0, "minimum": str(value),
            "sha256": hashlib.sha256(sp.srepr(value).encode()).hexdigest().upper(),
        }
    polynomial = sp.Poly(value, *variables)
    return {
        "terms": len(polynomial.terms()),
        "variables": len(variables),
        "negative": sum(1 for coefficient in polynomial.coeffs() if coefficient < 0),
        "minimum": str(min(polynomial.coeffs(), default=0)),
        "sha256": hashlib.sha256(sp.srepr(value).encode()).hexdigest().upper(),
    }


def structural(rows, order):
    e, u, v, w = rows
    return {
        e[0]: 1, u[0]: 1, v[0]: 1, w[0]: 1,
        e[1]: order, u[1]: order - 1,
        v[1]: order - 1, w[1]: order - 2,
    }


def evaluator(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    function = sp.lambdify(variables, expression, "math")

    def evaluate(values):
        return int(function(*(values[str(variable)] for variable in variables)))

    return evaluate


def scalar_ratio(left, right):
    variables = tuple(sorted(left.free_symbols | right.free_symbols, key=str))
    left_terms = dict(sp.Poly(left, *variables).terms())
    right_terms = dict(sp.Poly(right, *variables).terms())
    if set(left_terms) != set(right_terms):
        return None
    ratios = {
        sp.Rational(left_terms[monomial], right_terms[monomial])
        for monomial in left_terms if right_terms[monomial] != 0
    }
    if len(ratios) != 1:
        return None
    ratio = next(iter(ratios))
    return ratio if sp.expand(left - ratio * right) == 0 else None


def row_values(prefix, four):
    return {
        f"{prefix}{family}{rank}": value
        for family, row in zip("EUVW", four)
        for rank, value in enumerate(row)
    }


def census(collision_coefficients, distinct_coefficients):
    collision_eval = [evaluator(value) for value in collision_coefficients]
    distinct_eval = [evaluator(value) for value in distinct_coefficients]
    signs = {
        "collision": [Counter() for _ in collision_eval],
        "distinct": [Counter() for _ in distinct_eval],
    }
    minima = {
        "collision": [None for _ in collision_eval],
        "distinct": [None for _ in distinct_eval],
    }
    for graph0 in nx.graph_atlas_g():
        if not (3 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v in itertools.combinations(graph, 2):
            if graph.has_edge(u, v):
                continue
            ordinary = [node for node in graph if node not in (u, v)]
            r = rows(graph, u, v)
            for p in ordinary:
                sgraph = graph.copy()
                sgraph.remove_node(p)
                s = rows(sgraph, u, v)
                data = {"n": len(graph)} | row_values("R", r) | row_values("S", s)
                for index, function in enumerate(collision_eval):
                    value = function(data)
                    signs["collision"][index]["negative" if value < 0 else "positive" if value > 0 else "zero"] += 1
                    record = (value, len(graph), code, u, v, p)
                    if minima["collision"][index] is None or record < minima["collision"][index]:
                        minima["collision"][index] = record
            for p, q in itertools.permutations(ordinary, 2):
                sgraph = graph.copy()
                sgraph.remove_node(q)
                xgraph = graph.copy()
                xgraph.remove_node(p)
                ygraph = graph.copy()
                ygraph.remove_nodes_from((p, q))
                data = (
                    {"n": len(graph)} | row_values("R", r)
                    | row_values("S", rows(sgraph, u, v))
                    | row_values("X", rows(xgraph, u, v))
                    | row_values("Y", rows(ygraph, u, v))
                )
                for index, function in enumerate(distinct_eval):
                    value = function(data)
                    signs["distinct"][index]["negative" if value < 0 else "positive" if value > 0 else "zero"] += 1
                    record = (value, len(graph), code, u, v, p, q)
                    if minima["distinct"][index] is None or record < minima["distinct"][index]:
                        minima["distinct"][index] = record
    for mode in ("collision", "distinct"):
        for index in range(len(signs[mode])):
            print("CENSUS", mode, index, dict(signs[mode][index]), "MIN", minima[mode][index])


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.expand(sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank))


def row_order(symbol, n):
    name = str(symbol)
    base = {"R": n, "S": n - 1, "X": n - 1, "Y": n - 2}[name[0]]
    removed = {"E": 0, "U": 1, "V": 1, "W": 2}[name[1]]
    return base - removed, int(name[2:])


def interval_bound(expression, n, n0):
    row_variables = tuple(sorted((symbol for symbol in expression.free_symbols if symbol != n), key=str))
    if not row_variables:
        shifted = sp.Poly(sp.expand(expression.subs(n, n0 + sp.Symbol("h"))), sp.Symbol("h"))
        return expression, [], shifted.all_coeffs()
    polynomial = sp.Poly(expression, *row_variables)
    h = sp.Symbol("h", nonnegative=True)
    pieces = []
    mixed = []
    for exponents, coefficient in polynomial.terms():
        shifted = sp.Poly(sp.expand(coefficient.subs(n, n0 + h)), h)
        values = shifted.all_coeffs()
        if all(value >= 0 for value in values):
            direction = 1
        elif all(value <= 0 for value in values):
            direction = -1
        else:
            mixed.append(str(sp.factor(coefficient)))
            continue
        term = coefficient
        row_degree = sum(exponents)
        for variable, exponent in zip(row_variables, exponents):
            if not exponent:
                continue
            order, rank = row_order(variable, n)
            upper = choose_poly(order, rank)
            lower = sp.expand(upper - (order - 1) * choose_poly(order - 2, rank - 2))
            if direction > 0 and row_degree > 1:
                lower_shift = sp.Poly(sp.expand(lower.subs(n, n0 + h)), h)
                assert all(value >= 0 for value in lower_shift.all_coeffs()), (
                    variable, lower, n0
                )
            bound = lower if direction > 0 else upper
            term *= bound**exponent
        pieces.append(term)
    if mixed:
        return None, mixed, None
    lower = sp.expand(sum(pieces))
    shifted = sp.Poly(sp.expand(lower.subs(n, n0 + h)), h)
    return lower, [], shifted.all_coeffs()


def path_floor_bound(expression, n, n0):
    """Termwise box envelope using the coefficientwise path floor."""
    row_variables = tuple(sorted((symbol for symbol in expression.free_symbols if symbol != n), key=str))
    if not row_variables:
        shifted = sp.Poly(sp.expand(expression.subs(n, n0 + sp.Symbol("h"))), sp.Symbol("h"))
        return expression, [], shifted.all_coeffs()
    polynomial = sp.Poly(expression, *row_variables)
    h = sp.Symbol("h", nonnegative=True)
    pieces = []
    mixed = []
    for exponents, coefficient in polynomial.terms():
        shifted = sp.Poly(sp.expand(coefficient.subs(n, n0 + h)), h)
        values = shifted.all_coeffs()
        if all(value >= 0 for value in values):
            direction = 1
        elif all(value <= 0 for value in values):
            direction = -1
        else:
            mixed.append(str(sp.factor(coefficient)))
            continue
        term = coefficient
        for variable, exponent in zip(row_variables, exponents):
            if not exponent:
                continue
            order, rank = row_order(variable, n)
            upper = choose_poly(order, rank)
            lower = choose_poly(order - rank + 1, rank)
            term *= (lower if direction > 0 else upper) ** exponent
        pieces.append(term)
    if mixed:
        return None, mixed, None
    lower = sp.expand(sum(pieces))
    shifted = sp.Poly(sp.expand(lower.subs(n, n0 + h)), h)
    return lower, [], shifted.all_coeffs()


def fixed_order_bound(expression, n, order_value):
    value = sp.expand(expression.subs(n, order_value))
    row_variables = tuple(sorted(value.free_symbols, key=str))
    if not row_variables:
        return value
    polynomial = sp.Poly(value, *row_variables)
    pieces = []
    for exponents, coefficient in polynomial.terms():
        assert coefficient != 0
        direction = 1 if coefficient > 0 else -1
        row_degree = sum(exponents)
        term = coefficient
        for variable, exponent in zip(row_variables, exponents):
            if not exponent:
                continue
            symbolic_order, rank = row_order(variable, n)
            actual_order = int(symbolic_order.subs(n, order_value))
            assert actual_order >= 0
            upper = sp.binomial(actual_order, rank)
            lower = upper - max(actual_order - 1, 0) * sp.binomial(max(actual_order - 2, 0), rank - 2)
            if direction > 0 and row_degree > 1:
                lower = max(sp.Integer(0), lower)
            term *= (lower if direction > 0 else upper) ** exponent
        pieces.append(term)
    return sp.expand(sum(pieces))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--census", action="store_true")
    parser.add_argument("--collision-loss", action="store_true")
    parser.add_argument("--interval", action="store_true")
    parser.add_argument("--tail", action="store_true")
    parser.add_argument("--finite-tail", action="store_true")
    parser.add_argument("--path-floor", action="store_true")
    parser.add_argument("--edgeless-core", action="store_true")
    args = parser.parse_args()
    t = sp.Symbol("t", integer=True, nonnegative=True)
    components = build_expressions()
    complete = sp.expand(
        components["g2"] + components["F"] + components["QHL"]
        + components["QHJ"] + components["QKJ"] + components["T"]
    )
    rrows, srows, j0rows, l0rows = (
        symbolic_rows(prefix) for prefix in ("R", "S", "X", "Y")
    )
    n = sp.Symbol("n", integer=True, positive=True)

    # Collision p=q: J=(1+x)^t S and L=S.
    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7),
        K=srows,
        J=isolate_multiply(srows, t, 7),
        L=srows,
    )
    collision = sp.expand(collision.subs(structural(rrows, n) | structural(srows, n - 1)))
    collision_coefficients = binomial_basis(collision, t)

    # Distinct p,q: J=(1+x)^t(R-p), K=R-q, L=R-{p,q}.
    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7),
        K=srows,
        J=isolate_multiply(j0rows, t, 7),
        L=l0rows,
    )
    distinct = sp.expand(distinct.subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(j0rows, n - 1) | structural(l0rows, n - 2)
    ))
    distinct_coefficients = binomial_basis(distinct, t)

    print("COLLISION_DEGREE", len(collision_coefficients) - 1)
    for index, value in enumerate(collision_coefficients):
        print("COLLISION", index, summary(value))
        if index >= 3:
            print("COLLISION_FACTOR", index, sp.factor(value))
    print("DISTINCT_DEGREE", len(distinct_coefficients) - 1)
    for index, value in enumerate(distinct_coefficients):
        print("DISTINCT", index, summary(value))
        if index >= 3:
            print("DISTINCT_FACTOR", index, sp.factor(value))
    if args.census:
        census(collision_coefficients, distinct_coefficients)
    if args.collision_loss:
        prows = symbolic_rows("P")
        loss_rules = {
            svalue: rvalue - pvalue
            for srow, rrow, prow in zip(srows, rrows, prows)
            for svalue, rvalue, pvalue in zip(srow, rrow, prow)
        }
        value = sp.expand(collision_coefficients[0].subs(loss_rules))
        praw = tuple(value for row in prows for value in row)
        raw_quadratic = sp.expand(sum(
            left * right * sp.diff(value, left, right)
            / (2 if left == right else 1)
            for index, left in enumerate(praw)
            for right in praw[index:]
        ))
        trows = symbolic_rows("T")
        shift_rules = {
            prow[rank]: (trow[rank - 1] if rank >= 1 else 0)
            for prow, trow in zip(prows, trows)
            for rank in range(8)
        }
        stripped_quadratic = sp.expand(raw_quadratic.subs(shift_rules))
        print("COLLISION_RAW_STRIPPED_QUADRATIC", summary(stripped_quadratic))
        print("COLLISION_RAW_STRIPPED_QUADRATIC_FACTOR", sp.factor(stripped_quadratic))
        for rank in range(2, 7):
            zeros = tuple(tuple(sp.Integer(0) for _ in row) for row in trows)
            def gamma(amount, drows):
                bundled = add_xd(isolate_multiply(trows, sp.Integer(amount), rank + 1), drows)
                base = add_xd(trows, drows)
                lower = sum(
                    nested_rank(isolate_multiply(trows, sp.Integer(index), rank), rank - 1)
                    for index in range(amount)
                )
                return sp.expand(nested_rank(bundled, rank) - nested_rank(base, rank) - lower)
            for dlabel, drows in (("same", trows), ("zero", zeros)):
                low_g1 = gamma(1, drows)
                low_g2 = sp.expand(gamma(2, drows) - 2 * low_g1)
                for label, candidate in (("g1", low_g1), ("g2", low_g2)):
                    ratio = scalar_ratio(stripped_quadratic, candidate)
                    if ratio is not None:
                        print("COLLISION_QUADRATIC_EQUALS_BUNDLE", rank, dlabel, label, ratio)
        for rank in range(2, 6):
            target = nested_rank(trows, rank)
            ratios = set()
            target_poly = sp.Poly(target, *sorted((target | stripped_quadratic).free_symbols, key=str)) if False else None
            if target != 0:
                variables = tuple(sorted((target.free_symbols | stripped_quadratic.free_symbols), key=str))
                left = sp.Poly(stripped_quadratic, *variables).terms()
                right = dict(sp.Poly(target, *variables).terms())
                for monomial, coefficient in left:
                    if monomial in right and right[monomial] != 0:
                        ratios.add(sp.Rational(coefficient, right[monomial]))
                    else:
                        ratios.add(None)
                if len(ratios) == 1 and None not in ratios:
                    ratio = next(iter(ratios))
                    if sp.expand(stripped_quadratic - ratio * target) == 0:
                        print("COLLISION_QUADRATIC_EQUALS_N", rank, ratio)
        occ_rules = occupation("R", rrows)[0] | occupation("P", prows)[0]
        value = sp.expand(value.subs(occ_rules))
        pvars = tuple(
            symbol for symbol in sorted(value.free_symbols, key=str)
            if str(symbol).startswith("P")
        )
        print("COLLISION_LOSS", summary(value))
        print("COLLISION_LOSS_P_DEGREE", sp.Poly(value, *pvars).total_degree())
        quadratic = sp.expand(sum(
            left * right * sp.diff(value, left, right)
            / (2 if left == right else 1)
            for index, left in enumerate(pvars)
            for right in pvars[index:]
        ))
        print("COLLISION_LOSS_QUADRATIC", summary(quadratic))
        print("COLLISION_LOSS_QUADRATIC_FACTOR", sp.factor(quadratic))
        print("COLLISION_LOSS_LINEAR", summary(sp.expand(value - quadratic)))
    if args.interval:
        for mode, coefficients, n0 in (
            ("collision", collision_coefficients, 84),
            ("distinct", distinct_coefficients, 84),
        ):
            for index, value in enumerate(coefficients):
                tail = 84 if index == 3 else n0
                lower, mixed, shifted_coefficients = interval_bound(value, n, tail)
                if mixed:
                    print("INTERVAL", mode, index, "MIXED", mixed)
                else:
                    print(
                        "INTERVAL", mode, index,
                        "LOWER", sp.factor(lower),
                        "TAIL", tail,
                        "SHIFT_NONNEGATIVE", all(item >= 0 for item in shifted_coefficients),
                        "SHIFT_MIN", min(shifted_coefficients),
                    )
    if args.tail:
        h, s = sp.symbols("h s", nonnegative=True)
        for mode, coefficients in (
            ("collision", collision_coefficients),
            ("distinct", distinct_coefficients),
        ):
            lowers = [interval_bound(value, n, 84)[0] for value in coefficients]
            assert all(value is not None for value in lowers)
            total = sp.expand(sum(
                choose_poly(t, index) * value for index, value in enumerate(lowers)
            ))
            for numerator, denominator in (
                (1, 1), (21, 20), (16, 15), (15, 14), (14, 13),
                (13, 12), (12, 11), (82, 75), (35, 32), (93, 85),
                (1095, 1000), (1096, 1000), (1097, 1000),
                (1098, 1000), (1099, 1000),
                (11, 10),
            ):
                slope = sp.Rational(numerator, denominator)
                shifted = sp.Poly(
                    sp.expand(total.subs({n: 84 + h, t: slope * (84 + h) + s})),
                    h, s,
                )
                values = shifted.coeffs()
                print(
                    "TAIL", mode, "SLOPE", f"{numerator}/{denominator}",
                    "NONNEGATIVE", all(value >= 0 for value in values),
                    "NEGATIVE", sum(1 for value in values if value < 0),
                    "MIN", min(values),
                    "TERMS", len(values),
                )
                if (numerator, denominator) in ((1099, 1000), (11, 10)):
                    print(
                        "TAIL_TERMS", mode, f"{numerator}/{denominator}",
                        [(powers, value) for powers, value in shifted.terms()
                         if value < 0 or value == min(values)],
                    )
    if args.finite_tail:
        shift = sp.Symbol("shift", nonnegative=True)
        for mode, coefficients, first in (
            ("collision", collision_coefficients, 3),
            ("distinct", distinct_coefficients, 4),
        ):
            rows_out = []
            for order_value in range(first, 84):
                lowers = [fixed_order_bound(value, n, order_value) for value in coefficients]
                total = sp.expand(sum(
                    choose_poly(t, index) * lower for index, lower in enumerate(lowers)
                ))
                threshold = 0
                while True:
                    shifted = sp.Poly(sp.expand(total.subs(t, threshold + shift)), shift)
                    if all(value >= 0 for value in shifted.all_coeffs()):
                        break
                    threshold += 1
                    assert threshold <= 10 * order_value + 100
                baseline = (11 * order_value + 9) // 10
                rows_out.append((order_value, threshold, threshold - baseline, min(shifted.all_coeffs())))
            print("FINITE_TAIL", mode, "MAX_OFFSET", max(row[2] for row in rows_out))
            print("FINITE_TAIL", mode, "MAX_RATIO", max(sp.Rational(row[1], row[0]) for row in rows_out))
            print("FINITE_TAIL", mode, "ROWS", rows_out)
    if args.path_floor:
        for mode, coefficients in (
            ("collision", collision_coefficients),
            ("distinct", distinct_coefficients),
        ):
            lowers = []
            for index, value in enumerate(coefficients):
                lower, mixed, shifted = path_floor_bound(value, n, 84)
                print(
                    "PATH_FLOOR", mode, index,
                    "MIXED", len(mixed),
                    "NONNEGATIVE", shifted is not None and all(item >= 0 for item in shifted),
                    "NEGATIVE", None if shifted is None else sum(1 for item in shifted if item < 0),
                    "MIN", None if shifted is None else min(shifted),
                    "LOWER", None if lower is None else sp.factor(lower),
                )
                lowers.append(lower)
            if all(value is not None for value in lowers):
                total = sp.Poly(sp.expand(sum(
                    choose_poly(t, index) * value
                    for index, value in enumerate(lowers)
                ).subs(n, 84 + sp.Symbol("h", nonnegative=True))), t, sp.Symbol("h", nonnegative=True))
                print(
                    "PATH_FLOOR_TOTAL", mode,
                    "NONNEGATIVE", all(item >= 0 for item in total.coeffs()),
                    "NEGATIVE", sum(1 for item in total.coeffs() if item < 0),
                    "MIN", min(total.coeffs()),
                    "TERMS", len(total.terms()),
                )
    if args.edgeless_core:
        def edgeless_rules(rows, order):
            return {
                row[rank]: choose_poly(order - removed, rank)
                for row, removed in zip(rows, (0, 1, 1, 2))
                for rank in range(2, 8)
            }
        h = sp.Symbol("h", nonnegative=True)
        for mode, expression, first, rules in (
            ("collision", collision, 3,
             edgeless_rules(rrows, n) | edgeless_rules(srows, n - 1)),
            ("distinct", distinct, 4,
             edgeless_rules(rrows, n) | edgeless_rules(srows, n - 1)
             | edgeless_rules(j0rows, n - 1) | edgeless_rules(l0rows, n - 2)),
        ):
            value = sp.factor(sp.expand(expression.subs(rules)))
            shifted = sp.Poly(sp.expand(value.subs(n, first + h)), h, t)
            print("EDGELESS_CORE", mode, "FACTOR", value)
            print(
                "EDGELESS_CORE", mode,
                "TERMS", len(shifted.terms()),
                "NONNEGATIVE", all(item >= 0 for item in shifted.coeffs()),
                "NEGATIVE", sum(1 for item in shifted.coeffs() if item < 0),
                "MIN", min(shifted.coeffs()),
                "RAW_SHA", hashlib.sha256(sp.srepr(sp.expand(value)).encode()).hexdigest().upper(),
                "SHIFTED_SHA", hashlib.sha256(sp.srepr(sp.expand(value.subs(n, first + h))).encode()).hexdigest().upper(),
            )
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
