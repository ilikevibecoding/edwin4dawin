#!/usr/bin/env python3
"""Exact certificate for the top-support disconnected-forest m=1 lane.

The theorem proved here is deliberately scoped.  It treats a disconnected
forest base G without isolated components, a marked vertex w, and the target
j=alpha(G-w).  Its only inductive input is q_j(G-w)<=q_2(G-w).  The other two
inputs (the all-forest q3<=q2 margin and the forest anchor gap) are pinned
unconditional theorems.

The proof keeps the fixed terminal-q3 low block (a2,z2,h2) separate from the
target-j block.  A direct canonical census checks that convention literally.
"""

from __future__ import annotations

from functools import lru_cache
from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

import audit_terminal_q3_low_newton_adversarial_agent as canonical
import audit_terminal_q3_low_newton_m2_forest_canonical_import_agent as rows
from derive_terminal_q3_m1_top_support_forest_agent import build, choose


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_top_support_forest_exact_agent_20260829.json"

PINNED = {
    "derive_terminal_q3_m1_top_support_forest_agent.py":
        "6B632A9E9E01A4D0B3D00093138C61927A7C56319B3A38698EA2CC0A782BA46C",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "prove_all_forest_q3_q2_component_lift_root.py":
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00",
    "all_forest_q3_q2_component_lift_exact_root_20260829.json":
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442",
    "audit_all_forest_q3_q2_component_lift_independent_agent.py":
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815",
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json":
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D",
    "ALL_FOREST_Q3_Q2_THEOREM_2026-08-29.md":
        "354323BF3E2EB4E60CD68441D1539B535C3A95D57F3E0DDF6B426AF99270C1B7",
    "prove_terminal_q3_forest_anchor_lift_agent.py":
        "01F04CA1C51B155D987C61611298B8B38CC60981EBA7C8269FD251B75BCB434D",
    "terminal_q3_forest_anchor_lift_exact_agent_20260829.json":
        "E9CD1A6276D589F885626AB69786D9499116D291242DA76883FAA577850F1DDF",
    "audit_terminal_q3_low_newton_m1_forest_finite_agent.py":
        "20F3FA5F42CB28D255CDC6F3D3CB3DD6E94FF384A056AC45858101E3A03FC1D4",
    "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json":
        "63E52E6956A2B1B84C79B5E5893097151A1ADFC357683345B13965AE4732F29A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_bernstein(expression, variables):
    """Exact tensor Bernstein coefficients on the unit cube."""
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    indices = list(itertools.product(*[
        range(degree + 1) for degree in degrees
    ]))
    output = {index: sp.Integer(0) for index in indices}
    for powers, coefficient in polynomial.terms():
        for index in itertools.product(*[
            range(power, degrees[q] + 1)
            for q, power in enumerate(powers)
        ]):
            output[index] += coefficient * sp.prod(
                sp.binomial(index[q], powers[q])
                / sp.binomial(degrees[q], powers[q])
                for q in range(len(variables))
            )
    return degrees, [sp.expand(output[index]) for index in indices]


def power_coefficients(expression, variable):
    return sp.Poly(sp.expand(expression), variable).all_coeffs()


@lru_cache(maxsize=1)
def endpoint_expressions():
    lower, m_coefficient, variables = build()
    j, r, h, d, R, W, y = variables
    wpoly = sp.Poly(lower, W)
    assert wpoly.degree() == 2
    w2 = sp.expand(wpoly.coeff_monomial(W**2))
    linear = sp.expand(lower - w2 * W**2)
    m = j + r - h
    rmax = m - d
    endpoints = {}
    for yvalue in (0, 1):
        for wname, wvalue in (
            ("low", choose(d, 2) + R),
            ("high", choose(m, 2)),
        ):
            boundary = sp.expand(linear.subs({y: yvalue, W: wvalue}))
            rpoly = sp.Poly(boundary, R)
            if wname == "low":
                expected_r2 = -6 * j * r * (r + 1) * (
                    2*h + j**2 + 2*j*r + j + r**2 + r + 2
                )
                assert sp.expand(rpoly.coeff_monomial(R**2) - expected_r2) == 0
            else:
                assert rpoly.degree() <= 1
            for rname, rvalue in (("zero", 0), ("max", rmax)):
                endpoints[f"y{yvalue}_{wname}_R{rname}"] = sp.expand(
                    boundary.subs(R, rvalue)
                )
    assert sp.Poly(linear, y).degree() <= 1
    return lower, m_coefficient, variables, w2, endpoints


def compile_exact_polynomial(expression, variables):
    """Compile a SymPy polynomial to a fast exact Fraction evaluator."""
    terms = []
    for powers, coefficient in sp.Poly(sp.expand(expression), *variables).terms():
        coefficient = sp.Rational(coefficient)
        terms.append((
            powers,
            Fraction(int(coefficient.p), int(coefficient.q)),
        ))

    def evaluate(values):
        total = Fraction(0)
        for powers, coefficient in terms:
            monomial = coefficient
            for value, power in zip(values, powers):
                if power:
                    monomial *= value**power
            total += monomial
        return total

    return evaluate


def generic_newton_identities():
    """Replay the degree-one product and the two-reserve elimination."""
    s, j = sp.symbols("s j")
    p0, p1, r0, r1 = sp.symbols("p0 p1 r0 r1")
    u0, u1, a, c0, e0, b = sp.symbols("u0 u1 a c0 e0 b")
    P = p0 + p1*s
    RR = r0 + r1*s
    U = u0 + u1*s
    c = c0 + a*s
    e = e0 + b*s
    A = sp.expand(P*c - a*RR)
    Q = sp.expand((j+1)*b*(c+RR) - 3*(P+a)*e)
    delta = sp.expand((j+1)*a*A*U + a*P*Q)
    delta1 = sp.expand(delta.subs(s, 1) - delta.subs(s, 0))
    A0 = p0*c0-a*r0
    A1 = p0*a+p1*c0+p1*a-a*r1
    Q0 = (j+1)*b*(c0+r0)-3*(p0+a)*e0
    Q1 = (j+1)*b*(a+r1)-3*p1*e0-3*b*(p0+a+p1)
    replay = sp.expand(
        (j+1)*a*(A0*u1+A1*u0+A1*u1)
        + a*(p0*Q1+p1*Q0+p1*Q1)
    )
    assert sp.expand(delta1-replay) == 0

    gap, margin, x = sp.symbols("gap margin x")
    anchor0 = (p0*gap+a*margin)/(2*p1)
    residual0 = (3*p0*r1-margin)/(2*p1)
    reserve = sp.expand(
        x*anchor0+p1*residual0
        - (
            sp.Rational(3, 2)*p0*r1
            + p0*x*gap/(2*p1)
            + (a*x-p1)*margin/(2*p1)
        )
    )
    assert reserve == 0
    return {
        "generic_degree1_terms": len(sp.Poly(delta1, s, j, p0, p1, r0, r1,
                                               u0, u1, a, c0, e0, b).terms()),
        "reserve_identity": "exact",
    }


def structural_checks():
    lower, mcoef, variables, w2, endpoints = endpoint_expressions()
    j, r, h, d, R, W, y = variables
    N = j+r
    m = N-h
    p0 = sp.expand(choose(N+1, 3)-m*(N-1)+W+choose(N+1, 2)-m)
    p1 = sp.expand(choose(N+1, 2)-m+N+1)
    R1 = sp.expand(m*N-2*W)
    a2 = sp.expand(choose(N, 2)-(m-d))
    wedges_f = W-choose(d, 2)-R
    z2 = sp.expand((m-d)*(N-2)-2*wedges_f)
    h2 = sp.expand(choose(N-d, 2)-(m-d-R))
    c0 = sp.expand(a2+z2+h2)
    A1 = sp.expand(p0*a2+p1*c0+p1*a2-a2*R1)
    positive_form = sp.expand(
        a2*(p0+2*p1-R1)+p1*(z2+h2)
    )
    assert sp.expand(A1-positive_form) == 0
    base_factor = sp.expand(
        (N+1)*(N**2-4*N+24)/6 + 2*(N+1)*(h-1)+3*W
    )
    assert sp.expand(p0+2*p1-R1-base_factor) == 0

    adverse_e = sp.factor(-3*p1*(2*p0+a2+p1))
    assert adverse_e.could_extract_minus_sign()
    expected_w2 = r*(r+1)*(
        -10*d*j-16*d+2*h*j-16*h+j**3+2*j**2*r+13*j**2
        +j*r**2+5*j*r+36*j-8*r**2+24*r
    )
    assert sp.expand(w2-expected_w2) == 0
    assert sp.Poly(mcoef, y).degree() == 1
    return {
        "expanded_lower_terms": len(sp.Poly(lower, *variables).terms()),
        "A1_positive_decomposition": str(sp.factor(positive_form)),
        "p0_plus_2p1_minus_R1": str(sp.factor(base_factor)),
        "adverse_e_coefficient": str(adverse_e),
        "W2_factor": str(sp.factor(w2)),
        "endpoint_count": len(endpoints),
    }


def large_cone_certificate():
    lower, mcoef, variables, w2, endpoints = endpoint_expressions()
    j, r, h, d, _R, _W, y = variables
    S, u, v, w = sp.symbols("S u v w", nonnegative=True)
    X = 10+S
    substitution = {
        j: X+2,
        r: 1+(X+1)*w,
        h: 1+X*u,
        d: 1+X*(1-u)*v,
    }
    tests = {
        "W2": w2,
        "M_y0": mcoef.subs(y, 0),
        "M_y_slope": sp.diff(mcoef, y),
        **endpoints,
    }
    records = {}
    total_bernstein = total_power = zero_power = 0
    minimum_positive = None
    for name, expression in tests.items():
        transformed = sp.expand(expression.subs(substitution, simultaneous=True))
        degrees, coefficients = tensor_bernstein(transformed, (u, v, w))
        all_power = []
        for coefficient in coefficients:
            values = power_coefficients(coefficient, S)
            assert values and all(value >= 0 for value in values), (name, coefficient)
            all_power.extend(values)
        positives = [value for value in all_power if value > 0]
        if positives:
            local_min = min(positives)
            minimum_positive = (
                local_min if minimum_positive is None
                else min(minimum_positive, local_min)
            )
        total_bernstein += len(coefficients)
        total_power += len(all_power)
        zero_power += sum(value == 0 for value in all_power)
        records[name] = {
            "degrees_u_v_w": list(degrees),
            "bernstein_coefficients": len(coefficients),
            "power_coefficients_in_S": len(all_power),
            "zero_power_coefficients": sum(value == 0 for value in all_power),
            "minimum_positive_power_coefficient": str(min(positives)) if positives else None,
        }
    return {
        "parameterization": (
            "X=j-2=10+S; h=1+Xu; d=1+X(1-u)v; "
            "r=1+(X+1)w on (u,v,w) in [0,1]^3, S>=0"
        ),
        "tests": records,
        "total_bernstein_coefficients": total_bernstein,
        "total_power_coefficients_in_S": total_power,
        "zero_power_coefficients": zero_power,
        "minimum_positive_power_coefficient": str(minimum_positive),
    }


def small_boundary_certificate():
    _lower, mcoef, variables, w2, endpoints = endpoint_expressions()
    j, r, h, d, _R, _W, y = variables
    tests = {
        "W2": w2,
        "M_y0": mcoef.subs(y, 0),
        "M_y_slope": sp.diff(mcoef, y),
        **endpoints,
    }
    compiled = {
        name: compile_exact_polynomial(expression, (j, r, h, d))
        for name, expression in tests.items()
    }
    cells = evaluations = 0
    minima = {name: None for name in tests}
    witnesses = {name: None for name in tests}
    by_X = {}
    for X in range(5, 10):
        qlow = max(0, 10-X)
        local_cells = 0
        for H in range(X+1):
            for D in range(X-H+1):
                K = X-H-D
                for q in range(qlow, X+2):
                    substitution = {
                        j: X+2, r: q+1, h: H+1, d: D+1,
                    }
                    cells += 1
                    local_cells += 1
                    for name, expression in tests.items():
                        value = compiled[name]((X+2, q+1, H+1, D+1))
                        assert value >= 0, (
                            name, X, H, D, K, q, value
                        )
                        evaluations += 1
                        if minima[name] is None or value < minima[name]:
                            minima[name] = value
                            witnesses[name] = {
                                "X": X, "H": H, "D": D, "K": K,
                                "q": q,
                            }
        by_X[str(X)] = local_cells
    return {
        "X_range": [5, 9],
        "constraint": "H+D+K=X; max(0,10-X)<=q=r-1<=X+1",
        "cells": cells,
        "test_evaluations": evaluations,
        "cells_by_X": by_X,
        "minimum_by_test": {key: str(value) for key, value in minima.items()},
        "minimum_witness_by_test": witnesses,
    }


def direct_canonical_crosscheck(max_order: int = 10):
    lower, mcoef, variables = build()
    jvar, rvar, hvar, dvar, Rvar, Wvar, yvar = variables
    lower_exact = compile_exact_polynomial(lower, variables)
    mcoef_exact = compile_exact_polynomial(mcoef, variables)
    types = []
    for order in range(2, max_order+1):
        for graph in nx.nonisomorphic_trees(order):
            graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
            datum = rows.type_data(graph)
            datum["graph"] = graph
            datum["wedges"] = sum(
                degree*(degree-1)//2 for _, degree in graph.degree()
            )
            types.append(datum)

    @lru_cache(maxsize=None)
    def forest_pair(components):
        pair = ((1,), (0,))
        for index in components:
            pair = rows.union_pair(pair, types[index]["pair"])
        return pair

    forests = roots = top_cells = canonical_equalities = inequality_checks = 0
    reserve_precondition_skips = 0
    minimum_actual = minimum_slack = None
    minimum_cell = minimum_slack_cell = ""
    stream = hashlib.sha256()
    for order in range(4, max_order+1):
        for components in rows.component_multisets(types, order):
            if len(components) < 2:
                continue
            forests += 1
            g_pair = forest_pair(components)
            W = sum(int(types[index]["wedges"]) for index in components)
            seen = set()
            for position, type_index in enumerate(components):
                if type_index in seen:
                    continue
                seen.add(type_index)
                rest = components[:position]+components[position+1:]
                rest_pair = forest_pair(rest)
                root_type = types[type_index]
                graph = root_type["graph"]
                for root in root_type["roots"]:
                    roots += 1
                    w = int(root["marked"])
                    d = graph.degree(w)
                    R = sum(graph.degree(u)-1 for u in graph.neighbors(w))
                    f_pair = rows.union_pair(root["F"], rest_pair)
                    h_pair = rows.union_pair(root["H"], rest_pair)
                    fi, fc = f_pair
                    hi, _hc = h_pair
                    target = max(rank for rank, value in enumerate(fi) if value)
                    if target < 3:
                        continue
                    b = rows.coeff(fi, target)
                    assert b > 0 and rows.coeff(fi, target+1) == 0
                    adapter = rows.Adapter(f_pair, h_pair)
                    terminal = {item[0]: item for item in canonical.terminal_rows(
                        nx.Graph(), 0, list(g_pair[0]),
                        rows.one_edge_actual(g_pair[1]), adapter,
                    )}
                    assert target in terminal
                    actual = terminal[target][1][1]
                    assert actual > 0

                    gi = g_pair[0]
                    gs = rows.one_edge_actual(g_pair[1])
                    fs = rows.one_edge_actual(fc)
                    N = order-1
                    h = len(components)-1
                    r = N-target
                    m = N-h
                    assert sum(types[index]["graph"].number_of_edges()
                               for index in components) == m
                    assert 1 <= r <= target and h+d <= target
                    assert 0 <= R <= m-d
                    assert d*(d-1)//2+R <= W <= m*(m-1)//2

                    p0 = rows.coeff(gi, 3)+rows.coeff(gi, 2)
                    p1 = rows.coeff(gi, 2)+rows.coeff(gi, 1)
                    r0 = rows.coeff(gs, 4)+rows.coeff(gs, 3)
                    r1 = rows.coeff(gs, 3)+rows.coeff(gs, 2)
                    u0 = rows.coeff(gi, target+1)+rows.coeff(gi, target)
                    u1 = rows.coeff(gi, target)+rows.coeff(gi, target-1)
                    a2 = rows.coeff(fi, 2)
                    z2 = rows.coeff(fs, 3)
                    h2 = rows.coeff(hi, 2)
                    hj = rows.coeff(hi, target)
                    zj = rows.coeff(fs, target+1)
                    c0 = a2+z2+h2
                    e0 = b+zj+hj
                    assert p0 == int(choose(N+1, 3)-m*(N-1)+W
                                     +choose(N+1, 2)-m)
                    assert p1 == int(choose(N+1, 2)-m+N+1)
                    assert r1 == m*N-2*W
                    assert a2 == int(choose(N, 2)-(m-d))
                    assert z2 == int((m-d)*(N-2)-2*(W-choose(d, 2)-R))
                    assert h2 == int(choose(N-d, 2)-(m-d-R))

                    A0 = p0*c0-a2*r0
                    A1 = p0*a2+p1*c0+p1*a2-a2*r1
                    Q0 = (target+1)*b*(c0+r0)-3*(p0+a2)*e0
                    Q1 = ((target+1)*b*(a2+r1)-3*p1*e0
                          -3*b*(p0+a2+p1))
                    local = ((target+1)*a2*(A0*u1+A1*u0+A1*u1)
                             + a2*(p0*Q1+p1*Q0+p1*Q1))
                    assert local == actual
                    canonical_equalities += 1

                    y = Fraction(hj, b)
                    assert 0 <= y <= 1
                    assert 2*a2*e0 <= b*(2*a2*(1+y)+target*z2)
                    assert Fraction(u0, b) >= 1+y+Fraction(target, r)*y
                    assert Fraction(u1, b) >= (
                        1+Fraction(target, r+1)+Fraction(target, r)*y
                    )
                    gap = 2*p1*c0-3*a2*r1
                    margin = 3*p0*r1-2*p1*r0
                    assert gap >= 0 and margin >= 0
                    values = (target, r, h, d, R, W, y)
                    mvalue = mcoef_exact(values)
                    lower_value = lower_exact(values)
                    lhs = Fraction(2*r*(r+1)*actual, b)
                    if mvalue >= 0:
                        # This checks the literal lower-bound direction.  Its
                        # nonnegativity is asserted only by the N>=13 cone;
                        # the present census is intentionally below that band.
                        assert lhs >= lower_value
                        slack = lhs-lower_value
                        inequality_checks += 1
                    else:
                        # Small orders are supplied by the pinned exhaustive
                        # finite theorem, not by the large-order reserve step.
                        reserve_precondition_skips += 1
                        slack = None
                    top_cells += 1
                    cell = (
                        f"order={order},components={components},"
                        f"type={root_type['graph6']},w={w},j={target}"
                    )
                    stream.update(f"{cell}|{actual}|{lower_value}|{slack}\n".encode())
                    if minimum_actual is None or actual < minimum_actual:
                        minimum_actual, minimum_cell = actual, cell
                    if slack is not None and (
                        minimum_slack is None or slack < minimum_slack
                    ):
                        minimum_slack, minimum_slack_cell = slack, cell
    return {
        "maximum_G_order": max_order,
        "no_isolate_disconnected_forests": forests,
        "rooted_cells": roots,
        "top_support_cells": top_cells,
        "canonical_delta1_equalities": canonical_equalities,
        "symbolic_lower_bound_checks": inequality_checks,
        "small_order_reserve_precondition_skips": reserve_precondition_skips,
        "minimum_actual_delta1": str(minimum_actual),
        "minimum_actual_cell": minimum_cell,
        "minimum_cleared_slack": str(minimum_slack),
        "minimum_slack_cell": minimum_slack_cell,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def verify_pins():
    for filename, expected in PINNED.items():
        actual = sha256(HERE/filename)
        assert actual == expected, (filename, actual, expected)
    fq_report = json.loads((
        HERE/"all_forest_q3_q2_component_lift_independent_audit_20260829.json"
    ).read_text())
    assert fq_report["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
    )
    anchor_report = json.loads((
        HERE/"terminal_q3_forest_anchor_lift_exact_agent_20260829.json"
    ).read_text())
    assert anchor_report["status"] == (
        "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_FOREST_BASE_ANCHOR_LIFT"
    )
    finite_report = json.loads((
        HERE/"terminal_q3_low_newton_m1_forest_finite_audit_20260829.json"
    ).read_text())
    assert finite_report["status"] == (
        "PASS_DIRECT_CANONICAL_ALL_FOREST_M1_FINITE_ORDER13"
    )


def main():
    verify_pins()
    generic = generic_newton_identities()
    structural = structural_checks()
    print("generic and structural identities PASS", flush=True)
    large = large_cone_certificate()
    print("large tensor-Bernstein cone PASS", flush=True)
    small = small_boundary_certificate()
    print("small exact boundary PASS", flush=True)
    direct = direct_canonical_crosscheck(10)
    print("direct canonical cross-check PASS", flush=True)
    report = {
        "schema": "terminal-q3-m1-top-support-forest-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_TOP_SUPPORT_DISCONNECTED_FOREST_M1_CONDITIONAL_Q_ENVELOPE",
        "claim": (
            "For every disconnected forest G without isolated components, "
            "marked w, and j=alpha(G-w)>=3, the terminal-q3 Newton "
            "coefficient d1 is nonnegative, assuming the strong-induction "
            "input q_j(G-w)<=q_2(G-w)."
        ),
        "fixed_low_block": "a2=i2(F), z2=s3(F), h2=i2(H)",
        "target_high_block": "b=i_j(F), z_j=s_(j+1)(F), h_j=i_j(H)",
        "pinned_sha256": PINNED,
        "generic_identities": generic,
        "structural_checks": structural,
        "large_cone_X_at_least_10": large,
        "small_boundary_X_5_through_9": small,
        "direct_canonical_crosscheck": direct,
        "finite_base": (
            "The pinned direct-canonical all-forest census proves every "
            "supported m1 cell through |G|=13; the symbolic cone is used "
            "for N=|G|-1>=13."
        ),
        "support_collapse_application": (
            "If a supported target loses support when a leaf bridge is added, "
            "then j=alpha(F); this theorem supplies precisely that source cell."
        ),
        "scope": (
            "This closes only the top-support/no-isolate forest m1 lane, "
            "conditional on the smaller-forest q-envelope. It does not prove "
            "the non-top common-component forest m1 lane, m0, the full "
            "q-envelope, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(report["status"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
