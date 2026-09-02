#!/usr/bin/env python3
"""Derive an exact forest-invariant formula for bundle coefficient g2.

This extends the root g3 invariant method one rank lower.  It records an
exact formula involving edge, wedge, three-edge-subtree, and support-cut
statistics.  Any subsequent inequalities are stated separately; derivation
of the invariant identity alone is not a positivity theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from analyze_bundle_g12_agent_20260829 import symbolic_coefficients


def choose2(x: sp.Expr) -> sp.Expr:
    return sp.expand(x * (x - 1) / 2)


def choose3(x: sp.Expr) -> sp.Expr:
    return sp.expand(x * (x - 1) * (x - 2) / 6)


def choose4(x: sp.Expr) -> sp.Expr:
    return sp.expand(x * (x - 1) * (x - 2) * (x - 3) / 24)


def independent_two(order, edges):
    return sp.expand(choose2(order) - edges)


def independent_three(order, edges, wedges):
    return sp.expand(choose3(order) - edges * (order - 2) + wedges)


def independent_four(order, edges, wedges, three_edge_subtrees):
    return sp.expand(
        choose4(order)
        - edges * choose2(order - 2)
        + wedges * (order - 4)
        + choose2(edges)
        - three_edge_subtrees
    )


def main() -> None:
    coefficients, structural = symbolic_coefficients()
    raw = coefficients[2]

    n, q, e, du, dv, adjacent = sp.symbols(
        "n q edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    eu, ev = sp.symbols("epsilon_u epsilon_v", integer=True, nonnegative=True)
    wedge, su, sv, common = sp.symbols(
        "wedge_sum neighbor_excess_u neighbor_excess_v common_neighbor",
        integer=True,
        nonnegative=True,
    )
    triple, triple_u, triple_v = sp.symbols(
        "three_edge_subtrees triple_hit_u triple_hit_v",
        integer=True,
        nonnegative=True,
    )
    removed_degree_sum, removed_wedge_sum = sp.symbols(
        "removed_degree_sum removed_wedge_sum", integer=True, nonnegative=True
    )
    hit_u, hit_v = sp.symbols("hit_u hit_v", integer=True, nonnegative=True)
    d_neighbor_excess_u, d_neighbor_excess_v = sp.symbols(
        "D_neighbor_excess_u D_neighbor_excess_v", integer=True, nonnegative=True
    )

    e_d = sp.expand(e - removed_degree_sum)
    wedge_d = sp.expand(wedge - removed_wedge_sum)
    du_d = sp.expand(du - hit_u)
    dv_d = sp.expand(dv - hit_v)
    wedge_u = sp.expand(wedge - choose2(du) - su)
    wedge_v = sp.expand(wedge - choose2(dv) - sv)
    wedge_w = sp.expand(
        wedge
        - choose2(du)
        - choose2(dv)
        - su
        - sv
        + adjacent * (du + dv - 2)
        + common
    )

    substitution = {
        **{sp.symbols(f"c{name}0"): 1 for name in "EUVW"},
        **{sp.symbols(f"d{name}0"): 1 for name in "EUVW"},
        sp.symbols("cE1"): n,
        sp.symbols("cU1"): n - 1,
        sp.symbols("cV1"): n - 1,
        sp.symbols("cW1"): n - 2,
        sp.symbols("dE1"): q,
        sp.symbols("dU1"): q - eu,
        sp.symbols("dV1"): q - ev,
        sp.symbols("dW1"): q - eu - ev,
        sp.symbols("cE2"): independent_two(n, e),
        sp.symbols("cU2"): independent_two(n - 1, e - du),
        sp.symbols("cV2"): independent_two(n - 1, e - dv),
        sp.symbols("cW2"): independent_two(
            n - 2, e - du - dv + adjacent
        ),
        sp.symbols("cE3"): independent_three(n, e, wedge),
        sp.symbols("cU3"): independent_three(n - 1, e - du, wedge_u),
        sp.symbols("cV3"): independent_three(n - 1, e - dv, wedge_v),
        sp.symbols("cW3"): independent_three(
            n - 2, e - du - dv + adjacent, wedge_w
        ),
        sp.symbols("cE4"): independent_four(n, e, wedge, triple),
        sp.symbols("cU4"): independent_four(
            n - 1, e - du, wedge_u, triple - triple_u
        ),
        sp.symbols("cV4"): independent_four(
            n - 1, e - dv, wedge_v, triple - triple_v
        ),
        sp.symbols("dE2"): independent_two(q, e_d),
        sp.symbols("dU2"): independent_two(q - eu, e_d - eu * du_d),
        sp.symbols("dV2"): independent_two(q - ev, e_d - ev * dv_d),
        sp.symbols("dW2"): independent_two(
            q - eu - ev,
            e_d - eu * du_d - ev * dv_d + eu * ev * adjacent,
        ),
        sp.symbols("dE3"): independent_three(q, e_d, wedge_d),
        sp.symbols("dU3"): independent_three(
            q - eu,
            e_d - eu * du_d,
            wedge_d
            - eu * (choose2(du_d) + d_neighbor_excess_u),
        ),
        sp.symbols("dV3"): independent_three(
            q - ev,
            e_d - ev * dv_d,
            wedge_d
            - ev * (choose2(dv_d) + d_neighbor_excess_v),
        ),
    }
    expression = sp.expand(raw.subs(substitution))
    expression = sp.rem(
        sp.Poly(expression, eu), sp.Poly(eu**2 - eu, eu)
    ).as_expr()
    expression = sp.rem(
        sp.Poly(expression, ev), sp.Poly(ev**2 - ev, ev)
    ).as_expr()
    expression = sp.factor(expression)

    # Every three-edge subtree hit count counts a subset of the global
    # three-edge subtrees.  Therefore 12T-5T_u-5T_v >= 2T >= 0.  Record the
    # exact occurrence as the first rigorous positive payment in g2.
    triple_payment = sp.expand(
        12 * triple - 5 * triple_u - 5 * triple_v
    )
    residual = sp.expand(expression - triple_payment)
    assert not residual.has(triple, triple_u, triple_v)

    variables = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(expression, *variables)
    report = {
        "marker": "PASS_EXACT_BUNDLE_G2_FOREST_INVARIANT_REDUCTION_AGENT_20260829",
        "coefficient_g2": str(expression),
        "term_count": len(polynomial.terms()),
        "three_edge_subtree_payment": str(triple_payment),
        "three_edge_subtree_payment_lower_bound": "2*three_edge_subtrees>=0",
        "residual_without_three_edge_subtrees": str(sp.factor(residual)),
        "invariant_definitions": {
            "wedge_sum": "sum_x binom(deg_G(x),2)",
            "three_edge_subtrees": "number of 3-edge subtrees on 4 vertices",
            "triple_hit_u_v": "number of those subtrees containing the marked vertex",
            "removed_wedge_sum": "wedges destroyed by deleting the independent component-transversal S",
            "D_neighbor_excess_u_v": "sum_(x in N_D(mark))(deg_D(x)-1)",
        },
        "scope": (
            "Exact all-forest invariant identity and one nonnegative payment. "
            "The remaining residual sign is not asserted."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    out = Path("bundle_g2_forest_invariants_exact_agent_20260829.json")
    out.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
