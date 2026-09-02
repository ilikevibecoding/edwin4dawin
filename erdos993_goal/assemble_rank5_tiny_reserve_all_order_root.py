#!/usr/bin/env python3
"""Assemble the all-order strong-Q5 reserve and its rank-eight V cap.

The large-core shifted-isolate certificate supplies the only previously
missing terminal branch.  This assembler checks the exact leaf algebra,
the numerical reserve needed by the induction, and every dependency status.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_tiny_reserve_all_order_theorem_exact_root_20260826.json"
FILES = {
    "shifted": "rank5_quantitative_isolate_shifted_base1_tenth_exact_root_20260826.json",
    "no_isolate": "rank5_normalized_payment_quantitative_exact_root_20260823.json",
    "small_star": "rank5_quantitative_small_core_star_exact_root_20260823.json",
    "forest_ratio": "forest_rank34_ratio_three_tail_exact_root_20260826.json",
    "finite_base": "rank5_strong_q5_through34_theorem_exact_root_20260826.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_leaf_audit() -> dict[str, str]:
    a, b, c, d, e, f, M, alpha = sp.symbols(
        "a b c d e f M alpha", positive=True
    )
    q_old = 10 * b**2 - a * b - 12 * a * c
    q_new = 10 * (b + e) ** 2 - (a + d) * (b + e) - 12 * (a + d) * (c + f)
    # The exact payment identity is independently pinned by the shifted
    # certificate; here M is kept abstract so the induction rearrangement is
    # checked without importing its producer.
    q_new_from_identity = q_old + d * q_old / a + M / (5 * a * d)
    j_old = q_old - alpha * a * b
    j_new_from_identity = sp.expand(
        q_new_from_identity - alpha * (a + d) * (b + e)
    )
    rearranged = (1 + d / a) * j_old + M / (5 * a * d) - alpha * e * (a + d)
    assert sp.factor(j_new_from_identity - rearranged) == 0

    alpha_value = sp.Rational(1, 120)
    payment_constant = sp.Rational(1, 10)
    # d/e<=1/3 and h<=d imply a=e+h<=4e/3 and a+d<=5e/3.
    product_bound = sp.Rational(4, 3) * sp.Rational(5, 3)
    required_constant = sp.factor(5 * alpha_value * product_bound)
    reserve = sp.factor(payment_constant - required_constant)
    assert required_constant == sp.Rational(5, 54)
    assert reserve == sp.Rational(1, 135) > 0
    v_cap = sp.factor(1 - alpha_value / 5)
    assert v_cap == sp.Rational(599, 600)
    return {
        "leaf_rearrangement": (
            "J_alpha(G)=(1+d/a)J_alpha(B)+M/(5ad)-alpha*e*(a+d)"
        ),
        "tail_bounds": "d/e<=1/3, h<=d, a=e+h<=4e/3, a+d<=5e/3",
        "required_payment": "M>=5*alpha*a*d*e*(a+d)",
        "required_constant_after_tail_bounds": str(required_constant),
        "available_constant": str(payment_constant),
        "constant_slack": str(reserve),
        "alpha": str(alpha_value),
        "V_cap": str(v_cap),
    }


def main() -> None:
    reports = {
        key: json.loads((HERE / name).read_text(encoding="utf-8"))
        for key, name in FILES.items()
    }
    assert reports["shifted"]["status"] == (
        "PASS_EXACT_RANK5_QUANTITATIVE_ISOLATE_PAYMENT_BASE1_"
        "CONSTANT_ONE_TENTH"
    )
    assert reports["shifted"]["source_sha256"] == sha256(
        HERE / "certify_rank5_quantitative_isolate_shifted_root.py"
    )
    assert reports["shifted"]["coverage"] == {
        **reports["shifted"]["coverage"],
        "Newton_orders_including_value": 16,
        "root_regions": 4,
        "coefficient_regions": 4,
        "cells": 256,
        "negative_initial_minima": 0,
        "maximum_subdivision_depth": 0,
    }
    assert reports["no_isolate"]["status"] == (
        "PASS_EXACT_RANK5_NORMALIZED_PAYMENT_PHI_GE_7X_OVER_25"
    )
    assert reports["small_star"]["status"] == (
        "PASS_EXACT_RANK5_QUANTITATIVE_SMALL_CORE_AND_STAR"
    )
    assert reports["small_star"]["rooted_cores"] == 11_006
    assert reports["forest_ratio"]["status"] == (
        "PASS_EXACT_FOREST_I4_AT_LEAST_THREE_I3_ORDER33_PLUS"
    )
    assert reports["finite_base"]["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_RANK5_STRONG_Q5_FOR_EVERY_TREE_"
        "ORDER_11_THROUGH_34"
    )
    algebra = symbolic_leaf_audit()

    dependencies = {
        name: sha256(HERE / name) for name in FILES.values()
    }
    payload = {
        "schema": "rank5-tiny-reserve-all-order-theorem-root-v1",
        "status": "PASS_EXACT_ALL_ORDER_RANK5_Q5_AT_LEAST_I4_I5_OVER_120",
        "theorem": (
            "For every tree T of order at least 11, Q5(T)="
            "10*i5(T)^2-i4(T)*i5(T)-12*i4(T)*i6(T) is at least "
            "i4(T)*i5(T)/120."
        ),
        "rank8_corollary": (
            "For every such tree with i4*i5>0, V="
            "1-Q5/(5*i4*i5) <= 599/600."
        ),
        "induction": {
            "finite_base": (
                "Orders 11 through 34 satisfy the stronger bound "
                "Q5>=i4*i5/5."
            ),
            "tail_start": 35,
            "deleted_forest_order": "n-2>=33",
            "terminal_payment_partition": {
                "large_core_s_zero": "M>=7*d*e^3/5",
                "large_core_s_at_least_one": "M>=d*e^3/10",
                "small_core_s_at_least_one": "M>=7*d*e^3/5",
                "star": "exact nonnegative factorization gives M>=7*d*e^3/5",
            },
            "uniform_tail_payment": "M>=d*e^3/10",
            "algebra": algebra,
            "conclusion": (
                "The payment has slack d*e^3/135 beyond the worst-case "
                "amount needed to preserve J=Q5-i4*i5/120 at each leaf step."
            ),
        },
        "proof_inputs": {
            "reports": dependencies,
            "shifted_certificate_source": sha256(
                HERE / "certify_rank5_quantitative_isolate_shifted_root.py"
            ),
            "leaf_identity_source": sha256(
                HERE / "verify_rank5_leaf_induction_reduction.py"
            ),
        },
        "proof_boundary": (
            "This is an all-order rank-five theorem and the V upper cap used by "
            "the rank-eight terminal boxes. It does not alone prove rank-eight "
            "log-concavity or full independence-sequence unimodality."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("V_CAP", algebra["V_cap"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
