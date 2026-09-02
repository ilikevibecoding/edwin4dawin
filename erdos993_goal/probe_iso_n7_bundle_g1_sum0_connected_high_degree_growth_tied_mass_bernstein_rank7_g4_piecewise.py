#!/usr/bin/env python3
"""Exact Bernstein probe for tied-maximum leaf-growth kernels.

Domain: old order n>=41, selected degree 3<=d<=n-5, and every old
degree-excess mass-unit label lies in [1,d].  This is the domain obtained by
decrementing any maximum part of a new high-degree profile, including ties.
"""

from __future__ import annotations

import argparse

from analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_kernel_rank7_g4_piecewise import (
    d,
    growth_differences,
    mass_triple_kernel,
    n,
    w,
    y,
    z,
)
from probe_iso_n7_bundle_g1_sum0_connected_high_degree_growth_mass_bernstein_rank7_g4_piecewise import (
    A,
    R,
    U,
    V,
    W,
    summarize,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--controls", default="6")
    selected = [int(value) for value in parser.parse_args().controls.split(",")]
    differences = growth_differences()
    for index in selected:
        numerator, _ = mass_triple_kernel(differences[index]).as_numer_denom()
        total = 0
        negative = 0
        minimum = None
        for maximum_excess in range(33):
            substitution = {
                n: 41+R,
                d: 3+maximum_excess,
                y: 1+(maximum_excess+2)*U,
                z: 1+(maximum_excess+2)*V,
                w: 1+(maximum_excess+2)*W,
            }
            summary = summarize(numerator.subs(substitution))
            total += summary["controls"]
            negative += summary["negative"]
            candidate = (summary["minimum"][0], "finite", maximum_excess,
                         summary["minimum"][1])
            minimum = candidate if minimum is None else min(minimum, candidate)
            if summary["negative"]:
                print(index, "NEGATIVE_FINITE", maximum_excess, summary)
        tail = summarize(numerator.subs({
            n: 41+A+R,
            d: 36+A,
            y: 1+(35+A)*U,
            z: 1+(35+A)*V,
            w: 1+(35+A)*W,
        }))
        total += tail["controls"]
        negative += tail["negative"]
        minimum = min(minimum, (tail["minimum"][0], "tail", None,
                                tail["minimum"][1]))
        if tail["negative"]:
            print(index, "NEGATIVE_TAIL", tail)
        print(index, "TOTAL", total, "NEGATIVE", negative, "MINIMUM", minimum)


if __name__ == "__main__":
    main()
