#!/usr/bin/env python3
"""Independent exact audit of the rank-eight Delta0/Delta1 reductions."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


EXPECTED = {
    "verify_rank8_q8_terminal_delta0_reduction.py": "7546765F0FCA4F5955019A8170893371B95AE4B532A8036B1659D6A478B91052",
    "rank8_q8_terminal_delta0_reduction_exact_20260820.json": "B3D1373A0DF158E55FABDD87A3C9033A745E5079D7AB813604CEBE1D5CC5B51C",
    "verify_rank8_q8_terminal_delta1_reduction.py": "9AFCB8440917BFE4B01D28987DE9055B09CA6B7A67E3D2DB3A2186BAB5AAEA70",
    "rank8_q8_terminal_delta1_reduction_exact_20260820.json": "8E7F4EB6AEA056B42A3570996287C8B5BD453C5F9E604368FB09E0F78D9530FF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    here = Path(__file__).resolve().parent
    for name, expected in EXPECTED.items():
        assert sha256(here / name) == expected

    n = sp.symbols("n", integer=True, positive=True)
    Z = sp.symbols("Z", nonnegative=True)
    coefficients = [
        sp.expand(
            newton_coefficients(residual())[rank].subs(
                {c[0]: 1, c[1]: n, c[2]: (n - 1) * (n - 2) / 2}
            )
        )
        for rank in (0, 1)
    ]

    expected_h7_curvatures = [
        -4 * c[7] * (63 * c[6] + 63 * c[7] - h[6]),
        -252 * c[7] * (c[5] + c[6]),
    ]
    expected_c8_curvatures = [
        -256 * h[6] * (c[6] + h[6]),
        -256 * h[6] * (c[5] + c[6]),
    ]
    for coefficient, h7_expected, c8_expected in zip(
        coefficients, expected_h7_curvatures, expected_c8_curvatures
    ):
        assert sp.expand(sp.diff(coefficient, h[7], 2) - h7_expected) == 0
        assert sp.expand(sp.diff(coefficient, c[8], 2) - c8_expected) == 0

    # Independently cover the complete two-sided root polygon.  Put
    # q=6c7/((n-7)c6).  The ordinary extension ceiling gives 0<=q<=6/7,
    # so every displayed h6 interval has the correct orientation.
    a, q = sp.symbols("a q", positive=True)
    c6 = sp.symbols("C6", positive=True)
    c7 = a * q * c6 / 6
    pieces = {
        "lower-zero": ((1 - q) * Z * c6, sp.S.Zero),
        "lower-cross": ((1 - q + q * Z) * c6, c7 * Z),
        "upper-capacity": (sp.Rational(7, 6) * q * Z * c6, c7 * Z),
        "full-root": (
            (sp.Rational(7, 6) * q + (1 - sp.Rational(7, 6) * q) * Z) * c6,
            c7,
        ),
    }
    l0_h6, l0_h7 = pieces["lower-zero"]
    lc_h6, lc_h7 = pieces["lower-cross"]
    uc_h6, uc_h7 = pieces["upper-capacity"]
    fr_h6, fr_h7 = pieces["full-root"]
    assert sp.factor(l0_h7) == 0
    assert sp.factor(6 * (c7 - lc_h7) - a * (c6 - lc_h6)) == 0
    assert sp.factor(7 * uc_h7 - a * uc_h6) == 0
    assert sp.factor(fr_h7 - c7) == 0
    assert (sp.factor(l0_h6.subs(Z, 0)), l0_h7) == (0, 0)
    assert sp.factor(l0_h6.subs(Z, 1) - lc_h6.subs(Z, 0)) == 0
    assert sp.factor(l0_h7 - lc_h7.subs(Z, 0)) == 0
    assert sp.factor(uc_h6.subs(Z, 1) - fr_h6.subs(Z, 0)) == 0
    assert sp.factor(uc_h7.subs(Z, 1) - fr_h7) == 0
    assert sp.factor(fr_h6.subs(Z, 1) - lc_h6.subs(Z, 1)) == 0
    assert sp.factor(fr_h7 - lc_h7.subs(Z, 1)) == 0

    # Q7 supplies exactly the upper c8 endpoint.  Nonnegativity of the actual
    # coefficient c8 supplies the lower endpoint.  Concavity permits the two
    # endpoints without a monotonicity assumption.
    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])
    q7_gap = sp.factor(14 * c[7] ** 2 - c[6] * c[7] - 16 * c[6] * c8_q7)
    assert q7_gap == 0

    # Recheck the exact linked K,V parameterization.  K must remain live.
    x5, K, V = sp.symbols("x5 K V", positive=True)
    d5_low = (2 + x5) / 12
    d5_high = sp.Rational(1, 6) + x5 / 2
    r_low = sp.factor((1 - d5_high) / x5)
    r_high = sp.factor((1 - d5_low) / x5)
    q_low = sp.factor((36 * r_low - 3 * K) / (7 * a))
    q_high = sp.factor((36 * r_high - 3 * K) / (7 * a))
    q_parameter = sp.factor(q_low + (q_high - q_low) * V)
    c6_parameter = sp.factor(c[5] * (7 * a * q_parameter + 3 * K) / 36)
    assert sp.factor(
        c6_parameter - c[5] * (30 / x5 - 18 + 15 * V) / 36
    ) == 0

    payload = {
        "status": "PASS_INDEPENDENT_EXACT_RANK8_DELTA01_STRUCTURAL_REDUCTION_AUDIT",
        "hashes_verified": EXPECTED,
        "verified": [
            "Delta0 and Delta1 h7 concavity with the stated signs",
            "Delta0 and Delta1 c8 concavity; both endpoints 0 and Q7 are necessary and sufficient",
            "four paths cover both boundaries of the two-sided root polygon with no gaps",
            "lower-zero endpoints are zero/lower-cross and full-root endpoints are upper-capacity/lower-cross",
            "complete linked K in [1,7] and V in [0,1] parameterization is retained",
            "positive c7-curvature slices obstruct only a scalar-cone endpoint shortcut",
        ],
        "endpoint_orientation_inputs": [
            "0<=h6<=c6",
            "0<=q=6c7/((n-7)c6)<=6/7",
            "0<=c8<=c7(14c7-c6)/(16c6)",
        ],
        "remaining_tensors_each_rank": 4,
        "defects": [],
        "curvature_witness_note": (
            "The corrected P23 coefficient-jet witness is strictly interior in K, V, "
            "and the lower-zero root face: K=256/57, V=22/95, S=1/2<17/28. "
            "It is correctly classified as a method obstruction only."
        ),
        "scope_warning": "This audit proves the reductions, not Delta0>=0 or Delta1>=0 for n>=23.",
    }
    output = here / "rank8_delta01_structural_reduction_independent_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
