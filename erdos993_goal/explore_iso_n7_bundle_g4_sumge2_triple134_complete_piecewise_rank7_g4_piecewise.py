#!/usr/bin/env python3
"""Exact combined shadow/triple134 piecewise probe for common0/sum>=2."""

from __future__ import annotations

import gc
import itertools
import json

from explore_iso_n7_bundle_g4_sumge2_floor_or_bernstein_rank7_g4_piecewise import (
    build_polynomials,
)
from explore_iso_n7_bundle_g4_sumge2_or_axis_rank7_g4_piecewise import (
    minimum,
    split_axis_fast,
)
from explore_iso_n7_bundle_g4_sumge2_reduced_bernstein_rank7_g4_piecewise import (
    bernstein_controls,
)


def tail_leaf_records(array, path=()):
    if not path:
        left, right = split_axis_fast(array, 1)
        del array
        return {
            **tail_leaf_records(left, ("aL",)),
            **tail_leaf_records(right, ("aR",)),
        }
    if path == ("aL",):
        left, right = split_axis_fast(array, 4)
        del array
        return {
            **tail_leaf_records(left, (*path, "omegaL")),
            **tail_leaf_records(right, (*path, "omegaR")),
        }
    if path in (("aL", "omegaL"), ("aL", "omegaR"), ("aR",)):
        left_b, right_b = split_axis_fast(array, 2)
        del array
        records = {}
        for b_label, b_array in (("bL", left_b), ("bR", right_b)):
            left_q, right_q = split_axis_fast(b_array, 0)
            del b_array
            records["/".join((*path, b_label, "qL"))] = str(minimum(left_q))
            records["/".join((*path, b_label, "qR"))] = str(minimum(right_q))
            del left_q, right_q
        gc.collect()
        return records
    raise AssertionError(path)


def triple_certificate(controls):
    discarded, q_right = split_axis_fast(controls, 0)
    del discarded, controls
    c_left, c_right = split_axis_fast(q_right, 3)
    del q_right
    q_left, tail = split_axis_fast(c_right, 0)
    del c_right
    records = {
        "qR/cL": str(minimum(c_left)),
        "qR/cR/qL": str(minimum(q_left)),
        **tail_leaf_records(tail),
    }
    del c_left, q_left
    gc.collect()
    return records


def main():
    pairs = tuple(itertools.product((0, 1), repeat=2))
    polynomials = build_polynomials(
        endpoint_pairs=pairs, floor_labels=("shadow", "triple134")
    )
    report = {}
    for pair in pairs:
        shadow_key = (*pair, "shadow")
        print("SHADOW", pair, flush=True)
        shadow, shadow_scale, shadow_digest = bernstein_controls(
            polynomials.pop(shadow_key)
        )
        q_left, discarded = split_axis_fast(shadow, 0)
        shadow_minimum = minimum(q_left)
        del shadow, q_left, discarded
        gc.collect()

        triple_key = (*pair, "triple134")
        print("TRIPLE", pair, flush=True)
        triple, triple_scale, triple_digest = bernstein_controls(
            polynomials.pop(triple_key)
        )
        triple_records = triple_certificate(triple)
        complete = shadow_minimum >= 0 and all(
            int(value) >= 0 for value in triple_records.values()
        )
        report[str(pair)] = {
            "shadow_qL_minimum": str(shadow_minimum),
            "shadow_scale": shadow_scale,
            "shadow_digest": shadow_digest,
            "triple_scale": triple_scale,
            "triple_digest": triple_digest,
            "triple_leaf_minima": triple_records,
            "complete": complete,
        }
        print("CERT", pair, complete, min(map(int, triple_records.values())), flush=True)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
