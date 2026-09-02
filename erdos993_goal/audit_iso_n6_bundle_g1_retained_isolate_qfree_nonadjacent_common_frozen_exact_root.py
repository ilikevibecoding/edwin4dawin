#!/usr/bin/env python3
"""Lazy exact replay for the enhanced nonadjacent retained-isolate cone."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp

import search_iso_n6_bundle_g1_retained_isolate_qfree_mark_cross_edge_lifted_ipm_root as base
import search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_root as enhanced


HERE = Path(__file__).resolve().parent
TARGET_INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
SEARCH_INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_search_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_exact_audit_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_NONADJACENT_COMMON_FROZEN_ROOT"
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
    if list(map(str, variables)) != branch["variables"]:
        raise RuntimeError(("variable mismatch", list(map(str, variables)), branch["variables"]))

    base.frozen_cells = enhanced.enhanced_frozen_cells
    linear, quadratic, cubic, quartic, frozen, equalities = base.build_constraints(
        LABEL, target, variables, generators_only=True
    )
    groups = {
        "linear": dict(linear), "quadratic": dict(quadratic),
        "cubic": dict(cubic), "quartic": dict(quartic),
        "frozen": dict(frozen), "equality": dict(equalities),
    }

    def multiplier(text: str) -> sp.Expr:
        powers = tuple(map(int, text.split(",")))
        if len(powers) != len(variables):
            raise RuntimeError(("bad multiplier", text))
        value = sp.Integer(1)
        for variable, power in zip(variables, powers):
            value *= variable**power
        return value

    def generator(token: str) -> sp.Expr:
        if ":" not in token:
            return groups["linear"][token]
        family, name = token.split(":", 1)
        return groups[family][name]

    def atom_expression(name: str) -> sp.Expr:
        for family in ("linear", "quadratic", "cubic", "frozen"):
            prefix = family + ":"
            if name.startswith(prefix):
                core, powers = name[len(prefix):].rsplit("*", 1)
                return groups[family][core] * multiplier(powers)
        if name.startswith("quartic:"):
            return groups["quartic"][name[len("quartic:"):]]
        if name.startswith("product:"):
            left, right = name[len("product:"):].split("*", 1)
            return groups["linear"][left] * groups["linear"][right]
        if name.startswith("equality:"):
            signed, powers = name[len("equality:"):].rsplit("*", 1)
            sign = 1 if signed[0] == "+" else -1
            return sign * groups["equality"][signed[1:]] * multiplier(powers)
        if name.startswith("mixed:"):
            value = sp.Integer(1)
            for factor in name[len("mixed:"):].split("*"):
                value *= generator(factor)
            return value
        raise RuntimeError(f"unrecognized atom {name}")

    residual = {
        powers: sp.Rational(coefficient)
        for powers, coefficient in sp.Poly(target, *variables).terms()
    }
    selected = []
    atom_hashes = {}
    for name, _float_value, fraction_text in branch["positive_atoms"]:
        if name.startswith("monomial:"):
            continue
        coefficient = rational(fraction_text)
        if coefficient < 0:
            raise RuntimeError(f"negative reconstructed weight for {name}")
        if coefficient == 0:
            continue
        expression = sp.expand(atom_expression(name))
        selected.append((name, str(coefficient)))
        atom_hashes[name] = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        for powers, atom_coefficient in sp.Poly(expression, *variables).terms():
            residual[powers] = sp.expand(
                residual.get(powers, sp.Integer(0)) - coefficient * atom_coefficient
            )

    residual = {powers: value for powers, value in residual.items() if value != 0}
    negative_residual = [(powers, str(value)) for powers, value in residual.items() if value < 0]
    remainder = [
        {"powers": list(powers), "coefficient": str(value)}
        for powers, value in sorted(residual.items(), reverse=True)
    ]
    passed = not negative_residual
    marker = MARKER if passed else "FAIL_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_NONADJACENT_COMMON_FROZEN_ROOT"
    report = {
        "marker": marker,
        "branch": LABEL,
        "variables": list(map(str, variables)),
        "selected_nonmonomial_atoms": selected,
        "selected_nonmonomial_atom_sha256": atom_hashes,
        "selected_nonmonomial_atom_count": len(selected),
        "coefficientwise_nonnegative_remainder": passed,
        "remainder": remainder,
        "remainder_term_count": len(remainder),
        "negative_remainder": negative_residual,
        "identity": (
            "target = sum(nonnegative rational weight * theorem-valid atom) "
            "+ coefficientwise nonnegative monomial remainder"
        ),
        "scope_guard": (
            "A PASS proves the nonadjacent zero-retention q-free lower. The independent "
            "q-free reduction is still needed to lift it to the nonadjacent retained-isolate "
            "family; the adjacent target and the other coupled leaf families remain separate."
        ),
        "target_input_sha256": target_hash,
        "search_input_sha256": search_hash,
        "search_source_sha256": search_report["source_sha256"],
        "common_frozen_source_sha256": sha256(
            HERE / "derive_iso_n6_bundle_g1_nonadjacent_common_frozen_cells_root.py"
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "selected_nonmonomial_atom_count": len(selected),
        "remainder_term_count": len(remainder),
        "negative_remainder_count": len(negative_residual),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
