"""Probe disk-index reformulations of the lower-selector Duran M1 bound."""

from __future__ import annotations

import cmath

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


def one_case(d: int, r: int, row_s: int) -> dict[str, object]:
    path_N = d + r
    gamma = selector_gamma(path_N, row_s)
    forced = max(0, row_s - path_N + 1)
    gamma_hat = gamma[forced:]
    m = len(gamma_hat) - 1
    P = d + row_s
    p = P - 2 * forced
    ambient = P - forced
    epsilon = p % 2
    n = p // 2
    beta = sp.Rational(2 * epsilon - 1, 2)
    duran_s = n - m + 2
    A = sp.Rational((duran_s - 1) * (duran_s + beta - 1))
    q = duran_polynomial(ambient, gamma_hat)
    roots = [complex(root) for root in sp.nroots(q, n=35, maxsteps=300)]
    radius = float(sp.sqrt(A))
    outside = [root for root in roots if abs(root) > radius * (1 + 1e-10)]
    inside = [root for root in roots if abs(root) < radius * (1 - 1e-10)]
    boundary = [root for root in roots if root not in outside and root not in inside]
    outside_negative = [root for root in outside if abs(root.imag) < 1e-15 and root.real < 0]
    return {
        "cell": (d, r, row_s),
        "m": m,
        "A": A,
        "outside": len(outside),
        "outside_negative": len(outside_negative),
        "inside": len(inside),
        "boundary": len(boundary),
        "max_inside_ratio": max((abs(root) / radius for root in inside), default=0),
        "min_outside_ratio": min((abs(root) / radius for root in outside), default=float("inf")),
    }


def main() -> None:
    records = []
    for d in range(5, 15):
        for r in range(d - 4):
            N = d + r
            for row_s in range(r + 1, N + r + 1):
                records.append(one_case(d, r, row_s))
    failures = [
        item
        for item in records
        if item["outside"] != item["m"] - 2
        or item["outside_negative"] != item["m"] - 2
        or item["inside"] != 2
        or item["boundary"]
    ]
    weak_failures = [
        item
        for item in records
        if item["outside_negative"] != item["outside"]
        or item["outside"] > item["m"] - 2
        or item["boundary"]
    ]
    print("cases", len(records), "failures", len(failures))
    print("weak disk-exclusion failures", len(weak_failures))
    if weak_failures:
        print(weak_failures[:20])
    if failures:
        print(failures[:20])
    else:
        print("max inside ratio", max(records, key=lambda item: item["max_inside_ratio"]))
        print("min outside ratio", min(records, key=lambda item: item["min_outside_ratio"]))


if __name__ == "__main__":
    main()
