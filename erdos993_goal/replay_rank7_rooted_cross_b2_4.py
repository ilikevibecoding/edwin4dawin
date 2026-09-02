#!/usr/bin/env python3
"""Replay the exact structural rooted-C7 census for B2=4.

The default mode compiles the Rust verifier and runs four disjoint order
ranges in parallel.  ``--summarize-current-run`` only emits the compact JSON
from the asserted results of the already completed split replay; it exists so
packaging does not compete with another long-running cone scan.
"""

from __future__ import annotations

import argparse
import ast
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import subprocess


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "verify_rank7_rooted_cross_b2_4.rs"
EXECUTABLE = HERE / "verify_rank7_rooted_cross_b2_4.exe"
OUTPUT = HERE / "rank7_rooted_cross_b2_4_exact_20260816.json"
RANGES = ((23, 33), (34, 35), (36, 37), (38, 38))

# trees, mixed, degree3-path, degree3-star, rooted checks, minimum C7
EXPECTED = {
    23: (49_192, 2_730, 38_378, 8_084, 1_131_416, 694_394_936_714),
    24: (74_836, 3_456, 59_104, 12_276, 1_796_064, 1_968_555_458_898),
    25: (111_498, 4_330, 88_936, 18_232, 2_787_450, 5_247_475_542_621),
    26: (163_175, 5_370, 131_207, 26_598, 4_242_550, 13_244_295_812_670),
    27: (234_696, 6_602, 189_980, 38_114, 6_336_792, 31_836_218_707_092),
    28: (332_492, 8_048, 270_623, 53_821, 9_309_776, 73_245_518_054_708),
    29: (464_183, 9_738, 379_589, 74_856, 13_461_307, 161_974_628_013_560),
    30: (639_687, 11_698, 525_172, 102_817, 19_190_610, 345_543_308_087_350),
    31: (870_644, 13_963, 717_221, 139_460, 26_989_964, 713_378_108_793_644),
    32: (1_171_771, 16_563, 968_112, 187_096, 37_496_672, 1_429_209_946_687_694),
    33: (1_560_250, 19_538, 1_292_384, 248_328, 51_488_250, 2_785_364_235_162_693),
    34: (2_057_386, 22_923, 1_707_964, 326_499, 69_951_124, 5_291_820_117_586_206),
    35: (2_687_755, 26_763, 2_235_712, 425_280, 94_071_425, 9_819_469_215_599_544),
    36: (3_481_410, 31_098, 2_900_940, 549_372, 125_330_760, 17_826_422_425_269_924),
    37: (4_472_769, 35_979, 3_732_852, 703_938, 165_492_453, 31_709_559_438_237_878),
    38: (5_703_207, 41_451, 4_766_400, 895_356, 216_721_866, 55_342_184_733_973_046),
}

ROW = re.compile(
    r"^order=(\d+) trees=(\d+) mixed_trees=(\d+) path_trees=(\d+) "
    r"star_trees=(\d+) roots=(\d+) failures=(\d+) minimum=(\d+) "
    r"witness_family=(\S+) witness_lengths=(\[.*?\]) witness_root=(\d+) "
    r"polynomial=(\[.*?\]) deletion=(\[.*?\])$"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expected_rows() -> list[dict]:
    rows = []
    for order, values in EXPECTED.items():
        trees, mixed, path, star, roots, minimum = values
        assert trees == mixed + path + star
        assert roots == order * trees
        rows.append(
            {
                "order": order,
                "trees": trees,
                "degree4_degree3_trees": mixed,
                "degree3_path_trees": path,
                "degree3_star_trees": star,
                "rooted_checks": roots,
                "failures": 0,
                "minimum_C7": minimum,
                "minimum_witness": {
                    "family": "degree4_degree3",
                    "lengths": [2, 1, 1, 1, 1, order - 7],
                    "root": 2,
                },
            }
        )
    return rows


def exact_replay() -> list[dict]:
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

    def run_range(bounds: tuple[int, int]) -> str:
        first, last = bounds
        result = subprocess.run(
            [str(EXECUTABLE), str(first), str(last)],
            cwd=HERE,
            text=True,
            capture_output=True,
            check=True,
        )
        marker = f"PASS_EXACT_RANK7_ROOTED_CROSS_B2_4_ORDERS_{first}_THROUGH_{last}"
        assert marker in result.stdout
        return result.stdout

    with ThreadPoolExecutor(max_workers=len(RANGES)) as executor:
        outputs = list(executor.map(run_range, RANGES))

    rows_by_order = {}
    for output in outputs:
        print(output, end="")
        for line in output.splitlines():
            match = ROW.match(line)
            if not match:
                continue
            order, trees, mixed, path, star, roots, failures, minimum = map(
                int, match.groups()[:8]
            )
            assert (trees, mixed, path, star, roots, minimum) == EXPECTED[order]
            assert failures == 0
            rows_by_order[order] = {
                "order": order,
                "trees": trees,
                "degree4_degree3_trees": mixed,
                "degree3_path_trees": path,
                "degree3_star_trees": star,
                "rooted_checks": roots,
                "failures": failures,
                "minimum_C7": minimum,
                "minimum_witness": {
                    "family": match.group(9),
                    "lengths": ast.literal_eval(match.group(10)),
                    "root": int(match.group(11)),
                    "polynomial": ast.literal_eval(match.group(12)),
                    "deletion": ast.literal_eval(match.group(13)),
                },
            }
    assert sorted(rows_by_order) == list(range(23, 39))
    return [rows_by_order[order] for order in sorted(rows_by_order)]


def write_report(rows: list[dict], mode: str) -> None:
    totals = {
        "trees": sum(row["trees"] for row in rows),
        "rooted_checks": sum(row["rooted_checks"] for row in rows),
        "failures": sum(row["failures"] for row in rows),
    }
    assert totals == {"trees": 24_074_951, "rooted_checks": 845_798_479, "failures": 0}
    minimum_row = min(rows, key=lambda row: row["minimum_C7"])
    report = {
        "status": "PASS_EXACT_RANK7_ROOTED_CROSS_ALL_TREES_B2_4_N23_THROUGH_N38",
        "classification": [
            "one degree4 and one degree3 branch vertex",
            "four degree3 branch vertices whose branch tree is a path",
            "four degree3 branch vertices whose branch tree is a star",
        ],
        "orders": rows,
        "totals": totals,
        "global_minimum": {
            "order": minimum_row["order"],
            "C7": minimum_row["minimum_C7"],
            "witness": minimum_row["minimum_witness"],
        },
        "source": SOURCE.name,
        "source_sha256": sha256(SOURCE),
        "generation_mode": mode,
        "scope_warning": "This closes B2=4 only; the residual rooted-C7 cells start at B2=5.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"totals trees={totals['trees']} roots={totals['rooted_checks']}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summarize-current-run", action="store_true")
    args = parser.parse_args()
    if args.summarize_current_run:
        write_report(expected_rows(), "summary of completed four-range exact replay")
    else:
        write_report(exact_replay(), "fresh parallel exact replay")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
