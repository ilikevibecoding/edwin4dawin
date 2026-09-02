"""Exact factor screen for the normalized GSV symbol of the even group core.

Marcus's GSV convolution multiplies the factorial-normalized coefficient
symbols.  A direct factorization of that symbol into the two bottom pieces
would close the even core.  This script records exact QQ[z,w] factor counts
for the first endpoint sizes; irreducibility rules out only this literal
factorization shortcut.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_group_gsv_convolution_identity import even_group, normalized_array


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_gsv_symbol_factorization_probe_20260804.json"
z, w = sp.symbols("z w")


def digest(poly: sp.Poly) -> str:
    terms = sorted((mon, str(coeff)) for mon, coeff in poly.terms())
    return hashlib.sha256(repr(terms).encode()).hexdigest()


def main() -> None:
    records = []
    for m in range(1, 4):
        N = 3 * m + 4
        d_even = 2 * m + 4
        kappa = 2 * N - d_even
        arr = normalized_array(even_group(N, d_even), kappa, N)
        poly = sp.Poly(
            sum(value * z**i * w**j for (i, j), value in arr.items()),
            z, w, domain=sp.QQ,
        )
        unit, factors = sp.factor_list(poly.as_expr(), z, w)
        records.append({
            "m": m,
            "N": N,
            "d_even": d_even,
            "kappa": kappa,
            "term_count": len(arr),
            "total_degree": poly.total_degree(),
            "factor_count": len(factors),
            "factor_degrees_and_multiplicities": [
                [sp.Poly(factor, z, w).total_degree(), multiplicity]
                for factor, multiplicity in factors
            ],
            "irreducible_over_Q": len(factors) == 1 and factors[0][1] == 1,
            "digest": digest(poly),
            "unit": str(unit),
        })

    report = {
        "status": "NO_LITERAL_GSV_SYMBOL_FACTOR_AT_FIRST_ENDPOINTS",
        "records": records,
        "scope": (
            "Exact finite factor screen only.  It rules out a literal product "
            "factorization of the chosen normalized target symbol, not a more "
            "general determinantal convolution or a stability proof."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
