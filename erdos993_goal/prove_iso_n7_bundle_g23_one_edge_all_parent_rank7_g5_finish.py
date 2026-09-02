#!/usr/bin/env python3
"""Exact universal G2/G3 theorem for every one-edge marked core.

There are four literal marked placements relative to the unique edge (the two
one-endpoint cases are kept separate) and seven compatible ordinary-parent
placements.  The producer reconstructs G2/G3 literally, substitutes the exact
independence rows, and proves every n>=11 row by shifted numerator positivity.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g23_one_edge_all_parent_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G23_ONE_EDGE_ALL_PARENT_RANK7_G5_FINISH"
THRESHOLD = 11
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "classifier_source": "classify_iso_n7_bundle_g23_large_order_residuals_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g23_large_order_residual_classifier_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "edgeless_source": "prove_iso_n7_bundle_g23_edgeless_all_parent_rank7_g5_finish.py",
    "edgeless_report": "iso_n7_bundle_g23_edgeless_all_parent_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "classifier_source": "CE3D39D6D36D1A01B84D398FA3B9218DF4051AB616951E5823096CF5F5FF21AF",
    "classifier_report": "DB0B50A06C7ED208BAF7E3F88B64770D1D20BFD17C391B72E12B35AB0256222E",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "edgeless_source": "E2986C7F28297FBABBAD1B2A3BCF71FBCF37909273F1EC0322ED9ADCB716AF3B",
    "edgeless_report": "E3AED90CE5930061F653683794234F5A816A466945B69525202BB86B45F451E1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h - j for j in range(k)) / sp.factorial(k)


def independent_count(order, rank, has_edge):
    """Independent rank sets of an edgeless or exactly-one-edge graph."""
    return choose(order, rank) - (
        choose(order - 2, rank - 2) if has_edge else 0
    )


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    classifier = json.loads((HERE / FILES["classifier_report"]).read_text(encoding="utf-8"))
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    edgeless = json.loads((HERE / FILES["edgeless_report"]).read_text(encoding="utf-8"))
    assert classifier["marker"] == (
        "CLASSIFIED_EXACT_ISO_N7_BUNDLE_G23_LARGE_ORDER_RESIDUALS_RANK7_G5_FINISH"
    )
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    assert edgeless["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G23_EDGELESS_ALL_PARENT_RANK7_G5_FINISH"
    )

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    n, tail = sp.symbols("n tail", integer=True, nonnegative=True)
    c_orders = {"E": n, "U": n - 1, "V": n - 1, "W": n - 2}

    # Whether the unique edge survives in each C deletion row.  The four rows
    # are exhaustive according as two, one (oriented), or zero edge endpoints
    # are the two marks.
    marked_classes = {
        "edge_is_uv": {"E": 1, "U": 0, "V": 0, "W": 0},
        "edge_incident_u": {"E": 1, "U": 0, "V": 1, "W": 0},
        "edge_incident_v": {"E": 1, "U": 1, "V": 0, "W": 0},
        "edge_disjoint_marks": {"E": 1, "U": 1, "V": 1, "W": 1},
    }
    minimum_orders = {
        "edge_is_uv": 2,
        "edge_incident_u": 3,
        "edge_incident_v": 3,
        "edge_disjoint_marks": 4,
    }

    cases = []
    for marked_class, survives in marked_classes.items():
        cases.append({
            "marked_class": marked_class,
            "parent_case": "no_parent",
            "minimum_order": minimum_orders[marked_class],
            "d_rows": {family: (c_orders[family], survives[family]) for family in "EUVW"},
        })
        cases.append({
            "marked_class": marked_class,
            "parent_case": "endpoint_u",
            "minimum_order": minimum_orders[marked_class],
            "d_rows": {
                "E": (n - 1, survives["U"]),
                "U": (n - 1, survives["U"]),
                "V": (n - 2, survives["W"]),
                "W": (n - 2, survives["W"]),
            },
        })
        cases.append({
            "marked_class": marked_class,
            "parent_case": "endpoint_v",
            "minimum_order": minimum_orders[marked_class],
            "d_rows": {
                "E": (n - 1, survives["V"]),
                "U": (n - 2, survives["W"]),
                "V": (n - 1, survives["V"]),
                "W": (n - 2, survives["W"]),
            },
        })
        # An ordinary isolated p preserves the edge-survival flag in every row.
        cases.append({
            "marked_class": marked_class,
            "parent_case": "ordinary_parent_isolate",
            "minimum_order": minimum_orders[marked_class] + 1,
            "d_rows": {
                "E": (n - 1, survives["E"]),
                "U": (n - 2, survives["U"]),
                "V": (n - 2, survives["V"]),
                "W": (n - 3, survives["W"]),
            },
        })

    # If exactly one or zero edge endpoints are marked, an ordinary p may be
    # an unmarked edge endpoint.  Deleting it kills the only edge in every D row.
    for marked_class in ("edge_incident_u", "edge_incident_v", "edge_disjoint_marks"):
        cases.append({
            "marked_class": marked_class,
            "parent_case": "ordinary_parent_edge_endpoint",
            "minimum_order": minimum_orders[marked_class],
            "d_rows": {
                "E": (n - 1, 0),
                "U": (n - 2, 0),
                "V": (n - 2, 0),
                "W": (n - 3, 0),
            },
        })
    # 4*(no parent + 2 endpoint + ordinary isolate) + 3 endpoint-p cases.
    assert len(cases) == 19
    assert len({(row["marked_class"], row["parent_case"]) for row in cases}) == 19

    rows = {"G2": [], "G3": []}
    stream = hashlib.sha256()
    for case in cases:
        marked_class = case["marked_class"]
        survives = marked_classes[marked_class]
        crows = {
            sp.Symbol(f"c{family}{rank}"): independent_count(
                c_orders[family], rank, survives[family]
            )
            for family in "EUVW"
            for rank in range(9)
        }
        drows = {
            sp.Symbol(f"d{family}{rank}"): independent_count(order, rank, has_edge)
            for family, (order, has_edge) in case["d_rows"].items()
            for rank in range(9)
        }
        for index in (2, 3):
            direct = sp.factor(
                coefficients[index].subs({**crows, **drows}, simultaneous=True)
            )
            numerator, denominator = sp.fraction(sp.together(direct))
            assert not denominator.free_symbols and denominator > 0
            shifted = sp.Poly(sp.expand(numerator.subs(n, tail + THRESHOLD)), tail)
            shifted_coefficients = shifted.all_coeffs()
            assert all(value >= 0 for value in shifted_coefficients), (
                index, marked_class, case["parent_case"]
            )
            assert shifted_coefficients[0] > 0 and shifted_coefficients[-1] > 0
            record = {
                "marked_class": marked_class,
                "parent_case": case["parent_case"],
                "minimum_order": case["minimum_order"],
                "factorization": str(direct),
                "positive_denominator": str(denominator),
                "shifted_numerator": str(shifted.as_expr()),
                "shifted_coefficients": list(map(str, shifted_coefficients)),
                "minimum_shifted_coefficient": str(min(shifted_coefficients)),
            }
            rows[f"G{index}"].append(record)
            stream.update(f"G{index}:{record};".encode())

    # Literal u/v symmetry is audited, not used to omit either orientation.
    for coefficient_rows in rows.values():
        keyed = {
            (row["marked_class"], row["parent_case"]): row["factorization"]
            for row in coefficient_rows
        }
        swap_class = {
            "edge_is_uv": "edge_is_uv",
            "edge_incident_u": "edge_incident_v",
            "edge_incident_v": "edge_incident_u",
            "edge_disjoint_marks": "edge_disjoint_marks",
        }
        swap_parent = {
            "no_parent": "no_parent",
            "endpoint_u": "endpoint_v",
            "endpoint_v": "endpoint_u",
            "ordinary_parent_isolate": "ordinary_parent_isolate",
            "ordinary_parent_edge_endpoint": "ordinary_parent_edge_endpoint",
        }
        for (marked_class, parent_case), value in keyed.items():
            assert value == keyed[(swap_class[marked_class], swap_parent[parent_case])]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest C with exactly one edge, every distinct marked "
            "pair, and each compatible canonical parent mode, the exact rank-seven "
            "bundle coefficients G2 and G3 are nonnegative."
        ),
        "coverage": [
            {"orders": "2<=n<=10", "method": "pinned exhaustive all-forest/all-parent finite certificate"},
            {"orders": "n>=11", "method": "19-case literal reconstruction and positive shifted numerators"},
        ],
        "marked_classes": marked_classes,
        "literal_cases_per_coefficient": len(cases),
        "rows": rows,
        "endpoint_and_mark_swap_symmetry_checked": True,
        "ordered_row_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_one_edge_G23": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for exactly-one-edge C and rank-seven G2/G3. "
            "Cores with two or more edges remain open for these coefficients."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "literal_cases_per_coefficient": len(cases),
        "coverage_gap_within_one_edge_G23": None,
        "global_shifted_minima": {
            coefficient: min(
                sp.sympify(row["minimum_shifted_coefficient"]) for row in coefficient_rows
            )
            for coefficient, coefficient_rows in rows.items()
        },
    }, indent=2, sort_keys=True, default=str))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
