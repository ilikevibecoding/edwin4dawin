#!/usr/bin/env python3
"""Independent replay of marked-parent mark-mask dominance.

This script does not import the producer.  It reconstructs each difference
directly from the full pair report and compares it with the frozen dominance
certificate coefficient by coefficient.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PAIR = HERE / "iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json"
CERTIFICATE = HERE / "iso_n6_bundle_g1_marked_parent_pair_mask_dominance_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_audit_root_20260901.json"
EXPECTED_PAIR_SHA256 = "715750BD2652F77277C79303296972A383FF08AE288CF34A1A70A9D6E5066B5F"
EXPECTED_CERTIFICATE_SHA256 = "C6A4BE2F13B3D2DED11AAFA753F44CB717BB709AF530518583A1CF1454E56602"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_MASK_DOMINANCE_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_terms(expression: sp.Expr) -> dict[str, str]:
    symbols = tuple(sorted(expression.free_symbols, key=str))
    return {
        ",".join(map(str, powers)): str(sp.Rational(coefficient))
        for powers, coefficient in sp.Poly(sp.expand(expression), *symbols).terms()
        if coefficient != 0
    }


def main() -> None:
    pair_hash = sha256(PAIR)
    certificate_hash = sha256(CERTIFICATE)
    if pair_hash != EXPECTED_PAIR_SHA256:
        raise RuntimeError(f"pair hash drift: {pair_hash}")
    if certificate_hash != EXPECTED_CERTIFICATE_SHA256:
        raise RuntimeError(f"certificate hash drift: {certificate_hash}")
    pair = json.loads(PAIR.read_text(encoding="utf-8"))
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    branches = pair["branches"]
    audits = {}
    for geometry in ("adjacent", "nonadjacent"):
        core = sp.expand(sp.sympify(branches[f"{geometry}_t1_u0_v0"]["lower_expression"]))
        one_u = sp.expand(sp.sympify(branches[f"{geometry}_t1_u1_v0"]["lower_expression"]))
        one_v = sp.expand(sp.sympify(branches[f"{geometry}_t1_u0_v1"]["lower_expression"]))
        two = sp.expand(sp.sympify(branches[f"{geometry}_t1_u1_v1"]["lower_expression"]))
        reported = sp.expand(sp.sympify(certificate["geometries"][geometry]["one_mark_increment"]))
        difference_u = sp.expand(one_u - core)
        difference_v = sp.expand(one_v - core)
        difference_two = sp.expand(two - core)
        terms = canonical_terms(reported)
        coefficients = [sp.Rational(value) for value in terms.values()]
        checks = {
            "reported_increment_matches_u": canonical_terms(difference_u) == terms,
            "reported_increment_matches_v": canonical_terms(difference_v) == terms,
            "two_increment_matches_twice_reported": canonical_terms(difference_two) == canonical_terms(2 * reported),
            "all_reported_coefficients_strictly_positive": bool(coefficients) and all(value > 0 for value in coefficients),
            "all_reported_monomials_have_nonnegative_exponents": all(
                all(int(power) >= 0 for power in key.split(",")) for key in terms
            ),
        }
        if not all(checks.values()):
            raise RuntimeError(f"independent audit failed for {geometry}: {checks}")
        audits[geometry] = {"checks": checks, "terms": len(terms)}

    overall = {
        "both_geometries_pass": all(all(value["checks"].values()) for value in audits.values()),
        "remaining_sign_cores_match": certificate["remaining_sign_cores"] == [
            "adjacent_t0_u0_v0",
            "adjacent_t1_u0_v0",
            "nonadjacent_t0_u0_v0",
            "nonadjacent_t1_u0_v0",
        ],
    }
    if not all(overall.values()):
        raise RuntimeError(f"overall audit failed: {overall}")
    report = {
        "marker": MARKER,
        "pair_sha256": pair_hash,
        "certificate_sha256": certificate_hash,
        "source_sha256": sha256(Path(__file__).resolve()),
        "checks": overall,
        "geometries": audits,
        "scope_guard": (
            "This independently replays mask dominance only; the four core "
            "all-order signs remain separate obligations."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(overall, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
