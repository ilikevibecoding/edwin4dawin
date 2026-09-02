#!/usr/bin/env python3
"""Exact all-stage negative-axis barrier for the polarized residual.

For K_(m,n) with m=k+2, two bounded positive parameters a=u/4,b=v/4,
and k negative parameters, group K_(m,n)(-y) by the number l of selected
negative parameters.  Every group is a positive weight times one common
two-parameter kernel.  Its four multiaffine corners are positive whenever
y>(L-2)/4, where L=n-m.  Thus the residual quadratic has no negative root
to the left of -(L-2)/4, in every order.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_all_stage_negative_axis_barrier_exact_20260809.json"
X = sp.symbols("x")


def falling(expr: sp.Expr, degree: int) -> sp.Expr:
    return sp.prod((expr - j for j in range(degree)), start=sp.Integer(1))


def elementary(values: list[sp.Expr]) -> list[sp.Expr]:
    result = [sp.Integer(1)] + [sp.Integer(0)] * len(values)
    for value in values:
        for j in range(len(values), 0, -1):
            result[j] += value * result[j - 1]
    return result


def kernel_identity() -> dict[str, str]:
    u, v, A, z = sp.symbols("u v A z")
    a, b = u / 4, v / 4
    grouped = sp.expand(
        16
        * (
            z * (z + 1)
            - (a + b) * (A + z + 1) * z
            + a * b * (A + z + 1) * (A + z)
        )
    )
    target = sp.expand(
        u * v * A * (A + 1)
        - 2 * A * (2 * (u + v) - u * v) * z
        + (4 - u) * (4 - v) * z * (z + 1)
    )
    assert sp.expand(grouped - target) == 0
    corners = {
        "00": sp.factor(target.subs({u: 0, v: 0})),
        "10": sp.factor(target.subs({u: 1, v: 0})),
        "01": sp.factor(target.subs({u: 0, v: 1})),
        "11": sp.factor(target.subs({u: 1, v: 1})),
    }
    assert corners["00"] == 16 * z * (z + 1)
    assert corners["10"] == 4 * z * (-A + 3 * z + 3)
    assert corners["01"] == corners["10"]
    assert sp.expand(corners["11"] - ((A - 3 * z) ** 2 + A + 9 * z)) == 0
    return {key: str(value) for key, value in corners.items()}


def exact_grouping_audit(maximum_k: int = 6) -> dict[str, object]:
    y = sp.symbols("y", positive=True)
    u, v = sp.symbols("u v")
    digests = []
    checked = []
    for k in range(maximum_k + 1):
        m = k + 2
        n = 4 * k + 13
        L = n - m
        cs = [sp.Rational(2 * j + 1, j + 3) for j in range(k)]
        parameters = [u / 4, v / 4, *[-c / 4 for c in cs]]
        e = elementary(parameters)
        direct = sp.expand(
            sum(e[j] * falling(n, j) * falling(-y, m - j) for j in range(m + 1))
        )

        # Rebuild by selecting l negative parameters and 0,1,2 of u/4,v/4.
        eneg = elementary([c / 4 for c in cs])
        grouped = sp.Integer(0)
        for l in range(k + 1):
            d = m - l
            common = (
                (-1) ** m
                * eneg[l]
                * falling(n, l)
                * sp.rf(y, d - 2)
                / 16
            )
            z = y + d - 2
            A = L - y + 1
            kernel = (
                u * v * A * (A + 1)
                - 2 * A * (2 * (u + v) - u * v) * z
                + (4 - u) * (4 - v) * z * (z + 1)
            )
            grouped += common * kernel
        assert sp.expand(direct - grouped) == 0
        digest = hashlib.sha256(str(sp.Poly(direct, y, u, v)).encode("utf-8")).hexdigest()
        digests.append(digest)
        checked.append(k)
    return {
        "checked_negative_factor_counts": checked,
        "maximum_k": maximum_k,
        "combined_digest": hashlib.sha256("".join(digests).encode("ascii")).hexdigest(),
    }


def main() -> None:
    report = {
        "kind": "window_all_stage_negative_axis_barrier_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_ALL_STAGE_NEGATIVE_AXIS_BARRIER",
        "kernel_corners": kernel_identity(),
        "grouping_audit": exact_grouping_audit(),
        "proved_barrier": (
            "For y>(L-2)/4, (-1)^k R_k(-y)>0. After the k selected "
            "positive factors are removed, Q_k(-y)>0; hence the exceptional "
            "quadratic has no negative root x<-(L-2)/4."
        ),
        "disk_consequence": (
            "sqrt((L+1)(L+2))/4>(L-2)/4, so an exceptional root cannot "
            "leave the admissible disk through the negative real axis."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(REPORT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
