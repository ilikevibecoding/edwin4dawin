#!/usr/bin/env python3
"""Replay and package the exact suppressed-skeleton B2=2,3 certificate."""
from __future__ import annotations
import ast,hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SRC=ROOT/"verify_rank7_terminal_broom_b2_2_3.rs";EXE=ROOT/"verify_rank7_terminal_broom_b2_2_3_replay.exe"
OUT=ROOT/"rank7_terminal_broom_b2_2_3_exact_20260816.json"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def main():
    run=subprocess.run([str(EXE),"23","38"],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=False)
    marker="PASS_EXACT_RANK7_TERMINAL_BROOM_B2_2_3_ORDERS_23_THROUGH_38"
    if run.returncode or marker not in run.stdout:raise RuntimeError(run.stdout)
    rows={};pat=re.compile(r"order=(\d+) b2=([23]) trees=(\d+) roots=(\d+) minima=(\[.*\])")
    for line in run.stdout.splitlines():
        m=pat.fullmatch(line)
        if not m:continue
        n,b2=int(m.group(1)),int(m.group(2));mins=ast.literal_eval(m.group(5));assert len(mins)==14 and min(mins)>=0
        rows.setdefault(n,{"order":n})[f"b2_{b2}"]={"trees":int(m.group(3)),"roots":int(m.group(4)),"newton_minima":mins}
    assert sorted(rows)==list(range(23,39)) and all(set(row)=={"order","b2_2","b2_3"} for row in rows.values())
    payload={"schema":"rank7-terminal-broom-b2-2-3-v1","status":marker,"classification":"complete positive-length subdivisions of the unique B2=2 skeleton and the two B2=3 skeletons, quotiented by their automorphisms","conclusion":"all fourteen Newton coefficients are nonnegative, hence R_t>=0 for every integer t>=1","rows":[rows[n] for n in sorted(rows)],"artifacts_sha256":{SRC.name:sha(SRC),EXE.name:sha(EXE),"verify_rank7_rooted_cross_b2_2_3.rs":sha(ROOT/"verify_rank7_rooted_cross_b2_2_3.rs")}}
    OUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(marker);print(OUT.name,sha(OUT))
if __name__=="__main__":main()
