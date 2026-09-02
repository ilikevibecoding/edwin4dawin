#!/usr/bin/env python3
"""Exact probe of bivariate Newton coefficients for two-ended brooms."""

from __future__ import annotations

import argparse
import hashlib
import json
from math import comb
from pathlib import Path


def add(*rows):
    out = [0] * max(map(len, rows))
    for row in rows:
        for k, value in enumerate(row):
            out[k] += value
    return out


def convolution(left, right):
    out = [0] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            out[i+j] += x*y
    return out


def shift(row, amount=1):
    return [0] * amount + row


def path_row(order):
    if order == -2:
        return [0]
    if order == -1:
        return [1]
    if order == 0:
        return [1]
    older, old = [1], [1, 1]
    for _ in range(2, order + 1):
        older, old = old, add(old, shift(older))
    return old


def broom_rows(order, a, b):
    A = [comb(a, k) for k in range(a+1)]
    B = [comb(b, k) for k in range(b+1)]
    AB = [comb(a+b, k) for k in range(a+b+1)]
    R, S, T = path_row(order-2), path_row(order-3), path_row(order-4)
    E = add(convolution(AB, R), shift(convolution(A, S)),
            shift(convolution(B, S)), shift(T, 2))
    U = convolution(A, add(convolution(B, R), shift(S)))
    V = convolution(B, add(convolution(A, R), shift(S)))
    W = convolution(AB, R)
    return E, U, V, W


def at(row, k):
    return row[k] if 0 <= k < len(row) else 0


def four_minor(order, a, b, rank):
    E, U, V, W = broom_rows(order, a, b)
    return (
        2*rank*at(E,rank)*at(W,rank-2)-(rank+1)*at(E,rank+1)*at(W,rank-3)
        +at(E,rank-1)*(2*at(W,rank-3)-(rank+1)*at(W,rank-1))
        +at(U,rank)*(-(rank+1)*at(V,rank-2)-at(W,rank-3))
        +at(U,rank-1)*(2*rank*at(V,rank-1)+2*at(W,rank-2))
        +at(U,rank-2)*(-(rank+1)*at(V,rank)+2*at(V,rank-2)-at(W,rank-1))
        -at(V,rank)*at(W,rank-3)+2*at(V,rank-1)*at(W,rank-2)
        -at(V,rank-2)*at(W,rank-1)
    )


def newton_table(order, rank, degree):
    values = [[four_minor(order, a, b, rank) for b in range(degree+1)] for a in range(degree+1)]
    by_a = [[0]*(degree+1) for _ in range(degree+1)]
    for b in range(degree+1):
        seq = [values[a][b] for a in range(degree+1)]
        for i in range(degree+1):
            by_a[i][b] = seq[0]
            seq = [seq[q+1]-seq[q] for q in range(len(seq)-1)]
    result = {}
    for i in range(degree+1):
        seq = by_a[i][:]
        for j in range(degree+1):
            result[i, j] = seq[0]
            seq = [seq[q+1]-seq[q] for q in range(len(seq)-1)]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=35)
    parser.add_argument("--degree", type=int, default=16)
    args = parser.parse_args()
    tables = {}
    stream = hashlib.sha256(); checks = recurrence_checks = 0
    minimum = recurrence_minimum = None; bad = recurrence_bad = 0
    for order in range(2, args.max_order+1):
        max_rank = (order+1)//2 + args.degree
        for rank in range(2, max_rank+2):
            table = newton_table(order, rank, args.degree)
            tables[order, rank] = table
            for (i,j), value in table.items():
                checks += 1
                if value < 0:
                    bad += 1
                cell = (value, order, rank, i, j)
                if minimum is None or cell < minimum:
                    minimum = cell
                stream.update(f"C,{order},{rank},{i},{j},{value};".encode())
                if order >= 4 and (order-1,rank) in tables and (order-2,rank-1) in tables:
                    gap = value-tables[order-1,rank][i,j]-tables[order-2,rank-1][i,j]
                    recurrence_checks += 1
                    if gap < 0:
                        recurrence_bad += 1
                    rec_cell = (gap, order, rank, i, j)
                    if recurrence_minimum is None or rec_cell < recurrence_minimum:
                        recurrence_minimum = rec_cell
                    stream.update(f"R,{order},{rank},{i},{j},{gap};".encode())
    report = {
        "marker": "PROBE_EXACT_ISO_DOUBLE_BROOM_NEWTON",
        "ranges": {"order": [2,args.max_order], "degree": args.degree},
        "coefficient_checks": checks,
        "coefficient_negative": bad,
        "coefficient_minimum": minimum,
        "pascal_recurrence": "c(n,r,i,j)-c(n-1,r,i,j)-c(n-2,r-1,i,j)",
        "recurrence_checks": recurrence_checks,
        "recurrence_negative": recurrence_bad,
        "recurrence_minimum": recurrence_minimum,
        "stream_sha256": stream.hexdigest().upper(),
        "warning": "Finite diagnostic only; neither a Newton theorem nor a recurrence proof.",
    }
    output = Path("iso_double_broom_newton_probe_agent_20260829.json")
    output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2,sort_keys=True))


if __name__ == "__main__":
    main()
