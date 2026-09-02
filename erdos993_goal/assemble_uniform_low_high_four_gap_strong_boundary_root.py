#!/usr/bin/env python3
"""Assemble the exact all-rank simultaneous left/right gap01 theorem."""

from __future__ import annotations

import hashlib
import json
import math
import os
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_four_gap_strong_boundary_exact_root_20260827.json"
PINNED = {
    "explore_uniform_low_high_four_gap_symbolic_payments_root.py":
        "250F102A14541C0CFC8395568935ADB5ADA015165CE12D7544F5C778D804833E",
    "uniform_low_high_four_gap_symbolic_rows_cache_root_20260827.json.gz":
        "575B666783CF8A41D787B6685AE993DA13002B2C392321D9250E7873C3BE7258",
    "scan_uniform_low_high_four_gap_left_block_root.py":
        "FB28E108234EC64B6865C7A4B8D8EE7AD059BBFBAA500B9B5A6C12C97E5D2D83",
    "diagnose_uniform_low_high_four_gap_rank_split_sparse_root.py":
        "19914430FB51B53F731826C9E773369A37385657CF637EECCBC97415305EBB7A",
    "scan_uniform_low_high_four_gap_rank_decay_tail_root.py":
        "9C2C83425B969497336C2E493007491F72776263FD84450151DA72B28FF2B133",
    "prove_uniform_low_high_four_gap_high_tight_ratio_root.py":
        "268B66915C41119B84F0C99800C3155021D7C750478E0674BF53C983AA5AD5DD",
    "audit_uniform_low_high_four_gap_high_tight_ratio_independent_root.py":
        "5693E434EEAB627DBC640757CFA5D6D70B09AFE959CEC5AFDD8056870D311360",
    "prove_uniform_low_high_left_gap0_right_gap01_slack_root.py":
        "C97D477F79EC86CD998293CC6957516C78A353A157A8B12C47068EE55409B6DB",
    "uniform_low_high_left_gap0_right_gap01_slack_exact_root_20260827.json":
        "0A5DA773954EFBAA876DF45FB95D63A6F6D799D779761DF91C7F955CD6BCE55D",
    "audit_uniform_low_high_left_gap0_right_gap01_slack_independent_root.py":
        "6A85FCD3363767EB240C2B6C21BD82A3A6F2F866AD15D676BF79F69B373F6E4C",
    "uniform_low_high_left_gap0_right_gap01_slack_independent_audit_root_20260827.json":
        "88A440024EC2C7E898FA72FC8615451F2175127EFEE77B3556F00E68B77E5BD1",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def coefficient_row(rank: int, terminal: int, gap0: int = 0, gap1: int = 0):
    ratios = [
        terminal + rank + 1 + gap0 + gap1,
        terminal + rank - 1 + gap1,
    ]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree: int):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def form(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def cross(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def direct_strong(rank, x, y, left_gap0, left_gap1, right_gap0, right_gap1):
    left_ratios, left = coefficient_row(rank, x, left_gap0, left_gap1)
    _, right = coefficient_row(rank, y, right_gap0, right_gap1)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    tail = [convolution(left_tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * form(whole) + cross(whole, tail)


def main() -> int:
    dependencies = {}
    for name, expected in PINNED.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependencies[name] = actual

    base = load("uniform_low_high_left_gap0_right_gap01_slack_exact_root_20260827.json")
    base_audit = load("uniform_low_high_left_gap0_right_gap01_slack_independent_audit_root_20260827.json")
    assert base["status"] == "PASS_EXACT_ALL_RANK_LEFT_GAP0_OVER_RIGHT_GAP01_STRONG_BOUNDARY"
    assert base_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_LEFT_GAP0_OVER_RIGHT_GAP01_AUDIT"

    left_names = [
        f"uniform_low_high_four_gap_left_block_scan_root_20260827_{start:03d}_{stop:03d}.json"
        for start, stop in ((1, 45), (46, 90), (91, 135))
    ]
    left_rows = []
    for name in left_names:
        report = load(name)
        assert report["status"] == "PASS_EXACT_FOUR_GAP_LEFT_BLOCK_SHARD"
        assert report["failure_count"] == 0
        assert report["source_sha256"] == PINNED["scan_uniform_low_high_four_gap_left_block_root.py"]
        dependencies[name] = sha256(HERE / name)
        left_rows.extend(report["results"])
    assert [row["index"] for row in left_rows] == list(range(1, 136))
    canonical_keys = [tuple(row["key"]) for row in left_rows]
    left_routes = Counter(row["route"] for row in left_rows)
    assert left_routes == Counter({"alpha": 54, "epsilon_union": 81})

    high_names = [
        f"uniform_low_high_four_gap_high_tight_ratio_root_20260827_{start:03d}_{stop:03d}.json"
        for start, stop in ((1, 45), (46, 90), (91, 135))
    ]
    high_rows = []
    for name in high_names:
        report = load(name)
        assert report["status"] == "PASS_EXACT_FOUR_GAP_HIGH_TIGHT_RATIO_SHARD"
        assert report["failure_count"] == 0
        assert report["source_sha256"] == PINNED["prove_uniform_low_high_four_gap_high_tight_ratio_root.py"]
        dependencies[name] = sha256(HERE / name)
        high_rows.extend(report["results"])
    assert [row["index"] for row in high_rows] == list(range(1, 136))
    assert [tuple(row["key"]) for row in high_rows] == canonical_keys
    assert all(row["passed"] for row in high_rows)

    high_audit_name = "uniform_low_high_four_gap_high_tight_ratio_independent_audit_root_20260827.json"
    high_audit = load(high_audit_name)
    assert high_audit["status"] == "PASS_INDEPENDENT_EXACT_FOUR_GAP_HIGH_TIGHT_RATIO_AUDIT"
    assert high_audit["row_count"] == 135
    assert high_audit["source_sha256"] == PINNED[
        "audit_uniform_low_high_four_gap_high_tight_ratio_independent_root.py"
    ]
    dependencies[high_audit_name] = sha256(HERE / high_audit_name)

    tail_source = PINNED["scan_uniform_low_high_four_gap_rank_decay_tail_root.py"]

    def validate_full(name, expected):
        report = load(name)
        assert report["status"] == "PASS_EXACT_FOUR_GAP_FIXED_RANK_BOUND_SHARD"
        assert report["pass_count"] == 135 and report["failure_count"] == 0
        assert report["source_sha256"] == tail_source
        assert [tuple(row["key"]) for row in report["results"]] == canonical_keys
        for key, value in expected.items():
            assert report["parameters"][key] == value, (name, key)
        dependencies[name] = sha256(HERE / name)
        return report

    rank8_name = "uniform_low_high_four_gap_fixed_rank8_ordinary_exact_products_scan_root_20260827_001_135.json"
    validate_full(rank8_name, {
        "fixed_rank": 8, "chart": "ordinary", "exact_products": True,
    })

    fixed_names = {"A": [], "B": [], "C": []}
    for rank in range(9, 16):
        specifications = {
            "A": (
                f"uniform_low_high_four_gap_fixed_rank{rank}_ordinary_scan_root_20260827_001_135.json",
                {"drop_gamma": False, "use_delta_lower_bound": False},
            ),
            "B": (
                f"uniform_low_high_four_gap_fixed_rank{rank}_ordinary_scan_root_20260827_delta_lower_bound_001_135.json",
                {"drop_gamma": False, "use_delta_lower_bound": True},
            ),
            "C": (
                f"uniform_low_high_four_gap_fixed_rank{rank}_ordinary_scan_root_20260827_drop_gamma_001_135.json",
                {"drop_gamma": True, "use_delta_lower_bound": False},
            ),
        }
        for route, (name, flags) in specifications.items():
            validate_full(name, {"fixed_rank": rank, "chart": "ordinary", **flags})
            fixed_names[route].append(name)

    def validate_tail(route, stem, expected, ranges=None):
        ranges = ranges or ((1, 45), (46, 90), (91, 135))
        names = [
            f"uniform_low_high_four_gap_rank_decay_tail_ordinary_scan_root_20260827_{stem}{start:03d}_{stop:03d}.json"
            for start, stop in ranges
        ]
        rows = []
        for name in names:
            report = load(name)
            assert report["status"] == "PASS_EXACT_FOUR_GAP_RANK_DECAY_TAIL_SHARD"
            assert report["failure_count"] == 0
            assert report["source_sha256"] == tail_source
            for key, value in expected.items():
                assert report["parameters"][key] == value, (name, key)
            dependencies[name] = sha256(HERE / name)
            rows.extend(report["results"])
        assert [row["index"] for row in rows] == list(range(1, 136))
        assert [tuple(row["key"]) for row in rows] == canonical_keys
        assert all(row["passed"] for row in rows)
        return {"route": route, "reports": names}

    tail_routes = [
        validate_tail("A: gamma>=0, delta>=0", "", {
            "threshold": 16, "decay_order": 2, "chart": "ordinary",
            "drop_gamma": False, "use_delta_lower_bound": False,
            "use_delta_lower_bound_drop_gamma": False,
        }, tuple((start, start + 14) for start in range(1, 136, 15))),
        validate_tail("B: gamma>=0, delta<0", "delta_lower_bound_", {
            "threshold": 16, "decay_order": 2, "chart": "ordinary",
            "drop_gamma": False, "use_delta_lower_bound": True,
            "use_delta_lower_bound_drop_gamma": False,
        }),
        validate_tail("C: gamma<0, delta>=0", "drop_gamma_", {
            "threshold": 16, "decay_order": 2, "chart": "ordinary",
            "drop_gamma": True, "use_delta_lower_bound": False,
            "use_delta_lower_bound_drop_gamma": False,
        }),
        validate_tail("D: gamma<0, delta<0", "delta_lower_bound_drop_gamma_", {
            "threshold": 9, "decay_order": 0, "chart": "ordinary",
            "drop_gamma": False, "use_delta_lower_bound": False,
            "use_delta_lower_bound_drop_gamma": True,
        }),
    ]

    direct_checks = []
    for values in (
        (8, 0, 0, 1, 1, 1, 1),
        (8, 3, 11, 17, 5, 29, 43),
        (11, 1, 100, 7, 13, 43, 19),
        (15, 29, 2, 100, 37, 5, 71),
        (23, 7, 31, 3, 11, 71, 113),
    ):
        value = direct_strong(*values)
        assert value > 0
        direct_checks.append({
            "rank": values[0], "x": values[1], "y": values[2],
            "left_gap0": values[3], "left_gap1": values[4],
            "right_gap0": values[5], "right_gap1": values[6],
            "strong_auxiliary": str(value),
        })

    payload = {
        "schema": "uniform-low-high-four-gap-strong-boundary-root-v1",
        "status": "PASS_EXACT_ALL_RANK_SIMULTANEOUS_LEFT_GAP01_RIGHT_GAP01_STRONG_BOUNDARY",
        "theorem": (
            "For every integer k>=8 and real x,y,a,b,s,t>=0, with left ratios "
            "(x+k+1+a+b,x+k-1+b,x+k-2,...,x) and right ratios "
            "(y+k+1+s+t,y+k-1+s,y+k-2,...,y), the complete strong "
            "auxiliary (x+k-2)M(c)+B(c,v) is strictly positive."
        ),
        "coefficient_expansion": {
            "normalizations": [
                "p=a/(x+k+1)",
                "b is the left gap1 slack",
                "q=t/(y+k+1+s)",
                "s is the right gap1 slack",
            ],
            "base_b0": "the independently audited left-gap0/right-gap01 theorem",
            "nonzero_b_positive_keys": 135,
            "left_block_routes": dict(left_routes),
            "left_block_conclusion": "strictly positive for every b>=1 coefficient row",
        },
        "regional_proof": {
            "x_ge_y": {
                "rows": 135,
                "T_over_L_lower": "sum_{j=0}^3 falling(k-1,j)/j!*(M/N)^j",
                "R_over_L_upper": "(M/N)^7",
                "independent_audit": high_audit_name,
            },
            "y_ge_x": {
                "rank8": rank8_name,
                "ranks9_through15": fixed_names,
                "rank_at_least16": tail_routes[:3],
                "both_negative_rank_at_least9": tail_routes[3],
                "rank_decay_identity": (
                    "r^u <= 1/sum_{j=0}^2 rising(u,j)/j!*(1-r)^j"
                ),
            },
        },
        "direct_exact_checks": direct_checks,
        "dependencies_sha256": dependencies,
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_warning": (
            "This closes four simultaneous gap coordinates on the translated "
            "low/high boundary. It is not by itself a proof of Erdos Problem #993."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
