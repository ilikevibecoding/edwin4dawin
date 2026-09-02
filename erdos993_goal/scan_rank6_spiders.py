#!/usr/bin/env python3
"""Scan the strong rank-6 rooted inequality on all integer-arm spiders."""

from __future__ import annotations

import argparse
from math import comb


def coefficient(poly, rank):
    return poly[rank] if rank < len(poly) else 0


def multiply(left, right, cutoff=5):
    out = [0] * min(len(left) + len(right) - 1, cutoff + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= cutoff:
                out[i + j] += a * b
    return tuple(out)


def add(left, right):
    out = [0] * max(len(left), len(right))
    for i in range(len(out)):
        out[i] = coefficient(left, i) + coefficient(right, i)
    return tuple(out)


def path_polynomial(order, cutoff=5):
    return tuple(
        comb(order - rank + 1, rank)
        for rank in range(min(cutoff, (order + 1) // 2) + 1)
    )


def spider_polynomial(arms):
    absent = (1,)
    present_link = (1,)
    for length in arms:
        absent = multiply(absent, path_polynomial(length))
        present_link = multiply(
            present_link, path_polynomial(length - 1)
        )
    return add(absent, (0,) + present_link)


def partitions(total, minimum=1):
    if total == 0:
        yield ()
        return
    for first in range(minimum, total + 1):
        for rest in partitions(total - first, first):
            yield (first,) + rest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=12)
    parser.add_argument("--maximum-order", type=int, default=30)
    parser.add_argument("--increments", action="store_true")
    args = parser.parse_args()
    for order in range(args.minimum_order, args.maximum_order + 1):
        minimum = None
        witness = None
        spiders = 0
        rooted = 0
        minimum_increment = None
        increment_witness = None
        by_arms = {}
        for arms in partitions(order - 1):
            if len(arms) < 3:
                continue
            spiders += 1
            whole = spider_polynomial(arms)
            d, e = coefficient(whole, 4), coefficient(whole, 5)
            for length in sorted(set(arms)):
                rooted += 1
                shortened = list(arms)
                shortened.remove(length)
                if length > 1:
                    shortened.append(length - 1)
                shortened.sort()
                deleted = spider_polynomial(tuple(shortened))
                h, k = (
                    coefficient(deleted, 4),
                    coefficient(deleted, 5),
                )
                value = d * (2 * e + d) - 24 * (e * h - d * k)
                previous_by_arms = by_arms.get(len(arms))
                if previous_by_arms is None or value < previous_by_arms:
                    by_arms[len(arms)] = value
                if minimum is None or value < minimum:
                    minimum = value
                    witness = (arms, length, (d, e, h, k))
                if args.increments:
                    for extended_length in sorted(set(arms)):
                        extended = list(arms)
                        extended.remove(extended_length)
                        extended.append(extended_length + 1)
                        extended.sort()
                        root_lengths = (
                            {length, length + 1}
                            if (
                                extended_length == length
                                and arms.count(length) >= 2
                            )
                            else {
                                length + 1
                                if extended_length == length
                                else length
                            }
                        )
                        for extended_root_length in root_lengths:
                            extended_whole = spider_polynomial(
                                tuple(extended)
                            )
                            shortened_extended = list(extended)
                            shortened_extended.remove(
                                extended_root_length
                            )
                            if extended_root_length > 1:
                                shortened_extended.append(
                                    extended_root_length - 1
                                )
                            shortened_extended.sort()
                            extended_deleted = spider_polynomial(
                                tuple(shortened_extended)
                            )
                            ed, ee = (
                                coefficient(extended_whole, 4),
                                coefficient(extended_whole, 5),
                            )
                            eh, ek = (
                                coefficient(extended_deleted, 4),
                                coefficient(extended_deleted, 5),
                            )
                            extended_value = (
                                ed * (2 * ee + ed)
                                - 24 * (ee * eh - ed * ek)
                            )
                            increment = extended_value - value
                            if (
                                minimum_increment is None
                                or increment < minimum_increment
                            ):
                                minimum_increment = increment
                                increment_witness = (
                                    arms,
                                    length,
                                    extended_length,
                                    extended_root_length,
                                    extended,
                                    value,
                                    extended_value,
                                )
        print(
            f"n={order} spiders={spiders:,} rooted={rooted:,} "
            f"minimum={minimum} witness={witness} "
            f"min_increment={minimum_increment} "
            f"increment_witness={increment_witness}",
            flush=True,
        )
        print("  by_arms", dict(sorted(by_arms.items())), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
