#!/usr/bin/env python3
"""Exact resource-gated terminal-alpha7/source10 type-block producer."""
from __future__ import annotations
import argparse,json,threading,time
from pathlib import Path
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT,RETAINED_RANK,digest,multiply,private_bytes,q8
from probe_rank8_exceptional_first_crossing_alpha7_s7_shard_exact import encode,load_jets,prepare_database
ROOT=Path(__file__).resolve().parent;JETS=ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv";CLASSIFICATION=ROOT/"rank8_exceptional_tree_jets_exact_20260820.json";DESIGN=ROOT/"rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json";DEPENDENCY=ROOT/"probe_rank8_exceptional_first_crossing_alpha7_s7_shard_exact.py";SOURCE_ALPHA=10;TERMINAL_ALPHA=7;TYPE_START_ALL=248;ABORT_LIMIT=448*1024**2
class ResourceGate(RuntimeError):pass
class SignObstruction(RuntimeError):
 def __init__(self,witness):super().__init__("nonpositive exact Q8 in terminal-alpha7/source10 shard");self.witness=witness
def paths(start,stop):
 stem=f"rank8_exceptional_first_crossing_alpha7_s10_types{start}_{stop}";return ROOT/f"{stem}_keys_exact_20260820.sqlite3",ROOT/f"{stem}_exact_20260820.json",ROOT/f"{stem}_resource_checkpoint_20260820.json",ROOT/f"{stem}_obstruction_20260820.json"
def main()->int:
 p=argparse.ArgumentParser();p.add_argument("start",type=int);p.add_argument("stop",type=int);a=p.parse_args();start,stop=a.start,a.stop;database,output,checkpoint,obstruction=paths(start,stop);started=time.perf_counter();peak=private_bytes();stop_sampling=threading.Event();connection=None;last_type=start-1
 def sample():
  nonlocal peak
  while not stop_sampling.wait(.01):peak=max(peak,private_bytes())
 def gate():
  nonlocal peak
  peak=max(peak,private_bytes())
  if peak>=ABORT_LIMIT:raise ResourceGate(f"producer reached 448 MiB gate: {peak}")
 sampler=threading.Thread(target=sample,daemon=True);sampler.start()
 try:
  design=json.loads(DESIGN.read_text(encoding="utf-8"));cell=design["exact_counts"]["source_cells"]["10"];shard=next(x for x in cell["shards"]if x["terminal_type_index_start"]==start and x["terminal_type_index_stop"]==stop);assert design["status"].startswith("PASS_EXACT_NO_GAP_RESOURCE_DESIGN")and shard["projected_peak_private_bytes"]<ABORT_LIMIT<LIMIT;expected_raw=shard["raw_multiset_count"];lower_raw=cell["lower_source_raw_count"];base_raw=cell["lower_base_raw_count"];assert(lower_raw,base_raw)==(14047,13)
  jets=load_jets();lower=tuple(x for x in jets if x[0]<7);terminals=tuple(poly for alpha,poly in jets if alpha==7);identity=(1,)+(0,)*RETAINED_RANK;states=[set()for _ in range(11)];states[0].add(identity)
  for weight,component in lower:
   for alpha in range(weight,11):
    for source in tuple(states[alpha-weight]):states[alpha].add(multiply(source,component))
   gate()
  lower_sources=frozenset(states[10]);lower_bases=frozenset(states[3]);assert len(lower_sources)<=lower_raw and len(lower_bases)<=base_raw;connection=prepare_database(database);checks=0;minimum=maximum=None;per_type=[]
  for type_index in range(start,stop+1):
   last_type=type_index;relative=type_index-TYPE_START_ALL+1;terminal=terminals[relative-1];sources=set(lower_sources);sources.update(multiply(base,component)for component in terminals[:relative]for base in lower_bases);batch_keys=[];batch_products=[];type_min=type_max=None
   for source in sources:
    product=multiply(source,terminal);value=q8(product)
    if value<=0:raise SignObstruction({"classification":"zero_Q8"if value==0 else"negative_Q8","source_alpha":10,"terminal_alpha":7,"total_alpha":17,"terminal_type_index":type_index,"source_i0_through_i9":list(source),"terminal_i0_through_i9":list(terminal),"product_i0_through_i9":list(product),"Q8":value})
    type_min=value if type_min is None else min(type_min,value);type_max=value if type_max is None else max(type_max,value);pt=encode(product);batch_keys.append((10,type_index,encode(source),pt,str(value)));batch_products.append((10,pt))
    if len(batch_keys)==2500:connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)",batch_keys);connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)",batch_products);batch_keys.clear();batch_products.clear();gate()
   if batch_keys:connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)",batch_keys);connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)",batch_products)
   type_checks=len(sources);checks+=type_checks;minimum=type_min if minimum is None else min(minimum,type_min);maximum=type_max if maximum is None else max(maximum,type_max);per_type.append({"terminal_type_index":type_index,"terminal_relative_alpha7_type":relative,"raw_multisets":lower_raw+base_raw*relative,"canonical_checks":type_checks,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":type_min,"maximum_Q8":type_max})
   if type_index%50==0 or type_index==stop:connection.commit();gate();print(f"component={type_index}/{stop} checks={checks} private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",flush=True)
  connection.commit();database_checks=connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0];database_products=connection.execute("SELECT COUNT(*) FROM products").fetchone()[0];raw=sum(x["raw_multisets"]for x in per_type);assert database_checks==checks and raw==expected_raw and minimum>0;aggregate={"source_alpha":10,"terminal_alpha":7,"total_alpha":17,"terminal_type_index_start":start,"terminal_type_index_stop":stop,"terminal_type_count":len(per_type),"independently_counted_raw_multisets":raw,"canonical_check_keys":database_checks,"distinct_crossing_jets":database_products,"raw_to_canonical_compression":raw-database_checks,"canonical_key_to_product_collisions":database_checks-database_products,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":minimum,"maximum_Q8":maximum};connection.execute("INSERT INTO meta VALUES ('result',?)",(json.dumps(aggregate,sort_keys=True,separators=(",",":")),));connection.commit();connection.close();connection=None;stop_sampling.set();sampler.join(timeout=1);gate();elapsed=time.perf_counter()-started
  payload={"schema":"rank8-exceptional-first-crossing-alpha7-s10-shard-v1","status":"PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE10_SHARD","scope":{"source_alpha":10,"terminal_alpha":7,"total_alpha":17,"terminal_type_index_start":start,"terminal_type_index_stop":stop,"workers":1},"lower_canonical_state_counts_by_alpha":{str(i):len(v)for i,v in enumerate(states)},"per_terminal_type":per_type,"aggregate":aggregate,"resources":{"workers":1,"abort_limit_private_bytes":ABORT_LIMIT,"hard_limit_private_bytes":LIMIT,"design_projected_peak_private_bytes":shard["projected_peak_private_bytes"],"peak_private_bytes":peak,"peak_private_MiB":peak/1024**2,"elapsed_seconds":elapsed},"scope_warning":"Only this source-alpha10 terminal-alpha7 block is certified.","hashes":{JETS.name:digest(JETS),CLASSIFICATION.name:digest(CLASSIFICATION),DESIGN.name:digest(DESIGN),DEPENDENCY.name:digest(DEPENDENCY),database.name:digest(database),Path(__file__).name:digest(Path(__file__))}};output.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");checkpoint.unlink(missing_ok=True);obstruction.unlink(missing_ok=True);print(payload["status"]);print(f"raw={raw} checks={database_checks} products={database_products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}");print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}");print(f"database_sha256={digest(database)}");print(f"report_sha256={digest(output)}");return 0
 except ResourceGate as e:
  stop_sampling.set();sampler.join(timeout=1);payload={"status":"ABORTED_CLEANLY_RANK8_ALPHA7_SOURCE10_SHARD_RESOURCE_GATE","reason":str(e),"terminal_type_index_start":start,"terminal_type_index_stop":stop,"last_terminal_type_index":last_type,"peak_private_bytes":max(peak,private_bytes()),"scope_warning":"Resource checkpoint only; not a sign obstruction.","hashes":{Path(__file__).name:digest(Path(__file__))}};checkpoint.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);return 2
 except SignObstruction as e:
  payload={"status":"EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA7_SOURCE10_SHARD","witness":e.witness,"hashes":{Path(__file__).name:digest(Path(__file__))}};obstruction.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);return 3
 finally:
  if connection is not None:connection.close()
  stop_sampling.set();sampler.join(timeout=1)
if __name__=="__main__":raise SystemExit(main())
