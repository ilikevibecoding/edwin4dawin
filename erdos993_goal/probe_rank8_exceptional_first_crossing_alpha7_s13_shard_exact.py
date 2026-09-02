#!/usr/bin/env python3
"""Exact resource-gated terminal-alpha7/source13 type-block producer."""
from __future__ import annotations
import argparse,json,threading,time
from pathlib import Path
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT,RETAINED_RANK,digest,multiply,private_bytes,q8
from probe_rank8_exceptional_first_crossing_alpha7_s7_shard_exact import encode,load_jets,prepare_database
ROOT=Path(__file__).resolve().parent;JETS=ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv";CLASSIFICATION=ROOT/"rank8_exceptional_tree_jets_exact_20260820.json";DESIGN=ROOT/"rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json";DEPENDENCY=ROOT/"probe_rank8_exceptional_first_crossing_alpha7_s12_shard_exact.py";SOURCE_ALPHA=13;TERMINAL_ALPHA=7;ABORT_LIMIT=448*1024**2
class ResourceGate(RuntimeError):pass
class SignObstruction(RuntimeError):
 def __init__(self,w):super().__init__("nonpositive Q8 in alpha7/source13");self.witness=w
def paths(s,t):
 stem=f"rank8_exceptional_first_crossing_alpha7_s13_types{s}_{t}";return ROOT/f"{stem}_keys_exact_20260820.sqlite3",ROOT/f"{stem}_exact_20260820.json",ROOT/f"{stem}_resource_checkpoint_20260820.json",ROOT/f"{stem}_obstruction_20260820.json"
def main()->int:
 p=argparse.ArgumentParser();p.add_argument("start",type=int);p.add_argument("stop",type=int);a=p.parse_args();start,stop=a.start,a.stop;db,out,checkpoint,obstruction=paths(start,stop);started=time.perf_counter();peak=private_bytes();event=threading.Event();con=None;last=start-1
 def sample():
  nonlocal peak
  while not event.wait(.01):peak=max(peak,private_bytes())
 def gate():
  nonlocal peak
  peak=max(peak,private_bytes())
  if peak>=ABORT_LIMIT:raise ResourceGate(f"448MiB gate:{peak}")
 sampler=threading.Thread(target=sample,daemon=True);sampler.start()
 try:
  design=json.loads(DESIGN.read_text(encoding="utf-8"));cell=design["exact_counts"]["source_cells"]["13"];shard=next(x for x in cell["shards"]if x["terminal_type_index_start"]==start and x["terminal_type_index_stop"]==stop);assert shard["projected_peak_private_bytes"]<ABORT_LIMIT<LIMIT and(cell["lower_source_raw_count"],cell["lower_base_raw_count"])==(195031,431);expected_raw=shard["raw_multiset_count"]
  jets=load_jets();lower=tuple(x for x in jets if x[0]<7);terminals=tuple(poly for alpha,poly in jets if alpha==7);identity=(1,)+(0,)*RETAINED_RANK;states=[set()for _ in range(14)];states[0].add(identity)
  for weight,component in lower:
   for alpha in range(weight,14):
    for source in tuple(states[alpha-weight]):states[alpha].add(multiply(source,component))
   gate()
  low=frozenset(states[13]);bases=frozenset(states[6]);assert len(low)<=195031 and len(bases)<=431;con=prepare_database(db);checks=0;mn=mx=None;per=[]
  for ti in range(start,stop+1):
   last=ti;L=ti-247;terminal=terminals[L-1];sources=set(low);sources.update(multiply(base,component)for component in terminals[:L]for base in bases);bk=[];bp=[];tmin=tmax=None
   for source in sources:
    product=multiply(source,terminal);value=q8(product)
    if value<=0:raise SignObstruction({"classification":"zero_Q8"if value==0 else"negative_Q8","source_alpha":13,"terminal_alpha":7,"total_alpha":20,"terminal_type_index":ti,"source":list(source),"terminal":list(terminal),"product":list(product),"Q8":value})
    tmin=value if tmin is None else min(tmin,value);tmax=value if tmax is None else max(tmax,value);pt=encode(product);bk.append((13,ti,encode(source),pt,str(value)));bp.append((13,pt))
    if len(bk)==2500:con.executemany("INSERT INTO keys VALUES (?,?,?,?,?)",bk);con.executemany("INSERT OR IGNORE INTO products VALUES (?,?)",bp);bk.clear();bp.clear();gate()
   if bk:con.executemany("INSERT INTO keys VALUES (?,?,?,?,?)",bk);con.executemany("INSERT OR IGNORE INTO products VALUES (?,?)",bp)
   n=len(sources);checks+=n;mn=tmin if mn is None else min(mn,tmin);mx=tmax if mx is None else max(mx,tmax);per.append({"terminal_type_index":ti,"terminal_relative_alpha7_type":L,"raw_multisets":195031+431*L,"canonical_checks":n,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":tmin,"maximum_Q8":tmax})
   if ti%50==0 or ti==stop:con.commit();gate();print(f"component={ti}/{stop} checks={checks} private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",flush=True)
  con.commit();keys=con.execute("SELECT COUNT(*)FROM keys").fetchone()[0];products=con.execute("SELECT COUNT(*)FROM products").fetchone()[0];raw=sum(x["raw_multisets"]for x in per);assert keys==checks and raw==expected_raw and mn>0;agg={"source_alpha":13,"terminal_alpha":7,"total_alpha":20,"terminal_type_index_start":start,"terminal_type_index_stop":stop,"terminal_type_count":len(per),"independently_counted_raw_multisets":raw,"canonical_check_keys":keys,"distinct_crossing_jets":products,"raw_to_canonical_compression":raw-keys,"canonical_key_to_product_collisions":keys-products,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":mn,"maximum_Q8":mx};con.execute("INSERT INTO meta VALUES('result',?)",(json.dumps(agg,sort_keys=True,separators=(",",":")),));con.commit();con.close();con=None;event.set();sampler.join(timeout=1);gate();elapsed=time.perf_counter()-started
  payload={"schema":"rank8-exceptional-first-crossing-alpha7-s13-shard-v1","status":"PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE13_SHARD","scope":{"source_alpha":13,"terminal_alpha":7,"total_alpha":20,"terminal_type_index_start":start,"terminal_type_index_stop":stop,"workers":1},"lower_canonical_state_counts_by_alpha":{str(i):len(v)for i,v in enumerate(states)},"per_terminal_type":per,"aggregate":agg,"resources":{"workers":1,"abort_limit_private_bytes":ABORT_LIMIT,"hard_limit_private_bytes":LIMIT,"design_projected_peak_private_bytes":shard["projected_peak_private_bytes"],"peak_private_bytes":peak,"peak_private_MiB":peak/1024**2,"elapsed_seconds":elapsed},"hashes":{JETS.name:digest(JETS),CLASSIFICATION.name:digest(CLASSIFICATION),DESIGN.name:digest(DESIGN),DEPENDENCY.name:digest(DEPENDENCY),db.name:digest(db),Path(__file__).name:digest(Path(__file__))}};out.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");checkpoint.unlink(missing_ok=True);obstruction.unlink(missing_ok=True);print(payload["status"]);print(f"raw={raw} checks={keys} products={products} neg=0 zero=0 min_Q8={mn} max_Q8={mx}");print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}");print(f"database_sha256={digest(db)}");print(f"report_sha256={digest(out)}");return 0
 except ResourceGate as e:
  event.set();sampler.join(timeout=1);payload={"status":"ABORTED_CLEANLY_RANK8_ALPHA7_SOURCE13_SHARD_RESOURCE_GATE","reason":str(e),"last_terminal_type_index":last,"peak_private_bytes":max(peak,private_bytes()),"scope_warning":"Resource checkpoint only.","hashes":{Path(__file__).name:digest(Path(__file__))}};checkpoint.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);return 2
 except SignObstruction as e:
  payload={"status":"EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA7_SOURCE13_SHARD","witness":e.witness,"hashes":{Path(__file__).name:digest(Path(__file__))}};obstruction.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);return 3
 finally:
  if con is not None:con.close()
  event.set();sampler.join(timeout=1)
if __name__=="__main__":raise SystemExit(main())
