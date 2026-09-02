#!/usr/bin/env python3
"""Probe a two-block decomposition of the transformed bottom endpoint.

Writing g=g_(N,3), h=g_(N-1,3), S=D_X+D_Y, split

    S^b(S^2(g tensor g)-h tensor h) = Edge + Middle,
    Edge   = S^b(g'' tensor g + g tensor g''),
    Middle = S^b(2g' tensor g' - h tensor h).

The middle block is suggested by the proper-position relation between h
and g'.  This script tests both blocks and both oriented pencils exactly on
positive-direction affine lines.  It is finite evidence only.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_umbral_repaired_core_stability import (
    X,
    add,
    affine_values,
    integer_values,
    multiply,
)
from verify_umbral_hypergeometric_finite_free_structure import hypergeometric_form


OUT = Path("bottom_edge_middle_proper_position_probe_20260802.json")


def derivatives(poly: sp.Poly, order: int) -> list[sp.Poly]:
    return [sp.Poly(sp.diff(poly.as_expr(), X, k), X) for k in range(order + 1)]


def mixed_sum_line(
    left: list[sp.Poly],
    right: list[sp.Poly],
    left_offset: int,
    right_offset: int,
    order: int,
    base: tuple[int, int],
    direction: tuple[int, int],
) -> list[sp.Rational]:
    left_lines = [affine_values(poly, base[0], direction[0]) for poly in left]
    right_lines = [affine_values(poly, base[1], direction[1]) for poly in right]
    out = [sp.S.Zero]
    for k in range(order + 1):
        out = add(
            out,
            multiply(
                left_lines[left_offset + k],
                right_lines[right_offset + order - k],
            ),
            sp.binomial(order, k),
        )
    return out


def nonreal(values: list[sp.Rational]) -> int:
    polynomial = fmpz_poly(integer_values(values))
    return sum(
        multiplicity
        for root, multiplicity in polynomial.complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 128
    rng = random.Random(993_180_022)
    trials = 20
    records = []
    witnesses = []

    for m in range(1, 16):
        N = 3 * m + 3
        b = 2 * m + 1
        g = sp.Poly(hypergeometric_form(N, 3), X)
        h = sp.Poly(hypergeometric_form(N - 1, 3), X)
        gd = derivatives(g, b + 2)
        hd = derivatives(h, b)
        counts = {name: 0 for name in ("edge", "middle", "edge_U_middle", "middle_U_edge")}

        for trial in range(trials):
            base = (rng.randint(-20, 20), rng.randint(-20, 20))
            direction = (rng.randint(1, 14), rng.randint(1, 14))
            u = [rng.randint(-20, 20), rng.randint(1, 14)]

            edge = add(
                mixed_sum_line(gd, gd, 2, 0, b, base, direction),
                mixed_sum_line(gd, gd, 0, 2, b, base, direction),
            )
            middle = add(
                mixed_sum_line(gd, gd, 1, 1, b, base, direction),
                mixed_sum_line(hd, hd, 0, 0, b, base, direction),
                -1,
            )
            # The cross term in S^2 is 2 g'(X)g'(Y).
            middle = add(
                middle,
                mixed_sum_line(gd, gd, 1, 1, b, base, direction),
            )
            tests = {
                "edge": edge,
                "middle": middle,
                "edge_U_middle": add(edge, multiply(middle, u)),
                "middle_U_edge": add(middle, multiply(edge, u)),
            }
            local = {name: nonreal(values) for name, values in tests.items()}
            for name, value in local.items():
                counts[name] += bool(value)
            if any(local.values()) and len(witnesses) < 40:
                witnesses.append(
                    {
                        "m": m,
                        "trial": trial,
                        "base": base,
                        "direction": direction,
                        "u": u,
                        "nonreal": local,
                    }
                )

        record = {"m": m, "N": N, "b": b, **counts}
        records.append(record)
        print(record, flush=True)

    totals = {
        name: sum(record[name] for record in records)
        for name in ("edge", "middle", "edge_U_middle", "middle_U_edge")
    }
    report = {
        "kind": "bottom_edge_middle_proper_position_probe",
        "date": "2026-08-02",
        "m_range": [1, 15],
        "trials_per_m": trials,
        "totals": totals,
        "records": records,
        "first_witnesses": witnesses,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"totals": totals, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
