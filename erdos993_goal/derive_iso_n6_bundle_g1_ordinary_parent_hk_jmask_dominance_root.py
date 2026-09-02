#!/usr/bin/env python3
"""Freeze J-mark-mask dominance in the ordinary-parent H--K lowers."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_exact_root_20260901.json"
EXPECTED_INPUT_SHA256 = "22F1F54F597B2CBA68CD24BC547D1C36075B2BE73DCC0416699CEADEF4E02CDF"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_JMASK_DOMINANCE_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_hash(expression: sp.Expr) -> str:
    return hashlib.sha256(sp.sstr(sp.expand(expression)).encode()).hexdigest().upper()


def summary(expression: sp.Expr) -> dict:
    expression = sp.expand(expression)
    if expression == 0:
        return {"terms": 0, "minimum_scalar_coefficient": "0", "all_nonnegative": True}
    coefficients = [sp.Rational(value) for _, value in sp.Poly(expression).terms()]
    return {
        "terms": len(coefficients),
        "minimum_scalar_coefficient": str(min(coefficients)),
        "all_nonnegative": all(value >= 0 for value in coefficients),
    }


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash drift: {input_hash}")
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    branches = payload["branches"]
    classes = payload["classes"]

    def expression(label):
        digest = branches[label]["class_sha256"]
        return sp.expand(sp.sympify(classes[digest]["lower_expression"]))

    families = {}
    remaining_labels = []
    remaining_hashes = set()
    for geometry in ("adjacent", "nonadjacent"):
        for epsilon, eta, ku, kv in itertools.product((0, 1), repeat=4):
            prefix = f"{geometry}_e{epsilon}_t{eta}_k{ku}{kv}"
            labels = {mask: f"{prefix}_j{mask}" for mask in ("00", "01", "10", "11")}
            values = {mask: expression(label) for mask, label in labels.items()}
            du = sp.expand(values["10"] - values["00"])
            dv = sp.expand(values["01"] - values["00"])
            both = sp.expand(values["11"] - values["00"])
            checks = {
                "u_increment_nonnegative_coefficients": summary(du)["all_nonnegative"],
                "v_increment_nonnegative_coefficients": summary(dv)["all_nonnegative"],
                "both_increment_is_sum": sp.expand(both - du - dv) == 0,
            }
            if not all(checks.values()):
                raise RuntimeError((prefix, checks))
            families[prefix] = {
                "labels": labels,
                "core_class_sha256": branches[labels["00"]]["class_sha256"],
                "u_increment": sp.sstr(du),
                "u_increment_sha256": expression_hash(du),
                "u_increment_summary": summary(du),
                "v_increment": sp.sstr(dv),
                "v_increment_sha256": expression_hash(dv),
                "v_increment_summary": summary(dv),
                "checks": checks,
            }
            remaining_labels.append(labels["00"])
            remaining_hashes.add(branches[labels["00"]]["class_sha256"])

    report = {
        "marker": MARKER,
        "input_sha256": input_hash,
        "source_sha256": sha256(Path(__file__).resolve()),
        "checks": {
            "all_32_families_pass": all(all(row["checks"].values()) for row in families.values()),
            "56_classes_reduce_to_24_sign_cores": len(remaining_hashes) == 24,
        },
        "family_count": len(families),
        "families": families,
        "remaining_core_labels": remaining_labels,
        "remaining_unique_class_sha256": sorted(remaining_hashes),
        "remaining_unique_class_count": len(remaining_hashes),
        "scope_guard": (
            "This proves all-order dominance among J mark masks.  It does not "
            "prove the 24 remaining H--K core signs."
        ),
    }
    if not all(report["checks"].values()):
        raise RuntimeError(report["checks"])
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report["checks"], indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
