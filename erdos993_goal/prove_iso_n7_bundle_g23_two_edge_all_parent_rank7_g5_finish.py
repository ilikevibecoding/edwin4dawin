#!/usr/bin/env python3
"""Exact universal G2/G3 theorem for every two-edge marked core.

After deleting isolates, a two-edge forest is P3 or 2K2.  This producer
enumerates every literal placement of the two ordered marks and of the
canonical parent, quotients only byte-identical C/D row signatures, then
reconstructs G2/G3 and proves shifted numerator positivity for n>=11.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g23_two_edge_all_parent_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G23_TWO_EDGE_ALL_PARENT_RANK7_G5_FINISH"
THRESHOLD = 11
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "classifier_source": "classify_iso_n7_bundle_g23_large_order_residuals_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g23_large_order_residual_classifier_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "one_edge_source": "prove_iso_n7_bundle_g23_one_edge_all_parent_rank7_g5_finish.py",
    "one_edge_report": "iso_n7_bundle_g23_one_edge_all_parent_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "classifier_source": "CE3D39D6D36D1A01B84D398FA3B9218DF4051AB616951E5823096CF5F5FF21AF",
    "classifier_report": "DB0B50A06C7ED208BAF7E3F88B64770D1D20BFD17C391B72E12B35AB0256222E",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "one_edge_source": "321BDC8EAB48A5D72EBE531DE7A5E9AF30B7490E4AAB30F368EC96EDCD0CF2D9",
    "one_edge_report": "7929DD78B0A55269615226D9A87124AC9F53FB866DD6E3019E574F59990036C5",
}
CORES = {
    "P3": {"order": 3, "edges": ((0, 1), (1, 2))},
    "2K2": {"order": 4, "edges": ((0, 1), (2, 3))},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h - j for j in range(k)) / sp.factorial(k)


def core_independence_row(order: int, edges, deleted) -> tuple[int, ...]:
    remaining = [vertex for vertex in range(order) if vertex not in deleted]
    row = [0] * 9
    for mask in range(1 << len(remaining)):
        selected = {
            remaining[index]
            for index in range(len(remaining))
            if mask & (1 << index)
        }
        if all(not (left in selected and right in selected) for left, right in edges):
            row[len(selected)] += 1
    return tuple(row)


def deletion_signature(order: int, edges, removed) -> tuple[tuple[int, ...], int]:
    core_deleted = frozenset(value for value in removed if isinstance(value, int))
    isolated_deleted = len({value for value in removed if not isinstance(value, int)})
    return core_independence_row(order, edges, core_deleted), isolated_deleted


def row_expression(signature, core_order: int, n, rank: int):
    core_row, isolated_deleted = signature
    free_isolates = n - core_order - isolated_deleted
    return sp.expand(sum(
        count * choose(free_isolates, rank - core_rank)
        for core_rank, count in enumerate(core_row)
        if count and core_rank <= rank
    ))


def literal_cases(core_order: int, edges):
    marks = []
    marks.extend(
        (u, v)
        for u in range(core_order)
        for v in range(core_order)
        if u != v
    )
    marks.extend((u, "isolated_v") for u in range(core_order))
    marks.extend(("isolated_u", v) for v in range(core_order))
    marks.append(("isolated_u", "isolated_v"))

    cases = []
    for u, v in marks:
        parents = [
            ("no_parent", None),
            ("endpoint_u", u),
            ("endpoint_v", v),
            ("ordinary_parent_isolate", "isolated_p"),
        ]
        parents.extend(
            ("ordinary_parent_core", p)
            for p in range(core_order)
            if p not in {u, v}
        )
        for parent_case, p in parents:
            removals = ((), (u,), (v,), (u, v))
            c_signatures = tuple(
                deletion_signature(core_order, edges, removed)
                for removed in removals
            )
            d_signatures = tuple(
                deletion_signature(
                    core_order,
                    edges,
                    tuple(removed) + (() if p is None else (p,)),
                )
                for removed in removals
            )
            roles = {value for value in (u, v, p) if value is not None and not isinstance(value, int)}
            cases.append({
                "u": str(u),
                "v": str(v),
                "parent_case": parent_case,
                "p": None if p is None else str(p),
                "minimum_order": core_order + len(roles),
                "signature": (c_signatures, d_signatures),
            })
    return cases


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    classifier = json.loads((HERE / FILES["classifier_report"]).read_text(encoding="utf-8"))
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    one_edge = json.loads((HERE / FILES["one_edge_report"]).read_text(encoding="utf-8"))
    assert classifier["marker"] == (
        "CLASSIFIED_EXACT_ISO_N7_BUNDLE_G23_LARGE_ORDER_RESIDUALS_RANK7_G5_FINISH"
    )
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    assert one_edge["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G23_ONE_EDGE_ALL_PARENT_RANK7_G5_FINISH"
    )

    # A two-edge forest without isolates is exactly P3 or 2K2.
    assert all(len(core["edges"]) == 2 for core in CORES.values())
    assert {core["order"] for core in CORES.values()} == {3, 4}
    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    n, tail = sp.symbols("n tail", integer=True, nonnegative=True)
    family_names = "EUVW"

    core_reports = {}
    global_stream = hashlib.sha256()
    global_minima = {2: None, 3: None}
    for core_name, core in CORES.items():
        order, edges = core["order"], core["edges"]
        cases = literal_cases(order, edges)
        expected_literal = 73 if core_name == "P3" else 136
        expected_unique = 43 if core_name == "P3" else 28
        assert len(cases) == expected_literal
        grouped = defaultdict(list)
        literal_stream = hashlib.sha256()
        for case in cases:
            grouped[case["signature"]].append({
                key: value for key, value in case.items() if key != "signature"
            })
            literal_stream.update(
                f"{core_name}:{case['u']}:{case['v']}:{case['parent_case']}:{case['p']}:{case['minimum_order']}:{case['signature']};".encode()
            )
        assert len(grouped) == expected_unique

        unique_rows = {"G2": [], "G3": []}
        for signature_index, (signature, represented_cases) in enumerate(
            sorted(grouped.items(), key=lambda item: str(item[0]))
        ):
            c_signatures, d_signatures = signature
            crows = {
                sp.Symbol(f"c{family}{rank}"): row_expression(
                    c_signatures[family_index], order, n, rank
                )
                for family_index, family in enumerate(family_names)
                for rank in range(9)
            }
            drows = {
                sp.Symbol(f"d{family}{rank}"): row_expression(
                    d_signatures[family_index], order, n, rank
                )
                for family_index, family in enumerate(family_names)
                for rank in range(9)
            }
            for coefficient_index in (2, 3):
                direct = sp.factor(
                    coefficients[coefficient_index].subs(
                        {**crows, **drows}, simultaneous=True
                    )
                )
                numerator, denominator = sp.fraction(sp.together(direct))
                assert not denominator.free_symbols and denominator > 0
                shifted = sp.Poly(
                    sp.expand(numerator.subs(n, tail + THRESHOLD)), tail
                )
                shifted_coefficients = shifted.all_coeffs()
                assert all(value >= 0 for value in shifted_coefficients), (
                    core_name, signature_index, coefficient_index, represented_cases[0]
                )
                assert shifted_coefficients[0] > 0 and shifted_coefficients[-1] > 0
                local_minimum = min(shifted_coefficients)
                if global_minima[coefficient_index] is None:
                    global_minima[coefficient_index] = local_minimum
                else:
                    global_minima[coefficient_index] = min(
                        global_minima[coefficient_index], local_minimum
                    )
                record = {
                    "signature_index": signature_index,
                    "literal_case_multiplicity": len(represented_cases),
                    "representative": represented_cases[0],
                    "factorization": str(direct),
                    "positive_denominator": str(denominator),
                    "shifted_coefficients": list(map(str, shifted_coefficients)),
                    "minimum_shifted_coefficient": str(local_minimum),
                }
                unique_rows[f"G{coefficient_index}"].append(record)
                global_stream.update(
                    f"{core_name}:G{coefficient_index}:{signature}:{record};".encode()
                )
        for coefficient_rows in unique_rows.values():
            assert sum(row["literal_case_multiplicity"] for row in coefficient_rows) == expected_literal
        core_reports[core_name] = {
            "core_order": order,
            "edges": [list(edge) for edge in edges],
            "literal_cases_per_coefficient": expected_literal,
            "unique_CD_row_signatures": expected_unique,
            "literal_case_stream_sha256": literal_stream.hexdigest().upper(),
            "unique_rows": unique_rows,
        }

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest C with exactly two edges, every distinct marked "
            "pair, and each compatible canonical parent mode, the exact rank-seven "
            "bundle coefficients G2 and G3 are nonnegative."
        ),
        "coverage": [
            {"orders": "2<=n<=10", "method": "pinned exhaustive all-forest/all-parent finite certificate"},
            {"orders": "n>=11", "method": "exhaustive P3/2K2 role classification and positive shifted numerators"},
        ],
        "cores": core_reports,
        "literal_cases_per_coefficient": sum(
            core["literal_cases_per_coefficient"] for core in core_reports.values()
        ),
        "unique_CD_row_signatures": sum(
            core["unique_CD_row_signatures"] for core in core_reports.values()
        ),
        "global_shifted_minima": {
            f"G{index}": str(value) for index, value in global_minima.items()
        },
        "ordered_unique_row_stream_sha256": global_stream.hexdigest().upper(),
        "coverage_gap_within_two_edge_G23": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for exactly-two-edge C and rank-seven G2/G3. "
            "Cores with three or more edges remain open for these coefficients."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    assert report["literal_cases_per_coefficient"] == 209
    assert report["unique_CD_row_signatures"] == 71
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "literal_cases_per_coefficient": report["literal_cases_per_coefficient"],
        "unique_CD_row_signatures": report["unique_CD_row_signatures"],
        "global_shifted_minima": report["global_shifted_minima"],
        "coverage_gap_within_two_edge_G23": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
