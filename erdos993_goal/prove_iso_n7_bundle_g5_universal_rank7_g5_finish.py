#!/usr/bin/env python3
"""Assemble the exact universal rank-seven bundle g5 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g5_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "finite_source": "census_iso_n7_bundle_g5_finite_n2_10_root.py",
    "finite_report": "iso_n7_bundle_g5_finite_n2_10_exact_root_20260830.json",
    "no_parent_source": "prove_iso_n7_bundle_g5_no_parent_n11_rank7_g5_finish.py",
    "no_parent_report": "iso_n7_bundle_g5_no_parent_n11_exact_rank7_g5_finish_20260831.json",
    "endpoint_source": "prove_iso_n7_bundle_g5_endpoint_reduction_rank7_g5_finish.py",
    "endpoint_report": "iso_n7_bundle_g5_endpoint_reduction_exact_rank7_g5_finish_20260831.json",
    "ordinary_source": "prove_iso_n7_bundle_g5_ordinary_reduction_n11_rank7_g5_finish.py",
    "ordinary_report": "iso_n7_bundle_g5_ordinary_reduction_n11_exact_rank7_g5_finish_20260831.json",
    "parent_source": "explore_iso_n7_bundle_g5_parent_modes_rank7_g5_tail.py",
    "parent_report": "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json",
}
EXPECTED = {
    "finite_source": "BC4FCA1346224A050DBDDD582EA9B4F7B9DAD9A287F375CD50A7FE3C414CF45B",
    "finite_report": "0FC5B760CDAC271A2C4E9015F013089804BC155BE726366ABB521292C5ACDFFB",
    "no_parent_source": "56379ADA4BA3266EA0F9D88FDF61385AAFFB3616FCA6BC716D4B39C7685B632B",
    "no_parent_report": "C3C5CC0E3371DF8D7C12E9FF6BC7A195EC9F333801EA2087DE731573BADCAA12",
    "endpoint_source": "49C4B4D23A5C647854BEEDBFF49EDD557A501C89B2AE878EA868322D9A695547",
    "endpoint_report": "78EE89E814177F71D60A89A38F39630C0E398500D13AF2C37F77FA60D7115F47",
    "ordinary_source": "3423DFE51DBA37C9AADEC51885743BF14C378E2295E618181E5DA38BFD8429FD",
    "ordinary_report": "35AA524C2D6A617A8E5FB38200BE6F3AA9349CBBF5FCCCE8B1B50E57DC6C2394",
    "parent_source": "B5968431C7AC00E325D1372D4A23F19BFD98BB71491CD30ABF38204E126329E5",
    "parent_report": "FF80D6A3F382E27E55316C6A31CE58D9D9E0DBC9027F38177F565ABA7D016309",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str):
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key

    finite = load("finite_report")
    no_parent = load("no_parent_report")
    endpoint = load("endpoint_report")
    ordinary = load("ordinary_report")
    parent = load("parent_report")

    assert finite["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G5_FINITE_N2_10_ROOT"
    assert finite["orders"] == [2, 10]
    assert finite["negative_g5"] == 0 and not finite["first_negatives"]
    assert set(finite["mode_counts"]) == {
        "no_parent", "endpoint_parent", "ordinary_parent"
    }
    assert all(value >= 0 for value in finite["mode_minima"].values())

    assert no_parent["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G5_NO_PARENT_N11_RANK7_G5_FINISH"
    assert no_parent["threshold"] == 11
    assert no_parent["negative_tail_scalar_coefficients"] == 0

    assert endpoint["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G5_ENDPOINT_REDUCTION_RANK7_G5_FINISH"
    assert endpoint["threshold"] == 8
    assert endpoint["exact_identities_verified"] is True
    assert set(endpoint["decompositions"]) == {"endpoint_u", "endpoint_v"}

    assert ordinary["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G5_ORDINARY_REDUCTION_N11_RANK7_G5_FINISH"
    assert ordinary["threshold"] == 11
    assert ordinary["exact_correction_identity_verified"] is True

    assert parent["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G5_PARENT_MODES_RANK7_G5_TAIL"
    assert set(parent["modes"]) == {
        "no_parent", "endpoint_u", "endpoint_v", "ordinary_parent"
    }

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every finite forest C, every ordered pair of distinct marked "
            "vertices u,v, and every canonical parent mode D=C, D=C-u, D=C-v, "
            "or D=C-p with p ordinary, the exact rank-seven bundle coefficient "
            "g5 is nonnegative."
        ),
        "coverage": [
            {
                "orders": "2<=n<=10",
                "modes": "all parent modes",
                "certificate": FILES["finite_report"],
                "method": "exact exhaustive unlabeled-forest census",
            },
            {
                "orders": "n>=11",
                "modes": "no-parent",
                "certificate": FILES["no_parent_report"],
                "method": "five exact coupled-moment Bernstein cones",
            },
            {
                "orders": "n>=11",
                "modes": "endpoint-u and endpoint-v",
                "certificate": FILES["endpoint_report"],
                "method": "exact nonnegative reduction to no-parent (valid n>=8)",
            },
            {
                "orders": "n>=11",
                "modes": "ordinary parent",
                "certificate": FILES["ordinary_report"],
                "method": "exact nonnegative reduction to no-parent",
            },
            {
                "orders": "n<=1",
                "modes": "all",
                "method": "vacuous: no ordered pair of distinct marked vertices",
            },
        ],
        "finite_evidence": {
            "unlabeled_forests": finite["unlabeled_forests"],
            "ordered_mark_pairs": finite["ordered_mark_pairs"],
            "parent_cells": finite["parent_cells"],
            "minimum": finite["minimum"],
            "ordered_stream_sha256": finite["ordered_stream_sha256"],
        },
        "large_order_evidence": {
            "no_parent_threshold": no_parent["threshold"],
            "no_parent_bernstein_controls": no_parent["total_bernstein_controls"],
            "no_parent_tail_scalar_coefficients": no_parent["total_tail_scalar_coefficients"],
            "ordinary_reduction_threshold": ordinary["threshold"],
            "endpoint_reduction_threshold": endpoint["threshold"],
        },
        "coverage_gap": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "This closes the universal rank-seven bundle g5 coefficient only. "
            "It does not by itself close other rank-seven coefficients, rank six, "
            "the final Newton-tail assembly, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    digest = hashlib.sha256(encoded.encode()).hexdigest().upper()
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap": None,
        "finite_negative_g5": finite["negative_g5"],
        "large_order_negative_tail_coefficients": no_parent["negative_tail_scalar_coefficients"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", digest)
    print(MARKER)


if __name__ == "__main__":
    main()
