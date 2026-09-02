#!/usr/bin/env python3
"""Low-memory exact integer multi-pair AM-GM allocation scout for a345.

This writes no proof artifact.  Every accepted row is nevertheless checked
with integer arithmetic, so a complete run can be converted into a durable
certificate without changing the mathematical allocation.
"""

from __future__ import annotations

import itertools
import math
import random

from explore_rank8_low_high_strong_a345_prefix_global_lp import build, NAMES
from verify_rank8_low_high_strong_a3_prefix_amgm import exact_allocation


Q = 1_000_000
RESERVES = (1, 2, 4, 8, 16, 32)


def scaled_choice(demand, pairs, remaining, initial):
    """Return integer allocations covering demand, or None.

    For each reserve prefix we allocate the same dyadic-like rational scale
    (rounded upward in integer source capacity) across disjoint midpoint pairs.
    The returned AM-GM contribution is checked by integer square roots.
    """
    live = []
    for low, high in pairs:
        rl, rh = remaining[low], remaining[high]
        if rl and rh:
            gain = math.isqrt(4 * rl * rh)
            if gain:
                live.append((gain, low, high, rl, rh))
    if not live or sum(row[0] for row in live) < demand:
        return None
    live.sort(reverse=True)

    prefixes = []
    for reserve in RESERVES:
        goal = reserve * demand
        total = 0
        end = 0
        while end < len(live) and total < goal:
            total += live[end][0]
            end += 1
        if total >= demand:
            prefixes.append(live[:end])
    prefixes.append(live)

    best = None
    seen_sizes = set()
    for prefix in prefixes:
        if len(prefix) in seen_sizes:
            continue
        seen_sizes.add(len(prefix))
        lo, hi = 1, Q
        while lo < hi:
            mid = (lo + hi) // 2
            cover = 0
            for _, _, _, rl, rh in prefix:
                xl = (mid * rl + Q - 1) // Q
                xh = (mid * rh + Q - 1) // Q
                cover += math.isqrt(4 * xl * xh)
            if cover >= demand:
                hi = mid
            else:
                lo = mid + 1
        rows = []
        cover = 0
        score = 0.0
        for _, low, high, rl, rh in prefix:
            xl = (lo * rl + Q - 1) // Q
            xh = (lo * rh + Q - 1) // Q
            contribution = math.isqrt(4 * xl * xh)
            if contribution:
                rows.append((low, high, xl, xh, contribution))
                cover += contribution
                score += xl / initial[low] + xh / initial[high]
        if cover < demand:
            continue
        candidate = (score, len(rows), cover, rows)
        if best is None or candidate[:2] < best[:2]:
            best = candidate
    return best


def main() -> None:
    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in build().terms()}
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == 482_694 and len(negative) == 3_943
    print("BUILT", len(terms), len(negative), flush=True)

    pairs_by_target = {}
    scarcity = {}
    for target_index, (target, demand) in enumerate(negative.items()):
        pairs = []
        total_gain = 0
        for low in itertools.product(*(range(2 * exponent + 1) for exponent in target)):
            high = tuple(2 * target[index] - low[index] for index in range(len(NAMES)))
            if low >= high:
                continue
            pl, ph = positive.get(low), positive.get(high)
            if pl is None or ph is None:
                continue
            pairs.append((low, high))
            total_gain += math.isqrt(4 * pl * ph)
        pairs_by_target[target] = tuple(pairs)
        scarcity[target] = total_gain / demand
        if target_index % 1000 == 0:
            print("C", target_index, flush=True)
    assert all(pairs_by_target.values())
    print("PAIRS", sum(map(len, pairs_by_target.values())),
          "MIN_SCARCITY", min(scarcity.values()), flush=True)

    rng = random.Random(345)
    best_done = 0
    for attempt in range(24):
        jitter = {target: rng.random() for target in negative}
        # Constrained midpoint covers first; random tie/near-tie perturbation.
        order = sorted(negative, key=lambda target:
                       (scarcity[target] * (1.0 + 0.02 * jitter[target]),
                        len(pairs_by_target[target])))
        remaining = dict(positive)
        rows = []
        failed = None
        for index, target in enumerate(order):
            demand = negative[target]
            one_pair = []
            for low, high in pairs_by_target[target]:
                allocation = exact_allocation(demand, remaining[low], remaining[high])
                if allocation is not None:
                    score, low_used, high_used = allocation
                    one_pair.append((score, low, high, low_used, high_used))
            if one_pair:
                _, low, high, low_used, high_used = min(one_pair)
                chosen = [(low, high, low_used, high_used,
                           math.isqrt(4 * low_used * high_used))]
            else:
                packed = scaled_choice(demand, pairs_by_target[target], remaining, positive)
                if packed is None:
                    failed = (index, target, demand)
                    break
                _, _, _, chosen = packed
            assert sum(row[4] for row in chosen) >= demand
            for low, high, low_used, high_used, _ in chosen:
                remaining[low] -= low_used
                remaining[high] -= high_used
                assert remaining[low] >= 0 and remaining[high] >= 0
            rows.append((target, demand, chosen))
        if len(rows) > best_done:
            best_done = len(rows)
            print("BEST", attempt, best_done, "FAIL", failed,
                  "MULTI", sum(len(row[2]) > 1 for row in rows), flush=True)
        if failed is None:
            print("PASS", attempt, len(rows),
                  "MULTI", sum(len(row[2]) > 1 for row in rows),
                  "USED_SOURCES", sum(remaining[key] != positive[key] for key in positive),
                  flush=True)
            return
    print("OBSTRUCTION_METHOD_ONLY", best_done, len(negative), flush=True)


if __name__ == "__main__":
    main()
