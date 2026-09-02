#!/usr/bin/env python3
"""Float scout for a global same-fraction AM-GM packing on the a3,a4,a5 face.

This is diagnostic only.  A PASS here is not an exact certificate: it is used
to locate a low-load packing that can subsequently be rationalized and checked
with integer arithmetic.
"""

from __future__ import annotations

import itertools
import math

import numpy as np
from flint import fmpz_mpoly_ctx
from scipy.optimize import linprog
from scipy.sparse import coo_matrix

from verify_rank8_low_high_strong_a3_prefix_amgm import factor, convolution


NAMES = ("h", "ta", "a3", "a4", "a5", "tb", "b0", "b1", "b2")


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one, h = context.constant(0), context.constant(1), variables["h"]
    left_ratios, left = factor(variables["ta"], [
        2 * h, h, h, h + variables["a3"], h + variables["a4"],
        h + variables["a5"], h, h,
    ], one)
    _, right = factor(variables["tb"], [
        2 * h + variables["b0"], h + variables["b1"],
        h + variables["b2"], h, h, h, h, h,
    ], one)
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
                  - h * (v[7] * c[8] + c[7] * v[8]))
    return left_ratios[2] * margin + h * derivative


def main() -> None:
    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in build().terms()}
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == 482_694 and len(negative) == 3_943
    print("BUILT", len(terms), len(negative), flush=True)

    targets = tuple(negative)
    source_index = {}
    edge_target = []
    edge_low = []
    edge_high = []
    edge_gain = []
    for target_index, target in enumerate(targets):
        for low in itertools.product(*(range(2 * exponent + 1) for exponent in target)):
            high = tuple(2 * target[index] - low[index] for index in range(len(NAMES)))
            if low >= high:
                continue
            pl, ph = positive.get(low), positive.get(high)
            if pl is None or ph is None:
                continue
            gain = math.isqrt(4 * pl * ph)
            if gain == 0:
                continue
            li = source_index.setdefault(low, len(source_index))
            hi = source_index.setdefault(high, len(source_index))
            edge_target.append(target_index)
            edge_low.append(li)
            edge_high.append(hi)
            edge_gain.append(gain)
        if target_index % 1000 == 0:
            print("C", target_index, len(edge_gain), flush=True)
    edge_count = len(edge_gain)
    source_count = len(source_index)
    print("GRAPH", edge_count, source_count, flush=True)

    # Rows 0..targets-1 enforce -sum(gain*f)<=-demand.  Remaining rows
    # enforce sum(f)-lambda<=0 for every positive source.
    row = []
    col = []
    data = []
    for edge in range(edge_count):
        row.extend((edge_target[edge], len(targets) + edge_low[edge],
                    len(targets) + edge_high[edge]))
        col.extend((edge, edge, edge))
        data.extend((-float(edge_gain[edge]), 1.0, 1.0))
    lambda_col = edge_count
    for source in range(source_count):
        row.append(len(targets) + source)
        col.append(lambda_col)
        data.append(-1.0)
    matrix = coo_matrix((np.asarray(data), (np.asarray(row), np.asarray(col))),
                        shape=(len(targets) + source_count, edge_count + 1)).tocsr()
    rhs = np.concatenate((
        -np.asarray([negative[target] for target in targets], dtype=float),
        np.zeros(source_count),
    ))
    objective = np.zeros(edge_count + 1)
    objective[lambda_col] = 1.0
    result = linprog(objective, A_ub=matrix, b_ub=rhs,
                     bounds=(0.0, None), method="highs",
                     options={"presolve": True})
    print("LP", result.status, result.message, flush=True)
    if result.success:
        values = result.x[:-1]
        print("LAMBDA", result.x[-1], "NONZERO", int(np.count_nonzero(values > 1e-12)),
              "MAX", float(values.max()), flush=True)
        target_cover = np.bincount(np.asarray(edge_target),
                                   weights=np.asarray(edge_gain, dtype=float) * values,
                                   minlength=len(targets))
        source_load = (np.bincount(np.asarray(edge_low), weights=values,
                                   minlength=source_count)
                       + np.bincount(np.asarray(edge_high), weights=values,
                                     minlength=source_count))
        print("MIN_TARGET_RATIO", float(np.min(target_cover /
              np.asarray([negative[target] for target in targets], dtype=float))),
              "MAX_SOURCE_LOAD", float(source_load.max()), flush=True)


if __name__ == "__main__":
    main()
