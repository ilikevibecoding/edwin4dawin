#!/usr/bin/env python3
"""Replay the exact structural rooted-C7 census for B2=2 and B2=3."""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import re
import subprocess


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "verify_rank7_rooted_cross_b2_2_3.rs"
EXECUTABLE = HERE / "verify_rank7_rooted_cross_b2_2_3.exe"
OUTPUT = HERE / "rank7_rooted_cross_b2_2_3_exact_20260816.json"

EXPECTED = {
    23: ((920, 21_160, 740_364_904_258), (9_260, 84, 9_176, 212_980, 679_432_265_658)),
    24: ((1_115, 26_760, 2_083_194_457_528), (12_533, 94, 12_439, 300_792, 1_931_637_600_058)),
    25: ((1_335, 33_375, 5_516_729_260_217), (16_705, 108, 16_597, 417_625, 5_161_556_056_771)),
    26: ((1_591, 41_366, 13_844_850_540_802), (21_990, 120, 21_870, 571_740, 13_054_289_501_232)),
    27: ((1_877, 50_679, 33_116_481_660_759), (28_584, 136, 28_448, 771_768, 31_434_528_239_092)),
    28: ((2_205, 61_740, 75_867_596_330_927), (36_767, 150, 36_617, 1_029_476, 72_429_608_239_256)),
    29: ((2_569, 74_501, 167_155_909_201_768), (46_796, 169, 46_627, 1_357_084, 160_375_629_820_998)),
    30: ((2_982, 89_460, 355_456_608_400_334), (59_027, 185, 58_842, 1_770_810, 342_509_019_866_204)),
    31: ((3_437, 106_547, 731_798_564_311_360), (73_790, 206, 73_584, 2_287_490, 707_785_799_060_204)),
    32: ((3_948, 126_336, 1_462_537_991_291_704), (91_533, 225, 91_308, 2_929_056, 1_419_173_258_710_068)),
    33: ((4_508, 148_764, 2_844_211_110_085_723), (112_669, 249, 112_420, 3_718_077, 2_767_783_245_055_177)),
    34: ((5_132, 174_488, 5_393_420_413_162_178), (137_750, 270, 137_480, 4_683_500, 5_261_702_948_509_912)),
    35: ((5_812, 203_420, 9_991_290_232_150_015), (167_289, 297, 166_992, 5_855_115, 9_768_926_003_190_894)),
    36: ((6_564, 236_304, 18_111_480_428_520_159), (201_957, 321, 201_636, 7_270_452, 17_743_195_949_256_430)),
    37: ((7_380, 273_060, 32_174_137_714_090_400), (242_379, 351, 242_028, 8_968_023, 31_574_909_049_097_580)),
    38: ((8_277, 314_526, 56_086_889_332_274_638), (289_362, 378, 288_984, 10_995_756, 55_127_878_489_137_828)),
}

ROW2 = re.compile(
    r"^order=(\d+) b2=2 trees=(\d+) roots=(\d+) minimum=(\d+) "
    r"witness_lengths=(\[.*?\]) witness_root=(\d+) polynomial=(\[.*?\]) deletion=(\[.*?\])$"
)
ROW3 = re.compile(
    r"^order=(\d+) b2=3 trees=(\d+) star_trees=(\d+) chain_trees=(\d+) "
    r"roots=(\d+) minimum=(\d+) witness_family=(\S+) witness_lengths=(\[.*?\]) "
    r"witness_root=(\d+) polynomial=(\[.*?\]) deletion=(\[.*?\])$"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
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
    replay = subprocess.run(
        [str(EXECUTABLE), "23", "38"],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=True,
    )
    print(replay.stdout, end="")
    assert "PASS_EXACT_RANK7_ROOTED_CROSS_B2_2_3_ORDERS_23_THROUGH_38" in replay.stdout

    by_order: dict[int, dict] = {}
    for line in replay.stdout.splitlines():
        if match := ROW2.match(line):
            order, trees, roots, minimum = map(int, match.groups()[:4])
            assert (trees, roots, minimum) == EXPECTED[order][0]
            assert roots == order * trees and minimum > 0
            by_order.setdefault(order, {})["B2_2"] = {
                "trees": trees,
                "rooted_checks": roots,
                "minimum_C7": minimum,
                "witness": {
                    "lengths": ast.literal_eval(match.group(5)),
                    "root": int(match.group(6)),
                    "polynomial": ast.literal_eval(match.group(7)),
                    "deletion": ast.literal_eval(match.group(8)),
                },
            }
        elif match := ROW3.match(line):
            order, trees, stars, chains, roots, minimum = map(int, match.groups()[:6])
            assert (trees, stars, chains, roots, minimum) == EXPECTED[order][1]
            assert trees == stars + chains and roots == order * trees and minimum > 0
            by_order.setdefault(order, {})["B2_3"] = {
                "trees": trees,
                "degree4_star_skeletons": stars,
                "degree3_chain_skeletons": chains,
                "rooted_checks": roots,
                "minimum_C7": minimum,
                "witness": {
                    "family": match.group(7),
                    "lengths": ast.literal_eval(match.group(8)),
                    "root": int(match.group(9)),
                    "polynomial": ast.literal_eval(match.group(10)),
                    "deletion": ast.literal_eval(match.group(11)),
                },
            }
    assert sorted(by_order) == list(range(23, 39))
    assert all(set(row) == {"B2_2", "B2_3"} for row in by_order.values())

    rows = [{"order": order, **by_order[order]} for order in sorted(by_order)]
    total_trees = sum(row[key]["trees"] for row in rows for key in ("B2_2", "B2_3"))
    total_roots = sum(row[key]["rooted_checks"] for row in rows for key in ("B2_2", "B2_3"))
    global_entry = min(
        (
            (row[key]["minimum_C7"], row["order"], key, row[key]["witness"])
            for row in rows
            for key in ("B2_2", "B2_3")
        ),
        key=lambda item: item[0],
    )
    report = {
        "status": "PASS_EXACT_RANK7_ROOTED_CROSS_ALL_TREES_B2_2_OR_3_N23_THROUGH_N38",
        "classification": {
            "B2_2": "subdivisions of the double-degree3 skeleton",
            "B2_3": "subdivisions of a degree4 star or a chain of three degree3 vertices",
        },
        "orders": rows,
        "totals": {"trees": total_trees, "rooted_checks": total_roots, "failures": 0},
        "global_minimum": {
            "C7": global_entry[0],
            "order": global_entry[1],
            "class": global_entry[2],
            "witness": global_entry[3],
        },
        "source": SOURCE.name,
        "source_sha256": sha256(SOURCE),
        "scope_warning": "This closes B2=2 and B2=3 only; it is not a universal rooted-C7 theorem.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"totals trees={total_trees} roots={total_roots}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
