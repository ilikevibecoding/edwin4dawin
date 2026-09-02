"""Exact second-source-root floor for the PF length-three problem.

The unfiltered source row at sharp reserve seventeen is, after

    x = -y/(4(1-y)),

a Jacobi polynomial on ``0<y<1``.  The inner/outer cutoff ``z=r+5`` is

    y0 = 4(r+5)/(4(r+5)+1).

This verifier proves that the source Jacobi matrix has at least two
eigenvalues strictly larger than y0 for

    odd parity:  r >= 8,
    even parity: r >= 2.

For even parity a fixed leading 11-by-11 principal block suffices.  For odd
parity a fixed leading 20-by-20 block suffices once it exists; the four
smaller orders are checked using the full source matrix.  Cauchy interlacing
then transfers the two-eigenvalue statement from the block to the full
matrix, and the inverse change of variables gives two source-root magnitudes
strictly greater than r+5.

All finite checks use exact Fraction LDL pivots.  The infinite ranges use
symbolic rational LDL pivots.  After multiplying each desired signed pivot's
numerator by its denominator, every coefficient is strictly positive after
the indicated shift in r, so no denominator-sign assumption is hidden.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_second_source_root_floor_exact_20260807.json"


def exact_recurrence(parity: str, r: int, size: int):
    if parity == "odd":
        alpha = Fraction(2 * r)
        beta = Fraction(1, 2)
    else:
        alpha = Fraction(2 * r + 1)
        beta = Fraction(-1, 2)

    def top(k: int):
        first = -Fraction(k) * (k + alpha) / (2 * k + alpha + beta)
        second = (
            Fraction(k * (k - 1), 2)
            * (k + alpha - 1)
            * (k + alpha)
            / ((2 * k + alpha + beta - 1) * (2 * k + alpha + beta))
        )
        return first, second

    diagonal = []
    offdiagonal_squared = [Fraction(0)]
    for k in range(size):
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        value = c0 - c1
        diagonal.append(value)
        if k:
            offdiagonal_squared.append(e0 - e1 - value * c0)
    assert all(value > 0 for value in offdiagonal_squared[1:])
    return diagonal, offdiagonal_squared


def exact_pivots(parity: str, r: int, size: int):
    diagonal, offdiagonal_squared = exact_recurrence(parity, r, size)
    y0 = Fraction(4 * (r + 5), 4 * (r + 5) + 1)
    pivots = []
    for k, value in enumerate(diagonal):
        pivot = value - y0
        if k:
            pivot -= offdiagonal_squared[k] / pivots[-1]
        assert pivot
        pivots.append(pivot)
    return pivots


def finite_odd_record():
    # At r=8,...,11 the full source order is less than 20.  Thereafter the
    # leading 20-by-20 principal block is enough.  The symbolic certificate
    # starts at r=4000.
    digest_items = []
    minimum_positive_count = 100
    maximum_bits = 0
    transition_map = {}
    previous = None
    for r in range(8, 4000):
        degree = r + 8
        size = min(degree, 20)
        pivots = exact_pivots("odd", r, size)
        positive_indices = tuple(k for k, value in enumerate(pivots) if value > 0)
        assert len(positive_indices) >= 2
        minimum_positive_count = min(minimum_positive_count, len(positive_indices))
        maximum_bits = max(
            maximum_bits,
            *(abs(value.numerator).bit_length() for value in pivots),
            *(value.denominator.bit_length() for value in pivots),
        )
        if positive_indices != previous:
            transition_map[str(r)] = list(positive_indices)
            previous = positive_indices
        digest_items.append(
            f"{r}:{','.join(map(str, positive_indices))}:"
            f"{pivots[-1].numerator}/{pivots[-1].denominator}"
        )
    return {
        "range": "8<=r<4000",
        "case_count": 3992,
        "block_size": "min(r+8,20)",
        "minimum_positive_pivot_count": minimum_positive_count,
        "positive_index_transitions": transition_map,
        "maximum_exact_integer_bits": maximum_bits,
        "digest": hashlib.sha256(";".join(digest_items).encode("ascii")).hexdigest(),
    }


def finite_even_record():
    pivots = exact_pivots("even", 2, 11)
    positive_indices = [k for k, value in enumerate(pivots) if value > 0]
    assert positive_indices == [2, 10]
    payload = ";".join(f"{v.numerator}/{v.denominator}" for v in pivots)
    return {
        "r": 2,
        "block_size": 11,
        "positive_pivot_indices": positive_indices,
        "positive_pivot_count": len(positive_indices),
        "digest": hashlib.sha256(payload.encode("ascii")).hexdigest(),
    }


def symbolic_pivots(parity: str, size: int):
    r = sp.symbols("r", nonnegative=True)
    if parity == "odd":
        alpha = 2 * r
        beta = sp.Rational(1, 2)
    else:
        alpha = 2 * r + 1
        beta = -sp.Rational(1, 2)
    y0 = 4 * (r + 5) / (4 * (r + 5) + 1)

    def top(k: int):
        first = -sp.Rational(k) * (k + alpha) / (2 * k + alpha + beta)
        second = (
            sp.Rational(k * (k - 1), 2)
            * (k + alpha - 1)
            * (k + alpha)
            / ((2 * k + alpha + beta - 1) * (2 * k + alpha + beta))
        )
        return first, second

    pivots = []
    for k in range(size):
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        diagonal = sp.cancel(c0 - c1)
        pivot = sp.cancel(diagonal - y0)
        if k:
            coupling = sp.cancel(e0 - e1 - diagonal * c0)
            pivot = sp.cancel(pivot - coupling / pivots[-1])
        pivots.append(pivot)
    return r, pivots


def symbolic_record(
    parity: str,
    *,
    size: int,
    shift: int,
    positive_indices: set[int],
):
    r, pivots = symbolic_pivots(parity, size)
    controls = []
    digest_items = []
    for index, pivot in enumerate(pivots):
        numerator, denominator = sp.fraction(sp.cancel(pivot))
        desired_sign = 1 if index in positive_indices else -1
        # sign(pivot) is sign(numerator*denominator).  This product therefore
        # avoids assuming that a recursively generated denominator is positive.
        signed_product = sp.Poly(
            sp.expand(
                (desired_sign * numerator * denominator).subs(r, r + shift)
            ),
            r,
            domain=sp.QQ,
        )
        coefficients = signed_product.all_coeffs()
        assert coefficients and all(value > 0 for value in coefficients)
        digest_items.extend(
            f"{index}:{power}:{coefficient}"
            for power, coefficient in signed_product.terms()
        )
        controls.append(
            {
                "pivot_index": index,
                "desired_sign": desired_sign,
                "degree": signed_product.degree(),
                "coefficient_count": len(coefficients),
                "all_shifted_power_coefficients_strictly_positive": True,
            }
        )
    assert len(positive_indices) >= 2
    return {
        "range": f"r>={shift}",
        "block_size": size,
        "positive_pivot_indices": sorted(positive_indices),
        "positive_pivot_count": len(positive_indices),
        "signed_pivot_controls": controls,
        "digest": hashlib.sha256(";".join(digest_items).encode("ascii")).hexdigest(),
    }


def main():
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_SECOND_SOURCE_ROOT_FLOOR",
        "coordinate_change": {
            "x": "-y/(4*(1-y))",
            "z": "y/(4*(1-y))",
            "cutoff_y0": "4*(r+5)/(4*(r+5)+1)",
        },
        "jacobi_sources": {
            "odd": {"degree": "r+8", "alpha": "2*r", "beta": "1/2"},
            "even": {"degree": "r+9", "alpha": "2*r+1", "beta": "-1/2"},
        },
        "finite_exact": {
            "odd": finite_odd_record(),
            "even": finite_even_record(),
        },
        "symbolic_infinite": {
            "odd": symbolic_record(
                "odd", size=20, shift=4000, positive_indices={4, 19}
            ),
            "even": symbolic_record(
                "even", size=11, shift=3, positive_indices={1, 10}
            ),
        },
        "theorem": (
            "For odd r>=8 and even r>=2, the unfiltered source row has at "
            "least two negative roots x with -x>r+5.  Exact LDL inertia gives "
            "two eigenvalues above y0 in a principal block, and Cauchy "
            "interlacing transfers them to the full source Jacobi matrix."
        ),
        "remaining_length_three_obligation": (
            "Prove that every sign-relevant PF Turan boundary is confined to "
            "a source branch with at most one source root farther left; then "
            "the present theorem places that boundary outside z<r+5, apart "
            "from the finitely many odd r<8 and even r<2 cases."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
