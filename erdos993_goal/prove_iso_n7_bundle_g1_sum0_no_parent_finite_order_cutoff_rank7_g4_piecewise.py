#!/usr/bin/env python3
"""A finite universal order cutoff for rank-seven G1, common0/sum0/no-parent.

For a forest W, inclusion-exclusion is split into edge stars and a remainder.
Every connected non-star edge set contains a P4, while every disconnected edge
set has at least two components; consequently both omitted classes are one
full power of |W| below the retained star expansion.  An exact degree-moment
Bernstein bound makes the leading coefficient uniformly positive, and explicit
rational error constants give a finite (deliberately unoptimized) cutoff.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_NO_PARENT_FINITE_ORDER_CUTOFF_RANK7_G4_PIECEWISE"
RECONSTRUCTION_SOURCE = HERE / "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py"
RECONSTRUCTION_SOURCE_SHA256 = "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value-offset for offset in range(rank))/sp.factorial(rank)


def abs_coefficient_sum(expression, variable):
    return sum(
        abs(coefficient)
        for _, coefficient in sp.Poly(sp.expand(expression), variable).terms()
    )


def bernstein_controls(expression, variable, degree):
    polynomial = sp.Poly(sp.expand(expression), variable)
    assert polynomial.degree() <= degree
    return [
        sp.factor(sum(
            polynomial.coeff_monomial(variable**exponent)
            * sp.Rational(
                sp.binomial(index, exponent), sp.binomial(degree, exponent)
            )
            for exponent in range(index+1)
        ))
        for index in range(degree+1)
    ]


def two_isolated_mark_rows(core):
    def at(rank):
        return core.get(rank, sp.Integer(0))
    return {
        "E": {rank: at(rank)+2*at(rank-1)+at(rank-2) for rank in range(9)},
        "U": {rank: at(rank)+at(rank-1) for rank in range(9)},
        "V": {rank: at(rank)+at(rank-1) for rank in range(9)},
        "W": {rank: at(rank) for rank in range(9)},
    }


def substitute_same_rows(expression, rows):
    substitutions = {
        sp.Symbol(f"{prefix}{family}{rank}"): rows[family][rank]
        for prefix in ("c", "d") for family in "EUVW" for rank in range(9)
    }
    return sp.factor(expression.subs(substitutions, simultaneous=True))


def main() -> None:
    assert sha256(RECONSTRUCTION_SOURCE) == RECONSTRUCTION_SOURCE_SHA256
    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]

    m = sp.Symbol("m", positive=True)
    W = {rank: sp.Symbol(f"W{rank}") for rank in range(9)}
    W[0] = sp.Integer(1)
    W[1] = m
    reduced = substitute_same_rows(generic, two_isolated_mark_rows(W))
    expected_reduced = (
        8*W[3]**2+24*W[3]*W[4]-64*W[3]*W[5]-106*W[3]*W[6]
        -51*W[3]*W[7]-8*W[3]*W[8]+80*W[4]**2+90*W[4]*W[5]
        -12*W[4]*W[6]-10*W[4]*W[7]+39*W[5]**2+10*W[5]*W[6]
    )
    assert sp.expand(reduced-expected_reduced) == 0

    # For each k, retain the empty edge set, single edges, and connected q-edge
    # stars.  The first omitted sum counts connected non-stars, and the second
    # counts disconnected edge sets.  Their binomial bounds are O(m^(k-2)).
    row_error_constants = {}
    row_error_parts = {}
    for k in range(3, 9):
        binomial_remainder = sp.expand(
            choose_poly(m, k)-(
                m**k/sp.factorial(k)
                - sp.Rational(k-1, 2*sp.factorial(k-1))*m**(k-1)
            )
        )
        binomial_constant = abs_coefficient_sum(binomial_remainder, m)
        edge_remainder = sp.expand(
            choose_poly(m-2, k-2)-m**(k-2)/sp.factorial(k-2)
        )
        edge_constant = abs_coefficient_sum(edge_remainder, m)
        star_constant = sp.Integer(0)
        for q in range(2, k):
            factor_remainder = sp.expand(
                choose_poly(m-q-1, k-q-1)
                - m**(k-q-1)/sp.factorial(k-q-1)
            )
            # S_q=sum_v C(d_v,q) is at most C(e,q)<=m^q/q!.
            star_constant += (
                abs_coefficient_sum(factor_remainder, m)/sp.factorial(q)
            )
        connected_nonstar_constant = sum(
            sp.Rational(
                1, 2*sp.factorial(q-3)*sp.factorial(k-q-1)
            )
            for q in range(3, k)
        )
        disconnected_constant = sum(
            sp.Rational(
                1, sp.factorial(q)*sp.factorial(k-q-2)
            )
            for q in range(2, k-1)
        )
        row_error_parts[k] = {
            "falling_binomial": binomial_constant,
            "single_edge_factor": edge_constant,
            "star_factor": star_constant,
            "connected_nonstar": connected_nonstar_constant,
            "disconnected": disconnected_constant,
        }
        row_error_constants[k] = sp.factor(sum(row_error_parts[k].values()))
    assert row_error_constants == {
        3: sp.Rational(7, 3),
        4: sp.Rational(209, 24),
        5: sp.Rational(713, 40),
        6: sp.Rational(10777, 360),
        7: sp.Rational(3953, 84),
        8: sp.Rational(2888171, 40320),
    }

    # Normalized retained rows L_k=m^k/k!+b_k*m^(k-1).
    rho = sp.Symbol("rho", nonnegative=True)
    sigma = {
        q: sp.Symbol(f"sigma{q}", nonnegative=True) for q in range(2, 8)
    }
    b = {}
    b_bound = {}
    row_size_bound = {}
    for k in range(3, 9):
        b[k] = sp.expand(
            -sp.Rational(k-1, 2*sp.factorial(k-1))
            -rho/sp.factorial(k-2)
            +sum(
                (-1)**q*sigma[q]/sp.factorial(k-q-1)
                for q in range(2, k)
            )
        )
        b_bound[k] = sp.factor(
            sp.Rational(k-1, 2*sp.factorial(k-1))
            +sp.Rational(1, sp.factorial(k-2))
            +sum(
                sp.Rational(1, sp.factorial(q)*sp.factorial(k-q-1))
                for q in range(2, k)
            )
        )
        row_size_bound[k] = sp.factor(sp.Rational(1, sp.factorial(k))+b_bound[k])
    retained_rows = {
        k: m**k/sp.factorial(k)+b[k]*m**(k-1) for k in range(3, 9)
    }
    retained_value = sp.expand(reduced.subs(
        {W[k]: retained_rows[k] for k in range(3, 9)}, simultaneous=True
    ))
    retained_polynomial = sp.Poly(retained_value, m)
    assert retained_polynomial.degree() == 10
    leading = sp.factor(retained_polynomial.coeff_monomial(m**10))
    leading_coefficients = {
        1: sp.Rational(11, 15120),
        2: -sp.Rational(11, 1120),
        3: sp.Rational(1, 14),
        4: -sp.Rational(1, 3),
        5: sp.Integer(1),
        6: -sp.Rational(7, 4),
        7: sp.Rational(4, 3),
    }
    leading_expected = (
        sp.Rational(209, 302400)+leading_coefficients[1]*rho
        +sum(leading_coefficients[q]*sigma[q] for q in range(2, 8))
    )
    assert sp.expand(leading-leading_expected) == 0

    # Replace falling degree moments sigma_q by power moments of x_v=d_v/m.
    # The exact difference contributes at most star_correction/m.
    degree = sp.Symbol("degree", nonnegative=True)
    star_correction = sp.Integer(0)
    degree_falling_corrections = {}
    for q in range(2, 8):
        falling_remainder = sp.expand(
            choose_poly(degree, q)-degree**q/sp.factorial(q)
        )
        correction = 2*abs_coefficient_sum(falling_remainder, degree)
        degree_falling_corrections[q] = correction
        star_correction += abs(leading_coefficients[q])*correction
    star_correction = sp.factor(star_correction)
    assert star_correction == sp.Rational(26951, 3024)

    x = sp.Symbol("x", nonnegative=True)
    g = sp.factor(
        leading_coefficients[1]*x/2
        +sum(leading_coefficients[q]*x**q/sp.factorial(q) for q in range(2, 8))
    )
    g_expected = x*(
        16*x**6-147*x**5+504*x**4-840*x**3
        +720*x**2-297*x+22
    )/60480
    assert sp.expand(g-g_expected) == 0
    low_controls = bernstein_controls(
        sp.expand((g/x).subs(x, x/20)*60480), x, 6
    )
    assert low_controls == [
        sp.Integer(22), sp.Rational(781, 40), sp.Rational(1717, 100),
        sp.Rational(59719, 4000), sp.Rational(1279921, 100000),
        sp.Rational(68950671, 6400000),
        sp.Rational(141569669, 16000000),
    ]
    assert all(control > 0 for control in low_controls)
    kappa = sp.Rational(29, 60480)
    global_controls = bernstein_controls(sp.expand(g/x+kappa), x, 6)
    assert global_controls == [
        sp.Rational(17, 20160), sp.Rational(1, 40320), sp.Integer(0),
        sp.Rational(1, 13440), sp.Rational(11, 100800),
        sp.Rational(1, 8640), sp.Rational(1, 8640),
    ]
    assert all(control >= 0 for control in global_controls)
    leading_margin = sp.factor(sp.Rational(209, 302400)-kappa)
    assert leading_margin == sp.Rational(1, 4725)

    # Bounds for all retained terms below degree ten.
    variables = tuple(W[k] for k in range(3, 9))
    quadratic_terms = []
    for powers, coefficient in sp.Poly(reduced, *variables).terms():
        indices = []
        for offset, power in enumerate(powers):
            indices.extend([offset+3]*power)
        assert len(indices) == 2
        quadratic_terms.append((indices[0], indices[1], coefficient))
    lower_order_constant = sp.Integer(0)
    row_perturbation_constant = sp.Integer(0)
    for i, j, coefficient in quadratic_terms:
        total_rank = i+j
        if total_rank <= 9:
            lower_order_constant += (
                abs(coefficient)*row_size_bound[i]*row_size_bound[j]
            )
        elif total_rank == 10:
            lower_order_constant += abs(coefficient)*(
                b_bound[j]/sp.factorial(i)
                +b_bound[i]/sp.factorial(j)+b_bound[i]*b_bound[j]
            )
        elif total_rank == 11:
            lower_order_constant += (
                abs(coefficient)*b_bound[i]*b_bound[j]
            )
        else:
            raise AssertionError(total_rank)
        row_perturbation_constant += abs(coefficient)*(
            row_error_constants[i]*row_size_bound[j]
            +row_size_bound[i]*row_error_constants[j]
            +row_error_constants[i]*row_error_constants[j]
        )
    lower_order_constant = sp.factor(lower_order_constant)
    row_perturbation_constant = sp.factor(row_perturbation_constant)
    assert lower_order_constant == sp.Rational(17544619, 30240)
    assert row_perturbation_constant == sp.Rational(3271939477, 37800)

    # Vertices with d_v/m<=1/20 contribute g>=0.  There are at most 39 other
    # vertices.  For their set A, sum_A d_v<=e+e(A)<=m+37, hence their total
    # contribution is at least -kappa*(1+37/m).
    total_error_constant = sp.factor(
        37*kappa+star_correction+lower_order_constant
        +row_perturbation_constant
    )
    assert total_error_constant == sp.Rational(976061573, 11200)
    cutoff = int(sp.ceiling(total_error_constant/leading_margin))
    assert cutoff == 411775977
    cutoff_slack = sp.factor(cutoff*leading_margin-total_error_constant)
    assert cutoff_slack == sp.Rational(19, 100800)

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest W of order m>=411775977, if C is obtained by "
            "adjoining two isolated marked vertices and no parent is deleted "
            "(D=C), then the exact rank-seven bundle coefficient G1 is "
            "nonnegative."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "cutoff": {
            "unmarked_order_m_at_least": cutoff,
            "total_order_n_at_least": cutoff+2,
            "cutoff_slack": str(cutoff_slack),
            "optimization_note": "The explicit cutoff is safe, not optimized.",
        },
        "literal_reduced_expression": str(reduced),
        "leading_certificate": {
            "leading_expression": str(leading),
            "degree_polynomial_g": str(g),
            "low_degree_threshold": "d_v/m<=1/20",
            "low_interval_bernstein_controls": list(map(str, low_controls)),
            "global_linear_floor": f"g(x)>={-kappa}*x",
            "global_floor_bernstein_controls": list(map(str, global_controls)),
            "high_degree_vertex_count_at_most": 39,
            "high_degree_sum_bound": "sum_A d_v<=m+37",
            "uniform_leading_margin": str(leading_margin),
        },
        "cluster_remainder_certificate": {
            "inclusion_exclusion": (
                "i_k(W)=sum_{F subset E(W)} (-1)^|F| "
                "C(m-|V(F)|,k-|V(F)|)"
            ),
            "retained_clusters": "empty set, one edge, and connected q-edge stars",
            "connected_nonstar_bound": (
                "Every connected non-star q-edge subtree contains a P4; a P4 "
                "is determined by its endpoints, so there are at most C(m,2), "
                "then at most C(m,q-3) choices for the remaining edges."
            ),
            "disconnected_bound": (
                "A disconnected q-edge forest has at least q+2 vertices and "
                "there are at most C(m,q) q-edge subsets."
            ),
            "row_error_constants": {
                str(k): str(value) for k, value in row_error_constants.items()
            },
            "degree_falling_corrections": {
                str(k): str(value) for k, value in degree_falling_corrections.items()
            },
        },
        "error_budget": {
            "star_falling_correction": str(star_correction),
            "lower_order_retained_terms": str(lower_order_constant),
            "row_perturbation": str(row_perturbation_constant),
            "total_m9_coefficient": str(total_error_constant),
            "final_lower_bound": (
                "G1>=m^9*((1/4725)m-976061573/11200)"
            ),
        },
        "coverage_gap_within_cutoff_scope": None,
        "finite_residual": f"Forests with unmarked order m<{cutoff}",
        "scope": (
            "Rank-seven G1 only, common0/sum0, no-parent mode. This is a "
            "universal finite order cutoff; endpoint and ordinary parent modes "
            "and the finite residual below the cutoff remain separate."
        ),
        "dependencies_sha256": {
            "reconstruction_source": RECONSTRUCTION_SOURCE_SHA256,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "unmarked_order_cutoff": cutoff,
        "uniform_leading_margin": str(leading_margin),
        "total_error_constant": str(total_error_constant),
        "cutoff_slack": str(cutoff_slack),
        "coverage_gap_within_cutoff_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
