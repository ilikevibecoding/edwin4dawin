#!/usr/bin/env python3
"""Full independent CUDA audit of path:center_leaf rays and finite cells."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import numpy as np


os.environ.setdefault("NUMBA_CUDA_MAX_PENDING_DEALLOCS_COUNT", "1")

import audit_rank8_cuda_path_center_leaf_formula_independent_agent as audit_engine  # noqa: E402
import benchmark_rank8_cuda_path_center_formula_agent as common  # noqa: E402
import run_rank8_cuda_unordered_halves_finite_driver_agent as finite_driver  # noqa: E402
import run_rank8_cuda_unordered_halves_rays_driver_agent as ray_driver  # noqa: E402
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent as finite_common  # noqa: E402
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center  # noqa: E402
from numba import cuda  # noqa: E402


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_primary_exact_agent_20260825.json"
)
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_full_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_cuda_path_center_leaf_formula_independent_agent.py":
        "B2C2C0D9E657827E15FE5D1550E413DF27ED45534F3A32DB18A7E04D8317C08E",
    "benchmark_rank8_cuda_path_center_leaf_formula_agent.py":
        "3DF5559D7D26002DD63712DC561FBA5BB6765796B155AE5E078678469D5130C7",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "run_rank8_cuda_unordered_halves_rays_driver_agent.py":
        "AFFCD8E72225B10FF6E77E9D6C9CA0CC783F28892030CE360CE52E8E80781571",
    "run_rank8_cuda_unordered_halves_finite_driver_agent.py":
        "C50D5C700585E0ABFD1CE4B79749E2AF5618A2373805E276783B48F585138859",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "scan_rank8_delta03_e5_five_cubic_path_center_leaf_cuda_rays_agent.py":
        "22891EF8817171DEE696885D200197B764CFD682C8EBC0FD98EABBFE24107CA0",
    "scan_rank8_delta03_e5_five_cubic_path_center_leaf_cuda_finite_agent.py":
        "27DF88BFD35273F9601D3D1C837FADF036028497A606B17F3F1572905F3AA2FD",
    "assemble_rank8_delta03_e5_five_cubic_path_center_leaf_cuda_primary_agent.py":
        "EE240D207EA6A5D628517FA88F836177BAA96E8B43FF0C7F1B8564EF79CDCFF7",
}
BATCH_SIZE = 750_000
TOTAL_PATTERNS = 629_457_920
EXPECTED_RAYS = 496_022_345
EXPECTED_ALL_SHORT = 133_435_575
EXPECTED_FINITE = 132_182_485
EXPECTED_ORDER27 = 477_299


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def fresh(dependencies):
    return {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-leaf-"
            "cuda-full-audit-checkpoint-agent-v1"
        ),
        "dependencies": dependencies,
        "batch_size": BATCH_SIZE,
        "cursor": 0,
        "batches": [],
        "totals": {
            "patterns": 0,
            "rays": 0,
            "all_short": 0,
            "finite": 0,
            "order27": 0,
            "ray_gate_failures": 0,
            "ray_bound_failures": 0,
            "ray_negative_classifications": 0,
            "finite_positive_values": 0,
            "finite_nonpositive_values": 0,
            "finite_bound_failures": 0,
        },
    }


def load_checkpoint(dependencies):
    if not CHECKPOINT.exists():
        return fresh(dependencies)
    state = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    assert state["dependencies"] == dependencies
    assert state["batch_size"] == BATCH_SIZE
    cursor = 0
    for row in state["batches"]:
        assert row["start"] == cursor and row["stop"] > cursor
        cursor = row["stop"]
    assert state["cursor"] == cursor
    return state


def fingerprint_pair(first, second, count):
    if count == 0:
        return hashlib.sha256(b"").hexdigest().upper()
    body = np.empty((count, 2), dtype="<u8")
    body[:, 0] = first[:count].copy_to_host()
    body[:, 1] = second[:count].copy_to_host()
    return hashlib.sha256(body.tobytes(order="C")).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-primary-report-sha256", required=True)
    parser.add_argument("--max-batches", type=int)
    args = parser.parse_args()
    dependencies = {name: sha256(ROOT / name) for name in EXPECTED}
    assert dependencies == EXPECTED
    dependencies[PRIMARY_NAME] = args.expected_primary_report_sha256.upper()
    assert sha256(ROOT / PRIMARY_NAME) == dependencies[PRIMARY_NAME]
    primary = json.loads((ROOT / PRIMARY_NAME).read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_CENTER_LEAF"
    )
    assert primary["root_orbit"] == "five_cubic_path:center_leaf"
    assert primary["canonical_coordinate_patterns"] == TOTAL_PATTERNS
    assert primary["n28_plus_newton_rays"] == EXPECTED_RAYS
    assert primary["n28_plus_all_short_finite_patterns"] == EXPECTED_FINITE
    assert primary["all_short_order27_patterns"] == EXPECTED_ORDER27
    assert primary["nonpositive_or_bound_failures"] == 0

    config = ray_driver.Config(
        root=ROOT,
        checkpoint=CHECKPOINT,
        output=OUTPUT,
        source=Path(__file__),
        schema="rank8-delta03-e5-five-cubic-path-center-leaf-cuda-full-audit",
        status="unused",
        root_orbit="five_cubic_path:center_leaf",
        tail_states=8,
        tail_long_value=8,
        total_patterns=TOTAL_PATTERNS,
        expected_rays=EXPECTED_RAYS,
        expected_all_short=EXPECTED_ALL_SHORT,
        expected_finite=EXPECTED_FINITE,
        expected_order27=EXPECTED_ORDER27,
        batch_size=BATCH_SIZE,
        dependencies=dependencies,
    )
    halves, half_sums, half_masks = center.half_table()
    first_long = np.full(1 << 11, -1, dtype=np.int8)
    for mask in range(1, 1 << 11):
        first_long[mask] = (mask & -mask).bit_length() - 1
    state = load_checkpoint(dependencies)

    primes = audit_engine.audit_primes31()
    inverses, modulus, modulus_limbs = common.crt_constants(primes)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_degrees = cuda.to_device(np.asarray(center.DEGREES, dtype=np.uint32))
    d_rows = cuda.device_array((BATCH_SIZE, 11), dtype=np.int32)
    d_varying = cuda.device_array(BATCH_SIZE, dtype=np.int32)
    d_shifts = cuda.device_array(BATCH_SIZE, dtype=np.int32)
    ray_capacity = BATCH_SIZE * common.PRIME_COUNT * common.RANKS * common.POINTS
    d_ray_residues = cuda.device_array(ray_capacity, dtype=np.uint32)
    d_ray_codes = cuda.device_array(
        BATCH_SIZE * common.RANKS * common.POINTS, dtype=np.uint8
    )
    d_ray_first = cuda.device_array(BATCH_SIZE, dtype=np.uint64)
    d_ray_second = cuda.device_array(BATCH_SIZE, dtype=np.uint64)
    finite_capacity = BATCH_SIZE * common.PRIME_COUNT * common.RANKS
    d_finite_residues = cuda.device_array(finite_capacity, dtype=np.uint32)
    d_finite_codes = cuda.device_array(BATCH_SIZE * common.RANKS, dtype=np.uint8)
    d_finite_first = cuda.device_array(BATCH_SIZE, dtype=np.uint64)
    d_finite_second = cuda.device_array(BATCH_SIZE, dtype=np.uint64)

    warm = np.asarray([[8, 7, 8, 7, 7, 8, 7, 8, 7, 7, 8]], dtype=np.int32)
    d_rows[:1].copy_to_device(warm)
    d_varying[:1].copy_to_device(np.asarray([0], dtype=np.int32))
    d_shifts[:1].copy_to_device(np.asarray([0], dtype=np.int32))
    audit_engine.evaluate_rays_kernel[1, 1](
        d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_ray_residues
    )
    common.differences_kernel[1, 1](d_ray_residues, d_primes, 1)
    common.classify_coefficients_kernel[1, 1](
        d_ray_residues,
        d_primes,
        d_inverses,
        d_modulus,
        d_degrees,
        1,
        d_ray_codes,
    )
    center.fingerprint_kernel[1, 1](
        d_ray_residues, 1, d_ray_first, d_ray_second
    )
    audit_engine.evaluate_finite_kernel[1, 1](
        d_rows[:1], d_primes, d_finite_residues
    )
    finite_common.classify_finite_kernel[1, 1](
        d_finite_residues,
        d_primes,
        d_inverses,
        d_modulus,
        1,
        d_finite_codes,
    )
    finite_common.finite_fingerprint_kernel[1, 1](
        d_finite_residues, 1, d_finite_first, d_finite_second
    )
    cuda.synchronize()

    completed = 0
    run_started = time.perf_counter()
    while state["cursor"] < TOTAL_PATTERNS:
        if args.max_batches is not None and completed >= args.max_batches:
            break
        start = state["cursor"]
        stop = min(TOTAL_PATTERNS, start + BATCH_SIZE)
        batch_started = time.perf_counter()
        ray_rows, varying, shifts, all_short, finite_expected, order27 = (
            ray_driver.make_rows(
                config, start, stop, halves, half_sums, half_masks, first_long
            )
        )
        finite_rows, finite_all_short, finite_order27 = finite_driver.make_rows(
            config, start, stop, halves, half_sums, half_masks
        )
        assert finite_all_short == all_short
        assert finite_order27 == order27
        assert len(finite_rows) == finite_expected

        ray_count = len(ray_rows)
        if ray_count:
            d_rows[:ray_count].copy_to_device(ray_rows)
            d_varying[:ray_count].copy_to_device(varying)
            d_shifts[:ray_count].copy_to_device(shifts)
            audit_engine.evaluate_rays_kernel[
                (ray_count * common.POINTS + 63) // 64, 64
            ](
                d_rows[:ray_count],
                d_varying[:ray_count],
                d_shifts[:ray_count],
                d_primes,
                d_ray_residues,
            )
            work = ray_count * common.PRIME_COUNT * common.RANKS
            common.differences_kernel[(work + 127) // 128, 128](
                d_ray_residues, d_primes, ray_count
            )
            code_work = ray_count * common.RANKS * common.POINTS
            common.classify_coefficients_kernel[
                (code_work + 127) // 128, 128
            ](
                d_ray_residues,
                d_primes,
                d_inverses,
                d_modulus,
                d_degrees,
                ray_count,
                d_ray_codes,
            )
            center.fingerprint_kernel[(ray_count + 127) // 128, 128](
                d_ray_residues, ray_count, d_ray_first, d_ray_second
            )
            cuda.synchronize()
            ray_codes = d_ray_codes[:code_work].copy_to_host().reshape(
                ray_count, common.RANKS, common.POINTS
            )
            ray_stats = center.validate_codes(ray_codes)
            ray_fingerprint = fingerprint_pair(
                d_ray_first, d_ray_second, ray_count
            )
        else:
            ray_stats = {
                "gate_failures": 0,
                "bound_failures": 0,
                "negative_classifications": 0,
                "positive_active_coefficients": 0,
                "zero_active_coefficients": 0,
                "zero_degree_overflow_coefficients": 0,
            }
            ray_fingerprint = hashlib.sha256(b"").hexdigest().upper()
        assert ray_stats["gate_failures"] == 0
        assert ray_stats["bound_failures"] == 0
        assert ray_stats["negative_classifications"] == 0

        finite_count = len(finite_rows)
        if finite_count:
            d_rows[:finite_count].copy_to_device(finite_rows)
            audit_engine.evaluate_finite_kernel[
                (finite_count + 63) // 64, 64
            ](d_rows[:finite_count], d_primes, d_finite_residues)
            finite_common.classify_finite_kernel[
                (finite_count * common.RANKS + 127) // 128, 128
            ](
                d_finite_residues,
                d_primes,
                d_inverses,
                d_modulus,
                finite_count,
                d_finite_codes,
            )
            finite_common.finite_fingerprint_kernel[
                (finite_count + 127) // 128, 128
            ](
                d_finite_residues,
                finite_count,
                d_finite_first,
                d_finite_second,
            )
            cuda.synchronize()
            finite_codes = d_finite_codes[
                :finite_count * common.RANKS
            ].copy_to_host()
            finite_nonpositive = int(np.count_nonzero(finite_codes != 0))
            finite_bounds = int(np.count_nonzero(finite_codes == 3))
            finite_fingerprint = fingerprint_pair(
                d_finite_first, d_finite_second, finite_count
            )
        else:
            finite_nonpositive = 0
            finite_bounds = 0
            finite_fingerprint = hashlib.sha256(b"").hexdigest().upper()
        assert finite_nonpositive == 0
        assert finite_bounds == 0

        batch = {
            "start": start,
            "stop": stop,
            "patterns": stop - start,
            "rays": ray_count,
            "all_short": all_short,
            "finite": finite_count,
            "order27": order27,
            "ray_gate_failures": ray_stats["gate_failures"],
            "ray_bound_failures": ray_stats["bound_failures"],
            "ray_negative_classifications": ray_stats[
                "negative_classifications"
            ],
            "finite_positive_values": finite_count * common.RANKS,
            "finite_nonpositive_values": finite_nonpositive,
            "finite_bound_failures": finite_bounds,
            "ray_residue_fingerprint_sha256": ray_fingerprint,
            "finite_residue_fingerprint_sha256": finite_fingerprint,
            "elapsed_seconds": time.perf_counter() - batch_started,
        }
        state["batches"].append(batch)
        state["cursor"] = stop
        for key in state["totals"]:
            state["totals"][key] += batch[key]
        atomic_json(CHECKPOINT, state)
        completed += 1
        if completed == 1 or completed % 5 == 0 or stop == TOTAL_PATTERNS:
            print(
                "AUDIT_BATCH_PASS",
                len(state["batches"]),
                start,
                stop,
                ray_count,
                finite_count,
                f"{batch['elapsed_seconds']:.3f}",
                "RUN_RAYS_PER_SECOND",
                f"{state['totals']['rays'] / max(time.perf_counter() - run_started, 1e-9):.1f}",
                flush=True,
            )

    if state["cursor"] != TOTAL_PATTERNS:
        print("CHECKPOINTED", state["cursor"], sha256(CHECKPOINT))
        return
    totals = state["totals"]
    assert totals["patterns"] == TOTAL_PATTERNS
    assert totals["rays"] == EXPECTED_RAYS
    assert totals["all_short"] == EXPECTED_ALL_SHORT
    assert totals["finite"] == EXPECTED_FINITE
    assert totals["order27"] == EXPECTED_ORDER27
    assert totals["ray_gate_failures"] == 0
    assert totals["ray_bound_failures"] == 0
    assert totals["ray_negative_classifications"] == 0
    assert totals["finite_positive_values"] == 4 * EXPECTED_FINITE
    assert totals["finite_nonpositive_values"] == 0
    assert totals["finite_bound_failures"] == 0
    manifest = "".join(
        json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n"
        for row in state["batches"]
    )
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-leaf-"
            "cuda-full-independent-audit-agent-v1"
        ),
        "status": (
            "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_"
            "FIVE_CUBIC_PATH_CENTER_LEAF"
        ),
        "root_orbit": "five_cubic_path:center_leaf",
        "method": (
            "Separately transcribed path-message engine, disjoint nine-prime "
            "CRT basis, exhaustive canonical ray and finite enumeration."
        ),
        "totals": totals,
        "crt_prime_count": len(primes),
        "crt_modulus_bits": modulus.bit_length(),
        "batch_manifest_sha256": hashlib.sha256(
            manifest.encode("utf-8")
        ).hexdigest().upper(),
        "checkpoint_sha256": sha256(CHECKPOINT),
        "immutable_input_hashes": dependencies,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent full audit of one root orbit only.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
