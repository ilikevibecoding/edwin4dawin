#!/usr/bin/env python3
"""Independent exact g1/g2 theorem for the p=v internal-spine broom mode.

The child side is a path of ell>=1 vertices ending at the marked vertex u,
with k>=0 additional unmarked leaves at u.  Because deleting u and deleting
the attachment vertex are different when k>0, four child factors are kept:

  X=I(A), Yu=I(A-u), Ys=I(A-a1), Zu=I(A-{a1,u}).

For p=v the exact rows are

  C=(X R0,Yu R0,X Rv,Yu Rv),
  D=(Ys Rv,Zu Rv,Ys Rv,Zu Rv).

This script reconstructs the raw Gamma binomial coefficients, independently
checks the producer configuration, proves the motif payment, certifies the
forest degree-excess cone for ell>=6 and each ell=1..5 branch, and handles
the complete total-order-below-five structural boundary.  Finite witnesses
are audits only.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import independent_raw_g2
from derive_iso_leaf_bundle_telescope_agent import aggregate_vector
from derive_iso_n4_bundle_g1_deepest_configuration_agent import raw_g1
from derive_iso_n4_bundle_polynomial_root import add_xd, isolate_multiply, nested_rank
from probe_iso_n4_internal_spine_endpoint_broom_bundle_g12 import (
    invariant_substitution,
    row_substitution,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_internal_spine_endpoint_broom_g12_independent_exact_agent_20260829.json"
CONFIG = HERE / "iso_n4_bundle_internal_spine_broom_configuration_exact_agent_20260829.json"
HIGH_MOTIF = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
PARAMETERS = HERE / "iso_n4_internal_spine_broom_parameters_root_20260829.json"
TOP_LAYERS = HERE / "iso_n4_internal_spine_broom_top_parameter_layers_exact_root_20260829.json"
PROBE_SOURCE = HERE / "probe_iso_n4_internal_spine_endpoint_broom_bundle_g12.py"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N4_INTERNAL_SPINE_ENDPOINT_BROOM_G12_AGENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(sp.prod(sp.sympify(value) - offset for offset in range(rank)) / factorial(rank))


def expression_hash(expression):
    return hashlib.sha256(sp.srepr(sp.expand(expression)).encode()).hexdigest().upper()


def generic_raw_reconstruction():
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")

    def gamma_at(number):
        tm = add_xd(isolate_multiply(crows, sp.Integer(number), 5), drows)
        t0 = add_xd(crows, drows)
        lower = sum(
            nested_rank(isolate_multiply(crows, sp.Integer(shift), 4), 3)
            for shift in range(number)
        )
        return sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower)

    gamma1 = gamma_at(1)
    g2 = sp.expand(gamma_at(2) - 2 * gamma1)
    source_g1 = raw_g1()
    source_g2 = independent_raw_g2()
    assert sp.expand(gamma1 - source_g1) == 0
    assert sp.expand(g2 - source_g2) == 0
    return {
        "Gamma1_equals_raw_g1": True,
        "Gamma2_minus_2Gamma1_equals_raw_g2": True,
        "g1_expression_sha256": expression_hash(gamma1),
        "g2_expression_sha256": expression_hash(g2),
    }


def derive_forms(length, collisions):
    rules, rows, factors = row_substitution(length, collisions)
    invariants, motifs = invariant_substitution(rows)
    g1 = sp.factor(raw_g1().subs(rules).subs(invariants))
    g2 = sp.factor(independent_raw_g2().subs(rules).subs(invariants))
    return g1, g2, motifs, factors


def split_motif(expression, motifs):
    motif = sp.factor(sum(sp.diff(expression, symbol) * symbol for symbol in motifs))
    return motif, sp.factor(expression - motif)


def producer_configuration_audit(tail, small):
    report = json.loads(CONFIG.read_text(encoding="utf-8"))
    assert report["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_CONFIGURATION_AGENT"
    comparisons = 0
    for coefficient, expression in zip(("g1", "g2"), tail):
        # Parse into the independently derived symbol objects.  SymPy Symbols
        # with the same printed name but different assumptions are distinct.
        locals_by_name = {str(symbol): symbol for symbol in expression.free_symbols}
        recorded = sp.sympify(
            report["p_equals_v"]["tail"][coefficient]["form"],
            locals=locals_by_name,
        )
        assert sp.expand(expression - recorded) == 0
        comparisons += 1
    for length in range(1, 6):
        for coefficient, expression in zip(("g1", "g2"), small[length]):
            locals_by_name = {str(symbol): symbol for symbol in expression.free_symbols}
            recorded = sp.sympify(
                report["p_equals_v"]["small"][str(length)][coefficient]["form"],
                locals=locals_by_name,
            )
            assert sp.expand(expression - recorded) == 0
            comparisons += 1
    assert comparisons == 12
    return {
        "marker": report["marker"],
        "exact_form_comparisons": comparisons,
        "report_sha256": sha256(CONFIG),
    }


def motif_certificate(length, collisions, g1, g2, motifs):
    motif1, residual1 = split_motif(g1, motifs)
    motif2, residual2 = split_motif(g2, motifs)
    names = {str(symbol): symbol for symbol in g1.free_symbols | g2.free_symbols}
    m = names["m"]
    ell = sp.sympify(length)
    total = sp.expand(m + ell + collisions)
    re = names["F_connected3_E"]
    rv = names["F_connected3_V"]
    q35 = names["F_three_edge_five"]
    r4 = names["F_connected4_E"]
    expected1 = sp.expand(
        (7 * total - 12) * re
        + (5 * total + 1) * rv
        + 5 * q35
        - 5 * r4
    )
    expected2 = 7 * re + 5 * rv
    assert sp.expand(motif1 - expected1) == 0
    assert sp.expand(motif2 - expected2) == 0

    # The universal incidence lemma gives
    # 2(m-4)RE+5Q35-5R4 >= 3R4 >= 0.
    surplus_re = sp.factor((7 * total - 12) - 2 * (m - 4))
    assert sp.expand(surplus_re - (7 * ell + 7 * collisions + 5 * m - 4)) == 0
    return {
        "g1_motif": str(motif1),
        "g2_motif": str(motif2),
        "g1_incidence_core": "2(m-4)RE+5Q35-5R4>=3R4>=0",
        "remaining_RE_coefficient": str(surplus_re),
        "remaining_RV_coefficient": str(5 * total + 1),
        "all_remaining_coefficients_nonnegative": True,
    }, residual1, residual2


def monotonicity_certificate(length, collisions, residual1, residual2):
    names = {str(symbol): symbol for symbol in residual1.free_symbols | residual2.free_symbols}
    m = names["m"]
    edges = names["F_edges"]
    degree = names["F_degree_v"]
    excess = names["F_neighbor_excess_v"]
    wedges = names["F_wedges_E"]
    ell = sp.sympify(length)
    total = sp.expand(m + ell + collisions)

    kx1 = sp.factor(sp.diff(residual1, excess))
    kw1 = sp.factor(sp.diff(residual1, wedges))
    kx2 = sp.factor(sp.diff(residual2, excess))
    kw2 = sp.factor(sp.diff(residual2, wedges))
    assert sp.expand(kx2 - (12 * total - 17)) == 0
    assert sp.expand(kw2 + 3 * (5 * total - 11)) == 0

    # Forest bounds e<=m-1 and d<=e imply the following universal floors.
    excess_floor = 6 * total**2 - 18 * total - 13
    wedge_bracket_floor = 15 * total**2 - 81 * total + 32
    excess_remainder = sp.factor(kx1.subs(edges, m - 1) - excess_floor)
    wedge_remainder = sp.factor(
        (-2 * kw1).subs({edges: m - 1, degree: m - 1}) - wedge_bracket_floor
    )

    if not ell.is_Integer:
        assert sp.expand(excess_remainder - 3 * (ell + m - 2)) == 0
        assert sp.expand(wedge_remainder - 2 * (6 * ell + 5 * m - 11)) == 0
    else:
        expected_excess = {
            1: 3 * m + 5,
            2: 3 * m,
            3: 3 * (m + 1),
            4: 3 * (m + 2),
            5: 3 * (m + 3),
        }[int(ell)]
        expected_wedge = {
            1: 2 * (5 * m - 2),
            2: 2 * (5 * m + 1),
            3: 2 * (5 * m + 7),
            4: 2 * (5 * m + 13),
            5: 2 * (5 * m + 19),
        }[int(ell)]
        assert sp.expand(excess_remainder - expected_excess) == 0
        assert sp.expand(wedge_remainder - expected_wedge) == 0

    # At total order five the floors are 47 and 2; both increase thereafter.
    assert 6 * 5**2 - 18 * 5 - 13 == 47
    assert 15 * 5**2 - 81 * 5 + 32 == 2
    return {
        "g1_neighbor_excess_derivative": str(kx1),
        "g1_wedge_derivative": str(kw1),
        "g1_neighbor_excess_floor_for_total_n": "6*n^2-18*n-13 >=47 for n>=5",
        "g1_negative_twice_wedge_floor_for_total_n": "15*n^2-81*n+32 >=2 for n>=5",
        "g1_excess_floor_remainder": str(excess_remainder),
        "g1_wedge_floor_remainder": str(wedge_remainder),
        "g2_neighbor_excess_derivative": str(kx2),
        "g2_wedge_derivative": str(kw2),
        "range": "g1 replacements valid for total n=m+ell+k>=5; g2 replacements valid for every nonempty branch n>=3",
    }


def newton_in_variable(expression, variable):
    degree = max(0, sp.Poly(sp.expand(expression), variable).degree())
    values = [sp.expand(expression.subs(variable, integer)) for integer in range(degree + 1)]
    coefficients = []
    while values:
        coefficients.append(sp.factor(values[0]))
        values = [sp.expand(values[index + 1] - values[index]) for index in range(len(values) - 1)]
    reconstruction = sp.expand(
        sum(coefficient * choose_poly(variable, rank) for rank, coefficient in enumerate(coefficients))
    )
    assert sp.expand(reconstruction - expression) == 0
    return coefficients


def scalar_power_audit(expression, variables):
    variables = tuple(variable for variable in variables if variable in expression.free_symbols)
    terms = sp.Poly(sp.expand(expression), *variables).terms() if variables else [((), expression)]
    coefficients = [coefficient for _, coefficient in terms]
    assert all(coefficient >= 0 for coefficient in coefficients)
    return len(coefficients), min(coefficients)


def cone_certificate(length, collisions, residual1, residual2):
    names = {str(symbol): symbol for symbol in residual1.free_symbols | residual2.free_symbols}
    q, x, remainder, slack = sp.symbols(
        "q x remainder slack", integer=True, nonnegative=True
    )
    ell = sp.sympify(length)
    tail = not ell.is_Integer
    ell_value = 6 + q if tail else ell
    outer = (q, x, remainder, slack) if tail else (x, remainder, slack)
    records = []
    for coefficient_name, residual in (("g1", residual1), ("g2", residual2)):
        branches = []
        for label, rules in (
            (
                "nonempty_degree_v_zero",
                {
                    names["F_edges"]: 1 + remainder,
                    names["F_degree_v"]: 0,
                    names["m"]: 2 + remainder + slack,
                    names["F_neighbor_excess_v"]: 0,
                    names["F_wedges_E"]: choose_poly(remainder + 1, 2),
                },
            ),
            (
                "nonempty_degree_v_positive",
                {
                    names["F_edges"]: 1 + x + remainder,
                    names["F_degree_v"]: 1 + x,
                    names["m"]: 2 + x + remainder + slack,
                    names["F_neighbor_excess_v"]: 0,
                    names["F_wedges_E"]: choose_poly(1 + x, 2) + choose_poly(remainder + 1, 2),
                },
            ),
            (
                "edgeless",
                {
                    names["F_edges"]: 0,
                    names["F_degree_v"]: 0,
                    names["m"]: 1 + slack,
                    names["F_neighbor_excess_v"]: 0,
                    names["F_wedges_E"]: 0,
                },
            ),
        ):
            substitutions = dict(rules)
            if tail:
                substitutions[names["ell"]] = ell_value
            lower = sp.factor(residual.subs(substitutions))
            newton = newton_in_variable(lower, collisions)
            stream = hashlib.sha256()
            total_terms = 0
            minimum = None
            rows = []
            for rank, value in enumerate(newton):
                term_count, local_minimum = scalar_power_audit(value, outer)
                total_terms += term_count
                minimum = local_minimum if minimum is None else min(minimum, local_minimum)
                stream.update(f"{rank}:{sp.srepr(sp.expand(value))};".encode())
                rows.append({"k_newton_index": rank, "power_terms": term_count, "minimum": str(local_minimum)})
            branches.append({
                "branch": label,
                "degree_k": len(newton) - 1,
                "power_terms": total_terms,
                "minimum_scalar_coefficient": str(minimum),
                "coefficient_stream_sha256": stream.hexdigest().upper(),
                "newton_rows": rows,
            })
        records.append({"coefficient": coefficient_name, "branches": branches})
    return records


def tiny_structural_boundary(small, collisions):
    cases = [
        ("n3_m2_edge_v_endpoint", 1, 0, 2, 1, 1, 0, 0, 22, 103),
        ("n4_m2_edge_v_endpoint_k1", 1, 1, 2, 1, 1, 0, 0, 103, 284),
        ("n4_m2_edge_v_endpoint_ell2", 2, 0, 2, 1, 1, 0, 0, 96, 246),
        ("n4_m3_edge_plus_isolate_v_isolated", 1, 0, 3, 1, 0, 0, 0, 146, 350),
        ("n4_m3_edge_plus_isolate_v_endpoint", 1, 0, 3, 1, 1, 0, 0, 170, 341),
        ("n4_m3_path_v_endpoint", 1, 0, 3, 2, 1, 1, 1, 104, 290),
        ("n4_m3_path_v_center", 1, 0, 3, 2, 2, 0, 1, 117, 277),
    ]
    records = []
    for label, ell, k, m, edges, degree, excess, wedges, expected1, expected2 in cases:
        g1, g2 = small[ell]
        names = {str(symbol): symbol for symbol in g1.free_symbols | g2.free_symbols}
        substitutions = {symbol: 0 for symbol in names.values()}
        substitutions.update({
            names["k"]: k,
            names["m"]: m,
            names["F_edges"]: edges,
            names["F_degree_v"]: degree,
            names["F_neighbor_excess_v"]: excess,
            names["F_wedges_E"]: wedges,
        })
        value1 = int(g1.subs(substitutions))
        value2 = int(g2.subs(substitutions))
        assert (value1, value2) == (expected1, expected2)
        records.append({"case": label, "ell": ell, "k": k, "m": m, "g1": value1, "g2": value2})
    assert len(records) == 7
    return {
        "classification": (
            "For a nonempty parent forest and total n=m+ell+k<5, necessarily "
            "(m,ell,k) is (2,1,0), (2,1,1), (2,2,0), or (3,1,0). "
            "On two vertices the parent is one rooted edge. On three vertices "
            "it is an edge plus isolate (v isolated or incident) or P3 (v an "
            "endpoint or centre). These seven rooted cases are exhaustive."
        ),
        "kind": "exact structural base theorem, not a finite census",
        "records": records,
        "minimum_g1": min(record["g1"] for record in records),
        "minimum_g2": min(record["g2"] for record in records),
    }


def direct_endpoint_collision_witness():
    u, support, v = 0, 1, 2
    graph = nx.path_graph(3)
    for leaf in range(3, 6):
        graph.add_edge(u, leaf)
    gamma = [aggregate_vector(graph, (u, v), support, number)[4] for number in range(7)]
    differences = []
    current = gamma[:]
    while current:
        differences.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    assert differences == [0, 392, 589, 510, 247, 50, 0]
    return {
        "label": "finite literal graph audit only",
        "geometry": "p=v, ell=1, k=3, parent forest is the isolated mark v",
        "Gamma_M_0_through_6": gamma,
        "binomial_coefficients": differences,
        "g1": differences[1],
        "g2": differences[2],
    }


def audit_root_top_layers_endpoint():
    parameters = json.loads(PARAMETERS.read_text(encoding="utf-8"))
    theorem = json.loads(TOP_LAYERS.read_text(encoding="utf-8"))
    assert parameters["marker"] == "DERIVED_EXACT_ISO_N4_INTERNAL_SPINE_BROOM_PARAMETER_NEWTON_ROOT"
    assert theorem["marker"] == "PASS_EXACT_ISO_N4_INTERNAL_SPINE_BROOM_TOP_PARAMETER_LAYERS_ROOT"
    assert theorem["dependency_sha256"] == sha256(PARAMETERS)
    n, e, d, reserve, delta, t = sp.symbols(
        "n e d reserve delta t", integer=True, nonnegative=True
    )
    substitutions = {
        "r0_1": n,
        "rv_1": n - 1,
        "rp_1": n - 1,
        "rvp_1": n - 1,
        "r0_2": choose_poly(n, 2) - e,
        "rv_2": choose_poly(n - 1, 2) - e + d,
    }
    records = []
    for coefficient, block in theorem["results"].items():
        for form in block["proved_forms"]:
            row_names = {
                name: sp.Symbol(name)
                for name in ("r0_1", "rv_1", "rp_1", "rvp_1", "r0_2", "rv_2")
            }
            expression = sp.sympify(form["row_form"], locals=row_names)
            endpoint_rules = {row_names[name]: value for name, value in substitutions.items()}
            endpoint_reduction = sp.factor(expression.subs(endpoint_rules).subs(e, d + reserve))
            reported = sp.sympify(
                form["structural_reduction"],
                locals={"n": n, "e": e, "d": d, "reserve": reserve, "delta": delta},
            ).subs(delta, 1)
            assert sp.expand(endpoint_reduction - reported) == 0
            assert sp.diff(endpoint_reduction, reserve) >= 0
            degree_coefficient = sp.diff(endpoint_reduction, d)
            degree_boundary = n - 1 if degree_coefficient < 0 else 0
            lower = sp.factor(endpoint_reduction.subs({reserve: 0, d: degree_boundary}))
            shifted = sp.Poly(sp.expand(lower.subs(n, 1 + t)), t)
            assert all(value > 0 for value in shifted.all_coeffs())
            records.append({
                "coefficient": coefficient,
                "index": [form["h_index"], form["k_index"]],
                "endpoint_reduction": str(endpoint_reduction),
                "endpoint_lower": str(lower),
            })
    assert len(records) == 16
    return {
        "root_marker": theorem["marker"],
        "endpoint_specializations_rebuilt": len(records),
        "all_endpoint_specializations_strictly_positive": True,
        "records": records,
        "parameter_report_sha256": sha256(PARAMETERS),
        "top_theorem_report_sha256": sha256(TOP_LAYERS),
    }


def main():
    raw_reconstruction = generic_raw_reconstruction()
    ell, k = sp.symbols("ell k", integer=True, nonnegative=True)
    tail_g1, tail_g2, tail_motifs, factors = derive_forms(ell, k)
    small_forms = {}
    for length in range(1, 6):
        g1, g2, motifs, _ = derive_forms(sp.Integer(length), k)
        small_forms[length] = (g1, g2)

    producer_audit = producer_configuration_audit((tail_g1, tail_g2), small_forms)
    high_motif = json.loads(HIGH_MOTIF.read_text(encoding="utf-8"))
    assert high_motif["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"

    branches = {}
    motif_tail, tail_residual1, tail_residual2 = motif_certificate(
        ell, k, tail_g1, tail_g2, tail_motifs
    )
    branches["tail_ell_ge_6"] = {
        "range": "ell=6+q, q>=0; k>=0",
        "g1_expression_sha256": expression_hash(tail_g1),
        "g2_expression_sha256": expression_hash(tail_g2),
        "motif": motif_tail,
        "monotonicity": monotonicity_certificate(ell, k, tail_residual1, tail_residual2),
        "cone": cone_certificate(ell, k, tail_residual1, tail_residual2),
    }
    for length in range(1, 6):
        g1, g2 = small_forms[length]
        _, _, motifs, _ = derive_forms(sp.Integer(length), k)
        motif, residual1, residual2 = motif_certificate(sp.Integer(length), k, g1, g2, motifs)
        branches[f"ell_{length}"] = {
            "range": f"ell={length}; k>=0",
            "g1_expression_sha256": expression_hash(g1),
            "g2_expression_sha256": expression_hash(g2),
            "motif": motif,
            "monotonicity": monotonicity_certificate(sp.Integer(length), k, residual1, residual2),
            "cone": cone_certificate(sp.Integer(length), k, residual1, residual2),
        }

    tiny = tiny_structural_boundary(small_forms, k)
    witness = direct_endpoint_collision_witness()
    top_audit = audit_root_top_layers_endpoint()

    report = {
        "marker": MARKER,
        "theorem": (
            "For every ell>=1, k>=0, and every parent-side forest F containing the marked "
            "vertex v, the internal-spine whole-bundle coefficients g1 and g2 are nonnegative "
            "in the endpoint-parent mode p=v, including k collision leaves at the marked child endpoint u."
        ),
        "geometry": {
            "child": "one-ended broom A: ell-vertex path ending at marked u plus k leaves at u",
            "factors": {
                "X": "(1+x)^k P_(ell-1)+xP_(ell-2)",
                "Yu": "(1+x)^k P_(ell-1)",
                "Ys": "(1+x)^k P_(ell-2)+xP_(ell-3) for ell>=2; (1+x)^k for ell=1",
                "Zu": "(1+x)^k P_(ell-2)",
            },
            "C": "(X R0,Yu R0,X Rv,Yu Rv)",
            "D": "(Ys Rv,Zu Rv,Ys Rv,Zu Rv)",
            "warning": "The common-Y bare-path row is valid only on k=0 and is not used here.",
        },
        "raw_Gamma_reconstruction": raw_reconstruction,
        "producer_configuration_independent_audit": producer_audit,
        "motif_incidence_dependency": {
            "marker": high_motif["marker"],
            "report_sha256": sha256(HIGH_MOTIF),
            "use": "Only the universal incidence inequality is used; each branch's exact motif identity is rederived here.",
        },
        "forest_cone_proof": {
            "parameterization": (
                "If e>0 and d(v)=0, write e=1+r and m=2+r+c. If d(v)>0, "
                "write d(v)=1+x, e=1+x+r, m=2+x+r+c. Here x,r,c>=0."
            ),
            "wedge_bound": (
                "W(F)<=C(d(v),2)+C(r+1,2). Remove the d(v) incident edges. "
                "The remaining r edges contribute at most C(r,2) mutual wedges and at most "
                "r incidences with neighbours of v, since a remaining edge cannot join two "
                "neighbours of v in a forest."
            ),
            "branches": branches,
            "tiny_structural_boundary": tiny,
        },
        "root_top_parameter_layers_endpoint_audit": top_audit,
        "direct_literal_witness": witness,
        "proof_status_distinctions": {
            "theorem": "Exact all-ell, all-k, all-parent-forest g1/g2 theorem for p=v.",
            "finite_census": "No finite census is used as proof; the single graph witness is an audit only.",
            "failed_relaxation": "The earlier common-Y collision extension was rejected because C_U and D_E differ for k>0.",
        },
        "scope_guard": (
            "This closes only the p=v endpoint branch of the internal-spine |S|=2 payment. "
            "The p!=v branch remains separate; consequently this report does not by itself prove "
            "the full rank-four bundle payment, all marked-forest N4, higher ranks, or Erdos Problem 993."
        ),
        "dependencies": {
            "probe_source": {"file": PROBE_SOURCE.name, "sha256": sha256(PROBE_SOURCE)},
            "configuration_report": {"file": CONFIG.name, "sha256": sha256(CONFIG)},
        },
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    cone_summary = {}
    for label, branch in branches.items():
        cone_summary[label] = {
            item["coefficient"]: {
                "branches": len(item["branches"]),
                "power_terms": sum(row["power_terms"] for row in item["branches"]),
                "minimum": str(min(sp.sympify(row["minimum_scalar_coefficient"]) for row in item["branches"])),
            }
            for item in branch["cone"]
        }
    print(json.dumps({
        "marker": MARKER,
        "producer_form_comparisons": producer_audit["exact_form_comparisons"],
        "cone_summary": cone_summary,
        "tiny_boundary": {"cases": len(tiny["records"]), "min_g1": tiny["minimum_g1"], "min_g2": tiny["minimum_g2"]},
        "top_layer_endpoint_audit": top_audit["endpoint_specializations_rebuilt"],
        "witness": {"g1": witness["g1"], "g2": witness["g2"]},
        "source_sha256": report["source_sha256"],
        "output": OUTPUT.name,
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
