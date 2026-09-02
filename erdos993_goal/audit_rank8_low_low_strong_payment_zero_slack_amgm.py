#!/usr/bin/env python3
"""Independent audit of all zero-slack strong-payment AM-GM certificates."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_independent_audit_exact_20260821.json"
PRODUCER = "verify_rank8_low_low_strong_payment_zero_slack_amgm.py"
CERTIFICATE = "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json"
EXPECTED = {
    PRODUCER: "938DB870FD63EE98E2C2CE4A50E4AC16BA787A5576A7812DF71171DA1111559D",
    CERTIFICATE: "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient_row(ratios: list[sp.Expr]) -> list[sp.Expr]:
    row = [sp.Integer(1)]
    for ratio in ratios:
        row.append(sp.expand(row[-1] * ratio))
    return row


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual_inputs == EXPECTED
    certificate = json.loads((ROOT / CERTIFICATE).read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_ZERO_SLACK_STRONG_PAYMENT_ALL_BERNSTEIN_AMGM"
    assert certificate["source_sha256"] == actual_inputs[PRODUCER]

    h, ta, tb = sp.symbols("h ta tb", nonnegative=True)
    left_ratios = [ta + 9 * h, ta + 7 * h, ta + 6 * h, ta + 5 * h,
                   ta + 4 * h, ta + 3 * h, ta + 2 * h, ta + h, ta]
    left = coefficient_row(left_ratios)
    tail = [sp.Integer(0)] * 3 + left[3:]

    def strong_at(multiplier: int) -> sp.Expr:
        # Direct ratio row at t=multiplier*h.  Only the index-2 ratio moves.
        right_ratios = [tb + 9 * h, tb + 7 * h, tb + (6 + multiplier) * h,
                        tb + 5 * h, tb + 4 * h, tb + 3 * h,
                        tb + 2 * h, tb + h, tb]
        right = coefficient_row(right_ratios)

        def conv(row, rank):
            return sp.expand(sum(
                math.comb(rank, index) * row[index] * right[rank - index]
                for index in range(rank + 1)
            ))

        c = {rank: conv(left, rank) for rank in (7, 8, 9)}
        v = {rank: conv(tail, rank) for rank in (7, 8, 9)}
        margin = sp.expand(c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8])
        derivative = sp.expand(
            2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
            - h * (v[7] * c[8] + c[7] * v[8])
        )
        return sp.expand(left_ratios[2] * margin + h * derivative)

    minus, base, far = strong_at(-1), strong_at(0), strong_at(1)
    # For a quadratic S(t), S(h)-S(-h)=2*h*S'(0).
    middle_times_2 = sp.expand(2 * base + (far - minus) / 2)
    expressions = {"base": base, "middle_times_2": middle_times_2, "far": far}
    expected_counts = {"base": (148, 6), "middle_times_2": (148, 6), "far": (147, 10)}

    certificate_rows = {row["bernstein_coefficient"]: row for row in certificate["rows"]}
    assert set(certificate_rows) == set(expressions)
    audited_rows = []
    for label, expression in expressions.items():
        terms = {
            tuple(map(int, monomial)): int(coefficient)
            for monomial, coefficient in sp.Poly(expression, h, ta, tb).terms()
        }
        positive = {key: value for key, value in terms.items() if value > 0}
        negative = {key: -value for key, value in terms.items() if value < 0}
        assert (len(terms), len(negative)) == expected_counts[label]
        row = certificate_rows[label]
        assert row["terms"] == len(terms)
        assert row["negative_terms"] == len(negative)

        used = set()
        covered = set()
        for allocation in row["allocations"]:
            target = tuple(allocation["negative_monomial"])
            demand = int(allocation["demand"])
            low = tuple(allocation["source_low"]["monomial"])
            high = tuple(allocation["source_high"]["monomial"])
            low_capacity = int(allocation["source_low"]["capacity"])
            high_capacity = int(allocation["source_high"]["capacity"])
            assert target not in covered and demand == negative[target]
            covered.add(target)
            assert low_capacity == positive[low] and high_capacity == positive[high]
            assert low not in used and high not in used and low != high
            used.update((low, high))
            assert tuple(low[i] + high[i] for i in range(3)) == tuple(2 * x for x in target)
            four_product = 4 * low_capacity * high_capacity
            assert four_product == allocation["four_product"]
            assert demand * demand == allocation["demand_squared"]
            assert four_product - demand * demand == allocation["slack"] >= 0
        assert covered == set(negative)
        assert len(used) == 2 * len(negative) == row["disjoint_positive_sources"]
        audited_rows.append({
            "bernstein_coefficient": label,
            "terms": len(terms),
            "negative_terms": len(negative),
            "covered_negative_terms": len(covered),
            "disjoint_sources": len(used),
        })

    payload = {
        "schema": "rank8-low-low-strong-payment-zero-slack-amgm-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_ZERO_SLACK_STRONG_PAYMENT_ALL_BERNSTEIN_AMGM",
        "independent_reconstruction": (
            "Direct t=-h,0,h ratio rows plus the exact quadratic finite-difference identity; "
            "producer code was not imported."
        ),
        "rows": audited_rows,
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": certificate["scope_warning"],
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for row in audited_rows:
        print(row)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
