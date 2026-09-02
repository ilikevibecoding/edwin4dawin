#!/usr/bin/env python3
"""Fail-closed isolate-padding theorem for no-parent common0/sum1 rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_no_parent_isolate_padding_safe_cap_rank7_g5_finish import (
    extension_value,
    padding_coefficients,
)
from probe_iso_n7_bundle_g3_sum1_no_parent_nested_shadow_moment_rank7_g5_finish import reduced
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_no_parent_isolate_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_ISOLATE_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_ISOLATE_PADDING_SAFE_CAP_RANK7_G5_FINISH"
TINY_MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_PADDING_TINY_AUDIT_RANK7_G5_FINISH"

FILES = {
    "padding_probe_source": "probe_iso_n7_bundle_g3_sum1_no_parent_isolate_padding_safe_cap_rank7_g5_finish.py",
    "tiny_audit_source": "audit_iso_n7_bundle_g3_sum1_no_parent_padding_tiny_rank7_g5_finish.py",
    "tiny_audit_report": "iso_n7_bundle_g3_sum1_no_parent_padding_tiny_audit_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{
        f"H{index}_probe_report": (
            "iso_n7_bundle_g3_sum1_no_parent_isolate_padding_H"
            f"{index}_safe_cap_h{4 if index == 1 else 2}_probe_"
            "rank7_g5_finish_20260831.json"
        )
        for index in range(1, 9)
    },
}
EXPECTED = {
    "padding_probe_source": "9001D2619133287F72375B698A8125B552908E870E579897CDAA595857263001",
    "tiny_audit_source": "26CC2825F5A6B6F5FD44018F8494E687DD7BFF96972E875A9E54297B4EC59EE0",
    "tiny_audit_report": "A971D40B7918F1E1F02CEEF665C661BB3B7B59587F8B9D1EE5D1EA9C809A9226",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_probe_report": "47EA0F8F7BF8179595F39AE8570201729208019BFEA833E39B48245E40D02F7E",
    "H2_probe_report": "435B0F1C44AA6F6D8BE632A260B26CA8C5D3850BCC49585FC4C4D4FD93B5F760",
    "H3_probe_report": "D41260C7593FF01CEB19A94561A532FAD414D7A23AB8053FF92A511B85051102",
    "H4_probe_report": "0A40C5E1A40F46FD9EBA1AE4201A5DA939A9C624B3A9A28D9E7E7B3269A9ECE0",
    "H5_probe_report": "6D7C7345581215C6A653DE21BA00ED821CF3F4E67768D3545C9585B19DE53561",
    "H6_probe_report": "82579B2DADD46C11764FDBDDC2AE00B2EFFB26047DE536F777E9B4BE4269691E",
    "H7_probe_report": "64446376F7C66EFD3C1F47E6FDF4ABF8EB6D772BFF03D0D4AADCBF32B46F6549",
    "H8_probe_report": "B539431FB995F234E4E564EBB44D82074EE5FB9A1E77EEDD83EC750598BC7D81",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_rows(graph: nx.Graph, root: int) -> tuple[dict[int, int], dict[int, int]]:
    vertices = tuple(graph.nodes())
    rows = {rank: 0 for rank in range(9)}
    rooted = {rank: 0 for rank in range(8)}
    for mask in range(1 << len(vertices)):
        selected = tuple(vertices[index] for index in range(len(vertices)) if mask & (1 << index))
        if any(graph.has_edge(u, v) for index, u in enumerate(selected) for v in selected[index + 1 :]):
            continue
        rank = len(selected)
        if rank <= 8:
            rows[rank] += 1
        if root in selected and rank <= 7:
            rooted[rank] += 1
    return rows, rooted


def tiny_rows(h, I, J, coefficients):
    exact_rows = []
    for order in (2, 3):
        for graph in nx.graph_atlas_g():
            if graph.number_of_nodes() != order or not nx.is_forest(graph):
                continue
            for root in graph.nodes():
                rows, rooted = independent_rows(graph, root)
                substitutions = {h: order}
                substitutions.update({I[rank]: rows[rank] for rank in range(2, 9)})
                substitutions.update({J[rank]: rooted[rank] for rank in range(1, 8)})
                value = sp.expand(coefficients[1].subs(substitutions))
                assert not value.free_symbols
                exact_rows.append({
                    "order": order,
                    "edges": sorted(list(sorted(edge)) for edge in graph.edges()),
                    "root": root,
                    "H1": int(value),
                })
    return exact_rows


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key

    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_probe_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER
        assert probe["newton_index"] == index
        assert probe["threshold_h"] == (4 if index == 1 else 2)
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["summary"]["first_negative"] == []
        probes[index] = probe

    h, I, J, coefficients = padding_coefficients()
    certificates = {}
    total_controls = total_scalars = 0
    global_minimum = None
    for index in range(1, 9):
        value_h, variables, value, exact_coefficient, lower, audit = extension_value(index)
        assert value_h == h and sp.expand(exact_coefficient - coefficients[index]) == 0
        threshold = 4 if index == 1 else 2
        tail = sp.Symbol("tail", nonnegative=True)
        shifted = sp.cancel(value.subs(h, tail + threshold))
        numerator, denominator = map(sp.expand, sp.fraction(shifted))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(coefficient > 0 for coefficient in sp.Poly(denominator, tail).all_coeffs())
        assert sp.expand(
            denominator
            - sp.sympify(probes[index]["summary"]["positive_denominator"], locals={"tail": tail})
        ) == 0
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probes[index]["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        local_minimum = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local_minimum > 0 and certificate["exact_power_inversion"] is True
        global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
        total_controls += certificate["bernstein_coefficients"]
        total_scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {
            "threshold_h": threshold,
            "exact_newton_coefficient": str(coefficients[index]),
            "safe_lower": str(lower),
            "root_cap_audit": audit,
            "positive_denominator": str(sp.factor(denominator)),
            **certificate,
        }

    tiny = json.loads((HERE / FILES["tiny_audit_report"]).read_text(encoding="utf-8"))
    assert tiny["marker"] == TINY_MARKER
    exact_rows = tiny_rows(h, I, J, coefficients)
    assert exact_rows == tiny["rooted_rows"]
    assert len(exact_rows) == 13 and min(row["H1"] for row in exact_rows) == 92

    edgeless_substitutions = {h: 1}
    edgeless_substitutions.update({I[rank]: 0 for rank in range(2, 9)})
    edgeless_substitutions.update({J[1]: 1, **{J[rank]: 0 for rank in range(2, 8)}})
    edgeless_newton = {
        index: int(sp.expand(coefficient.subs(edgeless_substitutions)))
        for index, coefficient in coefficients.items()
    }
    assert edgeless_newton == {int(key): value for key, value in tiny["one_vertex_edgeless_newton_coefficients"].items()}

    # Reconstruct the exact full marked expression after adding isolates.
    m, W, R, exact, _sum0, _loss_coefficients, _b, _c = reduced()
    isolates = sp.Symbol("isolates", nonnegative=True, integer=True)
    padded_w = {
        rank: sp.expand(sum(choose_poly(isolates, rank-j) * I[j] for j in range(rank+1)))
        for rank in range(2, 9)
    }
    padded_r = {
        rank: sp.expand(sum(choose_poly(isolates, rank-j) * J[j] for j in range(rank+1)))
        for rank in range(2, 8)
    }
    padded = sp.expand(exact.subs({
        m: h + isolates,
        **{W[rank]: padded_w[rank] for rank in range(2, 9)},
        **{R[rank]: padded_r[rank] for rank in range(2, 8)},
    }, simultaneous=True))
    recomposed = sp.expand(sum(coefficients[index] * choose_poly(isolates, index) for index in range(9)))
    assert sp.expand(padded - recomposed) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every rooted forest (H,x), all positive-order Newton coefficients in "
            "the no-parent common0/sum1 G3 expression for H+sK1 are positive. Thus "
            "G3(H+sK1,x)>=G3(H,x) whenever the base value is nonnegative."
        ),
        "identity": "G3_sum1_no_parent(H+sK1,x)=sum_{j=0}^8 H_j(H,x)*C(s,j)",
        "H0_scope_guard": "H0 is the base G3 value and is not proved by this transfer theorem.",
        "tiny_exact_audit": {
            "rooted_forests_orders": [2, 3],
            "rooted_rows": len(exact_rows),
            "minimum_H1": min(row["H1"] for row in exact_rows),
            "one_vertex_edgeless_newton_coefficients": edgeless_newton,
        },
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8,
            "bernstein_controls": total_controls,
            "tail_power_coefficients": total_scalars,
            "minimum_tail_power_coefficient": str(global_minimum),
            "exact_power_inversion": True,
            "exact_newton_recomposition": True,
            "finite_tiny_rooted_rows": len(exact_rows),
        },
        "coverage_gap_within_positive_order_no_parent_sum1_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "No-parent nonadjacent/common0/sum1 rank-seven G3 isolate padding only; "
            "base positivity, other geometries, and parent modes are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_positive_order_no_parent_sum1_padding": None,
        **report["aggregate"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
