#!/usr/bin/env python3
"""Verify the one-deep GSB/deletion compensation identity and sample."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp
from flint import fmpz_poly

from patternboost_corpus_audit import adjacency_from_prufer
from random_leaf_gsb_local_payment import coeff, tree_polynomial


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])
ONE_PLUS_X = fmpz_poly([1, 1])


def symbolic_identity() -> bool:
    k = sp.symbols("k", positive=True, integer=True)
    a, c, cp, em2, em1, e = sp.symbols(
        "a c cp em2 em1 e"
    )
    delta = c**2 - a * cp + c * (e + em1) - cp * (em1 + em2)
    gsb = k * c**2 + a * c - (k + 1) * a * cp
    drift = (
        (k + 1) * a * (c + e + em1)
        - (k * c + a) * (a + em1 + em2)
    )
    compensation = (
        sp.expand(
            (k + 1) * a * delta
            - c * drift
            - (a + em1 + em2) * gsb
        )
        == 0
    )
    h_previous = a + em1 + em2
    h_current = c + e + em1
    half_margin = 2 * c * drift + h_previous * gsb
    two_step_scaled = (
        2 * (k + 1) * a * c * h_current
        - (
            k * c**2
            + (k + 1) * a * cp
            + a * c
        )
        * h_previous
    )
    return compensation and sp.expand(half_margin - two_step_scaled) == 0


def multipartite_negative_control() -> dict:
    p = [1, 9, 15, 20, 15, 6, 1]
    e = [1, 8, 10, 10, 5, 1]
    k = 3
    drift = (
        (k + 1) * p[k - 1] * (p[k] + e[k] + e[k - 1])
        - (k * p[k] + p[k - 1])
        * (p[k - 1] + e[k - 1] + e[k - 2])
    )
    # A sharper control shows that half-payment is not a formal
    # consequence of nonnegative GSB plus PIRD.  Take the complete
    # multipartite graph with parts 5,1,1,1,1 and add a universal
    # root.  Then C is the multipartite independence polynomial and
    # D=1.  At k=2 the terminal polynomial has a plateau, GSB is
    # positive, and PIRD holds with equality, but half-payment fails.
    c2 = [1, 9, 10, 10, 5, 1]
    d2 = [1]
    k2 = 2
    cm2, cc2, cp2 = c2[k2 - 1], c2[k2], c2[k2 + 1]
    dm22, dm12, dd2 = 1, 0, 0
    drift2 = (
        (k2 + 1) * cm2 * (cc2 + dd2 + dm12)
        - (k2 * cc2 + cm2) * (cm2 + dm12 + dm22)
    )
    gsb2 = (
        k2 * cc2 * cc2
        + cm2 * cc2
        - (k2 + 1) * cm2 * cp2
    )
    minor2 = (
        cc2 * cc2
        - cm2 * cp2
        + cc2 * (dd2 + dm12)
        - cp2 * (dm12 + dm22)
    )
    half2 = 2 * cc2 * drift2 + (cm2 + dm12 + dm22) * gsb2
    stronger = {
        "parts": [5, 1, 1, 1, 1],
        "k": k2,
        "C": c2,
        "D": d2,
        "weighted_deletion_drift": drift2,
        "gsb": gsb2,
        "pird_minor": minor2,
        "half_margin": half2,
        "passed": (
            drift2 == -20
            and gsb2 == 20
            and minor2 == 0
            and half2 == -200
        ),
    }
    return {
        "parts": [6, 1, 1, 1],
        "k": k,
        "P": p,
        "E": e,
        "weighted_deletion_drift": drift,
        "half_payment_not_formal": stronger,
        "passed": drift == -75 and stronger["passed"],
    }


def finite_sample(
    corpus_path: Path,
    samples: int,
    seed: int,
    max_side_stars: int,
    max_star_leaves: int,
    minimum_rank: int,
) -> dict:
    source = json.loads(corpus_path.read_text(encoding="utf-8"))
    records = source["records"]
    rng = random.Random(seed)

    checks = 0
    negative_drift = 0
    negative_gsb = 0
    negative_minor = 0
    half_payment_failures = 0
    maximum_payment = None
    maximum_item = None
    first_failure = None
    minimum_v_minus_u = None
    minimum_v_minus_u_item = None
    v_below_u = 0
    hard_w_above_u_minus_one = 0
    maximum_negative_drift_w_minus_u = None
    maximum_negative_drift_w_minus_u_item = None
    minimum_v_minus_w_minus_one = None
    minimum_v_minus_w_minus_one_item = None
    v_below_w_plus_one = 0

    for sample in range(samples):
        record_index = rng.randrange(len(records))
        record = records[record_index]
        adjacency = adjacency_from_prufer(
            record["prufer_code_one_based"]
        )
        root = rng.randrange(len(adjacency))
        inward = fmpz_poly(record["polynomial"])
        inward_deletion = tree_polynomial(adjacency, deleted=root)

        star_block = ONE
        leaf_total = 0
        branches = []
        for _ in range(rng.randrange(max_side_stars + 1)):
            leaves = rng.randrange(max_star_leaves + 1)
            branches.append(leaves)
            star_block *= ONE_PLUS_X**leaves + X
            leaf_total += leaves
        link_block = ONE_PLUS_X**leaf_total

        c_poly = inward * star_block
        d_poly = inward_deletion * link_block
        b_poly = ONE_PLUS_X * (c_poly + X * d_poly)

        for k in range(minimum_rank, c_poly.degree() + 1):
            if int(coeff(b_poly, k + 1)) < int(coeff(b_poly, k)):
                continue

            cm = int(coeff(c_poly, k - 1))
            c = int(coeff(c_poly, k))
            cp = int(coeff(c_poly, k + 1))
            dm2 = int(coeff(d_poly, k - 2))
            dm1 = int(coeff(d_poly, k - 1))
            d = int(coeff(d_poly, k))
            if cm == 0 or c == 0:
                continue

            drift = (
                (k + 1) * cm * (c + d + dm1)
                - (k * c + cm) * (cm + dm1 + dm2)
            )
            gsb = k * c * c + cm * c - (k + 1) * cm * cp
            minor = (
                c * c
                - cm * cp
                + c * (d + dm1)
                - cp * (dm1 + dm2)
            )
            compensated = c * drift + (cm + dm1 + dm2) * gsb
            identity_rhs = (k + 1) * cm * minor
            if compensated != identity_rhs:
                raise AssertionError("exact identity failed")

            half_margin = 2 * c * drift + (cm + dm1 + dm2) * gsb
            u_mean = Fraction(k * c, cm)
            w_mean = Fraction((k + 1) * cp, c)
            v_mean = Fraction(
                (k + 1) * (c + d + dm1),
                cm + dm1 + dm2,
            )
            v_minus_u = v_mean - u_mean
            v_minus_w_minus_one = v_mean - w_mean - 1
            checks += 1
            if gsb < 0:
                negative_gsb += 1
            if minor < 0:
                negative_minor += 1
            if half_margin < 0:
                half_payment_failures += 1
                if first_failure is None:
                    first_failure = {
                        "sample": sample,
                        "record_index": record_index,
                        "root": root,
                        "k": k,
                        "branches": branches,
                        "drift": str(drift),
                        "gsb": str(gsb),
                        "minor": str(minor),
                        "half_margin": str(half_margin),
                    }
            if (
                minimum_v_minus_u is None
                or v_minus_u < minimum_v_minus_u
            ):
                minimum_v_minus_u = v_minus_u
                minimum_v_minus_u_item = {
                    "sample": sample,
                    "record_index": record_index,
                    "root": root,
                    "k": k,
                    "branches": branches,
                    "numerator": str(v_minus_u.numerator),
                    "denominator": str(v_minus_u.denominator),
                    "decimal": float(v_minus_u),
                    "w_minus_u": float(w_mean - u_mean),
                    "drift_negative": drift < 0,
                }
            if v_mean < u_mean:
                v_below_u += 1
            if v_mean < w_mean + 1:
                v_below_w_plus_one += 1
            if (
                minimum_v_minus_w_minus_one is None
                or v_minus_w_minus_one
                < minimum_v_minus_w_minus_one
            ):
                minimum_v_minus_w_minus_one = (
                    v_minus_w_minus_one
                )
                minimum_v_minus_w_minus_one_item = {
                    "sample": sample,
                    "record_index": record_index,
                    "root": root,
                    "k": k,
                    "branches": branches,
                    "numerator": str(
                        v_minus_w_minus_one.numerator
                    ),
                    "denominator": str(
                        v_minus_w_minus_one.denominator
                    ),
                    "decimal": float(v_minus_w_minus_one),
                    "v_minus_u": float(v_minus_u),
                }
            if drift < 0 and w_mean > u_mean - 1:
                hard_w_above_u_minus_one += 1
            if drift < 0:
                w_minus_u = w_mean - u_mean
                if (
                    maximum_negative_drift_w_minus_u is None
                    or w_minus_u
                    > maximum_negative_drift_w_minus_u
                ):
                    maximum_negative_drift_w_minus_u = w_minus_u
                    maximum_negative_drift_w_minus_u_item = {
                        "sample": sample,
                        "record_index": record_index,
                        "root": root,
                        "k": k,
                        "branches": branches,
                        "numerator": str(w_minus_u.numerator),
                        "denominator": str(w_minus_u.denominator),
                        "decimal": float(w_minus_u),
                        "v_minus_u": float(v_minus_u),
                    }
            if drift < 0:
                negative_drift += 1
                denominator = (cm + dm1 + dm2) * gsb
                if denominator > 0:
                    payment = Fraction(-c * drift, denominator)
                    if (
                        maximum_payment is None
                        or payment > maximum_payment
                    ):
                        maximum_payment = payment
                        maximum_item = {
                            "sample": sample,
                            "record_index": record_index,
                            "root": root,
                            "k": k,
                            "branches": branches,
                            "payment": {
                                "numerator": payment.numerator,
                                "denominator": payment.denominator,
                                "decimal": float(payment),
                            },
                        }

    return {
        "samples": samples,
        "seed": seed,
        "minimum_rank": minimum_rank,
        "max_side_stars": max_side_stars,
        "max_star_leaves": max_star_leaves,
        "checks": checks,
        "negative_weighted_deletion_drift": negative_drift,
        "negative_gsb": negative_gsb,
        "negative_pird_minor": negative_minor,
        "half_payment_failures": half_payment_failures,
        "maximum_payment": maximum_item,
        "minimum_v_minus_u": minimum_v_minus_u_item,
        "v_below_u": v_below_u,
        "v_below_w_plus_one": v_below_w_plus_one,
        "minimum_v_minus_w_minus_one": (
            minimum_v_minus_w_minus_one_item
        ),
        "negative_drift_with_w_above_u_minus_one": (
            hard_w_above_u_minus_one
        ),
        "maximum_negative_drift_w_minus_u": (
            maximum_negative_drift_w_minus_u_item
        ),
        "first_failure": first_failure,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--samples", type=int, default=5_000)
    parser.add_argument("--seed", type=int, default=993_20260732)
    parser.add_argument("--max-side-stars", type=int, default=6)
    parser.add_argument("--max-star-leaves", type=int, default=30)
    parser.add_argument("--minimum-rank", type=int, default=6)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "one_deep_gsb_deletion_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic = symbolic_identity()
    negative_control = multipartite_negative_control()
    sample = finite_sample(
        args.corpus,
        args.samples,
        args.seed,
        args.max_side_stars,
        args.max_star_leaves,
        args.minimum_rank,
    )
    passed = (
        symbolic
        and negative_control["passed"]
        and sample["negative_gsb"] == 0
        and sample["negative_pird_minor"] == 0
        and sample["half_payment_failures"] == 0
    )
    report = {
        "status": "PASS_NOT_PROOF" if passed else "FAIL",
        "symbolic_identity": symbolic,
        "negative_control": negative_control,
        "finite_sample": sample,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
