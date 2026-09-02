#!/usr/bin/env python3
"""Balanced exact summation for FLINT multivariate polynomials.

Repeatedly adding thousands of expanded terms into one growing polynomial
causes avoidable merge overhead.  This helper sums bounded batches pairwise,
then pairwise-merges the batch totals.  It changes only evaluation order;
addition remains exact over QQ.
"""

from __future__ import annotations


def pairwise_sum(polynomials):
    rows = list(polynomials)
    if not rows:
        raise ValueError("pairwise_sum requires at least one polynomial")
    while len(rows) > 1:
        next_rows = []
        stop = len(rows) - len(rows) % 2
        for index in range(0, stop, 2):
            next_rows.append(rows[index] + rows[index + 1])
        if stop != len(rows):
            next_rows.append(rows[-1])
        rows = next_rows
    return rows[0]


def balanced_batched_sum(polynomials, *, batch_size: int = 128, progress=None):
    if batch_size < 2:
        raise ValueError("batch_size must be at least two")
    batches = []
    batch = []
    count = 0
    for polynomial in polynomials:
        batch.append(polynomial)
        count += 1
        if len(batch) == batch_size:
            batches.append(pairwise_sum(batch))
            batch = []
            if progress is not None:
                progress(count, len(batches))
    if batch:
        batches.append(pairwise_sum(batch))
        if progress is not None:
            progress(count, len(batches))
    if not batches:
        raise ValueError("balanced_batched_sum requires at least one polynomial")
    return pairwise_sum(batches)
