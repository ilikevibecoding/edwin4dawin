#!/usr/bin/env python3
"""Exact joint-jet boxes for the last mask-3 finite component obstruction."""

from __future__ import annotations

import ctypes
import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx

import prove_rank8_forest16_f5_f6_ratio_agent as forest
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_exact_agent_20260823.json"
ABORT_BYTES = 424 * 1024**2
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_5_component_residual_agent.py":
        "A165E44CA67F6622A38783502AF06179EE267BAAA6BDA975C43B0F5B4B01279A",
    "rank8_delta0_new_leaf_mask3_5_component_residual_exact_agent_20260823.json":
        "C9DCA4BF65A3787042AA7344EC7846613E9D51EA4B4EA511BAFBCED9A0D9372B",
    "audit_rank8_delta0_new_leaf_mask3_5_component_residual_agent.py":
        "CA0BFA2B1C5A5425E5E2849D9E73EE9CCF48D0AE83499CFA34ED4C247F03D495",
    "rank8_delta0_new_leaf_mask3_5_component_residual_independent_audit_agent_20260823.json":
        "00FBABA5383468D101BF55230D4DEEE608594E52076EC66E9C87FBCCC8A00A1E",
    "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json":
        "DC5A2F6F85E62D47EB0AA43FB8E92B2C33E04DF3DA828AFF179B9E61B52F032D",
    "rank8_forest16_17_component_jet_bounds_independent_audit_agent_20260823.json":
        "41C457BEB4BF565F3FCCF46BF374168AD7EA5683B115C3A50347AA72E811F9E1",
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


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def component_gap(jet: tuple[int, ...], components: int) -> int:
    r = 10
    return sum(jet[j] * choose(r - min(j, components), 5 - j) for j in range(5))


def linear_power(constant: Fraction, slope: Fraction, degree: int) -> list[Fraction]:
    return [
        Fraction(math.comb(degree, exponent))
        * constant ** (degree - exponent)
        * slope**exponent
        for exponent in range(degree + 1)
    ]


def convolution(left: list[Fraction], right: list[Fraction]) -> list[Fraction]:
    answer = [Fraction(0)] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            answer[i + j] += a * b
    return answer


def joint_jet_controls(base_terms, jet: tuple[int, ...], components: int):
    # N=26, r=10, m=16.  With a fixed forest jet, t=f5/f6 is
    # exact and z=y/t, so only the X,V box remains.
    N, r = 26, 10
    selected = N * N - 15 * N + 10
    x_lower = Fraction(6, N - 5)
    x_upper = Fraction(6 * N, selected)
    slope = x_upper - x_lower
    cap = choose(N - 1, 6) + choose(r - 1, 5)
    gap = component_gap(jet, components)
    y_constant = x_lower - Fraction(gap, cap)
    assert y_constant >= 0
    inverse_t = Fraction(jet[6], jet[5])

    x_powers = [linear_power(x_lower, slope, degree) for degree in range(5)]
    y_powers = [linear_power(y_constant, slope, degree) for degree in range(6)]
    inverse_t_powers = [inverse_t**degree for degree in range(5)]
    power: dict[tuple[int, int], Fraction] = {}
    for (np, xp, yp, zp), coefficient in base_terms:
        assert np == 0
        v_degree = yp + zp
        x_coefficients = convolution(x_powers[xp], y_powers[v_degree])
        scale = Fraction(int(coefficient)) * inverse_t_powers[zp]
        for x_degree, value in enumerate(x_coefficients):
            power[(x_degree, v_degree)] = power.get((x_degree, v_degree), Fraction(0)) + scale * value

    degrees = (8, 5)
    assert max(index[0] for index in power) <= degrees[0]
    assert max(index[1] for index in power) <= degrees[1]
    controls = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        total = Fraction(0)
        for source, coefficient in power.items():
            if source[0] > target[0] or source[1] > target[1]:
                continue
            total += coefficient * Fraction(math.comb(target[0], source[0]), math.comb(degrees[0], source[0])) * Fraction(
                math.comb(target[1], source[1]), math.comb(degrees[1], source[1])
            )
        controls[target] = total
    return controls, gap, inverse_t


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
    catalog = json.loads(
        (HERE / "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    catalog_rows = {
        (row["order"], row["components"]): row
        for row in catalog["component_rows"]
    }
    peak = gate()
    tree_types: dict[int, set[tuple[int, ...]]] = {1: {(1, 1, 0, 0, 0, 0, 0)}}
    tree_counts = [0, 1]
    for order in range(2, 17):
        jets = set()
        count = 0
        for tree in nx.nonisomorphic_trees(order):
            count += 1
            jets.add(forest.tree_jet(tree))
        tree_types[order] = jets
        tree_counts.append(count)
        peak = max(peak, gate())
    assert tree_counts == [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320]

    jets_by_components = {1: set(tree_types[16]), 2: set()}
    for left_order in range(1, 16):
        right_order = 16 - left_order
        for left in tree_types[left_order]:
            for right in tree_types[right_order]:
                jets_by_components[2].add(forest.multiply(left, right))
    for components in (1, 2):
        assert len(jets_by_components[components]) == catalog_rows[(16, components)]["distinct_coefficient_jets"]
    peak = max(peak, gate())

    base_terms = base_polynomial().terms()
    rows = []
    exact_obstructions = []
    overall_minimum = None
    overall_witness = None
    checks = 0
    for components in (1, 2):
        minimum = None
        minimum_witness = None
        negative_jets = 0
        for jet in sorted(jets_by_components[components]):
            controls, gap, inverse_t = joint_jet_controls(base_terms, jet, components)
            negatives = [list(index) for index, value in sorted(controls.items()) if value < 0]
            current_index, current_minimum = min(controls.items(), key=lambda item: item[1])
            if minimum is None or current_minimum < minimum:
                minimum = current_minimum
                minimum_witness = {
                    "jet_f0_to_f6": list(jet),
                    "component_gap": gap,
                    "f6_over_f5": str(inverse_t),
                    "bernstein_index": list(current_index),
                }
            if overall_minimum is None or current_minimum < overall_minimum:
                overall_minimum = current_minimum
                overall_witness = {"components": components, **minimum_witness}
            if negatives:
                negative_jets += 1
                exact_obstructions.append(
                    {
                        "components": components,
                        "jet_f0_to_f6": list(jet),
                        "component_gap": gap,
                        "f6_over_f5": str(inverse_t),
                        "negative_indices": negatives,
                    }
                )
            checks += len(controls)
        rows.append(
            {
                "components": components,
                "distinct_joint_jets": len(jets_by_components[components]),
                "status": "SEALED" if negative_jets == 0 else "OPEN_JOINT_JET_BERNSTEIN_METHOD",
                "negative_joint_jets": negative_jets,
                "minimum_control": str(minimum),
                "minimum_witness": minimum_witness,
            }
        )
        peak = max(peak, gate())

    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-r10-m16-c1-2-joint-jet-v1",
        "status": (
            "PASS_EXACT_MASK3_N26_R10_M16_C1_2_JOINT_JET_CLOSURE"
            if not exact_obstructions
            else "PASS_EXACT_PARTIAL_JOINT_JET_SCAN_WITH_OPEN_NO_CELL_CREDIT"
        ),
        "scope": (
            "Only Delta0/new-leaf/mask3 at (N,r,m)=(26,10,16), component "
            "counts c=1,2, the two subboxes left open by separately extremized bounds."
        ),
        "method": (
            "NetworkX free-tree rooted DP builds every exact coefficient jet. "
            "For each joint jet, the component gap and exact f5/f6 are kept "
            "compatible and all 54 rational Bernstein controls on the X,V box are tested."
        ),
        "rows": rows,
        "exact_obstructions": exact_obstructions,
        "counts": {
            "joint_jets": sum(len(jets) for jets in jets_by_components.values()),
            "bernstein_controls": checks,
            "negative_joint_jets": len(exact_obstructions),
        },
        "joint_jet_sparse_sha256": jet_sha256(sorted(jets_by_components.items())),
        "overall_minimum_control": str(overall_minimum),
        "overall_minimum_witness": overall_witness,
        "hashes": hashes,
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "A zero-negative result closes only these c=1,2 joint-jet subboxes, "
            "and only after an independent geng/deletion replay. It does not by "
            "itself close the five-cell package, finite mask3, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROWS", rows)
    print("JETS", payload["counts"]["joint_jets"], "CONTROLS", checks, "OPEN", len(exact_obstructions))
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
