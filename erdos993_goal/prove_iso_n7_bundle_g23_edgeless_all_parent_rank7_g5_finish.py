#!/usr/bin/env python3
"""Exact universal G2/G3 theorem for every edgeless marked core.

The literal thirteen-node rank-seven bundle coefficients are reconstructed
independently and specialized directly to all four canonical D modes.  The
finite base is pinned; every n>=11 row has a nonnegative shifted numerator.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g23_edgeless_all_parent_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G23_EDGELESS_ALL_PARENT_RANK7_G5_FINISH"
THRESHOLD = 11
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "classifier_source": "classify_iso_n7_bundle_g23_large_order_residuals_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g23_large_order_residual_classifier_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "classifier_source": "CE3D39D6D36D1A01B84D398FA3B9218DF4051AB616951E5823096CF5F5FF21AF",
    "classifier_report": "DB0B50A06C7ED208BAF7E3F88B64770D1D20BFD17C391B72E12B35AB0256222E",
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
    return sp.prod(h - j for j in range(k)) / sp.factorial(k)


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    classifier = json.loads((HERE / FILES["classifier_report"]).read_text(encoding="utf-8"))
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    assert classifier["marker"] == (
        "CLASSIFIED_EXACT_ISO_N7_BUNDLE_G23_LARGE_ORDER_RESIDUALS_RANK7_G5_FINISH"
    )
    assert classifier["smallest_selected_residual"]["branch"].startswith("edgeless C")
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    n, tail = sp.symbols("n tail", integer=True, nonnegative=True)
    crows = {}
    for rank in range(9):
        crows.update({
            sp.Symbol(f"cE{rank}"): choose(n, rank),
            sp.Symbol(f"cU{rank}"): choose(n - 1, rank),
            sp.Symbol(f"cV{rank}"): choose(n - 1, rank),
            sp.Symbol(f"cW{rank}"): choose(n - 2, rank),
        })

    mode_orders = {
        "no_parent": {"E": n, "U": n - 1, "V": n - 1, "W": n - 2},
        "endpoint_u": {"E": n - 1, "U": n - 1, "V": n - 2, "W": n - 2},
        "endpoint_v": {"E": n - 1, "U": n - 2, "V": n - 1, "W": n - 2},
        "ordinary_parent": {"E": n - 1, "U": n - 2, "V": n - 2, "W": n - 3},
    }

    expected_forms = {
        2: {
            "no_parent": n*(n-4)*(n-3)**2*(n-2)**2*(n-1)*(132*n**2-213*n-107)/sp.Integer(20160),
            "endpoint_u": (n-4)*(n-3)**2*(n-2)**2*(n-1)*(11*n-24)*(12*n**2+3*n-35)/sp.Integer(20160),
            "endpoint_v": (n-4)*(n-3)**2*(n-2)**2*(n-1)*(11*n-24)*(12*n**2+3*n-35)/sp.Integer(20160),
            "ordinary_parent": (n-4)*(n-3)**2*(n-2)*(n-1)*(132*n**4-561*n**3-661*n**2+4974*n-2240)/sp.Integer(20160),
        },
        3: {
            "no_parent": n*(n-3)*(n-2)**2*(n-1)*(138*n**3-565*n**2+538*n+366)/sp.Integer(2520),
            "endpoint_u": (n-3)*(n-2)**2*(n-1)*(138*n**4-565*n**3+468*n**2+961*n-1260)/sp.Integer(2520),
            "endpoint_v": (n-3)*(n-2)**2*(n-1)*(138*n**4-565*n**3+468*n**2+961*n-1260)/sp.Integer(2520),
            "ordinary_parent": (n-3)*(n-2)*(n-1)*(138*n**5-883*n**4+1612*n**3+2230*n**2-9748*n+3360)/sp.Integer(2520),
        },
    }

    rows = {}
    stream = hashlib.sha256()
    for index in (2, 3):
        rows[f"G{index}"] = {}
        for mode, orders in mode_orders.items():
            drows = {
                sp.Symbol(f"d{family}{rank}"): choose(order, rank)
                for family, order in orders.items()
                for rank in range(9)
            }
            direct = sp.factor(coefficients[index].subs({**crows, **drows}, simultaneous=True))
            assert sp.cancel(direct - expected_forms[index][mode]) == 0, (index, mode)
            numerator, denominator = sp.fraction(sp.cancel(direct))
            assert not denominator.free_symbols and denominator > 0
            shifted = sp.Poly(sp.expand(numerator.subs(n, tail + THRESHOLD)), tail)
            shifted_coefficients = shifted.all_coeffs()
            assert all(value >= 0 for value in shifted_coefficients), (index, mode)
            assert shifted_coefficients[0] > 0 and shifted_coefficients[-1] > 0
            stream.update(
                f"G{index}:{mode}:{direct}:{shifted.as_expr()}:{shifted_coefficients};".encode()
            )
            rows[f"G{index}"][mode] = {
                "factorization": str(direct),
                "shifted_numerator": str(shifted.as_expr()),
                "shifted_coefficients": list(map(str, shifted_coefficients)),
                "minimum_shifted_coefficient": str(min(shifted_coefficients)),
            }
        assert rows[f"G{index}"]["endpoint_u"] == rows[f"G{index}"]["endpoint_v"]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every edgeless forest C with two distinct marked vertices and "
            "each canonical parent mode D=C, C-u, C-v, or C-p with p ordinary, "
            "the exact rank-seven bundle coefficients G2 and G3 are nonnegative."
        ),
        "coverage": [
            {"orders": "2<=n<=10", "method": "pinned exhaustive all-forest/all-parent finite certificate"},
            {"orders": "n>=11", "method": "independent literal reconstruction and positive shifted numerators"},
            {"orders": "n<=1", "method": "vacuous: no distinct marked pair"},
        ],
        "rows": rows,
        "ordered_row_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_edgeless_G23": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for edgeless C and rank-seven G2/G3. Forests with "
            "one or more edges remain open for these coefficients."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_edgeless_G23": None,
        "mode_minima": {
            coefficient: {
                mode: row["minimum_shifted_coefficient"] for mode, row in modes.items()
            }
            for coefficient, modes in rows.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
