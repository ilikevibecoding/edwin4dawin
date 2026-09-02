#!/usr/bin/env python3
"""Assemble the exact conditional forest-m1 theorem for targets j=4,5."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_general_forest_j4j5_assembly_exact_agent_20260829.json"

PINNED = {
    "prove_terminal_q3_m1_general_forest_j8plus_agent.py":
        "3854DA3117F6BB8653E1D98495866121D2C2DA92A077EA741C5FFBDF981D1BCE",
    "terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json":
        "60F970B393314511563BFA6D18CDFD27554659EB7EEAC0EFDE009ACE81FEB667",
    "derive_terminal_q3_m1_general_forest_agent.py":
        "348DB21007B705120538CBA087D67DA40C97295CEA522523A6105078074A1A4C",
    "prove_terminal_q3_m1_general_forest_j4j5_common_cone_agent.py":
        "0466DCA4BD4E4D4C40374F36C944057F97FF45FEF2C56FF94EFBAB7571EFBE19",
    "terminal_q3_m1_general_forest_j4j5_common_cone_exact_agent_20260829.json":
        "C90DD965E7B9A8A16BEB2DFDA741AD1AD269D16C8448FC56CA9F354BD9CD655F",
    "TERMINAL_Q3_M1_FOREST_J4J5_COMMON_CONE_2026-08-29.md":
        "8DA87281E6A6E22A9CCBF4A2F1FB8C0DD99A2EA3D7F538644AA24F271BB276F4",
    "prove_terminal_q3_m1_general_forest_j4j5_relative_cap_agent.py":
        "F80BD0E14F13D3F859499694B92858891107F82CA5B1A0C43345DA65CD4BF521",
    "terminal_q3_m1_general_forest_j4j5_relative_cap_exact_agent_20260829.json":
        "10F521DCF9A938B245FFCCD4B413AA5A712D00F86DC724A9BDD39E7D5FB37F6B",
    "TERMINAL_Q3_M1_FOREST_J4J5_HIGH_DEGREE_CAP_ENDPOINT_2026-08-29.md":
        "2935A5DBA3F40A1D613E39DF2DF81320D9323E12E2D902B442ADAE70438FEC05",
    "prove_terminal_q3_m1_general_forest_j4j5_balanced_cap_active_agent.py":
        "E1356EE5F0F620589F875A9DE5CF5C5A762F8E7298587A8D645FF2A05BDE7B6C",
    "probe_terminal_q3_m1_general_forest_j4j5_balanced_cap_fast_agent.py":
        "C544E4858929DB55B0B779DF98A0A42AA3698156188D590DC7A3F7A3C05BCF79",
    "terminal_q3_m1_general_forest_j4_balanced_cap_active_exact_agent_20260829.json":
        "6E0E2AE9DAF0C298A5018608987D4AE8B89AD631FF3DD33D082712EE494DF65B",
    "terminal_q3_m1_general_forest_j5_balanced_cap_active_exact_agent_20260829.json":
        "9138D282DB491D66DF081A153989454EAB2745428AF44E1845BA1EEF0E4BD38A",
    "prove_terminal_q3_m1_general_forest_j4j5_d1_inactive_agent.py":
        "3F3EE2E6CC463E4930A50E6B4FC75EB685D1204FF75CCA3E74997155CE84ADC9",
    "terminal_q3_m1_general_forest_j4j5_d1_inactive_exact_agent_20260829.json":
        "C2A1C9D2FD9B443DC50FA5794121B2DC367F106277C1A2A6A00F40D4DE1F8BD4",
    "audit_terminal_q3_m1_general_forest_j4j5_balanced_cap_inactive_agent.py":
        "01F0B554E2A9F2917AD30BE05F56B8ED2E4B159B28722D50599E005FA116724B",
    "terminal_q3_m1_general_forest_j4j5_balanced_cap_inactive_audit_20260829.json":
        "22539B4BFC9EF6375BD6099B31E5D3E63C07DE239B8909C6DF958593BB41857F",
    "TERMINAL_Q3_M1_FOREST_J4J5_INACTIVE_BALANCED_CAP_THEOREM_2026-08-29.md":
        "39AD5D047BE4C67CAF77A2460FEC80B0D4C78E7D7F3ED0EE48AC2D2559D927CC",
    "FOREST_M1_ALLR_BALANCED_NEIGHBOR_SHADOW_CAP_ROOT_2026-08-29.md":
        "188CF568BB8B06A7DC30905C2C42251826C91A9561F6308198D4C0D04E304D57",
    "FOREST_M1_ALLR_RELATIVE_SHADOW_CAP_ROOT_2026-08-29.md":
        "91777DB2843ABCDC1F0795FA2B01B1E2EF8995C559C3C444E79218FDBBCF2F5D",
    "audit_terminal_q3_low_newton_m1_forest_finite_agent.py":
        "20F3FA5F42CB28D255CDC6F3D3CB3DD6E94FF384A056AC45858101E3A03FC1D4",
    "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json":
        "63E52E6956A2B1B84C79B5E5893097151A1ADFC357683345B13965AE4732F29A",
    "verify_terminal_payment_permanent_isolate_shift_agent.py":
        "40631FFC5863F3FBD24D8D4A197A8DA7A2B50931C6F680D3FD633D60F194DBCD",
    "terminal_payment_permanent_isolate_shift_exact_20260829.json":
        "F66D640F42D027C05DB92E9B78007063FEFF81B76D65F564E5D92C46C3B7F8BF",
    "audit_terminal_q3_low_newton_m2_forest_base_agent.py":
        "78DF5272D69C8137CE0EF78BDBAD24A8C858D0FD60EAA0734EBFF3351D5BF54E",
    "terminal_q3_low_newton_m2_forest_base_audit_20260829.json":
        "328F2A1486CB9A581A565862993380D37EDC91A27BC29924A99E6B970B7FFD69",
    "EDGE_SURVIVAL_PAYMENT_REDUCTION_2026-07-29.md":
        "7F76425EE6E9215CC642C3A81B3B065C3E4D21F6A3E24597828EEE3774E951F1",
    "verify_edge_survival_payment_reduction.py":
        "18BBEE0C0EF327D3C3884000EE897D7F24D3318E3EBF2996A5F70747DF2CF955",
    "edge_survival_payment_reduction_certificate_20260729.json":
        "F4603797AF323DC93431048E7EA3E067A3D313397F382E3311717B3E7CB9DECE",
    "probe_q_envelope_component_payment_bridge_root.py":
        "F5120DFC82A97626BAC39CD79B5211174126BA8486DFCF05F01E605330008057",
}

STATUS = {
    "terminal_q3_m1_general_forest_j4j5_common_cone_exact_agent_20260829.json":
        "PASS_EXACT_ALL_ORDER_FOREST_M1_J4J5_COMMON_CONE",
    "terminal_q3_m1_general_forest_j4j5_relative_cap_exact_agent_20260829.json":
        "PASS_EXACT_ALL_ORDER_FOREST_M1_J4J5_SUPPORTED_HIGH_DEGREE_CAP_ENDPOINT",
    "terminal_q3_m1_general_forest_j4_balanced_cap_active_exact_agent_20260829.json":
        "PASS_EXACT_ALL_ORDER_FOREST_M1_J4_LOW_DEGREE_ACTIVE_BALANCED_CAP_ENDPOINT",
    "terminal_q3_m1_general_forest_j5_balanced_cap_active_exact_agent_20260829.json":
        "PASS_EXACT_ALL_ORDER_FOREST_M1_J5_LOW_DEGREE_ACTIVE_BALANCED_CAP_ENDPOINT",
    "terminal_q3_m1_general_forest_j4j5_d1_inactive_exact_agent_20260829.json":
        "PASS_EXACT_ALL_ORDER_D1_INACTIVE_BALANCED_CAP_STRIPS",
    "terminal_q3_m1_general_forest_j4j5_balanced_cap_inactive_audit_20260829.json":
        "PASS_EXACT_FINITE_INACTIVE_BALANCED_CAP_D2_TO_J",
    "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json":
        "PASS_DIRECT_CANONICAL_ALL_FOREST_M1_FINITE_ORDER13",
    "terminal_payment_permanent_isolate_shift_exact_20260829.json":
        "PASS_EXACT_TERMINAL_PAYMENT_PERMANENT_ISOLATE_NEWTON_SHIFT",
    "terminal_q3_low_newton_m2_forest_base_audit_20260829.json":
        "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def verify_inputs():
    for filename, expected in PINNED.items():
        actual = sha256(HERE / filename)
        assert actual == expected, (filename, actual, expected)
    for filename, expected in STATUS.items():
        payload = json.loads((HERE / filename).read_text(encoding="utf-8"))
        assert payload["status"] == expected, (filename, payload["status"])


def verify_partition():
    N, h, d, q, s, L = sp.symbols(
        "N h d q s L", integer=True, nonnegative=True
    )
    R = d*q + s
    S = N - d
    K = S - q
    structural_N = 2*h + d + R + L
    assert sp.expand(K.subs(N, structural_N) - (
        2*h + (d-1)*q + s + L
    )) == 0
    records = {}
    for j in (4, 5):
        records[f"j{j}"] = {
            "order_split": "N<=12 finite; N>=13 symbolic",
            "B_split": "B=N-2h-1 is zero or positive",
            "support_split": "y=0 or y>0",
            "degree_split": f"d>{j} or 1<=d<={j}",
            "division": "R=dq+s with q>=0 and 0<=s<d",
            "K_identity": "K=S-q=2h+(d-1)q+s+L",
            "integer_K_split": (
                f"K<=2j-3={2*j-3} (inactive) or "
                f"K>=2j-2={2*j-2} (active); no integer gap"
            ),
        }
        assert (2*j - 3) + 1 == 2*j - 2
    return records


def summary_counts():
    common = json.loads((HERE / next(
        name for name in STATUS if "common_cone_exact" in name
    )).read_text(encoding="utf-8"))
    high = json.loads((HERE / next(
        name for name in STATUS if "relative_cap_exact" in name
    )).read_text(encoding="utf-8"))
    active4 = json.loads((HERE /
        "terminal_q3_m1_general_forest_j4_balanced_cap_active_exact_agent_20260829.json"
    ).read_text(encoding="utf-8"))
    active5 = json.loads((HERE /
        "terminal_q3_m1_general_forest_j5_balanced_cap_active_exact_agent_20260829.json"
    ).read_text(encoding="utf-8"))
    finite = json.loads((HERE /
        "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json"
    ).read_text(encoding="utf-8"))
    assert active4["certificate"]["totals"]["families"] == 60
    assert active5["certificate"]["totals"]["families"] == 120
    assert finite["finite_census"]["supported_cells_all_j"] == 272761
    return {
        "common_cone": {
            "bernstein": common["certificate"]["total_bernstein_coefficients"],
            "power": common["certificate"]["total_power_coefficients_in_S"],
            "stream": common["certificate"]["ordered_coefficient_stream_sha256"],
        },
        "high_degree_cap": {
            "families": len(high["certificate"]["records"]),
            "numerator_bernstein": high["certificate"]["totals"]["numerator_bernstein"],
            "numerator_power": high["certificate"]["totals"]["numerator_power"],
            "stream": high["certificate"]["ordered_coefficient_stream_sha256"],
        },
        "active_j4": active4["certificate"]["totals"] | {
            "stream": active4["certificate"]["ordered_coefficient_stream_sha256"]
        },
        "active_j5": active5["certificate"]["totals"] | {
            "stream": active5["certificate"]["ordered_coefficient_stream_sha256"]
        },
        "finite_canonical_cells_all_targets": 272761,
    }


def main():
    verify_inputs()
    partition = verify_partition()
    counts = summary_counts()
    report = {
        "schema": "terminal-q3-m1-general-forest-j4j5-assembly-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J4J5_CONDITIONAL_Q_ENVELOPE",
        "claim": (
            "For every no-isolate disconnected forest base, every marked "
            "nonisolated root, and each supported target j in {4,5}, the "
            "terminal-q3 Newton coefficient d1 is nonnegative, conditional "
            "only on the smaller-forest input q_j(F)<=q_2(F)."
        ),
        "proof_assembly": [
            "N<=12: pinned direct-canonical finite theorem through |G|=13.",
            "N>=13: common W2/M/y0/B0 cone.",
            "On y>0 and d>j: supported relative-shadow cap module.",
            "On y>0 and d<=j: balanced-neighbor cap after R=dq+s.",
            "The integer region K<=2j-3 is the pinned inactive theorem.",
            "The integer region K>=2j-2 is the pinned active theorem.",
            "Affineness in y interpolates from y=0 to the certified cap.",
            "Nonnegative W2 restores the discarded square over the W interval.",
        ],
        "partition_replay": partition,
        "certificate_counts": counts,
        "permanent_isolates": (
            "The exact shift d1(G+K1)=d1(G)+d2(G), together with the pinned "
            "all-forest d2 theorem, preserves this d1 conclusion when "
            "permanent isolated components are adjoined."
        ),
        "global_bridge_warning": {
            "exact_pinned_source": (
                "The edge-survival payment identity is pinned. Its exact "
                "rearrangement contains -3*x*q_(q+2)."
            ),
            "required_reserve": (
                "A later global/DFP bridge must retain the quantitative "
                "restoration 3*x*(q3-q_(q+2)); the Boolean q envelope alone "
                "is too coarse on Galvin families."
            ),
            "diagnostic_only": (
                "The current Galvin probe observes that this reserve pays "
                "about 74%-90% of the adverse bound. This percentage is "
                "computational evidence only, not a theorem."
            ),
        },
        "pinned_sha256": PINNED,
        "scope": (
            "This closes only forest-base terminal Newton m=1 at targets "
            "j=4,5 under the stated smaller-forest q-envelope input. Target "
            "j=3, forest m=0, the pointed/global bridge, complete terminal "
            "payment, unimodality, and Erdos Problem 993 remain open."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
