#!/usr/bin/env python3
"""Certified line-root audit at later group Schur-sign transition sizes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from verify_group_m14_sturm_transition import line_group, t


OUT = Path("group_transition_sizes_root_lines_20260803.json")


def cleared(poly: sp.Poly) -> fmpz_poly:
    denominator = sp.ilcm(*[sp.denom(value) for value in poly.all_coeffs()])
    return fmpz_poly(
        [int(poly.nth(power) * denominator) for power in range(poly.degree() + 1)]
    )


def digest(poly: sp.Poly) -> str:
    primitive = sp.Poly(sp.primitive(poly.as_expr(), t)[1], t)
    return hashlib.sha256(str(primitive.all_coeffs()).encode("ascii")).hexdigest()


def root_counts(poly: sp.Poly) -> tuple[int, int]:
    real = nonreal = 0
    for root, multiplicity in cleared(poly).complex_roots():
        if root.imag.is_zero():
            real += multiplicity
        else:
            nonreal += multiplicity
    return real, nonreal


def main() -> None:
    ctx.prec = 256
    lines = [(1, 2, 2, 3), (-10, 5, 17, 7), (100, 1, -100, 2)]
    records = []
    for m in (15, 22, 32, 40):
        n, d = 3 * m + 4, 2 * m + 5
        for ax, bx, ay, by in lines:
            polynomial = line_group(n, d, ax, bx, ay, by)
            real, nonreal = root_counts(polynomial)
            assert real + nonreal == polynomial.degree()
            record = {
                "m": m,
                "N": n,
                "d": d,
                "X": f"{ax}+{bx}t",
                "Y": f"{ay}+{by}t",
                "degree": int(polynomial.degree()),
                "certified_real_roots": int(real),
                "certified_nonreal_roots": int(nonreal),
                "primitive_coefficient_sha256": digest(polynomial),
            }
            records.append(record)
            print(record, flush=True)

    failures = [record for record in records if record["certified_nonreal_roots"]]
    report = {
        "status": (
            "GROUP_TRANSITION_LINE_FAILURE" if failures
            else "PASS_CERTIFIED_GROUP_TRANSITION_SIZE_LINES"
        ),
        "records": records,
        "failure_count": len(failures),
        "scope": "Finite certified line restrictions; absence of a failure is not a stability proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
