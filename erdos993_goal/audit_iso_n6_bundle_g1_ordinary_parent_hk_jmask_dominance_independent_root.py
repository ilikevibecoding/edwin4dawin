#!/usr/bin/env python3
"""Independent coefficient replay of ordinary-parent J-mask dominance."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
LOWERS = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json"
CERTIFICATE = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_audit_root_20260901.json"
EXPECTED_LOWERS_SHA256 = "22F1F54F597B2CBA68CD24BC547D1C36075B2BE73DCC0416699CEADEF4E02CDF"
EXPECTED_CERTIFICATE_SHA256 = "7B25D57EBEE367C236AA48CB9565877898BA093C27DE68ACB46CA46710D349D6"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_JMASK_DOMINANCE_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient_dictionary(expression: sp.Expr):
    expression = sp.expand(expression)
    if expression == 0:
        return {}
    variables = tuple(sorted(expression.free_symbols, key=str))
    return {
        tuple(power): sp.Rational(coefficient)
        for power, coefficient in sp.Poly(expression, *variables).terms()
        if coefficient != 0
    }


def main() -> None:
    lower_hash = sha256(LOWERS)
    certificate_hash = sha256(CERTIFICATE)
    if lower_hash != EXPECTED_LOWERS_SHA256:
        raise RuntimeError(f"lower hash drift: {lower_hash}")
    if certificate_hash != EXPECTED_CERTIFICATE_SHA256:
        raise RuntimeError(f"certificate hash drift: {certificate_hash}")
    lowers = json.loads(LOWERS.read_text(encoding="utf-8"))
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    branches = lowers["branches"]
    classes = lowers["classes"]

    def expression(label):
        return sp.expand(sp.sympify(classes[branches[label]["class_sha256"]]["lower_expression"]))

    failures = []
    audited = 0
    core_hashes = set()
    for geometry in ("adjacent", "nonadjacent"):
        for epsilon, eta, ku, kv in itertools.product((0, 1), repeat=4):
            prefix = f"{geometry}_e{epsilon}_t{eta}_k{ku}{kv}"
            values = {mask: expression(f"{prefix}_j{mask}") for mask in ("00", "01", "10", "11")}
            du = sp.expand(values["10"] - values["00"])
            dv = sp.expand(values["01"] - values["00"])
            both = sp.expand(values["11"] - values["00"])
            record = certificate["families"][prefix]
            reported_u = sp.expand(sp.sympify(record["u_increment"]))
            reported_v = sp.expand(sp.sympify(record["v_increment"]))
            checks = [
                coefficient_dictionary(du) == coefficient_dictionary(reported_u),
                coefficient_dictionary(dv) == coefficient_dictionary(reported_v),
                coefficient_dictionary(both) == coefficient_dictionary(reported_u + reported_v),
                all(value > 0 for value in coefficient_dictionary(reported_u).values()),
                all(value > 0 for value in coefficient_dictionary(reported_v).values()),
            ]
            if not all(checks):
                failures.append((prefix, checks))
            core_hashes.add(branches[f"{prefix}_j00"]["class_sha256"])
            audited += 1
    checks = {
        "all_32_families_replayed": audited == 32,
        "no_coefficient_failures": not failures,
        "24_unique_core_hashes": len(core_hashes) == 24,
        "reported_core_hashes_match": sorted(core_hashes) == certificate["remaining_unique_class_sha256"],
    }
    if not all(checks.values()):
        raise RuntimeError((checks, failures[:3]))
    report = {
        "marker": MARKER,
        "lowers_sha256": lower_hash,
        "certificate_sha256": certificate_hash,
        "source_sha256": sha256(Path(__file__).resolve()),
        "checks": checks,
        "audited_families": audited,
        "failure_count": len(failures),
        "scope_guard": (
            "This independently replays J-mask dominance only; the 24 core "
            "all-order signs remain separate obligations."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(checks, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
