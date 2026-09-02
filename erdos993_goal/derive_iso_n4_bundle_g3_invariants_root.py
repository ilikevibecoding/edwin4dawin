#!/usr/bin/env python3
"""Prove the rank-three binomial coefficient of the N4 bundle payment.

The support-deleted forest is G on n vertices with marked u,v.  Its support
neighbourhood S meets every component of G in at most one vertex, hence S is
independent.  D=G-S.  This script substitutes exact order/edge/wedge formulas
into the coefficient and exposes the remaining forest invariants.

After exact reduction, coarse but sharp-enough forest bounds give a uniform
positive lower bound.  The proof is symbolic and uses no numerical search.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import (
    add_xd,
    at,
    binomial_basis,
    isolate_multiply,
    nested_rank,
)


def choose2(x: sp.Expr) -> sp.Expr:
    return sp.expand(x * (x - 1) / 2)


def choose3(x: sp.Expr) -> sp.Expr:
    return sp.expand(x * (x - 1) * (x - 2) / 6)


def independent_three(order: sp.Expr, edges: sp.Expr, wedges: sp.Expr) -> sp.Expr:
    """Independent triples in a triangle-free graph, in particular a forest."""
    return sp.expand(choose3(order) - edges * (order - 2) + wedges)


def raw_coefficient_three() -> sp.Expr:
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    names = "EUVW"
    crows = tuple(tuple(sp.symbols(f"c{name}0:6") for _ in [0])[0] for name in names)
    drows = tuple(tuple(sp.symbols(f"d{name}0:6") for _ in [0])[0] for name in names)
    tm = add_xd(isolate_multiply(crows, m, 5), drows)
    t0 = add_xd(crows, drows)
    ct = isolate_multiply(crows, t, 4)
    lower = nested_rank(ct, 3)
    lower_polynomial = sp.Poly(lower, t)
    lower_sum = sp.expand(
        sum(
            coefficient
            * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0))
            / (power + 1)
            for (power,), coefficient in lower_polynomial.terms()
        )
    )
    gamma = sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower_sum)
    return sp.expand(binomial_basis(gamma, m)[3])


def main() -> None:
    n, q, e, du, dv, a = sp.symbols(
        "n q edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    eu, ev = sp.symbols("epsilon_u epsilon_v", integer=True, nonnegative=True)
    wedge, su, sv, common = sp.symbols(
        "wedge_sum neighbor_excess_u neighbor_excess_v common_neighbor",
        integer=True,
        nonnegative=True,
    )
    removed_degree_sum, hit_u, hit_v = sp.symbols(
        "removed_degree_sum hit_u hit_v", integer=True, nonnegative=True
    )
    k = sp.expand(n - q)
    d_edges = sp.expand(e - removed_degree_sum)
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
        + a * (du + dv - 2)
        + common
    )

    substitution = {
        # Constant and first coefficients of the four C-minors.
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
        # Independent pairs in G and its marked deletions.
        sp.symbols("cE2"): choose2(n) - e,
        sp.symbols("cU2"): choose2(n - 1) - (e - du),
        sp.symbols("cV2"): choose2(n - 1) - (e - dv),
        sp.symbols("cW2"): choose2(n - 2) - (e - du - dv + a),
        # Independent triples in the same four forests.
        sp.symbols("cE3"): independent_three(n, e, wedge),
        sp.symbols("cU3"): independent_three(n - 1, e - du, wedge_u),
        sp.symbols("cV3"): independent_three(n - 1, e - dv, wedge_v),
        sp.symbols("cW3"): independent_three(
            n - 2, e - du - dv + a, wedge_w
        ),
        # D=G-S, where S is independent.  hit_u/hit_v count surviving
        # marked neighbours lying in S and therefore vanish when the mark
        # itself was removed; the Boolean relations are imposed below.
        sp.symbols("dE2"): choose2(q) - d_edges,
        sp.symbols("dU2"): choose2(q - eu) - d_edges + eu * du_d,
        sp.symbols("dV2"): choose2(q - ev) - d_edges + ev * dv_d,
        sp.symbols("dW2"): (
            choose2(q - eu - ev)
            - d_edges
            + eu * du_d
            + ev * dv_d
            - eu * ev * a
        ),
    }
    coefficient = sp.factor(raw_coefficient_three().subs(substitution))

    # The support neighbourhood S contains u exactly when eu=0, similarly
    # for v.  If a surviving mark is hit by S then S cannot contain another
    # vertex in that component; hit variables are Boolean and only enter
    # multiplied by the corresponding survival indicator.
    boolean_reduced = sp.rem(sp.Poly(coefficient, eu), sp.Poly(eu**2 - eu, eu)).as_expr()
    boolean_reduced = sp.rem(
        sp.Poly(boolean_reduced, ev), sp.Poly(ev**2 - ev, ev)
    ).as_expr()
    boolean_reduced = sp.factor(boolean_reduced)

    deleted = sp.symbols("deleted_count", integer=True, nonnegative=True)
    g3_deleted = sp.expand(boolean_reduced.subs(q, n - deleted))
    degree_sum = sp.expand(du + dv)
    adjacency_part = sp.expand(
        a * (-5 * degree_sum + 5 * eu * ev + 12 * n + 3)
    )
    degree_part = sp.expand(
        6 * du**2 + 6 * dv**2 - 15 * n * degree_sum + 16 * degree_sum
    )
    edge_wedge_part = sp.expand(10 * e * n - 36 * e - 15 * wedge)
    epsilon_part = sp.expand(
        -5 * eu * ev
        + eu * (-3 * hit_u - 6 * n + 3 * deleted - 5)
        + ev * (-3 * hit_v - 6 * n + 3 * deleted - 5)
    )
    base_part = sp.expand(
        26 * n**2 - 4 * n * deleted + 3 * deleted**2
        + 2 * n - 9 * deleted + 4
    )
    manifestly_nonnegative_part = sp.expand(
        3 * du * eu
        + 3 * dv * ev
        + 12 * su
        + 12 * sv
        + 6 * removed_degree_sum
    )
    grouped = sp.expand(
        adjacency_part
        - 5 * common
        + degree_part
        + edge_wedge_part
        + epsilon_part
        + base_part
        + manifestly_nonnegative_part
    )
    assert sp.expand(g3_deleted - grouped) == 0

    # Exact residual identities behind the lower bounds.
    base_lower = sp.Rational(74, 3) * n**2 - 4 * n - sp.Rational(11, 4)
    assert sp.expand(
        base_part - base_lower - (6 * deleted - 4 * n - 9) ** 2 / 12
    ) == 0
    degree_lower = -12 * n**2 + 16 * n
    assert sp.expand(
        degree_part
        - degree_lower
        - 3 * (du - dv) ** 2
        - (n - degree_sum) * (12 * n - 3 * degree_sum - 16)
    ) == 0

    # Since wedge_sum <= binom(edge_count,2), the edge/wedge part is at
    # least F(m)=m(10n-57/2-15m/2).  For n>=9 this is nonnegative because
    # m<=n-1.  For 2<=n<=8 it is at least F(n-1); the following identity
    # proves that endpoint comparison.
    edge_floor = sp.expand(e * (10 * n - sp.Rational(57, 2) - sp.Rational(15, 2) * e))
    edge_small_floor = sp.expand((n - 1) * (5 * n - 42) / 2)
    assert sp.expand(
        edge_floor
        - edge_small_floor
        + (e - n + 1) * (15 * e - 5 * n + 42) / 2
    ) == 0

    # The other discarded pieces satisfy:
    #   adjacency_part >= 0 from du+dv<=n;
    #   manifestly_nonnegative_part >= 0;
    #   epsilon_part >= -12n-21 from Boolean epsilons, hit_u,hit_v<=1;
    #   -5*common >= -5 from common<=1.
    large_n_lower = sp.expand(
        base_lower + degree_lower - 12 * n - 26
    )
    assert large_n_lower == sp.Rational(38, 3) * n**2 - sp.Rational(115, 4)
    small_n_lower = sp.factor(large_n_lower + edge_small_floor)
    assert sp.expand(
        small_n_lower - (182 * n**2 - 282 * n - 93) / 12
    ) == 0
    assert sp.expand(
        small_n_lower
        - sp.Rational(71, 12)
        - (n - 2) * (91 * n + 41) / 6
    ) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_BINOMIAL_COEFFICIENT_G3",
        "coefficient_g3": str(coefficient),
        "boolean_reduced_g3": str(boolean_reduced),
        "invariants": {
            "G": "forest on n vertices and edge_count edges with marks u,v",
            "wedge_sum": "sum_x binom(deg_G(x),2)",
            "neighbor_excess_u": "sum_{x in N(u)}(deg_G(x)-1)",
            "neighbor_excess_v": "sum_{x in N(v)}(deg_G(x)-1)",
            "common_neighbor": "number of common neighbours outside the marks, at most one",
            "S": "support neighbourhood, an independent transversal of components",
            "q": "n-|S|",
            "removed_degree_sum": "sum_{x in S}deg_G(x), equal to removed edge count",
            "hit_u": "number of neighbours of surviving u in S, at most one",
            "hit_v": "number of neighbours of surviving v in S, at most one",
        },
        "positivity_proof": {
            "forest_bounds": [
                "2<=n, 0<=deleted_count<=n, 0<=edge_count<=n-1",
                "degree_u+degree_v<=n",
                "wedge_sum<=binom(edge_count,2)",
                "common_neighbor<=1",
                "epsilon_u,epsilon_v,hit_u,hit_v are Boolean in the terms where used",
                "neighbor_excess_u,neighbor_excess_v,removed_degree_sum>=0",
            ],
            "base_lower": str(base_lower),
            "degree_lower": str(degree_lower),
            "edge_lower_n_ge_9": "0",
            "edge_lower_2_le_n_le_8": str(edge_small_floor),
            "epsilon_and_common_lower": "-12*n-26",
            "total_lower_n_ge_9": str(large_n_lower),
            "total_lower_2_le_n_le_8": str(small_n_lower),
            "small_range_minimum": "71/12 at n=2",
            "conclusion": "g3>0 for every genuine forest bundle cell",
        },
        "scope": (
            "Universal exact proof for binom(M,3) in the rank-four whole-bundle "
            "payment polynomial. Coefficients 1 and 2 remain open."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_n4_bundle_g3_forest_invariants_root_20260829.json").write_text(
        raw, encoding="utf-8"
    )
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
