#!/usr/bin/env python3
"""Fail-closed assembly of the replayed shared-A-p reduction and branch."""
from __future__ import annotations
import hashlib,json
from pathlib import Path
from fractions import Fraction

HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_representative_exact_rank7_g5_finish_20260831.json"
MARKER="PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_REPRESENTATIVE_RANK7_G5_FINISH"
PINS={
"reduction_source":("derive_iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_safe_cap_rank7_g5_finish.py","DB8683CF2016169C9C9290CF47F685648072A5954418213023163437E0120DE4"),
"reduction_report":("iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_safe_cap_exact_rank7_g5_finish_20260831.json","DDCF16EA392A2D351028EB0282DD4001BD649E26B58A89848A3DF3BF049CE2AD"),
"four_corner_source":("derive_iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_four_corner_signs_rank7_g5_finish.py","51464526AD1F08C6E0F6DDDEA556920C617CA83450051A53F115B880A2DDB4DA"),
"four_corner_report":("iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_four_corner_signs_exact_rank7_g5_finish_20260831.json","FFD9D6B32296C94E6BC9B4BD3C5FDFD3FEBBC9A8A0C1A0B07AD5A612024628D2"),
"probe_source":("probe_iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_common0_low_flint_rank7_g5_finish.py","1B094FF0ED54323482ECF885EDB149BDDBE570409F32ABF1AB4201E2A7518F37"),
"probe_report":("iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_common0_low_B0_C0_D20_flint_rank7_g5_finish_20260831.json","EC1359BD8A1A878CCB91FB5CFC6931A807438833C5C181BAB1E0E8C62A382BE9"),
"no_parent_nonadjacent_helper":("probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root.py","D361E4EAB471FA4C791C490CCEC6E80CF458A189AA073451EED2BBD026AB5FF4"),
"adjacent_wedge_helper":("probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root.py","DDE496C597D5D558947B00770F98DAB96E1DEC8B1C07B5E0E13F3D8B9C10EA88"),
"bernstein_helper":("tensor_bernstein_flint_matrix_root.py","9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC"),
}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def main():
    pins={}
    for label,(name,expected) in PINS.items():actual=sha(HERE/name);assert actual==expected,(label,expected,actual);pins[label]={"file":name,"sha256":actual}
    reduction=json.loads((HERE/PINS["reduction_report"][0]).read_text(encoding="utf-8"));corner=json.loads((HERE/PINS["four_corner_report"][0]).read_text(encoding="utf-8"));probe=json.loads((HERE/PINS["probe_report"][0]).read_text(encoding="utf-8"));assert reduction["marker"]=="DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_SAFE_CAP_RANK7_G5_FINISH" and reduction["ordinary_lower_sha256"]=="E27665FFF4F0766F63D345EA2B8041BF4CA13CF9F3F9A846FD7C6C296FD6689C" and reduction["PW2_uniform_sign_proof"]["conclusion"].endswith("N>=12")
    assert corner["marker"]=="PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_FOUR_CORNER_SIGNS_RANK7_G5_FINISH" and corner["ordinary_lower_sha256"]==reduction["ordinary_lower_sha256"] and corner["lower_terms"]==reduction["lower_terms"]==133 and corner["directions"]["B3_B4_C3_C4"].startswith("strictly positive") and corner["directions"]["B5_B6_C5_C6"].startswith("strictly negative")
    assert probe["marker"]=="PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_COMMON0_LOW_FLINT_RANK7_G5_FINISH" and probe["reduction_report_sha256"]==PINS["reduction_report"][1] and probe["processed_betas"]==70 and len(probe["records"])==70 and probe["negative_betas"]==probe["negative_controls"]==probe["zero_controls"]==0 and probe["tensor_bernstein_coefficients"]==9_919_943 and Fraction(probe["minimum"])==Fraction(1,11520)
    report={"marker":MARKER,"status":"PASS exact replayed reduction, total-lower four-corner reduction, and representative branch","reduction":{"lower_terms":reduction["lower_terms"],"ordinary_lower_sha256":reduction["ordinary_lower_sha256"],"PW2_threshold":12,"surviving_D_PZ_terms":reduction["surviving_D_PZ_terms"],"dual_byte_identical_replay":True},"four_corner_reduction":{"scope":"total 133-term lower, N>=12","rank3_rank4":"PATH endpoints","rank5_rank6":"EDGELESS endpoints","free_endpoints":["B2","C2"],"rank3_floor_N12":corner["positive_rank3_floor"]["N12_shift"],"rank4_floor_N12":corner["positive_rank4_floor"]["N12_shift"],"dual_byte_identical_replay":True},"representative_branch":{"geometry":probe["geometry"],"parameterization":probe["parameterization"],"corner":{"B2":0,"C2":0,"D2":0},"simplex_coefficients":70,"tensor_bernstein_coefficients":probe["tensor_bernstein_coefficients"],"negative":0,"zero":0,"minimum":probe["minimum"],"dual_byte_identical_replay":True},"pins":pins,"scope_guard":"This proves the exact shared-A-p reduction, validates its total-lower four-corner reduction, and closes one representative common0/low B2=C2=D2=PATH branch only. It does not close the other row corners, every nonadjacent chart, or universal G2.","source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"lower_terms":report["reduction"]["lower_terms"],"branch_controls":report["representative_branch"]["tensor_bernstein_coefficients"],"minimum":report["representative_branch"]["minimum"]},indent=2,sort_keys=True));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
