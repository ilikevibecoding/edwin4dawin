#!/usr/bin/env python3
"""Verify the shifted binomial-product forward-difference formula.

For nonnegative alpha,beta,u,v,r, this gives an explicitly positive
formula for

  Delta_n^r [C(n+alpha,u) C(n+beta,v)] at n=0.

It is the coefficient kernel produced by A^a W^r after reciprocity in
the remaining stable-P4 affine bridge.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


def choose(n: int, k: int) -> int:
    if n < 0 or k < 0 or k > n:
        return 0
    return math.comb(n, k)


def trinomial_weight(p: int, q: int, r: int) -> int:
    """Coefficient [z^p w^q](z+w+zw)^r."""
    h = p + q - r
    if h < 0 or r - p < 0 or r - q < 0:
        return 0
    return math.factorial(r) // (
        math.factorial(h)
        * math.factorial(r - p)
        * math.factorial(r - q)
    )


def positive_formula(
    alpha: int,
    beta: int,
    u: int,
    v: int,
    r: int,
) -> int:
    total = 0
    for p in range(r + 1):
        for q in range(r + 1):
            weight = trinomial_weight(p, q, r)
            if weight:
                total += (
                    choose(alpha, u - p)
                    * choose(beta, v - q)
                    * weight
                )
    return total


def direct_difference(
    alpha: int,
    beta: int,
    u: int,
    v: int,
    r: int,
) -> int:
    return sum(
        (-1) ** (r - n)
        * choose(r, n)
        * choose(n + alpha, u)
        * choose(n + beta, v)
        for n in range(r + 1)
    )


def main() -> None:
    failures = []
    checks = 0
    minimum_positive = None
    canonical = []
    for alpha in range(7):
        for beta in range(7):
            for u in range(10):
                for v in range(10):
                    for r in range(13):
                        expected = direct_difference(alpha, beta, u, v, r)
                        observed = positive_formula(alpha, beta, u, v, r)
                        checks += 1
                        canonical.append(
                            f"{alpha},{beta},{u},{v},{r}:{observed}"
                        )
                        if expected != observed:
                            failures.append(
                                {
                                    "alpha": alpha,
                                    "beta": beta,
                                    "u": u,
                                    "v": v,
                                    "r": r,
                                    "direct": expected,
                                    "formula": observed,
                                }
                            )
                        if observed > 0 and (
                            minimum_positive is None
                            or observed < minimum_positive
                        ):
                            minimum_positive = observed
    report = {
        "status": (
            "PASS_SHIFTED_BINOMIAL_PRODUCT_FORWARD_DIFFERENCE"
            if not failures
            else "FAIL_SHIFTED_BINOMIAL_PRODUCT_FORWARD_DIFFERENCE"
        ),
        "identity": (
            "Delta^r[C(n+alpha,u)C(n+beta,v)] at n=0 "
            "= sum_{p,q} C(alpha,u-p)C(beta,v-q) "
            "r!/((p+q-r)!(r-p)!(r-q)!)"
        ),
        "support": "max(p,q)<=r<=p+q",
        "positivity": (
            "Every summand is a product of nonnegative integers; "
            "therefore every shifted product has nonnegative forward differences."
        ),
        "exhaustive_audit": {
            "domain": (
                "0<=alpha,beta<=6; 0<=u,v<=9; 0<=r<=12"
            ),
            "checks": checks,
            "failure_count": len(failures),
            "first_failures": failures[:20],
            "minimum_positive_value": minimum_positive,
            "sha256": hashlib.sha256(
                "\n".join(canonical).encode("utf-8")
            ).hexdigest(),
        },
    }
    Path(
        "shifted_binomial_product_forward_difference_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
