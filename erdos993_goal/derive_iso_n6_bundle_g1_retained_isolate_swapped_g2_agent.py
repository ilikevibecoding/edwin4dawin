#!/usr/bin/env python3
"""Exact swapped-G2 identity for retained-isolate rank-six G1 deletion.

For an unmarked isolate ell, write C=(1+x)A.  If ell is retained in the
actual induced minor, D=(1+x)B.  This source proves that the non-frozen
part of the G1 deletion increment is exactly the same swapped-superforest
polarization that occurs in the ordinary-parent Lambda payment.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_swapped_g2_exact_agent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_SWAPPED_G2_AGENT"
PINS = {
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "audit_iso_n6_bundle_g6_g2_transfer_audit.py":
        "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
    "derive_iso_n6_bundle_g1_isolated_and_mark_parent_leaf_increments_agent.py":
        "9BA12AC476425CCF6BB9252DDA58F0CC8E914E6BB2CAE256E0A95DA4CBE6DB4A",
    "iso_n6_bundle_g1_isolated_and_mark_parent_leaf_increments_exact_agent_20260831.json":
        "1C881A5DFABC76D7270D570F38C19D50971CFD800035293A97FBD354AA38FBBC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def zeros():
    return tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")


def summary(expression: sp.Expr) -> dict[str, object]:
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for value in coefficients if value < 0),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(sp.expand(expression)).encode()).hexdigest().upper(),
    }


def span_status(target: sp.Expr, candidates: list[sp.Expr]) -> tuple[str, tuple[int, int]]:
    variables = tuple(sorted(target.free_symbols, key=str))
    target_terms = dict(sp.Poly(target, *variables).terms())
    candidate_terms = [dict(sp.Poly(value, *variables).terms()) for value in candidates]
    monomials = sorted(set(target_terms).union(*(set(row) for row in candidate_terms)))
    matrix = sp.Matrix([[row.get(monomial, 0) for row in candidate_terms] for monomial in monomials])
    rhs = sp.Matrix([target_terms.get(monomial, 0) for monomial in monomials])
    solution = sp.linsolve((matrix, rhs))
    return str(solution), matrix.shape


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINS}
    if actual != PINS:
        raise RuntimeError(("dependency hash mismatch", actual, PINS))

    arows, brows, zero = rows("A"), rows("B"), zeros()
    iarows = isolate_multiply(arows, 1)
    ibrows = isolate_multiply(brows, 1)
    g1, g2 = reconstruct(1), reconstruct(2)

    base = sp.expand(substitute(g1, arows, brows))
    delta_deleted = sp.expand(substitute(g1, iarows, brows) - base)
    delta_retained = sp.expand(substitute(g1, iarows, ibrows) - base)
    r_iso = sp.expand(delta_retained - delta_deleted)

    frozen_g2 = sp.expand(substitute(g2, arows, brows))
    swapped_positive = sp.expand(substitute(g2, brows, iarows))
    swapped_zero = sp.expand(substitute(g2, brows, zero))
    swapped_difference = sp.expand(swapped_positive - swapped_zero)

    checks = {
        "deleted_increment_equals_G2_A_B": sp.expand(delta_deleted - frozen_g2) == 0,
        "R_iso_equals_swapped_G2_difference": sp.expand(r_iso - swapped_difference) == 0,
        "full_increment_master_identity": sp.expand(
            delta_retained - frozen_g2 - swapped_positive + swapped_zero
        ) == 0,
    }
    if not all(checks.values()):
        raise RuntimeError(("identity check failed", checks))

    higher = [sp.expand(substitute(reconstruct(index), arows, brows)) for index in range(2, 11)]
    individual_matches = {
        f"G{index}(A,B)": sp.expand(delta_retained - candidate) == 0
        for index, candidate in zip(range(2, 11), higher)
    }
    span, shape = span_status(delta_retained, higher)
    if any(individual_matches.values()) or span != "EmptySet":
        raise RuntimeError(("unexpected frozen-cell rewrite", individual_matches, span))

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "scope": (
            "Every marked forest A, every actual induced marked minor B, and an unmarked "
            "isolated vertex retained in both C=(1+x)A and D=(1+x)B; adjacent and "
            "nonadjacent marks use the same row identity."
        ),
        "operator_identity": {
            "R_iso_definition": "Delta_retained-Delta_deleted",
            "polarization_form": "R_iso=P6((1+x)A,xB)",
            "swapped_G2_form": "R_iso=G2_6(B,(1+x)A)-G2_6(B,0)",
            "full_increment": (
                "Delta_retained=G2_6(A,B)+G2_6(B,(1+x)A)-G2_6(B,0)"
            ),
            "ordinary_parent_unification": (
                "This is the same P6(C,xJ)=G2_6(J,C)-G2_6(J,0) target as Lambda, "
                "specialized to C=(1+x)A and J=B."
            ),
        },
        "theorem_dependency": {
            "frozen_part": "G2_6(A,B)>=0 is already frozen because B is an actual induced minor of A.",
            "open_shared_part": (
                "Need swapped-superforest monotonicity G2_6(J,C)>=G2_6(J,0) for "
                "J induced in C. Existing G2 positivity does not apply directly because C "
                "is the second, superforest argument."
            ),
            "new_residual_family_needed": False,
        },
        "higher_forward_difference_obstruction": {
            "individual_matches": individual_matches,
            "linear_span_G2_through_G10_A_B": span,
            "coefficient_matrix_shape": list(shape),
            "conclusion": (
                "The full retained increment is not one higher coefficient and is not any "
                "scalar linear combination of the ordinary frozen cells G2,...,G10(A,B)."
            ),
        },
        "summaries": {
            "delta_deleted": summary(delta_deleted),
            "R_iso": summary(r_iso),
            "delta_retained": summary(delta_retained),
            "swapped_G2_positive_cell": summary(swapped_positive),
            "swapped_G2_zero_cell": summary(swapped_zero),
        },
        "checks": checks,
        "status": "exact reduction to frozen G2 plus the existing open swapped-superforest target",
        "scope_guard": (
            "This proves the operator identities only. It does not prove swapped-superforest "
            "monotonicity, retained-isolate positivity, ordinary-parent Lambda, universal "
            "rank-six G1, or Problem 993."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "checks": checks,
        "span": span,
        "status": report["status"],
        "scope_guard": report["scope_guard"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
