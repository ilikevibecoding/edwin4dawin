#!/usr/bin/env python3
"""Independent raw-domain/multiplicity audit for quotient ray checkpoints.

The production quotient implementation is deliberately not imported.  This
auditor rebuilds the canonical half table, decodes the pinned representative
arrays, regenerates every raw batch through the legacy row adapter, and uses a
separate sort/search construction for the raw-to-group map.  A final PASS is
written only after the immutable quotient checkpoint covers the full original
domain and every stored batch mapping/multiplicity has been replayed.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
from pathlib import Path
from types import SimpleNamespace

import numpy as np

from rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent import (
    LAYOUTS,
    static_layout_hashes,
)


ROOT = Path(__file__).resolve().parent
CONFIG_SOURCE = (
    "rank8_delta03_e5_five_cubic_path_internal_quotient_"
    "full_stage_config_agent.py"
)
CERTIFICATE_NAME = (
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_"
    "exact_agent_20260825.json"
)
LITERAL_AUDIT_NAME = (
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_"
    "literal_audit_agent_20260825.json"
)
EXPECTED_SHARED = {
    CONFIG_SOURCE:
        "7A154586039D96D2BCFB9C82267D9854D2206361A65185EB1A6373C54D78BCAE",
    CERTIFICATE_NAME:
        "E0E9C25CA2725C9C4A7B2FEBFAC7BB4D35BCB36FD12DBEF118430834CFB8FDAB",
    LITERAL_AUDIT_NAME:
        "DC7F2800B649AF48BC27C7EE63CCF858A61E8E5C06B5A8B973730FD8298F05B9",
    "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py":
        "73B6757090E16C7B916F2A646D26B9E69F0FB0566843D2694404DF02BFE0B60B",
}
MAPPING_ARRAYS_SHA256 = (
    "0DAE5ECEA41CD11D1A8EE0F5FE466C5A494A97A40F79A13931F9E0D4C1B03C1A"
)
MAXIMA = np.asarray((8, 7, 8, 7, 7), dtype=np.int32)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def half_table() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rows = []
    for outer_low in range(1, 8):
        for outer_high in range(outer_low, 8):
            for middle_outer in range(1, 9):
                for middle_pendant in range(1, 8):
                    for center_middle in range(1, 9):
                        rows.append((
                            center_middle,
                            middle_pendant,
                            middle_outer,
                            outer_low,
                            outer_high,
                        ))
    table = np.asarray(rows, dtype=np.int32)
    assert table.shape == (12_544, 5)
    masks = (
        (table[:, 0] == 8).astype(np.uint16)
        | ((table[:, 1] == 7).astype(np.uint16) << 1)
        | ((table[:, 2] == 8).astype(np.uint16) << 2)
        | ((table[:, 3] == 7).astype(np.uint16) << 3)
        | ((table[:, 4] == 7).astype(np.uint16) << 4)
    )
    return table, table.sum(axis=1, dtype=np.int32), masks


def mapping_digest(certificate: dict) -> str:
    digest = hashlib.sha256()
    for name in (
        "static_representative_by_half_index",
        "static_class_size_by_half_index",
        "dynamic_representative_by_half_index",
        "dynamic_class_size_by_half_index",
    ):
        values = np.asarray(certificate[name], dtype="<i4")
        assert values.shape == (12_544,)
        digest.update(values.tobytes(order="C"))
    return digest.hexdigest().upper()


def state_codes(rows: np.ndarray) -> np.ndarray:
    values = rows.astype(np.int64, copy=False)
    codes = values[:, 0]
    codes = codes * 8 + values[:, 1]
    codes = codes * 9 + values[:, 2]
    codes = codes * 8 + values[:, 3]
    codes = codes * 8 + values[:, 4]
    return codes


def packed_keys(
    rows: np.ndarray, varying: np.ndarray, shifts: np.ndarray
) -> np.ndarray:
    assert rows.ndim == 2 and rows.shape[1] == 12
    keys = np.zeros(len(rows), dtype=np.uint64)
    for column in range(12):
        assert np.all((rows[:, column] >= 0) & (rows[:, column] <= 15))
        keys |= rows[:, column].astype(np.uint64) << np.uint64(4 * column)
    assert np.all((varying >= 0) & (varying <= 15))
    assert np.all((shifts >= 0) & (shifts <= 15))
    keys |= varying.astype(np.uint64) << np.uint64(48)
    keys |= shifts.astype(np.uint64) << np.uint64(52)
    return keys


def independent_mapping(
    rows: np.ndarray,
    varying: np.ndarray,
    shifts: np.ndarray,
    opposite_start: int,
    halves: np.ndarray,
    static: np.ndarray,
    dynamic: np.ndarray,
    first_long: np.ndarray,
    lookup: np.ndarray,
) -> dict:
    raw_rows = np.asarray(rows, dtype=np.int32)
    raw_varying = np.asarray(varying, dtype=np.int32)
    raw_shifts = np.asarray(shifts, dtype=np.int32)
    opposite_stop = opposite_start + 5
    codes = state_codes(raw_rows[:, opposite_start:opposite_stop])
    half_indices = lookup[codes]
    assert np.all(half_indices >= 0)
    is_dynamic = (
        (raw_varying >= opposite_start) & (raw_varying < opposite_stop)
    )
    representatives = static[half_indices].copy()
    representatives[is_dynamic] = dynamic[half_indices[is_dynamic]]
    assert np.all(representatives >= 0)
    normalized = raw_rows.copy()
    normalized[:, opposite_start:opposite_stop] = halves[representatives]
    assert np.array_equal(
        normalized.sum(axis=1, dtype=np.int32),
        raw_rows.sum(axis=1, dtype=np.int32),
    )
    normalized_varying = raw_varying.copy()
    normalized_varying[is_dynamic] = (
        opposite_start + first_long[representatives[is_dynamic]]
    )
    keys = packed_keys(normalized, normalized_varying, raw_shifts)

    # This is intentionally different from production's np.unique route.
    sorted_keys = np.sort(keys, kind="stable")
    starts = np.empty(len(sorted_keys), dtype=np.bool_)
    if len(sorted_keys):
        starts[0] = True
        starts[1:] = sorted_keys[1:] != sorted_keys[:-1]
        unique_keys = sorted_keys[starts]
        inverse = np.searchsorted(unique_keys, keys).astype(np.int32)
        counts = np.bincount(inverse, minlength=len(unique_keys)).astype(np.int32)
    else:
        unique_keys = np.empty(0, dtype=np.uint64)
        inverse = np.empty(0, dtype=np.int32)
        counts = np.empty(0, dtype=np.int32)
    assert np.array_equal(unique_keys[inverse], keys)
    assert int(counts.sum(dtype=np.int64)) == len(raw_rows)
    digest = hashlib.sha256()
    digest.update(inverse.astype("<i4", copy=False).tobytes(order="C"))
    digest.update(unique_keys.astype("<u8", copy=False).tobytes(order="C"))
    digest.update(counts.astype("<i4", copy=False).tobytes(order="C"))
    return {
        "raw_rays": len(raw_rows),
        "groups": len(unique_keys),
        "static_raw_rows": int(np.count_nonzero(~is_dynamic)),
        "dynamic_raw_rows": int(np.count_nonzero(is_dynamic)),
        "maximum_group_multiplicity": int(counts.max(initial=0)),
        "mapping_sha256": digest.hexdigest().upper(),
    }


def validate_quotient_checkpoint(layout, state: dict) -> None:
    assert state["schema"] == (
        f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
        "-cuda-rays-quotient-checkpoint-v1"
    )
    assert state["batch_size"] == 750_000
    assert state["opposite_start"] == layout.opposite_start
    assert state["quotient_mapping_arrays_sha256"] == MAPPING_ARRAYS_SHA256
    cursor = 0
    totals = {key: 0 for key in state["totals"]}
    quotient_totals = {key: 0 for key in state["quotient_totals"]}
    for batch in state["batches"]:
        assert batch["start"] == cursor and batch["stop"] > cursor
        assert batch["patterns"] == batch["stop"] - batch["start"]
        assert batch["raw_multiplicity_sum"] == batch["rays"]
        assert batch["static_raw_rows"] + batch["dynamic_raw_rows"] == batch["rays"]
        assert len(batch["raw_to_group_mapping_sha256"]) == 64
        for key in totals:
            totals[key] += batch[key]
        for key in quotient_totals:
            quotient_totals[key] += batch[key]
        cursor = batch["stop"]
    assert state["cursor"] == cursor
    assert state["totals"] == totals
    assert state["quotient_totals"] == quotient_totals


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, choices=tuple(LAYOUTS))
    parser.add_argument(
        "--expected-quotient-ray-checkpoint-sha256", required=True
    )
    parser.add_argument("--max-batches", type=int)
    parser.add_argument("--audit-checkpoint-path")
    parser.add_argument("--output-path")
    parser.add_argument("--qualification-output-path")
    args = parser.parse_args()
    assert args.max_batches is None or args.max_batches >= 0
    layout = LAYOUTS[args.layout]
    static_expected = {**EXPECTED_SHARED, **static_layout_hashes(layout)}
    assert {name: sha256(ROOT / name) for name in static_expected} == static_expected

    quotient_path = ROOT / layout.quotient_ray_checkpoint_name
    quotient_hash = sha256(quotient_path)
    assert quotient_hash == args.expected_quotient_ray_checkpoint_sha256.upper()
    quotient_state = load_json(quotient_path)
    validate_quotient_checkpoint(layout, quotient_state)
    for mapping_name in ("dependencies", "driver_immutable_input_hashes"):
        for name, expected in quotient_state[mapping_name].items():
            assert sha256(ROOT / name) == expected, name

    certificate = load_json(ROOT / CERTIFICATE_NAME)
    literal = load_json(ROOT / LITERAL_AUDIT_NAME)
    assert certificate["status"] == (
        "PASS_EXACT_CANONICAL_OPPOSITE_HALF_MESSAGE_QUOTIENT_"
        "NO_ORBIT_SIGN_CREDIT"
    )
    assert literal["status"] == (
        "PASS_INDEPENDENT_LITERAL_TREE_DP_OPPOSITE_HALF_MESSAGE_"
        "QUOTIENT_NO_ORBIT_SIGN_CREDIT"
    )
    assert mapping_digest(certificate) == MAPPING_ARRAYS_SHA256
    assert literal["mapping_arrays_sha256"] == MAPPING_ARRAYS_SHA256
    halves, half_sums, half_masks = half_table()
    static = np.asarray(
        certificate["static_representative_by_half_index"], dtype=np.int32
    )
    dynamic = np.asarray(
        certificate["dynamic_representative_by_half_index"], dtype=np.int32
    )
    first_long = np.full(len(halves), -1, dtype=np.int8)
    for index, row in enumerate(halves):
        positions = np.flatnonzero(row == MAXIMA)
        if len(positions):
            first_long[index] = int(positions[0])
    assert np.array_equal(dynamic >= 0, first_long >= 0)
    codes = state_codes(halves)
    lookup = np.full(int(codes.max()) + 1, -1, dtype=np.int32)
    assert len(np.unique(codes)) == len(codes)
    lookup[codes] = np.arange(len(halves), dtype=np.int32)
    first_long_mask = np.full(1 << 12, -1, dtype=np.int8)
    for mask in range(1, 1 << 12):
        first_long_mask[mask] = (mask & -mask).bit_length() - 1

    row_adapter = importlib.import_module(layout.ray_adapter_module)
    row_config = SimpleNamespace(
        near_states=layout.near_states,
        near_long_value=7,
        tail_states=layout.tail_states,
        tail_long_value=7,
    )
    checkpoint_path = (
        Path(args.audit_checkpoint_path).resolve()
        if args.audit_checkpoint_path
        else ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
            "raw_multiplicity_audit_checkpoint_agent_20260825.json"
        )
    )
    output_path = (
        Path(args.output_path).resolve()
        if args.output_path
        else ROOT / (
            f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
            "raw_multiplicity_audit_agent_20260825.json"
        )
    )
    dependencies = {
        **static_expected,
        layout.quotient_ray_checkpoint_name: quotient_hash,
    }
    fresh = {
        "schema": (
            f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
            "-cuda-quotient-raw-multiplicity-audit-checkpoint-v1"
        ),
        "layout": layout.name,
        "dependencies": dependencies,
        "quotient_checkpoint_cursor": quotient_state["cursor"],
        "next_batch_index": 0,
        "batches": [],
        "totals": {
            "patterns": 0,
            "raw_rays": 0,
            "canonical_groups": 0,
            "static_raw_rows": 0,
            "dynamic_raw_rows": 0,
            "imported_legacy_raw_rays": 0,
            "production_quotient_raw_rays": 0,
        },
    }
    if checkpoint_path.exists():
        state = load_json(checkpoint_path)
        for key in (
            "schema", "layout", "dependencies", "quotient_checkpoint_cursor"
        ):
            assert state[key] == fresh[key]
        assert state["next_batch_index"] == len(state["batches"])
    else:
        state = fresh

    completed = 0
    while state["next_batch_index"] < len(quotient_state["batches"]):
        if args.max_batches is not None and completed >= args.max_batches:
            break
        batch_index = state["next_batch_index"]
        expected = quotient_state["batches"][batch_index]
        rows, varying, shifts, all_short, finite, order27 = row_adapter.make_rows(
            row_config,
            expected["start"],
            expected["stop"],
            halves,
            half_sums,
            half_masks,
            first_long_mask,
        )
        replay = independent_mapping(
            rows,
            varying,
            shifts,
            layout.opposite_start,
            halves,
            static,
            dynamic,
            first_long,
            lookup,
        )
        assert expected["patterns"] == expected["stop"] - expected["start"]
        assert expected["rays"] == replay["raw_rays"]
        assert expected["all_short"] == all_short
        assert expected["finite"] == finite
        assert expected["order27"] == order27
        assert expected["raw_multiplicity_sum"] == replay["raw_rays"]
        assert expected["static_raw_rows"] == replay["static_raw_rows"]
        assert expected["dynamic_raw_rows"] == replay["dynamic_raw_rows"]
        assert expected["maximum_group_multiplicity"] == replay[
            "maximum_group_multiplicity"
        ]
        assert expected["raw_to_group_mapping_sha256"] == replay[
            "mapping_sha256"
        ]
        imported = expected.get("execution_mode") == (
            "IMPORTED_SEALED_LEGACY_EXHAUSTIVE_RAW_BATCH"
        )
        if imported:
            assert expected["formula_evaluations"] == replay["raw_rays"]
            assert expected["formula_evaluations_saved"] == 0
        else:
            assert expected["formula_evaluations"] == replay["groups"]
            assert expected["formula_evaluations_saved"] == (
                replay["raw_rays"] - replay["groups"]
            )
        audit_batch = {
            "index": batch_index,
            "start": expected["start"],
            "stop": expected["stop"],
            "patterns": expected["patterns"],
            **replay,
            "execution_mode": (
                "IMPORTED_SEALED_LEGACY_EXHAUSTIVE_RAW_BATCH"
                if imported else "PRODUCTION_QUOTIENT_GROUPED_BATCH"
            ),
        }
        state["batches"].append(audit_batch)
        state["next_batch_index"] += 1
        state["totals"]["patterns"] += audit_batch["patterns"]
        state["totals"]["raw_rays"] += replay["raw_rays"]
        state["totals"]["canonical_groups"] += replay["groups"]
        state["totals"]["static_raw_rows"] += replay["static_raw_rows"]
        state["totals"]["dynamic_raw_rows"] += replay["dynamic_raw_rows"]
        mode_key = (
            "imported_legacy_raw_rays" if imported
            else "production_quotient_raw_rays"
        )
        state["totals"][mode_key] += replay["raw_rays"]
        atomic_json(checkpoint_path, state)
        completed += 1
        if completed == 1 or completed % 25 == 0:
            print(
                "RAW_MULTIPLICITY_BATCH_PASS",
                batch_index,
                expected["start"],
                expected["stop"],
                replay["raw_rays"],
                replay["groups"],
                flush=True,
            )

    # Fail if an allegedly immutable caller input changed during replay.
    assert sha256(quotient_path) == quotient_hash
    audit_complete = (
        quotient_state["cursor"] == layout.patterns
        and state["next_batch_index"] == len(quotient_state["batches"])
    )
    if audit_complete:
        assert state["totals"]["patterns"] == layout.patterns
        assert state["totals"]["raw_rays"] == layout.rays
        assert state["totals"]["static_raw_rows"] + state["totals"][
            "dynamic_raw_rows"
        ] == layout.rays
        assert state["totals"]["imported_legacy_raw_rays"] + state[
            "totals"
        ]["production_quotient_raw_rays"] == layout.rays
        payload = {
            "schema": (
                f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
                "-cuda-quotient-raw-multiplicity-audit-exact-v1"
            ),
            "status": (
                "PASS_INDEPENDENT_RAW_MULTIPLICITY_AUDIT_E5_FIVE_CUBIC_PATH_"
                f"{layout.token}_QUOTIENT_RAYS"
            ),
            "root_orbit": layout.root_orbit,
            "totals": state["totals"],
            "audited_batches": len(state["batches"]),
            "mapping_arrays_sha256": MAPPING_ARRAYS_SHA256,
            "quotient_checkpoint_sha256": quotient_hash,
            "audit_checkpoint_sha256": sha256(checkpoint_path),
            "immutable_input_hashes": dependencies,
            "source_sha256": sha256(Path(__file__)),
            "scope_guard": (
                "Raw-domain and multiplicity recovery only. No orbit or sign "
                "credit; final credit also requires finite and independently "
                "transcribed full raw CUDA audits."
            ),
        }
        atomic_json(output_path, payload)
        print(payload["status"])
        print("REPORT", sha256(output_path))
    else:
        print(
            "AUDIT_CHECKPOINTED",
            state["next_batch_index"],
            quotient_state["cursor"],
            sha256(checkpoint_path),
        )
        if args.qualification_output_path:
            qualification_path = Path(args.qualification_output_path).resolve()
            payload = {
                "schema": (
                    "rank8-delta03-e5-five-cubic-path-quotient-raw-"
                    "multiplicity-partial-qualification-v1"
                ),
                "status": (
                    "PASS_PARTIAL_INDEPENDENT_RAW_MULTIPLICITY_"
                    "QUALIFICATION_NO_ORBIT_SIGN_CREDIT"
                ),
                "layout": layout.name,
                "quotient_checkpoint_cursor": quotient_state["cursor"],
                "audited_batches": state["next_batch_index"],
                "totals": state["totals"],
                "mapping_arrays_sha256": MAPPING_ARRAYS_SHA256,
                "quotient_checkpoint_sha256": quotient_hash,
                "audit_checkpoint_sha256": sha256(checkpoint_path),
                "immutable_input_hashes": dependencies,
                "source_sha256": sha256(Path(__file__)),
                "scope_guard": (
                    "Qualification evidence only. This partial report is not "
                    "accepted by any primary or final seal."
                ),
            }
            atomic_json(qualification_path, payload)
            print("QUALIFICATION", sha256(qualification_path))


if __name__ == "__main__":
    main()
