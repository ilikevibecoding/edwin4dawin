# Forest `m=1,j=3` pair-cap subdivision checkpoint

Date: 2026-08-29

Status: **exact diagnostic checkpoint, not a proof.** The pair-exclusion cap
was substituted into both retained lower branches on the enlarged middle
relaxation. Exact dyadic Bernstein subdivision processed 400 boxes.

The run certified 119 boxes, all with the tangent branch, and encountered 78
depth-18 boxes that neither branch certified. Seven boxes remained on the
stack at the 400-node limit. No exact negative value and no realizable forest
counterexample was found; a negative Bernstein coefficient is only failure of
that coefficient cone.

Every processed hard path shared the prefix

```text
t1 r1 u0 r1,
```

which means

```text
D/s >= 10/3,
R/(R+L) >= 3/4,
u=2(h-1)/(S-2) <= 1/2.
```

This localizes the next structural target to large marked degree, most
noncomponent budget in root-neighbor child excess `R`, and relatively few
components. It does not close that sector, and the unprocessed stack means it
is not a complete localization of the whole middle strip.

Pins:

```text
probe_terminal_q3_m1_forest_j3_paircap_adaptive_independent_agent.py
  411F75B651AA87BB8C00488F89DC8D1AEB450850AB40940F70AF51E0350AF939
probe_terminal_q3_m1_forest_j3_ratio_bands_independent_agent.py
  C3FF4FAA43AE0A8232242DD1BE81699C39A5E975C2682B426DDFF4E6C1A1D203
terminal_q3_m1_forest_j3_paircap_adaptive_checkpoint_20260829.json
  66729408816B943EC833951005CE8F4D0208E73F12E970EB1CD6362787A1E48C
```

Exact command:

```text
python probe_terminal_q3_m1_forest_j3_paircap_adaptive_independent_agent.py --lo 5/3 --hi 5/1 --shift 10 --max-nodes 400 --max-depth 18
```
