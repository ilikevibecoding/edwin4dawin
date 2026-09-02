#!/usr/bin/env python3
"""Probe Gosper summability of a specialized aligned bottom-pair term."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import sympy as sp
from flint import fmpq_mpoly, fmpq_mpoly_ctx
from sympy.concrete.gosper import gosper_sum


sys.set_int_max_str_digits(0)
SOURCE = fmpq_mpoly_ctx.get(("u", "m", "s", "x"), "lex")
UNI = fmpq_mpoly_ctx.get(("u",), "lex")
u_flint = UNI.gens()[0]
u = sp.symbols("u", integer=True)


def specialize(poly: fmpq_mpoly, m_value: int, s_value: int, x_value: int):
    return poly.compose(
        u_flint,
        UNI.constant(m_value),
        UNI.constant(s_value),
        UNI.constant(x_value),
        ctx=UNI,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parity", type=int, choices=(0, 1), default=0)
    parser.add_argument("--m", type=int, default=8)
    parser.add_argument("--s", type=int, default=6)
    parser.add_argument("--x", type=int, default=45)
    args = parser.parse_args()

    prefix = (
        "path_isolate_p4_bottom_pair_aligned_summand_"
        f"parity{args.parity}_"
    )
    numerator = fmpq_mpoly(
        Path(prefix + "num_20260801.txt")
        .read_text(encoding="utf-8")
        .strip(),
        ctx=SOURCE,
    )
    denominator = fmpq_mpoly(
        Path(prefix + "den_20260801.txt")
        .read_text(encoding="utf-8")
        .strip(),
        ctx=SOURCE,
    )
    num_u = specialize(numerator, args.m, args.s, args.x)
    den_u = specialize(denominator, args.m, args.s, args.x)
    num_sp = sp.sympify(str(num_u).replace("^", "**"), locals={"u": u})
    den_sp = sp.sympify(str(den_u).replace("^", "**"), locals={"u": u})

    j = 2 * args.m + args.parity
    q = args.m + args.s + 2
    base = (
        sp.binomial(j, u)
        * sp.binomial(q + args.x + u - 2, q - u)
        * sp.binomial(q + args.x + j - u - 2, q - j + u)
    )
    term = base * num_sp / den_sp
    started = time.time()
    antidifference = gosper_sum(term, u)
    elapsed = time.time() - started
    report = {
        "parameters": vars(args),
        "j": j,
        "q": q,
        "numerator_degree": int(sp.degree(num_sp, u)),
        "denominator_degree": int(sp.degree(den_sp, u)),
        "gosper_found": antidifference is not None,
        "elapsed_seconds": elapsed,
    }
    if antidifference is not None:
        text_value = str(sp.factor(antidifference))
        report["antidifference"] = text_value
        report["antidifference_length"] = len(text_value)
    path = Path(
        "path_isolate_p4_bottom_pair_gosper_probe_"
        f"p{args.parity}_m{args.m}_s{args.s}_x{args.x}_20260801.json"
    )
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
