#!/usr/bin/env python3
"""Independent geng/bitmask replay of the Delta2 |F|<=6 literal tail."""

from __future__ import annotations

import ctypes
import functools
import hashlib
import itertools
import json
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path

import networkx as nx
import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_independent_audit_agent_20260823.json"
GENG = HERE / "nauty2_8_9" / "geng.exe"
ABORT_BYTES = 424 * 1024**2
MODULUS = 1 << 256
MAX_M = 6
EXPECTED = {
    "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": "6B533FFBCF504FFB3CAB5BF1B08FF6BB1BC70B8AB773DF3C4C0A4751C14BC2E1",
    "rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_exact_agent_20260823.json": "FA54677293ED1726E8092B3799808552D404BB71E98486C03170C5AF3B245CE1",
    "nauty2_8_9/geng.exe": "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4",
}
TREE_COUNTS = [0, 1, 1, 1, 2, 3, 6]


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
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


@dataclass(frozen=True)
class Record:
    order: int
    code: bytes
    jet: tuple[int, ...]
    deletion_jets: tuple[tuple[int, ...], ...]


def stable_bytes(path: Path) -> bytes:
    before = path.stat()
    data = path.read_bytes()
    after = path.stat()
    assert before.st_size == after.st_size == len(data), path.name
    assert before.st_mtime_ns == after.st_mtime_ns, path.name
    return data


def sha256(path: Path) -> str:
    return hashlib.sha256(stable_bytes(path)).hexdigest().upper()


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


def plus(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(a + b for a, b in zip(left, right))


def convolution(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        sum(left[index] * right[total - index] for index in range(total + 1))
        for total in range(7)
    )


def literal_graph_jets(graph: nx.Graph):
    vertices = tuple(sorted(graph))
    position = {vertex: index for index, vertex in enumerate(vertices)}
    closed = []
    for vertex in vertices:
        mask = 1 << position[vertex]
        for neighbor in graph[vertex]:
            mask |= 1 << position[neighbor]
        closed.append(mask)

    @functools.lru_cache(maxsize=None)
    def recurse(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1, 0, 0, 0, 0, 0, 0)
        vertex = (mask & -mask).bit_length() - 1
        excluded = recurse(mask ^ (1 << vertex))
        included = recurse(mask & ~closed[vertex])
        return plus(excluded, (0,) + included[:6])

    full = (1 << len(vertices)) - 1
    return recurse(full), tuple(
        sorted({recurse(full ^ (1 << index)) for index in range(len(vertices))})
    )


def geng_codes(order: int):
    edges = order - 1
    result = subprocess.run(
        [str(GENG), "-cq", str(order), f"{edges}:{edges}"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert result.stderr == b""
    return tuple(line.strip() for line in result.stdout.splitlines() if line.strip())


def build_records():
    records = []
    stream = hashlib.sha256()
    counts = [0]
    peak = gate()
    for order in range(1, MAX_M + 1):
        codes = geng_codes(order)
        counts.append(len(codes))
        for code in reversed(codes):
            graph = nx.from_graph6_bytes(code)
            assert nx.is_tree(graph)
            jet, deletions = literal_graph_jets(graph)
            records.append(Record(order, code, jet, deletions))
            stream.update(f"order={order};".encode())
            stream.update(code)
            stream.update(b"\n")
        peak = max(peak, gate())
    assert counts == TREE_COUNTS
    records.sort(key=lambda row: (row.order, row.code))
    return tuple(records), stream.hexdigest().upper(), peak


def multiset_forests(records, total: int, components: int):
    answer = []

    def recurse(remaining: int, count: int, start: int):
        if count == 0:
            if remaining == 0:
                yield tuple(answer)
            return
        maximum_order = remaining - (count - 1)
        for index in range(start, len(records)):
            order = records[index].order
            if order > maximum_order:
                break
            answer.append(records[index])
            yield from recurse(remaining - order, count - 1, index)
            answer.pop()

    yield from recurse(total, components, 0)


@functools.lru_cache(maxsize=None)
def restricted_growth_strings(size: int):
    if size == 0:
        return ((),)
    answer = []
    sequence = [0]

    def recurse(index: int, maximum: int):
        if index == size:
            answer.append(tuple(sequence))
            return
        for value in range(maximum + 2):
            sequence.append(value)
            recurse(index + 1, max(maximum, value))
            sequence.pop()

    recurse(1, 0)
    return tuple(answer)


def multiply_all(jets) -> tuple[int, ...]:
    result = (1, 0, 0, 0, 0, 0, 0)
    for jet in jets:
        result = convolution(result, jet)
    return result


def quotient_states(components: tuple[Record, ...]):
    if not components:
        return {(0, (1, 0, 0, 0, 0, 0, 0))}
    result = set()
    p_jets = tuple(component.jet for component in components)
    for deletions in itertools.product(*(component.deletion_jets for component in components)):
        for assignment in restricted_growth_strings(len(components)):
            groups = max(assignment) + 1
            product = (1, 0, 0, 0, 0, 0, 0)
            for root in range(groups):
                indices = [index for index, value in enumerate(assignment) if value == root]
                excluded = multiply_all(p_jets[index] for index in indices)
                deleted = multiply_all(deletions[index] for index in indices)
                product = convolution(product, plus(excluded, (0,) + deleted[:6]))
            result.add((groups, product))
    return result


def q_upper(row, rank):
    return sp.cancel(
        row[rank] * (2 * rank * row[rank] - row[rank - 1])
        / (2 * (rank + 1) * row[rank - 1])
    )


def independent_gate_terms():
    d = sp.symbols("d0:9", nonnegative=True)
    f = sp.symbols("f0:8", nonnegative=True)
    raw = newton_coefficients(residual())[2]
    c_prime = [c[index] + (d[index - 1] if index else 0) for index in range(9)]
    substitutions = {c[index]: c_prime[index] for index in range(9)}
    substitutions.update({h[6]: c[6], h[7]: c[7]})
    expression = sp.expand(raw.subs(substitutions, simultaneous=True))
    c8_upper = q_upper(c, 7)
    d7_upper = q_upper(d, 6)
    expression = expression.subs({c[8]: c8_upper, d[7]: d7_upper}, simultaneous=True)
    structural = {
        c[index]: d[index] + (f[index - 1] if index else 0) for index in range(8)
    }
    expression = expression.subs(structural, simultaneous=True)
    expression = expression.subs({d[7]: d7_upper}, simultaneous=True)
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert str(sp.factor(denominator)) == "392*d5**4*(d6 + f5)"
    generators = (d[3], d[4], d[5], d[6], f[3], f[4], f[5], f[6])
    polynomial = sp.Poly(sp.expand(numerator), *generators)
    terms = polynomial.terms()
    serial = json.dumps(
        {
            "generators": [str(value) for value in generators],
            "terms": [[list(monomial), str(coefficient)] for monomial, coefficient in terms],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    assert hashlib.sha256(serial).hexdigest().upper() == "C61B3F468548F9400E60C1604F05FAD1A2448B76A47C33A4BD140DFE12754FAE"
    degree = max(
        3 * monomial[0] + 4 * monomial[1] + 5 * monomial[2] + 6 * monomial[3]
        for monomial, _ in terms
    )
    return terms, degree


def evaluate_terms(terms, djet, fjet):
    values = (djet[3], djet[4], djet[5], djet[6], fjet[3], fjet[4], fjet[5], fjet[6])
    total = 0
    for monomial, coefficient in terms:
        term = int(coefficient)
        for value, exponent in zip(values, monomial):
            if exponent:
                term *= value**exponent
        total += term
    return total


def empty_extension(jet, count):
    return tuple(
        sum(math.comb(count, chosen) * jet[index - chosen] for chosen in range(index + 1))
        for index in range(7)
    )


def forward_differences(values):
    answer = []
    current = values
    while current:
        answer.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    return tuple(answer)


def fingerprint_add(state, signature):
    value = int.from_bytes(
        hashlib.sha256(json.dumps(signature, separators=(",", ":")).encode()).digest(), "big"
    )
    state[0] ^= value
    state[1] = (state[1] + value) % MODULUS
    state[2] = (state[2] + value * value) % MODULUS


def main() -> None:
    before = {name: sha256(HERE / name) for name in EXPECTED}
    assert before == EXPECTED
    primary = json.loads(stable_bytes(PRIMARY).decode("utf-8"))
    assert primary["status"] == "PASS_EXACT_DELTA2_NEW_LEAF_M0_6_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL"
    terms, degree = independent_gate_terms()
    assert degree == primary["degree_in_empty_roots"] == 52
    records, geng_stream, peak = build_records()

    rows = []
    total_forests = total_quotients = 0
    fingerprint = [0, 0, 0]
    for m in range(MAX_M + 1):
        row = {
            "m": m,
            "minimum_total_roots": 26 - m,
            "forest_types": 0,
            "quotient_cases": 0,
            "negative_values_at_minimum_order": 0,
            "negative_forward_differences": 0,
            "minimum_value": None,
            "minimum_forward_difference": None,
        }
        component_range = (0,) if m == 0 else range(1, m + 1)
        for component_count in component_range:
            for components in multiset_forests(records, m, component_count):
                row["forest_types"] += 1
                total_forests += 1
                fjet = multiply_all(component.jet for component in components)
                for nonempty_roots, nonempty_jet in sorted(quotient_states(components), reverse=True):
                    minimum_empty = (26 - m) - nonempty_roots
                    values = [
                        evaluate_terms(terms, empty_extension(nonempty_jet, minimum_empty + t), fjet)
                        for t in range(degree + 1)
                    ]
                    differences = forward_differences(values)
                    assert all(value >= 0 for value in differences)
                    row["quotient_cases"] += 1
                    total_quotients += 1
                    row["minimum_value"] = values[0] if row["minimum_value"] is None else min(row["minimum_value"], values[0])
                    local_min = min(differences)
                    row["minimum_forward_difference"] = local_min if row["minimum_forward_difference"] is None else min(row["minimum_forward_difference"], local_min)
                    fingerprint_add(
                        fingerprint,
                        [
                            m,
                            component_count,
                            list(fjet),
                            nonempty_roots,
                            list(nonempty_jet),
                            minimum_empty,
                            str(values[0]),
                            [str(value) for value in differences],
                        ],
                    )
                peak = max(peak, gate())
        rows.append(row)

    assert rows == primary["rows"]
    assert (total_forests, total_quotients) == (43, 205)
    fingerprint_hex = {
        name: f"{value:064X}" for name, value in zip(("xor", "sum", "sum_squares"), fingerprint)
    }
    assert fingerprint_hex == primary["canonical_quotient_fingerprint_mod_2_256"]
    after = {name: sha256(HERE / name) for name in EXPECTED}
    assert after == before
    peak = max(peak, gate())
    assert peak < 100 * 1024**2
    payload = {
        "schema": "rank8-delta2-new-leaf-m0-6-literal-empty-root-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_BITMASK_DELTA2_NEW_LEAF_M0_6_ALL_ORDER_TAIL",
        "scope": primary["scope"],
        "method": "nauty geng free trees, literal induced-subgraph recursion for all deletion jets, global multiset forests, restricted-growth partitions, independently derived endpoint polynomial, and exact forward differences",
        "counts": {
            "forest_types": total_forests,
            "quotient_cases": total_quotients,
            "negative_values_at_minimum_order": 0,
            "negative_forward_differences": 0,
        },
        "degree_in_empty_roots": degree,
        "canonical_quotient_fingerprint_mod_2_256": fingerprint_hex,
        "geng_reverse_stream_sha256": geng_stream,
        "hashes": before,
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "verified_peak_private_bytes_strictly_less_than": 100 * 1024**2,
        },
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FORESTS", total_forests, "QUOTIENTS", total_quotients, "NEGATIVE 0")
    print("PEAK_MIB", round(peak / 1024**2, 2), "VERIFIED_LT_100")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
