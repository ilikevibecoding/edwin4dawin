#!/usr/bin/env python3
"""Fail-closed universal assembly for adjacent-mark ordinary-parent rank6 G2."""

from __future__ import annotations
import hashlib,json
from pathlib import Path

HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_universal_exact_rank7_g5_finish_20260831.json"
MARKER="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_UNIVERSAL_RANK7_G5_FINISH"
PINS={
"finite_n1_8_source":("census_iso_n6_bundle_g2_adjacent_ordinary_actual_n1_8_rank7_g5_finish.py","8F060E92776C97E1B232FCA11F95F079D386E3A1E29520AE36110941D8744F3B"),
"finite_n1_8_report":("iso_n6_bundle_g2_adjacent_ordinary_actual_n1_8_exact_rank7_g5_finish_20260831.json","E9EDF31D85C7F972FB05CFAD9709D6B14B7B16B5A4083D0EC441C283E354F97B"),
"finite_n9_13_source":("assemble_iso_n6_bundle_g2_adjacent_ordinary_literal_n9_13_rank7_g5_finish.py","C127C7F1816351D19AA55835682A1823E20565AA26DD09E581FE71AE86223927"),
"finite_n9_13_report":("iso_n6_bundle_g2_adjacent_ordinary_literal_n9_13_exact_rank7_g5_finish_20260831.json","9BC6CD56CD9CA4314DFADE6E9F83C483F4DDD05C77B5D78B20EDFAC81A199FBB"),
"parent0_n14_18_source":("census_iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_n14_18_rank7_g5_finish.py","CFE5688505A112CFC9AFB7B2F45A5D28FFDB5DD23221205921A189039583E9BF"),
"parent0_n14_18_report":("iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_n14_18_exact_rank7_g5_finish_20260831.json","FC8E56C78A6234D1DEA395A28C26B129214BE23788923AC726E584BE6A344D2F"),
"parent0_n19_source":("assemble_iso_n6_bundle_g2_adjacent_ordinary_parent0_n19_rank7_g5_finish.py","6D702133DDDDDC686560C9335DFC1AB389A66F8538E3E8190AE3A3A553506631"),
"parent0_n19_report":("iso_n6_bundle_g2_adjacent_ordinary_parent0_n19_exact_rank7_g5_finish_20260831.json","9955871CC044BDB7F69D4783C07CD0615AF329624BF77464ADE2A428CAE6A96D"),
"spine_n14_18_source":("census_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_n14_18_rank7_g5_finish.py","834317F2CE97E9D833D35B8EDF83CC18A6F85AF95941C38B5052109102F77DB8"),
"spine_n14_18_report":("iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_n14_18_exact_rank7_g5_finish_20260831.json","B18EA057E4F8CCC083E6DF963C5411E0E0E3DED28AC23D03256E59C9A893F6B3"),
"spine_n19_source":("assemble_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_n19_rank7_g5_finish.py","7ABC0001FC7BEA54C89C3C9ED991785F58F50FDA88E1D329FA656B4F08A13814"),
"spine_n19_report":("iso_n6_bundle_g2_adjacent_ordinary_marked_spine_n19_exact_rank7_g5_finish_20260831.json","B92898B0985DED0AC01ADDBC607A98FA1FEF77D09C2A160D5EF15259E443E40A"),
}

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def load(label):return json.loads((HERE/PINS[label][0]).read_text(encoding="utf-8"))

def main():
    pins={}
    for label,(name,expected) in PINS.items():
        actual=sha(HERE/name);assert actual==expected,(label,expected,actual);pins[label]={"file":name,"sha256":actual}
    n1=load("finite_n1_8_report");n9=load("finite_n9_13_report");pfin=load("parent0_n14_18_report");ptail=load("parent0_n19_report");sfin=load("spine_n14_18_report");stail=load("spine_n19_report")
    assert n1["marker"]=="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_TOTAL_N1_8_RANK7_G5_FINISH" and n1["aggregate"]["negative_ordinary_g2"]==0
    assert n9["marker"]=="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_LITERAL_N9_13_RANK7_G5_FINISH" and n9["aggregate"]["negative"]==0 and n9["dual_replay"]["byte_identical"]
    assert pfin["marker"]=="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_SAFE_CAP_N14_18_RANK7_G5_FINISH" and pfin["aggregate"]["negative"]==0
    assert sfin["marker"]=="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_N14_18_RANK7_G5_FINISH" and sfin["aggregate"]["negative"]==0
    assert ptail["marker"]=="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_N19_RANK7_G5_FINISH" and ptail["combined"]["second_byte_identical_replay"] and ptail["combined"]["negative"]==0
    assert stail["marker"]=="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_N19_RANK7_G5_FINISH" and stail["combined"]["second_byte_identical_replay"] and stail["combined"]["negative"]==0
    report={
        "marker":MARKER,
        "status":"proved exact",
        "theorem":"For every finite forest C, every ordered adjacent pair of distinct marks u,v, and every ordinary deleted parent p distinct from u,v, the exact rank-six bundle coefficient G2 is nonnegative.",
        "coverage":[
            {"orders":"N=0","parent_modes":"ordinary","method":"vacuous: no vertex p distinct from the two marks"},
            {"orders":"1<=N<=8","parent_modes":"all ordinary p","method":"exact exhaustive unlabeled-forest census","certificate":PINS["finite_n1_8_report"][0]},
            {"orders":"9<=N<=13","parent_modes":"all ordinary p","method":"dual-replayed literal census of every unlabeled forest and marking","certificate":PINS["finite_n9_13_report"][0]},
            {"orders":"14<=N<=18","parent_modes":"p adjacent to neither mark","method":"dual-replayed exhaustive forest-jet safe-cap lower","certificate":PINS["parent0_n14_18_report"][0]},
            {"orders":"14<=N<=18","parent_modes":"p adjacent to exactly one mark","method":"dual-replayed exhaustive forest-jet marked-spine lower","certificate":PINS["spine_n14_18_report"][0]},
            {"orders":"N>=19","parent_modes":"p adjacent to neither mark","method":"72-shard dual-replayed exact Bernstein safe-cap theorem","certificate":PINS["parent0_n19_report"][0]},
            {"orders":"N>=19","parent_modes":"p adjacent to exactly one mark","method":"72-shard dual-replayed exact Bernstein marked-spine theorem","certificate":PINS["spine_n19_report"][0]},
        ],
        "exhaustion_argument":"Because uv is an edge in a forest, p cannot be adjacent to both u and v without creating a triangle. Hence p is adjacent to neither mark or exactly one mark; the listed modes are exhaustive.",
        "evidence":{"literal_triples_n1_8":n1["aggregate"]["oriented_edge_parent_triples"],"literal_triples_n9_13":n9["aggregate"]["triples"],"finite_lower_checks_n14_18":pfin["aggregate"]["lower_checks"]+sfin["aggregate"]["lower_checks"],"all_order_shards":ptail["combined"]["shards"]+stail["combined"]["shards"],"all_order_tensor_bernstein_coefficients":ptail["combined"]["tensor_bernstein_coefficients"]+stail["combined"]["tensor_bernstein_coefficients"],"all_order_minimum":"1/11520"},
        "coverage_gap":None,
        "pins":pins,
        "scope":"This closes the adjacent-mark ordinary-parent geometry only. Other mark geometries/parent modes and universal rank-six G2 require their separate assemblies.",
        "source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"status":"proved exact","coverage_gap":None,"all_order_controls":report["evidence"]["all_order_tensor_bernstein_coefficients"]},indent=2,sort_keys=True));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
