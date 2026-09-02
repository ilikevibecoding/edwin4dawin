#!/usr/bin/env python3
"""All-order C5 theorem when the two marks lie in different components.

For a marked forest with marks u,v in distinct components, write the two
rooted component recurrences as X=P+xH and Y=Q+xJ.  Here P=I(T-u) and
H=I(T-N[u]); the vertices removed from T-u to obtain T-N[u] consist of at
most one vertex from each component.  After absorbing all
unmarked components into the first rooted forest, the defect form factors as

    R_defect = Phi(X,P) Phi(Y,Q),
    Phi(X,P)=z X(w)P(z)+w X(z)P(w).

This replay proves that the coefficient of z^4 w^4 in this product is at
least the coefficient of z^3 w^5.  The proof needs only five fixed-total
slice gaps of Phi.  Base-forest orders at most twelve are enumerated exactly
over every allowed componentwise deletion.  For every larger base forest,
coefficientwise path floors and trivial binomial ceilings give explicit
positive polynomial lower bounds in n=|T-u| and m=|T-N[u]|.

The theorem closes C5 only in the distinct-component (hence nonadjacent)
case.  It does not prove M5, M5+3C5, the connected nonadjacent case, g1, or
the full rank-five theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_disconnected_nonadjacent_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_C5_DISCONNECTED_NONADJACENT_G1_NONADJACENT"
KNOWN_FOREST_COUNTS = {
    0: 1, 1: 1, 2: 2, 3: 3, 4: 6,
    5: 10, 6: 20, 7: 37, 8: 76, 9: 153,
    10: 329, 11: 710, 12: 1601,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank: int):
    return row[rank] if 0 <= rank < len(row) else 0


def phi_coefficient(base, lower, left: int, right: int):
    """[z^left w^right] Phi(X,P), where X=P+xH.

    ``base`` is the coefficient row of P and ``lower`` is that of H.
    """
    return (
        at(base, left - 1) * at(base, right)
        + at(base, left) * at(base, right - 1)
        + at(base, left - 1) * at(lower, right - 1)
        + at(lower, left - 1) * at(base, right - 1)
    )


def required_phi_gaps(base, lower) -> dict[str, int]:
    """Exactly the nontrivial gaps used by the total-degree-eight product."""
    return {
        "degree4_gap2": phi_coefficient(base, lower, 2, 2)
        - phi_coefficient(base, lower, 1, 3),
        "degree5_gap2": phi_coefficient(base, lower, 2, 3)
        - phi_coefficient(base, lower, 1, 4),
        "degree6_gap2": phi_coefficient(base, lower, 2, 4)
        - phi_coefficient(base, lower, 1, 5),
        "degree6_gap3": phi_coefficient(base, lower, 3, 3)
        - phi_coefficient(base, lower, 2, 4),
        "degree7_gap3": phi_coefficient(base, lower, 3, 4)
        - phi_coefficient(base, lower, 2, 5),
    }


def forest_graphs(order: int):
    """Every unlabeled forest of the given order, once."""
    if order == 0:
        yield nx.Graph()
        return
    component_types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            component_types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all(
                [component_types[index][1] for index in chosen]
            )
            return
        for index in range(start, len(component_types)):
            size = component_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def finite_certificate() -> dict:
    rows = {}
    total_forests = total_deletion_patterns = 0
    global_minima = {name: None for name in required_phi_gaps((1,), (1,))}
    for order in range(0, 13):
        count = deletion_patterns = 0
        minima = {name: None for name in global_minima}
        witnesses = {name: None for name in global_minima}
        for graph in forest_graphs(order):
            count += 1
            base = tuple(poly_forest(graph))
            components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
            choices = [(None, *component) for component in components]
            # Each choice removes either no vertex or one vertex from each
            # component.  This is exactly the geometry obtained after adding
            # a new root to the selected vertices: two selected vertices in
            # one component would create a cycle, and every allowed choice is
            # realized by that construction.
            for selection in itertools.product(*choices):
                reduced = graph.copy()
                selected = tuple(vertex for vertex in selection if vertex is not None)
                reduced.remove_nodes_from(selected)
                lower = tuple(poly_forest(reduced))
                values = required_phi_gaps(base, lower)
                deletion_patterns += 1
                for name, value in values.items():
                    assert value >= 0, (order, name, value, selected)
                    if minima[name] is None or value < minima[name]:
                        minima[name] = value
                        witnesses[name] = {
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "selected_one_per_component": [int(vertex) for vertex in selected],
                            "base": base,
                            "lower": lower,
                        }
        assert count == KNOWN_FOREST_COUNTS[order]
        total_forests += count
        total_deletion_patterns += deletion_patterns
        for name, value in minima.items():
            old = global_minima[name]
            global_minima[name] = value if old is None else min(old, value)
        rows[str(order)] = {
            "unlabeled_forests": count,
            "componentwise_deletion_checks": deletion_patterns,
            "minima": minima,
            "witnesses": witnesses,
        }
    return {
        "orders": [0, 12],
        "unlabeled_forests": total_forests,
        "componentwise_deletion_checks": total_deletion_patterns,
        "global_minima": global_minima,
        "rows": rows,
        "geometry": (
            "H is obtained from P by deleting no vertex or one vertex from each "
            "connected component"
        ),
        "role": "complete exact finite branch over the actual geometry, not extrapolated",
    }


def choose_polynomial(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def bernstein_coefficients(expression, variable):
    """Coefficients in the Bernstein basis on variable in [0,1]."""
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    power = list(reversed(polynomial.all_coeffs()))
    return [
        sp.factor(sum(
            sp.binomial(index, exponent) / sp.binomial(degree, exponent)
            * power[exponent]
            for exponent in range(index + 1)
        ))
        for index in range(degree + 1)
    ]


def analytic_certificate() -> dict:
    """Path-floor/binomial-ceiling proof for the actual geometry, n>=13."""
    n, m, t, r = sp.symbols("n m t r", nonnegative=True)
    # Every n-vertex forest can have its components joined to a tree, and the
    # path minimizes every tree coefficient.  Hence i_k>=C(n-k+1,k).
    p2_floor = choose_polynomial(n - 1, 2)
    p3_floor = choose_polynomial(n - 2, 3)
    h2_floor = choose_polynomial(m - 1, 2)

    p2, p3, p4, p5 = sp.symbols("p2 p3 p4 p5", nonnegative=True)
    h2, h3, h4 = sp.symbols("h2 h3 h4", nonnegative=True)
    symbolic_base = (1, n, p2, p3, p4, p5)
    symbolic_lower = (1, m, h2, h3, h4)
    exact_margins = required_phi_gaps(symbolic_base, symbolic_lower)
    expected_margins = {
        "degree4_gap2": (n - 1) * p2 + 2 * m * n - h2 - p3,
        "degree5_gap2": m * p2 + n * h2 + p2**2 - p3 - h3 - p4,
        "degree6_gap2": (m + p2) * p3 + n * h3 - p4 - h4 - p5,
        "degree6_gap3": (p2 - m) * p3 + 2 * h2 * p2 - n * h3 - n * p4,
        "degree7_gap3": h2 * p3 + h3 * p2 + p3**2 - m * p4 - n * h4 - n * p5,
    }
    assert all(
        sp.expand(exact_margins[name] - expected_margins[name]) == 0
        for name in expected_margins
    )

    # For m>=1, the five exact Phi margins, after dropping selected positive
    # terms and applying path floors and i_k(F)<=C(|F|,k), have these bounds.
    # In degree6_gap3, p2_floor-m>=0 because n>=13 and m<=n.
    lower = {
        "degree4_gap2": sp.factor(
            (n - 1) * p2_floor + 2 * m * n
            - choose_polynomial(m, 2) - choose_polynomial(n, 3)
        ),
        "degree5_gap2": sp.factor(
            m * p2_floor + p2_floor**2
            - choose_polynomial(n, 3)
            - choose_polynomial(m, 3)
            - choose_polynomial(n, 4)
        ),
        "degree6_gap2": sp.factor(
            (m + p2_floor) * p3_floor
            - choose_polynomial(n, 4)
            - choose_polynomial(m, 4)
            - choose_polynomial(n, 5)
        ),
        "degree6_gap3": sp.factor(
            (p2_floor - m) * p3_floor
            + 2 * h2_floor * p2_floor
            - n * choose_polynomial(m, 3)
            - n * choose_polynomial(n, 4)
        ),
        "degree7_gap3": sp.factor(
            h2_floor * p3_floor + p3_floor**2
            - m * choose_polynomial(n, 4)
            - n * choose_polynomial(m, 4)
            - n * choose_polynomial(n, 5)
        ),
    }

    # Independently audit every inequality substitution.  A variable used
    # positively is floor+slack; one used negatively is ceiling-slack.  Put
    # n=13+t and m=1+r(n-1), so every integer 1<=m<=n has 0<=r<=1.
    # Bernstein coefficients in r, then ordinary power coefficients in t and
    # all slacks, are nonnegative.
    slack = sp.symbols("s0:8", nonnegative=True)
    proof_substitutions = {
        "degree4_gap2": {
            p2: p2_floor + slack[0],
            h2: choose_polynomial(m, 2) - slack[1],
            p3: choose_polynomial(n, 3) - slack[2],
        },
        "degree5_gap2": {
            p2: p2_floor + slack[0], h2: slack[1],
            p3: choose_polynomial(n, 3) - slack[2],
            h3: choose_polynomial(m, 3) - slack[3],
            p4: choose_polynomial(n, 4) - slack[4],
        },
        "degree6_gap2": {
            p2: p2_floor + slack[0], p3: p3_floor + slack[1],
            h3: slack[2],
            p4: choose_polynomial(n, 4) - slack[3],
            h4: choose_polynomial(m, 4) - slack[4],
            p5: choose_polynomial(n, 5) - slack[5],
        },
        "degree6_gap3": {
            p2: p2_floor + slack[0], p3: p3_floor + slack[1],
            h2: h2_floor + slack[2],
            h3: choose_polynomial(m, 3) - slack[3],
            p4: choose_polynomial(n, 4) - slack[4],
        },
        "degree7_gap3": {
            p2: p2_floor + slack[0], p3: p3_floor + slack[1],
            h2: h2_floor + slack[2], h3: slack[3],
            p4: choose_polynomial(n, 4) - slack[4],
            h4: choose_polynomial(m, 4) - slack[5],
            p5: choose_polynomial(n, 5) - slack[6],
        },
    }

    stats = {}
    for name, expression in lower.items():
        shifted = sp.expand(expression.subs({n: t + 13, m: 1 + r * (t + 12)}))
        lower_bernstein = bernstein_coefficients(shifted, r)
        lower_power_rows = [sp.Poly(value, t) for value in lower_bernstein]
        assert all(
            coefficient > 0
            for row in lower_power_rows
            for coefficient in row.all_coeffs()
        ), name

        residual_shifted = sp.expand(
            (expected_margins[name].subs(proof_substitutions[name]) - expression)
            .subs({n: t + 13, m: 1 + r * (t + 12)})
        )
        residual_bernstein = bernstein_coefficients(residual_shifted, r)
        residual_rows = [sp.Poly(value, t, *slack) for value in residual_bernstein]
        assert all(
            coefficient >= 0
            for row in residual_rows
            for coefficient in row.coeffs()
        ), name
        stats[name] = {
            "lower_bound": str(expression),
            "substitution": "n=13+t, m=1+r(n-1), t>=0, 0<=r<=1",
            "bernstein_coefficients_in_r": [str(value) for value in lower_bernstein],
            "minimum_t_power_coefficient_across_bernstein_rows": str(min(
                coefficient
                for row in lower_power_rows
                for coefficient in row.all_coeffs()
            )),
            "margin_minus_lower_bernstein_slack_terms": sum(
                len(row.terms()) for row in residual_rows
            ),
            "margin_minus_lower_minimum_scalar_coefficient": str(min(
                coefficient
                for row in residual_rows
                for coefficient in row.coeffs()
            )),
        }

    # If m=0 in the actual componentwise-deletion geometry, every component
    # of P loses one vertex and has size one.  Thus P is the edgeless forest
    # and p_k=C(n,k).  Audit those five exact margins separately.
    edgeless_base = tuple([1, n] + [choose_polynomial(n, rank) for rank in range(2, 6)])
    empty_lower = (1,)
    m_zero_exact = required_phi_gaps(edgeless_base, empty_lower)
    m_zero_stats = {}
    for name, expression in m_zero_exact.items():
        shifted = sp.Poly(sp.expand(expression.subs(n, t + 13)), t)
        assert all(coefficient > 0 for coefficient in shifted.all_coeffs()), name
        m_zero_stats[name] = {
            "exact_edgeless_margin": str(sp.factor(expression)),
            "shift_n_equals_13_plus_t": str(shifted.as_expr()),
            "minimum_power_coefficient": str(min(shifted.all_coeffs())),
        }

    p2_minus_m = sp.expand(
        (p2_floor - m).subs({n: t + 13, m: 1 + r * (t + 12)})
    )
    p2_minus_m_bernstein = bernstein_coefficients(p2_minus_m, r)
    assert all(
        coefficient > 0
        for value in p2_minus_m_bernstein
        for coefficient in sp.Poly(value, t).all_coeffs()
    )
    return {
        "scope": (
            "all actual componentwise-deletion pairs (P,H) with |P|=n>=13; "
            "m=|H| is handled for m=0 and 1<=m<=n"
        ),
        "path_floor": (
            "Only k=2,3 are used: i_2(F)>=binom(n-1,2) and "
            "i_3(F)>=binom(n-2,3)"
        ),
        "path_floor_proof": (
            "For k=2 and k=3, induct using a nonisolated leaf v and the exact "
            "recurrence i_k(F)=i_k(F-v)+i_(k-1)(F-N[v]). Since v is a leaf, "
            "N[v] has exactly two vertices even when its neighbour has larger "
            "degree, so the two smaller orders are n-1 and n-2 and Pascal "
            "closes. The edgeless case is immediate."
        ),
        "ceiling": "i_k(F)<=binom(n,k)",
        "exact_phi_gap_formulas_reconstructed": True,
        "m_zero_structural_case": {
            "reason": (
                "Deleting at most one vertex per P-component and leaving H empty "
                "forces every P-component to be a singleton"
            ),
            "bounds": m_zero_stats,
        },
        "m_positive_parameterization": "m=1+r(n-1), 0<=r<=1",
        "p2_floor_minus_m_strictly_positive": {
            "expression": str(sp.factor(p2_floor - m)),
            "bernstein_coefficients": [str(value) for value in p2_minus_m_bernstein],
        },
        "floor_ceiling_slack_residuals_bernstein_coefficientwise_nonnegative": True,
        "bounds": stats,
        "all_lower_bound_bernstein_t_power_coefficients_strictly_positive": True,
    }


def factorization_certificate() -> dict:
    z, w = sp.symbols("z w")
    rz, rw, xz, xw, pz, pw, yz, yw, qz, qw = sp.symbols(
        "Rz Rw Xz Xw Pz Pw Yz Yw Qz Qw"
    )
    ez, ew = rz * xz * yz, rw * xw * yw
    uz, uw = rz * pz * yz, rw * pw * yw
    vz, vw = rz * xz * qz, rw * xw * qw
    wz, ww = rz * pz * qz, rw * pw * qw
    defect = sp.expand(z**2 * ew * wz + w**2 * ez * ww + z * w * (uw * vz + uz * vw))
    phi_x = z * xw * pz + w * xz * pw
    phi_y = z * yw * qz + w * yz * qw
    claimed = sp.expand(rz * rw * phi_x * phi_y)
    assert sp.expand(defect - claimed) == 0
    absorbed_phi = sp.expand(z * (rw * xw) * (rz * pz) + w * (rz * xz) * (rw * pw))
    assert sp.expand(absorbed_phi - rz * rw * phi_x) == 0
    return {
        "four_rows": "(E,U,V,W)=R*(XY,PY,XQ,PQ)",
        "rooted_recurrences": "X=P+xH and Y=Q+xJ",
        "rooted_geometry": (
            "P=I(T-u), H=I(T-N[u]); H deletes exactly one neighbour of u "
            "from each affected P-component and none from every other component"
        ),
        "identity": "R_defect=R(z)R(w)Phi(X,P)Phi(Y,Q)",
        "Phi": "Phi(X,P)=zX(w)P(z)+wX(z)P(w)",
        "common_factor_absorption": "Phi(RX,RP)=R(z)R(w)Phi(X,P)",
        "absorbed_geometry": (
            "After absorption, RH is obtained from RP by deleting at most one "
            "vertex from each component"
        ),
        "symbolic_residual_zero": True,
    }


def convolution_certificate() -> dict:
    """Exact total-degree-eight central-minus-neighbor decomposition."""
    p = sp.symbols("p0:8", nonnegative=True)
    h = sp.symbols("h0:8", nonnegative=True)
    boundary_gaps = {}
    for total_degree in range(2, 6):
        gap = sp.Poly(
            sp.expand(
                phi_coefficient(p, h, 1, total_degree - 1)
                - phi_coefficient(p, h, 0, total_degree)
            ),
            *p,
            *h,
        )
        assert all(value >= 0 for value in gap.coeffs())
        boundary_gaps[str(total_degree)] = {
            "gap": str(sp.factor(gap.as_expr())),
            "terms": len(gap.terms()),
            "minimum_scalar_coefficient": str(min(gap.coeffs())),
        }
    rows = []
    for degree_f in range(1, 8):
        degree_g = 8 - degree_f
        fbase, gbase = sp.symbols("fbase gbase", nonnegative=True)
        fd = sp.symbols(f"F1:{degree_f // 2 + 1}", nonnegative=True)
        gd = sp.symbols(f"G1:{degree_g // 2 + 1}", nonnegative=True)
        fhalf = [fbase + sum(fd[:index]) for index in range(degree_f // 2 + 1)]
        ghalf = [gbase + sum(gd[:index]) for index in range(degree_g // 2 + 1)]
        f = [fhalf[min(index, degree_f - index)] for index in range(degree_f + 1)]
        g = [ghalf[min(index, degree_g - index)] for index in range(degree_g + 1)]

        def convolution(index: int):
            return sp.expand(sum(
                f[left] * g[index - left]
                for left in range(degree_f + 1)
                if 0 <= index - left <= degree_g
            ))

        margin = sp.Poly(sp.expand(convolution(4) - convolution(3)), fbase, gbase, *fd, *gd)
        assert all(value >= 0 for value in margin.coeffs())
        rows.append({
            "factor_total_degrees": [degree_f, degree_g],
            "gap_form": str(sp.factor(margin.as_expr())),
            "terms": len(margin.terms()),
            "minimum_scalar_coefficient": str(min(margin.coeffs())),
        })
    return {
        "identity": (
            "[z4w4](Phi1*Phi2)-[z3w5](Phi1*Phi2) is the sum over "
            "factor total degrees d and 8-d of the seven displayed gap forms"
        ),
        "rows": rows,
        "all_gap_form_coefficients_nonnegative": True,
        "automatic_outer_phi_gaps": boundary_gaps,
        "needed_nontrivial_Phi_gaps": [
            "degree4_gap2", "degree5_gap2", "degree6_gap2",
            "degree6_gap3", "degree7_gap3",
        ],
    }


def main() -> None:
    finite = finite_certificate()
    analytic = analytic_certificate()
    factorization = factorization_certificate()
    convolution = convolution_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest with distinct marked vertices u,v in different "
            "connected components, C5=[z^4w^4]R_defect-[z^3w^5]R_defect is nonnegative."
        ),
        "factorization_certificate": factorization,
        "phi_gap_finite_certificate": finite,
        "phi_gap_all_order_certificate": analytic,
        "central_convolution_certificate": convolution,
        "scope": (
            "Distinct-component marked forests only. This proves C5, not M5, "
            "M5+3C5, connected nonadjacent marks, g1, all N5, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_componentwise_deletion_checks": finite["componentwise_deletion_checks"],
        "global_phi_gap_minima": finite["global_minima"],
        "convolution_cells": len(convolution["rows"]),
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
