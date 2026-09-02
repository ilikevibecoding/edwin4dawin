#!/usr/bin/env python3
"""Exact finite audit of the generalized three-defect GBCL inequality.

For a terminal pendant pair, use

    T=G-leaf,  F=G-{leaf,support},  r=k-1,

and the coefficient form (11) in
TWO_SIDED_CURVATURE_LIKELIHOOD_COMPENSATION_2026-07-29.md.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx
from flint import fmpz_poly

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)
from patternboost_corpus_audit import adjacency_from_prufer
from random_leaf_gsb_local_payment import tree_polynomial


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def coeff(poly, rank: int) -> int:
    if rank < 0:
        return 0
    if isinstance(poly, tuple):
        return int(poly[rank]) if rank < len(poly) else 0
    return int(poly[rank]) if rank <= poly.degree() else 0


def gbcl_data(t_poly, f_poly, k: int) -> dict | None:
    r = k - 1
    a = int(coeff(t_poly, r))
    ap = int(coeff(t_poly, k))
    app = int(coeff(t_poly, k + 1))
    bm = int(coeff(f_poly, r - 1))
    b = int(coeff(f_poly, r))
    bp = int(coeff(f_poly, k))
    if min(a, ap, bm, b) <= 0:
        return None

    gt = a * ap + k * ap * ap - (k + 1) * a * app
    gf = bm * b + r * b * b - k * bm * bp
    reserve_t_numerator = (
        a * a + k * ap * ap - (k + 1) * a * app
    )
    reserve_f_numerator = (
        bm * bm + r * b * b - k * bm * bp
    )
    lower_defect = max(0, a * bp - b * ap)
    upper_defect = max(0, bm * ap - a * b)
    lc_defect = max(0, bm * bp - b * b)
    direct_descent = b <= bm and ap <= a

    left = (
        2 * k * bm * bm * b * gt
        - r * a * ap * bm * gf
    )
    lower_payment = (
        2 * k * r * a * bm * bm * lower_defect
    )
    upper_payment = 2 * k * k * b * upper_defect**2
    lc_payment = 2 * k * a * bm * b * lc_defect
    right = lower_payment + upper_payment + lc_payment
    margin = left - right
    negative_cross_reserve_cascade_cleared = (
        2 * k * b * bm * reserve_t_numerator
        - a
        * (r * ap - b * (r + 2))
        * reserve_f_numerator
    )
    terminal_square_reserve_cleared = (
        bm * (a + bm) * reserve_t_numerator
        - k * upper_defect**2
    )
    full_square_reserve_cleared = (
        bm * bm * reserve_t_numerator
        - k * upper_defect**2
    )
    upper_unit_cross_cleared = a * bm - k * upper_defect
    terminal_ordered_lc_cleared = (
        reserve_t_numerator - a * a
    )
    reserve_cascade_after_square_cleared = (
        (a + bm) * negative_cross_reserve_cascade_cleared
        - 2 * k * k * b * upper_defect**2
    )
    shifted_base_cleared = (
        upper_defect * (b * (r + 2) + bm * r)
        + b * (r + 2) * (a + bm) * (b - bm)
        - 2 * k * b * lc_defect
    )
    square_paid_linear_cascade_cleared = (
        2 * k * b * bm * reserve_t_numerator
        - (a + bm)
        * (r * ap - b * (r + 2))
        * reserve_f_numerator
        + (a + bm) * shifted_base_cleared
    )
    ncl_absorption_cleared = (
        reserve_cascade_after_square_cleared
        + a * (a + bm) * shifted_base_cleared
    )
    ncl_absorption_ratio = None
    if (
        shifted_base_cleared < 0
        and reserve_cascade_after_square_cleared > 0
    ):
        ncl_absorption_ratio = float(
            Fraction(
                -a * (a + bm) * shifted_base_cleared,
                reserve_cascade_after_square_cleared,
            )
        )
    unit_paid_linear_cascade_numerator = 0
    if upper_defect > 0:
        u_scalar = Fraction(r * b, bm)
        v_scalar = Fraction(k * ap, a)
        s_scalar = Fraction(b, a)
        reserve_t_scalar = Fraction(
            reserve_t_numerator, a * a
        )
        reserve_f_scalar = Fraction(
            reserve_f_numerator, bm * bm
        )
        coupling_scalar = (
            r * v_scalar - k * s_scalar * (r + 2)
        )
        delta_scalar = Fraction(k * lc_defect, bm * b)
        unit_paid_linear_cascade = (
            2 * k * reserve_t_scalar
            - coupling_scalar * reserve_f_scalar / u_scalar
            + k
            * (r + 2)
            * (u_scalar - r)
            * (Fraction(1, r) + s_scalar / u_scalar)
            - 2 * k * s_scalar * delta_scalar
        )
        unit_paid_linear_cascade_numerator = (
            unit_paid_linear_cascade.numerator
        )

    if upper_defect == 0:
        split_branch = "z_nonnegative_CL"
        split_left = 2 * k * bm * b * gt - r * a * ap * gf
        split_right = 2 * k * r * a * bm * lower_defect
        split_margin = split_left - split_right
    else:
        split_branch = "z_negative_NCL"
        split_left = (
            (a + bm)
            * (
                left
                + a * bm * b * (r + 2) * gf
                - 2 * k * a * bm * b * lc_defect
            )
        )
        split_right = 2 * k * k * bm * b * upper_defect**2
        split_margin = split_left - split_right
        assert split_margin == bm * ncl_absorption_cleared

    scale = max(abs(left), abs(right), 1)
    shift = max(0, scale.bit_length() - 53)
    relative = (margin >> shift) / (scale >> shift)
    return {
        "margin": margin,
        "relative_margin": relative,
        "left": left,
        "right": right,
        "G_T": gt,
        "G_F": gf,
        "D": lower_defect,
        "U": upper_defect,
        "L": lc_defect,
        "R_T_numerator": reserve_t_numerator,
        "R_F_numerator": reserve_f_numerator,
        "negative_cross_reserve_cascade_cleared": (
            negative_cross_reserve_cascade_cleared
        ),
        "terminal_square_reserve_cleared": (
            terminal_square_reserve_cleared
        ),
        "full_square_reserve_cleared": (
            full_square_reserve_cleared
        ),
        "upper_unit_cross_cleared": upper_unit_cross_cleared,
        "terminal_ordered_lc_cleared": (
            terminal_ordered_lc_cleared
        ),
        "reserve_cascade_after_square_cleared": (
            reserve_cascade_after_square_cleared
        ),
        "shifted_base_cleared": shifted_base_cleared,
        "ncl_absorption_cleared": ncl_absorption_cleared,
        "square_paid_linear_cascade_cleared": (
            square_paid_linear_cascade_cleared
        ),
        "unit_paid_linear_cascade_cleared": (
            unit_paid_linear_cascade_numerator
        ),
        "ncl_absorption_ratio": ncl_absorption_ratio,
        "direct_descent": direct_descent,
        "live_C12_required": not direct_descent,
        "payments_nonzero": {
            "D": lower_defect > 0,
            "U": upper_defect > 0,
            "L": lc_defect > 0,
        },
        "split_branch": split_branch,
        "split_margin": split_margin,
        "split_left": split_left,
        "split_right": split_right,
    }


def update_summary(
    summary: dict,
    data: dict,
    witness: dict,
    stop_on_gbcl_failure: bool = True,
) -> bool:
    summary["checks"] += 1
    for name, nonzero in data["payments_nonzero"].items():
        if nonzero:
            summary["nonzero_defect_counts"][name] += 1
    if (
        summary["minimum_relative_margin"] is None
        or data["relative_margin"]
        < summary["minimum_relative_margin"]
    ):
        summary["minimum_relative_margin"] = data["relative_margin"]
        summary["minimum_witness"] = witness | {
            key: value
            for key, value in data.items()
            if key
            not in {
                "margin",
                "left",
                "right",
                "split_margin",
                "split_left",
                "split_right",
            }
        } | {
            "margin_sign": (
                1
                if data["margin"] > 0
                else (-1 if data["margin"] < 0 else 0)
            ),
            "margin_decimal_digits": len(str(abs(data["margin"]))),
        }
    split_scale = max(
        abs(data["split_left"]), abs(data["split_right"]), 1
    )
    split_shift = max(0, split_scale.bit_length() - 53)
    split_relative = (
        (data["split_margin"] >> split_shift)
        / (split_scale >> split_shift)
    )
    branch_summary = summary["split_branches"][data["split_branch"]]
    branch_summary["checks"] += 1
    if data["live_C12_required"]:
        summary["live_split_checks"] += 1
        live_branch = summary["live_split_branches"][
            data["split_branch"]
        ]
        live_branch["checks"] += 1
        if data["split_margin"] < 0:
            live_branch["failures"] += 1
            if live_branch["first_failure"] is None:
                live_branch["first_failure"] = witness | {
                    "margin": str(data["split_margin"]),
                    "left": str(data["split_left"]),
                    "right": str(data["split_right"]),
                }
            if summary["first_live_split_failure"] is None:
                summary["first_live_split_failure"] = (
                    live_branch["first_failure"]
                    | {"branch": data["split_branch"]}
                )
    if data["split_branch"] == "z_negative_NCL":
        for candidate_name, data_key in (
            (
                "negative_cross_reserve_cascade",
                "negative_cross_reserve_cascade_cleared",
            ),
            (
                "terminal_square_reserve",
                "terminal_square_reserve_cleared",
            ),
            (
                "full_square_reserve",
                "full_square_reserve_cleared",
            ),
            (
                "upper_unit_cross",
                "upper_unit_cross_cleared",
            ),
            (
                "terminal_ordered_lc",
                "terminal_ordered_lc_cleared",
            ),
            (
                "reserve_cascade_after_square",
                "reserve_cascade_after_square_cleared",
            ),
            (
                "shifted_base",
                "shifted_base_cleared",
            ),
            (
                "square_paid_linear_cascade",
                "square_paid_linear_cascade_cleared",
            ),
            (
                "unit_paid_linear_cascade",
                "unit_paid_linear_cascade_cleared",
            ),
        ):
            value = data[data_key]
            candidate = branch_summary["candidate_inequalities"][
                candidate_name
            ]
            if value < 0:
                candidate["failures"] += 1
                if candidate["first_failure"] is None:
                    candidate["first_failure"] = witness | {
                        "cleared_margin": str(value)
                    }
                if data["live_C12_required"]:
                    live_candidate = branch_summary[
                        "live_candidate_inequalities"
                    ][candidate_name]
                    live_candidate["failures"] += 1
                    if live_candidate["first_failure"] is None:
                        live_candidate["first_failure"] = witness | {
                            "cleared_margin": str(value)
                        }
        if (
            data["ncl_absorption_ratio"] is not None
            and (
                branch_summary["maximum_absorption_ratio"] is None
                or data["ncl_absorption_ratio"]
                > branch_summary["maximum_absorption_ratio"]
            )
        ):
            branch_summary["maximum_absorption_ratio"] = data[
                "ncl_absorption_ratio"
            ]
            branch_summary["maximum_absorption_witness"] = (
                witness
                | {
                    "absorption_ratio": data[
                        "ncl_absorption_ratio"
                    ]
                }
            )
    if (
        branch_summary["minimum_relative_margin"] is None
        or split_relative < branch_summary["minimum_relative_margin"]
    ):
        branch_summary["minimum_relative_margin"] = split_relative
        branch_summary["minimum_witness"] = witness | {
            "relative_margin": split_relative,
            "margin_sign": (
                1
                if data["split_margin"] > 0
                else (-1 if data["split_margin"] < 0 else 0)
            ),
        }
    if (
        summary["minimum_split_relative_margin"] is None
        or split_relative
        < summary["minimum_split_relative_margin"]
    ):
        summary["minimum_split_relative_margin"] = split_relative
        summary["minimum_split_witness"] = witness | {
            "branch": data["split_branch"],
            "relative_margin": split_relative,
            "margin_sign": (
                1
                if data["split_margin"] > 0
                else (-1 if data["split_margin"] < 0 else 0)
            ),
        }
    if (
        data["split_margin"] < 0
        and summary["first_split_failure"] is None
    ):
        summary["first_split_failure"] = witness | {
            "branch": data["split_branch"],
            "margin": str(data["split_margin"]),
            "left": str(data["split_left"]),
            "right": str(data["split_right"]),
        }
    if (
        data["split_margin"] < 0
        and branch_summary["first_failure"] is None
    ):
        branch_summary["first_failure"] = witness | {
            "margin": str(data["split_margin"]),
            "left": str(data["split_left"]),
            "right": str(data["split_right"]),
        }
    if data["margin"] < 0 and summary["first_failure"] is None:
        summary["first_failure"] = witness | {
            key: str(value)
            if key in {"margin", "left", "right"}
            else value
            for key, value in data.items()
        }
        if stop_on_gbcl_failure:
            return False
    return True


def new_summary() -> dict:
    return {
        "checks": 0,
        "nonzero_defect_counts": {"D": 0, "U": 0, "L": 0},
        "minimum_relative_margin": None,
        "minimum_witness": None,
        "first_failure": None,
        "minimum_split_relative_margin": None,
        "minimum_split_witness": None,
        "first_split_failure": None,
        "live_split_checks": 0,
        "first_live_split_failure": None,
        "live_split_branches": {
            "z_nonnegative_CL": {
                "checks": 0,
                "failures": 0,
                "first_failure": None,
            },
            "z_negative_NCL": {
                "checks": 0,
                "failures": 0,
                "first_failure": None,
            },
        },
        "split_branches": {
            "z_nonnegative_CL": {
                "checks": 0,
                "minimum_relative_margin": None,
                "minimum_witness": None,
                "first_failure": None,
            },
            "z_negative_NCL": {
                "checks": 0,
                "minimum_relative_margin": None,
                "minimum_witness": None,
                "first_failure": None,
                "maximum_absorption_ratio": None,
                "maximum_absorption_witness": None,
                "live_candidate_inequalities": {
                    "negative_cross_reserve_cascade": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "terminal_square_reserve": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "full_square_reserve": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "upper_unit_cross": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "terminal_ordered_lc": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "reserve_cascade_after_square": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "shifted_base": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "square_paid_linear_cascade": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "unit_paid_linear_cascade": {
                        "failures": 0,
                        "first_failure": None,
                    },
                },
                "candidate_inequalities": {
                    "negative_cross_reserve_cascade": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "terminal_square_reserve": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "full_square_reserve": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "upper_unit_cross": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "terminal_ordered_lc": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "reserve_cascade_after_square": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "shifted_base": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "square_paid_linear_cascade": {
                        "failures": 0,
                        "first_failure": None,
                    },
                    "unit_paid_linear_cascade": {
                        "failures": 0,
                        "first_failure": None,
                    },
                },
            },
        },
    }


def exhaustive_small(
    max_order: int,
    min_rank: int,
    all_ranks: bool,
    stop_on_gbcl_failure: bool,
) -> dict:
    summary = new_summary()
    summary["trees"] = 0
    summary["terminal_pairs"] = 0
    for order in range(2, max_order + 1):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            summary["trees"] += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            alpha = len(full) - 1
            cutoff = ceil_div(alpha * (order - 1), alpha + order)
            rank_stop = alpha if all_ranks else cutoff
            seen_supports = set()
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree[leaf]))
                if support in seen_supports:
                    continue
                nonleaf_neighbors = sum(
                    tree.degree(neighbor) > 1
                    for neighbor in tree[support]
                )
                if nonleaf_neighbors > 1:
                    continue
                seen_supports.add(support)
                summary["terminal_pairs"] += 1
                t_mask = full_mask ^ (1 << engine.position[leaf])
                f_mask = t_mask ^ (1 << engine.position[support])
                t_poly = engine.polynomial(t_mask)
                f_poly = engine.polynomial(f_mask)
                for k in range(min_rank, rank_stop):
                    data = gbcl_data(t_poly, f_poly, k)
                    if data is None:
                        continue
                    witness = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": graph6(tree),
                        "leaf": leaf,
                        "support": support,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "rank_k": k,
                    }
                    if not update_summary(
                        summary,
                        data,
                        witness,
                        stop_on_gbcl_failure,
                    ):
                        summary["passed"] = False
                        return summary
    summary["passed"] = summary["first_failure"] is None
    summary["split_passed"] = summary["first_split_failure"] is None
    summary["live_split_passed"] = (
        summary["first_live_split_failure"] is None
    )
    return summary


def patternboost_scan(
    corpus_path: Path,
    records_limit: int,
    supports_limit: int,
    min_rank: int,
    seed: int,
    all_ranks: bool,
    stop_on_gbcl_failure: bool,
) -> dict:
    source = json.loads(corpus_path.read_text(encoding="utf-8"))
    records = source["records"][:records_limit]
    rng = random.Random(seed)
    summary = new_summary()
    summary["records"] = len(records)
    summary["terminal_pairs"] = 0

    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(
            record["prufer_code_one_based"]
        )
        order = len(adjacency)
        full = fmpz_poly(record["polynomial"])
        alpha = full.degree()
        cutoff = ceil_div(alpha * (order - 1), alpha + order)
        rank_stop = alpha if all_ranks else cutoff
        terminal_pairs = []
        for support, neighbors in enumerate(adjacency):
            leaves = [
                neighbor
                for neighbor in neighbors
                if len(adjacency[neighbor]) == 1
            ]
            nonleaf_count = sum(
                len(adjacency[neighbor]) > 1 for neighbor in neighbors
            )
            if leaves and nonleaf_count <= 1:
                terminal_pairs.append((support, leaves[0]))
        selected = (
            terminal_pairs
            if len(terminal_pairs) <= supports_limit
            else rng.sample(terminal_pairs, supports_limit)
        )
        for support, leaf in selected:
            summary["terminal_pairs"] += 1
            t_poly = tree_polynomial(adjacency, deleted=leaf)
            delete_support = tree_polynomial(
                adjacency, deleted=support
            )
            f_poly = delete_support // fmpz_poly([1, 1])
            assert full == t_poly + fmpz_poly([0, 1]) * f_poly
            for k in range(min_rank, rank_stop):
                data = gbcl_data(t_poly, f_poly, k)
                if data is None:
                    continue
                witness = {
                    "record_index": record_index,
                    "first_line": record["first_line"],
                    "support": support,
                    "leaf": leaf,
                    "order": order,
                    "alpha": alpha,
                    "cutoff": cutoff,
                    "rank_k": k,
                    "prufer_code_one_based": (
                        record["prufer_code_one_based"]
                    ),
                }
                if not update_summary(
                    summary,
                    data,
                    witness,
                    stop_on_gbcl_failure,
                ):
                    summary["passed"] = False
                    return summary
    summary["passed"] = summary["first_failure"] is None
    summary["split_passed"] = summary["first_split_failure"] is None
    summary["live_split_passed"] = (
        summary["first_live_split_failure"] is None
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-small-order", type=int, default=16)
    parser.add_argument("--records", type=int, default=10_000)
    parser.add_argument("--supports", type=int, default=3)
    parser.add_argument("--min-rank", type=int, default=7)
    parser.add_argument("--all-ranks", action="store_true")
    parser.add_argument(
        "--scan-split-through-gbcl-failures",
        action="store_true",
        help=(
            "continue after a GBCL failure so the weaker branchwise "
            "CL+/NCL package is audited independently"
        ),
    )
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "generalized_three_defect_gbcl_20260729.json"
        ),
    )
    args = parser.parse_args()
    report = {
        "status": "RUNNING",
        "claim": (
            "generalized three-defect GBCL coefficient inequality"
        ),
        "small_trees": exhaustive_small(
            args.max_small_order,
            args.min_rank,
            args.all_ranks,
            not args.scan_split_through_gbcl_failures,
        ),
        "patternboost": patternboost_scan(
            args.corpus,
            args.records,
            args.supports,
            args.min_rank,
            args.seed,
            args.all_ranks,
            not args.scan_split_through_gbcl_failures,
        ),
    }
    report["status"] = (
        "PASS_FINITE_AUDIT_NOT_PROOF"
        if report["small_trees"]["passed"]
        and report["patternboost"]["passed"]
        else "COUNTEREXAMPLE_TO_GBCL"
    )
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
