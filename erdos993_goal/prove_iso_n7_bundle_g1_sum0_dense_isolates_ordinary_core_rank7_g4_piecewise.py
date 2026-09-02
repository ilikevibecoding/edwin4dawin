#!/usr/bin/env python3
"""Fail-closed dense-isolate G1 theorem for an ordinary core parent.

The unmarked graph is canonically W=H+rK1, where H is induced by the
non-isolated vertices.  The deleted ordinary parent p lies in H.  Sets
containing p are counted through L=H-N[p].  Independent universal boxes for H
and L are certified by an exact affine-cube/Bernstein argument.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients
from probe_iso_n7_bundle_g1_sum0_dense_isolates_ordinary_core_rank7_g4_piecewise import (
    certify_affine_box,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import choose
from prove_iso_n7_bundle_g1_sum0_dense_isolates_endpoint_rank7_g4_piecewise import (
    rows_with_two_marks,
    substitute_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_core_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ORDINARY_CORE_RANK7_G4_PIECEWISE"
THRESHOLD_M = 20
CORE_FRACTION = sp.Rational(1, 10)
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "dense_no_parent_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "dense_no_parent_report": "iso_n7_bundle_g1_sum0_dense_isolates_exact_rank7_g4_piecewise_20260831.json",
    "endpoint_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_endpoint_rank7_g4_piecewise.py",
    "endpoint_report": "iso_n7_bundle_g1_sum0_dense_isolates_endpoint_exact_rank7_g4_piecewise_20260831.json",
    "ordinary_isolate_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_ordinary_isolate_rank7_g4_piecewise.py",
    "ordinary_isolate_report": "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_isolate_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g1_sum0_dense_isolates_ordinary_core_rank7_g4_piecewise.py",
    "probe_report": "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_core_probe_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "dense_no_parent_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "dense_no_parent_report": "683A7ACF848B0C415834C4C3382DC28883CE734230910AA4DE2D87FB80B724C7",
    "endpoint_source": "E86BDA463214959A97FD83D443B7B96721ACBDCD06412AD62916D6644BA481C1",
    "endpoint_report": "D698613BD1A3866D78F9E8532506682ABD1217603AB2500B6B2544F4724DE53D",
    "ordinary_isolate_source": "F0C47444A3F97FE742079FB5E967957B77B3B6D73FC764FF29D46652698DC6CA",
    "ordinary_isolate_report": "D9AD1544A889BA953C47A87AD02400FA83B50FC8E801A3CAC6A54035E23C9A9A",
    "probe_source": "7421EBE6B1216C56721FAD07471157BF4E640FF089423A4F944D2458AAAA7DAB",
    "probe_report": "E3C945AD6D9DB4AD55B45AD0F6026E81138EF3F57A110274E57026FF493402E4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probe = json.loads((HERE/FILES["probe_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ORDINARY_CORE_RANK7_G4_PIECEWISE"
    )
    assert probe["negative_worst_tail_scalar_coefficients"] == 0

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    m, tail, core_parameter = sp.symbols("m tail core_parameter", nonnegative=True)
    hlevel = {
        k: sp.Symbol(f"H{k}_parameter", nonnegative=True) for k in range(2, 9)
    }
    llevel = {
        k: sp.Symbol(f"L{k}_parameter", nonnegative=True) for k in range(1, 7)
    }
    h = CORE_FRACTION*m*core_parameter
    isolates = m-h
    H = {
        0: sp.Integer(1), 1: h,
        **{k: h**k*hlevel[k]/sp.factorial(k) for k in range(2, 9)},
    }
    L = {
        0: sp.Integer(1),
        **{k: h**k*llevel[k]/sp.factorial(k) for k in range(1, 7)},
    }
    W = {
        k: sp.expand(sum(choose(isolates, k-j)*H[j] for j in range(k+1)))
        for k in range(9)
    }
    T = {
        0: sp.Integer(0),
        **{
            k: sp.expand(sum(
                choose(isolates, k-1-j)*L[j] for j in range(k)
            ))
            for k in range(1, 8)
        },
    }
    D = {k: sp.expand(W[k]-T.get(k, 0)) for k in range(9)}
    value = substitute_rows(
        generic, rows_with_two_marks(W), rows_with_two_marks(D)
    )

    # Independently verify the exact ordinary-parent reduction in abstract rows.
    abstract_W = {k: sp.Symbol(f"W{k}") for k in range(9)}
    abstract_T = {k: sp.Symbol(f"T{k}") for k in range(9)}
    abstract_D = {k: abstract_W[k]-abstract_T[k] for k in range(9)}
    abstract_value = substitute_rows(
        generic, rows_with_two_marks(abstract_W), rows_with_two_marks(abstract_D)
    )
    expected = (
        -8*abstract_T[3]*abstract_W[3]-8*abstract_T[3]*abstract_W[4]
        +34*abstract_T[3]*abstract_W[5]+34*abstract_T[3]*abstract_W[6]
        +8*abstract_T[3]*abstract_W[7]-8*abstract_T[4]*abstract_W[3]
        -68*abstract_T[4]*abstract_W[4]-26*abstract_T[4]*abstract_W[5]
        +2*abstract_T[4]*abstract_W[6]+34*abstract_T[5]*abstract_W[3]
        -26*abstract_T[5]*abstract_W[4]-12*abstract_T[5]*abstract_W[5]
        +34*abstract_T[6]*abstract_W[3]+2*abstract_T[6]*abstract_W[4]
        +8*abstract_T[7]*abstract_W[3]+8*abstract_W[3]**2
        +24*abstract_W[3]*abstract_W[4]-64*abstract_W[3]*abstract_W[5]
        -106*abstract_W[3]*abstract_W[6]-51*abstract_W[3]*abstract_W[7]
        -8*abstract_W[3]*abstract_W[8]+80*abstract_W[4]**2
        +90*abstract_W[4]*abstract_W[5]-12*abstract_W[4]*abstract_W[6]
        -10*abstract_W[4]*abstract_W[7]+39*abstract_W[5]**2
        +10*abstract_W[5]*abstract_W[6]
    )
    assert sp.expand(abstract_value-expected) == 0
    assert sp.expand(value-expected.subs({
        **{abstract_W[k]: W[k] for k in range(9)},
        **{abstract_T[k]: T.get(k, 0) for k in range(9)},
    }, simultaneous=True)) == 0

    shifted = sp.expand(value.subs(m, tail+THRESHOLD_M))
    base_variables = (core_parameter, *(hlevel[k] for k in range(2, 9)))
    affine_variables = tuple(llevel[k] for k in range(1, 7))
    certificate = certify_affine_box(
        shifted, base_variables, affine_variables, tail
    )
    assert certificate["negative_worst_tail_scalar_coefficients"] == 0
    assert certificate["minimum_worst_tail_scalar_coefficient"] == "0"
    assert certificate["exact_power_inversion"] is True
    assert certificate == probe["summary"]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let the unmarked graph be W=H+rK1, where H is induced by the "
            "non-isolated vertices and |H|<=|W|/10. If an ordinary deleted "
            "parent p lies in H, rank-seven bundle G1 is nonnegative."
        ),
        "coverage": [
            {
                "orders": "n<=21",
                "method": (
                    "empty geometry: p in the non-isolated core gives |H|>=2, "
                    "while |H|<=|W|/10 forces |W|>=20 and n>=22"
                ),
            },
            {
                "orders": "n>=22",
                "condition": "W=H+rK1, |H|<=|W|/10, p in H",
                "method": (
                    "literal reconstruction, exact containing-p recurrence, "
                    "and exact affine-cube/Bernstein certificate"
                ),
            },
        ],
        "certificate": certificate,
        "proof_facts": {
            "canonical_core": "H is induced by all non-isolated vertices of W",
            "core_size": "p in H implies h>=2",
            "closed_neighborhood_core": "L=H-N_H[p] has at most h-2 vertices",
            "containing_p_rows": "T_k=sum_j C(r,k-1-j)i_j(L)",
            "deletion_rows": "i_k(W-p)=i_k(W)-T_k",
            "H_box": "0<=i_k(H)<=h^k/k!",
            "L_box": "0<=i_k(L)<=h^k/k!",
            "forest_use": "None in the large-order cone; H may be arbitrary.",
        },
        "exact_power_inversion": True,
        "coverage_gap_within_dense_isolate_ordinary_core_G1": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Rank-seven G1, common0/sum0, ordinary parent p in the non-isolated "
            "core, with at least 90 percent isolated W vertices. Cores with a "
            "larger non-isolated fraction and other marked geometries remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_dense_isolate_ordinary_core_G1": None,
        "base_degree_profile": certificate["base_degree_profile"],
        "bernstein_controls": certificate["bernstein_controls"],
        "affine_cube_vertices_eliminated": certificate[
            "affine_cube_vertices_eliminated"
        ],
        "minimum_worst_tail_scalar_coefficient": certificate[
            "minimum_worst_tail_scalar_coefficient"
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
