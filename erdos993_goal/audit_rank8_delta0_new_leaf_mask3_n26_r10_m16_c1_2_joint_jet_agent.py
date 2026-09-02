#!/usr/bin/env python3
"""Independent geng/deletion replay of the last mask-3 joint-jet scan."""

from __future__ import annotations

import ctypes
import functools
import hashlib
import itertools
import json
import math
import subprocess
from fractions import Fraction
from pathlib import Path

import networkx as nx

from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_independent_audit_agent_20260823.json"
GENG = HERE / "nauty2_8_9" / "geng.exe"
ABORT_BYTES = 424 * 1024**2
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_agent.py":
        "2FD9E8F7740682D034C6214AA3CF2FAF06E3AC921068246DD3E94B60776F1A15",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_exact_agent_20260823.json":
        "9DEEE1865A7538CA035D391D02721B0BB5CBBB7260C8383143A440740530736F",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
    "nauty2_8_9/geng.exe":
        "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4",
}


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("PageFaultCount", ctypes.c_ulong),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
    ]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def private_bytes() -> int:
    counters = PROCESS_MEMORY_COUNTERS_EX()
    counters.cb = ctypes.sizeof(counters)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    psapi = ctypes.WinDLL("psapi", use_last_error=True)
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes = (
        ctypes.c_void_p,
        ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX),
        ctypes.c_ulong,
    )
    if not psapi.GetProcessMemoryInfo(
        kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb
    ):
        raise ctypes.WinError()
    return int(counters.PrivateUsage)


def gate() -> int:
    value = private_bytes()
    if value > ABORT_BYTES:
        raise MemoryError(f"private bytes {value} exceed {ABORT_BYTES}")
    return value


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(7))


def multiply_jets(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        sum(left[index] * right[total - index] for index in range(total + 1))
        for total in range(7)
    )


def deletion_jet(graph: nx.Graph) -> tuple[int, ...]:
    vertices = tuple(sorted(graph))
    position = {vertex: index for index, vertex in enumerate(vertices)}
    closed = [0] * len(vertices)
    for vertex in vertices:
        index = position[vertex]
        closed[index] = 1 << index
        for neighbor in graph[vertex]:
            closed[index] |= 1 << position[neighbor]

    @functools.lru_cache(maxsize=None)
    def recurse(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1, 0, 0, 0, 0, 0, 0)
        vertex = mask.bit_length() - 1
        bit = 1 << vertex
        excluded = recurse(mask ^ bit)
        smaller = recurse(mask & ~closed[vertex])
        return add(excluded, (0,) + smaller[:6])

    return recurse((1 << len(vertices)) - 1)


def geng_codes(order: int) -> list[bytes]:
    edges = order - 1
    result = subprocess.run(
        [str(GENG), "-cq", str(order), f"{edges}:{edges}"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert result.stderr == b"", result.stderr
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def gap(jet: tuple[int, ...], components: int) -> int:
    return sum(jet[j] * choose(10 - min(j, components), 5 - j) for j in range(5))


def polynomial_multiply(left: dict[int, Fraction], right: dict[int, Fraction]) -> dict[int, Fraction]:
    answer: dict[int, Fraction] = {}
    for left_degree, left_value in left.items():
        for right_degree, right_value in right.items():
            degree = left_degree + right_degree
            answer[degree] = answer.get(degree, Fraction(0)) + left_value * right_value
    return answer


def polynomial_power(linear: dict[int, Fraction], exponent: int) -> dict[int, Fraction]:
    answer = {0: Fraction(1)}
    for _ in range(exponent):
        answer = polynomial_multiply(answer, linear)
    return answer


def replay_controls(base_terms, jet: tuple[int, ...], components: int):
    # Independently construct the two-variable power polynomial term by term.
    N, r = 26, 10
    x0 = Fraction(6, N - 5)
    x1 = Fraction(6 * N, N * N - 15 * N + 10)
    slope = x1 - x0
    d6_upper = choose(N - 1, 6) + choose(r - 1, 5)
    current_gap = gap(jet, components)
    y0 = x0 - Fraction(current_gap, d6_upper)
    assert y0 >= 0
    x_linear = {0: x0, 1: slope}
    y_linear = {0: y0, 1: slope}
    inverse_t = Fraction(jet[6], jet[5])
    power: dict[tuple[int, int], Fraction] = {}
    for (np, xp, yp, zp), coefficient in reversed(base_terms):
        assert np == 0
        univariate = polynomial_multiply(
            polynomial_power(x_linear, xp),
            polynomial_power(y_linear, yp + zp),
        )
        v_degree = yp + zp
        scale = Fraction(int(coefficient)) * inverse_t**zp
        for x_degree, value in univariate.items():
            key = (x_degree, v_degree)
            power[key] = power.get(key, Fraction(0)) + scale * value
    controls = {}
    for i, j in itertools.product(range(9), range(6)):
        value = Fraction(0)
        for (x_degree, v_degree), coefficient in power.items():
            if x_degree <= i and v_degree <= j:
                value += coefficient * Fraction(choose(i, x_degree), choose(8, x_degree)) * Fraction(
                    choose(j, v_degree), choose(5, v_degree)
                )
        controls[(i, j)] = value
    return controls, current_gap, inverse_t


def jet_sha256(rows) -> str:
    digest = hashlib.sha256()
    for components, jets in rows:
        digest.update(f"{components}:".encode())
        for jet in sorted(jets):
            digest.update(",".join(str(value) for value in jet).encode())
            digest.update(b";")
        digest.update(b"\n")
    return digest.hexdigest().upper()


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_PARTIAL_JOINT_JET_SCAN_WITH_OPEN_NO_CELL_CREDIT"
    peak = gate()
    tree_types: dict[int, set[tuple[int, ...]]] = {}
    tree_counts = [0]
    geng_reverse_stream = hashlib.sha256()
    for order in range(1, 17):
        codes = geng_codes(order)
        jets = set()
        for code in reversed(codes):
            graph = nx.from_graph6_bytes(code)
            assert nx.is_tree(graph)
            jets.add(deletion_jet(graph))
            geng_reverse_stream.update(f"order={order};".encode())
            geng_reverse_stream.update(code)
            geng_reverse_stream.update(b"\n")
        tree_types[order] = jets
        tree_counts.append(len(codes))
        peak = max(peak, gate())
    assert tree_counts == [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320]

    jets_by_components = {1: set(tree_types[16]), 2: set()}
    for right_order in reversed(range(1, 16)):
        left_order = 16 - right_order
        for right in reversed(sorted(tree_types[right_order])):
            for left in reversed(sorted(tree_types[left_order])):
                jets_by_components[2].add(multiply_jets(left, right))
    assert {key: len(value) for key, value in jets_by_components.items()} == {1: 11044, 2: 8428}
    fingerprint = jet_sha256(sorted(jets_by_components.items()))
    assert fingerprint == primary["joint_jet_sparse_sha256"]
    peak = max(peak, gate())

    base_terms = literal_base().terms()
    rows = []
    obstructions = []
    controls_checked = 0
    for components in reversed((1, 2)):
        component_minimum = None
        component_witness = None
        negative_jets = 0
        for jet in reversed(sorted(jets_by_components[components])):
            controls, current_gap, inverse_t = replay_controls(base_terms, jet, components)
            negatives = [list(index) for index, value in sorted(controls.items()) if value < 0]
            minimum_index, minimum_value = min(controls.items(), key=lambda item: item[1])
            if component_minimum is None or minimum_value < component_minimum:
                component_minimum = minimum_value
                component_witness = {
                    "jet_f0_to_f6": list(jet),
                    "component_gap": current_gap,
                    "f6_over_f5": str(inverse_t),
                    "bernstein_index": list(minimum_index),
                }
            if negatives:
                negative_jets += 1
                obstructions.append(
                    {
                        "components": components,
                        "jet_f0_to_f6": list(jet),
                        "component_gap": current_gap,
                        "f6_over_f5": str(inverse_t),
                        "negative_indices": negatives,
                    }
                )
            controls_checked += len(controls)
        rows.append(
            {
                "components": components,
                "distinct_joint_jets": len(jets_by_components[components]),
                "status": "SEALED" if negative_jets == 0 else "OPEN_JOINT_JET_BERNSTEIN_METHOD",
                "negative_joint_jets": negative_jets,
                "minimum_control": str(component_minimum),
                "minimum_witness": component_witness,
            }
        )
        peak = max(peak, gate())
    rows.sort(key=lambda row: row["components"])
    obstructions.sort(key=lambda row: (row["components"], row["jet_f0_to_f6"]))
    assert rows == primary["rows"]
    assert obstructions == primary["exact_obstructions"]
    assert controls_checked == primary["counts"]["bernstein_controls"] == 1_051_488

    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-r10-m16-c1-2-joint-jet-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_DELETION_JOINT_JET_REPLAY_WITH_EXACT_METHOD_OBSTRUCTIONS",
        "hashes": hashes,
        "method": (
            "nauty geng, literal deletion/closed-neighborhood jets, reverse component "
            "products, a direct literal mask-3 numerator, repeated polynomial multiplication, "
            "and rational Bernstein conversion independently replayed every joint jet."
        ),
        "counts": {
            "joint_jets": sum(len(value) for value in jets_by_components.values()),
            "bernstein_controls": controls_checked,
            "negative_joint_jets": len(obstructions),
        },
        "joint_jet_sparse_sha256": fingerprint,
        "geng_reverse_stream_sha256": geng_reverse_stream.hexdigest().upper(),
        "exact_method_obstructions": obstructions,
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "The independently confirmed negative controls are method obstructions, "
            "not graph counterexamples. The (26,10,16) cell and the complete five-cell "
            "package remain uncredited."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("JETS", payload["counts"]["joint_jets"], "CONTROLS", controls_checked, "OBSTRUCTIONS", len(obstructions))
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
