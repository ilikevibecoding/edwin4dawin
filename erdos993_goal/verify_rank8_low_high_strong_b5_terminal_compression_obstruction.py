#!/usr/bin/env python3
"""Exact coefficient-method obstruction for extending terminal compression to b5."""
import hashlib,json
from pathlib import Path
from explore_rank8_low_high_strong_b5_compression_coefficients import generic_coefficients,full_mapping
from explore_rank8_low_high_strong_aux_faces import stats

ROOT=Path(__file__).resolve().parent
REPORT=ROOT/"rank8_low_high_strong_b5_terminal_compression_obstruction_exact_20260820.json"
INPUTS={
 "explore_rank8_low_high_strong_b5_compression_coefficients.py":"FA2464E32A331B2126E8A8BACA58943856149AABF27AFF2A3993206940A84416",
 "verify_rank8_low_high_strong_terminal_compression_b67.py":"2B9B3E09985DE6CCF0CFABE63A84999E894D433204FACF006844048D2F2EBF48",
 "rank8_low_high_strong_terminal_compression_b67_exact_20260820.json":"609A3E83AD7E8A08EC24DDF581E775958ED63DE7F9468AF59E633D4A010661C1",
 "audit_rank8_low_high_strong_terminal_compression_b67_delta12.py":"6ACD63AE15C4DED9E8184F127C4CE111CDC6E41555C190FCEC3E221CA57C43B4",
 "rank8_low_high_strong_terminal_compression_b67_delta12_independent_audit_20260820.json":"6955700D51CB01E5B7BA7FA25DA7C44491EC437F32F5382F274663958E83A2AB",
}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest().upper()
def main():
 pins={n:sha(ROOT/n) for n in INPUTS};assert pins==INPUTS
 coefficients=generic_coefficients();rows=[]
 for degree in (3,2,1):
  ctx,args=full_mapping(coefficients[degree].context());poly=coefficients[degree].compose(*args,ctx=ctx);row={"b5_power_after_outer_factor":degree,"generic_terms":len(list(coefficients[degree].terms())),**stats(poly)};rows.append(row);del poly
 assert [(r['terms'],r['negative'],r['minimum'],r['maximum']) for r in rows]==[(315524,0,1,490409640),(888235,29232,-215784,32915597400),(2052975,330085,-223175304,650213033400)]
 payload={"schema":"rank8-low-high-strong-b5-terminal-compression-obstruction-v1","status":"EXACT_COEFFICIENT_METHOD_OBSTRUCTION_B5_NOT_VALUE_COUNTEREXAMPLE","identity":"H_actual-H_shift=b5*q6*(Q1+b5*Q2+b5^2*Q3), comparing b5=z with b5=0,tb'=tb+z after b6=b7=0","coefficient_rows":rows,"conclusion":"Q3 is coefficientwise positive, but Q2 and Q1 have exact negative coefficients. Therefore coefficientwise terminal compression does not certify b5; no negative value of Q1,Q2 or H is asserted.","immutable_inputs":pins,"scope_warning":"Method obstruction only. It neither disproves b5 compression as a value inequality nor the full low/high theorem.","source_sha256":sha(Path(__file__))}
 REPORT.write_text(json.dumps(payload,indent=2)+"\n");print(payload['status']);print('SOURCE',payload['source_sha256']);print('REPORT',sha(REPORT))
if __name__=='__main__':main()
