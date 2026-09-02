#!/usr/bin/env python3
"""Finite universal order cutoff for common0/sum0 rank-seven G1 endpoints."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients
from prove_iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_rank7_g4_piecewise import (
    two_isolated_mark_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_endpoint_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_ENDPOINT_FINITE_ORDER_CUTOFF_RANK7_G4_PIECEWISE"
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "no_parent_cutoff_source": "prove_iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_rank7_g4_piecewise.py",
    "no_parent_cutoff_report": "iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "no_parent_cutoff_source": "DB751F95D1CC016869C219355446C057A107EA070CCA1BCAC431F019FDFC2C4E",
    "no_parent_cutoff_report": "01175F2ED7439C79E08F06D3A7457131E8755EE132DB1303AF2AA729CCCEF05F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def one_mark_rows(core, missing):
    def at(rank):
        return core.get(rank, sp.Integer(0))
    with_mark = {rank: at(rank)+at(rank-1) for rank in range(9)}
    without = {rank: at(rank) for rank in range(9)}
    if missing == "u":
        return {"E": with_mark, "U": with_mark, "V": without, "W": without}
    if missing == "v":
        return {"E": with_mark, "U": without, "V": with_mark, "W": without}
    raise AssertionError(missing)


def substitute_rows(expression, crows, drows):
    substitutions = {
        sp.Symbol(f"{prefix}{family}{rank}"): rows[family][rank]
        for prefix, rows in (("c", crows), ("d", drows))
        for family in "EUVW" for rank in range(9)
    }
    return sp.factor(expression.subs(substitutions, simultaneous=True))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    upstream = json.loads(
        (HERE/FILES["no_parent_cutoff_report"]).read_text(encoding="utf-8")
    )
    assert upstream["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_NO_PARENT_FINITE_ORDER_CUTOFF_RANK7_G4_PIECEWISE"
    )
    assert upstream["coverage_gap_within_cutoff_scope"] is None

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    m = sp.Symbol("m", positive=True)
    W = {rank: sp.Symbol(f"W{rank}") for rank in range(9)}
    W[0] = sp.Integer(1)
    W[1] = m
    crows = two_isolated_mark_rows(W)
    endpoint_u = substitute_rows(generic, crows, one_mark_rows(W, "u"))
    endpoint_v = substitute_rows(generic, crows, one_mark_rows(W, "v"))
    assert sp.expand(endpoint_u-endpoint_v) == 0
    reduced = endpoint_u
    expected_reduced = (
        4*W[3]**2+20*W[3]*W[4]-30*W[3]*W[5]-90*W[3]*W[6]
        -51*W[3]*W[7]-8*W[3]*W[8]+50*W[4]**2+78*W[4]*W[5]
        -12*W[4]*W[6]-10*W[4]*W[7]+39*W[5]**2+10*W[5]*W[6]
    )
    assert sp.expand(reduced-expected_reduced) == 0

    # The exact star-cluster approximation and its row errors are independent
    # of the G1 parent mode and are pinned from the no-parent cutoff theorem.
    row_error = {
        3: sp.Rational(7, 3),
        4: sp.Rational(209, 24),
        5: sp.Rational(713, 40),
        6: sp.Rational(10777, 360),
        7: sp.Rational(3953, 84),
        8: sp.Rational(2888171, 40320),
    }
    assert upstream["cluster_remainder_certificate"]["row_error_constants"] == {
        str(k): str(value) for k, value in row_error.items()
    }
    rho = sp.Symbol("rho", nonnegative=True)
    sigma = {
        q: sp.Symbol(f"sigma{q}", nonnegative=True) for q in range(2, 8)
    }
    b = {}
    b_bound = {}
    row_size_bound = {}
    retained = {}
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
        retained[k] = m**k/sp.factorial(k)+b[k]*m**(k-1)
    retained_value = sp.expand(reduced.subs(
        {W[k]: retained[k] for k in range(3, 9)}, simultaneous=True
    ))
    polynomial = sp.Poly(retained_value, m)
    assert polynomial.degree() == 10
    leading = sp.factor(polynomial.coeff_monomial(m**10))
    leading_expected = (
        sp.Rational(209, 302400)+sp.Rational(11, 15120)*rho
        -sp.Rational(11, 1120)*sigma[2]+sp.Rational(1, 14)*sigma[3]
        -sp.Rational(1, 3)*sigma[4]+sigma[5]
        -sp.Rational(7, 4)*sigma[6]+sp.Rational(4, 3)*sigma[7]
    )
    assert sp.expand(leading-leading_expected) == 0
    assert str(leading) == upstream["leading_certificate"]["leading_expression"]

    variables = tuple(W[k] for k in range(3, 9))
    terms = []
    for powers, coefficient in sp.Poly(reduced, *variables).terms():
        indices = []
        for offset, power in enumerate(powers):
            indices.extend([offset+3]*power)
        assert len(indices) == 2
        terms.append((indices[0], indices[1], coefficient))
    lower_order = sp.Integer(0)
    perturbation = sp.Integer(0)
    for i, j, coefficient in terms:
        total = i+j
        if total <= 9:
            lower_order += abs(coefficient)*row_size_bound[i]*row_size_bound[j]
        elif total == 10:
            lower_order += abs(coefficient)*(
                b_bound[j]/sp.factorial(i)+b_bound[i]/sp.factorial(j)
                +b_bound[i]*b_bound[j]
            )
        elif total == 11:
            lower_order += abs(coefficient)*b_bound[i]*b_bound[j]
        else:
            raise AssertionError(total)
        perturbation += abs(coefficient)*(
            row_error[i]*row_size_bound[j]+row_size_bound[i]*row_error[j]
            +row_error[i]*row_error[j]
        )
    lower_order = sp.factor(lower_order)
    perturbation = sp.factor(perturbation)
    assert lower_order == sp.Rational(129118, 315)
    assert perturbation == sp.Rational(3834942781, 50400)

    leading_margin = sp.Rational(1, 4725)
    kappa = sp.Rational(29, 60480)
    star_correction = sp.Rational(26951, 3024)
    assert upstream["leading_certificate"]["uniform_leading_margin"] == str(
        leading_margin
    )
    assert upstream["error_budget"]["star_falling_correction"] == str(
        star_correction
    )
    total_error = sp.factor(
        37*kappa+star_correction+lower_order+perturbation
    )
    assert total_error == sp.Rational(2570701159, 33600)
    cutoff = int(sp.ceiling(total_error/leading_margin))
    assert cutoff == 361504851
    cutoff_slack = sp.factor(cutoff*leading_margin-total_error)
    assert cutoff_slack == sp.Rational(11, 100800)

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest W of order m>=361504851, if C is obtained by "
            "adjoining two isolated marked vertices and D is obtained by "
            "deleting either marked endpoint, then rank-seven bundle G1 is "
            "nonnegative."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "modes": ["endpoint_u", "endpoint_v"],
        "endpoint_symmetry_checked": True,
        "cutoff": {
            "unmarked_order_m_at_least": cutoff,
            "total_order_n_at_least": cutoff+2,
            "cutoff_slack": str(cutoff_slack),
            "optimization_note": "The explicit cutoff is safe, not optimized.",
        },
        "literal_reduced_expression": str(reduced),
        "leading_expression": str(leading),
        "leading_certificate_import": {
            "dependency": "no_parent_cutoff_report",
            "uniform_leading_margin": str(leading_margin),
            "reason": "The endpoint and no-parent leading expressions agree exactly.",
        },
        "error_budget": {
            "star_falling_correction": str(star_correction),
            "lower_order_retained_terms": str(lower_order),
            "row_perturbation": str(perturbation),
            "total_m9_coefficient": str(total_error),
            "final_lower_bound": (
                "G1>=m^9*((1/4725)m-2570701159/33600)"
            ),
        },
        "coverage_gap_within_cutoff_scope": None,
        "finite_residual": f"Forests with unmarked order m<{cutoff}",
        "scope": (
            "Rank-seven G1 only, common0/sum0, endpoint-parent modes. This is "
            "a universal finite order cutoff; ordinary parents and the finite "
            "residual below the cutoff remain separate."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "unmarked_order_cutoff": cutoff,
        "endpoint_symmetry_checked": True,
        "uniform_leading_margin": str(leading_margin),
        "total_error_constant": str(total_error),
        "cutoff_slack": str(cutoff_slack),
        "coverage_gap_within_cutoff_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
