#!/usr/bin/env python3
"""Independent exact audit of the no-parent k=2 root-star g1/g2 theorem.

No producer proof functions are imported.  The audit reconstructs the
four-minor rows from one arbitrary forest K, derives Gamma_1 and the second
binomial coefficient directly from the nested functional, substitutes
independent-set formulas through i5, and separately checks the motif payment,
wedge cap, tiny orders, exact Bernstein inversion, and direct forest replay.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
CLASSIFICATION = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"
PRODUCER = HERE / "iso_n4_bundle_g12_no_parent_k2_exact_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_no_parent_k2_independent_audit_g1_bernstein_20260829.json"

FOREST_COUNTS = {0: 1, 1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def nested(rows, rank):
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


def isolate_row(row, number, maximum=5):
    return tuple(
        sp.expand(sum(comb(number, j) * at(row, rank - j) for j in range(number + 1)))
        for rank in range(maximum + 1)
    )


def add_xd(crows, drows):
    return tuple(
        tuple(at(crow, rank) + at(drow, rank - 1) for rank in range(6))
        for crow, drow in zip(crows, drows)
    )


def raw_forms():
    k = tuple(sp.symbols("k0:7"))
    crows = (isolate_row(k, 2), isolate_row(k, 1), isolate_row(k, 1), k)
    drows = (k, k, k, k)
    t0 = add_xd(crows, drows)
    t1 = add_xd(tuple(isolate_row(row, 1) for row in crows), drows)
    t2 = add_xd(tuple(isolate_row(row, 2) for row in crows), drows)
    gamma1 = sp.expand(nested(t1, 4) - nested(t0, 4) - nested(crows, 3))
    gamma2 = sp.expand(
        nested(t2, 4)
        - nested(t0, 4)
        - nested(crows, 3)
        - nested(tuple(isolate_row(row, 1, 4) for row in crows), 3)
    )
    return k, sp.factor(gamma1), sp.factor(gamma2 - 2 * gamma1)


def choose(value, rank):
    answer = sp.Integer(1)
    for offset in range(rank):
        answer *= value - offset
    return sp.expand(answer / factorial(rank))


def i2(n, e):
    return sp.expand(choose(n, 2) - e)


def i3(n, e, wedges):
    return sp.expand(choose(n, 3) - e * (n - 2) + wedges)


def i4(n, e, wedges, r3):
    return sp.expand(
        choose(n, 4) - e * choose(n - 2, 2) + choose(e, 2) + wedges * (n - 4) - r3
    )


def i5(n, e, wedges, r3, q35, r4):
    return sp.expand(
        choose(n, 5)
        - e * choose(n - 2, 3)
        + choose(e, 2) * (n - 4)
        + wedges * choose(n - 4, 2)
        - r3 * (n - 4)
        - q35
        + r4
    )


def invariant_forms(k, raw_g1, raw_g2):
    m, e, wedges, r3, q35, r4 = sp.symbols("m e W R3 Q35 R4")
    rules = {
        k[0]: 1,
        k[1]: m,
        k[2]: i2(m, e),
        k[3]: i3(m, e, wedges),
        k[4]: i4(m, e, wedges, r3),
        k[5]: i5(m, e, wedges, r3, q35, r4),
    }
    g1 = sp.factor(raw_g1.subs(rules))
    g2 = sp.factor(raw_g2.subs(rules))
    motif1 = 5 * q35 + (12 * m + 13) * r3 - 5 * r4
    motif2 = 12 * r3
    return g1, g2, sp.factor(motif1), sp.factor(motif2), sp.factor(g1 - motif1), sp.factor(g2 - motif2)


def parse(text, expression):
    return sp.sympify(text, locals={str(symbol): symbol for symbol in expression.free_symbols})


def univariate_bernstein(expression, variable):
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    coefficients = []
    for index in range(degree + 1):
        value = sum(
            polynomial.nth(power)
            * sp.binomial(index, power)
            / sp.binomial(degree, power)
            for power in range(index + 1)
        )
        coefficients.append((index, sp.factor(value)))
    reconstruction = sum(
        value * sp.binomial(degree, index) * variable**index * (1 - variable) ** (degree - index)
        for index, value in coefficients
    )
    assert sp.expand(reconstruction - expression) == 0
    return degree, coefficients


def power_nonnegative(expression, variable):
    return all(
        coefficient >= 0
        for coefficient in sp.Poly(sp.expand(expression), variable).all_coeffs()
    )


def certificates(residual1, residual2):
    names1 = {str(symbol): symbol for symbol in residual1.free_symbols}
    names2 = {str(symbol): symbol for symbol in residual2.free_symbols}
    m1, e1, w1 = names1["m"], names1["e"], names1["W"]
    m2, e2, w2 = names2["m"], names2["e"], names2["W"]
    coefficient1 = sp.factor(sp.diff(residual1, w1))
    coefficient2 = sp.factor(sp.diff(residual2, w2))
    assert sp.expand(coefficient1 + (8 * e1 + 15 * m1**2 - 7 * m1 - 64) / 2) == 0
    assert sp.expand(coefficient2 - (3 - 15 * m2)) == 0
    sign_floor = 15 * m1**2 - 7 * m1 - 64
    assert sign_floor.subs(m1, 3) == 50
    assert sp.diff(sign_floor, m1).subs(m1, 3) > 0

    lower1 = sp.factor(residual1.subs(w1, e1 * (e1 - 1) / 2))
    lower2 = sp.factor(residual2.subs(w2, e2 * (e2 - 1) / 2))
    a, q = sp.symbols("a q", nonnegative=True)
    box1 = sp.factor(lower1.subs({m1: q + 3, e1: (q + 2) * a}))
    box2 = sp.factor(lower2.subs({m2: q + 1, e2: q * a}))
    answer = {}
    for name, box, expected_degree, expected_minimum in (
        ("g1", box1, 3, sp.Integer(443)),
        ("g2", box2, 2, sp.Integer(138)),
    ):
        degree, coefficients = univariate_bernstein(box, a)
        assert degree == expected_degree
        records = []
        minimum = None
        for index, value in coefficients:
            assert power_nonnegative(value, q)
            at_zero = sp.factor(value.subs(q, 0))
            minimum = at_zero if minimum is None else min(minimum, at_zero)
            records.append({"index": index, "coefficient": str(value)})
        assert minimum == expected_minimum
        answer[name] = {
            "domain": "m>=3" if name == "g1" else "m>=1",
            "degree": degree,
            "coefficients": len(coefficients),
            "exact_inversion": True,
            "all_q_power_coefficients_nonnegative": True,
            "minimum_at_q0": str(minimum),
            "records": records,
        }
    return {
        "wedge_coefficients": {"g1": str(coefficient1), "g2": str(coefficient2)},
        "wedge_sign_floor_g1": str(sign_floor),
        "certificates": answer,
    }


def unlabeled_forests(order):
    if order == 0:
        yield nx.empty_graph(0)
        return
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining, start, chosen):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def independence_polynomial(graph):
    nodes = tuple(graph.nodes())
    answer = [0] * (len(nodes) + 1)
    for mask in range(1 << len(nodes)):
        chosen = [nodes[index] for index in range(len(nodes)) if mask & (1 << index)]
        if all(not graph.has_edge(left, right) for left, right in itertools.combinations(chosen, 2)):
            answer[len(chosen)] += 1
    return tuple(answer)


def direct_from_k(krow):
    crows = (isolate_row(krow, 2), isolate_row(krow, 1), isolate_row(krow, 1), krow)
    drows = (krow, krow, krow, krow)
    t0 = add_xd(crows, drows)
    t1 = add_xd(tuple(isolate_row(row, 1) for row in crows), drows)
    t2 = add_xd(tuple(isolate_row(row, 2) for row in crows), drows)
    gamma1 = nested(t1, 4) - nested(t0, 4) - nested(crows, 3)
    gamma2 = (
        nested(t2, 4)
        - nested(t0, 4)
        - nested(crows, 3)
        - nested(tuple(isolate_row(row, 1, 4) for row in crows), 3)
    )
    return int(gamma1), int(gamma2 - 2 * gamma1)


def connected_edge_subsets(graph, count):
    answer = 0
    for selected in itertools.combinations(tuple(graph.edges()), count):
        test = nx.Graph()
        test.add_edges_from(selected)
        answer += int(len(test) == count + 1 and nx.is_connected(test))
    return answer


def q35_count(graph):
    return sum(
        int(len(set(itertools.chain.from_iterable(selected))) == 5)
        for selected in itertools.combinations(tuple(graph.edges()), 3)
    )


def motif_containments(graph):
    r3_sets = []
    r4_sets = []
    for selected in itertools.combinations(tuple(graph.edges()), 3):
        test = nx.Graph()
        test.add_edges_from(selected)
        if len(test) == 4 and nx.is_connected(test):
            r3_sets.append(frozenset(selected))
    for selected in itertools.combinations(tuple(graph.edges()), 4):
        test = nx.Graph()
        test.add_edges_from(selected)
        if len(test) == 5 and nx.is_connected(test):
            r4_sets.append(frozenset(selected))
    containments = sum(int(left < right) for left in r3_sets for right in r4_sets)
    return len(r3_sets), len(r4_sets), containments


def exact_evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    denominator = 1
    for coefficient in polynomial.coeffs():
        denominator = sp.ilcm(denominator, int(coefficient.q))
    terms = tuple(
        (monomial, int(coefficient * denominator))
        for monomial, coefficient in polynomial.terms()
    )

    def evaluate(values):
        vector = tuple(values[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            term = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    term *= base**exponent
            numerator += term
        assert numerator % denominator == 0
        return numerator // denominator

    return evaluate


def replay(k, raw1, raw2, g1, g2, motif1, motif2, residual1, residual2):
    evaluators = {
        "g1": exact_evaluator(g1),
        "g2": exact_evaluator(g2),
        "motif1": exact_evaluator(motif1),
        "motif2": exact_evaluator(motif2),
        "residual1": exact_evaluator(residual1),
        "residual2": exact_evaluator(residual2),
    }
    total = 0
    minima = {key: None for key in evaluators}
    tiny = []
    by_order = {}
    for order, expected in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected
        for graph in forests:
            polynomial = independence_polynomial(graph)
            kvals = {k[index]: at(polynomial, index) for index in range(7)}
            direct = direct_from_k(polynomial)
            raw = (int(raw1.subs(kvals)), int(raw2.subs(kvals)))
            assert direct == raw
            e = graph.number_of_edges()
            wedges = sum(comb(degree, 2) for _, degree in graph.degree())
            r3 = connected_edge_subsets(graph, 3)
            q35 = q35_count(graph)
            r4 = connected_edge_subsets(graph, 4)
            data = {"m": order, "e": e, "W": wedges, "R3": r3, "Q35": q35, "R4": r4}
            values = {key: evaluator(data) for key, evaluator in evaluators.items()}
            assert direct == (values["g1"], values["g2"])
            assert values["g1"] == values["motif1"] + values["residual1"]
            assert values["g2"] == values["motif2"] + values["residual2"]
            assert all(value >= 0 for value in values.values())
            assert wedges <= comb(e, 2)
            counted_r3, counted_r4, containments = motif_containments(graph)
            assert (r3, r4) == (counted_r3, counted_r4)
            if order <= 4:
                assert r4 == 0
            else:
                assert 2 * r4 <= containments <= (order - 4) * r3
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for key, value in values.items():
                record = {"value": value, "m": order, "graph6": graph6}
                if minima[key] is None or value < minima[key]["value"]:
                    minima[key] = record
            if order <= 2:
                tiny.append({"m": order, "graph6": graph6, "g1": direct[0], "g2": direct[1]})
            total += 1
        by_order[str(order)] = len(forests)
    assert total == 80
    assert minima["g1"]["value"] == 2
    assert minima["g2"]["value"] == 24
    return {
        "orders_m": [0, 7],
        "unlabeled_forests": total,
        "direct_functional_cross_checks": total,
        "negative": 0,
        "minima": minima,
        "tiny_exact_branches": tiny,
        "by_order": by_order,
    }


def main():
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    producer = json.loads(PRODUCER.read_text(encoding="utf-8"))
    assert classification["marker"] == "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT"
    assert producer["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K2_ROOT"
    assert classification["modes"]["k2_both_protected_leaves"]["D_row_identity"] == "D=(C_W,C_W,C_W,C_W)"

    k, raw1, raw2 = raw_forms()
    raw_locals = {str(symbol): symbol for symbol in raw1.free_symbols | raw2.free_symbols}
    assert sp.expand(raw1 - sp.sympify(producer["raw_forms"]["g1"], locals=raw_locals)) == 0
    assert sp.expand(raw2 - sp.sympify(producer["raw_forms"]["g2"], locals=raw_locals)) == 0
    g1, g2, motif1, motif2, residual1, residual2 = invariant_forms(k, raw1, raw2)
    for key, expression in (("g1", g1), ("g2", g2)):
        assert sp.expand(expression - parse(producer["forest_invariant_forms"][key], expression)) == 0
    for key, expression in (("g1", motif1), ("g2", motif2)):
        assert sp.expand(expression - parse(producer["high_motif_payment"][key], expression)) == 0
    for key, expression in (("g1", residual1), ("g2", residual2)):
        assert sp.expand(expression - parse(producer["residuals"][key], expression)) == 0

    certificate = certificates(residual1, residual2)
    finite = replay(k, raw1, raw2, g1, g2, motif1, motif2, residual1, residual2)

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K2_AUDIT_G1_BERNSTEIN",
        "theorem": (
            "For every canonical no-parent root-star cell in which both protected "
            "marks are leaf neighbors of the support, g1>=0 and g2>=0."
        ),
        "independent_row_reduction": {
            "C": "((1+x)^2K,(1+x)K,(1+x)K,K)",
            "D": "(K,K,K,K)",
            "proof": (
                "Deleting the root support isolates both marks in C; deleting its "
                "closed neighborhood removes both marks, so every D minor is K."
            ),
            "raw_Gamma1_and_Gamma2_reconstructed": True,
            "forest_i2_through_i5_reconstructed": True,
            "matches_producer_forms": True,
        },
        "motif_payment": {
            "g1": str(motif1),
            "g2": str(motif2),
            "small_m": "R4=0 for m<=4",
            "large_m": (
                "For m>=5, if P counts R3 subsets of R4 trees, each R4 tree has "
                "at least two leaf deletions and each R3 tree has at most m-4 "
                "one-vertex extensions; hence 2R4<=P<=(m-4)R3."
            ),
        },
        "wedge_cap": {
            "statement": "W<=C(e,2)",
            "proof": "W counts adjacent unordered edge pairs, a subset of all edge pairs.",
            **{key: value for key, value in certificate.items() if key != "certificates"},
        },
        "bernstein_certificates": certificate["certificates"],
        "finite_replay": finite,
        "conclusion": (
            "The k=2 no-parent mode is independently certified. With the endpoint "
            "theorem covering k=1, only the canonical k=0 no-parent mode remains."
        ),
        "scope": (
            "Exact only for canonical no-parent k=2 g1/g2. It does not prove k=0, "
            "noncanonical supports, rank-four FML, all N4, or Erdos Problem 993."
        ),
        "dependencies": {
            CLASSIFICATION.name: sha256(CLASSIFICATION),
            PRODUCER.name: sha256(PRODUCER),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "bernstein": {
            key: {subkey: value for subkey, value in row.items() if subkey != "records"}
            for key, row in report["bernstein_certificates"].items()
        },
        "finite": {key: value for key, value in finite.items() if key not in ("by_order", "tiny_exact_branches")},
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
