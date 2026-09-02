#!/usr/bin/env python3
"""Exact large-order certificate for the four remaining no-parent g5 geometries.

The fifth marked-geometry branch (nonadjacent/common0 with marked-neighbour
sum at least two) is certified separately by the coupled Omega/tau producer.
This producer is fail-closed and asserts the exact Bernstein tail signs for
the other four exhaustive branches at every n >= 60.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary
from explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent import (
    substitute_geometry_with_wedge_floor,
)
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g5_other_geometries_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_OTHER_GEOMETRIES_RANK7_G5_FINISH"
THRESHOLD = 60

EXPECTED_INPUT_SHA256 = "FF80D6A3F382E27E55316C6A31CE58D9D9E0DBC9027F38177F565ABA7D016309"
EXPECTED_BASE_SHA256 = "3C76D1074E0923E239ED7A7A7B922F6ADFE9469E6A56F73A68A366A8FAAD9DF4"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def main() -> None:
    assert THRESHOLD == 60
    assert sha256(INPUT) == EXPECTED_INPUT_SHA256
    assert sha256(HERE / "probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail.py") == EXPECTED_BASE_SHA256
    assert base.THRESHOLD == THRESHOLD

    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {"n": sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2, 8):
            symbols[f"{family}{rank}"] = sp.Symbol(
                f"{family}{rank}", nonnegative=True
            )
    n = symbols["n"]
    tail = sp.Symbol("t", nonnegative=True)
    m = n - 2
    e = choose(m, 2) - symbols["W2"]

    def category_lower(h, k):
        return choose(h, k) - e * choose(h, k - 2)

    def category_upper(h, k):
        retained = e - m * (m - h)
        extension = k * choose(h, k) / (m * (m - 1))
        return choose(h, k) - retained * extension

    intervals = {}
    for rank in range(3, 8):
        internal_rank = rank - 1
        intervals[f"A{rank}"] = (
            category_lower(symbols["A2"], internal_rank),
            category_upper(symbols["A2"], internal_rank),
        )
        intervals[f"B{rank}"] = (
            category_lower(symbols["B2"], internal_rank),
            category_upper(symbols["B2"], internal_rank),
        )
    for rank in range(4, 8):
        internal_rank = rank - 2
        intervals[f"Z{rank}"] = (
            symbols["Z2"] * category_lower(symbols["Z3"], internal_rank),
            symbols["Z2"] * category_upper(symbols["Z3"], internal_rank),
        )
    for rank in range(4, 8):
        incidence = e * choose(m - 2, rank - 2)
        intervals[f"W{rank}"] = (
            choose(m, rank) - incidence,
            choose(m, rank) - incidence / (rank - 1),
        )

    current = sp.expand(
        sp.sympify(source["modes"]["no_parent"]["expression"], locals=symbols)
    )
    elimination = []
    for rank in range(7, 2, -1):
        labels = [f"A{rank}", f"B{rank}"]
        if rank >= 4:
            labels += [f"W{rank}", f"Z{rank}"]
        for label in labels:
            current, row = base.eliminate_linear(
                current, symbols[label], *intervals[label], n, tail
            )
            elimination.append(row)

    assert current.free_symbols <= {
        n,
        symbols["A2"],
        symbols["B2"],
        symbols["W2"],
        symbols["W3"],
        symbols["Z2"],
        symbols["Z3"],
    }

    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    all_branches = marked_geometry_branches(tail + THRESHOLD - 2, a, b, c, d)
    assert [branch[0] for branch in all_branches] == [
        "adjacent",
        "nonadjacent_common1",
        "nonadjacent_common0_sum0",
        "nonadjacent_common0_sum1",
        "nonadjacent_common0_sum_ge2",
    ]

    # The legacy adjacent box permits its single impossible corner e=m.  Use
    # the exact forest-and-mark budget instead: r=m-e is at least one and
    # x+y<=r.  The nested box below covers precisely 1<=r<=m, 0<=x<=r,
    # 0<=y<=r-x, and e=m-r.
    m_value = tail + THRESHOLD - 2
    r = 1 + (m_value - 1) * a
    exact_adjacent = (
        "adjacent",
        (a, b, c, d),
        r * b,
        r * (1 - b) * c,
        m_value - r,
        sp.Integer(0),
        sp.Integer(0),
    )
    certified_branches = [exact_adjacent, *all_branches[1:4]]

    branches = []
    for branch in certified_branches:
        label, variables, value = substitute_geometry_with_wedge_floor(
            current, n, tail + THRESHOLD, branch
        )
        print("BRANCH_START", label, flush=True)
        summary = fast_summary(value, variables, tail)
        assert summary["negative_tail_scalar_coefficients"] == 0, (
            label,
            summary["first_negative"],
        )
        assert sp.sympify(summary["minimum_tail_scalar_coefficient"]) >= 0
        branches.append({"geometry": label, "summary": summary})

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem_scope": (
            "rank-seven bundle g5 no-parent mode, adjacent, nonadjacent/common1, "
            "nonadjacent/common0/sum0, and nonadjacent/common0/sum1 geometries, "
            "for every integer n>=60"
        ),
        "threshold": THRESHOLD,
        "branches": branches,
        "negative_tail_scalar_coefficients": sum(
            row["summary"]["negative_tail_scalar_coefficients"] for row in branches
        ),
        "tail_scalar_coefficients": sum(
            row["summary"]["tail_scalar_coefficients"] for row in branches
        ),
        "elimination_rows": elimination,
        "facts": {
            "geometry_partition": (
                "The marked_geometry_branches are exhaustive; the adjacent branch is "
                "reparameterized exactly by r=m-e>=1 and x+y<=r."
            ),
            "wedge_floor": (
                "For a forest, Omega=sum_v C(d_v,2)>=2e-m and "
                "W3=C(m,3)-e(m-2)+Omega."
            ),
            "intervals": (
                "All higher W/A/B/Z rows use exact edge-incidence and induced-forest "
                "containment intervals before the Bernstein audit."
            ),
        },
        "dependencies": {
            INPUT.name: sha256(INPUT),
            "probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail.py": EXPECTED_BASE_SHA256,
            "explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent.py": sha256(
                HERE / "explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent.py"
            ),
            "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py": sha256(
                HERE / "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    assert report["negative_tail_scalar_coefficients"] == 0
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    digest = hashlib.sha256(encoded.encode()).hexdigest().upper()
    print(json.dumps({
        "marker": MARKER,
        "branch_negative_counts": {
            row["geometry"]: row["summary"]["negative_tail_scalar_coefficients"]
            for row in branches
        },
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", digest)
    print(MARKER)


if __name__ == "__main__":
    main()
