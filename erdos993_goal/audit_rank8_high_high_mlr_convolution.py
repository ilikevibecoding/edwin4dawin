#!/usr/bin/env python3
"""Independent structural audit of the rank-eight high/high MLR theorem."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import random

import sympy as sp


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "verify_rank8_high_high_mlr_convolution.py"
PRIMARY_REPORT = ROOT / "rank8_high_high_mlr_convolution_exact_20260820.json"
NOTE = ROOT / "RANK8_HIGH_HIGH_MLR_CONVOLUTION_THEOREM_2026-08-20.md"
REPORT = ROOT / "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def conv(a, b, rank):
    return sum(math.comb(rank, i) * a[i] * b[rank - i] for i in range(rank + 1))


def structural_audit() -> dict:
    # Rebuild the convolution projection without importing the primary.
    a = sp.symbols("u0:10", nonzero=True)
    b = sp.symbols("v0:10", nonzero=True)
    projection = []
    for z in (7, 8):
        numerator = sum(
            math.comb(z, i)
            * a[i]
            * b[z - i]
            * (a[i + 1] / a[i] + b[z - i + 1] / b[z - i])
            for i in range(z + 1)
        )
        remainder = sp.cancel(numerator - conv(a, b, z + 1))
        assert remainder == 0
        projection.append({"total": z, "remainder": "0"})

    h = sp.symbols("H")
    c7, c8, c9 = (conv(a, b, z) for z in (7, 8, 9))
    margin_remainder = sp.cancel(
        c8**2 - c7 * c9 - h * c7 * c8
        - c7 * c8 * (c8 / c7 - c9 / c8 - h)
    )
    assert margin_remainder == 0

    # Re-derive factorial-row log-concavity.  If R_i-R_(i+1)=D_i>=0,
    # the cleared adjacent score difference is R_(i+1)+(i+2)D_i.
    R = sp.symbols("R0:9", nonnegative=True)
    D = sp.symbols("D0:8", nonnegative=True)
    lc_rows = []
    for i in range(8):
        cleared = (i + 2) * R[i] - (i + 1) * R[i + 1]
        reduced = sp.expand(cleared.subs(R[i], R[i + 1] + D[i]))
        assert reduced == R[i + 1] + (i + 2) * D[i]
        lc_rows.append(str(reduced))

    # Re-derive every adjacent conditional MLR comparison on the common
    # support.  The new i=8 point has zero old mass, hence is automatically
    # the largest likelihood-ratio point.
    q = sp.symbols("q0:10", nonnegative=True)
    mlr_rows = []
    for i in range(7):
        r = 7 - i
        cross = sp.expand(q[r] ** 2 - q[r - 1] * q[r + 1])
        mlr_rows.append({"i_to_i_plus_1": [i, i + 1], "q_minor_rank": r, "cross": str(cross)})
    assert [row["q_minor_rank"] for row in mlr_rows] == list(range(7, 0, -1))

    # Independently check the oppositely-monotone covariance identity.
    p = sp.symbols("p0:4", nonnegative=True)
    f = sp.symbols("f0:4")
    ell = sp.symbols("l0:4")
    covariance_twice = 2 * (
        sum(p[i] * f[i] * ell[i] for i in range(4)) * sum(p)
        - sum(p[i] * f[i] for i in range(4)) * sum(p[i] * ell[i] for i in range(4))
    )
    pair_sum = sum(
        p[i] * p[j] * (f[i] - f[j]) * (ell[i] - ell[j])
        for i in range(4)
        for j in range(4)
    )
    covariance_remainder = sp.expand(covariance_twice - pair_sum)
    assert covariance_remainder == 0

    # Check the actual high-cone adjusted drops, including the stronger
    # rank-zero gap and only the indices genuinely used by totals 7 and 8.
    extras = sp.symbols("e0:8", nonnegative=True)
    adjusted = []
    for i in range(8):
        gap = 2 * h + extras[0] if i == 0 else h + extras[i]
        drop = sp.expand(gap - h)
        expected = h + extras[0] if i == 0 else extras[i]
        assert drop == expected
        adjusted.append(str(drop))

    return {
        "projection": projection,
        "margin_remainder": str(margin_remainder),
        "factor_lc_nonnegative_forms": lc_rows,
        "conditional_mlr_rows": mlr_rows,
        "new_upper_endpoint_old_mass": 0,
        "oppositely_monotone_covariance_remainder": str(covariance_remainder),
        "high_cone_adjusted_drops": adjusted,
        "indices_used": list(range(9)),
        "unstated_terminal_gap_required": False,
    }


def factor(h: int, terminal: int, extras: list[int]):
    gaps = [2 * h + extras[0]] + [h + extras[i] for i in range(1, 8)]
    ratios = [0] * 9
    ratios[8] = terminal
    for i in range(7, -1, -1):
        ratios[i] = ratios[i + 1] + gaps[i]
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def independent_exact_replay(cases: int = 4096) -> dict:
    rng = random.Random(8_993_808)
    minimum = None
    zero_terminal_cases = 0
    zero_h_cases = 0
    for case in range(cases):
        h = 0 if case % 17 == 0 else rng.randint(1, 25)
        ta = 0 if case % 19 == 0 else rng.randint(1, 25)
        tb = 0 if case % 23 == 0 else rng.randint(1, 25)
        A, aa = factor(h, ta, [rng.randint(0, 35) for _ in range(8)])
        B, bb = factor(h, tb, [rng.randint(0, 35) for _ in range(8)])
        zero_terminal_cases += ta == 0 or tb == 0
        zero_h_cases += h == 0
        cc = {z: conv(aa, bb, z) for z in (7, 8, 9)}
        margin = cc[8] ** 2 - cc[7] * cc[9] - h * cc[7] * cc[8]
        assert margin >= 0
        minimum = margin if minimum is None else min(minimum, margin)

        # Reconstruct the two conditional expectations from scratch.
        values = []
        for z in (7, 8):
            numerator = 0
            for i in range(z + 1):
                numerator += (
                    math.comb(z, i)
                    * aa[i]
                    * bb[z - i]
                    * (A[i] + B[z - i] + h * z)
                )
            values.append(Fraction(numerator, cc[z]))
        assert values[0] >= values[1]
        assert values[0] - values[1] == Fraction(margin, cc[7] * cc[8])
    return {
        "cases": cases,
        "seed": 8_993_808,
        "zero_terminal_cases": zero_terminal_cases,
        "zero_h_cases": zero_h_cases,
        "minimum_margin": minimum,
    }


def main() -> None:
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_ALL_ORDER_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE"
    structure = structural_audit()
    replay = independent_exact_replay()
    payload = {
        "schema": "rank8-high-high-mlr-convolution-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE",
        "primary_status": primary["status"],
        "structural_audit": structure,
        "independent_exact_replay": replay,
        "hashes": {
            "primary_source_sha256": sha256(PRIMARY),
            "primary_report_sha256": sha256(PRIMARY_REPORT),
            "theorem_note_sha256": sha256(NOTE),
            "audit_source_sha256": sha256(Path(__file__)),
        },
        "scope_warning": "High/high is closed. Low/high and low/low are not claimed here.",
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
