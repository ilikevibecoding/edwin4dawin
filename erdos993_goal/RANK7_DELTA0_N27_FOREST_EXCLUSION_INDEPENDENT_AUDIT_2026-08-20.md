# Independent audit: rank-seven `Delta0`, order 27, forest exclusion

Date: 2026-08-20

Status: **PASS for the stated certificate scope.**  The 25-vertex forest
edge-pair lift, its global corollary, the integer hard-face split, all 32
batch jobs, the exact algebra, and the artifact hashes passed an independent
low-memory audit.  No Bernstein replay was attempted because free RAM was
tight (3.55 GiB at the parent alert).

## Artifact integrity

The audited files have these exact SHA-256 hashes:

```text
FOREST_N25_I45_EDGE_PAIR_LIFT_2026-08-20.md
1BAF2AC41B75591F968D4AC213C5D761C1F77DCDB0A6244C439E3C2FD804B6D3

verify_forest_n25_i45_edge_pair_lift.py
5AB35757C52DCA97DA571617986B339758BBDF62CBB4EE35322A6B09DCE26D33

forest_n25_i45_edge_pair_lift_exact_20260820.json
184323919958BD9732BD34B88AD7B005B58247360D24966E4978381D0C082224

prove_rank7_delta0_joint_capacity_faces_finite.py
47B56B215EB3B7EA881537ED17DD21EACAF9139EDBFE584C6A013E41338545C1

prove_rank7_delta0_n27_hard_face_with_forest_exclusion.py
6B642C6B358FAB53DF220FE28E4F8244A11253AE6734D9C8FD100E39FCAAA5C8

run_rank7_delta0_joint_capacity_faces_n27_batch.py
F6079599F8A4CFA39B0CA9F26DD1635BBA52ACD1A710CB141E1C560984A5E36E

rank7_delta0_joint_capacity_faces_n27_exact_20260820.json
7FE23FF9A004A6CD924A1D13B4F5166F05CECCC12CB51FECC137E849BCF48C3C
```

The n=27 report embeds the exact generic- and hard-prover hashes above.

## Independent derivation of the forest lift

Let `a=i4(J)`, `b=i5(J)`, and

```text
B4=C(25,4)-a,  B5=C(25,5)-b.
```

Every edge is contained in `C(23,2)=253` four-sets.  The union bound on bad
four-sets therefore gives

```text
e(J) >= ceil(B4/253).
```

For `a<=8854`, `B4>=3796`, while `15*253=3795`, so `e>=16`.  The number of
adjacent edge pairs is

```text
sum_v C(deg(v),2)
 >= sum_(deg(v)>0)(deg(v)-1)
 = 2e - number_of_nonisolated_vertices
 >= 2e-25
 >= 7.
```

A disjoint edge pair has four vertices and lies in 21 five-sets.  An adjacent
pair has three vertices and lies in `C(22,2)=231` five-sets.  Consequently the
edge-pair/five-set incidence count is at least

```text
21*C(16,2) + (231-21)*7 = 3990.
```

Every induced five-vertex forest has at most four edges and hence at most six
edge pairs, so at least `ceil(3990/6)=665` five-sets contain at least two
edges.

For a bad five-set `S`, let `t(S)` be its number of bad four-subsets.  A set
with exactly one edge has `t=3`; a set with at least two edges has `t>=4`.
The independent enumeration of all `2^10` labelled five-vertex graphs
retained exactly 291 forests and reconfirmed both `max C(e(S),2)=6` and
`min t(S)=4` on the multi-edge class.  The exact incidence identity is

```text
D = sum_(bad S)(t(S)-3)
  = 21B4-3B5
  = 3(b-7a+35420).
```

Thus `D>=665`.  Since `3|D`, actually `D>=666`, and therefore

```text
b >= 7a-35198.
```

This is a global coefficient inequality for every 25-vertex forest with
`a<=8854`; it does not depend on the ambient `c5` or on a containment-face
value.  It applies to the rank-seven core because `J` is an induced subgraph
of a tree and is therefore a forest.

The full piecewise report was also reconstructed independently for every
integer `0<=a<=C(25,4)=12650`.  Its 51 maximal constant-parameter runs match
the JSON exactly, consecutively cover the whole integer domain, and have no
gap or overlap.  The first row outside the uniform `e>=16` mechanism is
`a=8855`, where `B4=3795` and the edge floor drops to 15.  This boundary
describes the mechanism's scope; it does not claim a counterexample to the
stronger inequality at `a=8855`.

## Integrality split

The repaired job is exactly `(n,m,face,q)=(27,25,containment,lower)`.  Its two
closed Bernstein cells are

```text
[0,8854],   with b>=7a-35198,
[8855,12650], without that extra inequality.
```

Because `a=i4(J)` is an integer, these cells contain every possible value
from zero through `C(25,4)`; the excluded real interval `(8854,8855)` contains
no coefficient value.  Both subcells pass exactly:

```text
[0,8854]:      211 nodes, 66 passed leaves, 40 discarded leaves,
[8855,12650]:  151 nodes, 43 passed leaves, 33 discarded leaves.
```

The extra constraint has the correct sign, `b-(7a-35198)>=0`, and the affine
map `a=a_low+(a_high-a_low)A` covers each closed cell for `0<=A<=1`.

## Exact 32-job batch audit

The independently generated key set

```text
n=27,
18<=m<=25,
face in {containment,extension},
q in {lower,upper}
```

has exactly `8*2*2=32` jobs and equals the ordered report key set.  There are
no omissions, duplicates, or off-scope rows.  The hard repair is used on its
one intended job only.  All return codes are zero, all stderr fields are
empty, and every generic result plus both hard subcell results parses as
`PASS` with `worst=None`.  Full-binary-tree accounting holds for each exact
certificate.  Counting the two hard subcells separately gives 33
certifications, 613 processed nodes, 194 passed leaves, and 129 strictly
infeasible discarded leaves.

## Algebra and endpoint completeness

For `normalized_low(0)`, `x` and `y` are absent.  The exact curvatures remain

```text
d^2F/dq^2 = -196s(s+1),
d^2F/dd^2 = 4((s-48)z-48),
```

so the two `q` endpoints and the two `b`/`d` endpoints are the correct
concavity reductions on `0<=s<=1`, `z>0`.  At `n=27`,

```text
z_low=2/7,
z_high=3420/7387<1/2,
q_upper-q_lower=3z/7>0.
```

Therefore half retention cannot create a third active upper-`b` face:
`c6/2=c5/(2z)>c5`, whereas containment gives `b<=c5-a<=c5`.  The literal
`b<=C(m,5)` ceiling is also redundant because
`((m-4)/5)C(m,4)=C(m,5)` for every `18<=m<=25`.  The containment and extension
faces, with the opposing capacity retained, completely cover the upper-`b`
endpoint.

All transformed constraints have the correct direction:

```text
b>=lower       -> b-lower>=0,
b<=upper       -> upper-b>=0,
b<=c6/2        -> c5-2bz=(c5/c6)(c6-2b)>=0,
c6<=C(27,6)    -> C(27,6)z-c5=(c5/c6)(C(27,6)-c6)>=0.
```

The exact Bernstein acceptance/discard logic is inherited from the already
hashed generic prover: positive denominators are certified exactly; a cell is
discarded only when a constraint is strictly negative throughout; a surviving
cell passes only with a nonnegative objective lower enclosure; depth exhaustion
returns `UNRESOLVED`, not `PASS`.

## Scope guard

The package proves the upper-`b`/lower-`d` endpoint at `n=27` for every
`18<=m<=25` and both `q` endpoints.  It does not prove the lower-`b`/upper-`d`
endpoint, `m<=17`, or any other order.

## Independent audit artifacts

```text
audit_rank7_delta0_n27_forest_exclusion_certificate.py
F75C2CC469A6E534D0F04472FFA2EEA6362BB10041CEB5FCF8E2E4F794F766BD

rank7_delta0_n27_forest_exclusion_independent_audit_exact_20260820.json
E7E026114C4BD55647A48E3259F7EA789008B8F20401826C678E05C003F322CE
```
