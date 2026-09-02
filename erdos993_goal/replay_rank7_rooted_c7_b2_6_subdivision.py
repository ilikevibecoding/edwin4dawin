#!/usr/bin/env python3
"""Fresh double replay and package the bounded B2=6 rooted-C7 induction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "probe_rank7_rooted_c7_b2_6_subdivision.rs"
EXECUTABLE = HERE / "probe_rank7_rooted_c7_b2_6_subdivision_fresh.exe"
PRIMARY_LOG = HERE / "rank7_rooted_c7_b2_6_subdivision_primary_20260820.log"
FRESH_LOG = HERE / "rank7_rooted_c7_b2_6_subdivision_fresh_replay_20260820.log"
OUTPUT = HERE / "rank7_rooted_c7_b2_6_subdivision_exact_20260820.json"
ORDERS = (25, 26)

EXPECTED_TOTALS = {
    25: {
        "trees": 1_188_672,
        "base_roots": 29_716_800,
        "comparisons": 353_815_250,
        "minimum_base": 5_242_520_020_048,
        "minimum_increment": 7_890_568_643_463,
        "minimum_new_root": 15_533_360_315_852,
    },
    26: {
        "trees": 2_122_926,
        "base_roots": 55_196_076,
        "comparisons": 665_385_552,
        "minimum_base": 13_193_284_240_736,
        "minimum_increment": 18_345_070_738_799,
        "minimum_new_root": 36_937_550_107_104,
    },
}

EXPECTED_FAMILIES = {
    "cubic_path_P6",
    "cubic_double_star_33",
    "cubic_arms_311",
    "cubic_arms_221",
    "mixed43_path_degree4_endpoint",
    "mixed43_path_degree4_inner",
    "mixed43_star_degree4_center",
    "mixed43_star_degree4_leaf",
    "double_degree4",
    "single_degree5",
}

FAMILY = re.compile(
    r"^FAMILY order=(?P<order>\d+) name=(?P<name>\S+) "
    r"vertices=(?P<vertices>\d+) edges=(?P<edges>\d+) "
    r"automorphisms=(?P<automorphisms>\d+) trees=(?P<trees>\d+) "
    r"base_roots=(?P<base_roots>\d+) comparisons=(?P<comparisons>\d+) "
    r"base_nonpositive=(?P<base_nonpositive>\d+) "
    r"negative_increments=(?P<negative_increments>\d+) "
    r"zero_increments=(?P<zero_increments>\d+) "
    r"nonpositive_new_roots=(?P<nonpositive_new_roots>\d+) "
    r"minimum_base=(?P<minimum_base>\d+) "
    r"minimum_increment=(?P<minimum_increment>\d+) "
    r"minimum_new_root=(?P<minimum_new_root>\d+) "
    r"base_witness=(?P<witnesses>.*)$"
)

TOTAL = re.compile(
    r"^TOTAL order=(?P<order>\d+) trees=(?P<trees>\d+) "
    r"base_roots=(?P<base_roots>\d+) comparisons=(?P<comparisons>\d+) "
    r"base_nonpositive=(?P<base_nonpositive>\d+) "
    r"negative_increments=(?P<negative_increments>\d+) "
    r"zero_increments=(?P<zero_increments>\d+) "
    r"nonpositive_new_roots=(?P<nonpositive_new_roots>\d+)$"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def run_once() -> str:
    chunks: list[str] = []
    for order in ORDERS:
        run = subprocess.run(
            [str(EXECUTABLE), str(order)],
            cwd=HERE,
            text=True,
            capture_output=True,
            check=True,
        )
        assert not run.stderr
        chunks.append(run.stdout)
    return "".join(chunks)


def parse(log_text: str) -> list[dict]:
    by_order: dict[int, dict] = {}
    for line in log_text.splitlines():
        if line.startswith("BEGIN "):
            match = re.fullmatch(r"BEGIN order=(\d+) skeletons=(\d+)", line)
            assert match and int(match.group(2)) == 10
            order = int(match.group(1))
            assert order in ORDERS and order not in by_order
            by_order[order] = {"source_order": order, "families": []}
        elif line.startswith("FAMILY "):
            match = FAMILY.fullmatch(line)
            assert match is not None
            values = match.groupdict()
            order = int(values.pop("order"))
            witnesses = values.pop("witnesses")
            row = {key: (value if key == "name" else int(value)) for key, value in values.items()}
            row["witnesses"] = "base_witness=" + witnesses
            by_order[order]["families"].append(row)
        elif line.startswith("TOTAL "):
            match = TOTAL.fullmatch(line)
            assert match is not None
            values = {key: int(value) for key, value in match.groupdict().items()}
            order = values.pop("order")
            by_order[order]["total"] = values
        elif line.startswith("PASS_"):
            match = re.fullmatch(
                r"PASS_EXACT_RANK7_ROOTED_C7_B2_6_SUBDIVISION_SOURCE_ORDER_(\d+)", line
            )
            assert match is not None
            by_order[int(match.group(1))]["pass_marker"] = line
        else:
            raise AssertionError(f"unparsed line: {line!r}")

    assert set(by_order) == set(ORDERS)
    rows = []
    for order in ORDERS:
        row = by_order[order]
        families = row["families"]
        assert len(families) == 10
        assert {family["name"] for family in families} == EXPECTED_FAMILIES
        assert all(
            family[key] == 0
            for family in families
            for key in (
                "base_nonpositive",
                "negative_increments",
                "zero_increments",
                "nonpositive_new_roots",
            )
        )
        total = row["total"]
        assert total == {
            "trees": sum(family["trees"] for family in families),
            "base_roots": sum(family["base_roots"] for family in families),
            "comparisons": sum(family["comparisons"] for family in families),
            "base_nonpositive": 0,
            "negative_increments": 0,
            "zero_increments": 0,
            "nonpositive_new_roots": 0,
        }
        minima = {
            "minimum_base": min(family["minimum_base"] for family in families),
            "minimum_increment": min(family["minimum_increment"] for family in families),
            "minimum_new_root": min(family["minimum_new_root"] for family in families),
        }
        expected = EXPECTED_TOTALS[order]
        for key in ("trees", "base_roots", "comparisons"):
            assert total[key] == expected[key]
        assert minima == {key: expected[key] for key in minima}
        row["global_minima"] = minima
        rows.append(row)
    return rows


def main() -> int:
    subprocess.run(
        [
            "rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "-O",
            str(SOURCE), "-o", str(EXECUTABLE),
        ],
        cwd=HERE,
        check=True,
    )
    primary_text = run_once()
    PRIMARY_LOG.write_text(primary_text, encoding="utf-8")
    primary_rows = parse(primary_text)

    fresh_text = run_once()
    FRESH_LOG.write_text(fresh_text, encoding="utf-8")
    fresh_rows = parse(fresh_text)
    assert fresh_text == primary_text
    assert fresh_rows == primary_rows

    report = {
        "status": "PASS_FRESH_DOUBLE_REPLAY_EXACT_RANK7_ROOTED_C7_B2_6_ORDERS_25_THROUGH_27",
        "theorem": (
            "Every rooted tree with B2=6 and order 25 through 27 has C7>0. "
            "At source orders 25 and 26, every one-edge subdivision strictly "
            "increases C7 at every old root and has positive C7 at the inserted root."
        ),
        "source_order_subdivision_rows": primary_rows,
        "totals": {
            "canonical_trees": sum(row["total"]["trees"] for row in primary_rows),
            "base_root_checks": sum(row["total"]["base_roots"] for row in primary_rows),
            "old_root_edge_comparisons": sum(
                row["total"]["comparisons"] for row in primary_rows
            ),
            "base_nonpositive": 0,
            "negative_increments": 0,
            "zero_increments": 0,
            "nonpositive_new_roots": 0,
        },
        "induction": {
            "base": (
                "The source-order-25 scan checks C7>0 at every root of every "
                "canonical B2=6 positive skeleton-edge length assignment."
            ),
            "skeletons": (
                "All ten B2=6 suppressed skeletons: four cubic, four with "
                "branch degrees 4,3,3,3, one with 4,4, and one with 5."
            ),
            "target_orders": "25 through 27",
            "root_handling": (
                "An old root uses the strictly positive increment. A root equal "
                "to the last inserted subdivision vertex uses the separately "
                "positive inserted-root check."
            ),
        },
        "fresh_replay_matches_primary_byte_for_byte": True,
        "artifacts": {
            path.name: sha256(path)
            for path in (SOURCE, EXECUTABLE, PRIMARY_LOG, FRESH_LOG, Path(__file__).resolve())
        },
        "scope_warning": (
            "Subdivision monotonicity is certified only at source orders 25 and 26. "
            "No B2=6 claim is made at order 28 or above, and source order 27 was not run."
        ),
    }
    assert report["totals"] == {
        "canonical_trees": 3_311_598,
        "base_root_checks": 84_912_876,
        "old_root_edge_comparisons": 1_019_200_802,
        "base_nonpositive": 0,
        "negative_increments": 0,
        "zero_increments": 0,
        "nonpositive_new_roots": 0,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"comparisons={report['totals']['old_root_edge_comparisons']}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
