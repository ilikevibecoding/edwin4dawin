#!/usr/bin/env python3
"""Run the exact middle-coefficient endpoint probe at a proposed cutoff."""

from __future__ import annotations

import argparse

import probe_rank7_terminal_broom_middle_endpoints as original


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    parser.add_argument("--rank", type=int, choices=range(3, 7), required=True)
    parser.add_argument("--v", type=int, choices=(0, 1), required=True)
    parser.add_argument("--z", type=int, choices=(0, 1), required=True)
    parser.add_argument("--s", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()
    original.CORE_ORDER = args.cutoff
    numerator, denominator, box = original.mapped(
        args.rank, (2, args.v, args.z, args.s, args.d)
    )
    from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast

    ddegrees, dcoeffs = tensor_bernstein_fast(denominator, box)
    dminimum, dindex = minimum_with_index(dcoeffs)
    print("denominator", ddegrees, dcoeffs.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(numerator, box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    if minimum < 0:
        print("CUTOFF_ENDPOINT_BERNSTEIN_NO_GO", args.cutoff, args.rank,
              args.v, args.z, args.s, args.d, minimum, index)
        return 1
    print("PASS_ENDPOINT_CUTOFF", args.cutoff, args.rank,
          args.v, args.z, args.s, args.d)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
