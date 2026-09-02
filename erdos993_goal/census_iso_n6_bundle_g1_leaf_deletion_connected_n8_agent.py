#!/usr/bin/env python3
"""Exact, guarded n=8 connected-tree census for the rank-six g1 leaf lemma.

This is a finite falsification/sublemma artifact only.  It checks every
unlabelled tree of order eight, every unordered marked pair, every induced
vertex subset D, and every unmarked leaf ell.  No universal conclusion is
drawn.
"""

from __future__ import annotations

from collections import Counter
import ctypes
import hashlib
import itertools
import json
from pathlib import Path
import shutil
import subprocess
import time

import networkx as nx

from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_deletion_connected_n8_exact_agent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_LEAF_DELETION_CONNECTED_N8_AGENT"
CELL_CAP = 2_000_000
TIME_CAP_SECONDS = 600
GIB = 1024**3
MIN_AVAILABLE_PHYSICAL_BYTES = 12 * GIB
MIN_AVAILABLE_COMMIT_BYTES = 16 * GIB
MIN_FREE_DISK_BYTES = 20 * GIB
EXPECTED_TREES = 23
EXPECTED_MARKED_PAIRS = 644
EXPECTED_ELIGIBLE_LEAF_INSTANCES = 2121
EXPECTED_CELLS = 542976
PINS = {
    "search_iso_n6_bundle_g1_random_g1_nonadjacent.py":
        "E1AE43CA1C972E07EE2946A4BC42F00FA48B00A122B23FFFFA1F6354D65986EC",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def resource_guard() -> dict:
    class MemoryStatus(ctypes.Structure):
        _fields_ = [
            ("length", ctypes.c_ulong),
            ("memory_load", ctypes.c_ulong),
            ("total_physical", ctypes.c_ulonglong),
            ("available_physical", ctypes.c_ulonglong),
            ("total_page_file", ctypes.c_ulonglong),
            ("available_page_file", ctypes.c_ulonglong),
            ("total_virtual", ctypes.c_ulonglong),
            ("available_virtual", ctypes.c_ulonglong),
            ("available_extended_virtual", ctypes.c_ulonglong),
        ]

    status = MemoryStatus()
    status.length = ctypes.sizeof(MemoryStatus)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise ctypes.WinError()
    available_physical = status.available_physical
    available_commit = status.available_page_file
    free_disk = shutil.disk_usage(HERE.anchor).free
    query = subprocess.run(
        [
            "powershell", "-NoProfile", "-Command",
            "Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and ("
            "$_.CommandLine -like '*prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_mark_only_common_forest_root.py*' "
            "-or ($_.CommandLine -like '*probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_rank6_ratio_g1_nonadjacent.py*' "
            "-and $_.CommandLine -match '(?i)--edges\\s+pq(?:\\s|$)')) } "
            "| ForEach-Object {$_.ProcessId}",
        ],
        check=True, capture_output=True, text=True,
    )
    protected = [int(value) for value in query.stdout.split()]
    # This census must never compete with the protected rank-six pq replay.
    blockers = []
    if protected:
        blockers.append(f"protected distinct-pq producer/worker alive: {sorted(protected)}")
    if available_physical < MIN_AVAILABLE_PHYSICAL_BYTES:
        blockers.append("available physical memory below 12 GiB")
    if available_commit < MIN_AVAILABLE_COMMIT_BYTES:
        blockers.append("available commit below 16 GiB")
    if free_disk < MIN_FREE_DISK_BYTES:
        blockers.append("free disk below 20 GiB")
    if blockers:
        raise RuntimeError("; ".join(blockers))
    below_normal_priority_class = 0x00004000
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.GetCurrentProcess.argtypes = ()
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    kernel32.SetPriorityClass.argtypes = (ctypes.c_void_p, ctypes.c_uint32)
    kernel32.SetPriorityClass.restype = ctypes.c_int
    process_handle = kernel32.GetCurrentProcess()
    if not kernel32.SetPriorityClass(process_handle, below_normal_priority_class):
        raise ctypes.WinError(ctypes.get_last_error())
    return {
        "available_physical_bytes_at_start": available_physical,
        "available_commit_bytes_at_start": available_commit,
        "free_disk_bytes_at_start": free_disk,
        "minimum_available_physical_bytes": MIN_AVAILABLE_PHYSICAL_BYTES,
        "minimum_available_commit_bytes": MIN_AVAILABLE_COMMIT_BYTES,
        "minimum_free_disk_bytes": MIN_FREE_DISK_BYTES,
        "protected_pq_pids_at_guard": sorted(protected),
    }


def main() -> None:
    actual_pins = {name: sha256(HERE / name) for name in PINS}
    if actual_pins != PINS:
        raise RuntimeError(("dependency hash mismatch", actual_pins, PINS))
    guard = resource_guard()
    started = time.monotonic()
    value = evaluator()
    signs = Counter()
    classes: dict[str, Counter] = {}
    stream = hashlib.sha256()
    minimum = None
    cells = 0
    trees = 0
    marked_pairs = 0
    eligible_leaf_instances = 0

    for tree_index, graph0 in enumerate(nx.nonisomorphic_trees(8)):
        graph = nx.convert_node_labels_to_integers(graph0)
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        nodes = tuple(graph)
        trees += 1
        for u, v in itertools.combinations(nodes, 2):
            marked_pairs += 1
            leaves = tuple(node for node in nodes if node not in (u, v) and graph.degree(node) == 1)
            if not leaves:
                continue
            crows = rows(graph, u, v)
            drows_by_mask = {}
            for mask in range(1 << 8):
                retained = {node for node in nodes if mask & (1 << node)}
                drows_by_mask[mask] = rows(graph.subgraph(retained).copy(), u, v)
            for leaf in leaves:
                eligible_leaf_instances += 1
                parent = next(iter(graph.neighbors(leaf)))
                reduced = graph.copy()
                reduced.remove_node(leaf)
                reduced_crows = rows(reduced, u, v)
                for mask in range(1 << 8):
                    retained_reduced = {
                        node for node in reduced if mask & (1 << node)
                    }
                    before = value(crows, drows_by_mask[mask])
                    after = value(
                        reduced_crows,
                        rows(reduced.subgraph(retained_reduced).copy(), u, v),
                    )
                    delta = before - after
                    sign = "negative" if delta < 0 else "positive" if delta > 0 else "zero"
                    signs[sign] += 1
                    label = "mark_parent" if parent in (u, v) else "ordinary_parent"
                    retention = (
                        ("leaf_retained" if mask & (1 << leaf) else "leaf_deleted")
                        + "|"
                        + ("parent_retained" if mask & (1 << parent) else "parent_deleted")
                    )
                    classes.setdefault(f"{label}|{retention}", Counter())[sign] += 1
                    record = (delta, tree_index, code, u, v, mask, leaf, parent, before, after)
                    minimum = record if minimum is None or record < minimum else minimum
                    stream.update(
                        f"8|{tree_index}|{code}|{u}|{v}|{mask}|{leaf}|{parent}|{delta};".encode()
                    )
                    cells += 1
                    if cells > CELL_CAP:
                        raise RuntimeError(("cell cap exceeded", cells, CELL_CAP))
                    elapsed = time.monotonic() - started
                    if elapsed > TIME_CAP_SECONDS:
                        raise RuntimeError(("time cap exceeded", elapsed, TIME_CAP_SECONDS))
                    if delta < 0:
                        raise AssertionError(("COUNTEREXAMPLE", record))

    observed = (trees, marked_pairs, eligible_leaf_instances, cells)
    expected = (
        EXPECTED_TREES, EXPECTED_MARKED_PAIRS,
        EXPECTED_ELIGIBLE_LEAF_INSTANCES, EXPECTED_CELLS,
    )
    if observed != expected:
        raise RuntimeError(("enumeration count mismatch", observed, expected))

    report = {
        "marker": MARKER,
        "bounded_sublemma": (
            "For every connected marked tree C of order 8, every actual induced marked minor D, "
            "and every unmarked leaf ell, g1(C,D)>=g1(C-ell,D-ell)."
        ),
        "scope": {
            "order": 8,
            "connected_forests_only": True,
            "nonisomorphic_trees": trees,
            "marked_pairs": marked_pairs,
            "eligible_leaf_instances": eligible_leaf_instances,
            "actual_D_leaf_cells": cells,
        },
        "signs": dict(signs),
        "classes": {key: dict(classes[key]) for key in sorted(classes)},
        "minimum": list(minimum),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "resource_guard": guard,
        "caps": {"cell_cap": CELL_CAP, "time_cap_seconds": TIME_CAP_SECONDS},
        "role": "finite exact bounded sublemma and falsification evidence only; not a universal leaf theorem",
        "scope_guard": (
            "This does not cover disconnected order-8 forests, any order above 8, universal rank-six g1, "
            "all N6, rank seven, or Erdos Problem 993."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "scope": report["scope"],
        "signs": report["signs"],
        "minimum": report["minimum"],
        "ordered_stream_sha256": report["ordered_stream_sha256"],
        "source_sha256": report["source_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
