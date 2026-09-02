#!/usr/bin/env python3
"""Exact T*L plus L^2 payments for the right gap-1 directions."""

from __future__ import annotations

import hashlib
import json
import os
import pickle
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_left_payments_exact_root_20260827.json"
CACHES = {
    "s1": (
        "uniform_low_high_right_gap1_s1_product_coefficients_root.pkl",
        "DD96A7CF6135E771BB94AE367DADE60DE3DACE19F660FDF7E563A09F9C262807",
    ),
    "s2": (
        "uniform_low_high_right_gap1_s2_product_coefficients_root.pkl",
        "7C6262B39B392782810510E6D8DC2570E973AEAF542E6E6EAD39E568EAC778D8",
    ),
    "s3": (
        "uniform_low_high_right_gap1_s3_product_coefficients_root.pkl",
        "A0347E38E31C3FE3507DDCC010F397DF5F8C72BC566A3802571A33629F1EA726",
    ),
    "s4": (
        "uniform_low_high_right_gap1_s4_product_coefficients_root.pkl",
        "FC9F9CB888F044B8DC39DC5EB2940191CE3FFE2B53BBEE9F14FEF3354B87D4CF",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(values) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in values).encode("ascii")
    ).hexdigest().upper()


def positive_summary(expression, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    values = [coefficient for _, coefficient in polynomial.terms()]
    assert values and all(value.is_Integer and value > 0 for value in values)
    return {
        "positive_denominator": str(sp.factor(denominator)),
        "terms": len(values),
        "minimum": int(min(values)),
        "ordered_coefficients_sha256": ordered_hash(values),
    }


def main() -> int:
    rows = {}
    cache_hashes = {}
    for label, (name, expected) in CACHES.items():
        path = HERE / name
        assert sha256(path) == expected
        cache_hashes[name] = expected
        with path.open("rb") as stream:
            rows[label] = pickle.load(stream)

    symbols = {
        str(symbol): symbol
        for expression in rows["s1"].values()
        for symbol in expression.free_symbols
    }
    k, x, y = symbols["k"], symbols["x"], symbols["y"]
    u = sp.Symbol("u", nonnegative=True)
    M = k + y
    certificates = {}
    for label in ("s1", "s2", "s3", "s4"):
        alpha = rows[label][("T", "L")]
        epsilon = rows[label][("L", "L")]
        total_at_one = sp.cancel(alpha + epsilon)
        row = {
            "alpha_plus_epsilon": positive_summary(
                total_at_one.subs(k, u + 8), (u, x, y)
            ),
        }
        if label == "s1":
            # alpha*U+epsilon=(alpha+epsilon)+alpha*(U-1), U=T/L>1.
            row["alpha"] = positive_summary(
                alpha.subs(k, u + 8), (u, x, y)
            )
            row["payment_identity"] = (
                "alpha*U+epsilon=(alpha+epsilon)+alpha*(U-1)>0"
            )
        else:
            row["epsilon"] = positive_summary(
                epsilon.subs(k, u + 8), (u, x, y)
            )
            # If U=prod_{j=2}^k(1+M/(x+j)), the union bound gives
            # 1-1/U <= (k-1)M/(x+M+2).  The stored reserve proves that
            # epsilon times this upper bound is strictly below alpha+epsilon.
            reserve = sp.cancel(
                (x + M + 2) * total_at_one - epsilon * (k - 1) * M
            )
            row["union_bound_reserve"] = positive_summary(
                reserve.subs(k, u + 8), (u, x, y)
            )
            row["payment_identity"] = (
                "alpha*U+epsilon=U*((alpha+epsilon)-epsilon*(1-1/U))>0"
            )
        certificates[label] = row
        print(label, json.dumps(row, sort_keys=True), flush=True)

    payload = {
        "schema": "uniform-low-high-right-gap1-left-payments-root-v1",
        "status": "PASS_EXACT_ALL_RANK_RIGHT_GAP1_LEFT_PRODUCT_PAYMENTS",
        "theorem": (
            "For each of the four positive powers of the right gap-1 slack, "
            "alpha*T*L+epsilon*L^2 is strictly positive for k>=8 and x,y>=0."
        ),
        "ratio_argument": {
            "U": "T/L=product(1+(y+k)/(x+j),j=2..k)>1",
            "union_bound": (
                "1-1/U <= sum((y+k)/(x+y+k+j),j=2..k) "
                "<= (k-1)(y+k)/(x+y+k+2)"
            ),
        },
        "coefficient_certificates": certificates,
        "cache_sha256": cache_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves only the T*L/L^2 block.  The complementary product "
            "payments and the quartic reconstruction are separate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
