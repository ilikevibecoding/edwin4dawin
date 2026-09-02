#!/usr/bin/env python3
"""Fresh compile/replay and assemble the B2=5 rooted-C7 subdivision theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "probe_rank7_rooted_c7_b2_5_cubic_subdivision.rs"
EXECUTABLE = HERE / "probe_rank7_rooted_c7_b2_5_subdivision_fresh.exe"
FRESH_LOG = HERE / "rank7_rooted_c7_b2_5_subdivision_fresh_replay_20260820.log"
OUTPUT = HERE / "rank7_rooted_c7_b2_5_subdivision_exact_20260820.json"

PRIMARY = {
    n: HERE / f"rank7_rooted_c7_b2_5_all_subdivision_n{n}_20260820.log"
    for n in (23, 24, 25)
}
EXPECTED = {
    23: (37_366_674, 1_264_054_265_342, 2_446_262_694_112),
    24: (66_978_624, 3_254_096_753_910, 6_417_075_527_830),
    25: (116_869_350, 7_939_936_351_517, 15_965_275_483_104),
}
ROW = re.compile(
    r'^order=(?P<n>\d+) comparisons=(?P<count>\d+) negatives=(?P<negative>\d+) '
    r'minimum_increment=(?P<increment>\d+) minimum_new_root=(?P<new>\d+) witness=(?P<witness>.*)$'
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse(text: str) -> dict:
    match = ROW.fullmatch(text.strip())
    assert match is not None
    values = match.groupdict()
    return {
        "source_order": int(values["n"]),
        "edge_root_comparisons": int(values["count"]),
        "negative_increments": int(values["negative"]),
        "minimum_increment": int(values["increment"]),
        "minimum_new_root_C7": int(values["new"]),
        "minimum_witness": values["witness"],
    }


def main() -> int:
    subprocess.run(
        [
            "rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "-O",
            str(SOURCE), "-o", str(EXECUTABLE),
        ],
        cwd=HERE,
        check=True,
    )
    fresh_chunks = []
    rows = []
    for n in (23, 24, 25):
        run = subprocess.run(
            [str(EXECUTABLE), str(n)], cwd=HERE, text=True,
            capture_output=True, check=True,
        )
        assert not run.stderr
        fresh_chunks.append(run.stdout)
        primary_text = PRIMARY[n].read_text(encoding="utf-8")
        assert run.stdout == primary_text
        row = parse(run.stdout)
        assert row["source_order"] == n
        assert (
            row["edge_root_comparisons"], row["minimum_increment"],
            row["minimum_new_root_C7"],
        ) == EXPECTED[n]
        assert row["negative_increments"] == 0
        assert row["minimum_increment"] > 0 and row["minimum_new_root_C7"] > 0
        rows.append(row)
    FRESH_LOG.write_text("".join(fresh_chunks), encoding="utf-8")

    order23 = HERE / "rank7_rooted_cross_order23_exact_20260820.json"
    base = json.loads(order23.read_text(encoding="utf-8"))
    assert base["status"] == "PASS_FRESH_REPLAY_EXACT_RANK7_ROOTED_C7_ALL_ROOTS_ORDER_23"
    classification = HERE / "rank7_rooted_cross_b2_5_skeleton_classification_20260816.json"
    classified = json.loads(classification.read_text(encoding="utf-8"))
    assert "PASS" in classified["status"]

    report = {
        "status": "PASS_FRESH_REPLAY_EXACT_RANK7_ROOTED_C7_B2_5_ORDERS_23_THROUGH_26",
        "theorem": (
            "Every rooted tree with B2=5 and order 23 through 26 has C7>0. "
            "For source orders 23 through 25, every edge subdivision strictly "
            "increases C7 at old roots and is positive at the new root."
        ),
        "source_order_subdivision_rows": rows,
        "totals": {
            "edge_root_comparisons": sum(row["edge_root_comparisons"] for row in rows),
            "negative_increments": 0,
        },
        "induction": {
            "base": "all roots of all order-23 trees have C7>0",
            "skeletons": "all four B2=5 suppressed skeletons",
            "target_orders": "23 through 26",
            "root_handling": (
                "old vertices use the positive increment; a root created by the "
                "last subdivision uses the separately positive new-root check"
            ),
        },
        "fresh_replay_matches_primary": True,
        "prerequisites": {
            order23.name: sha256(order23),
            classification.name: sha256(classification),
        },
        "artifacts": {
            path.name: sha256(path)
            for path in (SOURCE, EXECUTABLE, FRESH_LOG, Path(__file__).resolve(), *PRIMARY.values())
        },
        "scope_warning": (
            "Subdivision monotonicity is certified only at source orders 23,24,25; "
            "this report makes no B2=5 claim from order 27 onward."
        ),
    }
    assert report["totals"] == {
        "edge_root_comparisons": 221_214_648,
        "negative_increments": 0,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"comparisons={report['totals']['edge_root_comparisons']}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
