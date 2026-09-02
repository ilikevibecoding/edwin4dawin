#!/usr/bin/env python3
"""Run and validate the 32 large-order ordinary-parent safe-envelope shards."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path
import subprocess
import sys


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / (
    "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SAFE_NEGATIVE_"
    "WEDGE_SIMPLEX_FLINT_ROOT"
)
MATRIX_MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SAFE_NEGATIVE_"
    "WEDGE_MATRIX_ROOT"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_safe_negative_wedge_matrix_"
    "probe_root_20260831.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(case) -> Path:
    geometry, chart, bmask, cmask, d2mask = case
    return HERE / (
        "iso_n6_bundle_g2_nonadjacent_ordinary_safe_negative_wedge_simplex_"
        f"{geometry}_{chart}_B{bmask:02d}_C{cmask:02d}_D2{d2mask}_"
        "flint_probe_root_20260831.json"
    )


def validate(path: Path, case, source_hash: str) -> dict:
    geometry, chart, bmask, cmask, d2mask = case
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == MARKER
    assert report["geometry"] == geometry
    assert report["order_chart"] == chart
    assert report["B_mask"] == bmask
    assert report["C_mask"] == cmask
    assert report["D2_mask"] == d2mask
    assert report["source_sha256"] == source_hash
    assert report["negative_lower_controls"] == 0
    assert report["negative_sign_controls"] == 0
    assert len(report["sign_certificates"]) == 14
    assert all(
        row["negative"] == 0
        for row in report["sign_certificates"].values()
    )
    assert report["ordinary_lower_certificate"]["negative"] == 0
    return report


def run_case(case, source_hash: str, force: bool):
    path = report_path(case)
    if path.exists() and not force:
        try:
            return case, "cached", validate(path, case, source_hash)
        except Exception:
            pass
    geometry, chart, bmask, cmask, d2mask = case
    command = [
        sys.executable,
        str(PRODUCER),
        "--geometry", geometry,
        "--order-chart", chart,
        "--b-mask", str(bmask),
        "--c-mask", str(cmask),
        "--d2-mask", str(d2mask),
        "--chunk-columns", "4096",
    ]
    completed = subprocess.run(
        command, cwd=HERE, text=True, capture_output=True, check=False
    )
    if completed.returncode != 0 or MARKER not in completed.stdout:
        raise RuntimeError({
            "case": case,
            "returncode": completed.returncode,
            "stdout_tail": completed.stdout[-2000:],
            "stderr_tail": completed.stderr[-2000:],
        })
    return case, "computed", validate(path, case, source_hash)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    assert 1 <= args.workers <= 4

    source_hash = sha256(PRODUCER)
    cases = list(itertools.product(
        ("common0", "common1"),
        ("low", "high"),
        (0, 1),
        (0, 1),
        (0, 1),
    ))
    reports = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(run_case, case, source_hash, args.force): case
            for case in cases
        }
        for future in as_completed(futures):
            case, disposition, report = future.result()
            reports[case] = report
            print(json.dumps({
                "case": case,
                "disposition": disposition,
                "lower_minimum": report["ordinary_lower_certificate"]["minimum"],
                "report": report_path(case).name,
                "report_sha256": sha256(report_path(case)),
            }, sort_keys=True), flush=True)

    assert len(reports) == 32
    rows = []
    for case in cases:
        report = reports[case]
        path = report_path(case)
        lower = report["ordinary_lower_certificate"]
        signs = report["sign_certificates"]
        rows.append({
            "geometry": case[0],
            "order_chart": case[1],
            "B_mask": case[2],
            "C_mask": case[3],
            "D2_mask": case[4],
            "report": path.name,
            "report_sha256": sha256(path),
            "lower_ordered_record_sha256": lower["ordered_record_sha256"],
            "lower_simplex_coefficients": lower["simplex_coefficients"],
            "lower_bernstein_coefficients": sum(
                record["bernstein_coefficients"] for record in lower["records"]
            ),
            "sign_simplex_coefficients": sum(
                certificate["simplex_coefficients"]
                for certificate in signs.values()
            ),
            "sign_bernstein_coefficients": sum(
                record["bernstein_coefficients"]
                for certificate in signs.values()
                for record in certificate["records"]
            ),
            "minimum": lower["minimum"],
        })

    manifest = {
        "marker": MATRIX_MARKER,
        "status": (
            "PASS exact large-order ordinary-parent safe-envelope relaxation "
            "matrix; finite-order and fail-closed assembly pending"
        ),
        "source": PRODUCER.name,
        "source_sha256": source_hash,
        "coverage": (
            "N>=19, ordered induced orders 7<=mB<=mC, both nonadjacent "
            "common-neighbor geometries, low/high order charts, all B,C "
            "rank-two corners, and both D rank-two endpoints"
        ),
        "method": (
            "Fourteen parent-loss coefficient signs are certified. PW2 and PW3 "
            "are charged by unconditional one-sided negative subset envelopes."
        ),
        "shards": len(rows),
        "lower_simplex_coefficients": sum(
            row["lower_simplex_coefficients"] for row in rows
        ),
        "lower_bernstein_coefficients": sum(
            row["lower_bernstein_coefficients"] for row in rows
        ),
        "sign_simplex_coefficients": sum(
            row["sign_simplex_coefficients"] for row in rows
        ),
        "sign_bernstein_coefficients": sum(
            row["sign_bernstein_coefficients"] for row in rows
        ),
        "negative_lower_controls": 0,
        "negative_sign_controls": 0,
        "minimum": str(min(Fraction(row["minimum"]) for row in rows)),
        "rows": rows,
        "scope": (
            "Large induced-order relaxation only. Small induced orders, finite "
            "ambient orders, replay, and fail-closed theorem assembly remain."
        ),
        "runner_source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: manifest[key] for key in (
        "marker", "shards", "lower_simplex_coefficients",
        "lower_bernstein_coefficients", "sign_simplex_coefficients",
        "sign_bernstein_coefficients", "negative_lower_controls",
        "negative_sign_controls", "minimum",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MATRIX_MARKER)


if __name__ == "__main__":
    main()
