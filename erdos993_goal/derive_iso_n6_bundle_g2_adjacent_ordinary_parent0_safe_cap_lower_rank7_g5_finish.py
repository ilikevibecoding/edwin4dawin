#!/usr/bin/env python3
"""Exact safe-cap lower for adjacent marks and p adjacent to neither mark."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sympy as sp


HERE = Path(__file__).resolve().parent
LOSS = HERE / "iso_n6_bundle_g2_adjacent_ordinary_parent_loss_exact_rank7_g5_finish_20260831.json"
LOSS_SHA256 = "DCEDB94D866F61E6E0CEC1F36346D65388642F1CA9FA7B0E700C5C05D0D654DA"
NOPARENT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
NOPARENT_SHA256 = "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"
CORNER = HERE / "iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json"
CORNER_SHA256 = "E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_lower_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_SAFE_CAP_LOWER_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value-j for j in range(rank))/sp.factorial(rank)


def path(value, rank):
    return choose(value-rank+1, rank)


def main() -> None:
    assert sha256(LOSS) == LOSS_SHA256
    assert sha256(NOPARENT) == NOPARENT_SHA256
    assert sha256(CORNER) == CORNER_SHA256
    loss = json.loads(LOSS.read_text(encoding="utf-8"))
    no_parent_report = json.loads(NOPARENT.read_text(encoding="utf-8"))
    corner = json.loads(CORNER.read_text(encoding="utf-8"))
    assert loss["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT_LOSS_RANK7_G5_FINISH"
    assert corner["corner_count"] == 4

    a = sp.symbols("a0:8", nonnegative=True)
    b = sp.symbols("b0:7", nonnegative=True)
    c = sp.symbols("c0:7", nonnegative=True)
    PA = {rank: sp.Symbol(f"PA{rank}", nonnegative=True) for rank in range(3,7)}
    PB = {rank: sp.Symbol(f"PB{rank}", nonnegative=True) for rank in range(3,7)}
    PW = {rank: sp.Symbol(f"PW{rank}", nonnegative=True) for rank in range(2,7)}
    local = {str(symbol): symbol for symbol in (*a,*b,*c,*PA.values(),*PB.values(),*PW.values())}
    correction = sp.sympify(loss["correction"], locals=local)
    coefficients = {str(variable): sp.expand(sp.diff(correction, variable)) for variable in (*PA.values(),*PB.values(),*PW.values())}

    no_parent_local = {str(symbol): symbol for symbol in (*a,*b,*c)}
    no_parent = sp.expand(sum(sp.sympify(no_parent_report["pieces"][label], locals=no_parent_local)
                              for label in ("A2","L2_AB","L2_AC","K2_BC")))
    n = a[1]
    h = n-1
    neg_pw3 = 4*a[2] + 2*a[3] + 2*b[1] + 2*b[2] + 5*b[3] + 2*c[1] + 2*c[2] + 5*c[3]
    assert sp.expand(coefficients["PW3"] - (2*a[4]-neg_pw3)) == 0
    lower = sp.expand(
        no_parent
        + coefficients["PA4"]*choose(h,2) + coefficients["PA5"]*choose(h,3)
        + coefficients["PB4"]*choose(h,2) + coefficients["PB5"]*choose(h,3)
        - neg_pw3*choose(h,2) + coefficients["PW4"]*choose(h,3)
    )

    t = sp.Symbol("t", nonnegative=True)
    floors = {
        "PA3_PB3_positive": -2*choose(n,2) + path(n,3) + 7*path(n,4) - 2*n,
        "PW2_positive": -2*choose(n,3) + 2*path(n,4) + 7*path(n,5) - 4*choose(n,2),
        "minus_PA5_PB5_positive": -(8*n - 5*path(n,2)),
        "minus_PW4_positive": 2*path(n,2) + 10*path(n,3),
        "B3_C3_lower_positive": 4*n + 9*path(n,2) - 5*choose(n-1,2),
    }
    records = {}
    for label, expression in floors.items():
        shifted = sp.Poly(sp.expand(expression.subs(n,t+14)), t)
        coefficients_shifted = shifted.all_coeffs()
        assert all(value > 0 for value in coefficients_shifted), (label, coefficients_shifted)
        records[label] = {"expression": str(sp.factor(expression)), "shift_N_14": str(shifted.as_expr()), "power_coefficients": [str(value) for value in coefficients_shifted]}
    assert coefficients["PA4"] == -2*n-2*a[2]-5*a[3]-12*c[2]
    assert coefficients["PB4"] == -2*n-2*a[2]-5*a[3]-12*b[2]
    assert coefficients["PA6"] == coefficients["PB6"] == coefficients["PW6"] == 7*n
    assert coefficients["PW5"] == 2*n+2*a[2]+7*b[1]+7*c[1]

    polynomial = sp.Poly(lower, *sorted(lower.free_symbols, key=str))
    report = {
        "marker": MARKER,
        "scope": "N>=14, adjacent marks u,v, ordinary p adjacent to neither mark",
        "occupation_identity": {
            "Q": "G-N[p] contains the adjacent marks u,v",
            "W": "Q-{u,v}",
            "U": "Q-N[v]",
            "V": "Q-N[u]",
            "losses": "PW_r=i_(r-1)(W), PA_r=i_(r-2)(U), PB_r=i_(r-2)(V)",
            "containment": "U,V,W are induced subforests of A-p, hence each has at most H=N-1 vertices",
        },
        "safe_cap_payment": {
            "beneficial_zero": ["PA3","PB3","PA6","PB6","PW2","PW5","PW6"],
            "harmful_caps": {"PA4":"C(N-1,2)","PA5":"C(N-1,3)","PB4":"C(N-1,2)","PB5":"C(N-1,3)","PW4":"C(N-1,3)"},
            "mixed_PW3": "write K_PW3=2*a4-negPW3, drop 2*a4*PW3 and use PW3<=C(N-1,2)",
            "negPW3": str(neg_pw3),
        },
        "sign_floors": records,
        "row_corner_reduction": {
            "b3_c3": "PATH; strengthened derivative uses -5*C(N-1,2) and the displayed positive floor",
            "b4_c4": "PATH; unchanged pinned no-parent derivative for N>=14",
            "b5_c5_b6_c6": "EDGELESS; unchanged nonpositive derivatives",
            "b2_c2": "both endpoints",
            "corner_count": 4,
            "pinned_no_parent_corner_report": {"file": CORNER.name, "sha256": CORNER_SHA256},
        },
        "ordinary_lower": str(sp.factor(lower)),
        "ordinary_lower_sha256": hashlib.sha256(str(lower).encode()).hexdigest().upper(),
        "lower_terms": len(polynomial.terms()),
        "status": "exact safe lower-bound reduction; positivity remains for finite census/Bernstein certification",
        "pins": {"parent_loss": {"file": LOSS.name, "sha256": LOSS_SHA256}, "no_parent": {"file": NOPARENT.name, "sha256": NOPARENT_SHA256}},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "lower_terms": report["lower_terms"], "lower_sha256": report["ordinary_lower_sha256"], "signs": records}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
