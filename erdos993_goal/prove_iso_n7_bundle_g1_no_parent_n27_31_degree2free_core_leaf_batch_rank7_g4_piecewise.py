#!/usr/bin/env python3
"""Exact bounded core/leaf census for degree-two-free orders 27..31."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
GENERATOR = HERE / "_third_party" / "nauty2_9_3" / "gentreeg.exe"
EVALUATOR = HERE / (
    "census_iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_"
    "batch_rank7_g4_piecewise.exe"
)
OUTPUT = HERE / (
    "iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N27_31_DEGREE2FREE_CORE_"
    "LEAF_BATCH_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "census_iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_rank7_g4_piecewise.cpp":
        "43DAB95FAA7EECFB5E4BFEAEC0A95E94D3A5AE71BDB275B13D90A1B16FE80E88",
    "census_iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_rank7_g4_piecewise.exe":
        "133529A2CF1A4DD86DD90F2C0EDA800472179660D6AB18270049AC37CFBD0669",
    "_third_party/nauty2_9_3/gentreeg.exe":
        "3D7B5A2642AF4C71BB1A14F17694521D5AA3C6E634888883EE1BCB7B5694A977",
    "_third_party/nauty2_9_3/gentreeg.c":
        "97EEBB7B560BC3B3B7F5C1BF2B3C85687C57FA6202EC4478C40BBA6CBA25B26F",
    "_third_party/nauty2_9_3/nausha.c":
        "D12E2F9A5D44382A01454C561185F04FC5A09B909124EC2388DB76CD37829BE3",
    "_third_party/nauty2_9_3/nausha.h":
        "8FC7C08DF3B2B9E90056DDC1259D84387A453F6B4AD05955C62B69DBC2C647DD",
    "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py":
        "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D",
    "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json":
        "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490",
}
EXPECTED = {
    27: {
        "assignments": 646210,
        "eligible": 646210,
        "crosschecks": 9,
        "minimum_value": 48481970421,
        "stream_sha256": "1E2E81BAFFC74C6D534A53403AE2EAFD8AF6A1CDAA3ACFE469C7815699D2A5DB",
    },
    28: {
        "assignments": 1279685,
        "eligible": 1279420,
        "crosschecks": 19,
        "minimum_value": 73232064929,
        "stream_sha256": "4CC0429A44F61448AB2402BEB4E4CC41C5A5F661299001DB4E85B508479CB375",
    },
    29: {
        "assignments": 2545377,
        "eligible": 2545377,
        "crosschecks": 38,
        "minimum_value": 108733603943,
        "stream_sha256": "B65289EBB8C63404978D562D59FED5CB3F158C6E275A547DE9E26F7C3BE61917",
    },
    30: {
        "assignments": 5083928,
        "eligible": 5083376,
        "crosschecks": 77,
        "minimum_value": 158996250980,
        "stream_sha256": "8990466BAA98F825D2173EF6B4C6FE8CD84610AFD365656D5E0C652462CC2223",
    },
    31: {
        "assignments": 10193853,
        "eligible": 10193853,
        "crosschecks": 155,
        "minimum_value": 229144449120,
        "stream_sha256": "11A27DD9E23A1F45630459B2A4576CE1174BEAF4B093AC0718ECCCAD74CC7690",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_array(text: str) -> list[int]:
    result = json.loads(text)
    assert isinstance(result, list) and all(isinstance(item, int) for item in result)
    return result


def run_census() -> dict[int, dict[str, object]]:
    generator = subprocess.Popen(
        [str(GENERATOR), "-q", "-p", "3:14"],
        cwd=HERE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert generator.stdout is not None
    evaluator = subprocess.run(
        [str(EVALUATOR)],
        cwd=HERE,
        stdin=generator.stdout,
        capture_output=True,
        text=True,
        check=True,
    )
    generator.stdout.close()
    generator_stderr = generator.stderr.read().decode() if generator.stderr else ""
    assert generator.wait() == 0
    assert generator_stderr == ""
    assert evaluator.stderr == ""

    records = {}
    current = None
    for line in evaluator.stdout.splitlines():
        key, value = line.split(" ", 1)
        if key == "ORDER":
            current = int(value)
            assert current not in records
            records[current] = {}
            continue
        assert current is not None
        normalized = key.lower()
        if key in {"MINIMUM_PARENT", "MINIMUM_LEAVES", "MINIMUM_DEGREES", "MINIMUM_ROW"}:
            records[current][normalized] = parse_array(value)
        elif key == "STREAM_SHA256":
            records[current][normalized] = value
        else:
            records[current][normalized] = int(value)
    assert set(records) == set(range(27, 32))
    return records


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / Path(name)) == digest, name

    records = run_census()
    for order, expected in EXPECTED.items():
        record = records[order]
        assert record["assignments"] == expected["assignments"]
        assert record["eligible"] == expected["eligible"]
        assert record["negative"] == 0
        assert record["crosschecks"] == expected["crosschecks"]
        assert record["minimum_value"] == expected["minimum_value"]
        assert record["stream_sha256"] == expected["stream_sha256"]
        assert record["minimum_row"][0] == 1
        assert record["minimum_row"][1] == order

    # Independent symbolic reconstruction of the literal G1 quadratic.
    parent = json.loads((
        HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}")
        for family in "WABZ" for rank in range(2, 9)
    }
    expression = sp.expand(sp.sympify(
        parent["modes"]["no_parent"]["expression"], locals=symbols
    ))
    shifts = {
        symbols[f"A{rank}"]: symbols[f"W{rank - 1}"]
        for rank in range(4, 9)
    }
    shifts.update({
        symbols[f"B{rank}"]: symbols[f"W{rank - 1}"]
        for rank in range(4, 9)
    })
    shifts.update({
        symbols[f"Z{rank}"]: symbols[f"W{rank - 2}"]
        for rank in range(5, 9)
    })
    reduced = sp.expand(expression.subs(shifts, simultaneous=True))
    w3, w4, w5, w6, w7, w8 = (
        symbols[f"W{rank}"] for rank in range(3, 9)
    )
    q = sp.expand(
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )
    assert sp.expand(reduced - q) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every order m=27,28,29,30,31, every connected "
            "degree-two-free m-vertex tree W with maximum degree at least "
            "four and at least three branching vertices has strictly "
            "positive rank-seven common0/sum0 no-parent G1."
        ),
        "gapless_parameterization": {
            "core_orders": [3, 14],
            "unlabeled_core_counts_3_through_14": [
                1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159
            ],
            "argument": (
                "Deleting all leaves leaves a tree on the branching "
                "vertices. Conversely, every core plus ordered leaf counts "
                "making all core degrees at least three reconstructs every "
                "degree-two-free tree. The inequality leaves>=branching+2 "
                "bounds the core order by 14 throughout m<=31."
            ),
            "automorphism_duplicates": (
                "Allowed and harmless: ordered assignments can duplicate an "
                "isomorphism class but cannot omit one."
            ),
            "coverage_gap": None,
        },
        "orders": {
            str(order): {
                "ordered_leaf_assignments": records[order]["assignments"],
                "eligible_assignments": records[order]["eligible"],
                "negative": records[order]["negative"],
                "minimum_G1": records[order]["minimum_value"],
                "minimum_core_order": records[order]["minimum_core_order"],
                "minimum_core_index": records[order]["minimum_core_index"],
                "minimum_parent": records[order]["minimum_parent"],
                "minimum_leaves": records[order]["minimum_leaves"],
                "minimum_branch_degrees": records[order]["minimum_degrees"],
                "minimum_independence_row_0_through_8": records[order]["minimum_row"],
                "independent_explicit_tree_DP_crosschecks": records[order]["crosschecks"],
                "ordered_certificate_stream_sha256": records[order]["stream_sha256"],
                "coverage_gap": None,
            }
            for order in range(27, 32)
        },
        "exact_evaluation": (
            "Pinned C++ weighted core DP through rank eight, signed 128-bit "
            "evaluation of the independently reconstructed literal G1 "
            "quadratic, SHA-256 commitment to every eligible record, and "
            "periodic independent explicit-tree DP crosschecks."
        ),
        "coverage_gap_within_stated_degree2free_orders_27_31_scope": None,
        "scope_guard": (
            "Rank-seven G1 only, actual connected trees, common0/sum0 "
            "no-parent only, degree-two-free orders 27..31, maximum "
            "degree>=4, and at least three branching vertices."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders": [27, 31],
        "eligible_assignments": {
            str(order): records[order]["eligible"] for order in range(27, 32)
        },
        "negative": 0,
        "minimum_G1": {
            str(order): records[order]["minimum_value"] for order in range(27, 32)
        },
        "coverage_gap_within_stated_degree2free_orders_27_31_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
