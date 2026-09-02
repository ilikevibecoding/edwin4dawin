#!/usr/bin/env python3
"""Falsify overly broad algebraic versions of terminal NCL.

The samples obey only coefficientwise link containment C_j<=B_j and
the scalar forest curvature bounds 0<=q_F,q_T<=4.  A failure here
shows that a proof of NCL needs additional graph/complex structure.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path


def grid(rng: random.Random, low: int, high: int, den: int) -> Fraction:
    return Fraction(rng.randint(low, high), den)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=2_000_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ncl_abstract_sequence_scan_20260729.json"),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    checked = negative_cross = 0
    first_failure = None
    minimum = None
    minimum_item = None
    for sample in range(args.samples):
        r = rng.randint(2, 100)
        k = r + 1
        bm = Fraction(1)
        # x=b/b- ranges across both sides of the mode.
        x = grid(rng, 1, 400, 100)
        b = x
        qf = grid(rng, 0, 400, 100)
        w = 1 + r * x - qf
        if w <= 0:
            continue
        bp = b * w / k

        cm = grid(rng, 0, 100, 100) * bm
        c = grid(rng, 0, 100, 100) * b
        a = b + cm
        ap = bp + c
        v = k * ap / a
        zeta = v - k * x
        if zeta <= 0:
            continue
        negative_cross += 1

        qt = grid(rng, 0, 400, 100)
        next_mean = 1 + v - qt
        if next_mean < 0:
            continue
        app = ap * next_mean / (k + 1)
        # Decompose a++=b+++c+ with 0<=c+<=b+.
        cp_max = min(bp, app)
        cp = grid(rng, 0, 100, 100) * cp_max
        bpp = app - cp
        assert bpp >= 0 and 0 <= cp <= bp

        s = b / a
        theta = bm / (a + bm)
        delta = max(Fraction(0), 1 - x - qf)
        h = 2 * k * qt - r * qf
        margin = (
            v * h
            + k * s * (r + 2) * qf
            - 2 * k * (s * delta + theta * zeta * zeta)
        )
        checked += 1
        scale = max(
            abs(v * h + k * s * (r + 2) * qf),
            abs(2 * k * (s * delta + theta * zeta * zeta)),
            Fraction(1),
        )
        relative = margin / scale
        item = {
            "sample": sample,
            "r": r,
            "bm": str(bm),
            "b": str(b),
            "bp": str(bp),
            "bpp": str(bpp),
            "cm": str(cm),
            "c": str(c),
            "cp": str(cp),
            "q_F": str(qf),
            "q_T": str(qt),
            "v": str(v),
            "zeta": str(zeta),
            "delta": str(delta),
            "margin": str(margin),
            "relative_margin": float(relative),
        }
        if minimum is None or relative < minimum:
            minimum = relative
            minimum_item = item
        if margin < 0:
            first_failure = item
            break

    report = {
        "status": (
            "COUNTEREXAMPLE_TO_ABSTRACT_NCL"
            if first_failure is not None
            else "PASS_FINITE_AUDIT_NOT_PROOF"
        ),
        "scope_warning": (
            "These coefficient arrays need not be independence "
            "polynomials.  A failure only rejects an abstract proof "
            "from containment and scalar curvature bounds."
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "negative_cross_draws": negative_cross,
        "fully_checked_draws": checked,
        "minimum": minimum_item,
        "first_failure": first_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
