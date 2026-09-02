#!/usr/bin/env python3
"""Exact Bernstein probe for the new three-edge-incidence bad-five floor."""

from __future__ import annotations

import itertools
import json

from explore_iso_n7_bundle_g4_sumge2_floor_or_bernstein_rank7_g4_piecewise import (
    build_polynomials,
)
from explore_iso_n7_bundle_g4_sumge2_reduced_bernstein_rank7_g4_piecewise import (
    bernstein_controls,
    frozen_five_leaf_check,
)


def main():
    pairs = tuple(itertools.product((0, 1), repeat=2))
    polynomials = build_polynomials(
        endpoint_pairs=pairs, floor_labels=("triple134",)
    )
    report = {}
    for pair in pairs:
        key = (*pair, "triple134")
        print("CONTROLS", key, flush=True)
        controls, scale, digest = bernstein_controls(polynomials[key])
        certificate = frozen_five_leaf_check(controls)
        report[str(pair)] = {
            "scale": scale,
            "digest": digest,
            "certificate": certificate,
        }
        print("CERT", pair, json.dumps(certificate, sort_keys=True), flush=True)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
