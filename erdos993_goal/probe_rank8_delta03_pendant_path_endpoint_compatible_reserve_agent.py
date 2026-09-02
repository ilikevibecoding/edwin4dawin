#!/usr/bin/env python3
"""Exact pendant-endpoint probe on the induced-subforest reserve cone.

The attachment message in the relaxed endpoint probe satisfies an additional
necessary compatibility condition for every rooted graph component.  If E is
the attachment-root-excluded forest and J=xK is the attachment-root-included
term, then K is an induced subforest of E.  Hence

    e_k = j_(k+1) + r_k,  r_k >= 0,  1 <= k <= 7.

This script substitutes those exact nonnegative reserves before testing the
coefficient signs of each internal-pendant-root residual minus each endpoint
residual.  Mixed signs remain only a method obstruction; this is not an orbit
certificate unless every required cell passes and an independent derivation
is supplied.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import probe_rank8_delta03_pendant_path_endpoint_symbolic_v2_agent as sparse


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_pendant_path_endpoint_compatible_reserve_probe_"
    "agent_20260825.json"
)
VARIABLES = tuple(
    [f"j{index}" for index in range(2, 9)]
    + [f"r{index}" for index in range(1, 8)]
    + ["e8"]
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def configure_sparse_ring() -> None:
    sparse.VARIABLES = VARIABLES
    sparse.VARIABLE_COUNT = len(VARIABLES)
    sparse.ZERO_MONOMIAL = (0,) * len(VARIABLES)
    # j2..j8 occupy 0..6; r1..r7 occupy 7..13; e8 occupies 14.
    sparse.E = [sparse.constant(1)]
    sparse.E.extend(
        sparse.add(sparse.variable(rank - 1), sparse.variable(rank + 6))
        for rank in range(1, 8)
    )
    sparse.E.append(sparse.variable(14))
    sparse.J = [{}, sparse.constant(1)] + [
        sparse.variable(index) for index in range(7)
    ]
    assert len(sparse.E) == len(sparse.J) == 9


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-length", type=int, default=20)
    args = parser.parse_args()
    assert 2 <= args.max_length <= 80
    configure_sparse_ring()

    rows = []
    pass_counts = {
        "branch_endpoint": [0] * 4,
        "leaf_endpoint": [0] * 4,
        "either_endpoint": [0] * 4,
    }
    total_cells = [0] * 4
    sanity_values = tuple(range(2, 2 + len(VARIABLES)))
    sanity_checks = 0
    for length in range(2, args.max_length + 1):
        core = sparse.attached_prefix(length)
        branch_deleted = sparse.convolve(sparse.E, sparse.path(length))
        leaf_deleted = sparse.attached_prefix(length - 1)
        branch_delta = sparse.deltas(core, branch_deleted)
        leaf_delta = sparse.deltas(core, leaf_deleted)
        for position in range(1, length):
            internal_deleted = sparse.convolve(
                sparse.attached_prefix(position - 1),
                sparse.path(length - position),
            )
            internal_delta = sparse.deltas(core, internal_deleted)
            if position == 1:
                numeric_core = sparse.numeric_sequence(core, sanity_values)
                numeric_deleted = sparse.numeric_sequence(
                    internal_deleted, sanity_values
                )
                for siblings in range(1, 5):
                    assert sparse.evaluate(
                        sparse.residual(core, internal_deleted, siblings),
                        sanity_values,
                    ) == sparse.numeric_residual(
                        numeric_core, numeric_deleted, siblings
                    )
                    sanity_checks += 1
            comparisons = []
            for rank in range(4):
                branch = sparse.record(
                    sparse.subtract(
                        internal_delta[rank], branch_delta[rank]
                    )
                )
                leaf = sparse.record(
                    sparse.subtract(internal_delta[rank], leaf_delta[rank])
                )
                branch_pass = branch["negative"] == 0
                leaf_pass = leaf["negative"] == 0
                pass_counts["branch_endpoint"][rank] += int(branch_pass)
                pass_counts["leaf_endpoint"][rank] += int(leaf_pass)
                pass_counts["either_endpoint"][rank] += int(
                    branch_pass or leaf_pass
                )
                total_cells[rank] += 1
                comparisons.append(
                    {
                        "rank": rank,
                        "branch_endpoint_difference": branch,
                        "leaf_endpoint_difference": leaf,
                        "coefficientwise_dominated_by_either_endpoint": (
                            branch_pass or leaf_pass
                        ),
                    }
                )
            rows.append(
                {
                    "length": length,
                    "internal_position": position,
                    "comparisons": comparisons,
                }
            )

    payload = {
        "schema": (
            "rank8-delta03-pendant-path-endpoint-compatible-reserve-"
            "probe-agent-v1"
        ),
        "status": "PROBE_ONLY",
        "method": "pure integer sparse polynomials after induced-subforest reserve substitution",
        "path_lengths": [2, args.max_length],
        "internal_root_cells": len(rows),
        "generators": list(VARIABLES),
        "structural_substitutions": {
            "e0": 1,
            "j0": 0,
            "j1": 1,
            "e_k_for_1_through_7": "j_(k+1)+r_k",
            "reserve_guard": "r_k>=0 because K is an induced subforest of E",
            "e8": "independent nonnegative top coefficient",
        },
        "numeric_sparse_replay_checks": sanity_checks,
        "pass_counts_by_delta": pass_counts,
        "total_cells_by_delta": total_cells,
        "all_cells_coefficientwise_dominated_by_either_endpoint": [
            pass_counts["either_endpoint"][rank] == total_cells[rank]
            for rank in range(4)
        ],
        "rows": rows,
        "immutable_input_hashes": {
            "probe_rank8_delta03_pendant_path_endpoint_symbolic_v2_agent.py": (
                sha256(
                    ROOT
                    / "probe_rank8_delta03_pendant_path_endpoint_symbolic_v2_agent.py"
                )
            )
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exact necessary induced-subforest reserve cone for the listed "
            "finite path lengths only. Mixed coefficients are method "
            "obstructions, not tree counterexamples. No all-length or orbit "
            "credit is asserted."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("PASS_COUNTS", json.dumps(pass_counts, sort_keys=True))
    print("TOTAL", total_cells)
    print("ALL", payload["all_cells_coefficientwise_dominated_by_either_endpoint"])
    print("SANITY", sanity_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
