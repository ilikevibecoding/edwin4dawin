#!/usr/bin/env python3
"""Assemble the literal shifted-Q8 terminal-family census through order 20."""

from __future__ import annotations

import ast
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LOGS = [
    "rank8_terminal_full_shifted_q8_n1_n17_exact_20260820.log",
    "rank8_terminal_full_shifted_q8_n18_n20_exact_20260820.log",
]
EXPECTED_TREES = [
    0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301,
    3159, 7741, 19320, 48629, 123867, 317955, 823065,
]
ROW = re.compile(
    r"core_n=(\d+) trees=(\d+) roots=(\d+) "
    r"minima=(\[[^\]]*\]) negative_counts=(\[[^\]]*\])"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    rows: dict[int, dict[str, object]] = {}
    markers: list[str] = []
    for name in LOGS:
        text = (ROOT / name).read_text(encoding="utf-8")
        markers.extend(line for line in text.splitlines() if line.startswith("PASS_EXACT_"))
        for match in ROW.finditer(text):
            order, trees, roots = map(int, match.group(1, 2, 3))
            minima = ast.literal_eval(match.group(4))
            negative = ast.literal_eval(match.group(5))
            assert order not in rows
            assert trees == EXPECTED_TREES[order]
            assert roots == order * trees
            assert len(minima) == len(negative) == 16
            assert all(value > 0 for value in minima)
            assert negative == [0] * 16
            rows[order] = {
                "order": order,
                "trees": trees,
                "roots": roots,
                "minimum_shifted_Newton_coefficients_Delta0_through_Delta15": minima,
                "negative_counts": negative,
            }

    assert sorted(rows) == list(range(1, 21))
    total_trees = sum(int(row["trees"]) for row in rows.values())
    total_roots = sum(int(row["roots"]) for row in rows.values())
    assert total_trees == 1346024
    assert total_roots == 26056124
    artifacts = [
        Path(__file__).name,
        "verify_rank8_terminal_full_shifted_q8_finite.rs",
        "verify_rank8_terminal_full_shifted_q8_finite.exe",
        "verify_rank8_terminal_delta5_finite.rs",
        *LOGS,
    ]
    output = ROOT / "rank8_terminal_full_shifted_q8_n1_n20_exact_20260820.json"
    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_FULL_SHIFTED_Q8_N1_N20",
        "theorem": "For every rooted tree core A of order at most 20, Q8(G_t)>0 for every sibling count t>=max(1,14-alpha(A)).",
        "terminal_family": "I(G_t;x)=(1+x)^t I(A;x)+x I(A-q;x)",
        "shift": "t0=max(1,14-alpha(A)); hence alpha(G_t)=alpha(A)+t>=14",
        "method": "exact WROM free-tree stream, exact tree DP for alpha and independence coefficients through rank 9, literal Q8 evaluation at 18 consecutive t values, complete forward-difference reconstruction with verified degree at most 15",
        "totals": {"free_trees": total_trees, "rooted_families": total_roots},
        "all_16_shifted_Newton_coefficients": "strictly positive in every rooted family",
        "rows": [rows[order] for order in sorted(rows)],
        "markers": markers,
        "artifacts_sha256": {name: sha256(ROOT / name) for name in artifacts},
        "scope_warning": "This disposes terminal families whose reduced core has order at most 20. Orders 21 through 26, the connected-tree induction above the finite band, and the all-forest convolution lift remain separate obligations.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
