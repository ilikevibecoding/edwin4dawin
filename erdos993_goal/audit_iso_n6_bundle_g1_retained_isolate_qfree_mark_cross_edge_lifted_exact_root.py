#!/usr/bin/env python3
"""Rationalize and exactly replay a lifted retained-isolate LP certificate."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp

import search_iso_n6_bundle_g1_retained_isolate_qfree_mark_cross_edge_lifted_root as search


HERE = Path(__file__).resolve().parent
TARGET_INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
SEARCH_INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_mark_cross_edge_lifted_product_search_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_mark_cross_edge_lifted_exact_audit_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_MARK_CROSS_EDGE_LIFTED_ROOT"
EXPECTED_TARGET_SHA256 = "239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE"
LABEL = "nonadjacent_u0_v0"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rational(text: str) -> sp.Rational:
    value = Fraction(text)
    return sp.Rational(value.numerator, value.denominator)


def main() -> None:
    target_hash = sha256(TARGET_INPUT)
    if target_hash != EXPECTED_TARGET_SHA256:
        raise RuntimeError(f"target input hash mismatch: {target_hash}")
    search_hash = sha256(SEARCH_INPUT)
    search_report = json.loads(SEARCH_INPUT.read_text(encoding="utf-8"))
    branch = search_report["branches"][LABEL]
    if not branch["success"]:
        raise RuntimeError("search report is not a feasible candidate")

    target_report = json.loads(TARGET_INPUT.read_text(encoding="utf-8"))
    n, s = sp.Symbol("n"), sp.Symbol("s", nonnegative=True)
    target = sp.expand(
        sp.sympify(target_report["branches"][LABEL]["lower_expression"]).subs(n, s + 8)
    )
    variables = tuple(sorted(
        target.free_symbols | {sp.Symbol("HX", integer=True, nonnegative=True)},
        key=str,
    ))
    built = search.build_constraints(LABEL, target, variables)
    atoms = built[-1]
    atom_map = {}
    duplicates = []
    for name, polynomial in atoms:
        if name in atom_map:
            duplicates.append(name)
        atom_map[name] = polynomial
    if duplicates:
        raise RuntimeError(f"duplicate atom names: {duplicates[:10]}")

    residual = {
        powers: sp.Rational(coefficient)
        for powers, coefficient in sp.Poly(target, *variables).terms()
    }
    selected = []
    missing_atoms = []
    for name, _float_value, fraction_text in branch["positive_atoms"]:
        if name.startswith("monomial:"):
            continue
        if name not in atom_map:
            missing_atoms.append(name)
            continue
        coefficient = rational(fraction_text)
        if coefficient < 0:
            raise RuntimeError(f"negative reconstructed weight for {name}")
        if coefficient == 0:
            continue
        selected.append((name, str(coefficient)))
        for powers, atom_coefficient in atom_map[name].terms():
            residual[powers] = sp.expand(
                residual.get(powers, sp.Integer(0)) - coefficient * atom_coefficient
            )
    if missing_atoms:
        raise RuntimeError(f"missing atoms: {missing_atoms[:10]}")
    residual = {powers: value for powers, value in residual.items() if value != 0}
    negative_residual = [
        (powers, str(value)) for powers, value in residual.items() if value < 0
    ]
    remainder = [
        {"powers": list(powers), "coefficient": str(value)}
        for powers, value in sorted(residual.items(), reverse=True)
    ]
    passed = not negative_residual
    marker = MARKER if passed else "FAIL_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_MARK_CROSS_EDGE_LIFTED_ROOT"
    report = {
        "marker": marker,
        "branch": LABEL,
        "variables": list(map(str, variables)),
        "selected_nonmonomial_atoms": selected,
        "selected_nonmonomial_atom_count": len(selected),
        "coefficientwise_nonnegative_remainder": passed,
        "remainder": remainder,
        "remainder_term_count": len(remainder),
        "negative_remainder": negative_residual,
        "identity": (
            "target = sum(reconstructed nonnegative rational weight * valid atom) "
            "+ coefficientwise nonnegative monomial remainder"
        ),
        "scope_guard": (
            "A PASS marker proves only the nonadjacent zero-retention q-free lower. "
            "It does not prove the adjacent target or the other coupled leaf families."
        ),
        "target_input_sha256": target_hash,
        "search_input_sha256": search_hash,
        "search_source_sha256": search_report["source_sha256"],
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "selected_nonmonomial_atom_count": len(selected),
        "remainder_term_count": len(remainder),
        "negative_remainder_count": len(negative_residual),
        "minimum_negative_remainder": min(
            (sp.Rational(value) for _, value in negative_residual), default=None
        ),
    }, default=str, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
