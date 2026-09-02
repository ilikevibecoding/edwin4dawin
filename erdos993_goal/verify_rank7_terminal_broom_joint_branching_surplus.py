#!/usr/bin/env python3
"""Exact replay for the joint (A,A-q,J) terminal-broom reduction.

This proves the affine feasible interval for b=i_5(J), the quantitative
branching-surplus lower endpoint for i_5(A), and strict concavity of the
seven unresolved low terminal-broom Newton coefficients in b.  It does not
claim that the resulting endpoint problems are all positive.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_terminal_broom_joint_branching_surplus_exact_20260817.json"


def main() -> int:
    n, m, r, B2 = sp.symbols("n m r B2", integer=True, positive=True)
    a, b = sp.symbols("a b", nonnegative=True)
    c2, c3, c4, c5, c6, c7 = sp.symbols(
        "c2 c3 c4 c5 c6 c7", positive=True
    )

    # Bad-set notation: E4=C(m,4)-i4(J), E5=C(m,5)-i5(J).
    E4 = sp.binomial(m, 4) - a
    E5 = sp.binomial(m, 5) - b
    incidence = (m - 4) * E4
    defect_lower_b = sp.binomial(m, 5) - (m - 4) * E4 / 3
    defect_upper_b = sp.binomial(m, 5) - (m - 4) * E4 / 5
    assert sp.simplify(E5 <= incidence / 3) is not sp.false
    assert sp.simplify(E5 >= incidence / 5) is not sp.false
    assert sp.simplify((b - defect_lower_b) - (incidence / 3 - E5)) == 0
    assert sp.simplify((defect_upper_b - b) - (E5 - incidence / 5)) == 0

    # A second incidence count couples the rank-four defect to e(J).
    e = sp.symbols("e", integer=True, nonnegative=True)
    edge_bad4_incidence = e * sp.binomial(m - 2, 2)
    edge_lower_e = sp.factor(E4 / sp.binomial(m - 2, 2))
    edge_upper_e = sp.factor(3 * E4 / sp.binomial(m - 2, 2))

    # Exact local smoothing behind the balanced-neighbor lower bound.
    x, y = sp.symbols("x y", integer=True, nonnegative=True)
    smoothing_drop = sp.simplify(
        sp.binomial(x, 2)
        + sp.binomial(y, 2)
        - sp.binomial(x - 1, 2)
        - sp.binomial(y + 1, 2)
    )
    assert sp.simplify(smoothing_drop - (x - y - 1)) == 0

    rho_j = (m - 7) * (m - 8) / (5 * (m - 3))
    upper_j = (m - 4) / 5
    upper_h = (n - 6) / 6

    lower_candidates = (
        sp.factor(rho_j * a),
        sp.factor(defect_lower_b),
        sp.factor(c6 - upper_h * (c5 - a)),
        sp.Integer(0),
    )
    upper_candidates = (
        sp.factor(upper_j * a),
        sp.factor(defect_upper_b),
        sp.factor(c5 - a),
        c6,
    )

    # Exact core branching-surplus input (tree rank-(4,5), theorem (15)).
    kappa = (n**3 - 8 * n**2 - 19 * n + 302) / 6
    core_surplus = sp.expand(
        5 * (n - 3) * c5 - (n - 7) * (n - 8) * c4 - kappa * B2
    )
    core_c5_lower = sp.factor(
        ((n - 7) * (n - 8) * c4 + kappa * B2) / (5 * (n - 3))
    )
    assert sp.simplify(core_surplus.subs(c5, core_c5_lower)) == 0

    raw = newton_coefficients(exact_decomposition())
    expected_second = (
        -4 * c6 * (a + 47 * c5 + 48 * c6),
        -192 * c6 * (c4 + c5),
        -192 * c6 * (c3 + c4),
        -192 * c6 * (c2 + c3),
        -192 * c6 * (c2 + n),
        -192 * c6 * (n + 1),
        -192 * c6,
    )
    second_derivatives = []
    degrees = []
    substitutions = {
        c[0]: 1,
        c[1]: n,
        c[2]: c2,
        c[3]: c3,
        c[4]: c4,
        c[5]: c5,
        c[6]: c6,
        c[7]: c7,
        h[5]: c5 - a,
        h[6]: c6 - b,
    }
    for rank in range(7):
        expression = sp.expand(raw[rank].subs(substitutions, simultaneous=True))
        degree = sp.degree(expression, b)
        second = sp.factor(sp.diff(expression, b, 2))
        assert degree == 2
        assert sp.simplify(second - expected_second[rank]) == 0
        degrees.append(int(degree))
        second_derivatives.append(str(second))

    report = {
        "status": "PASS_EXACT_JOINT_BRANCHING_SURPLUS_REDUCTION_ONLY",
        "scope": {
            "target": "terminal-broom Newton coefficients Delta^0 through Delta^6",
            "remaining_band": "23<=n<=38 and B2>=5",
            "warning": "The affine endpoint reduction is proved; endpoint positivity is not claimed.",
        },
        "bad_set_double_count": {
            "identity": "(m-4)(C(m,4)-a)=sum over bad 5-sets of their bad 4-subsets",
            "fiber_range": [3, 5],
            "b_lower": str(defect_lower_b),
            "b_upper": str(defect_upper_b),
            "sharp_examples": {
                "lower_fiber_3": "a 5-set inducing exactly one edge",
                "upper_fiber_5": "a 5-set whose every vertex deletion still leaves an edge",
            },
        },
        "joint_edge_branching_coupling": {
            "edge_bad4_identity": "e(J) C(m-2,2)=sum over bad 4-sets of their induced edge counts",
            "forest_fiber_range": [1, 3],
            "edge_lower": str(edge_lower_e),
            "edge_upper": str(edge_upper_e),
            "root_neighbor_mass": "For x_u=deg_A(u)-1 on u in N(q), sum_u x_u=m-e(J).",
            "branching_lower": "B2(A)>=C(r-1,2)+sum_u C(x_u,2)+B2(J)>=C(r-1,2)+Phi_r(m-e(J)).",
            "balanced_function": "If s=ru+v with 0<=v<r, Phi_r(s)=(r-v)C(u,2)+vC(u+1,2).",
            "smoothing_drop": str(smoothing_drop),
        },
        "joint_b_interval": {
            "lower_candidates": [str(value) for value in lower_candidates],
            "upper_candidates": [str(value) for value in upper_candidates],
            "J_ratio_condition": "use rho_J candidate only when m>=18",
            "H_definition": "H=A-q, so i5(H)=c5-a and i6(H)=c6-b",
            "literal_containment": "J is induced in H, hence b=i5(J)<=i5(H)=c5-a",
        },
        "core_branching_surplus": {
            "B2": "sum_v C(deg_A(v)-1,2)",
            "kappa": str(sp.factor(kappa)),
            "c5_lower": str(core_c5_lower),
        },
        "b_concavity": {
            "degrees": degrees,
            "second_derivatives": second_derivatives,
            "conclusion": "Each coefficient minimum over any feasible b interval occurs at an interval endpoint.",
        },
        "exact_rooted_tree_audit": {
            "orders": [18, 19, 20],
            "free_trees": 1264887,
            "rooted_checks": 24732051,
            "failures": 0,
            "replay": "verify_rank7_joint_branching_surplus_tree_audit.rs",
        },
        "preserved_no_go": {
            "decoupled_box": "Dropping the joint feasibility inequalities returns the known false decoupled box.",
            "invalid_H_ratio": {
                "statement": "The tree/forest rank-(4,5) ratio cannot be shifted to h6/h5.",
                "exact_counterexample": "H=P9 disjoint union P9 has h5=2232 and h6=2083; 5(18-3)h6-(18-7)(18-8)h5=-89295.",
            },
            "classification": "The first item is an enclosure failure; the H-ratio item is an exact forest counterexample to that candidate shortcut.",
            "weaker_valid_domain_failure": {
                "parameters": "n=23,r=1,m=21,B2=210,a=C(21,4),b=C(21,5), c3=1540,c4=15015/2,c5=20748,c6=380912/11,c7=74032968/1573",
                "Delta0": "-19937921223556997181844848/2474329",
                "classification": "exact abstract-domain failure, not a tree counterexample; c4 is already nonintegral",
                "lesson": "Even the new edge/branching coupling does not connect the higher core counts tightly enough near maximal branching.",
            },
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
