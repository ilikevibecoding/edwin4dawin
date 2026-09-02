#!/usr/bin/env python3
"""Exact parent-cone reduction for rank-five singleton-ordinary g1.

For a forest G with distinct u,v,p, put D=G-p and Q=G-N[p].  The exact
singleton payment derived in the companion source is

    R_ord(C,Q) = N4(D) + F(C,Q).

This source proves an all-order reduction for F when n=|G|>=14.  It splits
the connected 3/4-edge layer into star and nonstar motifs, retains an exact
degree-moment reserve for the stars, and eliminates the Q wedge and
neighbor-excess variables with exact forest bounds.  The output is a
rational parent cone in orders, edges, wedges, three degrees, two marked
neighbor excesses, the p-neighbor excess, two common-neighbor indicators,
and the three adjacency indicators.  Positivity of that last cone is
deliberately not asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein import (
    forest_configuration,
    raw_payment,
)
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import nested


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_parent_cone_exact_g1_bernstein_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_PARENT_CONE_G1_BERNSTEIN"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def boolean_reduce(expression: sp.Expr, booleans: tuple[sp.Symbol, ...]) -> sp.Expr:
    out = sp.expand(expression)
    for variable in booleans:
        out = sp.rem(
            sp.Poly(out, variable), sp.Poly(variable**2 - variable, variable)
        ).as_expr()
    return sp.expand(out)


def derive() -> dict[str, object]:
    crows, qrows, _no_parent, _n4, _correction, payment = raw_payment()
    drows = tuple(
        tuple(crows[row][rank] - (qrows[row][rank - 1] if rank else 0)
              for rank in range(7))
        for row in range(4)
    )
    n4_d = nested(drows, 4)
    f_raw = sp.expand(payment - n4_d)
    assert sp.expand(payment - n4_d - f_raw) == 0

    invariant, symbols = forest_configuration(f_raw, crows, qrows)
    n = symbols["n"]
    e = symbols["edge_count"]
    du = symbols["degree_u"]
    dv = symbols["degree_v"]
    adjacent = symbols["adjacent"]
    wedges = symbols["C_wedges_E"]
    xu = symbols["C_neighbor_excess_u"]
    xv = symbols["C_neighbor_excess_v"]
    common = symbols["C_common_neighbor"]
    re = symbols["C_connected3_E"]
    ru = symbols["C_connected3_U"]
    rv = symbols["C_connected3_V"]
    q35 = symbols["C_three_edge_five"]
    r4 = symbols["C_connected4_E"]
    qre = symbols["Q_connected3_E"]
    qwedges = symbols["Q_wedges_E"]
    qxu = symbols["Q_neighbor_excess_u"]
    qxv = symbols["Q_neighbor_excess_v"]

    dp, xp = sp.symbols("degree_p neighbor_excess_p", integer=True, nonnegative=True)
    apu, apv = sp.symbols("adjacent_pu adjacent_pv", integer=True, nonnegative=True)
    cpu, cpv = sp.symbols(
        "common_neighbor_pu common_neighbor_pv", integer=True, nonnegative=True
    )
    m, qe = sp.symbols("Q_order Q_edges", integer=True, nonnegative=True)
    booleans = (adjacent, apu, apv)
    qdu = (1 - apu) * du - cpu
    qdv = (1 - apv) * dv - cpv
    parent_rules = {
        symbols["Q_order"]: m,
        symbols["Q_edges"]: qe,
        symbols["Q_mark_u_survives"]: 1 - apu,
        symbols["Q_mark_v_survives"]: 1 - apv,
        symbols["Q_degree_u"]: qdu,
        symbols["Q_degree_v"]: qdv,
        symbols["Q_adjacent"]: adjacent * (1 - apu) * (1 - apv),
    }
    parent = boolean_reduce(invariant.subs(parent_rules), booleans)
    # The exact edge/order identities are imposed after all derivatives are
    # recorded: m=n-1-dp and qe=e-dp-xp.
    # F has the single negative Q high-motif term -(n+3)R3(Q).
    # Since Q is induced in C, R3(Q)<=R3(C); replacing qre by re is a
    # valid lower bound and removes Q from the subsequent incidence payment.
    assert sp.factor(sp.diff(parent, qre)) == -(n + 3)
    parent = sp.expand(parent.subs(qre, re))

    expected_high = {
        re: (
            n**2 - 10 * n + 11 + 8 * adjacent + 2 * apu + 2 * apv
            - 2 * dp - 8 * du - 8 * dv + 8 * e
        ),
        ru: (
            5 * n**2 - 15 * n + 10 + 2 * dp - 2 * apv
            + 10 * dv - 10 * e
        ) / 2,
        rv: (
            5 * n**2 - 15 * n + 10 + 2 * dp - 2 * apu
            + 10 * du - 10 * e
        ) / 2,
        q35: 5 * n - 11,
        r4: 11 - 5 * n,
    }
    # Replace m,qe only now, so the exact parent identities are visible.
    parent = boolean_reduce(
        parent.subs({m: n - 1 - dp, qe: e - dp - xp}), booleans
    )
    for variable, expected in expected_high.items():
        assert sp.expand(sp.diff(parent, variable) - expected) == 0

    a, b, c = expected_high[re], expected_high[ru], expected_high[rv]
    k = expected_high[q35]
    incident_slack = sp.symbols("incident_edge_slack", nonnegative=True)
    parent_slack = sp.symbols("parent_degree_slack", nonnegative=True)
    edge_slack = sp.symbols("edge_slack", nonnegative=True)
    # e=du+dv+dp-adjacent-apu-apv+incident_slack.
    incidence_rule = {
        e: du + dv + dp - adjacent - apu - apv + incident_slack
    }
    assert sp.factor(a.subs(incidence_rule)) == (
        n**2 - 10 * n + 11 + 6 * (dp - apu - apv) + 8 * incident_slack
    )
    assert sp.factor(
        b.subs(e, n - 1 - edge_slack)
        - (
            5 * (n - 1) * (n - 4) / 2
            + (dp - apv) + 5 * dv + 5 * edge_slack
        )
    ) == 0
    assert sp.factor(
        c.subs(e, n - 1 - edge_slack)
        - (
            5 * (n - 1) * (n - 4) / 2
            + (dp - apu) + 5 * du + 5 * edge_slack
        )
    ) == 0

    # The older all-high-motif discard is retained as an exact diagnostic.
    # It is valid but too weak for the final parent cone: the discarded star
    # surplus is needed when an unmarked vertex has large degree.
    star_u = sp.expand(4 * a + b - k * (n - 4))
    star_v = sp.expand(4 * a + c - k * (n - 4))
    star_floor = (3 * n**2 - 43 * n + 20) / 2
    star_u_remainder = sp.expand(
        star_u.subs(incidence_rule).subs(dp, apu + apv + parent_slack)
        - star_floor
    )
    star_v_remainder = sp.expand(
        star_v.subs(incidence_rule).subs(dp, apu + apv + parent_slack)
        - star_floor
    )
    assert sp.factor(star_u_remainder) == (
        5 * adjacent + apu + 20 * parent_slack + 27 * incident_slack
        + 5 * (n - 1 - du)
    )
    assert sp.factor(star_v_remainder) == (
        5 * adjacent + apv + 20 * parent_slack + 27 * incident_slack
        + 5 * (n - 1 - dv)
    )
    assert star_floor.subs(n, 14) == 3
    assert sp.diff(star_floor, n).subs(n, 14) > 0

    # Start with the non-high-motif part.  A sharper lower bound for the high
    # layer is added after the Q reductions below.
    low = sp.expand(parent.subs({re: 0, ru: 0, rv: 0, q35: 0, r4: 0}))
    kwedge_q = sp.factor(sp.diff(low, qwedges))
    kxu_q = sp.factor(sp.diff(low, qxu))
    kxv_q = sp.factor(sp.diff(low, qxv))
    expected_kwedge_q = (
        2 * adjacent - 3 * apu - 3 * apv - dp * n - 5 * dp
        - du - dv + n**2 + 2 * n - 13
    )
    assert sp.expand(kwedge_q - expected_kwedge_q) == 0
    assert sp.expand(
        kxu_q
        + (10 * apv - 10 * dp + 2 * dv - 2 * e + n**2 + 7 * n - 16) / 2
    ) == 0
    assert sp.expand(
        kxv_q
        + (10 * apu - 10 * dp + 2 * du - 2 * e + n**2 + 7 * n - 16) / 2
    ) == 0
    q_excess_sign_floor = n**2 - 5 * n - 4
    assert q_excess_sign_floor.subs(n, 6) == 2
    assert sp.diff(q_excess_sign_floor, n).subs(n, 6) > 0

    # If m>=3, du+dv<=e+adjacent<=n-1+adjacent and apu+apv<=2 give
    # kwedge_q>=2+adjacent.  If m<=2 then Q has no wedge.  Thus qwedges
    # can be set to zero in every branch.  Since kxu_q,kxv_q<0 for n>=6,
    # use qxu<=qe-qdu and qxv<=qe-qdv.
    low = boolean_reduce(
        low.subs({
            qwedges: 0,
            qxu: (e - dp - xp) - qdu,
            qxv: (e - dp - xp) - qdv,
        }),
        booleans,
    )

    # Sharpen the high-motif payment.  Write S_j(G)=sum_w binomial(d_w,j).
    # Every nonstar connected four-edge tree has an internal-edge deletion,
    # and those deletions inject into Q35, hence Q35>=R4_nonstar.  Also
    # S4<=(n-4)S3/4.  Finally
    #
    #   S3(G-u)>=S3(G)-C(du,3)-C(xu,2),
    #
    # and similarly at v.  Consequently the complete high layer is at least
    # L*S3 minus the two displayed deletion debts.  The exact smooth forest
    # moment bound
    #
    #   S3 >= 2*W*(W-e+1)/(3*(e-1))                  (e>=2)
    #
    # follows by putting y_w=max(d_w-1,0), R=sum y_w<=e-1, applying
    # sum(y^3)>=sum(y^2)^2/sum(y), and observing that the resulting bound is
    # decreasing in R.  The R=0 case has W=S3=0 and is immediate.
    star_coefficient = sp.factor(a + b + c - k * (n - 4) / 4)
    star_coefficient_expected = sp.factor(
        (
            32 * adjacent + 4 * apu + 4 * apv - 12 * du - 12 * dv
            - 8 * e + 19 * n**2 - 69 * n + 40
        ) / 4
    )
    assert sp.expand(star_coefficient - star_coefficient_expected) == 0
    star_coefficient_floor = (19 * n**2 - 89 * n + 60 + 20 * adjacent) / 4
    uv_incidence_slack = sp.symbols("uv_incidence_slack", nonnegative=True)
    star_coefficient_remainder = sp.factor(
        star_coefficient.subs(dv, e + adjacent - uv_incidence_slack - du)
        .subs(e, n - 1 - edge_slack)
        - star_coefficient_floor
    )
    assert star_coefficient_remainder == (
        apu + apv + 3 * uv_incidence_slack + 5 * edge_slack
    )
    assert star_coefficient_floor.subs({n: 14, adjacent: 0}) > 0
    assert sp.diff(star_coefficient_floor, n).subs({n: 14, adjacent: 0}) > 0

    star_moment_floor = sp.factor(
        2 * wedges * (wedges - e + 1) / (3 * (e - 1))
    )
    star_deletion_u = du * (du - 1) * (du - 2) / 6 + xu * (xu - 1) / 2
    star_deletion_v = dv * (dv - 1) * (dv - 2) / 6 + xv * (xv - 1) / 2
    star_reserve = sp.factor(
        star_coefficient * star_moment_floor
        - b * star_deletion_u
        - c * star_deletion_v
    )
    strong = sp.cancel(low + star_reserve)

    strong_before_common = strong
    k_common = sp.factor(sp.diff(strong_before_common, common))
    k_xu_low = sp.factor(sp.diff(low, xu))
    k_xv_low = sp.factor(sp.diff(low, xv))
    common_bracket = sp.factor(-6 * k_common)
    common_floor = 5 * n**3 - 45 * n**2 + 16 * n + 24
    # The common-neighbor derivative is unchanged by the star reserve.  The
    # inequalities used for its sign are W<=C(n-1,2), every degree,dp,e,xp<=
    # n-1, cpu,cpv<=1, and nonnegativity of all omitted positive terms.
    assert common_floor.subs(n, 14) > 0
    assert sp.diff(common_floor, n).subs(n, 14) > 0
    assert sp.diff(common_floor, n, 2).subs(n, 14) > 0

    # Set only the common-neighbor variable to its forest upper bound.  The
    # reserve is coordinatewise concave in xu,xv, so the minimum on
    # 0<=xu<=e-du, 0<=xv<=e-dv occurs at one of four endpoint pairs.  W is
    # retained for a later exact interval/Bernstein certificate.
    strong = sp.cancel(strong.subs(common, 1))
    strong_numerator, strong_denominator = map(sp.factor, sp.fraction(strong))
    assert sp.expand(strong_denominator - 120 * (e - 1)) == 0
    assert sp.Poly(strong_numerator, xu).degree() == 2
    assert sp.Poly(strong_numerator, xv).degree() == 2
    assert sp.Poly(strong_numerator, wedges).degree() == 2
    xu_curvature = sp.factor(sp.diff(strong_numerator, xu, 2))
    xv_curvature = sp.factor(sp.diff(strong_numerator, xv, 2))
    assert sp.factor(xu_curvature + 120 * (e - 1) * b) == 0
    assert sp.factor(xv_curvature + 120 * (e - 1) * c) == 0
    wedge_quadratic_coefficient = sp.factor(
        sp.Poly(strong_numerator, wedges).coeff_monomial(wedges**2)
    )
    wedge_quadratic_expected = 20 * (
        32 * adjacent + 4 * apu + 4 * apv - 12 * du - 12 * dv
        + 10 * e + 19 * n**2 - 69 * n + 22
    )
    assert sp.expand(wedge_quadratic_coefficient - wedge_quadratic_expected) == 0
    wedge_quadratic_floor = 20 * (
        19 * n**2 - 71 * n + 24 + 20 * adjacent
    )
    wedge_quadratic_remainder = sp.factor(
        wedge_quadratic_coefficient.subs(
            dv, e + adjacent - uv_incidence_slack - du
        ).subs(e, n - 1 - edge_slack)
        - wedge_quadratic_floor
    )
    assert sp.expand(
        wedge_quadratic_remainder
        - 20 * (
            4 * apu + 4 * apv + 12 * uv_incidence_slack + 2 * edge_slack
        )
    ) == 0
    assert wedge_quadratic_floor.subs({n: 14, adjacent: 0}) > 0
    assert sp.diff(wedge_quadratic_floor, n).subs({n: 14, adjacent: 0}) > 0

    zu, zv, zp = sp.symbols(
        "degree_u_positive degree_v_positive degree_p_positive",
        integer=True,
        nonnegative=True,
    )
    degree_remainder = sp.expand(
        e - 1 - (du - zu) - (dv - zv) - (dp - zp)
    )
    degree_excess_wedge_cap = sp.expand(
        du * (du - 1) / 2
        + dv * (dv - 1) / 2
        + dp * (dp - 1) / 2
        + degree_remainder * (degree_remainder + 1) / 2
    )
    xu_end, xv_end = sp.symbols(
        "neighbor_excess_u_endpoint neighbor_excess_v_endpoint",
        integer=True,
        nonnegative=True,
    )
    strong_endpoint = sp.factor(strong.subs({xu: xu_end, xv: xv_end}))

    edgeless = sp.factor(parent.subs({
        e: 0, du: 0, dv: 0, dp: 0, xp: 0,
        adjacent: 0, apu: 0, apv: 0, cpu: 0, cpv: 0,
        wedges: 0, xu: 0, xv: 0, common: 0,
        qwedges: 0, qxu: 0, qxv: 0,
        re: 0, ru: 0, rv: 0, q35: 0, r4: 0,
    }))
    edgeless_expected = sp.factor(
        (n - 3) * (n - 2) * (n - 1) * (41 * n**2 - 39 * n - 260) / 120
    )
    assert sp.expand(edgeless - edgeless_expected) == 0
    edgeless_quadratic = 41 * n**2 - 39 * n - 260
    assert edgeless_quadratic.subs(n, 4) > 0
    assert sp.diff(edgeless_quadratic, n).subs(n, 4) > 0

    # The e=1 boundary is exact: every high motif, wedge, neighbor excess,
    # and common-neighbor count vanishes.  The unique edge contains zero,
    # one, or two of the selected vertices.  Up to u/v symmetry there are
    # five displayed cases.  Shifting n=N+14 gives strictly positive power
    # coefficients in every residual factor.
    one_edge_base = {
        e: 1, du: 0, dv: 0, dp: 0, xp: 0,
        adjacent: 0, apu: 0, apv: 0, cpu: 0, cpv: 0,
        wedges: 0, xu: 0, xv: 0, common: 0,
        qwedges: 0, qxu: 0, qxv: 0,
        re: 0, ru: 0, rv: 0, q35: 0, r4: 0,
    }
    one_edge_substitutions = {
        "no_selected_endpoint": {},
        "u_only": {du: 1},
        "p_only": {dp: 1},
        "uv_edge": {du: 1, dv: 1, adjacent: 1},
        "pu_edge": {du: 1, dp: 1, apu: 1},
    }
    one_edge = {}
    shifted_variable = sp.symbols("shifted_order", nonnegative=True)
    one_edge_shifted_coefficients = {}
    for label, extra in one_edge_substitutions.items():
        rules = dict(one_edge_base)
        rules.update(extra)
        value = sp.factor(parent.subs(rules))
        one_edge[label] = value
        shifted = sp.Poly(
            sp.expand(value.subs(n, shifted_variable + 14)), shifted_variable
        )
        coefficients = shifted.all_coeffs()
        assert all(coefficient > 0 for coefficient in coefficients)
        one_edge_shifted_coefficients[label] = coefficients

    variables = sorted(strong_endpoint.free_symbols, key=str)
    return {
        "raw_F": f_raw,
        "invariant": invariant,
        "parent_after_Q_R3_containment": parent,
        "high_coefficients": expected_high,
        "star_floor": star_floor,
        "star_u_remainder": star_u_remainder,
        "star_v_remainder": star_v_remainder,
        "sharp_star_coefficient": star_coefficient,
        "sharp_star_coefficient_floor": star_coefficient_floor,
        "sharp_star_coefficient_remainder": star_coefficient_remainder,
        "star_moment_floor": star_moment_floor,
        "star_deletion_u": star_deletion_u,
        "star_deletion_v": star_deletion_v,
        "star_reserve": star_reserve,
        "q_coefficients": {
            "Q_wedges_E": kwedge_q,
            "Q_neighbor_excess_u": kxu_q,
            "Q_neighbor_excess_v": kxv_q,
        },
        "monotone_coefficients": {
            "C_common_neighbor": k_common,
            "C_neighbor_excess_u_before_star_reserve": k_xu_low,
            "C_neighbor_excess_v_before_star_reserve": k_xv_low,
        },
        "sign_floors": {
            "q_excess_bracket": q_excess_sign_floor,
            "common_bracket": common_floor,
            "star_coefficient": star_coefficient_floor,
            "wedge_quadratic_coefficient": wedge_quadratic_floor,
        },
        "strong_parent_cone": strong,
        "strong_parent_cone_before_common": strong_before_common,
        "strong_parent_cone_numerator": strong_numerator,
        "strong_parent_cone_denominator": strong_denominator,
        "xu_curvature": xu_curvature,
        "xv_curvature": xv_curvature,
        "wedge_quadratic_coefficient": wedge_quadratic_coefficient,
        "strong_endpoint_cone": strong_endpoint,
        "degree_excess_wedge_cap": degree_excess_wedge_cap,
        "degree_remainder": degree_remainder,
        "edgeless": edgeless,
        "one_edge": one_edge,
        "one_edge_shifted_coefficients": one_edge_shifted_coefficients,
        "parent_cone_variables": variables,
        "parent_cone_term_count": len(
            sp.Poly(sp.expand(strong_numerator), *sorted(strong_numerator.free_symbols, key=str)).terms()
        ),
        "unused_exact_derivative_brackets": {
            "common": common_bracket,
        },
    }


def main() -> None:
    data = derive()
    report = {
        "marker": MARKER,
        "identity": "R_ord(C,Q)=N4(D)+F(C,Q), D=C-xQ, Q=G-N[p]",
        "raw_F_term_count": len(sp.Poly(
            data["raw_F"], *sorted(data["raw_F"].free_symbols, key=str)
        ).terms()),
        "high_motif_coefficients": {
            str(variable): str(sp.factor(value))
            for variable, value in data["high_coefficients"].items()
        },
        "high_motif_payment": {
            "orders": "n>=14",
            "weak_discard_incidence": (
                "Weighted connected-three containment pays every connected-four tree. "
                "Leaf counts <=3 are immediate; for a four-leaf star at most one mark "
                "is the center, so 4a+min(b,c)>=(5n-11)(n-4)."
            ),
            "weak_discard_diagnostic": {
                "star_floor": str(data["star_floor"]),
                "star_u_remainder": str(data["star_u_remainder"]),
                "star_v_remainder": str(data["star_v_remainder"]),
                "scope_guard": (
                    "Valid for discarding the full high layer, but too weak to prove "
                    "the resulting parent cone; it is not the live reduction."
                ),
            },
            "sharp_star_nonstar_split": {
                "proof": (
                    "Internal-edge deletions inject every nonstar R4 motif into Q35; "
                    "S4<=((n-4)/4)S3; and S3(G-u)>=S3(G)-C(du,3)-C(xu,2), "
                    "with the analogous v inequality."
                ),
                "S3_coefficient": str(data["sharp_star_coefficient"]),
                "S3_coefficient_floor": str(data["sharp_star_coefficient_floor"]),
                "S3_coefficient_remainder": str(
                    data["sharp_star_coefficient_remainder"]
                ),
                "smooth_star_moment_floor": str(data["star_moment_floor"]),
                "smooth_star_moment_proof": (
                    "For y_w=max(deg(w)-1,0), R=sum y_w<=e-1. Cauchy gives "
                    "S3>=2W(W-R)/(3R), decreasing in R; R=0 is immediate."
                ),
                "u_deletion_debt": str(data["star_deletion_u"]),
                "v_deletion_debt": str(data["star_deletion_v"]),
                "retained_reserve": str(data["star_reserve"]),
            },
        },
        "q_reduction": {
            "wedge": (
                "If |Q|>=3 its coefficient is at least 2+adjacent; if |Q|<=2 then "
                "Q has zero wedges."
            ),
            "neighbor_excess": (
                "Both coefficients are negative for n>=6; use the exact forest caps "
                "Qxu<=Qe-Qdu and Qxv<=Qe-Qdv."
            ),
            "coefficients": {
                key: str(value) for key, value in data["q_coefficients"].items()
            },
        },
        "C_reductions_n_ge_14": {
            "C_common_neighbor": "coefficient negative; replace by upper bound 1",
            "C_neighbor_excess_u_v": (
                "The retained reserve is separately concave in xu,xv; minimize on "
                "the four endpoints xu in {0,e-du}, xv in {0,e-dv}."
            ),
            "C_wedges_E": (
                "The retained numerator is convex quadratic in W; an exact valid "
                "W interval/Bernstein certificate remains to be assembled."
            ),
            "sign_floors": {
                key: str(value) for key, value in data["sign_floors"].items()
            },
            "xu_curvature": str(data["xu_curvature"]),
            "xv_curvature": str(data["xv_curvature"]),
            "W_quadratic_coefficient": str(data["wedge_quadratic_coefficient"]),
        },
        "degree_excess_cone": {
            "remainder": str(data["degree_remainder"]),
            "wedge_cap": str(data["degree_excess_wedge_cap"]),
            "edgeless_branch": str(data["edgeless"]),
            "one_edge_branches_up_to_u_v_symmetry": {
                key: str(value) for key, value in data["one_edge"].items()
            },
            "one_edge_shift_n_minus_14_power_coefficients": {
                key: [str(coefficient) for coefficient in coefficients]
                for key, coefficients in data["one_edge_shifted_coefficients"].items()
            },
        },
        "strong_parent_cone": str(data["strong_parent_cone"]),
        "strong_parent_cone_numerator": str(data["strong_parent_cone_numerator"]),
        "strong_parent_cone_denominator": str(data["strong_parent_cone_denominator"]),
        "strong_endpoint_cone": str(data["strong_endpoint_cone"]),
        "parent_cone_variables": [str(variable) for variable in data["parent_cone_variables"]],
        "parent_cone_term_count": data["parent_cone_term_count"],
        "status": (
            "Exact strengthened all-order reduction for n>=14. The e=0 and e=1 "
            "branches are positive. Positivity of the displayed four-endpoint/W "
            "parent cone for e>=2 and finite orders n<=13 remain open in this artifact."
        ),
        "scope": (
            "Singleton-ordinary rank-five g1 payment only, for p distinct from u,v. "
            "This is not a sign theorem for the final cone, other canonical modes, all N5, "
            "or Erdos Problem 993. No Wronskian sign is assumed."
        ),
        "dependencies": {
            "derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein.py": sha256(
                HERE / "derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein.py"
            ),
            "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py": sha256(
                HERE / "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "raw_F_term_count": report["raw_F_term_count"],
        "parent_cone_term_count": report["parent_cone_term_count"],
        "parent_cone_variables": report["parent_cone_variables"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
