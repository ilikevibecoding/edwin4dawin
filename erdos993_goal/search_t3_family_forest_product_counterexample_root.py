#!/usr/bin/env python3
"""Exact forest-product search in the T_{3,m,n} and T*_{3,m,n} families.

Grace M.X. Li proved every individual member of both families unimodal.
Disjoint union multiplies independence polynomials, so this script checks
whether products of family members expose a finite forest counterexample.
A no-hit report is bounded evidence only; a hit contains exact coefficients
for independent replay.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

from flint import fmpz_poly


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = HERE / "t3_family_forest_product_search_root_20260827.json"
KNOWN_ORDER26 = (
    HERE / "literature_sources" / "erdos-problem-993-current" / "results"
    / "analysis_n26.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    result = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        result[index] += value
    for index, value in enumerate(right):
        result[index] += value
    return result


def convolve(left: list[int], right: list[int]) -> list[int]:
    product = fmpz_poly(left) * fmpz_poly(right)
    return [int(product[index]) for index in range(len(product))]


def binomial_scaled(order: int, scale: int) -> list[int]:
    return [math.comb(order, index) * scale**index for index in range(order + 1)]


def shift(polynomial: list[int]) -> list[int]:
    return [0, *polynomial]


def ordinary_branch(arms: int) -> tuple[list[int], list[int], list[int]]:
    excluded = binomial_scaled(arms, 2)
    included = shift(binomial_scaled(arms, 1))
    return excluded, included, add(excluded, included)


def exceptional_branch() -> tuple[list[int], list[int], list[int]]:
    # Two length-2 arms and one length-4 arm at the branch center.
    excluded = convolve(binomial_scaled(2, 2), [1, 4, 3])
    included = shift(convolve(binomial_scaled(2, 1), [1, 3, 1]))
    return excluded, included, add(excluded, included)


def family_polynomial(starred: bool, m: int, n: int) -> tuple[int, list[int]]:
    first_excluded, _, first_total = (
        exceptional_branch() if starred else ordinary_branch(3)
    )
    second_excluded, _, second_total = ordinary_branch(m)
    third_excluded, _, third_total = ordinary_branch(n)
    root_excluded = convolve(convolve(first_total, second_total), third_total)
    root_included = shift(
        convolve(convolve(first_excluded, second_excluded), third_excluded)
    )
    polynomial = add(root_excluded, root_included)
    order = (12 if starred else 10) + 2 * m + 2 * n
    assert polynomial[0] == 1
    assert polynomial[1] == order
    return order, polynomial


def first_unimodality_failure(row: list[int]) -> dict | None:
    falling = False
    for index in range(1, len(row)):
        if row[index] < row[index - 1]:
            falling = True
        elif row[index] > row[index - 1] and falling:
            return {
                "increase_index": index,
                "local_coefficients": row[max(0, index - 3):index + 2],
            }
    return None


def log_concavity_failures(row: list[int]) -> list[dict]:
    return [
        {
            "index": index,
            "center_square": row[index] ** 2,
            "neighbor_product": row[index - 1] * row[index + 1],
        }
        for index in range(1, len(row) - 1)
        if row[index] ** 2 < row[index - 1] * row[index + 1]
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-parameter", type=int, default=35)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--stop-on-first", action="store_true")
    args = parser.parse_args()
    assert args.maximum_parameter >= 1

    known = json.loads(KNOWN_ORDER26.read_text(encoding="utf-8"))
    expected_breakers = {tuple(row["poly"]) for row in known["lc_failures"]}
    reconstructed_breakers = {
        tuple(family_polynomial(False, 4, 4)[1]),
        tuple(family_polynomial(True, 3, 4)[1]),
    }
    assert reconstructed_breakers == expected_breakers

    members = []
    for starred in (False, True):
        for m in range(1, args.maximum_parameter + 1):
            for n in range(m, args.maximum_parameter + 1):
                order, polynomial = family_polynomial(starred, m, n)
                unimodality_failure = first_unimodality_failure(polynomial)
                assert unimodality_failure is None
                lc_failures = log_concavity_failures(polynomial)
                members.append({
                    "family": "Tstar_3_m_n" if starred else "T_3_m_n",
                    "starred": starred,
                    "m": m,
                    "n": n,
                    "order": order,
                    "polynomial": polynomial,
                    "log_concavity_failures": lc_failures,
                })
    non_lc = sum(bool(row["log_concavity_failures"]) for row in members)
    print("MEMBERS", len(members), "NON_LC", non_lc, flush=True)

    checks = 0
    skipped_both_log_concave = 0
    hits = []
    for first_index, first in enumerate(members):
        if first_index % 50 == 0:
            print("FIRST_INDEX", first_index, "CHECKS", checks, flush=True)
        for second in members[first_index:]:
            if not first["log_concavity_failures"] and not second["log_concavity_failures"]:
                skipped_both_log_concave += 1
                continue
            product = convolve(first["polynomial"], second["polynomial"])
            checks += 1
            failure = first_unimodality_failure(product)
            if failure:
                hits.append({
                    "first": {
                        key: first[key] for key in (
                            "family", "m", "n", "order", "polynomial",
                            "log_concavity_failures",
                        )
                    },
                    "second": {
                        key: second[key] for key in (
                            "family", "m", "n", "order", "polynomial",
                            "log_concavity_failures",
                        )
                    },
                    "forest_order": first["order"] + second["order"],
                    "product_polynomial": product,
                    "unimodality_failure": failure,
                })
                print(
                    "CANDIDATE", first["family"], first["m"], first["n"],
                    second["family"], second["m"], second["n"],
                    "INDEX", failure["increase_index"], flush=True,
                )
                if args.stop_on_first:
                    break
        if hits and args.stop_on_first:
            break

    payload = {
        "schema": "t3-family-forest-product-counterexample-search-root-v1",
        "status": (
            "FINITE_EXACT_FOREST_COUNTEREXAMPLE_CANDIDATE_FOUND_REQUIRES_INDEPENDENT_AUDIT"
            if hits else
            "NO_NONUNIMODAL_PRODUCT_IN_BOUNDED_T3_FAMILY_SEARCH_EVIDENCE_ONLY"
        ),
        "parameter_domain": {
            "families": ["T_3_m_n", "Tstar_3_m_n"],
            "m_range": [1, args.maximum_parameter],
            "n_range": "m<=n<=maximum_parameter",
        },
        "rooted_dp_formulas": {
            "ordinary_branch_excluded": "(1+2x)^q",
            "ordinary_branch_included": "x(1+x)^q",
            "exceptional_branch_excluded": "(1+2x)^2 I(P4)",
            "exceptional_branch_included": "x(1+x)^2 I(P3)",
            "tree": "product(branch totals)+x*product(branch excluded states)",
        },
        "members": len(members),
        "non_log_concave_members": non_lc,
        "exact_products_checked": checks,
        "skipped_both_log_concave_pairs": skipped_both_log_concave,
        "skip_justification": (
            "Convolution of two nonnegative log-concave sequences without "
            "internal zeros is log-concave and hence unimodal."
        ),
        "hits": hits,
        "scope_warning": (
            "No-hit output is finite evidence only.  A hit must be independently "
            "reconstructed from the two literal tree definitions before it is a counterexample."
        ),
        "source_paper": "arXiv:2603.03025v1",
        "known_order26_formula_check": {
            "source": str(KNOWN_ORDER26),
            "source_sha256": sha256(KNOWN_ORDER26),
            "T_3_4_4_exact_match": True,
            "Tstar_3_3_4_exact_match": True,
        },
        "script_sha256": sha256(Path(__file__)),
    }
    output = args.output.resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
