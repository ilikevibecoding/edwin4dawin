#!/usr/bin/env python3
"""Package or freshly replay the exact mixed-skeleton B2=5 census."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
from pathlib import Path
import re
import subprocess


HERE=Path(__file__).resolve().parent
SOURCE=HERE/"verify_rank7_terminal_broom_b2_5_mixed.rs"
DEPENDENCY=HERE/"verify_rank7_rooted_cross_b2_4.rs"
CLASSIFICATION=HERE/"rank7_rooted_cross_b2_5_skeleton_classification_20260816.json"
EXECUTABLE=HERE/"verify_rank7_terminal_broom_b2_5_mixed.exe"
INITIAL_LOG=HERE/"rank7_terminal_broom_b2_5_mixed_exact_run.log"
REPLAY_LOG=HERE/"rank7_terminal_broom_b2_5_mixed_fresh_replay.log"
REPORT=HERE/"rank7_terminal_broom_b2_5_mixed_exact_20260816.json"
REPLAY_REPORT=HERE/"rank7_terminal_broom_b2_5_mixed_replay_20260816.json"
ROW=re.compile(r"^order=(\d+) trees=(\d+) middle_trees=(\d+) end_trees=(\d+) roots=(\d+) minima=(\[.*\])$")


def sha256(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expected()->dict[int,tuple[int,int,int,int]]:
    report=json.loads(CLASSIFICATION.read_text(encoding="utf-8"));assert report["status"]=="PASS_EXACT_B2_5_SKELETON_CLASSIFICATION_ONLY"
    values={}
    for row in report["orders"]:
        middle=row["by_skeleton"]["degree4_middle_plus_two_degree3"]
        end=row["by_skeleton"]["degree4_end_plus_two_degree3"]
        values[row["order"]]=(middle+end,middle,end,row["order"]*(middle+end))
    assert sorted(values)==list(range(23,39));return values


def parse(text:str)->list[dict]:
    exp=expected();rows={}
    for line in text.splitlines():
        match=ROW.match(line)
        if not match:continue
        order,trees,middle,end,roots=map(int,match.groups()[:5]);minima=ast.literal_eval(match.group(6))
        assert order not in rows;assert (trees,middle,end,roots)==exp[order];assert len(minima)==14
        assert all(isinstance(value,int) and value>=0 for value in minima)
        rows[order]={"order":order,"trees":trees,"degree4_middle_trees":middle,"degree4_end_trees":end,"rooted_checks":roots,"newton_minima":minima}
    assert sorted(rows)==list(range(23,39));return [rows[n] for n in sorted(rows)]


def totals(rows:list[dict])->dict:
    result={"trees":sum(row["trees"] for row in rows),"rooted_checks":sum(row["rooted_checks"] for row in rows)}
    assert result=={"trees":8_311_961,"rooted_checks":288_474_692};return result


def write_primary(rows:list[dict])->None:
    rank_minima=[min(row["newton_minima"][rank] for row in rows) for rank in range(14)];assert all(v>0 for v in rank_minima)
    report={
        "schema":"rank7-terminal-broom-b2-5-mixed-exact-v1",
        "status":"PASS_EXACT_RANK7_TERMINAL_BROOM_B2_5_MIXED_ORDERS_23_THROUGH_38",
        "scope":"all B2=5 trees containing a degree-four vertex; excludes the two pure-cubic B2=5 skeletons",
        "orders":rows,"totals":totals(rows),"global_newton_minima":rank_minima,
        "conclusion":"all fourteen Newton coefficients are positive, hence R_t>=0 for every integer t>=1",
        "artifacts_sha256":{SOURCE.name:sha256(SOURCE),DEPENDENCY.name:sha256(DEPENDENCY),CLASSIFICATION.name:sha256(CLASSIFICATION),EXECUTABLE.name:sha256(EXECUTABLE)},
    }
    REPORT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8");print(report["status"]);print(report["totals"])


def fresh_replay()->None:
    primary=json.loads(REPORT.read_text(encoding="utf-8"))
    subprocess.run(["rustup","run","stable-x86_64-pc-windows-gnu","rustc","-O",str(SOURCE),"-o",str(EXECUTABLE)],cwd=HERE,check=True)
    flags=getattr(subprocess,"BELOW_NORMAL_PRIORITY_CLASS",0)|getattr(subprocess,"CREATE_NO_WINDOW",0)
    error_path=HERE/"rank7_terminal_broom_b2_5_mixed_fresh_replay.err.log"
    with REPLAY_LOG.open("w",encoding="utf-8",buffering=1) as output,error_path.open("w",encoding="utf-8") as error:
        process=subprocess.Popen([str(EXECUTABLE),"23","38"],cwd=HERE,text=True,stdout=subprocess.PIPE,stderr=error,creationflags=flags)
        assert process.stdout is not None;lines=[]
        for line in process.stdout:
            print(line,end="",flush=True);output.write(line);output.flush();lines.append(line)
        return_code=process.wait()
    assert return_code==0;assert error_path.stat().st_size==0;text="".join(lines)
    assert "PASS_EXACT_RANK7_TERMINAL_BROOM_B2_5_MIXED_ORDERS_23_THROUGH_38" in text
    rows=parse(text);assert rows==primary["orders"];assert totals(rows)==primary["totals"]
    replay={"schema":"rank7-terminal-broom-b2-5-mixed-replay-v1","status":"PASS_FRESH_REPLAY_EXACT_RANK7_TERMINAL_BROOM_B2_5_MIXED","orders_replayed":[23,38],"totals":totals(rows),"global_newton_minima":primary["global_newton_minima"],"artifacts_sha256":{SOURCE.name:sha256(SOURCE),DEPENDENCY.name:sha256(DEPENDENCY),CLASSIFICATION.name:sha256(CLASSIFICATION),EXECUTABLE.name:sha256(EXECUTABLE),REPORT.name:sha256(REPORT),REPLAY_LOG.name:sha256(REPLAY_LOG)}}
    REPLAY_REPORT.write_text(json.dumps(replay,indent=2)+"\n",encoding="utf-8");print(replay["status"])


def main()->None:
    parser=argparse.ArgumentParser();parser.add_argument("--summarize-current-run",action="store_true");args=parser.parse_args()
    if args.summarize_current_run:
        text=INITIAL_LOG.read_text(encoding="utf-8");assert "PASS_EXACT_RANK7_TERMINAL_BROOM_B2_5_MIXED_ORDERS_23_THROUGH_38" in text;write_primary(parse(text))
    else:fresh_replay()


if __name__=="__main__":main()
