#!/usr/bin/env python3
"""Hash-pinned partial assemblers for distinct curvature grade15 faces."""
from __future__ import annotations
import hashlib,json,os
from pathlib import Path
HERE=Path(__file__).resolve().parent
JOB=("rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_job_agent_20260823.json","3CB2464AC31B924B01284B487BC8DF83F9CB44A17E4E72513AFF4AD281771839")
AUDIT=("rank8_low_low_a23_mixed_cross_curvature_grade15_per_base_derivative_independent_audit_agent_20260823.json","7F6A71C161349DC5181A67ADF7B8126B5B3CF765296105B74F5E47FC056BD8EF")
SCOPE=("rank8_low_low_a23_mixed_cross_curvature_grade15_formula_scope_audit_agent_20260823.json","2A77D56302225E2B399D9D8425F78036346AA986DFCFA2EC672E84A822E75BF2")
PRODUCER_SOURCE="D408E1A73F202934652BDC19C830AD3C6BC3D826E79080F4B5798DDF448261E4"; AUDIT_SOURCE="EE67C544149833D2CD13CBC213914758DF4A71D1A350C029D7FFD0C1F06D42EC"; SCOPE_SOURCE="C8CDFD8FECFF38687C6C6B017843D5358C0E499DABDC4914D84AF18F87373E0A"
LABELS=("curvature_middle_times_4","curvature_far"); FACES=(("01",[0,1]),("10",[1,0]))
def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def pinned(item):
    path=HERE/item[0]; assert sha256(path)==item[1]; return json.loads(path.read_text(encoding="utf-8"))
def atomic_json(path,payload):
    temp=path.with_suffix(path.suffix+".tmp"); temp.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8"); os.replace(temp,path); return sha256(path)
def main():
    job=pinned(JOB); audit=pinned(AUDIT); scope=pinned(SCOPE)
    assert job["status"]=="PASS_EXACT_DISTINCT_FACES_GRADE15_CURVATURE_BASE_LINEAR_ROWS_NONNEGATIVE" and job["source_sha256"]==PRODUCER_SOURCE and job["canonical_scope"]["face_01_face_10_hash_reuse"] is False
    assert audit["status"]=="PASS_INDEPENDENT_PER_BASE_DERIVATIVE_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE15_CURVATURE_ROWS" and audit["source_sha256"]==AUDIT_SOURCE and audit["imports_producer"] is False and audit["producer_job_sha256"]==JOB[1] and audit["checks"]["face_hash_reuse"] is False
    assert scope["status"]=="PASS_CANONICAL_GRADE15_CURVATURE_SCOPE_TAIL_V_BASE_LINEAR_DISTINCT_FACES" and scope["source_sha256"]==SCOPE_SOURCE and scope["checks"]["face_streams_must_be_separate"] is True
    produced={(x["face_token"],x["auxiliary"]):x for x in job["completed_cells"]}; replayed={(x["face_token"],x["auxiliary"]):x for x in audit["cells"]}
    for token,face in FACES:
        rows=[]
        for label in LABELS:
            p=produced[(token,label)]; r=replayed[(token,label)]; path=Path(p["manifest"]); assert sha256(path)==p["manifest_sha256"]; manifest=json.loads(path.read_text(encoding="utf-8")); assert manifest["face"]==face and manifest["auxiliary"]==label and manifest["source_sha256"]==PRODUCER_SOURCE and manifest["canonical_scope"]["oriented_left_tail_V"] is True and manifest["canonical_scope"]["full_convolution_C_excluded"] is True and manifest["canonical_scope"]["faces_computed_separately"] is True and manifest["result"]["negative_terms"]==r["replayed_negative_terms"]==0 and manifest["result"]["ordered_coefficient_sha256"]==r["replayed_ordered_coefficient_sha256"]==p["ordered_coefficient_sha256"]
            rows.append({"auxiliary":label,"family":"curvature","producer_manifest":path.name,"producer_manifest_sha256":p["manifest_sha256"],"producer_source_sha256":PRODUCER_SOURCE,"audit_report":AUDIT[0],"audit_report_sha256":AUDIT[1],"audit_source_sha256":AUDIT_SOURCE,"mixed_support_terms":p["mixed_support_terms"],"ordered_coefficient_sha256":p["ordered_coefficient_sha256"],"negative_terms":0})
        other="10" if token=="01" else "01"; assert all(produced[(token,label)]["ordered_coefficient_sha256"]!=produced[(other,label)]["ordered_coefficient_sha256"] for label in LABELS)
        payload={"schema":"rank8-low-low-a23-mixed-cross-face-grade15-distinct-curvature-assembler-agent-v1","status":f"PASS_HASH_PINNED_FACE_{token}_GRADE_15_CURVATURE_ROWS_INDEPENDENTLY_AUDITED","scope_note":"Exactly two curvature cells; grade15 strong cells remain missing","face":face,"bridge_corner":[2*face[0],2*face[1]],"total_ordinary_slack_degree":15,"rows":rows,"producer_job":{"path":JOB[0],"sha256":JOB[1]},"independent_per_base_derivative_audit":{"path":AUDIT[0],"sha256":AUDIT[1]},"formula_scope_audit":{"path":SCOPE[0],"sha256":SCOPE[1]},"formula_scope":{"canonical_oriented_left_tail_V":True,"full_convolution_C_excluded":True,"surviving_pieces":["base","linear"],"direction_excluded":True,"faces_computed_and_audited_separately":True,"face_hash_reuse":False},"source_sha256":sha256(Path(__file__))}
        output=HERE/f"rank8_low_low_a23_mixed_cross_face_{token}_curvature_grade_15_distinct_assembler_agent_20260823.json"; print("PASS",output,atomic_json(output,payload),flush=True)
if __name__=="__main__": main()
