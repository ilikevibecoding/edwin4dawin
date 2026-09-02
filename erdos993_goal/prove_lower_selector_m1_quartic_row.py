"""All-order reciprocal-resultant proof of lower-selector M1 on row s=4."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import one_case
from derive_lower_selector_m1_cubic_rows import duran, selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_duran_m1_quartic_row_exact_20260812.json"
X, Z = sp.symbols("x z")


def symbolic_family(r: int, parity: int) -> dict[str, object]:
    k = sp.symbols("k", integer=True, nonnegative=True)
    d0 = 5 if parity else 6
    d = 2 * k + d0
    s = 4
    N = d + r
    gamma = selector_gamma(N, s)
    assert len(gamma) == 5
    P = d + s
    epsilon = int((d0 + s) % 2)
    n = sp.expand((P - epsilon) / 2)
    beta = sp.Rational(2 * epsilon - 1, 2)
    base = sp.factor((n - 3) * (n - 3 + beta))
    q = duran(P, gamma)
    lc = sp.factor(q.LC())
    q0 = sp.factor(q.TC())
    threshold = sp.factor(q0 / (lc * base))
    F = sp.Poly(sp.expand(q.as_expr().subs(Z, -X)), X)
    reciprocal = sp.Poly(
        sp.cancel(X**4 * F.as_expr().subs(X, threshold / X)), X
    )
    discriminant = sp.factor(sp.discriminant(F.as_expr(), X))
    discriminant_numerator = sp.cancel(discriminant).as_numer_denom()[0]
    discriminant_large_factors = [
        (sp.Poly(factor, k), exponent)
        for factor, exponent in sp.factor_list(discriminant_numerator, k)[1]
        if sp.degree(factor, k) >= 2
    ]
    discriminant_records = []
    for factor, exponent in discriminant_large_factors:
        positive_count = int(factor.count_roots(0, sp.oo))
        discriminant_records.append({
            "degree": factor.degree(),
            "exponent": exponent,
            "positive_root_count": positive_count,
            "sha256": hashlib.sha256(str(factor.as_expr()).encode("ascii")).hexdigest().upper(),
        })
    assert all(record["positive_root_count"] == 0 for record in discriminant_records)
    base_positive_root_count = int(
        sp.Poly(F.as_expr().subs(k, 0), X).count_roots(0, sp.oo)
    )
    assert base_positive_root_count == 2
    resultant = sp.factor(sp.resultant(F.as_expr(), reciprocal.as_expr(), X))
    numerator = sp.cancel(resultant).as_numer_denom()[0]
    all_nonconstant_factors = [
        (sp.Poly(factor, k), exponent)
        for factor, exponent in sp.factor_list(numerator, k)[1]
        if sp.degree(factor, k) >= 1
    ]
    large_factors = [item for item in all_nonconstant_factors if item[0].degree() >= 20]
    assert len(large_factors) == 2
    assert all(
        factor.count_roots(0, sp.oo) == 0
        for factor, _ in all_nonconstant_factors
        if factor.degree() < 20
    )

    boundaries = {0}
    factor_records = []
    for factor, exponent in large_factors:
        positive_count = int(factor.count_roots(0, sp.oo))
        assert positive_count in (0, 1)
        isolating_interval = None
        if positive_count:
            intervals = [
                (sp.Rational(interval[0]), sp.Rational(interval[1]))
                for interval, multiplicity in factor.intervals(eps=sp.Rational(1, 10**12))
                if multiplicity == 1 and interval[0] >= 0
            ]
            assert len(intervals) == 1
            left, right = intervals[0]
            assert int(sp.floor(left)) == int(sp.floor(right))
            boundary = int(sp.floor(left)) + 1
            boundaries.add(boundary)
            isolating_interval = [str(left), str(right)]
        factor_records.append({
            "degree": factor.degree(),
            "exponent": exponent,
            "positive_root_count": positive_count,
            "positive_root_isolating_interval": isolating_interval,
            "sha256": hashlib.sha256(str(factor.as_expr()).encode("ascii")).hexdigest().upper(),
        })

    # A resultant zero is the only possible equality of a pair-root product
    # with threshold.  Sample every connected component containing an integer.
    boundaries = sorted(boundaries)
    sample_k = [0]
    for boundary in boundaries[1:]:
        if boundary not in sample_k:
            sample_k.append(boundary)
    tail_sample = max(boundaries)
    if tail_sample not in sample_k:
        sample_k.append(tail_sample)

    # If two positive boundary roots occur, the middle integer component may
    # start at the first ceiling and the tail at the second ceiling.
    sample_k = sorted(set(sample_k))
    sample_records = []
    for kval in sample_k:
        dvalue = int(d.subs(k, kval))
        sample_positive_root_count = int(
            sp.Poly(F.as_expr().subs(k, kval), X).count_roots(0, sp.oo)
        )
        assert sample_positive_root_count == 2
        audit = one_case(dvalue, r, 4)
        assert sp.Rational(audit["M1_interval_decimal"][0]) > 0
        sample_records.append({
            "k": kval,
            "d": dvalue,
            "M1_interval_decimal": audit["M1_interval_decimal"],
            "F_positive_root_count": sample_positive_root_count,
        })

    return {
        "r": r,
        "parity": "odd" if parity else "even",
        "d_parameterization": str(d),
        "base_A": str(base),
        "product_threshold_T": str(threshold),
        "resultant_large_factors": factor_records,
        "discriminant_nonconstant_factors": discriminant_records,
        "F_positive_root_count_at_k_0": base_positive_root_count,
        "positive_root_count_constant_on_k_nonnegative": True,
        "component_samples": sample_records,
        "resultant_sha256": hashlib.sha256(str(resultant).encode("ascii")).hexdigest().upper(),
    }


def main() -> None:
    records = [symbolic_family(r, parity) for r in range(4) for parity in (1, 0)]
    payload = {
        "kind": "lower_selector_duran_m1_quartic_row_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_ALL_ORDER_LOWER_DURAN_M1_ROW_4",
        "scope": "all-order symbolic theorem for row_s=4; not the generic row theorem",
        "families": len(records),
        "method": (
            "For F(x)=q(-x), C=q(0)/LC(q), A the first-margin base, and T=C/A, "
            "Res_x(F(x),x^4F(T/x)) vanishes whenever a pair of roots has product T. "
            "Exact positive-root isolation of the parameter-resultant partitions k>=0; "
            "one exact Sturm/Vieta sample in each component fixes the strict inequality."
        ),
        "symbolic_families": records,
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "families": payload["families"],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
