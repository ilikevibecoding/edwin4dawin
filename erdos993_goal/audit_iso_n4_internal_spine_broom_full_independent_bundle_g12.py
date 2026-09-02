#!/usr/bin/env python3
"""Fail-closed independent audit of the full rank-four internal-spine broom theorem.

The target theorem treats a deepest whole sibling bundle whose support lies
internally on the protected u--v connector.  This audit reconstructs the raw
Gamma coefficients, the one-ended-broom rows, the ordinary p!=v forest
invariants, the high-motif split, the monotone forest relaxation, and every
Newton/power coefficient without importing target proof functions.  Only
after the independent proof has passed are target expressions and ordered
coefficient hashes compared.  The endpoint p=v half is imported from a
separate independent theorem with a pinned hash.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
TARGET = HERE / "prove_iso_n4_bundle_internal_spine_broom_g12_independent_g1_bernstein.py"
ENDPOINT = HERE / "iso_n4_internal_spine_endpoint_broom_g12_independent_exact_agent_20260829.json"
CONFIG = HERE / "iso_n4_bundle_internal_spine_broom_configuration_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_internal_spine_broom_full_independent_audit_bundle_g12_20260829.json"
MARKER = "PASS_FAIL_CLOSED_INDEPENDENT_ISO_N4_INTERNAL_SPINE_BROOM_G12_AUDIT_BUNDLE_G12"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank: int):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose(value, rank: int):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    numerator = sp.sympify(
        sp.prod(sp.sympify(value) - offset for offset in range(rank))
    )
    return sp.expand(
        numerator / sp.Integer(factorial(rank))
    )


def plus(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def shift_x(row):
    return tuple(at(row, rank - 1) for rank in range(6))


def product(left, right):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, rank - j) for j in range(rank + 1)))
        for rank in range(6)
    )


def isolate_row(number):
    return tuple(choose(number, rank) for rank in range(6))


def path_row(order):
    """I(P_order), with P_0=P_-1=1 and P_-2 the zero coalescence row."""
    order = sp.sympify(order)
    if order.is_Integer:
        value = int(order)
        if value == -2:
            return (sp.Integer(0),) * 6
        if value <= 0:
            return (sp.Integer(1),) + (sp.Integer(0),) * 5
        return tuple(
            sp.Integer(comb(value - rank + 1, rank))
            if value - rank + 1 >= rank
            else sp.Integer(0)
            for rank in range(6)
        )
    return tuple(choose(order - rank + 1, rank) for rank in range(6))


def broom_rows(length, leaves):
    leaf_row = isolate_row(leaves)
    p1, p2, p3 = path_row(length - 1), path_row(length - 2), path_row(length - 3)
    whole = plus(product(leaf_row, p1), shift_x(p2))
    delete_u = product(leaf_row, p1)
    if sp.sympify(length).is_Integer and int(length) == 1:
        delete_attachment = leaf_row
    else:
        delete_attachment = plus(product(leaf_row, p2), shift_x(p3))
    delete_both = product(leaf_row, p2)
    return whole, delete_u, delete_attachment, delete_both


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


def isolate_multiply(rows, number):
    factor = isolate_row(number)
    return tuple(product(row, factor) for row in rows)


def add_xd(crows, drows):
    return tuple(
        tuple(sp.expand(at(crow, rank) + at(drow, rank - 1)) for rank in range(6))
        for crow, drow in zip(crows, drows)
    )


def raw_gamma_forms():
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")

    def gamma(number: int):
        base = add_xd(crows, drows)
        enlarged = add_xd(isolate_multiply(crows, number), drows)
        lower = sum(nested(isolate_multiply(crows, t), 3) for t in range(number))
        return sp.expand(nested(enlarged, 4) - nested(base, 4) - lower)

    g1 = gamma(1)
    g2 = sp.expand(gamma(2) - 2 * g1)
    return g1, g2


RAW_G1, RAW_G2 = raw_gamma_forms()


def i2(n, e):
    return sp.expand(choose(n, 2) - e)


def i3(n, e, w):
    return sp.expand(choose(n, 3) - e * (n - 2) + w)


def i4(n, e, w, r3):
    return sp.expand(choose(n, 4) - e * choose(n - 2, 2) + choose(e, 2) + w * (n - 4) - r3)


def i5(n, e, w, r3, q35, r4):
    return sp.expand(
        choose(n, 5)
        - e * choose(n - 2, 3)
        + choose(e, 2) * (n - 4)
        + w * choose(n - 4, 2)
        - r3 * (n - 4)
        - q35
        + r4
    )


def symbolic_row(prefix):
    return tuple(sp.Symbol(f"{prefix}_{rank}") for rank in range(6))


def derive_ordinary(length, leaves):
    r0, rv, rp, rpv = (symbolic_row(name) for name in ("r0", "rv", "rp", "rpv"))
    whole, delete_u, delete_a, delete_au = broom_rows(length, leaves)
    crows = (
        product(whole, r0), product(delete_u, r0),
        product(whole, rv), product(delete_u, rv),
    )
    drows = (
        product(delete_a, rp), product(delete_au, rp),
        product(delete_a, rpv), product(delete_au, rpv),
    )
    row_rules = {
        **{
            sp.Symbol(f"c{name}{rank}"): row[rank]
            for name, row in zip("EUVW", crows) for rank in range(6)
        },
        **{
            sp.Symbol(f"d{name}{rank}"): row[rank]
            for name, row in zip("EUVW", drows) for rank in range(6)
        },
    }

    m, edges, dp, dv, adjacent = sp.symbols(
        "m F_edges F_degree_p F_degree_v F_adjacent"
    )
    common = sp.Symbol("F_common_neighbor")
    xp, xv, wedges = sp.symbols(
        "F_neighbor_excess_p F_neighbor_excess_v F_wedges_E"
    )
    re, rp3, rv3 = sp.symbols("F_connected3_E F_connected3_P F_connected3_V")
    q35, r4 = sp.symbols("F_three_edge_five F_connected4_E")
    wp = wedges - choose(dp, 2) - xp
    wv = wedges - choose(dv, 2) - xv
    epv = edges - dp - dv + adjacent
    wpv = (
        wedges - choose(dp, 2) - choose(dv, 2) - xp - xv
        + adjacent * (dp + dv - 2) + common
    )
    invariant_rules = {
        r0[0]: 1, r0[1]: m, r0[2]: i2(m, edges), r0[3]: i3(m, edges, wedges),
        r0[4]: i4(m, edges, wedges, re), r0[5]: i5(m, edges, wedges, re, q35, r4),
        rv[0]: 1, rv[1]: m - 1, rv[2]: i2(m - 1, edges - dv),
        rv[3]: i3(m - 1, edges - dv, wv), rv[4]: i4(m - 1, edges - dv, wv, rv3),
        rp[0]: 1, rp[1]: m - 1, rp[2]: i2(m - 1, edges - dp),
        rp[3]: i3(m - 1, edges - dp, wp), rp[4]: i4(m - 1, edges - dp, wp, rp3),
        rpv[0]: 1, rpv[1]: m - 2, rpv[2]: i2(m - 2, epv),
        rpv[3]: i3(m - 2, epv, wpv),
    }
    g1 = sp.factor(RAW_G1.subs(row_rules).subs(invariant_rules))
    g2 = sp.factor(RAW_G2.subs(row_rules).subs(invariant_rules))
    return g1, g2


MOTIFS = (
    "F_connected3_E", "F_connected3_P", "F_connected3_V",
    "F_three_edge_five", "F_connected4_E",
)


def split_motif(expression):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    motif = sp.factor(sum(
        sp.diff(expression, names[name]) * names[name]
        for name in MOTIFS if name in names
    ))
    return motif, sp.factor(expression - motif)


def newton(expression, variable):
    degree = max(0, sp.Poly(sp.expand(expression), variable).degree())
    values = [sp.expand(expression.subs(variable, value)) for value in range(degree + 1)]
    answer = []
    while values:
        answer.append(sp.factor(values[0]))
        values = [sp.expand(values[j + 1] - values[j]) for j in range(len(values) - 1)]
    assert sp.expand(
        sum(value * choose(variable, rank) for rank, value in enumerate(answer)) - expression
    ) == 0
    return answer


def power_audit(expression, variables):
    variables = tuple(variable for variable in variables if variable in expression.free_symbols)
    terms = sp.Poly(sp.expand(expression), *variables).terms() if variables else [((), expression)]
    values = [coefficient for _, coefficient in terms]
    assert all(value >= 0 for value in values)
    return len(values), min(values)


def expression_digest(expression):
    return hashlib.sha256(sp.srepr(sp.expand(expression)).encode()).hexdigest().upper()


def normalize_to(expression, reference):
    names = {str(symbol): symbol for symbol in reference.free_symbols}
    return sp.expand(expression.xreplace({symbol: names[str(symbol)] for symbol in expression.free_symbols}))


def motif_and_monotonicity(length, leaves, g1, g2):
    motif1, residual1 = split_motif(g1)
    motif2, residual2 = split_motif(g2)
    names = {str(symbol): symbol for symbol in g1.free_symbols | g2.free_symbols}
    m, e, dp, dv = (names[name] for name in ("m", "F_edges", "F_degree_p", "F_degree_v"))
    xp, xv, common, wedges = (
        names[name] for name in (
            "F_neighbor_excess_p", "F_neighbor_excess_v", "F_common_neighbor", "F_wedges_E"
        )
    )
    re, rp3, rv3, q35, r4 = (
        names[name] for name in (
            "F_connected3_E", "F_connected3_P", "F_connected3_V",
            "F_three_edge_five", "F_connected4_E",
        )
    )
    total = sp.expand(m + sp.sympify(length) + leaves)
    expected1 = (
        (7 * total - 12) * re + 5 * rp3 + (5 * total - 4) * rv3 + 5 * q35 - 5 * r4
    )
    expected2 = 7 * re + 5 * rv3
    assert sp.expand(motif1 - expected1) == 0
    assert sp.expand(motif2 - expected2) == 0

    # 2(m-4)R3+5Q35-5R4>=0; everything left has a positive coefficient.
    remaining_re = sp.factor((7 * total - 12) - 2 * (m - 4))
    assert sp.expand(remaining_re - (5 * m + 7 * sp.sympify(length) + 7 * leaves - 4)) == 0

    d1 = {name: sp.factor(sp.diff(residual1, symbol)) for name, symbol in (
        ("xp", xp), ("xv", xv), ("common", common), ("wedge", wedges)
    )}
    d2 = {name: sp.factor(sp.diff(residual2, symbol)) for name, symbol in (
        ("xp", xp), ("xv", xv), ("common", common), ("wedge", wedges)
    )}
    assert sp.expand(d1["xp"] - (7 * total - 22)) == 0
    assert sp.expand(d1["common"] - (4 - 5 * total)) == 0
    assert sp.expand(d2["xp"] - 2) == 0
    assert sp.expand(d2["xv"] - (12 * total - 14)) == 0
    assert sp.expand(d2["common"] + 5) == 0
    assert sp.expand(d2["wedge"] + 3 * (5 * total - 11)) == 0

    xv_floor = 6 * total**2 - 20 * total + 8
    wedge_floor = 15 * total**2 - 81 * total + 48
    xv_remainder = sp.factor(d1["xv"] - xv_floor - 2 * (m - 1 - e))
    wedge_remainder = sp.factor(
        -2 * d1["wedge"] - wedge_floor
        - 12 * (e - dv) - 4 * (m - 1 - e)
    )
    ell = sp.sympify(length)
    if ell.is_Integer and int(ell) == 1:
        assert sp.expand(xv_remainder - (3 * m + 2)) == 0
        assert sp.expand(wedge_remainder - (10 * m - 14)) == 0
    else:
        assert sp.expand(xv_remainder - 3 * (m + ell - 3)) == 0
        assert sp.expand(wedge_remainder - 2 * (5 * m + 6 * ell - 16)) == 0

    return {
        "g1": {
            "xp": str(d1["xp"]), "xv": str(d1["xv"]),
            "common": str(d1["common"]), "wedge": str(d1["wedge"]),
            "xv_floor_n_ge_5": "6*n^2-20*n+8>=58",
            "negative_twice_wedge_floor_n_ge_5": "15*n^2-81*n+48>=18",
            "xv_floor_remainder": str(xv_remainder),
            "wedge_floor_remainder": str(wedge_remainder),
        },
        "g2": {name: str(value) for name, value in d2.items()},
        "motif_g1": str(motif1), "motif_g2": str(motif2),
        "incidence_core": "2(m-4)R3(F)+5Q35(F)-5R4(F)>=0",
        "remaining_R3_coefficient": str(remaining_re),
    }, residual1, residual2


def cone_certificate(length, leaves, residuals):
    tail = not sp.sympify(length).is_Integer
    L = next((symbol for symbol in sp.sympify(length).free_symbols if str(symbol) == "L"), None)
    x, y, remainder, components = sp.symbols("x y remainder components", nonnegative=True)
    outer = tuple(value for value in (L, x, y, remainder, components) if value is not None)
    rows = []
    for coefficient_name, residual in zip(("g1", "g2"), residuals):
        names = {str(symbol): symbol for symbol in residual.free_symbols}
        branches = []
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
                    choose(1 + x, 2) + choose(1 + y, 2) + choose(rooted_remainder + 1, 2)
                ),
            }
            lower = sp.factor(residual.subs(rules))
            coefficients = newton(lower, leaves)
            stream = hashlib.sha256()
            term_count = 0
            minimum = None
            for rank, value in enumerate(coefficients):
                count, local_minimum = power_audit(value, outer)
                term_count += count
                minimum = local_minimum if minimum is None else min(minimum, local_minimum)
                stream.update(f"{rank}:{sp.srepr(sp.expand(value))}\n".encode())
            branches.append({
                "branch": f"adjacent_{adjacent}",
                "degree_k": len(coefficients) - 1,
                "term_count": term_count,
                "minimum": str(minimum),
                "ordered_coefficient_sha256": stream.hexdigest().upper(),
            })
        rows.append({"coefficient": coefficient_name, "branches": branches})
    return rows


def independent_row(graph):
    nodes = tuple(graph.nodes())
    return tuple(
        sum(
            all(not graph.has_edge(a, b) for a in chosen for b in chosen if a < b)
            for chosen in __import__("itertools").combinations(nodes, rank)
        )
        for rank in range(6)
    )


def direct_g12(forest, length, leaves, p, v):
    r0 = independent_row(forest)
    f_v = forest.copy(); f_v.remove_node(v)
    f_p = forest.copy(); f_p.remove_node(p)
    f_pv = forest.copy(); f_pv.remove_nodes_from((p, v))
    rv, rp, rpv = independent_row(f_v), independent_row(f_p), independent_row(f_pv)
    whole, delete_u, delete_a, delete_au = broom_rows(length, leaves)
    crows = (product(whole, r0), product(delete_u, r0), product(whole, rv), product(delete_u, rv))
    drows = (product(delete_a, rp), product(delete_au, rp), product(delete_a, rpv), product(delete_au, rpv))
    base = add_xd(crows, drows)
    one = add_xd(isolate_multiply(crows, 1), drows)
    two = add_xd(isolate_multiply(crows, 2), drows)
    lower0 = nested(crows, 3)
    lower1 = nested(isolate_multiply(crows, 1), 3)
    g1 = sp.expand(nested(one, 4) - nested(base, 4) - lower0)
    gamma2 = sp.expand(nested(two, 4) - nested(base, 4) - lower0 - lower1)
    return int(g1), int(gamma2 - 2 * g1)


def tiny_structural_theorem():
    edge = nx.path_graph(2)
    edge_isolate = nx.Graph([(0, 1)]); edge_isolate.add_node(2)
    path3 = nx.path_graph(3)
    cases = (
        ("n3_edge", edge, 1, 0, 0, 1, (16, 78)),
        ("n4_edge_k1", edge, 1, 1, 0, 1, (96, 246)),
        ("n4_edge_ell2", edge, 2, 0, 0, 1, (63, 186)),
        ("n4_edge_plus_isolate", edge_isolate, 1, 0, 0, 1, (150, 295)),
        ("n4_P3_p_center", path3, 1, 0, 1, 0, (106, 267)),
        ("n4_P3_v_center", path3, 1, 0, 0, 1, (85, 218)),
        ("n4_P3_distance_two", path3, 1, 0, 0, 2, (84, 251)),
    )
    records = []
    for label, forest, ell, k, p, v, expected in cases:
        actual = direct_g12(forest, ell, k, p, v)
        assert actual == expected
        records.append({"case": label, "g1": actual[0], "g2": actual[1]})
    return {
        "kind": "exact structural exhaustion, not a census",
        "classification": (
            "Ordinary p!=v has m>=2 and ell>=1.  Total n<5 permits only "
            "(m,ell,k)=(2,1,0),(2,1,1),(2,2,0),(3,1,0).  The two-vertex "
            "parent is the rooted edge.  On three vertices, p and v in one "
            "component give an edge plus isolate, or P3 with p central, v "
            "central, or p,v at distance two.  These seven cases are exhaustive."
        ),
        "records": records,
        "minimum_g1": min(row["g1"] for row in records),
        "minimum_g2": min(row["g2"] for row in records),
    }


def load_target():
    spec = importlib.util.spec_from_file_location("broom_target_for_audit", TARGET)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main():
    endpoint = json.loads(ENDPOINT.read_text(encoding="utf-8"))
    assert endpoint["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_INTERNAL_SPINE_ENDPOINT_BROOM_G12_AGENT"
    assert endpoint["source_sha256"] == sha256(HERE / "prove_iso_n4_internal_spine_endpoint_broom_g12_independent_agent.py")
    configuration = json.loads(CONFIG.read_text(encoding="utf-8"))
    assert configuration["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_CONFIGURATION_AGENT"

    # Cross-check the independent raw reconstruction against two separately
    # maintained canonical raw forms.
    from derive_iso_n4_bundle_g1_deepest_configuration_agent import raw_g1
    from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import independent_raw_g2
    assert sp.expand(RAW_G1 - raw_g1()) == 0
    assert sp.expand(RAW_G2 - independent_raw_g2()) == 0

    k = sp.Symbol("k", integer=True, nonnegative=True)
    L = sp.Symbol("L", integer=True, nonnegative=True)
    lengths = (*range(1, 7), 7 + L)
    certificates = {}
    independent_forms = {}
    totals = {"g1": 0, "g2": 0}
    minima = {"g1": None, "g2": None}
    for length in lengths:
        label = f"ell_{length}" if sp.sympify(length).is_Integer else "ell_7_plus_L"
        g1, g2 = derive_ordinary(length, k)
        proof, residual1, residual2 = motif_and_monotonicity(length, k, g1, g2)
        cone = cone_certificate(length, k, (residual1, residual2))
        certificates[label] = {"proof": proof, "cone": cone}
        independent_forms[label] = (g1, g2)
        for row in cone:
            for branch in row["branches"]:
                totals[row["coefficient"]] += branch["term_count"]
                value = sp.sympify(branch["minimum"])
                current = minima[row["coefficient"]]
                minima[row["coefficient"]] = value if current is None else min(current, value)

    assert totals == {"g1": 1932, "g2": 840}
    assert minima == {"g1": sp.Rational(5, 8), "g2": sp.Integer(6)}
    tiny = tiny_structural_theorem()

    # Compare only after the independent proof has completed.  This detects
    # target drift without using target algebra as a premise.
    target = load_target()
    assert target.MARKER == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_G12_G1_BERNSTEIN"
    assert sp.expand(normalize_to(target.RAW_G1, RAW_G1) - RAW_G1) == 0
    assert sp.expand(normalize_to(target.RAW_G2, RAW_G2) - RAW_G2) == 0
    target_form_equalities = 0
    target_hash_equalities = 0
    target_stream = hashlib.sha256()
    for length in lengths:
        label = f"ell_{length}" if sp.sympify(length).is_Integer else "ell_7_plus_L"
        ours = independent_forms[label]
        theirs = target.derive_invariant_forms(length, k, False)[:2]
        for own, other in zip(ours, theirs):
            assert sp.expand(normalize_to(other, own) - own) == 0
            target_form_equalities += 1
        target_rows = target.cone_audit_one(length, False)
        own_rows = certificates[label]["cone"]
        for own_row, target_row in zip(own_rows, target_rows):
            assert own_row["coefficient"] == target_row["coefficient"]
            for own_branch, target_branch in zip(own_row["branches"], target_row["branches"]):
                for key in ("branch", "degree_k", "term_count", "minimum", "ordered_coefficient_sha256"):
                    assert own_branch[key] == target_branch[key]
                target_hash_equalities += 1
                target_stream.update(
                    f"{label}:{own_row['coefficient']}:{own_branch['branch']}:"
                    f"{own_branch['ordered_coefficient_sha256']};".encode()
                )
    assert target_form_equalities == 14
    assert target_hash_equalities == 28

    report = {
        "marker": MARKER,
        "theorem_audited": (
            "For every ell>=1 and k>=0, the internal-spine one-ended-broom "
            "whole-bundle coefficients g1,g2 are nonnegative in the ordinary "
            "p!=v and endpoint p=v modes, with arbitrary extra forest components."
        ),
        "ordinary_independent_proof": {
            "raw_gamma_reconstructed": True,
            "row_geometry": {
                "C": "(X R0,U R0,X Rv,U Rv)",
                "D": "(Y Rp,Z Rp,Y Rpv,Z Rpv)",
                "child": "one-ended broom B_(ell,k), ell>=1,k>=0",
            },
            "forest_cone": (
                "For a=1[pv edge], x=d(p)-1,y=d(v)-1 and "
                "r=e-1-x-y=remainder+1-a.  Then m=e+1+components and "
                "W<=C(d(p),2)+C(d(v),2)+C(r+1,2).  Positive neighbor-excess "
                "coefficients are set to zero; common<=1 and the negative wedge "
                "coefficient use their upper bounds."
            ),
            "coefficient_basis": "Newton C(k,j), then ordinary powers in nonnegative cone slacks; ell=7+L tail",
            "total_power_coefficients": totals,
            "global_minimum": {name: str(value) for name, value in minima.items()},
            "branches": certificates,
            "tiny_total_n_below_5": tiny,
        },
        "endpoint_independent_import": {
            "marker": endpoint["marker"],
            "report": ENDPOINT.name,
            "report_sha256": sha256(ENDPOINT),
            "source_sha256": endpoint["source_sha256"],
            "symmetry": "The p=u orientation is obtained by swapping the two marks.",
        },
        "target_fail_closed_comparison": {
            "marker": target.MARKER,
            "source": TARGET.name,
            "source_sha256": sha256(TARGET),
            "raw_form_equalities": 2,
            "ordinary_invariant_form_equalities": target_form_equalities,
            "ordinary_ordered_cone_hash_equalities": target_hash_equalities,
            "comparison_stream_sha256": target_stream.hexdigest().upper(),
        },
        "proof_status_distinctions": {
            "theorem": "All-order exact proof for both internal-spine parent modes.",
            "finite_census": "No finite census is used as proof; the seven tiny cells are a complete structural base classification.",
            "failed_relaxation": "The invalid common-Y collision extension is absent; four broom minors X,U,Y,Z are retained.",
        },
        "scope_guard": (
            "This audits the internal-spine g1/g2 theorem only.  Global canonical "
            "mode exhaustion, g3-g6, the terminal theorem, and the N4 induction "
            "must be assembled separately; no higher rank or Erdos 993 claim is made."
        ),
        "dependencies": {
            CONFIG.name: sha256(CONFIG),
            ENDPOINT.name: sha256(ENDPOINT),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "ordinary_totals": totals,
        "ordinary_minima": {name: str(value) for name, value in minima.items()},
        "tiny_cases": len(tiny["records"]),
        "target_form_equalities": target_form_equalities,
        "target_cone_hash_equalities": target_hash_equalities,
        "target_source_sha256": sha256(TARGET),
        "source_sha256": report["source_sha256"],
        "output": OUTPUT.name,
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
