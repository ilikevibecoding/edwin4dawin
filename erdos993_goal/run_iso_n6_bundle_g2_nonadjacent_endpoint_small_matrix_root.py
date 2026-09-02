#!/usr/bin/env python3
"""Run and fail-closed validate all N>=19 small-order endpoint G2 shards."""

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
    "probe_iso_n6_bundle_g2_nonadjacent_endpoint_"
    "wedge_small_order_flint_root.py"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "WEDGE_SMALL_ORDER_FLINT_ROOT"
)
MATRIX_MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "SMALL_ORDER_MATRIX_ROOT"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_"
    "exact_root_20260831.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cases():
    return list(itertools.product(
        ("common0", "common1"),
        range(7),
        ("B_small", "C_small"),
        (0, 1),
        (0, 1),
        (0, 1),
    ))


def report_path(case) -> Path:
    geometry, order, orientation, bmask, cmask, d2mask = case
    return HERE / (
        "iso_n6_bundle_g2_nonadjacent_endpoint_wedge_small_order_"
        f"{geometry}_k{order}_{orientation}_B{bmask}_C{cmask}_D2{d2mask}_"
        "beta0_70_flint_probe_root_20260831.json"
    )


def validate(path: Path, case, source_hash: str) -> dict:
    geometry, order, orientation, bmask, cmask, d2mask = case
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == MARKER
    assert report["geometry"] == geometry
    assert report["small_order"] == order
    assert report["orientation"] == orientation
    assert report["B_mask"] == bmask
    assert report["C_mask"] == cmask
    assert report["D2_mask"] == d2mask
    assert report["processed_betas"] == 70
    assert report["negative_betas"] == 0
    assert report["negative_controls"] == 0
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
    geometry, order, orientation, bmask, cmask, d2mask = case
    completed = subprocess.run([
        sys.executable,
        str(PRODUCER),
        "--geometry", geometry,
        "--small-order", str(order),
        "--orientation", orientation,
        "--b-mask", str(bmask),
        "--c-mask", str(cmask),
        "--d2-mask", str(d2mask),
        "--start-beta", "0",
        "--max-betas", "70",
        "--chunk-columns", "4096",
    ], cwd=HERE, text=True, capture_output=True, check=False)
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
    matrix_cases = cases()
    assert len(matrix_cases) == 224
    reports = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(run_case, case, source_hash, args.force): case
            for case in matrix_cases
        }
        for future in as_completed(futures):
            case, disposition, report = future.result()
            reports[case] = report
            print(json.dumps({
                "case": case,
                "disposition": disposition,
                "report": report_path(case).name,
                "report_sha256": sha256(report_path(case)),
            }, sort_keys=True), flush=True)

    assert len(reports) == 224
    rows = []
    for case in matrix_cases:
        report = reports[case]
        path = report_path(case)
        rows.append({
            "geometry": case[0],
            "small_order": case[1],
            "orientation": case[2],
            "B_mask": case[3],
            "C_mask": case[4],
            "D2_mask": case[5],
            "report": path.name,
            "report_sha256": sha256(path),
            "ordered_record_sha256": report["ordered_record_sha256"],
            "bernstein_coefficients": sum(
                record["bernstein_coefficients"]
                for record in report["records"]
            ),
            "minimum": str(min(
                Fraction(record["minimum"]) for record in report["records"]
            )),
        })
    manifest = {
        "marker": MATRIX_MARKER,
        "status": (
            "PASS exact N>=19 small-induced-order nonadjacent "
            "endpoint-parent G2 matrix"
        ),
        "source": PRODUCER.name,
        "source_sha256": source_hash,
        "coverage": (
            "N>=19, smaller induced order 0..6, both nonadjacent geometries, "
            "both endpoint orientations, all B2/C2/D2 corners"
        ),
        "shards": len(rows),
        "simplex_coefficients": 70 * len(rows),
        "bernstein_coefficients": sum(
            row["bernstein_coefficients"] for row in rows
        ),
        "negative": 0,
        "minimum": str(min(Fraction(row["minimum"]) for row in rows)),
        "rows": rows,
        "scope": (
            "N>=19 small induced orders only; large induced orders, replay, "
            "finite ambient orders, and theorem assembly are separate"
        ),
        "runner_source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: manifest[key] for key in (
        "marker", "shards", "simplex_coefficients",
        "bernstein_coefficients", "negative", "minimum",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MATRIX_MARKER)


if __name__ == "__main__":
    main()
