#!/usr/bin/env python3
"""Gapless exact gentree census for the residual G1 cell at orders 21..22.

The pinned nauty generator emits one canonical parent array per free tree.
The pinned Rust evaluator computes I(W) through row eight by exact i128 tree
DP, applies the literal G1 quadratic, and SHA-256 commits to every generated
parent array, degree sequence, active flag, eligible row, and value.  Orders
11 and 20 are replayed first against the already frozen independent Python
census, which provides an implementation bridge before the new orders.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


HERE = Path(__file__).resolve().parent
GENERATOR = HERE / "_third_party" / "nauty2_9_3" / "gentreeg.exe"
EVALUATOR_SOURCE = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_"
    "gentree_stream_rank7_g4_piecewise.rs"
)
EVALUATOR = EVALUATOR_SOURCE.with_suffix(".exe")
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n21_22_"
    "gentree_census_exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N21_22_GENTREE_CENSUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "_third_party/nauty2_9_3/gentreeg.c":
        "97EEBB7B560BC3B3B7F5C1BF2B3C85687C57FA6202EC4478C40BBA6CBA25B26F",
    "_third_party/nauty2_9_3/gentreeg.exe":
        "3D7B5A2642AF4C71BB1A14F17694521D5AA3C6E634888883EE1BCB7B5694A977",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_gentree_stream_rank7_g4_piecewise.rs":
        "5186D58654F513A5C81228D3C53999F4118350926B0F93483F327B06937DC0F7",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_gentree_stream_rank7_g4_piecewise.exe":
        "5B6316A7851DC1FB224CB38BBF50463BC84A02AFB923379348A0CDD9AB0431FE",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_census_rank7_g4_piecewise.py":
        "18AB6138274C7DBA35F4C9454EF7C45F6B3ADC6EB2F4095BAC741F194B9C38F9",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_census_exact_rank7_g4_piecewise_20260831.json":
        "902A66F073D3FDC1E2F4C3F7FBC64F1945778CD2C029B22A25A025FCC2BDE8D4",
}
EXPECTED = {
    11: {
        "total": 235,
        "eligible": 54,
        "negative": 0,
        "minimum_value": 952616,
        "minimum_degrees": [4, 3, 3, 2, 2, 1, 1, 1, 1, 1, 1],
        "minimum_row": [1, 11, 45, 89, 89, 43, 10, 1, 0],
        "stream": "2797267BDD8CC6391EEC6896A31F3B51C5233FCCA80017DC89AD4F9F72CD496B",
    },
    20: {
        "total": 823065,
        "eligible": 757890,
        "negative": 0,
        "minimum_value": 1396891873,
        "minimum_degrees": [4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1],
        "minimum_row": [1, 20, 171, 821, 2453, 4801, 6352, 5808, 3705],
        "stream": "A4C346E6DB2A2E74627FE004C39AE57AB6261352B4A4CD833E8F0E59EBCAC6B6",
    },
    21: {
        "total": 2144505,
        "eligible": 2010086,
        "negative": 0,
        "minimum_value": 2513302245,
        "minimum_degrees": [4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1],
        "minimum_row": [1, 21, 190, 974, 3138, 6689, 9725, 9846, 7021],
        "stream": "11AC37FF4DC5F7A8C5B51A86817E3E850BC7F82166D76930492236D5C2232994",
    },
    22: {
        "total": 5623756,
        "eligible": 5340008,
        "negative": 0,
        "minimum_value": 4390277078,
        "minimum_degrees": [4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1],
        "minimum_row": [1, 22, 210, 1145, 3959, 9142, 14526, 16198, 12829],
        "stream": "AE576A91DF9171624C3A5AD4E6454C6CE6DF85609A930EEED2C482DAB53B1DE0",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_array(text: str) -> list[int]:
    assert text.startswith("[") and text.endswith("]")
    return [int(value.strip()) for value in text[1:-1].split(",")]


def evaluate(order: int) -> dict[str, object]:
    generator = subprocess.Popen(
        [str(GENERATOR), "-q", "-p", str(order)],
        cwd=HERE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert generator.stdout is not None
    evaluator = subprocess.run(
        [str(EVALUATOR), str(order)],
        cwd=HERE,
        stdin=generator.stdout,
        capture_output=True,
        text=True,
        check=True,
    )
    generator.stdout.close()
    generator_stderr = generator.stderr.read().decode() if generator.stderr else ""
    generator_status = generator.wait()
    assert generator_status == 0
    assert generator_stderr == ""
    assert evaluator.stderr == ""
    raw = {}
    for line in evaluator.stdout.splitlines():
        key, value = line.split(" ", 1)
        raw[key.lower()] = value
    assert int(raw["order"]) == order
    result = {
        "total": int(raw["total"]),
        "eligible": int(raw["eligible"]),
        "negative": int(raw["negative"]),
        "crosschecks": int(raw["crosschecks"]),
        "minimum_value": int(raw["minimum_value"]),
        "minimum_index": int(raw["minimum_index"]),
        "minimum_parent": raw["minimum_parent"],
        "minimum_degrees": parse_array(raw["minimum_degrees"]),
        "minimum_row": parse_array(raw["minimum_row"]),
        "stream": raw["ordered_stream_sha256"],
    }
    expected = EXPECTED[order]
    for key, value in expected.items():
        assert result[key] == value, (order, key, result[key], value)
    assert result["crosschecks"] == result["eligible"] // 4096
    return result


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    frozen = json.loads((HERE / list(DEPENDENCIES)[-1]).read_text(encoding="utf-8"))
    assert frozen["status"] == "proved exact"
    assert frozen["coverage_gap_within_stated_actual_n11_20_scope"] is None

    results = {str(order): evaluate(order) for order in (11, 20, 21, 22)}
    assert results["11"]["minimum_value"] == frozen["gapless_census"]["global_minimum_G1"][0]
    assert results["20"]["eligible"] == frozen["gapless_census"]["eligible_trees_by_order"]["20"]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of order 21 or 22 with maximum "
            "degree at least four and at least three branching vertices, "
            "the exact rank-seven common0/sum0 no-parent coefficient G1 "
            "is strictly positive."
        ),
        "gapless_census": {
            "orders": [21, 22],
            "free_trees": sum(results[str(order)]["total"] for order in (21, 22)),
            "eligible_trees": sum(results[str(order)]["eligible"] for order in (21, 22)),
            "negative": 0,
            "order_reports": {str(order): results[str(order)] for order in (21, 22)},
            "coverage_gap": None,
        },
        "implementation_bridge": {
            "orders": [11, 20],
            "result": (
                "The independent gentree/Rust stream exactly reproduces the "
                "eligible counts, minimum G1 values, degree sequences, and "
                "independence rows pinned by the frozen Python census."
            ),
            "order_reports": {str(order): results[str(order)] for order in (11, 20)},
        },
        "exactness": {
            "generator": "nauty gentreeg canonical free-tree parent arrays",
            "arithmetic": "signed i128 independence-polynomial DP and literal G1 quadratic",
            "ordered_stream_commitment": (
                "Every parent array, degree sequence, active flag, eligible "
                "independence row, and eligible G1 value is SHA-256 committed."
            ),
            "independent_root_recurrence_crosschecks": sum(
                results[str(order)]["crosschecks"] for order in (11, 20, 21, 22)
            ),
        },
        "scope": (
            "Actual connected-tree G1 at unmarked orders 21..22, common0/sum0 "
            "no-parent, maximum degree>=4, and at least three branching "
            "vertices. Orders 23..31 remain the finite complement before "
            "the separately pinned n32+ theorem."
        ),
        "coverage_gap_within_stated_actual_n21_22_scope": None,
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders": [21, 22],
        "eligible_trees": report["gapless_census"]["eligible_trees"],
        "negative": 0,
        "minimum_G1": min(results[str(order)]["minimum_value"] for order in (21, 22)),
        "coverage_gap_within_stated_actual_n21_22_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
