#!/usr/bin/env python3
"""Package or freshly replay the exact terminal-broom B2=4 census."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
from pathlib import Path
import re
import subprocess


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "verify_rank7_terminal_broom_b2_4.rs"
DEPENDENCY = HERE / "verify_rank7_rooted_cross_b2_4.rs"
EXECUTABLE = HERE / "verify_rank7_terminal_broom_b2_4.exe"
INITIAL_LOG = HERE / "rank7_terminal_broom_b2_4_exact_run_v2.log"
REPLAY_LOG = HERE / "rank7_terminal_broom_b2_4_fresh_replay.log"
REPORT = HERE / "rank7_terminal_broom_b2_4_exact_20260816.json"
REPLAY_REPORT = HERE / "rank7_terminal_broom_b2_4_replay_20260816.json"

# trees, mixed, degree-three path, degree-three star, rooted checks
EXPECTED = {
    23: (49_192, 2_730, 38_378, 8_084, 1_131_416),
    24: (74_836, 3_456, 59_104, 12_276, 1_796_064),
    25: (111_498, 4_330, 88_936, 18_232, 2_787_450),
    26: (163_175, 5_370, 131_207, 26_598, 4_242_550),
    27: (234_696, 6_602, 189_980, 38_114, 6_336_792),
    28: (332_492, 8_048, 270_623, 53_821, 9_309_776),
    29: (464_183, 9_738, 379_589, 74_856, 13_461_307),
    30: (639_687, 11_698, 525_172, 102_817, 19_190_610),
    31: (870_644, 13_963, 717_221, 139_460, 26_989_964),
    32: (1_171_771, 16_563, 968_112, 187_096, 37_496_672),
    33: (1_560_250, 19_538, 1_292_384, 248_328, 51_488_250),
    34: (2_057_386, 22_923, 1_707_964, 326_499, 69_951_124),
    35: (2_687_755, 26_763, 2_235_712, 425_280, 94_071_425),
    36: (3_481_410, 31_098, 2_900_940, 549_372, 125_330_760),
    37: (4_472_769, 35_979, 3_732_852, 703_938, 165_492_453),
    38: (5_703_207, 41_451, 4_766_400, 895_356, 216_721_866),
}

ROW = re.compile(
    r"^order=(\d+) trees=(\d+) mixed_trees=(\d+) path_trees=(\d+) "
    r"star_trees=(\d+) roots=(\d+) minima=(\[.*\])$"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse(text: str) -> list[dict]:
    rows: dict[int, dict] = {}
    for line in text.splitlines():
        match = ROW.match(line)
        if not match:
            continue
        order, trees, mixed, path, star, roots = map(int, match.groups()[:6])
        minima = ast.literal_eval(match.group(7))
        assert order not in rows
        assert (trees, mixed, path, star, roots) == EXPECTED[order]
        assert trees == mixed + path + star
        assert roots == order * trees
        assert len(minima) == 14
        assert all(isinstance(value, int) and value >= 0 for value in minima)
        rows[order] = {
            "order": order,
            "trees": trees,
            "degree4_degree3_trees": mixed,
            "degree3_path_trees": path,
            "degree3_star_trees": star,
            "rooted_checks": roots,
            "newton_minima": minima,
        }
    assert sorted(rows) == list(range(23, 39))
    return [rows[order] for order in sorted(rows)]


def totals(rows: list[dict]) -> dict:
    result = {
        "trees": sum(row["trees"] for row in rows),
        "rooted_checks": sum(row["rooted_checks"] for row in rows),
    }
    assert result == {"trees": 24_074_951, "rooted_checks": 845_798_479}
    return result


def write_primary(rows: list[dict]) -> None:
    rank_minima = [min(row["newton_minima"][rank] for row in rows) for rank in range(14)]
    assert all(value > 0 for value in rank_minima)
    report = {
        "schema": "rank7-terminal-broom-b2-4-exact-v1",
        "status": "PASS_EXACT_RANK7_TERMINAL_BROOM_B2_4_ORDERS_23_THROUGH_38",
        "classification": [
            "one degree4 and one degree3 branch vertex",
            "four degree3 branch vertices whose branch tree is a path",
            "four degree3 branch vertices whose branch tree is a star",
        ],
        "orders": rows,
        "totals": totals(rows),
        "global_newton_minima": rank_minima,
        "conclusion": "all fourteen Newton coefficients are positive, hence R_t>=0 for every integer t>=1",
        "artifacts_sha256": {
            SOURCE.name: sha256(SOURCE),
            DEPENDENCY.name: sha256(DEPENDENCY),
            EXECUTABLE.name: sha256(EXECUTABLE),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"totals trees={report['totals']['trees']} roots={report['totals']['rooted_checks']}")


def fresh_replay() -> None:
    primary = json.loads(REPORT.read_text(encoding="utf-8"))
    subprocess.run(
        [
            "rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "-O",
            str(SOURCE), "-o", str(EXECUTABLE),
        ],
        cwd=HERE,
        check=True,
    )
    flags = getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0) | getattr(subprocess, "CREATE_NO_WINDOW", 0)
    with REPLAY_LOG.open("w", encoding="utf-8", buffering=1) as output, (HERE / "rank7_terminal_broom_b2_4_fresh_replay.err.log").open("w", encoding="utf-8") as error:
        process = subprocess.Popen(
            [str(EXECUTABLE), "23", "38"], cwd=HERE, text=True,
            stdout=subprocess.PIPE, stderr=error, creationflags=flags,
        )
        assert process.stdout is not None
        lines = []
        for line in process.stdout:
            print(line, end="")
            output.write(line)
            output.flush()
            lines.append(line)
        return_code = process.wait()
    assert return_code == 0
    text = "".join(lines)
    assert "PASS_EXACT_RANK7_TERMINAL_BROOM_B2_4_ORDERS_23_THROUGH_38" in text
    rows = parse(text)
    assert rows == primary["orders"]
    assert totals(rows) == primary["totals"]
    replay = {
        "schema": "rank7-terminal-broom-b2-4-replay-v1",
        "status": "PASS_FRESH_REPLAY_EXACT_RANK7_TERMINAL_BROOM_B2_4",
        "orders_replayed": [23, 38],
        "totals": totals(rows),
        "global_newton_minima": primary["global_newton_minima"],
        "artifacts_sha256": {
            SOURCE.name: sha256(SOURCE),
            DEPENDENCY.name: sha256(DEPENDENCY),
            EXECUTABLE.name: sha256(EXECUTABLE),
            REPORT.name: sha256(REPORT),
            REPLAY_LOG.name: sha256(REPLAY_LOG),
        },
    }
    REPLAY_REPORT.write_text(json.dumps(replay, indent=2) + "\n", encoding="utf-8")
    print(replay["status"])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summarize-current-run", action="store_true")
    args = parser.parse_args()
    if args.summarize_current_run:
        text = INITIAL_LOG.read_text(encoding="utf-8")
        assert "PASS_EXACT_RANK7_TERMINAL_BROOM_B2_4_ORDERS_23_THROUGH_38" in text
        write_primary(parse(text))
    else:
        fresh_replay()


if __name__ == "__main__":
    main()
