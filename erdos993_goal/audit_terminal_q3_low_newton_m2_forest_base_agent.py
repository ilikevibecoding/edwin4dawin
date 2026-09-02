#!/usr/bin/env python3
"""Exact all-forest-base lift of terminal-payment Newton degree m=2.

Targets j>=4 use the component deficit h=c(G)-1, the all-forest terminal
anchor, and the universal H-shadow j*h_j <= (N-j+1)h_(j-1).  The j=3
branch uses exact rooted four-vertex motif coordinates, a componentwise
connected-subtree bound, and a complete small disconnected-forest census.
"""

from __future__ import annotations

from functools import lru_cache
import hashlib
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp
import audit_terminal_q3_low_newton_adversarial_agent as canonical


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m2_forest_base_audit_20260829.json"
PINS = {
    "assemble_terminal_q3_low_newton_m2_all_order_independent_agent.py":
        "A6663061A40BA2188F9C3C4446E518E316C93642CB75E0058E18C0095056B759",
    "terminal_q3_low_newton_m2_all_order_independent_20260829.json":
        "A670835BDE8CB91517F4FA4B99DD48F8F2E8AC6D14B6D8470713607309FDC08D",
    "TERMINAL_Q3_LOW_NEWTON_M2_THEOREM_INDEPENDENT_2026-08-29.md":
        "35762A3629CACC89DD914AB6EEA9C028F18FC8761A98047107C84530D7436C41",
    "prove_terminal_q3_forest_anchor_lift_agent.py":
        "01F04CA1C51B155D987C61611298B8B38CC60981EBA7C8269FD251B75BCB434D",
    "terminal_q3_forest_anchor_lift_exact_agent_20260829.json":
        "E9CD1A6276D589F885626AB69786D9499116D291242DA76883FAA577850F1DDF",
    "verify_tree_rank45_path_ratio.py":
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C",
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md":
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528",
    "ROOTED_FOREST_EXTENSION_FLOOR_2026-08-28.md":
        "8AA07C316270045F9CBFCA2B5A04E04994100DCF87F02EB99B84A61080A1458E",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "terminal_q3_low_newton_adversarial_independent_20260829.json":
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def independent3(vertices, edges, wedges):
    return choose(vertices, 3) - edges * (vertices - 2) + wedges


def independent4(vertices, edges, wedges, connected4):
    return (
        choose(vertices, 4)
        - edges * choose(vertices - 2, 2)
        + wedges * (vertices - 4)
        + choose(edges, 2)
        - connected4
    )


def one_edge3(vertices, edges, wedges):
    return edges * (vertices - 2) - 2 * wedges


def one_edge4(vertices, edges, wedges, connected4):
    return (
        edges * choose(vertices - 2, 2)
        - 2 * (wedges * (vertices - 3) + choose(edges, 2) - wedges)
        + 3 * connected4
    )


def kappa(left: int, right: int, union: int):
    if not max(left, right) <= union <= left + right:
        return sp.Integer(0)
    return sp.factorial(union) / (
        sp.factorial(union - left)
        * sp.factorial(union - right)
        * sp.factorial(left + right - union)
    )


def product_coefficient(left, right, degree: int):
    return sp.expand(sum(
        kappa(p, q, degree) * left[p] * right[q]
        for p in range(len(left))
        for q in range(len(right))
        if max(p, q) <= degree <= p + q
    ))


def bernstein_coefficients(expression, variable, left, right):
    parameter = sp.symbols("bernstein_parameter")
    power = sp.Poly(
        sp.expand(expression.subs(variable, left + (right - left) * parameter)),
        parameter,
    )
    degree = power.degree()
    ascending = [
        power.coeff_monomial(parameter**rank) for rank in range(degree + 1)
    ]
    return [sp.factor(sum(
        ascending[rank]
        * sp.binomial(index, rank)
        / sp.binomial(degree, rank)
        for rank in range(index + 1)
    )) for index in range(degree + 1)]


def shifted_cone_certificate(
    expression, first, second, threshold: int, *, high_second: bool
):
    """Positive-coefficient certificate on first+second>=threshold."""
    q = sp.symbols("cone_q", integer=True, nonnegative=True)
    numerator, denominator = sp.together(expression).as_numer_denom()
    if high_second:
        high_expr = numerator.subs(second, threshold + q)
        strips = [
            (value, threshold - value, numerator.subs({
                second: value, first: threshold - value + q
            }))
            for value in range(threshold)
        ]
    else:
        high_expr = numerator.subs(first, threshold + q)
        strips = [
            (value, threshold - value, numerator.subs({
                first: value, second: threshold - value + q
            }))
            for value in range(threshold)
        ]
    high = sp.Poly(sp.expand(high_expr), first if high_second else second, q)
    assert high.coeffs() and all(value >= 0 for value in high.coeffs())
    assert high.as_expr().subs({first: 0, second: 0, q: 0}) > 0
    denominator_high_expr = (
        denominator.subs(second, threshold + q)
        if high_second else denominator.subs(first, threshold + q)
    )
    denominator_high = sp.Poly(
        sp.expand(denominator_high_expr), first if high_second else second, q
    )
    assert denominator_high.coeffs()
    assert all(value >= 0 for value in denominator_high.coeffs())
    assert denominator_high.as_expr().subs({first:0, second:0, q:0}) > 0
    strip_records = []
    for fixed, minimum_other, strip_expr in strips:
        polynomial = sp.Poly(sp.expand(strip_expr), q)
        assert polynomial.coeffs() and all(value >= 0 for value in polynomial.coeffs())
        assert polynomial.as_expr().subs(q, 0) > 0
        denominator_strip_expr = (
            denominator.subs({second: fixed, first: minimum_other + q})
            if high_second else
            denominator.subs({first: fixed, second: minimum_other + q})
        )
        denominator_strip = sp.Poly(sp.expand(denominator_strip_expr), q)
        assert denominator_strip.coeffs()
        assert all(value >= 0 for value in denominator_strip.coeffs())
        assert denominator_strip.as_expr().subs(q, 0) > 0
        strip_records.append({
            "fixed": fixed,
            "minimum_other": minimum_other,
            "degree": polynomial.degree(),
            "terms": len(polynomial.terms()),
            "minimum_coefficient": str(min(polynomial.coeffs())),
        })
    return {
        "denominator": str(sp.factor(denominator)),
        "high_terms": len(high.terms()),
        "high_minimum_coefficient": str(min(high.coeffs())),
        "strips": strip_records,
    }


def bernstein_cone_certificate(
    expression, variable, right, first, second, threshold, *, high_second
):
    coefficients = bernstein_coefficients(expression, variable, 0, right)
    stream = hashlib.sha256()
    records = []
    for index, coefficient in enumerate(coefficients):
        stream.update((sp.srepr(coefficient) + "\n").encode())
        cone = shifted_cone_certificate(
            coefficient, first, second, threshold, high_second=high_second
        )
        records.append({
            "index": index,
            "denominator": cone["denominator"],
            "high_terms": cone["high_terms"],
            "high_minimum_coefficient": cone["high_minimum_coefficient"],
            "strip_minimum_coefficient": str(min(
                int(record["minimum_coefficient"]) for record in cone["strips"]
            )),
        })
    return {
        "degree": len(coefficients) - 1,
        "coefficient_sha256": stream.hexdigest().upper(),
        "coefficients": records,
    }


def symbolic_j3_margin():
    N, h, d, W, V, X, B, Y = sp.symbols(
        "N h d W V X B Y", integer=True, nonnegative=True
    )
    edges_g = N - h
    i2_g = choose(N + 1, 2) - edges_g
    i3_g = independent3(N + 1, edges_g, W)
    i4_g = independent4(N + 1, edges_g, W, V)
    P = [sp.expand(i3_g + i2_g), sp.expand(i2_g + N + 1), N + 2]
    s3_g = one_edge3(N + 1, edges_g, W)
    s4_g = one_edge4(N + 1, edges_g, W, V)
    R = [sp.expand(s4_g + s3_g), sp.expand(s3_g + edges_g), edges_g]

    edges_f = edges_g - d
    wedges_f = W - choose(d, 2) - X
    root_connected4 = choose(d, 3) + B + (d - 1) * X + Y
    connected4_f = V - root_connected4
    a = sp.expand(choose(N, 2) - edges_f)
    b = sp.expand(independent3(N, edges_f, wedges_f))
    z2 = sp.expand(one_edge3(N, edges_f, wedges_f))
    z3 = sp.expand(one_edge4(N, edges_f, wedges_f, connected4_f))

    vertices_h = N - d
    edges_h = edges_g - d - X
    wedges_h = W - choose(d, 2) - B - X - Y
    h2 = sp.expand(choose(vertices_h, 2) - edges_h)
    h3 = sp.expand(independent3(vertices_h, edges_h, wedges_h))
    c = [sp.expand(a + z2 + h2), a]
    e = [sp.expand(b + z3 + h3), b]
    U = [sp.expand(i4_g + i3_g), P[0], P[1]]
    A = [
        sp.expand(product_coefficient(P, c, degree) - a * R[degree])
        for degree in range(3)
    ]
    Pa = [P[0] + a, P[1], P[2]]
    Q = [
        sp.expand(
            4 * b * ((c[degree] if degree < 2 else 0) + R[degree])
            - 3 * product_coefficient(Pa, e, degree)
        )
        for degree in range(3)
    ]
    delta2 = sp.factor(
        4 * a * product_coefficient(A, U, 2)
        + a * product_coefficient(P, Q, 2)
    )
    return sp.factor(delta2 / a), a, (N, h, d, W, V, X, B, Y)


def connected_four_vertices(tree: nx.Graph) -> int:
    degrees = dict(tree.degree())
    return sum(comb(value, 3) for value in degrees.values()) + sum(
        (degrees[left] - 1) * (degrees[right] - 1)
        for left, right in tree.edges()
    )


def finite_component_v_bound() -> dict[str, object]:
    records = {}
    total = 0
    global_minimum = None
    for p in range(1, 14):
        minimum = None
        count = 0
        for tree in nx.nonisomorphic_trees(p + 1):
            count += 1
            total += 1
            wedges = sum(comb(value, 2) for _, value in tree.degree())
            beta = wedges - (p - 1)
            assert beta >= 0
            connected4 = connected_four_vertices(tree)
            margin = 3 * p + p * beta - 3 * connected4
            assert margin >= 0
            minimum = margin if minimum is None else min(minimum, margin)
        global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        records[str(p)] = {"tree_types": count, "minimum_cleared_margin": minimum}
    return {
        "edge_orders": [1, 13],
        "tree_types": total,
        "minimum_cleared_margin": global_minimum,
        "by_edge_order": records,
    }


def prove_large_j3(L, variables):
    N, h, d, W, V, X, B, Y = variables
    m = N - h
    expected_v = (
        21*N**4 + 85*N**3 - 20*N**2*d + 84*N**2*h + 140*N**2
        - 4*N*W + 48*N*X + 24*N*d**2 + 30*N*d + 170*N*h
        - 78*N - 8*W + 96*X + 48*d**2 + 48*d*h + 236*d
        + 84*h**2 + 484*h + 252
    )
    assert sp.expand(-4 * sp.diff(L, V) - 2 * expected_v) == 0
    v_floor = sp.expand(
        21*N**4 + 85*N**3 - 20*N**3 + 140*N**2
        - (4*N + 8)*choose(N, 2) - 78*N + 252
    )
    q = sp.symbols("q", integer=True, nonnegative=True)
    v_floor_poly = sp.Poly(sp.expand(v_floor.subs(N, 13 + q)), q)
    assert all(value > 0 for value in v_floor_poly.coeffs())

    expected_b = 2 * (
        5*N**4 + 19*N**3 + 24*N**2*h + 46*N**2 + 12*N*W
        + 6*N*d + 66*N*h + 74*N + 24*W + 12*d + 12*h**2
        + 84*h + 84
    )
    assert sp.expand(sp.diff(L, B) - expected_b) == 0
    assert sp.expand(sp.diff(L, Y) - expected_b) == 0

    # The pinned Zagreb inequality gives the stronger component bound for
    # p>=14; exact tree enumeration supplies p<=13.  Summing the relaxed
    # component bound and using p_i<=m gives the displayed aggregate cap.
    finite_v = finite_component_v_bound()
    beta, gamma, chi, p = sp.symbols("beta gamma chi p", nonnegative=True)
    strong_v = p - 2 + beta + gamma + chi
    implied = sp.factor(strong_v.subs(chi, (2*(p-3)*beta-6*gamma)/7))
    assert sp.factor(
        implied.subs(gamma, (p-3)*beta/3) - (p - 2 + p*beta/3)
    ) == 0

    u, v = sp.symbols("u v", integer=True, nonnegative=True)
    case_data = {}
    cases = {
        "m_at_least_h_plus_1": {
            "subs": {h: 1 + u, N: 2*u + 3 + v},
            "s": u + 2,
        },
        "m_at_most_h_plus_1": {
            "subs": {h: 1 + u + v, N: 3 + 2*u + v},
            "s": u + 2,
        },
    }
    for name, data in cases.items():
        substitutions = data["subs"]
        m_case = sp.expand(m.subs(substitutions))
        v_upper = sp.expand(m_case + m_case*(W - m_case + data["s"])/3)
        lower = sp.factor(L.subs({V: v_upper, B: 0, Y: 0}).subs(substitutions))
        assert sp.expand(
            sp.Poly(lower, X).coeff_monomial(X**2) + 12*(2*u+v+5)
        ) == 0

        cd = choose(d, 2)
        cm = choose(m_case, 2)
        boundaries = {
            "X_zero": sp.factor(lower.subs(X, 0)),
            "X_diagonal": sp.factor(lower.subs(X, W - cd)),
            "X_max": sp.factor(lower.subs(X, m_case - d)),
        }
        w2 = {
            key: sp.factor(sp.Poly(value, W).coeff_monomial(W**2))
            for key, value in boundaries.items()
        }
        sign_certificates = {
            "minus_X_zero_W2": bernstein_cone_certificate(
                -w2["X_zero"], d, m_case, u, v, 10, high_second=True
            ),
            "X_diagonal_W2": bernstein_cone_certificate(
                w2["X_diagonal"], d, m_case, u, v, 10, high_second=True
            ),
            "minus_X_max_W2": bernstein_cone_certificate(
                -w2["X_max"], d, m_case, u, v, 10, high_second=True
            ),
        }

        # X=0 and X=m-d are concave in W, hence reduce to their endpoints.
        value_expressions = {
            "X0_Wroot": boundaries["X_zero"].subs(W, cd),
            "X0_Wmax": boundaries["X_zero"].subs(W, cm),
            "Xmax_Wlocal": boundaries["X_max"].subs(W, cd + m_case - d),
            "Xmax_Wmax": boundaries["X_max"].subs(W, cm),
        }
        value_certificates = {
            label: bernstein_cone_certificate(
                expression, d, m_case, u, v, 10, high_second=True
            )
            for label, expression in value_expressions.items()
        }

        # The diagonal is convex.  Its positive W^2 term may be discarded;
        # the remaining affine function is minimized at an interval endpoint.
        diagonal = boundaries["X_diagonal"]
        diagonal_linear = sp.expand(diagonal - w2["X_diagonal"]*W**2)
        diagonal_certificates = {
            "Wroot": bernstein_cone_certificate(
                diagonal_linear.subs(W, cd),
                d, m_case, u, v, 10, high_second=True,
            ),
            "Wlocal": bernstein_cone_certificate(
                diagonal_linear.subs(W, cd + m_case - d),
                d, m_case, u, v, 10, high_second=True,
            ),
        }
        case_data[name] = {
            "parameterization": {"N": str(N.subs(substitutions)),
                                 "h": str(h.subs(substitutions)),
                                 "m": str(m_case), "s": str(data["s"])},
            "W2_sign_certificates": sign_certificates,
            "concave_boundary_value_certificates": value_certificates,
            "convex_diagonal_linear_lower_certificates": diagonal_certificates,
        }

    # Zero- and one-edge forests are outside the two m>=2 parameterizations.
    sparse = {
        "m0": sp.factor(L.subs({h: N, d: 0, W: 0, V: 0, X: 0, B: 0, Y: 0})),
        "m1_root_isolated": sp.factor(L.subs({
            h: N-1, d: 0, W: 0, V: 0, X: 0, B: 0, Y: 0
        })),
        "m1_root_incident": sp.factor(L.subs({
            h: N-1, d: 1, W: 0, V: 0, X: 0, B: 0, Y: 0
        })),
    }
    sparse_records = {}
    for label, expression in sparse.items():
        numerator, denominator = sp.together(expression).as_numer_denom()
        polynomial = sp.Poly(sp.expand(numerator.subs(N, 13 + q)), q)
        assert denominator > 0
        assert all(value >= 0 for value in polynomial.coeffs())
        assert polynomial.as_expr().subs(q, 0) > 0
        sparse_records[label] = {
            "expression": str(expression),
            "shifted_minimum_coefficient": str(min(polynomial.coeffs())),
        }
    return {
        "V_slope_floor_N13_shift_terms": len(v_floor_poly.terms()),
        "V_slope_floor_minimum_coefficient": str(min(v_floor_poly.coeffs())),
        "component_V_finite_base": finite_v,
        "aggregate_V_upper": "V<=m+(m/3)(W-m+min(m,h+1))",
        "structural_cases": case_data,
        "sparse_edge_cases": sparse_records,
    }


def prove_j4plus():
    N, j, h, a2, b, e0, W, y = sp.symbols(
        "N j h a2 b e0 W y", nonnegative=True
    )
    r, k = sp.symbols("r k", integer=True, nonnegative=True)
    m = N - h
    p0 = sp.expand(choose(N+1, 3) - m*(N-1) + W + choose(N+1, 2) - m)
    p1 = (N**2 + N + 2)/2 + h
    p2 = N + 2
    P = [p0, p1, p2]
    R1 = m*N - 2*W
    R2 = m
    q_lower = [
        (j+1)*b*a2 - 3*e0*(p0+a2),
        (j+1)*b*(a2+R1) - 3*e0*p1 - 3*b*(p0+a2+p1),
        (j+1)*b*R2 - 3*e0*p2 - 6*b*(p1+p2),
    ]
    pq2 = sp.expand(sum(
        kappa(left, right, 2)*P[left]*q_lower[right]
        for left in range(3) for right in range(3)
    ))
    adverse_e = sp.factor(-sp.diff(pq2, e0))
    adverse_poly = sp.Poly(adverse_e, N, h, a2, W)
    assert adverse_poly.coeffs() and all(value >= 0 for value in adverse_poly.coeffs())
    remainder = sp.factor(pq2.subs(e0, b*(j+2*y))/b)

    anchor1 = sp.expand(p0 + 2*p1 - R1)
    anchor2 = sp.expand(2*p1 + 3*p2 - R2)
    assert sp.expand(anchor2 - (N**2+3*N+8+3*h)) == 0
    S1 = j/(r+1)
    S2 = j*(j-1)/((r+1)*(r+2))
    H1 = j*y/(r+1)
    U0base = (N-2*j+3+(j-1)*y)/(j+1)
    E = sp.expand(
        2*anchor1*(1+2*S1+S2+H1)
        + anchor2*(U0base+2+3*S1+S2+3*H1)
    )
    # a2=i_2(F) is part of the fixed terminal-q3 block.  It is never
    # replaced by i_{j-1}(F) when j>3.
    normalized = sp.factor((j+1)*a2*E + remainder)
    assert sp.Poly(normalized, a2).degree() == 1
    substituted = sp.factor(normalized.subs(N, j+r))
    slope = sp.factor(sp.diff(substituted, a2))
    pair_floor = choose(N-1, 2) + h - 1
    floor_gap = sp.factor(substituted.subs(a2, pair_floor.subs(N, j+r)))
    assert sp.Poly(slope, W).degree() <= 1 and sp.Poly(slope, y).degree() <= 1
    assert sp.Poly(floor_gap, W).degree() <= 1 and sp.Poly(floor_gap, y).degree() <= 1

    h_right = j+r
    m_sub = j+r-h
    W_high = choose(m_sub, 2)
    slope_corners = {}
    gap_corners = {}
    for y_value in (0, 1):
        for w_name, w_value in (("zero", 0), ("maximum", W_high)):
            label = f"y{y_value}_W{w_name}"
            slope_corners[label] = bernstein_cone_certificate(
                slope.subs({y:y_value, W:w_value, j:4+k}),
                h, h_right.subs(j,4+k), k, r, 9, high_second=True,
            )
            gap_corners[label] = bernstein_cone_certificate(
                floor_gap.subs({y:y_value, W:w_value, j:4+k}),
                h, h_right.subs(j,4+k), k, r, 9, high_second=True,
            )
    return {
        "forest_exact_rows": {
            "p0": str(p0), "p1": str(p1), "R1": str(R1), "R2": str(R2)
        },
        "corrected_universal_H_shadow": "h_(j-1)/b>=j*y/(N-j+1)",
        "pair_floor_disconnected": str(pair_floor),
        "W_interval": "0<=W<=C(N-h,2)",
        "anchor1_over_a": str(anchor1),
        "anchor2_over_a": str(anchor2),
        "a2_slope_corners": slope_corners,
        "floor_gap_corners": gap_corners,
    }


def add_rows(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    size = max(len(left), len(right))
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(size)
    )


def convolve(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    result = [0] * (len(left)+len(right)-1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            result[i+j] += x*y
    return tuple(result)


def union_pair(left, right):
    left_i, left_c = left
    right_i, right_c = right
    return (
        convolve(left_i, right_i),
        add_rows(convolve(left_c, right_i), convolve(left_i, right_c)),
    )


def coefficient(row: tuple[int, ...], degree: int) -> int:
    return row[degree] if 0 <= degree < len(row) else 0


def actual_one_edge_row(residual: tuple[int, ...]) -> list[int]:
    """Convert residual degree k=s_(k+2) to the canonical rank-indexed row."""
    return [0, 0, *residual]


class CanonicalForestRows:
    """Duck-typed adapter for canonical.terminal_rows on an arbitrary forest."""

    def __init__(self, f_pair, h_pair):
        self.f_pair = f_pair
        self.h_pair = h_pair

    def forest_after_deleting_root(self, _root):
        zero, residual = self.f_pair
        return list(zero), actual_one_edge_row(residual)

    def forest_after_closed_neighborhood(self, _root):
        zero, residual = self.h_pair
        return list(zero), actual_one_edge_row(residual)


def tree_type_data(graph: nx.Graph) -> dict[str, object]:
    graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
    order = len(graph)
    adjacency = [0]*order
    for left, right in graph.edges():
        adjacency[left] |= 1 << right
        adjacency[right] |= 1 << left
    full_mask = (1 << order)-1

    @lru_cache(maxsize=None)
    def independence(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,)
        bit = mask & -mask
        vertex = bit.bit_length()-1
        without = independence(mask ^ bit)
        with_vertex = independence(mask & ~bit & ~adjacency[vertex])
        return add_rows(without, (0,)+with_vertex)

    @lru_cache(maxsize=None)
    def residual(mask: int) -> tuple[int, ...]:
        result = (0,)
        for left, right in graph.edges():
            if not ((mask >> left)&1 and (mask >> right)&1):
                continue
            forbidden = (1<<left)|(1<<right)|adjacency[left]|adjacency[right]
            result = add_rows(result, independence(mask & ~forbidden))
        return result

    roots = []
    for marked in range(order):
        fmask = full_mask & ~(1<<marked)
        hmask = full_mask & ~((1<<marked)|adjacency[marked])
        roots.append({
            "marked": marked,
            "F": (independence(fmask), residual(fmask)),
            "H": (independence(hmask), residual(hmask)),
        })
    return {
        "order": order,
        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
        "pair": (independence(full_mask), residual(full_mask)),
        "roots": roots,
    }


def component_multisets(types, total: int):
    chosen = []
    def recurse(remaining: int, lower: int):
        if remaining == 0:
            yield tuple(chosen)
            return
        for index in range(lower, len(types)):
            size = int(types[index]["order"])
            if size > remaining:
                break
            chosen.append(index)
            yield from recurse(remaining-size, index)
            chosen.pop()
    yield from recurse(total, 0)


def finite_disconnected_census(L, variables, max_order: int = 13):
    Nsym, hsym, dsym, Wsym, Vsym, Xsym, Bsym, Ysym = variables
    numerator, denominator = sp.together(L).as_numer_denom()
    assert denominator == 36
    motif_numerator = sp.lambdify(variables, numerator, "math")
    types = []
    tree_counts = {}
    for order in range(1, max_order+1):
        graphs = [nx.empty_graph(1)] if order == 1 else list(nx.nonisomorphic_trees(order))
        tree_counts[str(order)] = len(graphs)
        types.extend(tree_type_data(graph) for graph in graphs)

    @lru_cache(maxsize=None)
    def forest_pair(components):
        pair = ((1,), (0,))
        for index in components:
            pair = union_pair(pair, types[index]["pair"])
        return pair

    forests = roots = supported = positive = zero = identities = motif_checks = 0
    minimum = None
    minimum_cell = ""
    forest_counts = {}
    by_target = {}
    for order in range(4, max_order+1):
        multisets = list(component_multisets(types, order))
        forest_counts[str(order)] = len(multisets)
        for components in multisets:
            if len(components) < 2:
                continue
            forests += 1
            g_i, g_c = forest_pair(components)
            seen = set()
            for position, type_index in enumerate(components):
                if type_index in seen:
                    continue
                seen.add(type_index)
                rest = components[:position]+components[position+1:]
                rest_pair = forest_pair(rest)
                root_type = types[type_index]
                for root in root_type["roots"]:
                    roots += 1
                    f_i, f_c = union_pair(root["F"], rest_pair)
                    h_i, h_c = union_pair(root["H"], rest_pair)
                    # Call the pinned canonical terminal implementation on
                    # these literal forest rows.  The adapter only supplies
                    # deletion rows; canonical.terminal_rows performs the
                    # terminal-q3/target-j indexing itself.
                    adapter = CanonicalForestRows((f_i, f_c), (h_i, h_c))
                    canonical_g0 = list(g_i)
                    canonical_g1 = actual_one_edge_row(g_c)
                    canonical_f0 = list(f_i)
                    canonical_f1 = actual_one_edge_row(f_c)
                    canonical_h0 = list(h_i)
                    canonical_rows = {
                        item[0]: item
                        for item in canonical.terminal_rows(
                            nx.Graph(), 0, canonical_g0, canonical_g1, adapter,
                        )
                    }
                    a2 = coefficient(f_i, 2)
                    z2 = coefficient(f_c, 1)
                    h2 = coefficient(h_i, 2)
                    assert a2 == canonical.coeff(canonical_f0, 2)
                    assert z2 == canonical.coeff(canonical_f1, 3)
                    assert h2 == canonical.coeff(canonical_h0, 2)
                    for target in range(3, len(f_i)):
                        b = coefficient(f_i, target)
                        if b == 0:
                            continue
                        supported += 1
                        by_target[str(target)] = by_target.get(str(target), 0)+1
                        assert target in canonical_rows
                        zj = coefficient(f_c, target-1)
                        hj = coefficient(h_i, target)
                        assert b == canonical.coeff(canonical_f0, target)
                        assert zj == canonical.coeff(canonical_f1, target+1)
                        assert hj == canonical.coeff(canonical_h0, target)
                        values = []
                        for shift in range(3):
                            t = shift+1
                            isolate_row = tuple(comb(t, used) for used in range(t+1))
                            direct_g_i = convolve(g_i, isolate_row)
                            direct_g_c = convolve(g_c, isolate_row)
                            P = sum(comb(t,l)*coefficient(g_i,3-l) for l in range(t+1))
                            R = sum(comb(t,l)*coefficient(g_c,2-l) for l in range(t+1))
                            U = sum(comb(t,l)*coefficient(g_i,target+1-l) for l in range(t+1))
                            assert P == coefficient(direct_g_i, 3)
                            assert R == coefficient(direct_g_c, 2)
                            assert U == coefficient(direct_g_i, target+1)
                            assert P == canonical.with_isolates(canonical_g0, 3, t)
                            assert R == canonical.with_isolates(canonical_g1, 4, t)
                            assert U == canonical.with_isolates(
                                canonical_g0, target+1, t
                            )
                            c = z2+h2+t*a2
                            e = zj+hj+t*b
                            M = (target+1)*b*c-3*a2*e
                            A = P*c-a2*R
                            slack = P*b-a2*U
                            # The two occurrences of `a` in the canonical
                            # identity are the fixed a2=i_2(F).
                            original = P*(P+a2)*M-(target+1)*A*slack
                            Q = (target+1)*b*(c+R)-3*(P+a2)*e
                            split = (target+1)*a2*A*U+a2*P*Q
                            assert original == split
                            identities += 1
                            values.append(original)
                        m2 = values[2]-2*values[1]+values[0]
                        canonical_m2 = canonical_rows[target][1][2]
                        assert m2 == canonical_m2
                        assert m2 >= 0
                        positive += m2 > 0
                        zero += m2 == 0
                        cell = f"order={order},components={components},type={root_type['graph6']},w={root['marked']},j={target}"
                        if minimum is None or m2 < minimum:
                            minimum, minimum_cell = m2, cell

                        if target == 3:
                            N = order-1
                            h = len(components)-1
                            edge_count = coefficient(g_c, 0)
                            s3 = coefficient(g_c, 1)
                            W = (edge_count*(N-1)-s3)//2
                            V = (comb(order,4)-edge_count*comb(order-2,2)
                                 + W*(order-4)+comb(edge_count,2)-coefficient(g_i,4))
                            edges_f = coefficient(f_c, 0)
                            d = edge_count-edges_f
                            wedges_f = b-comb(N,3)+edges_f*(N-2)
                            X = W-comb(d,2)-wedges_f
                            vertices_h = N-d
                            edges_h = edge_count-d-X
                            h3 = coefficient(h_i,3)
                            wedges_h = h3-comb(vertices_h,3)+edges_h*(vertices_h-2)
                            BY = W-comb(d,2)-X-wedges_h
                            assert min(W,V,d,X,BY) >= 0
                            symbolic_num = motif_numerator(N,h,d,W,V,X,BY,0)
                            assert isinstance(symbolic_num, int)
                            assert 36*m2 == a2*symbolic_num
                            motif_checks += 1
    return {
        "maximum_G_order": max_order,
        "tree_types_by_order": tree_counts,
        "forest_multisets_by_order": forest_counts,
        "disconnected_forest_multisets": forests,
        "rooted_component_cells": roots,
        "supported_cells_all_j": supported,
        "supported_cells_by_target": by_target,
        "payment_identity_evaluations": identities,
        "j3_literal_motif_checks": motif_checks,
        "positive_m2_cells": positive,
        "zero_m2_cells": zero,
        "minimum_m2": 0 if minimum is None else minimum,
        "minimum_cell": minimum_cell,
    }


def main() -> None:
    observed = {name: sha256(HERE/name) for name in PINS}
    assert observed == PINS
    tree = json.loads((HERE/"terminal_q3_low_newton_m2_all_order_independent_20260829.json").read_text())
    anchor = json.loads((HERE/"terminal_q3_forest_anchor_lift_exact_agent_20260829.json").read_text())
    finite_tree = json.loads((HERE/"terminal_q3_low_newton_adversarial_independent_20260829.json").read_text())
    assert tree["status"] == "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M2_ASSEMBLY"
    assert anchor["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_FOREST_BASE_ANCHOR_LIFT"
    assert finite_tree["newton_degrees"]["2"]["negative_coefficients"] == 0

    L, a, variables = symbolic_j3_margin()
    N, h, d, W, V, X, B, Y = variables
    assert sp.expand(2*a-(N**2-3*N+2*d+2*h)) == 0
    j3 = prove_large_j3(L, variables)
    j4 = prove_j4plus()
    finite = finite_disconnected_census(L, variables, 13)
    assert finite["zero_m2_cells"] == 0

    report = {
        "schema": "terminal-q3-low-newton-m2-forest-base-audit-v2",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M2",
        "claim": (
            "For every supported terminal-payment cell j>=3 over an arbitrary "
            "forest base G, Newton coefficient m=2 is nonnegative."
        ),
        "forest_parameters": (
            "|G|=N+1, h=c(G)-1, m=|E(G)|=N-h; for rooted j=3 motifs "
            "d,W,V,X,B,Y have their literal degree/subtree meanings"
        ),
        "fixed_terminal_q3_low_block": (
            "At every target j, P=i3(G disjoint_union tK1), R is the "
            "one-edge rank-4 row, a2=i2(F), and c=z2+h2+t*a2 are fixed "
            "terminal-q3 rows. Only b=i_j(F), U=i_(j+1), and e=zj+hj+t*b "
            "use target j. Every finite cell is required to equal a direct "
            "call to the pinned canonical terminal_rows implementation."
        ),
        "j_equals_3": j3,
        "j_at_least_4": j4,
        "finite_disconnected_census": finite,
        "order_partition": {
            "connected": "pinned symbolic tree m2 chain plus its exact tree audit through order 15",
            "disconnected_G_order_at_most_13": "complete component-multiset census",
            "disconnected_G_order_at_least_14": "symbolic N>=13 arguments",
        },
        "pins": observed,
        "scope": (
            "This closes only Newton degree m=2 for arbitrary forest bases. "
            "It does not close m=0,1, the whole terminal payment, the global "
            "q3 envelope, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(report["status"])
    print(f"finite_supported={finite['supported_cells_all_j']} j3_motif={finite['j3_literal_motif_checks']}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
