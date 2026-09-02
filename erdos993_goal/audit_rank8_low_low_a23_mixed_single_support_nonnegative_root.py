#!/usr/bin/env python3
"""Independent exact replay of the eight raw-nonnegative EA/EB rows.

The mixed-face support partition has sixteen single-support rows: two faces,
two ordinary-slack groups, and four auxiliaries.  Eight rows require Young
payments and are audited elsewhere.  This script fail-closes the complementary
eight rows whose raw coefficients are already nonnegative.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
from pathlib import Path

from analyze_rank8_low_low_a23_mixed_slack_slices_agent import BASE_NAMES, build


ROOT = Path(__file__).resolve().parent
BUILDER = ROOT / "analyze_rank8_low_low_a23_mixed_slack_slices_agent.py"
PRODUCER = ROOT / "probe_rank8_low_low_a23_mixed_group_sparse_young_agent.py"
EXPECTED_BUILDER_SHA256 = (
    "C1BFFC3E28EC8F484A490C454F4B7EBBF6C2D4E633E9A81349F789B50BB6D31D"
)
EXPECTED_PRODUCER_SHA256 = (
    "C201FB030C3E03A748DEAA585FEC8B48B48C4A378D7286DC418A45957B1A0A07"
)
GROUPS = {
    "A": ("a0", "b4", "b5", "b6", "b7"),
    "B": ("a4", "a5", "a6", "a7", "b0"),
}
ROWS = (
    ("01", (0, 1), "A", "curvature_middle_times_4"),
    ("01", (0, 1), "A", "strong_middle_times_4"),
    ("01", (0, 1), "B", "curvature_middle_times_4"),
    ("01", (0, 1), "B", "curvature_far"),
    ("10", (1, 0), "A", "curvature_middle_times_4"),
    ("10", (1, 0), "A", "strong_middle_times_4"),
    ("10", (1, 0), "B", "curvature_middle_times_4"),
    ("10", (1, 0), "B", "curvature_far"),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def producer_name(face_token: str, group_token: str, label: str) -> str:
    return (
        "rank8_low_low_a23_mixed_face_"
        f"{face_token}_group{group_token}_{label}_"
        "coefficientwise_nonnegative_root_20260826.json"
    )


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def replay_row(face_token: str, face: tuple[int, int], group_token: str, label: str) -> dict:
    group = GROUPS[group_token]
    path = ROOT / producer_name(face_token, group_token, label)
    producer_hash = sha256(path)
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["schema"] == "rank8-low-low-a23-mixed-group-sparse-young-agent-v1"
    assert report["status"] == "COEFFICIENTWISE_NONNEGATIVE"
    assert tuple(report["face"]) == face
    assert tuple(report["ordinary_slack_group"]) == group
    assert report["group_rule"] == (
        "retain exactly monomials with positive support in this group"
    )
    assert report["auxiliary"] == label
    assert report["builder_sha256"] == EXPECTED_BUILDER_SHA256
    assert report["source_sha256"] == EXPECTED_PRODUCER_SHA256

    names, polynomials = build(face, group, only_label=label)
    polynomial = polynomials[label]
    assert report["variables"] == list(names)
    slack_start = len(BASE_NAMES)
    terms = positive = negative = 0
    ordered = hashlib.sha256()
    minimum = None
    for raw_monomial, raw_coefficient in polynomial.terms():
        monomial = tuple(map(int, raw_monomial))
        if not any(value > 0 for value in monomial[slack_start:]):
            continue
        coefficient = int(raw_coefficient)
        terms += 1
        positive += coefficient > 0
        negative += coefficient < 0
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        ordered.update(
            ((",".join(map(str, monomial))) + ":" + str(coefficient) + "\n").encode(
                "ascii"
            )
        )
    assert terms == report["group_terms"]
    assert positive == report["positive_terms"]
    assert negative == report["negative_terms"] == 0
    assert terms == positive and minimum is not None and minimum > 0
    result = {
        "face_token": face_token,
        "face": list(face),
        "group_token": group_token,
        "ordinary_slack_group": list(group),
        "auxiliary": label,
        "producer_report": path.name,
        "producer_report_sha256": producer_hash,
        "group_terms": terms,
        "positive_terms": positive,
        "negative_terms": negative,
        "minimum_coefficient": minimum,
        "replayed_ordered_coefficient_sha256": ordered.hexdigest().upper(),
        "positive_support_filter_replayed": True,
    }
    del polynomial, polynomials
    gc.collect()
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        default=(
            "rank8_low_low_a23_mixed_single_support_nonnegative_"
            "independent_audit_root_20260826.json"
        ),
    )
    args = parser.parse_args()
    assert sha256(BUILDER) == EXPECTED_BUILDER_SHA256
    assert sha256(PRODUCER) == EXPECTED_PRODUCER_SHA256
    rows = []
    for index, row in enumerate(ROWS, 1):
        replay = replay_row(*row)
        rows.append(replay)
        print(
            "AUDITED", index, len(ROWS), replay["face_token"],
            replay["group_token"], replay["auxiliary"],
            replay["group_terms"], flush=True,
        )
    keys = {
        (row["face_token"], row["group_token"], row["auxiliary"])
        for row in rows
    }
    assert len(keys) == len(rows) == 8
    payload = {
        "schema": (
            "rank8-low-low-a23-mixed-single-support-nonnegative-"
            "independent-audit-root-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_EXACT_ALL_EIGHT_COMPLEMENTARY_"
            "SINGLE_SUPPORT_ROWS_COEFFICIENTWISE_NONNEGATIVE"
        ),
        "rows": rows,
        "coverage": {
            "faces": ["01", "10"],
            "groups": ["A", "B"],
            "row_count": 8,
            "negative_coefficients": 0,
        },
        "immutable_inputs": {
            BUILDER.name: EXPECTED_BUILDER_SHA256,
            PRODUCER.name: EXPECTED_PRODUCER_SHA256,
            **{
                row["producer_report"]: row["producer_report_sha256"]
                for row in rows
            },
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This audits the eight raw-nonnegative EA/EB rows only. The eight "
            "Young-payment rows, zero-support rows, and cross-support rows are "
            "separate disjoint sectors."
        ),
    }
    output = Path(args.output).resolve()
    print(payload["status"], flush=True)
    print("REPORT", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
