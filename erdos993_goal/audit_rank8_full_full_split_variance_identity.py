#!/usr/bin/env python3
"""Independent exact audit of the rank-eight split-variance identity."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
PRIMARY = {
    "verify_rank8_full_full_split_variance_identity.py": "A6106579E3AC231C963076E9241C723195F48F17666B9315BF35F7B1C2C4F534",
    "rank8_full_full_split_variance_identity_exact_20260820.json": "2E4CA923474B953EBB2029D6DFE848A6F4320767BD5AE7A0F07B860B51AF1D6F",
    "RANK8_FULL_FULL_SPLIT_VARIANCE_REDUCTION_2026-08-20.md": "7DDB25FAC1744C82E8742816FB4A886EEC0084D1924613F01F54BC7FDA414118",
}
OUTPUT = ROOT / "rank8_full_full_split_variance_identity_independent_audit_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def conv(a, b, k):
    return sum(math.comb(k, j) * a[j] * b[k - j] for j in range(k + 1))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in PRIMARY}
    assert actual == PRIMARY
    report = json.loads((ROOT / "rank8_full_full_split_variance_identity_exact_20260820.json").read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_FULL_FULL_SPLIT_VARIANCE_IDENTITY_NOT_CONE_THEOREM"
    assert report["symbolic_replay"] == {
        "first_derivative_remainder": "0",
        "second_derivative_remainder": "0",
        "margin_remainder": "0",
        "split_support_size": 8,
    }

    # Independent transcription in cleared-numerator form.  This does not use
    # the primary's expectation/variance expression during simplification.
    x = sp.symbols("x0:10", nonzero=True)
    y = sp.symbols("y0:10", nonzero=True)
    h = sp.symbols("z")
    c7, c8, c9 = (conv(x, y, k) for k in (7, 8, 9))
    sum_w_s = 0
    sum_w_s2 = 0
    sum_w_d_minus_hs = 0
    for j in range(8):
        r = 7 - j
        w = math.comb(7, j) * x[j] * y[r]
        ax = x[j + 1] / x[j]
        ay = x[j + 2] / x[j + 1]
        bx = y[r + 1] / y[r]
        by = y[r + 2] / y[r + 1]
        s = ax + bx
        d = ax * (ax - ay) + bx * (bx - by)
        sum_w_s += w * s
        sum_w_s2 += w * s**2
        sum_w_d_minus_hs += w * (d - h * s)

    derivative_one = sp.cancel(sum_w_s - c8)
    derivative_two = sp.cancel(sum_w_s2 - sum_w_d_minus_hs - h * sum_w_s - c9)
    # c7^2(E[P]-Var S) after clearing all expectation denominators.
    cleared_rhs = c7 * sum_w_d_minus_hs - c7 * sum_w_s2 + sum_w_s**2
    cleared_margin = sp.cancel(c8**2 - c7 * c9 - h * c7 * c8 - cleared_rhs)
    assert derivative_one == derivative_two == cleared_margin == 0

    payload = {
        "schema": "rank8-full-full-split-variance-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_RANK8_FULL_FULL_SPLIT_VARIANCE_IDENTITY",
        "primary_hashes": actual,
        "independent_basis": "cleared split-weight numerators",
        "first_derivative_remainder": "0",
        "second_derivative_remainder": "0",
        "cleared_margin_remainder": "0",
        "equivalent_cone_target": "Var(S)<=E[P]",
        "full_full_cones_proved": False,
        "scope_warning": "Identity only; no full/full cone, forest Q8, PGC, or Problem 993 theorem.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
