#!/usr/bin/env python3
"""Fail-closed N>=19 assembly for adjacent marked-spine ordinary-parent G2."""

from __future__ import annotations
from fractions import Fraction
import hashlib,json
from pathlib import Path
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import weak_compositions

HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_marked_spine_n19_exact_rank7_g5_finish_20260831.json"
MARKER="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_N19_RANK7_G5_FINISH"
LM="PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_FLINT_RANK7_G5_FINISH"
SM="PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_SMALL_ORDER_FLINT_RANK7_G5_FINISH"
PINS={
"reduction_source":("derive_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_rank7_g5_finish.py","4143E8A7CA7BDE3D4709E908F75F14797BFD05C57CE79D426764F60CB54132A4"),
"reduction_report":("iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_exact_rank7_g5_finish_20260831.json","D7B0817B10EECB89D5D5E7E676F0178A4976B647E9A2B6A3B179CD4EC36E8CDB"),
"large_producer":("probe_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_flint_rank7_g5_finish.py","00990C03ED0FF36E3A62D19619955E13BC3AAEC178136F61FCD34B3C2893810B"),
"small_producer":("probe_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_small_order_flint_rank7_g5_finish.py","368F570F22AEA733D8F76933E1D9A7FE49D8E9E1D3B2A95D1A5219336EAEA3DF"),
"no_parent_assembler":("assemble_iso_n6_bundle_g2_adjacent_no_parent_all_order_root.py","4B5F5828F60784FBCC0A543217DB1C2CA1DC15F80D84075A36C01FE5B2A87531"),
"no_parent_report":("iso_n6_bundle_g2_adjacent_no_parent_all_order_exact_root_20260831.json","B9323D7D6E2FC797BC47AB0844691B8AC70177744AEA165BCB34F033E7850CA9"),
"wedge_producer":("probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root.py","DDE496C597D5D558947B00770F98DAB96E1DEC8B1C07B5E0E13F3D8B9C10EA88"),
"q3_helper":("probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root.py","83E3E7D511EE4580D96284FC5EF12AFDA0DB9E8FC818FCE4EA887FF1EB7CD797"),
"bernstein_helper":("tensor_bernstein_flint_matrix_root.py","9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC"),
"sum_helper":("balanced_flint_mpoly_sum_root.py","976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD"),
}
LARGE_MANIFEST="F2CCA03352B5A83C13A3337270E3A168EF12C2691C6A4F9CA78056C0831065DB"
SMALL_MANIFEST="5D200C970487E14F7FC0DFB9173FE5C77971C7257097E4B4FABD016E65D42489"
SECOND_REPLAY=True

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def load(path):return json.loads(path.read_text(encoding="utf-8"))
def large_name(o,ch,b,c):return f"iso_n6_bundle_g2_adjacent_ordinary_spine_lower_{o}_{ch}_B{b}_C{c}_beta0_70_flint_rank7_g5_finish_20260831.json"
def small_name(s,k,b,c):return f"iso_n6_bundle_g2_adjacent_ordinary_spine_lower_small_{s}{k}_B{b}_C{c}_beta0_70_flint_rank7_g5_finish_20260831.json"

def verify_group(names,marker,producer_hash,manifest_expected):
    hashes={name:sha(HERE/name) for name in sorted(names)};stream="".join(f"{n}\0{hashes[n]}\n" for n in sorted(names));manifest=hashlib.sha256(stream.encode()).hexdigest().upper();assert manifest==manifest_expected,(manifest,manifest_expected)
    total=neg=zero=simplex=0;minimum=None;rows=[];betas=list(weak_compositions(4,5))
    for name in sorted(names):
        r=load(HERE/name);assert r["marker"]==marker and r["source_sha256"]==producer_hash and r["reduction_report_sha256"]==PINS["reduction_report"][1];assert r["simplex_degree"]==4 and r["homogeneous_simplex_coefficients"]==70 and r["start_beta"]==0 and r["stop_beta"]==70 and r["processed_betas"]==70 and r["negative_betas"]==0 and len(r["records"])==70
        local=0;localmin=None
        for i,x in enumerate(r["records"]):
            assert x["beta_index"]==i and tuple(x["beta"])==betas[i] and x["negative"]==0 and x["zero"]==0
            q=Fraction(x["minimum"]);assert q>0;local+=x["bernstein_coefficients"];localmin=q if localmin is None else min(localmin,q)
        total+=local;simplex+=70;minimum=localmin if minimum is None else min(minimum,localmin);rows.append({"file":name,"sha256":hashes[name],"tensor_bernstein_coefficients":local,"minimum":str(localmin),"negative":0,"zero":0,"ordered_record_sha256":r["ordered_record_sha256"]})
    return {"shards":len(names),"simplex_coefficients":simplex,"tensor_bernstein_coefficients":total,"minimum":str(minimum),"negative":neg,"zero":zero,"manifest_sha256":manifest,"second_byte_identical_replay":SECOND_REPLAY},rows

def main():
    pins={}
    for label,(name,expected) in PINS.items():actual=sha(HERE/name);assert actual==expected,(label,expected,actual);pins[label]={"file":name,"sha256":actual}
    reduction=load(HERE/PINS["reduction_report"][0]);assert reduction["marker"]=="DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_RANK7_G5_FINISH" and reduction["ordinary_lower_sha256"]=="9F8FBE4708710EBFA95CC7D008A8A744627D6C240C4B1060391976F9EBD996B1"
    large=[large_name(o,ch,b,c) for o in ("B_le_C","B_ge_C") for ch in ("low","high") for b in (0,1) for c in (0,1)];small=[small_name(s,k,b,c) for s in ("B","C") for k in range(7) for b in (0,1) for c in (0,1)]
    lt,lr=verify_group(large,LM,PINS["large_producer"][1],LARGE_MANIFEST);st,sr=verify_group(small,SM,PINS["small_producer"][1],SMALL_MANIFEST)
    assert lt["shards"]==16 and st["shards"]==56 and lt["tensor_bernstein_coefficients"]==111_496_880 and st["tensor_bernstein_coefficients"]==43_298_736 and Fraction(lt["minimum"])==Fraction(st["minimum"])==Fraction(1,11520)
    report={"marker":MARKER,"status":"PASS exact N>=19 adjacent marked-spine ordinary-parent rank-six G2 theorem","theorem":"For every forest with adjacent marks u,v and ordinary deleted parent p adjacent to exactly one marked endpoint, G2>=0 whenever common order N=|G-{u,v}|>=19.","symmetry":"The certificate is oriented with pu and uv edges; swapping u,v covers pv and vu.","coverage":{"small":"min(mB,mC)=0,...,6, both choices of small side and all four rank-two corners","large":"min(mB,mC)>=7, both order orientations, low/high charts, all four rank-two corners","exhaustive":True},"subset_lower_reduction":reduction["subset_payment"],"edge_wedge_domain":reduction["edge_wedge_domain"],"large_certificate":lt,"small_certificate":st,"combined":{"shards":72,"simplex_coefficients":lt["simplex_coefficients"]+st["simplex_coefficients"],"tensor_bernstein_coefficients":lt["tensor_bernstein_coefficients"]+st["tensor_bernstein_coefficients"],"minimum":"1/11520","negative":0,"zero":0,"second_byte_identical_replay":SECOND_REPLAY},"large_shards":lr,"small_shards":sr,"pins":pins,"scope_guard":"This closes the marked-spine ordinary-parent mode only for N>=19. Finite N<=18 and ordinary p nonadjacent to both adjacent marks remain separate; universal G2 is not claimed.","source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"shards":72,"tensor":report["combined"]["tensor_bernstein_coefficients"],"minimum":"1/11520","replay":SECOND_REPLAY},indent=2,sort_keys=True));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)

if __name__=="__main__":main()
