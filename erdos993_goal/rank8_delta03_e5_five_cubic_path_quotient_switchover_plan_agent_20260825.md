# Five-cubic-path quotient switchover plan — DO NOT EXECUTE

Refreshed at `2026-08-25T19:21:21-04:00`. This is a read-only plan. No healthy
waiter is to be interrupted or replaced without a separate reviewed decision.

## Current healthy predecessor and dormant legacy chain

The live predecessor is center-pendant resilient controller PID `308112`,
script SHA-256
`BFA1D317BF42D6BAF24689B4507FD83BAA72375D5B35C06A476CE85A3A7D156A`.
Its full independent audit child is PID `450536`; at refresh the redirected log
had sealed batch 1360 and cursor `1,020,000,000 / 4,406,205,440` (23.15%). The live audit
checkpoint must not be opened or hashed while PID `450536` is active.

The later chain is alive but dormant. Each waiter has only its console host and
no ray scanner child:

| Order | PID | Waits for | Script | Script SHA-256 |
|---|---:|---:|---|---|
| 1 | 408692 | 308112 | `drive_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_chain_root.ps1` | `C7CF0E3385029A16C517048CF82D194B928C5513B3F491DE774900DDE26122C0` |
| 2 | 115492 | 408692 | `drive_rank8_delta03_e5_five_cubic_path_inner_spine_internal_cuda_chain_root.ps1` | `1B891D0AA6096CB19E17122B4B8388E3AB04B1ACF6BAA0B3021882F8DF028A9D` |
| 3 | 184020 | 115492 | `drive_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_chain_root.ps1` | `6EAE1A6A75B96826B8FEA59ADA8381A4EECDF89B256B487DFECA87E5AC84DED8` |
| 4 | 213868 | 184020 | `drive_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_chain_root.ps1` | `FC5D74DA7C44FD6C7E8ABEF9448B80163F3D96416125747E6D80DE50DBB14248` |

The exact no-race predecessor boundary for the first later orbit is verified
exit of PID `308112`, followed by a fresh process scan proving that neither the
legacy inner-pendant scanner nor a quotient scanner is active. Successive
boundaries are the verified exits of the controller immediately above each
later orbit.

## Pinned quotient recovery components

| Component | SHA-256 |
|---|---|
| Canonical quotient utility | `F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864` |
| Low-memory grouped engine | `EF1B9D19E20424564AC51F8CF399612480772581E9F6B07C6B5B78573641E108` |
| Production checkpoint driver | `642DBA783AA5F3AF38A7360AD811036317145406743C9C0B10CE1BA177135DCE` |
| Four-layout quotient scanner | `73B6757090E16C7B916F2A646D26B9E69F0FB0566843D2694404DF02BFE0B60B` |
| Legacy-prefix importer | `64D0060AE851A9849B560E6722B102FCA9DE62E22632A311EAA9ADFEFC6638C7` |
| Recovery ray controller | `25C24B1AE370EAF84DFBA9ED611F24DD341283561E18F75CC7649E531680D949` |

The additive full-stage components are now present, but none is armed in the
healthy waiter chain:

| Full-stage component | SHA-256 |
|---|---|
| Layout/count configuration | `7A154586039D96D2BCFB9C82267D9854D2206361A65185EB1A6373C54D78BCAE` |
| Independent raw-multiplicity replay | `37FDA3CFE1A06DAA1A66CA824D30543D37AACA78BA71E53E77FB59288A4764D8` |
| Quotient primary assembler | `611AA292FD778D78093783A7D67CB755FE9838A2FD1FF5E09D2F76DB297A37D6` |
| Full independently transcribed raw-audit wrapper | `993864DBABE869DBAD94E3D77C178EA993A9B40C9461D37389574AF8F1B5126E` |
| N28+ exact primary seal | `2EE677AEE4FC588963ABAF1386F67D987D6BA6F0C59B15CF6811D8BF69CA73A6` |
| Dual independent-audit seal | `C350C27F92E126BB1746A00A75ADAC50F8E49728A3ACEBA852002970205E268F` |
| N27+ final assembler | `71C5E888041DBFD4CDC28F8AAE6ACD2918F2D589FFEA68475DF736C01E06D2FF` |
| Structural + genuine-batch qualification source | `C9FC2FA047AA407CB4FC368470CE870B0636A0CB6DBA3E697D00A5360B5C9B1C` |
| Structural + genuine-batch qualification report | `D64A0ECA73FB545911A4AF64CC7F8A1ABA1D3A0E5EDE73D286B8579A02ACB748` |
| Disposable end-to-end fixture/mutation audit source | `23043921B768909D4DF692E2C5D531C977110AA8E90D5AAD3AD0DEFA6DF30A0B` |
| Disposable end-to-end fixture/mutation audit report | `E5C4D24F6FA8801B49A33F363A41F0238A3286B695C0F8B2A4A8AFAAA0F5542F` |
| Dormant full-stage controller/waiter | `F5F520A1B1002608128DE41DA8E5E48A1DE3908EF7E0EA9C8C0D296FF1ECDD19` |
| Controller qualification report | `3E0B8F88E434FC64A93FD2D204686FE6E8EDD336AD2D55D999C79EFB4FC27F17` |
| Controller mutation-audit source | `203ECC80209D217550E3829D1008B795D8F3CAB7FF79F41B287750E92381A109` |
| Controller mutation-audit report | `ED0AE1B3CAE4BD6E077A41B99A610E32A0F972012C945AB521C234F91599382B` |

The recovery controller is deliberately ray-stage-only. It waits for the
specified original controller to exit, rejects any active legacy or quotient
scanner, accepts a complete legacy result without doing work, acquires an
exclusive per-layout recovery lock, imports any sealed legacy prefix, and runs
40-batch quotient segments. Three consecutive no-progress exits are a hard
stop. It never reads a checkpoint while its scanner child is active.

## Evidence gates already passed

1. Canonical 12,544-state quotient report:
   `E0E9C25CA2725C9C4A7B2FEBFAC7BB4D35BCB36FD12DBEF118430834CFB8FDAB`.
2. Independent literal-tree DP audit:
   `DC7F2800B649AF48BC27C7EE63CCF858A61E8E5C06B5A8B973730FD8298F05B9`.
3. All-layout orientation/domain certificate:
   `DFAF77DFFF213F5C0B1D12CA6EEEDCFB4B252493B6E452D2A93D5249CFADA2F3`.
4. Four genuine 750,000-pattern batch raw-versus-grouped qualification:
   `49E6DBCA6E7039E090F8D82D118AB94C4E4CB3F5174E01AA3B1E601D6EE3C3B9`.
   Every classifier total and final raw-ordinal fingerprint was byte-identical.
5. Isolated legacy import plus second-pass overlap replay audit:
   `CC08335D549CA8143B834BE809953AF2ADFEF5AC9390615AC2514A2E7628B770`.
6. One isolated production checkpoint batch is sealed for inner-pendant at
   cursor `750,000`, checkpoint SHA-256
   `651442FE4F607DEE66319007F4EB45371A30F7B0904FBE867F8E44869C6A3D15`.
   Its legacy-compatible fingerprint is
   `15C909B8BC4271B24E0451BA23122375C1170A8014E4227355758C19D6B0F2FB`.
7. A separately implemented sort/search raw-multiplicity replay regenerated
   that genuine batch: `465,996` raw rays, `324,498` canonical groups, maximum
   multiplicity `7`, and mapping digest
   `EEEE39723C9BADFBB223DC57E548832EABFB646AFBD1DFC14A2A31D8B3616594`.
   Its partial qualification report is
   `B086A2938F868F58F72C4182BF7D930A2747F741BE4749AF12755C003B947655`;
   its status is explicitly non-crediting and cannot satisfy any final seal.
8. All four generic full-audit configurations were structurally matched to
   the legacy exhaustive counts and independently transcribed audit/row/finite
   adapters. A synthetic one-ray multiplicity mutation was rejected by the
   primary validator. The qualification report is
   `D64A0ECA73FB545911A4AF64CC7F8A1ABA1D3A0E5EDE73D286B8579A02ACB748`.
9. The dormant full-stage controller enforces exact predecessor identity,
   absence of competing legacy/quotient processes, an exclusive owner lock,
   the ordered eight-stage gate, three-exit no-progress hard stops, and final
   ray-pair immutability. Isolated mutations of predecessor hash, competing
   scanner, stage order, partial raw-audit status, and missing full audit all
   failed closed; valid isolated manifests for all four layouts passed. Mutation-
   audit report:
   `ED0AE1B3CAE4BD6E077A41B99A610E32A0F972012C945AB521C234F91599382B`.
10. The complete Python gate sequence was executed inside an automatically
    deleted fixture directory through primary, N28+ exact, dual-audit, and N27+
    final outputs. Selected-side coverage false, raw-map disagreement, and a
    partial full-raw-audit status each failed closed. This is plumbing-only
    evidence and retains no synthetic proof artifact. Report:
    `E5C4D24F6FA8801B49A33F363A41F0238A3286B695C0F8B2A4A8AFAAA0F5542F`.

The original exhaustive ray count remains `34,308,196,328`. The global
context-local quotient has `24,264,798,236` formula rows, a theoretical 29.27%
reduction. Production grouping remains inside each original batch, so this is
an evaluation-count ceiling, not a wall-clock or proof-scope claim.

## Authorized recovery-only procedure

This path does not replace a healthy waiter:

1. Wait for the original orbit controller and all of its scanner children to
   exit.
2. At that child boundary, take one immutable byte snapshot/hash of the legacy
   checkpoint and, if present, the legacy report. Do not inspect either while a
   scanner is active.
3. If the legacy report and checkpoint form a complete valid pair, retain them
   and do no quotient work.
4. If incomplete, select exactly one recovery owner. Do not launch the existing
   legacy resilient controller and quotient recovery controller together.
5. Launch the quotient recovery controller with the exited original controller
   PID. Its exclusive layout lock prevents a second quotient owner.
6. The importer labels every adopted legacy batch
   `IMPORTED_SEALED_LEGACY_EXHAUSTIVE_RAW_BATCH`, preserves its original
   fingerprint/statistics, and claims zero savings. Only the suffix is grouped.
7. Require a final atomic quotient checkpoint/report pair, exact original
   totals, zero failures, pinned mapping digest, a complete raw-multiplicity
   audit/checkpoint pair, the unchanged exhaustive finite result, a complete
   independently transcribed raw CUDA audit/checkpoint pair, and both N28+ and
   N27+ seals before proof credit.

## Future proactive replacement procedure — review required

A proactive replacement is not currently authorized and is not yet complete.
If separately approved, all of these conditions are required:

1. Perform the change while PID `308112` is still alive and the four legacy
   waiters remain childless. Reacquire all PIDs and command lines immediately
   before action; stale PIDs invalidate the plan.
2. Preserve hashes of all waiter scripts, logs, and every existing legacy and
   quotient checkpoint. Never rename, overwrite, truncate, or delete legacy
   evidence.
3. Establish one ownership record for the chain. The legacy waiter chain must
   be absent before any quotient waiter is armed; merely starting a quotient
   waiter alongside the legacy waiters would double-launch at PID `308112`'s
   exit.
4. If replacement is approved, retire legacy waiters in reverse dependency
   order (`213868`, `184020`, `115492`, `408692`), recheck that no scanner was
   launched, then arm a new chain in forward order. Each new successor must
   wait for the actual PID of its newly launched predecessor.
5. Do not use the current ray-only recovery controller directly as the
   predecessor for the next orbit. The dormant full-stage wrapper now makes
   its own successful exit mean: quotient ray pair, raw-multiplicity audit
   pair, finite pair, primary assembly, independently transcribed raw full-
   audit pair, dual seals, and final N27+ report all passed. It is not attached
   to any live PID or waiter. Proactive switchover remains blocked until a
   separate review explicitly authorizes arming it and replacing waiters.
6. The new quotient primary assembler pins the quotient checkpoint/report,
   complete raw-multiplicity audit/checkpoint, and unchanged finite evidence.
   The full-audit wrapper uses each layout's independent raw formula/domain and
   original raw/finite adapters. The dual audit seal requires both audits; the
   N27+ assembler requires both N28+ exact and independent seals.

## Double-launch prevention

- Reacquire process state after every predecessor transition.
- Treat any legacy scanner, quotient scanner, or unexpected child as a hard
  stop.
- Use exactly one recovery mode: legacy resilient or quotient recovery.
- Hold the exclusive layout recovery lock for the entire import/scan sequence.
- Start successors only from the verified exit of a full-stage predecessor.
- Never infer safety from an idle log or stale PID alone.

## Legacy preservation and rollback

- Quotient artifacts use distinct `cuda_quotient_*` names. Legacy checkpoints,
  reports, logs, and batch fingerprints remain unchanged.
- Before a proactive predecessor exits, rollback is: stop only the still-
  dormant quotient waiters, verify no quotient scanner ever started, and
  recreate the original forward waiter chain from the pinned scripts.
- After a quotient scanner starts, do not kill it mid-batch. Wait for its child
  to exit and atomically seal the last checkpoint, then leave the quotient
  artifact in place. The untouched legacy checkpoint remains the rollback
  point.
- Never convert quotient-only batches back into legacy credit. Resume legacy
  from its own untouched cursor, accepting duplicated computation.
- Any fingerprint mismatch, mapping mismatch, cursor regression, source-pin
  drift, or three consecutive no-progress exits is a hard stop with all
  interval evidence preserved.

## Independent validation required before any final credit

For each later orbit, all gates must pass in order:

1. final quotient ray checkpoint/report with original pattern/ray counts;
2. per-batch raw multiplicities and legacy-compatible fingerprints;
3. unchanged all-short finite scan and exact finite report;
4. new hash-pinned primary assembler;
5. independent full raw-domain audit using the separate audit formula;
6. exact primary/audit agreement on domain totals and zero failures;
7. final N28+ then N27+ seal; and
8. registry/master refresh only after all immutable hashes are known.

Until the dormant full-stage controller/waiter chain is separately reviewed
and armed, the only permitted use is recovery after an original exits
incomplete. The presence of qualified dormant gates and a mutation-tested
controller does not authorize replacing the healthy legacy waiter chain.
