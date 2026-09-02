#!/usr/bin/env python3
"""Derive the rational sign kernel of an aligned repaired bottom-pair summand.

The old positive hypergeometric factor is removed.  The surviving rational
function has the same sign as the interior aligned difference whenever the
factored path counts are supported.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from flint import fmpq_mpoly, fmpq_mpoly_ctx


sys.set_int_max_str_digits(0)
SOURCE = fmpq_mpoly_ctx.get(("q", "L", "a", "b"), "lex")
TARGET = fmpq_mpoly_ctx.get(("u", "m", "s", "x"), "lex")
u, m, s, x = TARGET.gens()


class Frac:
    __slots__ = ("num", "den")

    def __init__(self, num, den=1, *, reduce: bool = True):
        self.num = num if isinstance(num, fmpq_mpoly) else TARGET.constant(num)
        self.den = den if isinstance(den, fmpq_mpoly) else TARGET.constant(den)
        if reduce:
            self._reduce()

    def _reduce(self) -> None:
        if not self.num:
            self.den = TARGET.constant(1)
            return
        common = self.num.gcd(self.den)
        if not common.is_one():
            self.num //= common
            self.den //= common
        if self.den.leading_coefficient() < 0:
            self.num = -self.num
            self.den = -self.den

    @staticmethod
    def coerce(value):
        return value if isinstance(value, Frac) else Frac(value)

    def __add__(self, other):
        other = Frac.coerce(other)
        common = self.den.gcd(other.den)
        left_scale = other.den // common
        right_scale = self.den // common
        result = Frac(
            self.num * left_scale + other.num * right_scale,
            self.den * left_scale,
            reduce=False,
        )
        result._reduce()
        return result

    def __sub__(self, other):
        other = Frac.coerce(other)
        return self + Frac(-other.num, other.den, reduce=False)

    def __mul__(self, other):
        other = Frac.coerce(other)
        left_common = self.num.gcd(other.den)
        right_common = other.num.gcd(self.den)
        return Frac(
            (self.num // left_common) * (other.num // right_common),
            (self.den // right_common) * (other.den // left_common),
            reduce=False,
        )

    def __rmul__(self, other):
        return self * other

    def __truediv__(self, other):
        other = Frac.coerce(other)
        return self * Frac(other.den, other.num, reduce=False)


def load_ratio() -> tuple[fmpq_mpoly, fmpq_mpoly]:
    numerator = fmpq_mpoly(
        Path("path_isolate_p4_kernel_common_ratio_num_20260801.txt")
        .read_text(encoding="utf-8")
        .strip(),
        ctx=SOURCE,
    )
    denominator = fmpq_mpoly(
        Path("path_isolate_p4_kernel_common_ratio_den_20260801.txt")
        .read_text(encoding="utf-8")
        .strip(),
        ctx=SOURCE,
    )
    scalar, factors = denominator.factor()
    primitive_denominator = SOURCE.constant(1)
    for factor, exponent in factors:
        primitive_denominator *= factor**exponent
    assert denominator == scalar * primitive_denominator
    numerator = numerator / scalar
    return numerator, primitive_denominator


def main() -> None:
    numerator, denominator = load_ratio()
    q0 = m + s + 2
    length0 = 2 * m + 2 * s + x

    def weight(q_value, length_value, a_value, b_value) -> Frac:
        num = numerator.compose(
            q_value, length_value, a_value, b_value, ctx=TARGET
        )
        den = denominator.compose(
            q_value, length_value, a_value, b_value, ctx=TARGET
        )
        return Frac(num, den)

    def top(layer):
        return m + s + x + layer

    def bottom(layer):
        return m + s + 2 - layer

    def slack(layer):
        return x + 2 * layer - 2

    def same_plus_one(layer) -> Frac:
        n = top(layer)
        k_value = bottom(layer)
        d = slack(layer)
        return Frac((n + 1) * k_value, (d + 1) * (d + 2))

    def new_plus_one(layer) -> Frac:
        n = top(layer)
        d = slack(layer)
        return Frac((n + 1) * (n + 2), (d + 1) * (d + 2))

    def new_plus_two(layer) -> Frac:
        n = top(layer)
        k_value = bottom(layer)
        d = slack(layer)
        return Frac(
            (n + 1) * (n + 2) * (n + 3) * k_value,
            (d + 1) * (d + 2) * (d + 3) * (d + 4),
        )

    records = []
    for parity in (0, 1):
        j = 2 * m + parity
        old_b = j - u
        old_zero = weight(q0, length0, u, old_b)
        old_one = weight(q0, length0, u, old_b + 1)
        old_pair = old_zero + u * same_plus_one(old_b) * old_one

        q1 = q0 + 1
        length1 = length0 + 2
        new_zero = weight(q1, length1, u + 1, old_b + 1)
        new_one = weight(q1, length1, u + 1, old_b + 2)
        new_pair = new_plus_one(u) * (
            new_plus_one(old_b) * new_zero
            + (u + 1) * new_plus_two(old_b) * new_one
        )
        binomial_ratio = Frac(
            (j + 2) * (j + 1), (u + 1) * (j + 1 - u)
        )
        aligned = binomial_ratio * new_pair - old_pair
        aligned._reduce()

        numerator_factor = aligned.num.factor()
        denominator_factor = aligned.den.factor()
        numerator_text = str(aligned.num)
        denominator_text = str(aligned.den)
        Path(
            f"path_isolate_p4_bottom_pair_aligned_summand_parity{parity}_"
            "num_20260801.txt"
        ).write_text(numerator_text + "\n", encoding="utf-8")
        Path(
            f"path_isolate_p4_bottom_pair_aligned_summand_parity{parity}_"
            "den_20260801.txt"
        ).write_text(denominator_text + "\n", encoding="utf-8")
        record = {
            "parity": parity,
            "numerator_term_count": len(aligned.num),
            "numerator_degrees_u_m_s_x": list(map(int, aligned.num.degrees())),
            "denominator_term_count": len(aligned.den),
            "denominator_degrees_u_m_s_x": list(map(int, aligned.den.degrees())),
            "numerator_factor_count": len(numerator_factor[1]),
            "numerator_factors": [
                {
                    "factor": str(factor),
                    "multiplicity": int(exponent),
                    "term_count": len(factor),
                    "degrees": list(map(int, factor.degrees())),
                }
                for factor, exponent in numerator_factor[1]
            ],
            "denominator_factors": [
                {"factor": str(factor), "multiplicity": int(exponent)}
                for factor, exponent in denominator_factor[1]
            ],
            "numerator_sha256": hashlib.sha256(
                numerator_text.encode("utf-8")
            ).hexdigest(),
            "denominator_sha256": hashlib.sha256(
                denominator_text.encode("utf-8")
            ).hexdigest(),
        }
        records.append(record)
        print(
            parity,
            record["numerator_term_count"],
            record["numerator_degrees_u_m_s_x"],
            flush=True,
        )

    report = {
        "status": "PASS_DERIVATION",
        "normalization": (
            "aligned paired summand divided by "
            "binom(j,u)*B_u(q,L)*B_(j-u)(q,L)"
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_aligned_summand_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
