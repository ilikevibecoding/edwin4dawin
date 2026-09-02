#!/usr/bin/env python3
"""Stress-test the two-ratio PIRD strengthening on arbitrary rooted trees.

For a tree R rooted at q, let

    C=I(R-q), D=I(R-N[q]), H=C+(1+x)D,
    B=(1+x)(C+xD).

At every operative rank B_{k+1}>=B_k, test

    v=(k+1)H_k/H_{k-1} >= u=kC_k/C_{k-1},
    v >= w+1,  w=(k+1)C_{k+1}/C_k.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly
import sympy as sp

from patternboost_corpus_audit import adjacency_from_prufer


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])
ONE_PLUS_X = fmpz_poly([1, 1])


def symbolic_identities() -> bool:
    k = sp.symbols("k", positive=True, integer=True)
    cm, c, cp, hm, h = sp.symbols("cm c cp hm h", positive=True)
    delta = c * h - cp * hm
    first_numerator = (k + 1) * cm * h - k * c * hm
    second_numerator = (
        (k + 1) * c * h - ((k + 1) * cp + c) * hm
    )
    quantitative = (k + 1) * delta - c * hm
    first_margin = first_numerator / (cm * hm)
    second_margin = second_numerator / (c * hm)
    u = k * c / cm
    w = (k + 1) * cp / c
    v = (k + 1) * h / hm
    return (
        sp.expand(second_numerator - quantitative) == 0
        and sp.factor(first_margin - (v - u)) == 0
        and sp.factor(second_margin - (v - w - 1)) == 0
        and sp.factor(
            (v - u) + (v - w - 1)
            - (2 * v - 1 - u - w)
        )
        == 0
    )


def general_graph_negative_control() -> dict:
    # Complete multipartite graph with parts 5,1,1,1,1, with a
    # universal distinguished root in the PIRD construction.
    c_values = [1, 9, 10, 10, 5, 1]
    d_values = [1]
    k = 2
    cm, c, cp = c_values[k - 1 : k + 2]
    dm2 = d_values[0]
    dm1 = 0
    d = 0
    hm = cm + dm1 + dm2
    h = c + d + dm1
    u = Fraction(k * c, cm)
    w = Fraction((k + 1) * cp, c)
    v = Fraction((k + 1) * h, hm)
    delta = c * h - cp * hm
    return {
        "C": c_values,
        "D": d_values,
        "k": k,
        "u": str(u),
        "w": str(w),
        "v": str(v),
        "pird_minor": delta,
        "v_minus_u": str(v - u),
        "v_minus_w_minus_one": str(v - w - 1),
        "passed": delta == 0 and v >= u and v < w + 1,
    }


def coeff(poly: fmpz_poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def rooted_pair(
    adjacency: list[list[int]], root: int
) -> tuple[fmpz_poly, fmpz_poly]:
    def visit(vertex: int, parent: int):
        excluded = ONE
        included_without_x = ONE
        for child in adjacency[vertex]:
            if child == parent:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded *= child_excluded + X * child_included
            included_without_x *= child_excluded
        return excluded, included_without_x

    return visit(root, -1)


def stable_float(value: Fraction) -> float:
    shift = max(
        0,
        max(
            abs(value.numerator).bit_length(),
            value.denominator.bit_length(),
        )
        - 52,
    )
    numerator = value.numerator
    sign = -1 if numerator < 0 else 1
    return sign * ((abs(numerator) >> shift) / (value.denominator >> shift))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--samples", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=993_20260737)
    parser.add_argument("--minimum-rank", type=int, default=6)
    parser.add_argument(
        "--max-extra-components",
        type=int,
        default=0,
        help="multiply C and D by this many random tree components",
    )
    parser.add_argument(
        "--all-ranks",
        action="store_true",
        help="diagnostic mode: include the nonoperative tail",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "rooted_forest_two_ratio_dominance_20260729.json"
        ),
    )
    args = parser.parse_args()

    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"]
    rng = random.Random(args.seed)

    checks = 0
    first_v_u_failure = None
    first_v_w_failure = None
    minimum_v_u = None
    minimum_v_u_item = None
    minimum_v_w = None
    minimum_v_w_item = None

    for sample in range(args.samples):
        record_index = rng.randrange(len(records))
        record = records[record_index]
        adjacency = adjacency_from_prufer(
            record["prufer_code_one_based"]
        )
        root = rng.randrange(len(adjacency))
        c_poly, d_poly = rooted_pair(adjacency, root)
        extra_components = rng.randrange(
            args.max_extra_components + 1
        )
        for _ in range(extra_components):
            extra = records[rng.randrange(len(records))]
            component = fmpz_poly(extra["polynomial"])
            c_poly *= component
            d_poly *= component
        h_poly = c_poly + ONE_PLUS_X * d_poly
        b_poly = ONE_PLUS_X * (c_poly + X * d_poly)

        for k in range(args.minimum_rank, c_poly.degree() + 1):
            cm = coeff(c_poly, k - 1)
            c = coeff(c_poly, k)
            cp = coeff(c_poly, k + 1)
            hm = coeff(h_poly, k - 1)
            h = coeff(h_poly, k)
            if cm <= 0 or c <= 0 or hm <= 0:
                continue
            if (
                not args.all_ranks
                and coeff(b_poly, k + 1) < coeff(b_poly, k)
            ):
                continue

            u = Fraction(k * c, cm)
            w = Fraction((k + 1) * cp, c)
            v = Fraction((k + 1) * h, hm)
            margin_v_u = v - u
            margin_v_w = v - w - 1
            item = {
                "sample": sample,
                "record_index": record_index,
                "source_line": record["first_line"],
                "root": root,
                "root_degree": len(adjacency[root]),
                "extra_components": extra_components,
                "k": k,
                "u": str(u),
                "w": str(w),
                "v": str(v),
            }
            checks += 1

            if minimum_v_u is None or margin_v_u < minimum_v_u:
                minimum_v_u = margin_v_u
                minimum_v_u_item = {
                    **item,
                    "margin": str(margin_v_u),
                    "decimal": stable_float(margin_v_u),
                }
            if minimum_v_w is None or margin_v_w < minimum_v_w:
                minimum_v_w = margin_v_w
                minimum_v_w_item = {
                    **item,
                    "margin": str(margin_v_w),
                    "decimal": stable_float(margin_v_w),
                }
            if margin_v_u < 0 and first_v_u_failure is None:
                first_v_u_failure = {
                    **item,
                    "margin": str(margin_v_u),
                }
            if margin_v_w < 0 and first_v_w_failure is None:
                first_v_w_failure = {
                    **item,
                    "margin": str(margin_v_w),
                }

    passed = first_v_u_failure is None and first_v_w_failure is None
    symbolic = symbolic_identities()
    negative_control = general_graph_negative_control()
    passed = passed and symbolic and negative_control["passed"]
    report = {
        "status": "PASS_NOT_PROOF" if passed else "COUNTEREXAMPLE",
        "symbolic_identities": symbolic,
        "general_graph_negative_control": negative_control,
        "samples": args.samples,
        "seed": args.seed,
        "minimum_rank": args.minimum_rank,
        "max_extra_components": args.max_extra_components,
        "all_ranks": args.all_ranks,
        "operative_checks": checks,
        "minimum_v_minus_u": minimum_v_u_item,
        "minimum_v_minus_w_minus_one": minimum_v_w_item,
        "first_v_below_u": first_v_u_failure,
        "first_v_below_w_plus_one": first_v_w_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
