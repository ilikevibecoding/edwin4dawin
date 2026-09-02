#!/usr/bin/env python3
"""Exact replay for all-order positivity in the mean coordinate.

For y=3r+s, the Whipple generating series is

    sum_h S_h u^h = A(u)^r B(u)^s
                   = C(u)^y D(u)^s,
    C=A^(1/3), D=B A^(-1/3).

If c_n=binom(2n,n)/4^n, then

    n[u^n]log C = (2-c_n)/3 > 0,
    n[u^n]log D = (1-2c_n)/3 >= 0.

The second expression vanishes only at n=1.  Therefore every S_h, and hence
every positive scalar normalization P_h, has nonnegative coefficients as a
polynomial in y and s.  This is an all-order exponential-form argument; the
symbolic expansion below only replays it through a selectable finite layer.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_selector_normalized_ratio_reduction import polynomial_p


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_mean_coordinate_positivity_exact_20260809.json"

u = sp.symbols("u")
y, s = sp.symbols("y s", nonnegative=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=16)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    w = sp.sqrt(1 - u)
    A = (1 + w) ** 2 / (4 * w**4)
    B = (1 + w) ** 2 / (4 * w**2)
    log_A = sp.series(sp.log(A), u, 0, args.max_layer + 2).removeO().expand()
    log_B = sp.series(sp.log(B), u, 0, args.max_layer + 2).removeO().expand()

    input_records = []
    for n in range(1, args.max_layer + 1):
        central = sp.Rational(sp.binomial(2 * n, n), 4**n)
        alpha = sp.factor(n * log_A.coeff(u, n) / 3)
        beta = sp.factor(n * (log_B - log_A / 3).coeff(u, n))
        assert alpha == (2 - central) / 3
        assert beta == (1 - 2 * central) / 3
        assert alpha > 0
        assert beta >= 0
        assert (beta == 0) == (n == 1)
        input_records.append(
            {
                "n": n,
                "central_ratio": str(central),
                "y_logarithmic_input": str(alpha),
                "s_logarithmic_input": str(beta),
            }
        )

    # Replay the polynomial conclusion.  polynomial_p has its own symbols;
    # substitution is performed by name to avoid assumption-identity issues.
    polynomial_records = []
    for h in range(args.max_layer + 1):
        P = polynomial_p(h)
        if P.free_symbols:
            old_r = next(symbol for symbol in P.free_symbols if str(symbol) == "r")
            old_s = next(symbol for symbol in P.free_symbols if str(symbol) == "s")
            Q = sp.Poly(sp.expand(P.subs({old_r: (y - s) / 3, old_s: s})), y, s)
        else:
            Q = sp.Poly(P, y, s)
        assert all(coefficient >= 0 for coefficient in Q.coeffs())
        polynomial_records.append(
            {
                "h": h,
                "terms": len(Q.terms()),
                "minimum_coefficient": str(min(Q.coeffs())),
            }
        )

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_SELECTOR_MEAN_COORDINATE_POSITIVITY_REPLAY",
        "all_order_statement": (
            "P_h((y-s)/3,s) has nonnegative coefficients in y,s for every h"
        ),
        "proof": (
            "The logarithms of A^(1/3) and B*A^(-1/3) have nonnegative "
            "coefficients, with inputs (2-c_n)/3 and (1-2c_n)/3."
        ),
        "finite_replay_max_layer": args.max_layer,
        "input_records": input_records,
        "polynomial_records": polynomial_records,
        "source_sha256": source_hash,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print("PASS_EXACT_SELECTOR_MEAN_COORDINATE_POSITIVITY_REPLAY")
    print(f"source_sha256={source_hash}")
    print(f"report_sha256={report_hash}")


if __name__ == "__main__":
    main()
