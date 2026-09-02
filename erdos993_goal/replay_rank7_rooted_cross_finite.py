#!/usr/bin/env python3
"""Compile and replay the exact rooted C7 census for free trees of orders 19--22.

The Rust checker streams the WROM free-tree generator, checks its tree count
against the classical census at every order, and evaluates every possible
root with exact i128 arithmetic.  This wrapper parses and asserts the complete
output before writing the compact JSON certificate.
"""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "verify_rank7_rooted_cross_finite.rs"
EXECUTABLE = HERE / "verify_rank7_rooted_cross_finite.exe"
OUTPUT = HERE / "rank7_rooted_cross_finite_n19_n22_exact_20260816.json"

EXPECTED = {
    19: (317_955, 6_041_145, 4_621_517_762),
    20: (823_065, 16_461_300, 18_599_084_346),
    21: (2_144_505, 45_034_605, 67_393_744_400),
    22: (5_623_756, 123_722_632, 222_749_322_452),
}

ROW = re.compile(
    r"^order=(?P<order>\d+) trees=(?P<trees>\d+) "
    r"rooted_checks=(?P<roots>\d+) negative=(?P<negative>\d+) "
    r"minimum=(?P<minimum>-?\d+) witness_root=(?P<root>\d+) "
    r"witness_degree=(?P<degree>\d+) witness_layout=(?P<layout>\[.*?\]) "
    r"polynomial=(?P<polynomial>\[.*?\]) deletion=(?P<deletion>\[.*?\])$"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def main() -> int:
    # Use the installed GNU toolchain explicitly.  The user's default MSVC
    # toolchain requires a Visual Studio developer shell for link.exe.
    subprocess.run(
        [
            "rustup",
            "run",
            "stable-x86_64-pc-windows-gnu",
            "rustc",
            "-O",
            str(SOURCE),
            "-o",
            str(EXECUTABLE),
        ],
        cwd=HERE,
        check=True,
    )
    started = time.perf_counter()
    replay = subprocess.run(
        [str(EXECUTABLE), "19", "22"],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=True,
    )
    elapsed = time.perf_counter() - started
    print(replay.stdout, end="")

    assert "PASS_EXACT_RANK7_ROOTED_CROSS_FINITE_ORDERS_19_THROUGH_22" in replay.stdout
    rows = []
    for line in replay.stdout.splitlines():
        match = ROW.match(line)
        if not match:
            continue
        values = match.groupdict()
        order = int(values["order"])
        trees = int(values["trees"])
        roots = int(values["roots"])
        negative = int(values["negative"])
        minimum = int(values["minimum"])
        assert (trees, roots, minimum) == EXPECTED[order]
        assert roots == order * trees
        assert negative == 0
        assert minimum > 0
        rows.append(
            {
                "order": order,
                "free_trees": trees,
                "rooted_checks": roots,
                "negative": negative,
                "minimum_C7": minimum,
                "minimum_witness": {
                    "root_index": int(values["root"]),
                    "root_degree": int(values["degree"]),
                    "WROM_layout": ast.literal_eval(values["layout"]),
                    "independence_coefficients_i0_through_i7": ast.literal_eval(
                        values["polynomial"]
                    ),
                    "root_deleted_coefficients_i0_through_i7": ast.literal_eval(
                        values["deletion"]
                    ),
                },
            }
        )
    assert [row["order"] for row in rows] == [19, 20, 21, 22]

    report = {
        "status": "PASS_EXACT_RANK7_ROOTED_CROSS_ALL_ROOTS_ORDERS_19_THROUGH_22",
        "statement": "C7=i5*(i6^2-i5*i7)-2*i6*(i6*h5-i5*h6)>0",
        "arithmetic": "signed 128-bit integer arithmetic",
        "enumeration": "streaming WROM free-tree generator with asserted classical counts",
        "orders": rows,
        "totals": {
            "free_trees": sum(row["free_trees"] for row in rows),
            "rooted_checks": sum(row["rooted_checks"] for row in rows),
            "negative": 0,
        },
        "source": SOURCE.name,
        "source_sha256": sha256(SOURCE),
        "replay_seconds": round(elapsed, 3),
        "scope_warning": "This finite census is not an all-order proof and does not by itself prove Q7.",
    }
    assert report["totals"] == {
        "free_trees": 8_909_281,
        "rooted_checks": 191_259_682,
        "negative": 0,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
