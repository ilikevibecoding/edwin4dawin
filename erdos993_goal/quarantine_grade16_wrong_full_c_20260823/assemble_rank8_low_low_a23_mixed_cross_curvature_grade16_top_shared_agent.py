#!/usr/bin/env python3
"""Hash-pinned dual-face assembler for shared curvature grade 16."""

from __future__ import annotations
import hashlib, json, os
from pathlib import Path

HERE=Path(__file__).resolve().parent
JOB=("rank8_low_low_a23_mixed_cross_curvature_grade16_top_shared_job_agent_20260823.json","FB2071B5D79D1016CADDD6E6F53BCA2D13E9019925E4A9946F768AF02780FABE")
AUDIT=("rank8_low_low_a23_mixed_cross_curvature_grade16_top_shared_independent_audit_agent_20260823.json","23E85A550EA76F9961E4FEA08720B0CD999D6F4565CDE0ABC29D06681293CFB5")
PRODUCER_SOURCE="88B9319CE3A6C4B78E4E097E8A725196B3E30B99ADB3D923AB73DA4F164B0282"
AUDIT_SOURCE="2A226836B7F241C2945EF509ACC5D383820F6D91C8BE0B11402FFF985DFC3760"
LABELS=("curvature_middle_times_4","curvature_far")
FACES=(("01",[0,1]),("10",[1,0]))

def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def pinned(item):
    path=HERE/item[0]; assert sha256(path)==item[1]
    return json.loads(path.read_text(encoding="utf-8"))
def atomic_json(path,payload):
    temporary=path.with_suffix(path.suffix+".tmp")
    temporary.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
    os.replace(temporary,path); return sha256(path)

def main():
    job=pinned(JOB); audit=pinned(AUDIT)
    assert job["status"]=="PASS_EXACT_SHARED_GRADE16_FOUR_CURVATURE_CELLS_NONNEGATIVE"
    assert job["source_sha256"]==PRODUCER_SOURCE
    assert audit["status"]=="PASS_INDEPENDENT_CLOSED_FORM_RECONSTRUCTION_ALL_FOUR_GRADE16_CURVATURE_CELLS"
    assert audit["imports_producer"] is False and audit["producer_job_sha256"]==JOB[1]
    assert audit["producer_source_sha256"]==PRODUCER_SOURCE and audit["source_sha256"]==AUDIT_SOURCE
    assert audit["literal_identity_checks"]["face_01_equals_face_10_coefficientwise"] is True
    assert audit["literal_identity_checks"]["middle_equals_4_times_far_coefficientwise"] is True
    produced={(x["face_token"],x["auxiliary"]):x for x in job["completed_cells"]}
    replayed={(x["face_token"],x["auxiliary"]):x for x in audit["cells"]}
    for token,face in FACES:
        rows=[]
        for label in LABELS:
            p=produced[(token,label)]; r=replayed[(token,label)]; path=Path(p["manifest"])
            assert sha256(path)==p["manifest_sha256"]
            m=json.loads(path.read_text(encoding="utf-8"))
            assert m["face"]==face and m["auxiliary"]==label and m["source_sha256"]==PRODUCER_SOURCE
            assert m["result"]["negative_terms"]==r["replayed_negative_terms"]==0
            assert m["result"]["ordered_coefficient_sha256"]==r["replayed_ordered_coefficient_sha256"]==p["ordered_coefficient_sha256"]
            rows.append({
                "auxiliary":label,"family":"curvature","producer_manifest":path.name,
                "producer_manifest_sha256":p["manifest_sha256"],"producer_source_sha256":PRODUCER_SOURCE,
                "audit_report":AUDIT[0],"audit_report_sha256":AUDIT[1],"audit_source_sha256":AUDIT_SOURCE,
                "mixed_support_terms":p["mixed_support_terms"],
                "ordered_coefficient_sha256":p["ordered_coefficient_sha256"],"negative_terms":0,
            })
        payload={
            "schema":"rank8-low-low-a23-mixed-cross-face-grade16-top-shared-assembler-agent-v1",
            "status":f"PASS_HASH_PINNED_FACE_{token}_GRADE_16_CURVATURE_ROWS_INDEPENDENTLY_AUDITED",
            "scope_note":"This checkpoint seals exactly the two curvature cells; grade16 strong cells remain separate",
            "face":face,"bridge_corner":[2*face[0],2*face[1]],"total_ordinary_slack_degree":16,
            "rows":rows,"top_shared_four_cell_job":{"path":JOB[0],"sha256":JOB[1]},
            "independent_closed_form_audit":{"path":AUDIT[0],"sha256":AUDIT[1]},
            "literal_identities":{"face_01_equals_face_10":True,"middle_equals_4_times_far":True},
            "source_sha256":sha256(Path(__file__)),
        }
        output=HERE/f"rank8_low_low_a23_mixed_cross_face_{token}_curvature_grade_16_top_shared_assembler_agent_20260823.json"
        print("PASS",output,atomic_json(output,payload),flush=True)

if __name__=="__main__": main()
