"""Authoritative exact full-diamond audit of the W and S3 Schur certificates.

The calculation is radical-free and uses FLINT rationals.  Ranges may be
audited independently and then merged, so the expensive d<=50 replay can be
parallelized without changing any mathematics.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path
from time import perf_counter

from probe_lower_selector_tail3_flint_full import one_case


HERE = Path(__file__).resolve().parent
FINAL_REPORT = HERE / "lower_selector_schur_tail3_full_diamond_exact_20260812.json"


def audit_range(min_d: int, max_d: int) -> dict[str, object]:
    started = perf_counter()
    count = 0
    w_failures: list[dict[str, object]] = []
    s3_failures: list[dict[str, object]] = []
    minimum = None
    by_d = []
    for d in range(min_d, max_d + 1):
        d_count = 0
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                m, w_margin, s3_margin, ratio = one_case(d, r, row_s)
                if m < 4:
                    continue
                count += 1
                d_count += 1
                cell = {"d": d, "r": r, "row_s": row_s, "m": m}
                if w_margin <= 0:
                    w_failures.append({**cell, "W_minus_debt": str(w_margin)})
                if s3_margin <= 0:
                    s3_failures.append({**cell, "S3_minus_4debt": str(s3_margin)})
                if minimum is None or ratio < minimum[0]:
                    minimum = (ratio, cell)
        by_d.append({"d": d, "m_at_least_4_cells": d_count})
        print(d, d_count, len(w_failures), len(s3_failures), flush=True)
    assert minimum is not None
    return {
        "kind": "lower_selector_schur_tail3_exact_range",
        "date": "2026-08-12",
        "min_d": min_d,
        "max_d": max_d,
        "m_at_least_4_cells": count,
        "W_failures": w_failures,
        "S3_stronger_failures": s3_failures,
        "minimum_S3_over_debt": str(minimum[0]),
        "minimum_cell": minimum[1],
        "by_d": by_d,
        "seconds": perf_counter() - started,
    }


def write_part(min_d: int, max_d: int, output: Path) -> None:
    payload = audit_range(min_d, max_d)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(output),
        "cells": payload["m_at_least_4_cells"],
        "W_failures": len(payload["W_failures"]),
        "S3_failures": len(payload["S3_stronger_failures"]),
    }, indent=2))


def merge(parts: list[Path], output: Path) -> None:
    payloads = [json.loads(part.read_text(encoding="utf-8")) for part in parts]
    payloads.sort(key=lambda item: item["min_d"])
    assert payloads[0]["min_d"] == 5
    assert payloads[-1]["max_d"] == 50
    assert all(
        left["max_d"] + 1 == right["min_d"]
        for left, right in zip(payloads, payloads[1:])
    )
    failures = [failure for part in payloads for failure in part["W_failures"]]
    s3_failures = [
        failure for part in payloads for failure in part["S3_stronger_failures"]
    ]
    minima = [(part["minimum_S3_over_debt"], part["minimum_cell"]) for part in payloads]
    minimum_ratio, minimum_cell = min(minima, key=lambda item: Fraction(item[0]))
    by_d = [record for part in payloads for record in part["by_d"]]
    assert [record["d"] for record in by_d] == list(range(5, 51))
    assert sum(record["m_at_least_4_cells"] for record in by_d) == 53777
    assert len(failures) == 1
    assert {key: failures[0][key] for key in ("d", "r", "row_s", "m")} == {
        "d": 19,
        "r": 3,
        "row_s": 8,
        "m": 6,
    }
    assert not s3_failures
    assert Fraction(minimum_ratio) > 4
    final = {
        "kind": "lower_selector_schur_tail3_full_diamond_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_FULL_DIAMOND_D5_TO_D50_FIXED_THREE_INDEX_SCHUR_CERTIFICATE",
        "scope": "exact finite evidence, not an all-order theorem",
        "normalization": "h_j=R^(m-j)H_j with R^2=A; all calculations are over FLINT QQ",
        "identity": (
            "S3=(h_(m-3)h_(m-1)-h_(m-2)^2)^2"
            "+h_0^2(h_(m-3)^2+h_(m-2)^2)"
        ),
        "target": "S3>4(E+F-1), which implies (E-1)(F-1)>C^2",
        "min_d": 5,
        "max_d": 50,
        "m_at_least_4_cells": 53777,
        "W_failures": failures,
        "S3_stronger_failures": [],
        "minimum_S3_over_debt": minimum_ratio,
        "minimum_cell": minimum_cell,
        "by_d": by_d,
        "part_reports": [part.name for part in parts],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "engine_sha256": hashlib.sha256(
            (HERE / "probe_lower_selector_tail3_flint_full.py").read_bytes()
        ).hexdigest().upper(),
    }
    output.write_text(json.dumps(final, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": final["status"],
        "cells": final["m_at_least_4_cells"],
        "W_failures": len(final["W_failures"]),
        "S3_failures": len(final["S3_stronger_failures"]),
        "minimum_S3_over_debt_decimal": float(Fraction(final["minimum_S3_over_debt"])),
        "source_sha256": final["source_sha256"],
        "engine_sha256": final["engine_sha256"],
        "report": str(output),
    }, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-d", type=int)
    parser.add_argument("--max-d", type=int)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--merge", nargs="*", type=Path)
    args = parser.parse_args()
    if args.merge:
        merge(args.merge, args.output or FINAL_REPORT)
    else:
        assert args.min_d is not None and args.max_d is not None and args.output
        write_part(args.min_d, args.max_d, args.output)


if __name__ == "__main__":
    main()
