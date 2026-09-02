#!/usr/bin/env python3
"""Exact compact identity for no-mark-root rank-five bundle g1.

When the deepest support is the root of an unmarked component, deleting its
leaf bundle leaves an isolated support.  If T is the four-minor tuple of the
remaining marked forest C, the M=1 bundle step replaces the common component
1+x by 1+2x.  This script proves the bivariate identity

  N((1+2x)T)-N((1+x)T)-zw N(T)
    = (z+w+2zw)N(T)-3(z-w)^2 R(T)/2.

On the (5,5) diagonal it becomes

  g1 = M5 + 3 C5 + 2 N4,

where M5=2 N_(4,5) and C5=R_(4,4)-R_(3,5).  The already proved all-forest
N4 theorem pays the final term.  Positivity of M5+3C5 remains a separate
fixed-rank obligation; this artifact does not assert it.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_common_factor_product_rule_root import (
    defect_form,
    nested,
    tuple_multiply,
)
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)
from derive_iso_nested_compact_operator_root import symbols, w, z


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G1_NO_MARK_ROOT_COMPACT_IDENTITY_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def linear_factor(amount: int):
    return 1 + amount * z, 1 + amount * w, amount, amount


def polynomial_row(coefficients: tuple[sp.Symbol, ...]):
    pz = sum(value * z**index for index, value in enumerate(coefficients))
    pw = sum(value * w**index for index, value in enumerate(coefficients))
    return pz, pw, sp.diff(pz, z), sp.diff(pw, w)


def coefficient(expression: sp.Expr, a: int, b: int) -> sp.Expr:
    return sp.expand(expression).coeff(z, a).coeff(w, b)


def main() -> None:
    abstract = tuple(symbols(name) for name in "EUVW")
    n_abstract = nested(abstract)
    r_abstract = defect_form(abstract)
    direct = sp.expand(
        nested(tuple_multiply(linear_factor(2), abstract))
        - nested(tuple_multiply(linear_factor(1), abstract))
        - z * w * n_abstract
    )
    compact = sp.expand(
        (z + w + 2 * z * w) * n_abstract
        - 3 * (z - w) ** 2 * r_abstract / 2
    )
    assert sp.expand(direct - compact) == 0

    generic_c, _generic_d, raw_g1, _raw_g2 = raw_coefficients()
    concrete = tuple(polynomial_row(tuple(row)) for row in generic_c)
    n_concrete = nested(concrete)
    r_concrete = defect_form(concrete)
    n4 = coefficient(n_concrete, 4, 4)
    m5 = 2 * coefficient(n_concrete, 4, 5)
    c5 = coefficient(r_concrete, 4, 4) - coefficient(r_concrete, 3, 5)
    compact_diagonal = sp.expand(m5 + 3 * c5 + 2 * n4)

    # Specialize the defining raw g1 to D=C and check the coefficient identity
    # without importing any forest formula or sign claim.
    d_equals_c = {
        d_symbol: c_symbol
        for drow, crow in zip(_generic_d, generic_c)
        for d_symbol, c_symbol in zip(drow, crow)
    }
    raw_no_mark_root = sp.expand(raw_g1.subs(d_equals_c))
    assert sp.expand(raw_no_mark_root - compact_diagonal) == 0

    # Partition independent sets by whether they contain neither mark, only
    # v, only u, or both.  Thus W=A, U=A+xB, V=A+xC and
    # E=A+xB+xC+epsilon*x^2D.  Quadraticity forces a five-block split.
    a = sp.symbols("a0:7")
    b = sp.symbols("b0:6")
    c = sp.symbols("p0:6")
    drow = sp.symbols("d0:5")
    epsilon = sp.symbols("epsilon", nonnegative=True)
    partition_rules = {}
    for index in range(7):
        av = a[index]
        bv = b[index - 1] if 1 <= index <= 6 else 0
        cv = c[index - 1] if 1 <= index <= 6 else 0
        dv = epsilon * drow[index - 2] if 2 <= index <= 6 else 0
        partition_rules[sp.Symbol(f"cW{index}")] = av
        partition_rules[sp.Symbol(f"cU{index}")] = av + bv
        partition_rules[sp.Symbol(f"cV{index}")] = av + cv
        partition_rules[sp.Symbol(f"cE{index}")] = av + bv + cv + dv
    partitioned = sp.expand((m5 + 3 * c5).subs(partition_rules))
    zero_b = {value: 0 for value in b}
    zero_c = {value: 0 for value in c}
    zero_d = {value: 0 for value in drow}
    H = sp.expand(partitioned.subs(zero_b | zero_c | zero_d))
    L_ab = sp.expand(partitioned.subs(zero_c | zero_d) - H)
    L_ac = sp.expand(partitioned.subs(zero_b | zero_d) - H)
    K_bc = sp.expand(partitioned.subs(zero_d) - H - L_ab - L_ac)
    K_ad = sp.expand((partitioned - partitioned.subs({epsilon: 0})) / epsilon)
    assert sp.expand(partitioned - H - L_ab - L_ac - K_bc - epsilon * K_ad) == 0
    assert sp.expand(L_ac - L_ab.xreplace(dict(zip(b, c)))) == 0
    # K is the same symmetric bilinear form on (B,C) and (A,D).
    assert sp.expand(K_ad - K_bc.xreplace({
        **dict(zip(b, a)),
        **dict(zip(c, drow)),
    })) == 0

    report = {
        "marker": MARKER,
        "bivariate_identity": (
            "N((1+2x)T)-N((1+x)T)-zwN(T)="
            "(z+w+2zw)N(T)-3(z-w)^2R(T)/2"
        ),
        "diagonal_definitions": {
            "M5": "2*[z^4 w^5]N(T)",
            "C5": "[z^4 w^4]R(T)-[z^3 w^5]R(T)",
            "N4": "[z^4 w^4]N(T)",
        },
        "rank_five_identity": "g1(no-mark-root)=M5+3*C5+2*N4",
        "exact_match_to_raw_54_term_g1": True,
        "raw_forms": {
            "M5": str(sp.factor(m5)),
            "C5": str(sp.factor(c5)),
            "N4": str(sp.factor(n4)),
            "M5_plus_3C5": str(sp.factor(m5 + 3 * c5)),
        },
        "mark_inclusion_partition": {
            "rows": "W=A, U=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D",
            "identity": "M5+3C5=H(A)+L(A,B)+L(A,C)+K(B,C)+epsilon*K(A,D)",
            "H": str(sp.factor(H)),
            "L": str(sp.factor(L_ab)),
            "K": str(sp.factor(K_bc)),
            "term_counts": {
                "H": len(sp.Add.make_args(H)),
                "L": len(sp.Add.make_args(L_ab)),
                "K": len(sp.Add.make_args(K_bc)),
            },
            "epsilon": "1 when u,v are nonadjacent and 0 when they are adjacent",
            "status": "exact algebraic split; signs of H,L,K are not asserted",
        },
        "term_counts": {
            "raw_no_mark_root": len(sp.Poly(
                raw_no_mark_root,
                *sorted(raw_no_mark_root.free_symbols, key=str),
            ).terms()),
            "M5": len(sp.Poly(m5, *sorted(m5.free_symbols, key=str)).terms()),
            "C5": len(sp.Poly(c5, *sorted(c5.free_symbols, key=str)).terms()),
            "N4": len(sp.Poly(n4, *sorted(n4.free_symbols, key=str)).terms()),
        },
        "proved_payment": (
            "The term 2*N4 is nonnegative for every finite marked forest by the "
            "independently audited all-forest N4 theorem."
        ),
        "remaining_sufficient_inequality": "M5+3*C5>=0 for every finite marked forest",
        "status": "exact compact reduction; remaining sufficient inequality not asserted",
        "scope": (
            "No-mark-root rank-five g1 identity only. It does not prove the remaining "
            "M5+3C5 sign, g1 in other modes, all N5, or Erdos Problem 993."
        ),
        "dependencies": {
            "derive_iso_common_factor_product_rule_root.py": sha256(
                HERE / "derive_iso_common_factor_product_rule_root.py"
            ),
            "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py": sha256(
                HERE / "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
