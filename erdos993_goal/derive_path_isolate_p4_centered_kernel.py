#!/usr/bin/env python3
"""Derive the P4 distinguished kernel in centered layer coordinates.

This is an exploratory symbolic reduction.  We substitute

  q=c+m+s+2, L=2q-4+x,
  a=c+m+v, b=c+m+epsilon-v,

so the residual path ranks are independent of c and m.  The resulting
formula is saved without attempting the final binomial convolution.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_p4_symbolic_kernel import distinguished_kernel


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parity", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()

    c, m, s, x, v = sp.symbols(
        "c m s x v", integer=True, nonnegative=True
    )
    q = c + m + s + 2
    length = 2 * q - 4 + x
    a = c + m + v
    b = c + m + args.parity - v
    print("building centered kernel", flush=True)
    raw = distinguished_kernel(q, length, a, b)
    print(f"raw operation count: {sp.count_ops(raw)}", flush=True)
    print("expanding factorial functions", flush=True)
    expanded = sp.expand_func(raw)
    print(f"expanded operation count: {sp.count_ops(expanded)}", flush=True)
    print("combining rational expression", flush=True)
    reduced = sp.factor(sp.cancel(expanded))
    numerator, denominator = sp.fraction(reduced)
    report = {
        "parity_epsilon": args.parity,
        "coordinates": (
            "q=c+m+s+2, L=2q-4+x, "
            "a=c+m+v, b=c+m+epsilon-v"
        ),
        "raw_operation_count": int(sp.count_ops(raw)),
        "reduced_operation_count": int(sp.count_ops(reduced)),
        "numerator_operation_count": int(sp.count_ops(numerator)),
        "denominator_operation_count": int(sp.count_ops(denominator)),
        "reduced_kernel": str(reduced),
    }
    output = Path(
        "path_isolate_p4_centered_kernel_"
        f"epsilon{args.parity}_20260730.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({k: v for k, v in report.items() if k != "reduced_kernel"}, indent=2))


if __name__ == "__main__":
    main()
