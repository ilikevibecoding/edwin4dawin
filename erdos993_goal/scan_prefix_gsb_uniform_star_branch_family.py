#!/usr/bin/env python3
"""Exact prefix-GSB leaf-monotonicity scan on a large height-three family.

T(ell,s,m) has a root r adjacent to ell leaves and to s star centres,
each of which has m outer leaves.  Its independence polynomial is

  P = (1+x)^ell ((1+x)^m+x)^s + x(1+x)^(ms).

We test leaf attachment at each of the four vertex orbits: root, root
leaf, star centre, and outer leaf.  Polynomial arithmetic uses FLINT.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from flint import fmpz_poly


X = fmpz_poly([0, 1])
ONE_PLUS_X = fmpz_poly([1, 1])


def coeff(poly: fmpz_poly, k: int):
    return poly[k] if 0 <= k <= poly.degree() else 0


def reserve(poly: fmpz_poly, k: int):
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def first_bad_delta(old: fmpz_poly, deletion: fmpz_poly):
    new = old + X * deletion
    alpha = new.degree()
    cutoff = (2 * alpha + 1) // 3
    minimum = None
    for k in range(1, cutoff):
        delta = reserve(new, k) - reserve(old, k)
        if minimum is None or delta < minimum[0]:
            minimum = (delta, k)
        if delta < 0:
            return {
                "rank": k,
                "old_alpha": old.degree(),
                "new_alpha": alpha,
                "new_cutoff": cutoff,
                "old_reserve": int(reserve(old, k)),
                "new_reserve": int(reserve(new, k)),
                "delta": int(delta),
                "old": [int(v) for v in old],
                "deletion": [int(v) for v in deletion],
                "new": [int(v) for v in new],
            }, minimum
    return None, minimum


def first_bad_local_payment(old: fmpz_poly, deletion: fmpz_poly):
    """Test the numerator of the leaf-mixture local payment inequality."""
    new = old + X * deletion
    cutoff = (2 * new.degree() + 1) // 3
    for k in range(2, cutoff):
        r = k - 1
        a = coeff(old, r)
        ap = coeff(old, r + 1)
        bm = coeff(deletion, r - 1)
        b = coeff(deletion, r)
        bp = coeff(deletion, r + 1)
        reserve_numerator = (
            a * b
            + b * b
            + 2 * (r + 1) * (ap * b - a * bp)
        )
        mean_difference_numerator = bm * ((r + 1) * ap + b) - r * b * a
        payment_numerator = (
            reserve_numerator * bm * (a + bm)
            - mean_difference_numerator * mean_difference_numerator
        )
        if payment_numerator < 0:
            return {
                "rank_r": r,
                "gsb_rank_k": k,
                "new_cutoff": cutoff,
                "payment_numerator": int(payment_numerator),
                "reserve_numerator": int(reserve_numerator),
                "mean_difference_numerator": int(mean_difference_numerator),
            }
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ell-max", type=int, default=3)
    ap.add_argument("--s-max", type=int, default=100)
    ap.add_argument("--m-max", type=int, default=20)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    started = time.time()
    checked_instances = 0
    checked_attachments = 0
    global_minimum = None
    failure = None
    local_payment_failure = None

    for m in range(1, args.m_max + 1):
        leaf_block = ONE_PLUS_X**m
        star = leaf_block + X
        smaller_star = ONE_PLUS_X ** (m - 1) + X
        star_power = fmpz_poly([1])
        leaf_power = fmpz_poly([1])
        for s in range(1, args.s_max + 1):
            previous_star_power = star_power
            previous_leaf_power = leaf_power
            star_power *= star
            leaf_power *= leaf_block
            for ell in range(1, args.ell_max + 1):
                checked_instances += 1
                leaf_roots = ONE_PLUS_X**ell
                old = leaf_roots * star_power + X * leaf_power

                deletions = {
                    # Delete the root itself.
                    "root": leaf_roots * star_power,
                    # Delete one of the ell pendant neighbours of the root.
                    "root_leaf": (
                        ONE_PLUS_X ** (ell - 1) * star_power + X * leaf_power
                    ),
                    # Delete one star centre; its m leaves become isolated.
                    "star_centre": (
                        ONE_PLUS_X ** (ell + m) * previous_star_power
                        + X * leaf_power
                    ),
                    # Delete one outer leaf.
                    "outer_leaf": (
                        leaf_roots * previous_star_power * smaller_star
                        + X * previous_leaf_power * (ONE_PLUS_X ** (m - 1))
                    ),
                }

                for orbit, deletion in deletions.items():
                    checked_attachments += 1
                    bad, local_minimum = first_bad_delta(old, deletion)
                    bad_payment = first_bad_local_payment(old, deletion)
                    if local_minimum is not None:
                        delta, rank = local_minimum
                        candidate = {
                            "delta": int(delta),
                            "rank": rank,
                            "ell": ell,
                            "s": s,
                            "m": m,
                            "tree_order": 1 + ell + s * (m + 1),
                            "attachment_orbit": orbit,
                        }
                        if (
                            global_minimum is None
                            or candidate["delta"] < global_minimum["delta"]
                        ):
                            global_minimum = candidate
                    if bad is not None:
                        failure = {
                            "ell": ell,
                            "s": s,
                            "m": m,
                            "tree_order": 1 + ell + s * (m + 1),
                            "attachment_orbit": orbit,
                            **bad,
                        }
                        break
                    if bad_payment is not None:
                        local_payment_failure = {
                            "ell": ell,
                            "s": s,
                            "m": m,
                            "tree_order": 1 + ell + s * (m + 1),
                            "attachment_orbit": orbit,
                            **bad_payment,
                        }
                        break
                if failure or local_payment_failure:
                    break
            if failure or local_payment_failure:
                break
        if failure or local_payment_failure:
            break
        print(f"completed m={m}", flush=True)

    payload = {
        "status": (
            "GSB_DELTA_FAILURE"
            if failure
            else "LOCAL_PAYMENT_FAILURE"
            if local_payment_failure
            else "PASS"
        ),
        "parameters": {
            "ell_max": args.ell_max,
            "s_max": args.s_max,
            "m_max": args.m_max,
        },
        "checked_instances": checked_instances,
        "checked_attachment_orbits": checked_attachments,
        "minimum_prefix_delta": global_minimum,
        "first_failure": failure,
        "first_local_payment_failure": local_payment_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
