#!/usr/bin/env python3
"""Fail-closed exact rank-seven G1 theorem for every edgeless marked core.

The literal thirteen-node bundle coefficient is reconstructed independently,
then specialized directly to the four canonical D modes.  Orders through ten
are pinned to the exhaustive finite certificate; for n>=11 every shifted
numerator coefficient is nonnegative.  Scope is only edgeless C and G1.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_edgeless_all_parent_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_EDGELESS_ALL_PARENT_RANK7_G4_PIECEWISE"
THRESHOLD = 11
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "parent_source": "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py",
    "parent_report": "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g1_edgeless_all_parent_rank7_g4_piecewise.py",
    "probe_report": "iso_n7_bundle_g1_edgeless_all_parent_probe_rank7_g4_piecewise_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "parent_source": "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D",
    "parent_report": "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490",
    "probe_source": "60B05C10E32607EB2720C01D9DC0FBD5B47C88A864DC4BE76C4B595CA7846E6A",
    "probe_report": "0C9945871CFFF389E87E255784059EAC2F8167C8CCE866E49501DF52A1ED0F41",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probe = json.loads((HERE/FILES["probe_report"]).read_text(encoding="utf-8"))
    finite = json.loads((HERE/FILES["finite_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G1_EDGELESS_ALL_PARENT_RANK7_G4_PIECEWISE"
    )
    assert probe["negative_shifted_coefficients"] == 0
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    n, tail = sp.symbols("n tail", integer=True, nonnegative=True)
    c = {}
    for rank in range(9):
        c.update({
            sp.Symbol(f"cE{rank}"): choose(n, rank),
            sp.Symbol(f"cU{rank}"): choose(n-1, rank),
            sp.Symbol(f"cV{rank}"): choose(n-1, rank),
            sp.Symbol(f"cW{rank}"): choose(n-2, rank),
        })

    def drows(mode: str):
        result = {}
        for rank in range(9):
            if mode == "no_parent":
                orders = {"E": n, "U": n-1, "V": n-1, "W": n-2}
            elif mode == "endpoint_u":
                orders = {"E": n-1, "U": n-1, "V": n-2, "W": n-2}
            elif mode == "endpoint_v":
                orders = {"E": n-1, "U": n-2, "V": n-1, "W": n-2}
            elif mode == "ordinary_parent":
                orders = {"E": n-1, "U": n-2, "V": n-2, "W": n-3}
            else:
                raise AssertionError(mode)
            result.update({
                sp.Symbol(f"d{family}{rank}"): choose(order, rank)
                for family, order in orders.items()
            })
        return result

    expected_forms = {
        "no_parent": (
            n*(n-4)**2*(n-3)**2*(n-2)**2*(n-1)
            *(209*n**2-339*n-170)/sp.Integer(302400)
        ),
        "endpoint_u": (
            (n-4)**2*(n-3)**2*(n-2)**2*(n-1)
            *(209*n**3-479*n**2-1780*n+3150)/sp.Integer(302400)
        ),
        "endpoint_v": (
            (n-4)**2*(n-3)**2*(n-2)**2*(n-1)
            *(209*n**3-479*n**2-1780*n+3150)/sp.Integer(302400)
        ),
        "ordinary_parent": (
            (n-5)*(n-4)**2*(n-3)**2*(n-2)*(n-1)
            *(209*n**3+178*n**2-2992*n+1680)/sp.Integer(302400)
        ),
    }
    rows = {}
    for mode, expected in expected_forms.items():
        direct = sp.factor(generic.subs({**c, **drows(mode)}, simultaneous=True))
        assert sp.cancel(direct-expected) == 0, mode
        assert sp.cancel(
            direct-sp.sympify(probe["rows"][mode]["expression"], locals={"n": n})
        ) == 0
        numerator, denominator = sp.fraction(sp.cancel(direct))
        assert not denominator.free_symbols and denominator > 0
        shifted = sp.Poly(sp.expand(numerator.subs(n, tail+THRESHOLD)), tail)
        shifted_coefficients = shifted.all_coeffs()
        assert all(value >= 0 for value in shifted_coefficients)
        assert shifted_coefficients[0] > 0 and shifted_coefficients[-1] > 0
        assert list(map(str, shifted_coefficients)) == probe["rows"][mode][
            "shifted_coefficients"
        ]
        rows[mode] = {
            "factorization": str(direct),
            "shifted_numerator": str(shifted.as_expr()),
            "shifted_coefficients": list(map(str, shifted_coefficients)),
            "minimum_shifted_coefficient": str(min(shifted_coefficients)),
        }

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every edgeless forest C with two distinct marked vertices "
            "and each canonical parent mode D=C, C-u, C-v, or C-p with p "
            "ordinary, the exact rank-seven bundle coefficient G1 is nonnegative."
        ),
        "coverage": [
            {
                "orders": "2<=n<=10",
                "method": "pinned exhaustive all-forest/all-parent finite certificate",
            },
            {
                "orders": "n>=11",
                "method": "independent literal reconstruction and positive shifted numerators",
            },
            {"orders": "n<=1", "method": "vacuous: no distinct marked pair"},
        ],
        "rows": rows,
        "coverage_gap_within_edgeless_G1": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for edgeless C and rank-seven G1.  Forests with "
            "one or more edges and rank-seven G2/G3 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_edgeless_G1": None,
        "mode_minima": {
            key: value["minimum_shifted_coefficient"] for key, value in rows.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
