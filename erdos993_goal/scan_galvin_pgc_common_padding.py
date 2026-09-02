#!/usr/bin/env python3
"""Can common forest factors move Galvin's tail PGC failure into the prefix?

The base pendant pair is a terminal degree-two arm in T_(14,8).  Both the
tree polynomial and the pendant-pair deletion polynomial are multiplied by
either

    (1+x)^s   (s common isolated vertices), or
    (1+2x)^s  (s common disjoint edges).

Every resulting prefix PGC comparison is exact.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE = Poly([1])


def coeff(poly: Poly, k: int):
    return poly[k] if 0 <= k <= poly.degree() else 0


def reserve(poly: Poly, k: int):
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def stable_ratio(numerator: int, denominator: int) -> float:
    if numerator == 0:
        return 0.0
    shift = max(0, max(numerator.bit_length(), denominator.bit_length()) - 52)
    return (numerator >> shift) / (denominator >> shift)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-padding", type=int, default=1000)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    t, m = 8, 14
    e = (ONE + 2 * X) ** t
    a = e + X * (ONE + X) ** t
    tree_base = a**m + X * e**m

    e_previous = (ONE + 2 * X) ** (t - 1)
    a_previous = e_previous + X * (ONE + X) ** (t - 1)
    deletion_base = (
        a ** (m - 1) * a_previous
        + X * e ** (m - 1) * e_previous
    )
    assert tree_base.degree() == 126
    assert deletion_base.degree() == 125
    base_all_rank_failures = []
    for k in range(2, tree_base.degree() + 1):
        difference = (
            k
            * coeff(deletion_base, k - 2)
            * reserve(tree_base, k)
            - (k - 1)
            * coeff(tree_base, k - 1)
            * reserve(deletion_base, k - 1)
        )
        if difference < 0:
            base_all_rank_failures.append(k)
    assert base_all_rank_failures == [114]

    reports = []
    global_failure = None
    global_scaled_curvature_failure = None
    for kind, factor in (
        ("isolated_vertices", ONE + X),
        ("disjoint_edges", ONE + 2 * X),
    ):
        tree = tree_base
        deletion = deletion_base
        checks = 0
        failure = None
        closest_pair = None
        closest = None
        scaled_curvature_failure = None
        closest_scaled_curvature_pair = None
        closest_scaled_curvature = None
        for padding in range(args.max_padding + 1):
            if padding:
                tree *= factor
                deletion *= factor
            alpha = 126 + padding
            assert tree.degree() == alpha
            cutoff = (2 * alpha + 1) // 3
            for k in range(2, cutoff):
                left = int(
                    k
                    * coeff(deletion, k - 2)
                    * reserve(tree, k)
                )
                right = int(
                    (k - 1)
                    * coeff(tree, k - 1)
                    * reserve(deletion, k - 1)
                )
                difference = left - right
                checks += 1
                scaled_left = int(
                    k
                    * reserve(tree, k)
                    * coeff(deletion, k - 2)
                    * coeff(deletion, k - 1)
                )
                scaled_right = int(
                    (k - 1)
                    * reserve(deletion, k - 1)
                    * coeff(tree, k - 1)
                    * coeff(tree, k)
                )
                if (
                    k >= 3
                    and scaled_left < scaled_right
                    and scaled_curvature_failure is None
                ):
                    scaled_curvature_failure = {
                        "kind": kind,
                        "padding": padding,
                        "alpha": alpha,
                        "rank": k,
                        "cutoff": cutoff,
                        "scaled_curvature_difference":
                            scaled_left - scaled_right,
                        "scaled_curvature_left_over_right":
                            stable_ratio(scaled_left, scaled_right),
                    }
                    if global_scaled_curvature_failure is None:
                        global_scaled_curvature_failure = (
                            scaled_curvature_failure
                        )
                if scaled_left > 0 and scaled_right > 0:
                    scaled_pair = (scaled_left, scaled_right)
                    if (
                        closest_scaled_curvature_pair is None
                        or
                        scaled_left
                        * closest_scaled_curvature_pair[1]
                        < closest_scaled_curvature_pair[0]
                        * scaled_right
                    ):
                        closest_scaled_curvature_pair = scaled_pair
                        closest_scaled_curvature = {
                            "kind": kind,
                            "padding": padding,
                            "alpha": alpha,
                            "rank": k,
                            "cutoff": cutoff,
                            "scaled_curvature_left_over_right":
                                stable_ratio(scaled_left, scaled_right),
                        }
                if difference < 0:
                    failure = {
                        "kind": kind,
                        "padding": padding,
                        "alpha": alpha,
                        "rank": k,
                        "cutoff": cutoff,
                        "difference": difference,
                    }
                    break

                if left > 0 and right >= 0:
                    pair = (right, left)
                    if (
                        closest_pair is None
                        or right * closest_pair[1]
                        > closest_pair[0] * left
                    ):
                        closest_pair = pair
                        closest = {
                            "kind": kind,
                            "padding": padding,
                            "alpha": alpha,
                            "rank": k,
                            "cutoff": cutoff,
                            "right_over_left": stable_ratio(right, left),
                            "margin_digits": len(str(difference)),
                            "left_digits": len(str(left)),
                        }
            if failure:
                break
            if padding and padding % 100 == 0:
                print(
                    f"{kind}: padding={padding}, checks={checks:,}, "
                    f"closest={closest['right_over_left']:.12g}",
                    flush=True,
                )

        item = {
            "kind": kind,
            "tested_padding": [0, padding],
            "rank_checks": checks,
            "failure": failure,
            "closest": closest,
            "scaled_curvature_failure": scaled_curvature_failure,
            "closest_scaled_curvature": closest_scaled_curvature,
        }
        reports.append(item)
        if failure and global_failure is None:
            global_failure = failure
        if failure:
            break

    report = {
        "status": "FAIL" if global_failure else "PASS_NOT_PROOF",
        "base": {
            "family": "Galvin T_(14,8)",
            "alpha": 126,
            "terminal_pendant_pair": True,
            "all_rank_pgc_failures": base_all_rank_failures,
        },
        "parameters": {"max_padding": args.max_padding},
        "reports": reports,
        "failure": global_failure,
        "scaled_curvature_failure": global_scaled_curvature_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)
    return 1 if global_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
