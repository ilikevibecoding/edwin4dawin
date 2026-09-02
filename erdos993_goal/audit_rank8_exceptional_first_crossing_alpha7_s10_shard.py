#!/usr/bin/env python3
"""Independent exponent/multiplicity audit of alpha7/source10 shard."""
from __future__ import annotations
import argparse,json,tempfile,threading,time
from pathlib import Path
from audit_rank8_exceptional_first_crossing_alpha4 import encode,multiply
from audit_rank8_exceptional_first_crossing_alpha7_s7_shard import digest,load_jets,prepare_database,q8
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT,private_bytes
ROOT=Path(__file__).resolve().parent;JETS=ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv";CLASSIFICATION=ROOT/"rank8_exceptional_tree_jets_exact_20260820.json";SOURCE=ROOT/"probe_rank8_exceptional_first_crossing_alpha7_s10_shard_exact.py";DEPENDENCY=ROOT/"audit_rank8_exceptional_first_crossing_alpha7_s7_shard.py";ABORT_LIMIT=448*1024**2
class ResourceGate(RuntimeError):pass
class SignObstruction(RuntimeError):
 def __init__(self,witness):super().__init__("nonpositive audit Q8");self.witness=witness
def paths(start,stop):
 stem=f"rank8_exceptional_first_crossing_alpha7_s10_types{start}_{stop}";return ROOT/f"{stem}_exact_20260820.json",ROOT/f"{stem}_keys_exact_20260820.sqlite3",ROOT/f"{stem}_audit_exact_20260820.json",ROOT/f"{stem}_audit_resource_checkpoint_20260820.json",ROOT/f"{stem}_audit_obstruction_20260820.json"
def raw_states(lower):
 identity=(1,)+(0,)*9;states=[[]for _ in range(11)];states[0].append(identity)
 for weight,component in lower:
  for alpha in range(weight,11):states[alpha].extend(multiply(x,component)for x in tuple(states[alpha-weight]))
 assert len(states[10])==14047 and len(states[3])==13;return states
def main()->int:
 p=argparse.ArgumentParser();p.add_argument("start",type=int);p.add_argument("stop",type=int);a=p.parse_args();start,stop=a.start,a.stop;report_path,database,output,checkpoint,obstruction=paths(start,stop);started=time.perf_counter();peak=private_bytes();event=threading.Event()
 def sample():
  nonlocal peak
  while not event.wait(.01):peak=max(peak,private_bytes())
 def gate():
  nonlocal peak
  peak=max(peak,private_bytes())
  if peak>=ABORT_LIMIT:raise ResourceGate(f"audit reached 448 MiB gate:{peak}")
 sampler=threading.Thread(target=sample,daemon=True);sampler.start();dbhash=digest(database)
 try:
  report=json.loads(report_path.read_text(encoding="utf-8"));assert report["status"]=="PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE10_SHARD"and report["hashes"][database.name]==dbhash;jets=load_jets();lower=tuple(x for x in jets if x[0]<7);terminals=tuple(poly for alpha,poly in jets if alpha==7);states=raw_states(lower);lower10=tuple(states[10]);lower3=tuple(states[3])
  with tempfile.TemporaryDirectory(prefix="rank8_alpha7_s10_audit_")as temp:
   c=prepare_database(Path(temp)/"independent.sqlite3");raw=0;minimum=maximum=None;batch=[]
   def flush():
    if batch:c.executemany("INSERT INTO keys VALUES (?,?,?,?,?,1) ON CONFLICT(source_alpha,largest_type,source,product,q8) DO UPDATE SET multiplicity=multiplicity+1",batch);batch.clear();gate()
   def record(source,terminal,type_index):
    nonlocal raw,minimum,maximum
    product=multiply(source,terminal);value=q8(product)
    if value<=0:raise SignObstruction({"classification":"zero_Q8"if value==0 else"negative_Q8","terminal_type_index":type_index,"Q8":value,"source":list(source),"terminal":list(terminal),"product":list(product)})
    raw+=1;minimum=value if minimum is None else min(minimum,value);maximum=value if maximum is None else max(maximum,value);batch.append((10,type_index,encode(source),encode(product),str(value)))
    if len(batch)==2500:flush()
   for type_index in range(start,stop+1):
    relative=type_index-247;terminal=terminals[relative-1]
    for source in lower10:record(source,terminal,type_index)
    for component in terminals[:relative]:
     for base in lower3:record(multiply(base,component),terminal,type_index)
    if type_index%50==0 or type_index==stop:flush();c.commit();gate();print(f"audit-component={type_index}/{stop} raw={raw} private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",flush=True)
   flush();c.commit();c.execute("INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys");c.commit();keys=c.execute("SELECT COUNT(*) FROM keys").fetchone()[0];products=c.execute("SELECT COUNT(*) FROM products").fetchone()[0];c.execute("ATTACH DATABASE ? AS recurrence",(str(database.resolve()),));cols="source_alpha,largest_type,source,product,q8";assert c.execute(f"SELECT {cols} FROM keys EXCEPT SELECT {cols} FROM recurrence.keys LIMIT 1").fetchone()is None and c.execute(f"SELECT {cols} FROM recurrence.keys EXCEPT SELECT {cols} FROM keys LIMIT 1").fetchone()is None and c.execute("SELECT source_alpha,product FROM products EXCEPT SELECT source_alpha,product FROM recurrence.products LIMIT 1").fetchone()is None and c.execute("SELECT source_alpha,product FROM recurrence.products EXCEPT SELECT source_alpha,product FROM products LIMIT 1").fetchone()is None;c.execute("DETACH DATABASE recurrence");c.close()
  assert digest(database)==dbhash;row=report["aggregate"];assert(raw,keys,products,minimum,maximum)==(row["independently_counted_raw_multisets"],row["canonical_check_keys"],row["distinct_crossing_jets"],row["minimum_Q8"],row["maximum_Q8"])and row["negative_Q8"]==row["zero_Q8"]==0;event.set();sampler.join(timeout=1);gate();elapsed=time.perf_counter()-started;payload={"schema":"rank8-exceptional-first-crossing-alpha7-s10-shard-audit-v1","status":"PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA7_SOURCE10_SHARD_AUDIT","method":"independent list exponent DP for c10=14047 and c3=13, prefix convolution, both SQLite EXCEPT directions","shard":{"source_alpha":10,"terminal_alpha":7,"terminal_type_index_start":start,"terminal_type_index_stop":stop,"independently_enumerated_multisets":raw,"canonical_check_keys":keys,"distinct_crossing_jets":products,"raw_to_canonical_compression":raw-keys,"canonical_key_to_product_collisions":keys-products,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":minimum,"maximum_Q8":maximum},"resources":{"workers":1,"abort_limit_private_bytes":ABORT_LIMIT,"hard_limit_private_bytes":LIMIT,"peak_private_bytes":peak,"peak_private_MiB":peak/1024**2,"elapsed_seconds":elapsed},"hashes":{report_path.name:digest(report_path),database.name:digest(database),SOURCE.name:digest(SOURCE),DEPENDENCY.name:digest(DEPENDENCY),JETS.name:digest(JETS),CLASSIFICATION.name:digest(CLASSIFICATION),Path(__file__).name:digest(Path(__file__))}};output.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");checkpoint.unlink(missing_ok=True);obstruction.unlink(missing_ok=True);print(payload["status"]);print(f"raw={raw} keys={keys} products={products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}");print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}");print(f"audit_sha256={digest(output)}");return 0
 except ResourceGate as e:event.set();sampler.join(timeout=1);payload={"status":"ABORTED_CLEANLY_RANK8_ALPHA7_SOURCE10_SHARD_AUDIT_RESOURCE_GATE","reason":str(e),"peak_private_bytes":max(peak,private_bytes()),"scope_warning":"Resource checkpoint only.","hashes":{Path(__file__).name:digest(Path(__file__))}};checkpoint.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);return 2
 except SignObstruction as e:payload={"status":"EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA7_SOURCE10_SHARD_AUDIT","witness":e.witness,"hashes":{Path(__file__).name:digest(Path(__file__))}};obstruction.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);return 3
 finally:event.set();sampler.join(timeout=1)
if __name__=="__main__":raise SystemExit(main())
