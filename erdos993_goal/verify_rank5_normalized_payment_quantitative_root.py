#!/usr/bin/env python3
"""Quantitative strengthening of the normalized rank-five leaf payment."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank5_normalized_algebra_lemma import (
    X,
    certify_bernstein,
    endpoint_polynomials,
    verify_calculus_reduction,
    verify_payment_normalization,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank5_normalized_payment_quantitative_exact_root_20260823.json"
EXPECTED = {
    "verify_rank5_normalized_algebra_lemma.py":
        "DD519E717221D1E7BDCDED2B246C961E8C74980E77640B526479568783D8B22E",
    "verify_rank5_leaf_induction_reduction.py":
        "8E8175FBDCDF9CDACF027380A3193F822E6A3FCB83570D9BC802560A890CDE0D",
    "RANK5_TREE_THREE_HALVES_THEOREM_2026-07-27.md":
        "8BBC56C745A0C3069A8FE6AC897C2B65422516F59920E1931386D8FCA0923539",
}
QUANTITATIVE_CONSTANT = sp.Rational(7, 25)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    verify_payment_normalization()
    verify_calculus_reduction()

    rows = []
    for name, endpoint in endpoint_polynomials().items():
        strengthened = sp.factor(endpoint - QUANTITATIVE_CONSTANT * X)
        degrees, minimum, index, leaves, deepest = certify_bernstein(strengthened)
        assert minimum == 0
        assert leaves == 1 and deepest == 0
        rows.append({
            "endpoint": name,
            "degrees": [int(value) for value in degrees],
            "minimum_Bernstein_coefficient": str(minimum),
            "minimum_index": [int(value) for value in index],
            "subdivision_leaves": leaves,
            "maximum_depth": deepest,
        })
        print("PASS", name, degrees, minimum, flush=True)

    payload = {
        "schema": "rank5-normalized-payment-quantitative-root-v1",
        "status": "PASS_EXACT_RANK5_NORMALIZED_PAYMENT_PHI_GE_7X_OVER_25",
        "theorem": (
            "On the exact normalized rank-five terminal domain, Phi(X,D,r,q) "
            ">=7X/25. Equivalently, for d=i3(B-p), e=i4(B-p), the rooted "
            "payment M satisfies M>=7*d*e^3/5."
        ),
        "domain": [
            "0<=X<=1",
            "(2+X)/10<=D<=1",
            "1/2<=r<=1",
            "1/2<=q<=1",
            "q>=r-D/2",
        ],
        "constant": str(QUANTITATIVE_CONSTANT),
        "proof_reduction": (
            "Subtracting 7X/25 does not change any q-, D-, or r-curvature. "
            "Therefore the pinned concavity reduction has the same eight endpoints; "
            "each strengthened endpoint has nonnegative exact tensor-Bernstein "
            "coefficients on the full unit box without subdivision."
        ),
        "endpoint_certificates": rows,
        "leaf_increment_corollary": (
            "Q5(G)-Q5(B) >= (d/a)Q5(B) + 7*e^3/(25*a), "
            "where a=i4(B)."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The normalized domain is the large terminal-root domain used in the "
            "rank-five proof. Extending the quantitative corollary through its small-core "
            "and isolate-payment branches is a separate obligation."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
