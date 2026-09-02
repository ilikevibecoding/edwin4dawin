#!/usr/bin/env python3
"""Compile, replay, and package the exact rank-seven small-core splice."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank7_terminal_broom_small_core_splice.rs"
EXECUTABLE = ROOT / "verify_rank7_terminal_broom_small_core_splice.exe"
LOG = ROOT / "rank7_terminal_broom_small_core_splice_exact_20260820.log"
REPORT = ROOT / "rank7_terminal_broom_small_core_splice_exact_20260820.json"

EXPECTED_TREES = (1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159)
EXPECTED_ROOTS = tuple((n + 1) * count for n, count in enumerate(EXPECTED_TREES))
EXPECTED_ENTRY_MINIMA = (
    731808, 1981980, 1305864, 902664, 722960, 674304, 669800,
    674304, 649328, 609848, 609848, 767354, 767354, 1113968,
)

ROW = re.compile(
    r"^core_n=(\d+) trees=(\d+) roots=(\d+) "
    r"min_Q7_at_alpha12_entry=(\d+) min_newton_coefficient=(\d+)$"
)
FINAL = re.compile(
    r"^PASS_EXACT_RANK7_TERMINAL_BROOM_SMALL_CORE_SPLICE_THROUGH_N14 "
    r"roots=(\d+) min_Q7=(\d+) min_Q7_order=(\d+) min_newton_coefficient=(\d+)$"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    subprocess.run(
        [
            "rustc", "-O", "--target", "x86_64-pc-windows-gnu",
            str(SOURCE), "-o", str(EXECUTABLE),
        ],
        cwd=ROOT,
        check=True,
    )
    completed = subprocess.run(
        [str(EXECUTABLE)], cwd=ROOT, check=True, text=True, capture_output=True
    )
    assert completed.stderr == ""
    LOG.write_text(completed.stdout, encoding="utf-8")
    lines = completed.stdout.splitlines()
    assert len(lines) == 15

    rows = []
    for expected_order, line in enumerate(lines[:14], start=1):
        match = ROW.fullmatch(line)
        assert match is not None, line
        order, trees, roots, minimum, coefficient_minimum = map(int, match.groups())
        assert order == expected_order
        assert trees == EXPECTED_TREES[order - 1]
        assert roots == EXPECTED_ROOTS[order - 1]
        assert minimum == EXPECTED_ENTRY_MINIMA[order - 1]
        assert coefficient_minimum == 0
        rows.append(
            {
                "core_order": order,
                "free_trees": trees,
                "rooted_cores": roots,
                "minimum_Q7_at_alpha12_entry": minimum,
                "minimum_newton_coefficient": coefficient_minimum,
            }
        )

    final = FINAL.fullmatch(lines[14])
    assert final is not None
    total_roots, minimum, minimum_order, coefficient_minimum = map(int, final.groups())
    assert total_roots == sum(EXPECTED_ROOTS) == 72145
    assert minimum == min(EXPECTED_ENTRY_MINIMA) == 609848
    assert minimum_order == 10
    assert coefficient_minimum == 0

    report = {
        "schema": "rank7-terminal-broom-small-core-splice-v1",
        "status": "PASS_EXACT_RANK7_TERMINAL_BROOM_SMALL_CORE_SPLICE_THROUGH_N14",
        "scope": (
            "Every rooted free-tree core A of order 1 through 14, and every "
            "integer t>=max(1,12-alpha(A))."
        ),
        "construction": (
            "G_t is obtained by adjoining at the root a new support vertex "
            "with t pendant leaves."
        ),
        "exact_alpha_identity": "alpha(G_t)=alpha(A)+t for t>=1",
        "proof_method": (
            "Q7(G_t) has degree at most 14 in t.  All 15 Newton "
            "coefficients about t0=max(1,12-alpha(A)) are nonnegative for "
            "every enumerated rooted core."
        ),
        "rows": rows,
        "totals": {
            "rooted_cores": total_roots,
            "minimum_Q7_at_alpha12_entry": minimum,
            "minimum_order": minimum_order,
            "minimum_newton_coefficient": coefficient_minimum,
        },
        "integration_effect": (
            "This supplies the direct small-core splice required because "
            "the residual Delta0 is negative for some cores of orders "
            "10 through 12 and Q7(A) can be negative when alpha(A) is 7 or 8."
        ),
        "scope_guard": (
            "This proves the literal terminal-broom target families only "
            "through core order 14.  It does not assert R_t>=0 in orders "
            "10 through 12 and is not by itself the connected-tree theorem."
        ),
        "hashes": {
            SOURCE.name: sha256(SOURCE),
            EXECUTABLE.name: sha256(EXECUTABLE),
            LOG.name: sha256(LOG),
            Path(__file__).name: sha256(Path(__file__)),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"rooted_cores={total_roots} minimum_Q7={minimum}")
    print(f"report_sha256={sha256(REPORT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
