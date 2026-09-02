#!/usr/bin/env python3
"""Run and validate the 32 large-order nonadjacent rank-six g2 shards."""

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
PRODUCER = HERE / "probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root.py"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_WEDGE_SIMPLEX_FLINT_ROOT"
MATRIX_MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_WEDGE_MATRIX_ROOT"
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_wedge_matrix_probe_root_20260831.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(case) -> Path:
    geometry, chart, bmask, cmask, d2mask = case
    return HERE / (
        "iso_n6_bundle_g2_nonadjacent_wedge_simplex_"
        f"{geometry}_{chart}_B{bmask:02d}_C{cmask:02d}_D2{d2mask}_"
        "beta0_70_flint_probe_root_20260831.json"
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
    assert report["processed_betas"] == 70
    assert report["negative_betas"] == 0
    assert len(report["records"]) == 70
    assert all(row["negative"] == 0 for row in report["records"])
    assert report["source_sha256"] == source_hash
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
        sys.executable, str(PRODUCER),
        "--geometry", geometry,
        "--order-chart", chart,
        "--b-mask", str(bmask),
        "--c-mask", str(cmask),
        "--d2-mask", str(d2mask),
        "--start-beta", "0",
        "--max-betas", "70",
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
        ("common0", "common1"), ("low", "high"), (0, 1), (0, 1), (0, 1)
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
                "negative_betas": report["negative_betas"],
                "report": report_path(case).name,
                "report_sha256": sha256(report_path(case)),
            }, sort_keys=True), flush=True)

    assert len(reports) == 32
    records = [row for report in reports.values() for row in report["records"]]
    minimum = min(Fraction(row["minimum"]) for row in records)
    manifest_rows = []
    for case in cases:
        report = reports[case]
        path = report_path(case)
        manifest_rows.append({
            "geometry": case[0],
            "order_chart": case[1],
            "B_mask": case[2],
            "C_mask": case[3],
            "D2_mask": case[4],
            "report": path.name,
            "report_sha256": sha256(path),
            "ordered_record_sha256": report["ordered_record_sha256"],
            "bernstein_coefficients": sum(
                row["bernstein_coefficients"] for row in report["records"]
            ),
            "minimum": str(min(Fraction(row["minimum"]) for row in report["records"])),
        })
    manifest = {
        "marker": MATRIX_MARKER,
        "status": "PASS exact large-order relaxation matrix; theorem assembly pending",
        "source": PRODUCER.name,
        "source_sha256": source_hash,
        "coverage": (
            "N>=19, ordered induced orders 7<=mB<=mC, both nonadjacent "
            "common-neighbor geometries, low/high order charts, four B,C rank-two "
            "corners, and both D rank-two endpoints"
        ),
        "shards": len(manifest_rows),
        "simplex_coefficients": len(records),
        "bernstein_coefficients": sum(
            row["bernstein_coefficients"] for row in records
        ),
        "negative": sum(row["negative"] for row in records),
        "zero": sum(row["zero"] for row in records),
        "minimum": str(minimum),
        "rows": manifest_rows,
        "scope": (
            "Large induced-order relaxation only. Small induced orders, finite "
            "ambient orders, deterministic replay, and fail-closed theorem assembly remain."
        ),
        "runner_source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    assert manifest["negative"] == 0
    raw = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: manifest[key] for key in (
        "marker", "shards", "simplex_coefficients", "bernstein_coefficients",
        "negative", "minimum"
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MATRIX_MARKER)


if __name__ == "__main__":
    main()
