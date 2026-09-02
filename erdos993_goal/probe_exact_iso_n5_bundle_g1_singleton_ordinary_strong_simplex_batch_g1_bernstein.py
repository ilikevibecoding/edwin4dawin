#!/usr/bin/env python3
"""Batch the exact strengthened singleton-ordinary simplex probes.

The batch removes u/v exchange duplicates and adaptively degree-elevates the
geometry and two interval Bernstein bases.  It emits PROBE only.  A complete
all-compatible-branch run with no negative coefficients is intended to feed
a separate fail-closed theorem assembler and independent replay.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein import derive
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients,
    homogeneous_coefficients_fast,
    mapped_polynomial,
    valid_branch,
    valid_endpoint_branch,
    valid_parent_state,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_STRONG_SIMPLEX_BATCH_G1_BERNSTEIN"
SIMPLEX_SOURCE = "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py"
DERIVATION_SOURCE = "derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein.py"


def exchange_uv(branch):
    (
        degrees, adjacency, common, endpoints, uv_common, parent_state,
        positive_parent_interval,
    ) = branch
    return (
        (degrees[1], degrees[0], degrees[2]),
        (adjacency[0], adjacency[2], adjacency[1]),
        (common[1], common[0]),
        (endpoints[1], endpoints[0]),
        uv_common,
        parent_state,
        positive_parent_interval,
    )


def branch_key(branch) -> str:
    (
        degrees, adjacency, common, endpoints, uv_common, parent_state,
        positive_parent_interval,
    ) = branch
    return "/".join((
        "".join(map(str, degrees)),
        "".join(map(str, adjacency)),
        "".join(map(str, common)),
        "".join(endpoints),
        str(uv_common),
        parent_state,
        positive_parent_interval,
    ))


def canonical_branches():
    rows = set()
    for degrees in itertools.product((0, 1), repeat=3):
        for adjacency in itertools.product((0, 1), repeat=3):
            for common in itertools.product((0, 1), repeat=2):
                if not valid_branch(degrees, adjacency, common):
                    continue
                for endpoints in itertools.product(("Z", "L", "U"), repeat=2):
                    if not valid_endpoint_branch(degrees, adjacency, common, endpoints):
                        continue
                    for uv_common in (0, 1):
                        if uv_common and (
                            adjacency[0] or not (degrees[0] and degrees[1])
                            or "Z" in endpoints
                        ):
                            continue
                        if adjacency[1] and adjacency[2] and not uv_common:
                            continue
                        for parent_state in ("Z", "P"):
                            if not valid_parent_state(
                                degrees, adjacency, common, parent_state
                            ):
                                continue
                            split_parent_interval = (
                                parent_state == "P"
                                and adjacency == (0, 0, 0)
                                and uv_common == 0
                                and endpoints == ("L", "L")
                                and common in ((1, 0), (0, 1))
                            )
                            interval_modes = (
                                ("lower", "above")
                                if split_parent_interval else ("full",)
                            )
                            for positive_parent_interval in interval_modes:
                                branch = (
                                    degrees, adjacency, common, endpoints,
                                    uv_common, parent_state,
                                    positive_parent_interval,
                                )
                                rows.add(min(branch, exchange_uv(branch)))
    return tuple(sorted(rows))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--count", type=int, default=60)
    parser.add_argument("--max-elevation", type=int, default=4)
    parser.add_argument("--order-base", type=int, default=17)
    parser.add_argument("--skip-ll", action="store_true")
    parser.add_argument("--only-ll", action="store_true")
    parser.add_argument("--fixed-elevation", action="store_true")
    parser.add_argument("--ll-fixed-max", action="store_true")
    args = parser.parse_args()
    branches = canonical_branches()
    assert len(branches) == len(set(branches))
    indexed_selected = list(enumerate(branches))[args.start:args.start + args.count]
    if args.skip_ll:
        indexed_selected = [row for row in indexed_selected if row[1][3] != ("L", "L")]
    if args.only_ll:
        indexed_selected = [row for row in indexed_selected if row[1][3] == ("L", "L")]
    numerator = sp.expand(sp.fraction(derive()["strong_parent_cone_before_common"])[0])

    rows = []
    for offset, (original_index, branch) in enumerate(indexed_selected):
        (
            degrees, adjacency, common, endpoints, uv_common, parent_state,
            positive_parent_interval,
        ) = branch
        polynomial, _variables = mapped_polynomial(
            degrees, adjacency, common, endpoints,
            "centers", 1, 0, 0, uv_common, args.order_base, numerator=numerator,
            parent_state=parent_state,
            positive_parent_interval=positive_parent_interval,
        )
        attempts = []
        passed = False
        elevations = (
            (args.max_elevation,)
            if args.fixed_elevation or (args.ll_fixed_max and endpoints == ("L", "L"))
            else range(args.max_elevation + 1)
        )
        for elevation in elevations:
            coefficients, stats = homogeneous_coefficients_fast(
                polynomial, elevation, elevation
            )
            negative = sum(1 for value in coefficients.values() if value < 0)
            minimum = min(coefficients.values())
            attempts.append({
                "elevation": elevation,
                **stats,
                "negative": negative,
                "minimum": str(minimum),
            })
            if negative == 0:
                passed = True
                break
        row = {
            "index": original_index,
            "branch": branch_key(branch),
            "passed": passed,
            "attempts": attempts,
        }
        rows.append(row)
        print(json.dumps({
            "progress": f"{offset + 1}/{len(indexed_selected)}",
            "index": row["index"],
            "branch": row["branch"],
            "passed": passed,
            "last": attempts[-1],
        }, sort_keys=True), flush=True)

    report = {
        "marker": MARKER,
        "canonical_branch_total": len(branches),
        "requested_index_range": [args.start, min(len(branches), args.start + args.count)],
        "skipped_LL": args.skip_ll,
        "only_LL": args.only_ll,
        "fixed_elevation": args.fixed_elevation,
        "LL_fixed_at_maximum_elevation": args.ll_fixed_max,
        "checked": len(rows),
        "passed": sum(row["passed"] for row in rows),
        "failed": sum(not row["passed"] for row in rows),
        "maximum_elevation": args.max_elevation,
        "order_base": args.order_base,
        "rows": rows,
        "scope": (
            "Exact simplex-coefficient probes for the displayed canonical branch "
            "range only. No theorem, all-mode, all-N5, or Problem 993 claim."
        ),
        "dependencies_sha256": {
            SIMPLEX_SOURCE: hashlib.sha256((HERE / SIMPLEX_SOURCE).read_bytes()).hexdigest().upper(),
            DERIVATION_SOURCE: hashlib.sha256((HERE / DERIVATION_SOURCE).read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_"
        f"{args.start}_{min(len(branches), args.start + args.count)}_g1_bernstein_20260830.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "output": output.name,
        "checked": report["checked"],
        "passed": report["passed"],
        "failed": report["failed"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
