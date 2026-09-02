# Independent audit: rank-seven `Delta0` joint-capacity faces

Date: 2026-08-20

Status: **PASS for the stated certificate scope.**  The prover algebra,
endpoint reductions, constraint signs, exact job coverage, recorded results,
and SHA-256 chain all passed an independent low-memory audit.  This audit did
not rerun the 616 Bernstein jobs: the available-RAM snapshot was 4.87 GiB,
below the parent-specified `>5 GiB` replay threshold.

## Hash and report integrity

The audited files exactly match the advertised immutable hashes:

```text
prove_rank7_delta0_joint_capacity_faces_finite.py
47B56B215EB3B7EA881537ED17DD21EACAF9139EDBFE584C6A013E41338545C1

run_rank7_delta0_joint_capacity_faces_finite_batch.py
A03AE76E4862778BB8F501A2E48085B2A175498571898D1BEBADC1DB418C3229

rank7_delta0_joint_capacity_faces_n28_n38_exact_20260820.json
D73730C11984AC29A7AF2B3ADE27002396A8B31C21091F176465FEA014F9C832
```

The report's embedded prover hash is identical to the source hash.  All 616
rows have return code zero, empty stderr, a parsed exact result with
`status='PASS'` and `worst='None'`, and valid full-binary-subdivision
accounting.  The report contains 1,826 processed boxes, 752 certified leaves,
and 469 strictly infeasible discarded leaves.  The largest individual job is
`(n,m,face,q)=(28,26,containment,0)` with 137 boxes.

## No-gap coverage

The independently generated expected key set is exactly equal, in order, to
the report key set:

```text
28 <= n <= 38,
18 <= m <= n-2,
face in {containment, extension},
q in {0,1}.
```

There are

```text
sum_(n=28)^38 (n-19) = 154
```

`(n,m)` pairs and hence `154*2*2=616` jobs.  Counts by order are
`36,40,44,48,52,56,60,64,68,72,76`; there are no duplicates, omissions, or
off-scope rows.

## Algebra and endpoint audit

For `normalized_low(0)`, `x` and `y` are absent.  Thus setting them to one is
algebraically inert.  The two exact curvatures are

```text
d^2 F/dq^2 = -196 s(s+1),
d^2 F/dd^2 = 4((s-48)z-48).
```

On every feasible cell, `0<=s<=1` and `z>0`, so both are nonpositive (the
second is strict).  Therefore checking both `q` endpoints is complete, and
the minimum in the `d` coordinate occurs at a `b` endpoint because
`d=1-bz/c5` is affine in `b`.  The prover covers the upper-`b`/lower-`d`
endpoint only, as claimed.

The upper feasible `b` endpoint is exactly one of the two faces

```text
b=c5-a,
b=((m-4)/5)a.
```

No third upper face is missing:

- `((m-4)/5) C(m,4)=C(m,5)`, so the literal `b<=C(m,5)` ceiling is redundant
  with the extension capacity and `a<=C(m,4)`.
- Exact evaluation for every `28<=n<=38` gives
  `0<z_low<z_high<1/2`.  Hence `c6/2=c5/(2z)>c5`, while the containment face
  already gives `b<=c5-a<=c5`; half retention cannot be the active upper cap.
- On each chosen face, the opposing capacity is retained as a feasibility
  constraint.  Therefore the two cells cover `min(c5-a,((m-4)/5)a)` without a
  gap.

The rank-six endpoints are ordered because

```text
q_upper-q_lower = 3z/7 > 0.
```

## Constraint directions and exact certification logic

All signed constraints have the correct direction:

```text
b >= lower             -> b-lower >= 0,
b <= upper             -> upper-b >= 0,
b <= c6/2              -> c5-2bz = (c5/c6)(c6-2b) >= 0,
c6 <= C(n,6)           -> C(n,6)z-c5 = (c5/c6)(C(n,6)-c6) >= 0.
```

The maps `a=C(m,4)A` and
`c5=C(n-4,5)+(C(n,5)-C(n-4,5))W` cover the stated relaxed coefficient
ranges, and the exact `z` map covers its ordered interval.  Since a feasible
face retains `b>=0` and the containment capacity, it also forces
`0<=a<=c5`, hence `0<=s=1-a/c5<=1`, which is the domain needed for the
curvature signs.

For every rational objective and constraint, the prover cancels first and
accepts the denominator only after an exact strictly positive Bernstein
certificate.  A box is discarded only if some constraint's maximum
Bernstein coefficient is strictly negative.  A surviving box passes only if
the objective's minimum coefficient is nonnegative.  A depth exhaustion
sets `UNRESOLVED`, so it cannot silently produce a false `PASS`.

## Exact scope guard

This certificate proves only:

```text
upper-b / lower-d endpoint,
28<=n<=38,
18<=m<=n-2,
both q endpoints.
```

It does **not** prove the lower-`b`/upper-`d` endpoint, `m<=17`, order 27, or
orders at least 39.  Those remain separate obligations exactly as the theorem
note states.

## Audit artifacts

```text
audit_rank7_delta0_joint_capacity_faces_certificate.py
FA0AB4319944CA0DCE57D971D770C07FF1899DC016D388705371E23297E6994A

rank7_delta0_joint_capacity_faces_independent_audit_exact_20260820.json
C6642EB5D5CCBE84EB38CBB725388789C5B2538358234263146229FEB543B98B
```
