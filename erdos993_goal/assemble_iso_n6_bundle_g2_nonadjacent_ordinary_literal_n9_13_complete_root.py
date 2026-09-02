#!/usr/bin/env python3
"""Fail-closed assembly of complete literal N=9..13 ordinary-parent coverage."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_LITERAL_"
    "N9_13_COMPLETE_ROOT"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_literal_n9_13_"
    "complete_exact_root_20260831.json"
)
FILES = {
    "base_source": (
        "census_iso_n6_bundle_g2_nonadjacent_ordinary_literal_n9_13_root.cpp",
        "E85649CD8F5C6BAA22BE7DF84C30EB8F073F09EBF4479EE3D8411D248AC09A04",
    ),
    "base_executable": (
        "census_iso_n6_bundle_g2_nonadjacent_ordinary_literal_n9_13_root.exe",
        "1AC94C08BBB86F5B23F7524C209031823BE633A8075DFC1747CAC91A1B872202",
    ),
    "base_report": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_literal_n9_13_exact_root_20260831.json",
        "EB6CA70F1E0D7FB5C28B8966A76E563E08379FCAE3BDD43F975ACDFFB64FA7F9",
    ),
    "completion_source": (
        "census_iso_n6_bundle_g2_nonadjacent_ordinary_literal_common1_n12_13_root.cpp",
        "B2B60990666139BB511A371F00460B452F5E6AE7EE482ED8C5299924CEB54D4C",
    ),
    "completion_executable": (
        "census_iso_n6_bundle_g2_nonadjacent_ordinary_literal_common1_n12_13_root.exe",
        "83228C1F574376447FECC88B2B4A86D89DFD818829C14A43308CE2858657150C",
    ),
    "completion_first": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_literal_common1_n12_13_raw_root_20260831.json",
        "E3686FF2DA789B9534451805CDB0EAF9BD8E4A0F6606D9A19567865E0F253025",
    ),
    "completion_replay": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_literal_common1_n12_13_raw_replay_root_20260831.json",
        "E3686FF2DA789B9534451805CDB0EAF9BD8E4A0F6606D9A19567865E0F253025",
    ),
    "dataset": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_forest_graph6_n11_15_root_20260831.txt",
        "A043EE3A7288E7DD41D4EEB226C0B58DAEF13CB70331D77844A2FAB8B04A8484",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / FILES[name][0]).read_text(encoding="utf-8"))


def main() -> None:
    for filename, expected in FILES.values():
        assert sha256(HERE / filename) == expected
    assert (HERE / FILES["completion_first"][0]).read_bytes() == (
        HERE / FILES["completion_replay"][0]
    ).read_bytes()

    base = load("base_report")
    completion = load("completion_first")
    assert base["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_LITERAL_N9_13_ROOT"
    )
    assert completion["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
        "LITERAL_COMMON1_N12_13_ROOT"
    )
    assert base["dataset_sha256"] == FILES["dataset"][1]
    assert completion["dataset_sha256"] == FILES["dataset"][1]
    assert base["aggregate"] == {
        "triples": 29932834,
        "negative": 0,
        "global_minimum": 124519,
        "ordered_record_fnv1a64": "890CDF85AB4EFED7",
    }
    assert completion["aggregate"] == {
        "triples": 6741111,
        "negative": 0,
        "global_minimum": 1574524,
        "ordered_record_fnv1a64": "262B6D30F68E41A5",
    }
    expected_rows = {
        f"N{order}_common{common}"
        for order in range(9, 14)
        for common in (0, 1)
    }
    base_rows = set(base["rows"])
    completion_rows = set(completion["rows"])
    assert base_rows.isdisjoint(completion_rows)
    assert base_rows | completion_rows == expected_rows
    rows = {**base["rows"], **completion["rows"]}
    assert all(row["negative"] == 0 for row in rows.values())

    report = {
        "marker": MARKER,
        "status": (
            "PASS exact complete literal nonadjacent ordinary-parent N=9..13 census"
        ),
        "theorem_component": (
            "For every forest in the rank-six nonadjacent ordinary-parent "
            "bundle with 9<=N<=13, both possible common-neighbor geometries "
            "have g2>=0."
        ),
        "coverage": (
            "all unlabeled forests of marked orders 11..15; every unordered "
            "nonedge uv, every p distinct from u,v, N=9..13, and common0/common1"
        ),
        "rows": rows,
        "aggregate": {
            "literal_triples": sum(row["triples"] for row in rows.values()),
            "negative": sum(row["negative"] for row in rows.values()),
            "minimum": min(row["minimum"] for row in rows.values()),
        },
        "replay": {
            "completion_runs": 2,
            "byte_identical": True,
            "ordered_record_fnv1a64": completion["aggregate"][
                "ordered_record_fnv1a64"
            ],
        },
        "dependencies": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in FILES.items()
        },
        "scope_guard": (
            "This closes only the finite N=9..13 nonadjacent ordinary-parent "
            "G2 component; other rank-six modes and the full conjecture remain separate."
        ),
        "source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    assert report["aggregate"] == {
        "literal_triples": 36673945,
        "negative": 0,
        "minimum": 124519,
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        **report["aggregate"],
        "rows": len(rows),
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
