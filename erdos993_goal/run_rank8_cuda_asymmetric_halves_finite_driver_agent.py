#!/usr/bin/env python3
"""Checkpointed finite driver for asymmetric path-half CUDA scans."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import numpy as np

import benchmark_rank8_cuda_path_center_formula_agent as common
import run_rank8_cuda_asymmetric_halves_rays_driver_agent as ray_driver
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent as finite_common
from numba import cuda


sha256 = ray_driver.sha256
atomic_json = ray_driver.atomic_json


def make_rows(
    config,
    start,
    stop,
    locals_table,
    local_sums,
    local_masks,
    remotes_table,
    remote_sums,
    remote_masks,
):
    local, remote, tail = ray_driver.decode(start, stop, config.tail_states)
    masks = (
        local_masks[local]
        | (remote_masks[remote] << np.uint16(5))
        | ((tail == config.tail_long_value).astype(np.uint16) << np.uint16(10))
    )
    orders = 1 + local_sums[local] + remote_sums[remote] + tail
    all_short_selector = masks == 0
    finite_selector = all_short_selector & (orders >= 28)
    order27 = int(np.count_nonzero(all_short_selector & (orders == 27)))
    selected_local = local[finite_selector]
    selected_remote = remote[finite_selector]
    rows = np.empty((len(selected_local), 11), dtype=np.int32)
    rows[:, :5] = locals_table[selected_local]
    rows[:, 5:10] = remotes_table[selected_remote]
    rows[:, 10] = tail[finite_selector]
    return rows, int(np.count_nonzero(all_short_selector)), order27


def fresh(config):
    return {
        "schema": config.schema + "-finite-checkpoint-v1",
        "dependencies": config.dependencies,
        "batch_size": config.batch_size,
        "cursor": 0,
        "batches": [],
        "totals": {
            "patterns": 0,
            "all_short": 0,
            "finite": 0,
            "order27": 0,
            "positive_values": 0,
            "nonpositive_values": 0,
            "bound_failures": 0,
        },
    }


def load(config):
    if not config.checkpoint.exists():
        return fresh(config)
    state = json.loads(config.checkpoint.read_text(encoding="utf-8"))
    assert state["schema"] == config.schema + "-finite-checkpoint-v1"
    assert state["dependencies"] == config.dependencies
    assert state["batch_size"] == config.batch_size
    cursor = 0
    for batch in state["batches"]:
        assert batch["start"] == cursor and batch["stop"] > cursor
        cursor = batch["stop"]
    assert state["cursor"] == cursor
    return state


def run(config, evaluate_finite_kernel, max_batches: int | None = None):
    locals_table, local_sums, local_masks = ray_driver.local_half_table()
    remotes_table, remote_sums, remote_masks = ray_driver.center.half_table()
    state = load(config)
    if state["cursor"] == config.total_patterns:
        print("ALREADY_COMPLETE", sha256(config.checkpoint))
        return
    primes = common.primes31()
    inverses, modulus, modulus_limbs = common.crt_constants(primes)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_rows = cuda.device_array((config.batch_size, 11), dtype=np.int32)
    d_residues = cuda.device_array(
        config.batch_size * common.PRIME_COUNT * common.RANKS, dtype=np.uint32
    )
    d_codes = cuda.device_array(config.batch_size * common.RANKS, dtype=np.uint8)
    d_first = cuda.device_array(config.batch_size, dtype=np.uint64)
    d_second = cuda.device_array(config.batch_size, dtype=np.uint64)
    warm = np.asarray(
        [[7, 7, 7, 6, 6, 7, 6, 7, 6, 6, config.tail_long_value - 1]],
        dtype=np.int32,
    )
    d_rows[:1].copy_to_device(warm)
    evaluate_finite_kernel[1, 1](d_rows[:1], d_primes, d_residues)
    finite_common.classify_finite_kernel[1, 1](
        d_residues, d_primes, d_inverses, d_modulus, 1, d_codes
    )
    finite_common.finite_fingerprint_kernel[1, 1](
        d_residues, 1, d_first, d_second
    )
    cuda.synchronize()
    completed = 0
    run_started = time.perf_counter()
    while state["cursor"] < config.total_patterns:
        if max_batches is not None and completed >= max_batches:
            break
        start = state["cursor"]
        stop = min(config.total_patterns, start + config.batch_size)
        batch_started = time.perf_counter()
        rows, all_short, order27 = make_rows(
            config,
            start,
            stop,
            locals_table,
            local_sums,
            local_masks,
            remotes_table,
            remote_sums,
            remote_masks,
        )
        count = len(rows)
        if count:
            d_rows[:count].copy_to_device(rows)
            evaluate_finite_kernel[(count + 63) // 64, 64](
                d_rows[:count], d_primes, d_residues
            )
            finite_common.classify_finite_kernel[
                (count * common.RANKS + 127) // 128, 128
            ](
                d_residues,
                d_primes,
                d_inverses,
                d_modulus,
                count,
                d_codes,
            )
            finite_common.finite_fingerprint_kernel[(count + 127) // 128, 128](
                d_residues, count, d_first, d_second
            )
            cuda.synchronize()
            codes = d_codes[:count * common.RANKS].copy_to_host()
            nonpositive = int(np.count_nonzero(codes != 0))
            bounds = int(np.count_nonzero(codes == 3))
            fingerprints = np.empty((count, 2), dtype="<u8")
            fingerprints[:, 0] = d_first[:count].copy_to_host()
            fingerprints[:, 1] = d_second[:count].copy_to_host()
            fingerprint = hashlib.sha256(
                fingerprints.tobytes(order="C")
            ).hexdigest().upper()
        else:
            nonpositive = 0
            bounds = 0
            fingerprint = hashlib.sha256(b"").hexdigest().upper()
        assert nonpositive == 0 and bounds == 0
        batch = {
            "start": start,
            "stop": stop,
            "patterns": stop - start,
            "all_short": all_short,
            "finite": count,
            "order27": order27,
            "positive_values": count * common.RANKS,
            "nonpositive_values": nonpositive,
            "bound_failures": bounds,
            "residue_fingerprint_sha256": fingerprint,
            "elapsed_seconds": time.perf_counter() - batch_started,
        }
        state["batches"].append(batch)
        state["cursor"] = stop
        for key in state["totals"]:
            state["totals"][key] += batch[key]
        atomic_json(config.checkpoint, state)
        completed += 1
        if completed == 1 or completed % 5 == 0 or stop == config.total_patterns:
            print(
                "FINITE_BATCH_PASS",
                len(state["batches"]),
                start,
                stop,
                count,
                f"{batch['elapsed_seconds']:.3f}",
                "RUN_FINITE_PER_SECOND",
                f"{state['totals']['finite'] / max(time.perf_counter() - run_started, 1e-9):.1f}",
                flush=True,
            )
    if state["cursor"] != config.total_patterns:
        print("CHECKPOINTED", state["cursor"], sha256(config.checkpoint))
        return
    totals = state["totals"]
    assert totals["patterns"] == config.total_patterns
    assert totals["all_short"] == config.expected_all_short
    assert totals["finite"] == config.expected_finite
    assert totals["order27"] == config.expected_order27
    assert totals["positive_values"] == 4 * config.expected_finite
    assert totals["nonpositive_values"] == 0
    assert totals["bound_failures"] == 0
    manifest = "".join(
        json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n"
        for row in state["batches"]
    )
    payload = {
        "schema": config.schema + "-finite-exact-v1",
        "status": config.status,
        "root_orbit": config.root_orbit,
        "totals": totals,
        "crt_prime_count": len(primes),
        "crt_modulus_bits": modulus.bit_length(),
        "batch_manifest_sha256": hashlib.sha256(
            manifest.encode("utf-8")
        ).hexdigest().upper(),
        "checkpoint_sha256": sha256(config.checkpoint),
        "immutable_input_hashes": config.dependencies,
        "driver_sha256": sha256(Path(__file__)),
        "source_sha256": sha256(config.source),
        "scope_guard": "Finite all-short patterns only; Newton rays require a separate pass.",
    }
    atomic_json(config.output, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(config.output))
