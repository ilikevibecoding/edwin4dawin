#!/usr/bin/env python3
"""Finite universal order cutoff for common0/sum0 rank-seven G1 ordinary parents."""

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
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_ordinary_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_ORDINARY_FINITE_ORDER_CUTOFF_RANK7_G4_PIECEWISE"
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
    T = {rank: sp.Symbol(f"T{rank}") for rank in range(9)}
    W[0] = sp.Integer(1)
    W[1] = m
    D = {rank: W[rank]-T[rank] for rank in range(9)}
    ordinary = substitute_rows(
        generic, two_isolated_mark_rows(W), two_isolated_mark_rows(D)
    )
    base = sp.sympify(
        upstream["literal_reduced_expression"],
        locals={f"W{rank}": W[rank] for rank in range(3, 9)},
    )
    correction = sp.factor(ordinary-base)
    expected_correction = (
        -8*T[3]*W[3]-8*T[3]*W[4]+34*T[3]*W[5]
        +34*T[3]*W[6]+8*T[3]*W[7]-8*T[4]*W[3]
        -68*T[4]*W[4]-26*T[4]*W[5]+2*T[4]*W[6]
        +34*T[5]*W[3]-26*T[5]*W[4]-12*T[5]*W[5]
        +34*T[6]*W[3]+2*T[6]*W[4]+8*T[7]*W[3]
    )
    assert sp.expand(correction-expected_correction) == 0
    assert not (correction.free_symbols & {T[0], T[1], T[2], T[8]})

    # T_k counts independent k-sets containing p, hence
    # 0<=T_k<=C(m-1,k-1)<=m^(k-1)/(k-1)!; also W_j<=m^j/j!.
    variables = tuple(T[k] for k in range(3, 8))+tuple(W[k] for k in range(3, 9))
    ordinary_correction_constant = sp.Integer(0)
    correction_terms = []
    for powers, coefficient in sp.Poly(correction, *variables).terms():
        t_indices = [
            offset+3 for offset, power in enumerate(powers[:5]) if power
        ]
        w_indices = [
            offset+3 for offset, power in enumerate(powers[5:]) if power
        ]
        assert len(t_indices) == len(w_indices) == 1
        k, j = t_indices[0], w_indices[0]
        assert (k-1)+j <= 9
        bound = sp.Rational(1, sp.factorial(k-1)*sp.factorial(j))
        ordinary_correction_constant += abs(coefficient)*bound
        correction_terms.append({
            "T_rank": k,
            "W_rank": j,
            "coefficient": str(coefficient),
            "m9_bound_coefficient": str(abs(coefficient)*bound),
        })
    ordinary_correction_constant = sp.factor(ordinary_correction_constant)
    assert ordinary_correction_constant == sp.Rational(1952, 945)

    leading_margin = sp.Rational(1, 4725)
    no_parent_error = sp.Rational(976061573, 11200)
    assert upstream["leading_certificate"]["uniform_leading_margin"] == str(
        leading_margin
    )
    assert upstream["error_budget"]["total_m9_coefficient"] == str(
        no_parent_error
    )
    total_error = sp.factor(no_parent_error+ordinary_correction_constant)
    assert total_error == sp.Rational(26354287111, 302400)
    cutoff = int(sp.ceiling(total_error/leading_margin))
    assert cutoff == 411785737
    cutoff_slack = sp.factor(cutoff*leading_margin-total_error)
    assert cutoff_slack == sp.Rational(19, 100800)

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest W of order m>=411785737 and every ordinary "
            "vertex p in W, if C is obtained by adjoining two isolated marked "
            "vertices and D=C-p, then rank-seven bundle G1 is nonnegative."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "mode": "ordinary_parent",
        "ordinary_parent_scope": "every p in W, isolated or non-isolated",
        "cutoff": {
            "unmarked_order_m_at_least": cutoff,
            "total_order_n_at_least": cutoff+2,
            "cutoff_slack": str(cutoff_slack),
            "optimization_note": "The explicit cutoff is safe, not optimized.",
        },
        "literal_ordinary_expression": str(ordinary),
        "literal_no_parent_plus_correction": {
            "no_parent": str(base),
            "correction": str(correction),
        },
        "containing_parent_bound": (
            "0<=T_k<=C(m-1,k-1)<=m^(k-1)/(k-1)!"
        ),
        "correction_terms": correction_terms,
        "error_budget": {
            "no_parent_total_m9_coefficient": str(no_parent_error),
            "ordinary_correction_m9_coefficient": str(
                ordinary_correction_constant
            ),
            "total_m9_coefficient": str(total_error),
            "uniform_leading_margin": str(leading_margin),
            "final_lower_bound": (
                "G1>=m^9*((1/4725)m-26354287111/302400)"
            ),
        },
        "coverage_gap_within_cutoff_scope": None,
        "finite_residual": f"Forests with unmarked order m<{cutoff}",
        "scope": (
            "Rank-seven G1 only, common0/sum0, ordinary-parent mode. This is "
            "a universal finite order cutoff; the finite residual below the "
            "cutoff remains open outside separately pinned regions."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "unmarked_order_cutoff": cutoff,
        "ordinary_parent_scope": report["ordinary_parent_scope"],
        "uniform_leading_margin": str(leading_margin),
        "ordinary_correction_constant": str(ordinary_correction_constant),
        "total_error_constant": str(total_error),
        "cutoff_slack": str(cutoff_slack),
        "coverage_gap_within_cutoff_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
