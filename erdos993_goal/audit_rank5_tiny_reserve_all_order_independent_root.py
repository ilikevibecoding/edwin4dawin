#!/usr/bin/env python3
"""Independent assembly audit for the all-order rank-five tiny reserve.

This audit does not regenerate the 3.88-million-entry shifted Bernstein
certificate.  It pins that exact report, checks its complete certificate
registry, and independently rederives the induction arithmetic and V cap.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_tiny_reserve_all_order_independent_assembly_audit_root_20260827.json"
PINNED = {
    "certify_rank5_quantitative_isolate_shifted_root.py":
        "FCB2F39D70BB80A98740AB333D094C2BD151FBB7708A135B06E838525147C5DA",
    "rank5_quantitative_isolate_shifted_base1_tenth_exact_root_20260826.json":
        "02247AA64708CACDAF8377CFFC119F39CFFA080D984769376A146BE8B7BE6AD7",
    "rank5_normalized_payment_quantitative_exact_root_20260823.json":
        "2E75DC3337EF9D1E16FD52992A1083602C862FA0881DF2726466C4EFA604A21C",
    "rank5_quantitative_small_core_star_exact_root_20260823.json":
        "4949BB2E828C6BB3F329B3EAD7D844ED364CA8C357048E23C79DBD4ED07A001F",
    "forest_rank34_ratio_three_tail_exact_root_20260826.json":
        "92DA1BD89BE7D8FC719B2A74BB355857663DEEDA1DC1CF41299776BEA974DBF7",
    "rank5_strong_q5_through34_theorem_exact_root_20260826.json":
        "0E50B035129B1F6A6DE78EF1EA670A232049328BA27588AAEEA1590510776F39",
    "verify_rank5_leaf_induction_reduction.py":
        "8E8175FBDCDF9CDACF027380A3193F822E6A3FCB83570D9BC802560A890CDE0D",
    "assemble_rank5_tiny_reserve_all_order_root.py":
        "EDB9738740FCAE95FACD409C47A530656A3062953D573BF114353A024109AF24",
    "rank5_tiny_reserve_all_order_theorem_exact_root_20260826.json":
        "419E5F40AF533ABA42A65C940FC64FC95824D2DBAD54B79F345703124B245FD5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    for name, expected in PINNED.items():
        assert sha256(HERE / name) == expected, name
    shifted = json.loads((HERE / "rank5_quantitative_isolate_shifted_base1_tenth_exact_root_20260826.json").read_text(encoding="utf-8"))
    assembled = json.loads((HERE / "rank5_tiny_reserve_all_order_theorem_exact_root_20260826.json").read_text(encoding="utf-8"))
    assert shifted["status"] == "PASS_EXACT_RANK5_QUANTITATIVE_ISOLATE_PAYMENT_BASE1_CONSTANT_ONE_TENTH"
    assert assembled["status"] == "PASS_EXACT_ALL_ORDER_RANK5_Q5_AT_LEAST_I4_I5_OVER_120"

    certificates = shifted["region_certificates"]
    assert len(certificates) == 256
    assert {row["difference"] for row in certificates} == set(range(16))
    regions = {row["region"] for row in certificates}
    assert len(regions) == 16
    assert all(sum(1 for row in certificates if row["difference"] == degree) == 16
               for degree in range(16))
    assert all(sp.Rational(row["initial_minimum"]) >= 0 for row in certificates)
    assert all(row["subdivision_leaves"] == 1 and row["maximum_depth"] == 0
               for row in certificates)
    assert all(all(value >= 0 for value in row["removed_nonnegative_monomial"])
               for row in certificates)
    total_coefficients = sum(row["Bernstein_coefficients"] for row in certificates)
    assert total_coefficients == 3_881_176
    registry_hash = hashlib.sha256("\n".join(
        f"{row['difference']}|{row['region']}|{row['ordered_initial_coefficients_sha256']}"
        for row in certificates
    ).encode("ascii")).hexdigest().upper()
    assert shifted["coverage"]["cells"] == 256
    assert shifted["coverage"]["Newton_orders_including_value"] == 16
    assert shifted["coverage"]["negative_initial_minima"] == 0
    assert shifted["coverage"]["maximum_subdivision_depth"] == 0
    assert shifted["coverage"]["total_Bernstein_coefficients"] == total_coefficients

    a, d, e, old_q, payment = sp.symbols("a d e old_q payment", positive=True)
    alpha = sp.Rational(1, 120)
    old_j = old_q - alpha * a * sp.Symbol("b", positive=True)
    b = next(symbol for symbol in old_j.free_symbols if symbol.name == "b")
    new_q = (1 + d / a) * old_q + payment / (5 * a * d)
    new_j = new_q - alpha * (a + d) * (b + e)
    independent_rearrangement = (
        (1 + d / a) * old_j
        + payment / (5 * a * d)
        - alpha * e * (a + d)
    )
    assert sp.cancel(new_j - independent_rearrangement) == 0

    # From d/e<=1/3 and h<=d: a=e+h<=4e/3 and a+d<=5e/3.
    required_coefficient = sp.factor(
        5 * alpha * sp.Rational(4, 3) * sp.Rational(5, 3)
    )
    available_coefficient = sp.Rational(1, 10)
    slack = sp.factor(available_coefficient - required_coefficient)
    assert required_coefficient == sp.Rational(5, 54)
    assert slack == sp.Rational(1, 135) > 0
    v_cap = sp.factor(1 - alpha / 5)
    assert v_cap == sp.Rational(599, 600)

    assert assembled["induction"]["tail_start"] == 35
    assert assembled["induction"]["deleted_forest_order"] == "n-2>=33"
    assert assembled["induction"]["uniform_tail_payment"] == "M>=d*e^3/10"
    assert assembled["induction"]["algebra"]["constant_slack"] == str(slack)
    assert assembled["induction"]["algebra"]["V_cap"] == str(v_cap)

    payload = {
        "schema": "rank5-tiny-reserve-all-order-independent-assembly-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_RANK5_TINY_RESERVE_ASSEMBLY_AUDIT",
        "verified_theorem": assembled["theorem"],
        "shifted_certificate_registry": {
            "differences": 16,
            "regions_per_difference": 16,
            "cells": len(certificates),
            "Bernstein_coefficients": total_coefficients,
            "negative_initial_minima": 0,
            "maximum_subdivision_depth": 0,
            "ordered_registry_sha256": registry_hash,
        },
        "independent_induction_arithmetic": {
            "required_payment_coefficient": str(required_coefficient),
            "available_payment_coefficient": str(available_coefficient),
            "strict_slack_coefficient": str(slack),
            "alpha": str(alpha),
            "V_cap": str(v_cap),
        },
        "pinned_sha256": PINNED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently audits the theorem assembly and the complete "
            "registry of the pinned shifted Bernstein report; it does not "
            "regenerate that report's 3,881,176 coefficients."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REGISTRY", registry_hash)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
