#!/usr/bin/env python3
"""Fail-closed import of sealed legacy ray batches into a quotient checkpoint.

Run only after the original controller and scanner have exited.  The importer
reads each input as one immutable byte snapshot with a caller-supplied SHA-256,
reconstructs the exact batch-local quotient mapping, and preserves every legacy
raw fingerprint and statistic.  Imported batches are labelled exhaustive raw
evaluation (zero claimed savings); a later quotient scanner resumes only the
unprocessed suffix.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from dataclasses import replace
from pathlib import Path

import numpy as np

import run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent as driver
import run_rank8_cuda_opposite_half_message_quotient_driver_agent as quotient
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center
import scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent as scanner


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py":
        "73B6757090E16C7B916F2A646D26B9E69F0FB0566843D2694404DF02BFE0B60B",
    "run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent.py":
        "642DBA783AA5F3AF38A7360AD811036317145406743C9C0B10CE1BA177135DCE",
    "run_rank8_cuda_opposite_half_message_quotient_chunked_engine_agent.py":
        "EF1B9D19E20424564AC51F8CF399612480772581E9F6B07C6B5B78573641E108",
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py":
        "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_all_layouts_exact_agent_20260825.json":
        "DFAF77DFFF213F5C0B1D12CA6EEEDCFB4B252493B6E452D2A93D5249CFADA2F3",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_full_batch_qualification_agent_20260825.json":
        "49E6DBCA6E7039E090F8D82D118AB94C4E4CB3F5174E01AA3B1E601D6EE3C3B9",
}


def sha256_bytes(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest().upper()


def sha256(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def immutable_json(path: Path, expected: str) -> tuple[dict, str]:
    body = path.read_bytes()
    actual = sha256_bytes(body)
    assert actual == expected.upper(), (path, actual, expected)
    return json.loads(body.decode("utf-8")), actual


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def config_for(layout_name: str, dependencies: dict[str, str]) -> driver.Config:
    layout = scanner.LAYOUTS[layout_name]
    return driver.Config(
        root=ROOT,
        checkpoint=ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{layout_name}_"
            "cuda_quotient_rays_checkpoint_agent_20260825.json"
        ),
        output=ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{layout_name}_"
            "cuda_quotient_rays_exact_agent_20260825.json"
        ),
        source=ROOT / (
            "scan_rank8_delta03_e5_five_cubic_path_internal_"
            "cuda_quotient_rays_agent.py"
        ),
        schema=(
            f"rank8-delta03-e5-five-cubic-path-{layout_name.replace('_', '-')}-"
            "cuda-rays"
        ),
        status=layout.status,
        root_orbit=f"five_cubic_path:{layout_name}",
        near_states=layout.near_states,
        near_long_value=7,
        tail_states=layout.tail_states,
        tail_long_value=7,
        total_patterns=layout.total,
        expected_rays=layout.rays,
        expected_all_short=layout.all_short,
        expected_finite=layout.finite,
        expected_order27=layout.order27,
        batch_size=750_000,
        opposite_start=layout.opposite_start,
        dependencies=dependencies,
        group_capacity=20_000,
        member_capacity=40_000,
    )


def validate_legacy(
    layout_name: str, state: dict, total_patterns: int
) -> None:
    expected_schema = (
        f"rank8-delta03-e5-five-cubic-path-{layout_name.replace('_', '-')}-"
        "cuda-rays-agent-checkpoint-v1"
    )
    assert state["schema"] == expected_schema
    assert state["batch_size"] == 750_000
    for name, expected in state["dependencies"].items():
        assert sha256(ROOT / name) == expected
    cursor = 0
    totals = {key: 0 for key in driver.LEGACY_TOTAL_KEYS}
    for batch in state["batches"]:
        assert batch["start"] == cursor and batch["stop"] > cursor
        assert batch["patterns"] == batch["stop"] - batch["start"]
        assert batch["stop"] <= total_patterns
        assert len(batch["residue_fingerprint_sha256"]) == 64
        for key in totals:
            totals[key] += int(batch[key])
        cursor = batch["stop"]
    assert state["cursor"] == cursor <= total_patterns
    assert state["totals"] == totals


def reconstruct_batch(
    config: driver.Config,
    layout,
    legacy_batch: dict,
    halves: np.ndarray,
    sums: np.ndarray,
    masks: np.ndarray,
    first_long: np.ndarray,
) -> tuple[quotient.QuotientBatch, tuple[int, int, int]]:
    rows, varying, shifts, all_short, finite, order27 = (
        layout.row_adapter.make_rows(
            config,
            legacy_batch["start"],
            legacy_batch["stop"],
            halves,
            sums,
            masks,
            first_long,
        )
    )
    assert len(rows) == legacy_batch["rays"]
    assert all_short == legacy_batch["all_short"]
    assert finite == legacy_batch["finite"]
    assert order27 == legacy_batch["order27"]
    grouped = quotient.quotient_rows(
        rows, varying, shifts, config.opposite_start
    )
    return grouped, (all_short, finite, order27)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, choices=tuple(scanner.LAYOUTS))
    parser.add_argument("--expected-legacy-checkpoint-sha256", required=True)
    parser.add_argument(
        "--expected-quotient-checkpoint-sha256",
        required=True,
        help="Existing quotient checkpoint SHA-256 or ABSENT",
    )
    parser.add_argument("--max-import-batches", type=int)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--legacy-checkpoint-path")
    parser.add_argument("--quotient-checkpoint-path")
    parser.add_argument("--output-report-path")
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    scanner_dependencies = {
        name: sha256(ROOT / name) for name in scanner.EXPECTED
    }
    assert scanner_dependencies == scanner.EXPECTED
    config = config_for(args.layout, scanner_dependencies)
    layout = scanner.LAYOUTS[args.layout]
    legacy_path = (
        Path(args.legacy_checkpoint_path).resolve()
        if args.legacy_checkpoint_path
        else ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{args.layout}_"
            "cuda_rays_checkpoint_agent_20260825.json"
        )
    )
    quotient_path = (
        Path(args.quotient_checkpoint_path).resolve()
        if args.quotient_checkpoint_path
        else config.checkpoint
    )
    config = replace(config, checkpoint=quotient_path)
    legacy, legacy_hash = immutable_json(
        legacy_path, args.expected_legacy_checkpoint_sha256
    )
    validate_legacy(args.layout, legacy, layout.total)

    expected_quotient = args.expected_quotient_checkpoint_sha256.upper()
    if expected_quotient == "ABSENT":
        assert not quotient_path.exists()
        state = driver.fresh(config)
        quotient_hash_before = None
    else:
        quotient_snapshot, quotient_hash_before = immutable_json(
            quotient_path, expected_quotient
        )
        state = driver.load(config)
        assert state == quotient_snapshot
        assert sha256(quotient_path) == quotient_hash_before

    halves, sums, masks = center.half_table()
    first_long = np.full(1 << 12, -1, dtype=np.int8)
    for mask in range(1, 1 << 12):
        first_long[mask] = (mask & -mask).bit_length() - 1
    imported = 0
    overlap_verified = 0
    existing_by_start = {batch["start"]: batch for batch in state["batches"]}
    for legacy_batch in legacy["batches"]:
        grouped, _ = reconstruct_batch(
            config,
            layout,
            legacy_batch,
            halves,
            sums,
            masks,
            first_long,
        )
        existing = existing_by_start.get(legacy_batch["start"])
        if existing is not None:
            assert existing["stop"] == legacy_batch["stop"]
            for key in driver.LEGACY_TOTAL_KEYS:
                assert existing[key] == legacy_batch[key]
            assert existing["residue_fingerprint_sha256"] == (
                legacy_batch["residue_fingerprint_sha256"]
            )
            assert existing["raw_to_group_mapping_sha256"] == (
                grouped.mapping_sha256
            )
            assert existing["raw_multiplicity_sum"] == grouped.raw_rays
            overlap_verified += 1
            continue
        if legacy_batch["start"] < state["cursor"]:
            raise AssertionError("non-aligned quotient/legacy checkpoint overlap")
        if legacy_batch["start"] > state["cursor"]:
            break
        if (
            args.max_import_batches is not None
            and imported >= args.max_import_batches
        ):
            break
        imported_batch = {
            **legacy_batch,
            "formula_evaluations": legacy_batch["rays"],
            "formula_evaluations_saved": 0,
            "static_raw_rows": grouped.static_raw_rows,
            "dynamic_raw_rows": grouped.dynamic_raw_rows,
            "gpu_chunks": 0,
            "raw_multiplicity_sum": grouped.raw_rays,
            "maximum_group_multiplicity": int(
                grouped.group_multiplicities.max(initial=0)
            ),
            "raw_to_group_mapping_sha256": grouped.mapping_sha256,
            "execution_mode": "IMPORTED_SEALED_LEGACY_EXHAUSTIVE_RAW_BATCH",
            "legacy_checkpoint_snapshot_sha256": legacy_hash,
        }
        state["batches"].append(imported_batch)
        state["cursor"] = imported_batch["stop"]
        for key in state["totals"]:
            state["totals"][key] += imported_batch[key]
        for key in state["quotient_totals"]:
            state["quotient_totals"][key] += imported_batch[key]
        existing_by_start[imported_batch["start"]] = imported_batch
        imported += 1

    assert sha256(legacy_path) == legacy_hash
    if quotient_hash_before is not None:
        assert sha256(quotient_path) == quotient_hash_before
    output_report = (
        Path(args.output_report_path).resolve()
        if args.output_report_path
        else ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{args.layout}_"
            "legacy_to_quotient_checkpoint_import_agent_20260825.json"
        )
    )
    if not args.verify_only and imported:
        atomic_json(quotient_path, state)
        quotient_hash_after = sha256(quotient_path)
    else:
        quotient_hash_after = quotient_hash_before
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-legacy-to-quotient-"
            "checkpoint-import-agent-v1"
        ),
        "status": (
            "PASS_FAIL_CLOSED_LEGACY_PREFIX_VERIFIED_FOR_QUOTIENT_"
            "RECOVERY_NO_PROOF_SCOPE_CHANGE"
        ),
        "layout": args.layout,
        "verify_only": args.verify_only,
        "legacy_checkpoint": str(legacy_path),
        "legacy_checkpoint_snapshot_sha256": legacy_hash,
        "legacy_cursor": legacy["cursor"],
        "quotient_checkpoint": str(quotient_path),
        "quotient_checkpoint_sha256_before": quotient_hash_before,
        "quotient_checkpoint_sha256_after": quotient_hash_after,
        "quotient_cursor_after": state["cursor"],
        "overlap_batches_independently_reconstructed_and_verified": (
            overlap_verified
        ),
        "legacy_batches_imported": imported,
        "imported_batches_claim_zero_formula_savings": True,
        "legacy_raw_statistics_and_fingerprints_preserved": True,
        "raw_to_group_mappings_reconstructed_for_suffix_resume": True,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Recovery metadata bridge only. Imported legacy batches remain "
            "exhaustive raw evidence; no quotient savings or proof credit is "
            "retroactively claimed. Caller must verify all writers exited."
        ),
    }
    atomic_json(output_report, payload)
    print(payload["status"])
    print("OVERLAP", overlap_verified)
    print("IMPORTED", imported)
    print("CURSOR", state["cursor"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output_report))


if __name__ == "__main__":
    main()
