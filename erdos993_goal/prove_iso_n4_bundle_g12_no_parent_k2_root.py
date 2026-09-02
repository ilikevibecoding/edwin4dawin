#!/usr/bin/env python3
"""Prove rank-four bundle coefficients g1,g2 in the k=2 root-star mode.

The canonical deepest support has no parent and both protected marks are leaf
neighbours of that support.  After deleting the support, the two marks are
isolates.  Writing K for the four-minor W row of the remaining forest gives

    C=((1+x)^2 K,(1+x)K,(1+x)K,K),   D=(K,K,K,K).

The proof reduces g1 and g2 to forest edge incidences of K.  A universal
wedge cap followed by an exact univariate Bernstein certificate proves the
residuals; the finitely exceptional tiny orders are evaluated symbolically.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    independent_poly_bruteforce,
    independent_raw_g2,
    i2,
    i3,
    i4,
)
from derive_iso_leaf_bundle_telescope_agent import bundle_components
from derive_iso_n4_bundle_g1_deepest_configuration_agent import i5, raw_g1


HERE = Path(__file__).resolve().parent
CLASSIFICATION = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_no_parent_k2_exact_root_20260829.json"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def k2_row_substitution():
    k = sp.symbols("k0:7")
    rules = {}
    for rank in range(6):
        rules[sp.Symbol(f"cE{rank}")] = at(k, rank) + 2 * at(k, rank - 1) + at(k, rank - 2)
        rules[sp.Symbol(f"cU{rank}")] = at(k, rank) + at(k, rank - 1)
        rules[sp.Symbol(f"cV{rank}")] = at(k, rank) + at(k, rank - 1)
        rules[sp.Symbol(f"cW{rank}")] = at(k, rank)
        for name in "EUVW":
            rules[sp.Symbol(f"d{name}{rank}")] = at(k, rank)
    return k, rules


def univariate_bernstein(expression, variable):
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    for index in range(degree + 1):
        value = sum(
            polynomial.nth(power)
            * sp.binomial(index, power)
            / sp.binomial(degree, power)
            for power in range(index + 1)
        )
        yield degree, index, sp.factor(value)


def connected_edges(graph, count):
    answer = 0
    for chosen in itertools.combinations(graph.edges(), count):
        test = nx.Graph()
        test.add_edges_from(chosen)
        answer += int(len(test) == count + 1 and nx.is_connected(test))
    return answer


def three_edge_five(graph):
    answer = 0
    for chosen in itertools.combinations(graph.edges(), 3):
        vertices = set(itertools.chain.from_iterable(chosen))
        answer += int(len(vertices) == 5)
    return answer


def unlabeled_forests(order):
    if order == 0:
        return [nx.empty_graph(0)]
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for tree in trees:
            tree_types.append((size, nx.convert_node_labels_to_integers(tree)))
    answer = []

    def extend(remaining, start, chosen):
        if remaining == 0:
            answer.append(nx.disjoint_union_all([tree_types[index][1] for index in chosen]))
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            extend(remaining - size, index, [*chosen, index])

    extend(order, 0, [])
    return answer


def direct_bundle_values(rest):
    rest = nx.convert_node_labels_to_integers(rest)
    m = len(rest)
    u, v, support = m, m + 1, m + 2
    base = rest.copy()
    base.add_nodes_from((u, v, support))
    base.add_edges_from(((support, u), (support, v)))
    gamma1 = sum(bundle_components(base, (u, v), support, 1, 4))
    gamma2 = sum(bundle_components(base, (u, v), support, 2, 4))
    return gamma1, gamma2 - 2 * gamma1


def main():
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["marker"] == "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT"
    assert classification["modes"]["k2_both_protected_leaves"]["D_row_identity"] == "D=(C_W,C_W,C_W,C_W)"

    k, row_rules = k2_row_substitution()
    g1_k = sp.factor(raw_g1().subs(row_rules))
    g2_k = sp.factor(independent_raw_g2().subs(row_rules))
    expected_g1_k = (
        2 * k[0] ** 2 + 16 * k[0] * k[1] - 6 * k[0] * k[2]
        - 50 * k[0] * k[3] - 33 * k[0] * k[4] - 5 * k[0] * k[5]
        + 28 * k[1] ** 2 + 42 * k[1] * k[2] - 12 * k[1] * k[3]
        - 7 * k[1] * k[4] + 21 * k[2] ** 2 + 4 * k[2] * k[3]
    )
    expected_g2_k = (
        24 * k[0] ** 2 + 65 * k[0] * k[1] - 12 * k[0] * k[2]
        - 45 * k[0] * k[3] - 12 * k[0] * k[4] + 49 * k[1] ** 2
        + 30 * k[1] * k[2] - 3 * k[1] * k[3] + 4 * k[2] ** 2
    )
    assert sp.expand(g1_k - expected_g1_k) == 0
    assert sp.expand(g2_k - expected_g2_k) == 0

    m, e, wedges, r3, q35, r4 = sp.symbols(
        "m e W R3 Q35 R4", integer=True, nonnegative=True
    )
    invariant_rules = {
        k[0]: 1,
        k[1]: m,
        k[2]: i2(m, e),
        k[3]: i3(m, e, wedges),
        k[4]: i4(m, e, wedges, r3),
        k[5]: i5(m, e, wedges, r3, q35, r4),
    }
    g1 = sp.factor(g1_k.subs(invariant_rules))
    g2 = sp.factor(g2_k.subs(invariant_rules))
    motif_g1 = 5 * q35 + (12 * m + 13) * r3 - 5 * r4
    motif_g2 = 12 * r3
    residual_g1 = sp.factor(g1 - motif_g1)
    residual_g2 = sp.factor(g2 - motif_g2)

    expected_residual_g1 = sp.factor(
        (
            -96 * wedges * e - 180 * wedges * m**2 + 84 * wedges * m
            + 768 * wedges - 48 * e**2 * m + 156 * e**2
            + 40 * e * m**3 - 228 * e * m**2 - 820 * e * m - 204 * e
            + 65 * m**4 + 322 * m**3 + 439 * m**2 + 230 * m + 48
        ) / 24
    )
    expected_residual_g2 = sp.factor(
        (-15 * m + 3) * wedges - 2 * e**2 + 5 * e * m**2
        - 17 * e * m - 36 * e + 10 * m**3 + 45 * m**2 + 59 * m + 24
    )
    assert sp.expand(residual_g1 - expected_residual_g1) == 0
    assert sp.expand(residual_g2 - expected_residual_g2) == 0

    # For m>=3 the g1 wedge coefficient is negative; the g2 coefficient is
    # negative for m>=1.  Every forest satisfies W<=C(e,2), by concentrating
    # all degree excess at a single vertex.
    wedge_coefficient_g1 = sp.factor(sp.diff(residual_g1, wedges))
    wedge_coefficient_g2 = sp.factor(sp.diff(residual_g2, wedges))
    assert sp.expand(
        wedge_coefficient_g1 + (8 * e + 15 * m**2 - 7 * m - 64) / 2
    ) == 0
    assert sp.expand(wedge_coefficient_g2 - (3 - 15 * m)) == 0
    g1_sign_floor = sp.factor((8 * e + 15 * m**2 - 7 * m - 64).subs(e, 0))
    assert g1_sign_floor.subs(m, 3) > 0
    assert sp.diff(g1_sign_floor, m).subs(m, 3) > 0

    wedge_upper = e * (e - 1) / 2
    lower_g1 = sp.factor(residual_g1.subs(wedges, wedge_upper))
    lower_g2 = sp.factor(residual_g2.subs(wedges, wedge_upper))

    a, q = sp.symbols("a q", nonnegative=True)
    g1_box = sp.factor(lower_g1.subs({m: q + 3, e: (q + 2) * a}))
    g2_box = sp.factor(lower_g2.subs({m: q + 1, e: q * a}))
    certificates = {}
    for name, box_form, expected_degree, expected_minimum in (
        ("g1", g1_box, 3, sp.Rational(443)),
        ("g2", g2_box, 2, sp.Rational(138)),
    ):
        records = []
        minimum = None
        for degree, index, coefficient in univariate_bernstein(box_form, a):
            assert degree == expected_degree
            q_coefficients = [
                sp.Poly(sp.expand(coefficient), q).nth(power)
                for power in range(sp.Poly(sp.expand(coefficient), q).degree() + 1)
            ]
            assert all(value >= 0 for value in q_coefficients)
            at_zero = sp.factor(coefficient.subs(q, 0))
            minimum = at_zero if minimum is None else min(minimum, at_zero)
            records.append({
                "index": index,
                "coefficient": str(coefficient),
                "q_coefficients_ascending": [str(value) for value in q_coefficients],
            })
        assert minimum == expected_minimum
        certificates[name] = {
            "degree": expected_degree,
            "coefficients": records,
            "minimum_at_q0": str(minimum),
        }

    # The sign substitution for g1 starts at m=3.  Orders m=0,1,2 are exact
    # direct branches; g2 needs only m=0 separately.
    tiny = []
    for order in range(3):
        for edges in range(max(0, order - 1) + 1):
            if order <= 1 and edges:
                continue
            if order == 2 and edges not in (0, 1):
                continue
            value1 = sp.factor(g1.subs({m: order, e: edges, wedges: 0, r3: 0, q35: 0, r4: 0}))
            value2 = sp.factor(g2.subs({m: order, e: edges, wedges: 0, r3: 0, q35: 0, r4: 0}))
            assert value1 > 0 and value2 > 0
            tiny.append({"m": order, "e": edges, "g1": str(value1), "g2": str(value2)})

    # Independent direct bundle replay on every unlabeled forest through m=7.
    direct_checks = 0
    minimum_direct = {"g1": None, "g2": None}
    for order in range(8):
        for forest in unlabeled_forests(order):
            polynomial = independent_poly_bruteforce(forest)
            kvals = {k[index]: at(polynomial, index) for index in range(7)}
            raw_values = (int(g1_k.subs(kvals)), int(g2_k.subs(kvals)))
            direct_values = direct_bundle_values(forest)
            assert raw_values == direct_values
            for name, value in zip(("g1", "g2"), raw_values):
                if minimum_direct[name] is None or value < minimum_direct[name]["value"]:
                    minimum_direct[name] = {
                        "value": value,
                        "m": order,
                        "graph6": nx.to_graph6_bytes(forest, header=False).decode().strip(),
                    }
            direct_checks += 1

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K2_ROOT",
        "theorem": (
            "For every canonical no-parent root-star cell in which both protected "
            "marks are leaf neighbours of the support, g1>=0 and g2>=0."
        ),
        "row_identity": "C=((1+x)^2K,(1+x)K,(1+x)K,K), D=(K,K,K,K)",
        "raw_forms": {"g1": str(g1_k), "g2": str(g2_k)},
        "forest_invariant_forms": {"g1": str(g1), "g2": str(g2)},
        "high_motif_payment": {
            "g1": str(motif_g1),
            "proof": (
                "For m<=4, R4=0. For m>=5, let P count connected 3-edge "
                "subtrees inside connected 4-edge subtrees. Each latter tree "
                "has at least two leaf-edge deletions, so 2R4<=P; each former "
                "subtree has at most m-4 extensions in a forest, so "
                "P<=(m-4)R3. Thus (12m+13)R3-5R4>=0; Q35>=0."
            ),
            "g2": str(motif_g2),
        },
        "residuals": {"g1": str(residual_g1), "g2": str(residual_g2)},
        "wedge_cap": "W<=C(e,2) for every forest",
        "bernstein_certificates": certificates,
        "tiny_exact_branches": tiny,
        "direct_replay": {
            "orders_m": [0, 7],
            "unlabeled_forests": direct_checks,
            "minimum": minimum_direct,
            "checks": "direct bundle components = raw K-row forms",
        },
        "scope": (
            "Exact theorem for the k=2 canonical no-parent root-star mode only. "
            "It does not cover the k=0 mode, arbitrary noncanonical bundles, later "
            "FML ranks, all N4, or Erdos Problem 993."
        ),
        "dependencies": {
            CLASSIFICATION.name: hashlib.sha256(CLASSIFICATION.read_bytes()).hexdigest().upper(),
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
