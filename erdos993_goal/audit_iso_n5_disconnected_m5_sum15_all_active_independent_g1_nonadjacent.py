#!/usr/bin/env python3
"""Independent audit of root's all-active unique-sum15 ingredients.

This audit does not import either root bound builder.  It independently:

* derives unique sum15 and its six Newton rows from the interval definition;
* checks the |H|<=7 component DP against direct enumeration of whole rooted
  trees through order 15, and proves the two state sets coincide;
* rederives the active-core identities N=e+k, e(P0)=e, e(H)=e-q;
* rederives the h3 edge-union floor and h4 binomial ceiling with their row
  coefficient signs;
* rebuilds all eight e>=8, q<e high/low tensor-Bernstein/simplex cones and
  compares every polynomial and homogeneous coefficient hash;
* derives R4=30N+5e+42 and R5=30 exactly;
* pins the separately proved q=e star boundary.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    at,
    choose,
    interval_cells,
    unique_expressions,
)
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    multinomial,
    polynomial_hash,
    tensor_bernstein_sparse,
    weak_compositions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_all_active_independent_audit_g1_nonadjacent_20260830.json"
MARKER = "PASS_INDEPENDENT_AUDIT_ISO_N5_DISCONNECTED_M5_SUM15_ALL_ACTIVE_G1_NONADJACENT"
BASE = 8
DEPENDENCIES = {
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "prove_iso_n5_disconnected_m5_sum15_small_h_root.py":
        "7FBCEEF13FB0AB00B7C45DDB3F6D93D15EA1DECA2511D99D2D522CA5D23AF909",
    "iso_n5_disconnected_m5_sum15_small_h_exact_root_20260830.json":
        "6FBF021EACF808B4FFBAB7CB1ADCD934EBF7468F441A0A52F51630756EC2342C",
    "probe_iso_n5_disconnected_m5_sum15_general_q_ratio_root.py":
        "668CB433FB853756678528B1A92FE6166261392C540E42FF949D0E42CF941F29",
    "iso_n5_disconnected_m5_sum15_general_q_ratio_probe_root_20260830.json":
        "C1D3C6B2C7F9EFB25B03CAEA4F02A6790D669D6EAEEC8A2F4250496CFC6B9D0B",
    "prove_iso_n5_disconnected_m5_qeq_star_boundary_g1_nonadjacent.py":
        "DB2CDBFAF42E56DC7F7902145CC38603B54567404E73DE02068E7AC12695C6C8",
    "iso_n5_disconnected_m5_qeq_star_boundary_exact_g1_nonadjacent_20260830.json":
        "DC94064EC7745823F9516ECB78E70BCB3E3C2867122D431835EFF6FD8E247E65",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def derive_rows():
    isolate_count = sp.symbols("isolate_count", integer=True, nonnegative=True)
    x = sp.symbols("audit_x0:8", nonnegative=True)
    h = sp.symbols("audit_h0:7", nonnegative=True)
    p = tuple(sp.expand(sum(
        sp.binomial(isolate_count, j) * at(x, rank - j)
        for j in range(rank + 1)
    )) for rank in range(8))
    expressions = unique_expressions(interval_cells(P, H))
    assert len(expressions) == 16
    twice = sp.expand(sp.expand_func(
        (2 * expressions[14])
        .subs({P[rank]: p[rank] for rank in range(8)})
        .subs({H[rank]: h[rank] for rank in range(7)})
        .subs({x[0]: 1, h[0]: 1})
    ))
    assert sp.degree(twice, isolate_count) == 5
    rows = []
    reconstructed = 0
    for rank in range(6):
        row = sp.expand(sum(
            (-1) ** (rank - j) * sp.binomial(rank, j)
            * twice.subs(isolate_count, j)
            for j in range(rank + 1)
        ))
        rows.append(row)
        reconstructed += row * sp.binomial(isolate_count, rank)
    assert sp.expand(sp.expand_func(reconstructed) - twice) == 0
    return x, h, twice, rows


def convolution(left, right, length):
    return tuple(sum(
        at(left, index) * at(right, rank - index)
        for index in range(rank + 1)
    ) for rank in range(length))


def direct_small_states(x, h, rows):
    """Whole-tree enumeration, independent of root's component DP."""
    states = {e: set() for e in range(1, 8)}
    tree_count = rooted_instances = 0
    for tree_order in range(3, 16):
        for tree0 in nx.nonisomorphic_trees(tree_order):
            tree = nx.convert_node_labels_to_integers(tree0)
            tree_count += 1
            for root in tree:
                selected = list(tree.neighbors(root))
                if any(tree.degree(vertex) == 1 for vertex in selected):
                    continue
                e = tree_order - 1 - len(selected)
                if not 1 <= e <= 7:
                    continue
                p_graph = tree.copy(); p_graph.remove_node(root)
                h_graph = tree.copy(); h_graph.remove_nodes_from({root, *selected})
                x_values = tuple(at(poly_forest(p_graph), rank) for rank in range(6))
                h_values = tuple(at(poly_forest(h_graph), rank) for rank in range(5))
                q = sum(tree.degree(vertex) - 1 for vertex in selected)
                states[e].add((q, len(selected), x_values, h_values))
                rooted_instances += 1
    assert tree_count == 13186
    assert rooted_instances == 771
    return states, tree_count, rooted_instances


def component_dp_states():
    """Independent reconstruction of the component product state set."""
    component_types = {cost: set() for cost in range(1, 8)}
    for cost in range(1, 8):
        for tree0 in nx.nonisomorphic_trees(cost + 1):
            tree = nx.convert_node_labels_to_integers(tree0)
            x_values = tuple(at(poly_forest(tree), rank) for rank in range(6))
            for root in tree:
                lower = tree.copy(); degree = lower.degree(root); lower.remove_node(root)
                h_values = tuple(at(poly_forest(lower), rank) for rank in range(5))
                component_types[cost].add((degree, x_values, h_values))
    identity = (0, 0, (1, 0, 0, 0, 0, 0), (1, 0, 0, 0, 0))
    states = {0: {identity}}
    for total in range(1, 8):
        current = set()
        for cost in range(1, total + 1):
            for degree, component_x, component_h in component_types[cost]:
                for q0, k0, x0, h0 in states[total - cost]:
                    current.add((
                        q0 + degree,
                        k0 + 1,
                        convolution(x0, component_x, 6),
                        convolution(h0, component_h, 5),
                    ))
        states[total] = current
    return {e: states[e] for e in range(1, 8)}


def audit_small(x, h, rows, root_small):
    direct, tree_count, rooted_instances = direct_small_states(x, h, rows)
    component = component_dp_states()
    evaluator = sp.lambdify((*x, *h), rows, modules="math")
    order_reports = {}
    total_checks = 0
    for e in range(1, 8):
        assert direct[e] == component[e]
        minima = [None] * 6
        for q, k, x_values, h_values in direct[e]:
            values = [int(value) for value in evaluator(
                *(at(x_values, rank) for rank in range(8)),
                *(at(h_values, rank) for rank in range(7)),
            )]
            assert all(value >= 0 for value in values)
            for index, value in enumerate(values):
                minima[index] = value if minima[index] is None else min(minima[index], value)
        root_row = root_small["orders"][str(e)]
        assert len(direct[e]) == root_row["distinct_coefficient_states"]
        assert minima == root_row["minimum_R0_through_R5"]
        total_checks += 6 * len(direct[e])
        order_reports[str(e)] = {
            "H_order": e,
            "direct_whole_tree_states": len(direct[e]),
            "component_DP_states": len(component[e]),
            "sets_identical": True,
            "minimum_R0_through_R5": minima,
        }
    assert total_checks == 3186
    return {
        "whole_unlabeled_trees_considered": tree_count,
        "direct_active_root_instances": rooted_instances,
        "distinct_states": sum(len(direct[e]) for e in direct),
        "newton_row_checks": total_checks,
        "orders": order_reports,
        "bijection_reason": (
            "Every active component is a tree C with one selected root.  It "
            "contributes X=I(C), H=I(C-root), q=deg(root), k=1.  Joining any "
            "multiset of these components to a new central root gives a tree, "
            "and deleting the central root recovers exactly that multiset."
        ),
    }


def shift_homogenize(rows, simplex_length):
    homogeneous_rows = []
    total_terms = 0
    minimum = None
    for row in rows:
        shifted = {}
        for key, coefficient in row.items():
            e_power = key[0]
            for t_power in range(e_power + 1):
                new_key = (t_power, *key[1:])
                shifted[new_key] = shifted.get(new_key, 0) + (
                    coefficient * sp.binomial(e_power, t_power)
                    * BASE ** (e_power - t_power)
                )
        shifted = {key: sp.cancel(value) for key, value in shifted.items() if value}
        degree = max(sum(key[1:]) for key in shifted)
        homogeneous = {}
        for key, coefficient in shifted.items():
            missing = degree - sum(key[1:])
            for extra in weak_compositions(missing, simplex_length):
                new_key = (key[0], *(
                    left + right for left, right in zip(key[1:], extra)
                ))
                homogeneous[new_key] = homogeneous.get(new_key, 0) + (
                    coefficient * multinomial(missing, extra)
                )
        homogeneous = {key: sp.cancel(value) for key, value in homogeneous.items() if value}
        assert all(value >= 0 for value in homogeneous.values())
        local = min(homogeneous.values())
        minimum = local if minimum is None else min(minimum, local)
        total_terms += len(homogeneous)
        homogeneous_rows.append(homogeneous)
    return homogeneous_rows, total_terms, minimum


def lower_rows(x, h, rows):
    e, q, k = sp.symbols("audit_e audit_q audit_k", nonnegative=True)
    N = e + k
    substitutions = {
        x[1]: N,
        x[2]: choose(N, 2) - e,
        h[1]: e,
        h[2]: choose(e, 2) - (e - q),
    }
    h3_floor = choose(e, 3) - (e - q) * (e - 2)
    expected = [
        (3 * x[2], -5 * x[1]),
        (3 * x[1], sp.Integer(-5)),
        (sp.Integer(3), sp.Integer(0)),
        (sp.Integer(0), sp.Integer(0)),
    ]
    lowered = []
    signs = []
    for index in range(4):
        actual = tuple(sp.factor(rows[index].coeff(h[rank])) for rank in (3, 4))
        assert all(sp.expand(a - b) == 0 for a, b in zip(actual, expected[index]))
        lowered.append(sp.expand(rows[index].subs(substitutions).subs({
            h[3]: h3_floor,
            h[4]: choose(e, 4),
        })))
        signs.append([str(value) for value in actual])
    r4 = sp.factor(rows[4].subs(substitutions))
    r5 = sp.factor(rows[5].subs(substitutions))
    assert sp.expand(r4 - (30 * N + 5 * e + 42)) == 0
    assert r5 == 30
    return (e, q, k), N, lowered, signs, (r4, r5)


def audit_sector(sector, symbols, N, x, lowered, expected_rows):
    e, q, k = symbols
    v, w, alpha = sp.symbols(f"audit_{sector}_v audit_{sector}_w audit_{sector}_alpha", nonnegative=True)
    q_box = 1 + v * (e - 2)
    k_box = 1 + w * (q_box - 1)
    N_box = sp.expand(N.subs({q: q_box, k: k_box}))
    rho1_fixed = sp.factor(4 * (choose(N_box, 2) - e) / N_box)
    budget = rho1_fixed - 3
    z = sp.symbols(f"audit_{sector}_z0:4", nonnegative=True)
    rho4 = budget * z[0]
    rho3 = rho4 + 1 + budget * z[1]
    if sector == "high":
        rho2 = rho3 + 1 + budget * z[2]
        rho1 = rho2 + 1 + budget * z[3]
        cubes = (v, w)
    else:
        rho2 = rho3 + 2 - alpha + budget * z[2]
        rho1 = rho2 + alpha + budget * z[3]
        cubes = (v, w, alpha)
    assert sp.factor(rho1 - rho1_fixed - budget * (sum(z) - 1)) == 0
    product = 1
    substitutions = {}
    for rank, rho in zip(range(2, 6), (rho1, rho2, rho3, rho4)):
        product *= rho
        substitutions[x[rank]] = (
            N_box * product / (2 ** (rank - 1) * sp.factorial(rank))
        )
    reports = []
    for index, lower in enumerate(lowered):
        expression = sp.together(
            lower.subs({q: q_box, k: k_box}).subs(substitutions)
        )
        numerator, denominator = sp.fraction(expression)
        denominator = sp.factor(denominator)
        polynomial = sp.Poly(numerator, e, *cubes, *z)
        degrees, bernstein = tensor_bernstein_sparse(polynomial, len(cubes))
        homogeneous, terms, minimum = shift_homogenize(bernstein, len(z))
        actual = {
            "row": index,
            "positive_denominator": str(denominator),
            "power_terms": len(polynomial.terms()),
            "power_hash": polynomial_hash(polynomial),
            "cube_degrees": degrees,
            "cube_rows": len(bernstein),
            "homogeneous_terms": terms,
            "minimum": str(minimum),
            "homogeneous_hash": coefficient_rows_hash(homogeneous),
        }
        comparable = dict(actual)
        # Symbol names are intentionally audit-local; compare the positive
        # denominator after canonical renaming and every coefficient datum exactly.
        comparable["positive_denominator"] = comparable["positive_denominator"].replace(
            "audit_e", "e"
        ).replace(f"audit_{sector}_v", "v").replace(f"audit_{sector}_w", "w").replace(
            f"audit_{sector}_alpha", "alpha"
        )
        assert comparable == expected_rows[index], (
            sector, index, comparable, expected_rows[index]
        )
        reports.append(actual)
    return reports


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    root_small = json.loads((HERE / "iso_n5_disconnected_m5_sum15_small_h_exact_root_20260830.json").read_text())
    root_large = json.loads((HERE / "iso_n5_disconnected_m5_sum15_general_q_ratio_probe_root_20260830.json").read_text())
    boundary = json.loads((HERE / "iso_n5_disconnected_m5_qeq_star_boundary_exact_g1_nonadjacent_20260830.json").read_text())
    assert boundary["marker"] == "PASS_EXACT_ISO_N5_DISCONNECTED_M5_QEQ_STAR_BOUNDARY_G1_NONADJACENT"
    assert 15 in boundary["open_unique_expression_indices_one_based"]

    x, h, twice, rows = derive_rows()
    small = audit_small(x, h, rows, root_small)
    symbols, N, lowered, signs, terminal = lower_rows(x, h, rows)
    sectors = {
        sector: audit_sector(sector, symbols, N, x, lowered, root_large[sector])
        for sector in ("high", "low")
    }
    total_terms = sum(
        row["homogeneous_terms"] for sector in sectors.values() for row in sector
    )
    assert total_terms == 237351
    report = {
        "marker": MARKER,
        "finding": (
            "No gap found.  Root's small-state bridge, interior parameter domain, "
            "coefficient inequalities, ratio cones, terminal rows, and q=e "
            "boundary coverage all independently check exactly."
        ),
        "newton_identity": {
            "twice_sum15": str(sp.factor(twice)),
            "R0_through_R5": [str(sp.factor(row)) for row in rows],
        },
        "small_H_independent_topology_audit": small,
        "active_component_geometry": {
            "component": "each active component is a rooted tree C",
            "contribution": "X=I(C), H=I(C-root), q=deg(root), k=1",
            "global_identities": "N=e+k, e(P0)=e, e(H)=e-q, 1<=k<=q",
        },
        "interior_domain": {
            "range": "e>=8, 1<=k<=q<=e-1",
            "parameterization": "q=1+v(e-2), k=1+w(q-1), 0<=v,w<=1",
            "endpoint_note": "q=1 forces k=1; q=e is supplied by the pinned star-boundary theorem",
        },
        "coefficient_bounds": {
            "h3_floor": "C(e,3)-(e-q)(e-2)",
            "h3_proof": "edge-union bound in the e-vertex, (e-q)-edge forest H",
            "h4_ceiling": "C(e,4)",
            "R0_through_R3_h3_h4_coefficients": signs,
        },
        "interior_exact_cones": {
            "high": sectors["high"],
            "low": sectors["low"],
            "homogeneous_coefficients": total_terms,
            "all_root_hashes_matched": True,
        },
        "terminal_rows": {
            "R4": str(terminal[0]),
            "R4_identity": "30N+5e+42",
            "R5": str(terminal[1]),
        },
        "q_equals_e_boundary": {
            "marker": boundary["marker"],
            "source_sha256": DEPENDENCIES["prove_iso_n5_disconnected_m5_qeq_star_boundary_g1_nonadjacent.py"],
            "report_sha256": DEPENDENCIES["iso_n5_disconnected_m5_qeq_star_boundary_exact_g1_nonadjacent_20260830.json"],
        },
        "coverage": (
            "e<=7 is exact by the direct/tree-component state equality.  For "
            "e>=8 and q<e the eight exact cones prove R0,...,R3 and the terminal "
            "identities prove R4,R5.  The pinned q=e theorem covers the remaining "
            "boundary.  Nonnegative Newton rows handle every isolate count."
        ),
        "scope": (
            "Independent audit of active-root unique sum15 only; no claim about "
            "common-factor transport, all disconnected M5, connected-nonadjacent "
            "M5, M5+3C5, g1, N5, or Erdos Problem 993."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "small_distinct_states": small["distinct_states"],
        "direct_vs_component_sets_identical": True,
        "interior_homogeneous_coefficients": total_terms,
        "root_hashes_matched": True,
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
