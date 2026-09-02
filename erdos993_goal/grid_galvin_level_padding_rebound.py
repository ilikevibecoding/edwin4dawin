#!/usr/bin/env python3
"""Grid-search four homogeneous padding levels on a Galvin tree.

The outer root, gadget centers, middle vertices, and terminal base leaves
receive independently chosen numbers of new leaves.  Every padding is at
least two, so every candidate is a HIT.  The objective is the largest
coefficient ratio strictly after the first descent; a value above one is a
finite counterexample to Erdos 993.
"""

from __future__ import annotations

import argparse
import itertools
import json
import sys
import time
from functools import lru_cache
from pathlib import Path

from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
K1 = Poly([1, 1])


@lru_cache(maxsize=None)
def kernel(p):
    return K1**p


@lru_cache(maxsize=None)
def polynomial(m, t, pr, pc, pm, pl):
    leaf_e = kernel(pl)
    leaf_a = leaf_e + X
    middle_e = kernel(pm) * leaf_a
    middle_a = middle_e + X * leaf_e
    center_e = kernel(pc) * middle_a**t
    center_a = center_e + X * middle_e**t
    root_e = kernel(pr) * center_a**m
    return root_e + X * center_e**m


def profile(poly):
    a = [int(c) for c in poly]
    d = next(k for k in range(len(a) - 1) if a[k + 1] < a[k])
    num, den, best_k = 0, 1, d + 1
    for k in range(d + 1, len(a) - 1):
        if a[k + 1] * den > num * a[k]:
            num, den, best_k = a[k + 1], a[k], k
    reascent = next(
        (k for k in range(d + 1, len(a) - 1) if a[k + 1] > a[k]),
        None,
    )
    return {
        "first_descent": d,
        "best_rebound_k": best_k,
        "best_num": num,
        "best_den": den,
        "ratio": num / den,
        "first_reascent": reascent,
        "degree": len(a) - 1,
        "window": a[
            max(0, (reascent if reascent is not None else best_k) - 4) :
            min(len(a), (reascent if reascent is not None else best_k) + 6)
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m", type=int, default=20)
    parser.add_argument("--t", type=int, default=10)
    parser.add_argument("--minimum", type=int, default=4)
    parser.add_argument("--maximum", type=int, default=10)
    parser.add_argument("--root-range", default="")
    parser.add_argument("--center-range", default="")
    parser.add_argument("--middle-range", default="")
    parser.add_argument("--leaf-range", default="")
    parser.add_argument(
        "--leaf-minus-middle",
        type=int,
        default=None,
        help="if set, retain only leaf padding = middle padding + value",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()
    champion = None
    witness = None
    tested = 0
    def values(spec):
        if not spec:
            return range(args.minimum, args.maximum + 1)
        lo, hi = (int(x) for x in spec.split(":"))
        return range(lo, hi + 1)

    grids = (
        values(args.root_range),
        values(args.center_range),
        values(args.middle_range),
        values(args.leaf_range),
    )
    for pr, pc, pm, pl in itertools.product(*grids):
        if (
            args.leaf_minus_middle is not None
            and pl != pm + args.leaf_minus_middle
        ):
            continue
        record = profile(
            polynomial(args.m, args.t, pr, pc, pm, pl)
        )
        record["paddings"] = {
            "root": pr,
            "center": pc,
            "middle": pm,
            "leaf": pl,
        }
        record["tree_order"] = (
            1
            + args.m * (1 + 2 * args.t)
            + pr
            + args.m * pc
            + args.m * args.t * (pm + pl)
        )
        tested += 1
        if (
            champion is None
            or record["best_num"] * champion["best_den"]
            > champion["best_num"] * record["best_den"]
        ):
            champion = record
        if record["first_reascent"] is not None:
            witness = record
            break
        if tested % 250 == 0:
            print(
                f"tested={tested:,} champion={champion['ratio']:.15f} "
                f"padding={champion['paddings']}",
                flush=True,
            )

    payload = {
        "status": "counterexample" if witness else "no_reascent",
        "parameters": vars(args) | {"out": str(args.out)},
        "tested": tested,
        "champion": champion,
        "witness": witness,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
