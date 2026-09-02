#!/usr/bin/env python3
"""Independent Python audit of the fast Rust gentree binary stream at n=11."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


HERE = Path(__file__).resolve().parent
GENERATOR = HERE / "_third_party" / "nauty2_9_3" / "gentreeg.exe"
RUST_SOURCE = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_"
    "gentree_stream_v2_rank7_g4_piecewise.rs"
)
RUST_BINARY = RUST_SOURCE.with_suffix(".exe")
OUTPUT = HERE / (
    "iso_n7_bundle_g1_gentree_stream_v2_binary_independent_audit_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_GENTREE_STREAM_V2_BINARY_INDEPENDENT_"
    "AUDIT_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "_third_party/nauty2_9_3/gentreeg.exe":
        "3D7B5A2642AF4C71BB1A14F17694521D5AA3C6E634888883EE1BCB7B5694A977",
    RUST_SOURCE.name:
        "84CA389F1B79B56E2921838841FE99F1FB65BB9A10AFD5FB6133F26F537ECAD4",
    RUST_BINARY.name:
        "7A0C891C6FC1BE85872686E72034D8B9FB3E6CD103B7D2FCD59C2079FD8626BE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(left: list[int], right: list[int]) -> list[int]:
    result = [0] * 9
    for first, a in enumerate(left):
        for second, b in enumerate(right[:9-first]):
            result[first+second] += a*b
    return result


def rows(tokens: list[int]) -> list[int]:
    order = len(tokens)
    children = [[] for _ in tokens]
    for child in range(1, order):
        children[tokens[child]-1].append(child)
    excluded = [[0]*9 for _ in tokens]
    included = [[0]*9 for _ in tokens]
    for vertex in reversed(range(order)):
        excluded[vertex][0] = 1
        included[vertex][1] = 1
        for child in children[vertex]:
            excluded[vertex] = multiply(
                excluded[vertex],
                [excluded[child][k]+included[child][k] for k in range(9)],
            )
            included[vertex] = multiply(included[vertex], excluded[child])
    return [excluded[0][rank]+included[0][rank] for rank in range(9)]


def q(row: list[int]) -> int:
    w3, w4, w5, w6, w7, w8 = row[3:9]
    return (
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    generated = subprocess.run(
        [str(GENERATOR), "-q", "-p", "11"],
        cwd=HERE,
        capture_output=True,
        text=True,
        check=True,
    )
    assert generated.stderr == ""
    stream = hashlib.sha256(b"G1_GENTREE_BINARY_V2\0" + bytes([11]))
    total = eligible = negative = 0
    minimum = None
    for line in generated.stdout.splitlines():
        tokens = [int(value) for value in line.split()]
        assert len(tokens) == 11 and tokens[0] == 0
        degree = [0] * 11
        for child in range(1, 11):
            parent = tokens[child]-1
            degree[child] += 1
            degree[parent] += 1
        degrees = sorted(degree, reverse=True)
        active = degrees[0] >= 4 and sum(value >= 3 for value in degrees) >= 3
        stream.update(total.to_bytes(8, "little"))
        stream.update(bytes(tokens))
        stream.update(bytes(degrees))
        stream.update(bytes([active]))
        if active:
            row = rows(tokens)
            value = q(row)
            for item in row:
                stream.update(item.to_bytes(16, "little", signed=True))
            stream.update(value.to_bytes(16, "little", signed=True))
            eligible += 1
            negative += value < 0
            candidate = (value, total, tokens, degrees, row)
            minimum = candidate if minimum is None else min(minimum, candidate)
        total += 1
    digest = stream.hexdigest().upper()
    print("PYTHON_ORDERED_BINARY_STREAM_SHA256", digest)
    assert total == 235
    assert eligible == 54
    assert negative == 0
    assert minimum[0] == 952616
    assert minimum[3] == [4, 3, 3, 2, 2, 1, 1, 1, 1, 1, 1]
    assert minimum[4] == [1, 11, 45, 89, 89, 43, 10, 1, 0]
    assert digest == "AF9BD67287C80CD41CCCCDD7B47503526E604426DDED0EC7B327BB609F00E44A"

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "The independent Python reconstruction of the v2 binary record "
            "format and G1 recurrence reproduces the Rust order-11 stream "
            "SHA-256, counts, minimum value, degree sequence, and rows."
        ),
        "audit": {
            "order": 11,
            "free_trees": total,
            "eligible_trees": eligible,
            "negative": negative,
            "minimum_G1": minimum[0],
            "ordered_binary_stream_sha256": digest,
        },
        "coverage_gap_within_binary_stream_audit_scope": None,
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["audit"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
