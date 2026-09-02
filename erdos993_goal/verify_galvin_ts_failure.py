#!/usr/bin/env python3
"""Independent exact replay of a TS failure in a Galvin tree.

Let T(m,t) be a root joined to m copies of the subdivided star S(2^t):
each gadget center has t paths of length two.  Then

    I(T(m,t);x)
      = ((1+2x)^t + x(1+x)^t)^m + x(1+2x)^(mt).

The script derives the polynomial from that closed form, independently
recomputes it by generic tree DP, and checks both universal and prefix TS.
"""

from __future__ import annotations

import json
import sys
from math import comb
from pathlib import Path

PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC_REPO))

from indpoly import independence_poly, is_unimodal  # noqa: E402


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for k, value in enumerate(a):
        out[k] += value
    for k, value in enumerate(b):
        out[k] += value
    return out


def multiply(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def power(a: list[int], exponent: int) -> list[int]:
    result = [1]
    base = list(a)
    e = exponent
    while e:
        if e & 1:
            result = multiply(result, base)
        e >>= 1
        if e:
            base = multiply(base, base)
    return result


def linear_power(c: int, exponent: int) -> list[int]:
    return [comb(exponent, k) * c**k for k in range(exponent + 1)]


def closed_form(m: int, t: int) -> list[int]:
    gadget = add(linear_power(2, t), [0] + linear_power(1, t))
    root_excluded = power(gadget, m)
    root_included = [0] + linear_power(2, m * t)
    return add(root_excluded, root_included)


def adjacency(m: int, t: int) -> list[list[int]]:
    n = 1 + m * (1 + 2 * t)
    adj: list[list[int]] = [[] for _ in range(n)]

    def edge(u: int, v: int) -> None:
        adj[u].append(v)
        adj[v].append(u)

    nxt = 1
    for _ in range(m):
        center = nxt
        nxt += 1
        edge(0, center)
        for _ in range(t):
            middle = nxt
            leaf = nxt + 1
            nxt += 2
            edge(center, middle)
            edge(middle, leaf)
    assert nxt == n
    return adj


def ts_failures(poly: list[int], prefix_only: bool) -> list[dict]:
    alpha = len(poly) - 1
    tail_start = (2 * alpha + 1) // 3
    last_k = len(poly) - 3
    if prefix_only:
        last_k = min(last_k, tail_start - 2)
    failures = []
    for k in range(1, last_k + 1):
        left = poly[k - 1] * poly[k + 2]
        right = poly[k] * poly[k + 1]
        if left > right:
            failures.append(
                {
                    "k": k,
                    "left": left,
                    "right": right,
                    "difference": left - right,
                    "ratio": left / right,
                }
            )
    return failures


def two_step_extension_failures(poly: list[int]) -> list[dict]:
    """Check mu[r+2] <= mu[r] + 2 without division.

    Here mu[r] = (r+1) a[r+1] / a[r] is the average number of extensions
    of a uniformly chosen independent r-set.  The inequality implies

        a[r] >= a[r+1]  ==>  a[r+2] >= a[r+3].
    """

    failures = []
    for r in range(0, len(poly) - 3):
        left = (r + 3) * poly[r + 3] * poly[r]
        right = ((r + 1) * poly[r + 1] + 2 * poly[r]) * poly[r + 2]
        if left > right:
            failures.append(
                {
                    "r": r,
                    "left": left,
                    "right": right,
                    "difference": left - right,
                    "ratio": left / right,
                }
            )
    return failures


def scan_family(max_m: int = 14, max_t: int = 14, max_n: int = 500) -> dict:
    universal = []
    prefix = []
    extension_two_step = []
    checked = 0
    for m in range(1, max_m + 1):
        for t in range(1, max_t + 1):
            n = 1 + m * (1 + 2 * t)
            if n > max_n:
                continue
            checked += 1
            poly = closed_form(m, t)
            all_fail = ts_failures(poly, prefix_only=False)
            prefix_fail = ts_failures(poly, prefix_only=True)
            extension_fail = two_step_extension_failures(poly)
            if all_fail:
                universal.append(
                    {"m": m, "t": t, "n": n, "first_failure": all_fail[0]}
                )
            if prefix_fail:
                prefix.append(
                    {"m": m, "t": t, "n": n, "first_failure": prefix_fail[0]}
                )
            if extension_fail:
                extension_two_step.append(
                    {
                        "m": m,
                        "t": t,
                        "n": n,
                        "first_failure": extension_fail[0],
                    }
                )
    universal.sort(key=lambda row: (row["n"], row["m"], row["t"]))
    prefix.sort(key=lambda row: (row["n"], row["m"], row["t"]))
    extension_two_step.sort(key=lambda row: (row["n"], row["m"], row["t"]))
    return {
        "checked_parameter_pairs": checked,
        "range": {"max_m": max_m, "max_t": max_t, "max_n": max_n},
        "smallest_universal_failure": universal[0] if universal else None,
        "universal_failure_count": len(universal),
        "smallest_prefix_failure": prefix[0] if prefix else None,
        "prefix_failure_count": len(prefix),
        "smallest_two_step_extension_failure": (
            extension_two_step[0] if extension_two_step else None
        ),
        "two_step_extension_failure_count": len(extension_two_step),
    }


def main() -> int:
    m, t = 4, 5
    formula_poly = closed_form(m, t)
    adj = adjacency(m, t)
    dp_poly = independence_poly(len(adj), adj)
    assert formula_poly == dp_poly
    failures = ts_failures(formula_poly, prefix_only=False)
    assert failures and failures[0]["k"] == 22
    assert failures[0]["left"] == 1_291_508
    assert failures[0]["right"] == 1_268_952
    prefix_failures = ts_failures(formula_poly, prefix_only=True)
    extension_two_step_failures = two_step_extension_failures(formula_poly)
    assert not prefix_failures
    assert not extension_two_step_failures
    assert is_unimodal(formula_poly)

    result = {
        "witness": {
            "family": "T(m,t): root joined to m copies of S(2^t)",
            "m": m,
            "t": t,
            "order": len(adj),
            "alpha": len(formula_poly) - 1,
            "tail_start": (2 * (len(formula_poly) - 1) + 1) // 3,
            "closed_form": "((1+2x)^t + x(1+x)^t)^m + x(1+2x)^(mt)",
            "first_universal_ts_failure": failures[0],
            "prefix_ts_failures": prefix_failures,
            "two_step_extension_failures": extension_two_step_failures,
            "unimodal": True,
            "formula_equals_generic_tree_dp": True,
            "polynomial": formula_poly,
        },
        "family_scan": scan_family(),
        "certificate": "passed",
        "scope_note": (
            "This refutes universal TS. It does not refute prefix TS or "
            "the Alavi-Malde-Schwenk-Erdos unimodality conjecture."
        ),
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
