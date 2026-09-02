#!/usr/bin/env python3
"""Independent FLINT audit of the 630 new large-core cells through order 34."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import sympy as sp

from audit_rank5_ratio_payment_large_core_grid_root import audit_pair


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank5_ratio_payment_through34_large_core_grid_exact_root_20260826.json"
OLD_AUDIT = HERE / "rank5_ratio_payment_through28_large_core_grid_independent_audit_root_20260826.json"
OUTPUT = HERE / "rank5_ratio_payment_through34_large_core_extension_independent_audit_root_20260826.json"
CHECKPOINT = HERE / "rank5_ratio_payment_through34_large_core_extension_independent_audit_root_20260826.checkpoint.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pairs", nargs="*")
    parser.add_argument("--maximum-depth", type=int, default=28)
    parser.add_argument("--test-only", action="store_true")
    args = parser.parse_args()
    all_pairs = [(core, siblings) for core in range(20, 33) for siblings in range(33 - core)]
    old_pairs = {(core, siblings) for core in range(20, 27) for siblings in range(27 - core)}
    extension_pairs = [pair for pair in all_pairs if pair not in old_pairs]
    assert len(all_pairs) == 91 and len(old_pairs) == 28 and len(extension_pairs) == 63
    pairs = (
        [tuple(map(int, item.split(":"))) for item in args.pairs]
        if args.pairs
        else extension_pairs
    )
    assert pairs and len(pairs) == len(set(pairs))
    assert all(pair in extension_pairs for pair in pairs)

    started = time.perf_counter()
    current_source_hash = sha256(Path(__file__))
    use_checkpoint = not args.pairs and not args.test_only
    rows = []
    completed_pairs = set()
    if use_checkpoint and CHECKPOINT.exists():
        checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (
            checkpoint.get("source_sha256") == current_source_hash
            and checkpoint.get("maximum_depth") == args.maximum_depth
        ):
            rows = checkpoint["cells"]
            grouped = {}
            for row in rows:
                key = (row["core_order"], row["sibling_isolates"])
                grouped.setdefault(key, []).append(row)
            assert all(len(group) == 10 for group in grouped.values())
            completed_pairs = set(grouped)
            print("RESUME_PAIRS", len(completed_pairs), flush=True)

    for core, siblings in pairs:
        if (core, siblings) in completed_pairs:
            continue
        rows.extend(audit_pair(core, siblings, args.maximum_depth))
        if use_checkpoint:
            temporary = CHECKPOINT.with_suffix(CHECKPOINT.suffix + ".tmp")
            temporary.write_text(
                json.dumps({
                    "source_sha256": current_source_hash,
                    "maximum_depth": args.maximum_depth,
                    "cells": rows,
                }, indent=2) + "\n",
                encoding="utf-8",
            )
            os.replace(temporary, CHECKPOINT)

    assert all(sp.Rational(row["terminal_minimum"]) >= 0 for row in rows)
    if args.test_only:
        print("PASS_TEST_ONLY", len(rows))
        return 0
    assert pairs == extension_pairs and len(rows) == 630

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH34_LARGE_CORE_GRID"
    primary_index = {
        (row["core_order"], row["sibling_isolates"], row["gamma_branch"], row["root_region"]): row
        for row in primary["cells"]
    }
    assert len(primary_index) == 910
    for row in rows:
        key = (row["core_order"], row["sibling_isolates"], row["gamma_branch"], row["root_region"])
        reference = primary_index[key]
        assert row["degrees"] == reference["degrees"]
        assert row["initial_minimum"] == reference["initial_minimum"]
        assert row["initial_minimum_index"] == reference["initial_minimum_index"]
        assert row["denominator_degrees"] == reference["denominator_degrees"]
        assert row["denominator_minimum"] == reference["denominator_minimum"]

    old = json.loads(OLD_AUDIT.read_text(encoding="utf-8"))
    assert old["status"] == "PASS_INDEPENDENT_RANK5_RATIO_PAYMENT_LARGE_CORE_GRID_AUDIT"
    assert old["coverage"]["analytic_cells"] == 280
    payload = {
        "schema": "rank5-ratio-payment-through34-large-core-extension-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK5_RATIO_PAYMENT_THROUGH34_LARGE_CORE_EXTENSION_AUDIT",
        "method": (
            "The 630 cells newly required for orders 29 through 34 were rebuilt "
            "with python-flint multivariate polynomials, a FLINT matrix "
            "Bernstein transform, and a local exact de Casteljau subdivider. "
            "Together with the sealed 280-cell through-28 audit, this covers "
            "all 910 analytic cells through order 34."
        ),
        "coverage": {
            "extension_core_sibling_pairs": len(pairs),
            "extension_analytic_cells": len(rows),
            "prior_analytic_cells": 280,
            "combined_analytic_cells": 910,
            "negative_terminal_minima": 0,
            "matching_primary_initial_certificates": len(rows),
        },
        "cells": rows,
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": {
            PRIMARY.name: sha256(PRIMARY),
            OLD_AUDIT.name: sha256(OLD_AUDIT),
            "audit_rank5_ratio_payment_large_core_grid_root.py": sha256(
                HERE / "audit_rank5_ratio_payment_large_core_grid_root.py"
            ),
            "tensor_bernstein_flint_matrix_root.py": sha256(
                HERE / "tensor_bernstein_flint_matrix_root.py"
            ),
        },
        "source_sha256": current_source_hash,
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("CELLS", len(rows))
    print("SOURCE", current_source_hash)
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
