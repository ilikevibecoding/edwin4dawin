# Rank-seven `Delta0` joint-capacity face theorem at order 27

Date: 2026-08-20

Status: **the two lower-retention endpoint faces are proved exactly at
`n=27` for every `18<=m<=25`.** The lower-`b`/upper-retention side and
`m<=17` remain separate.

The generic joint-capacity prover covers 31 of the 32 cells

```text
m=18,...,25,
face in {containment,extension},
rank-six endpoint in {lower,upper}.
```

The sole loose continuous cell is `m=25`, containment, lower rank-six
endpoint.  Its only negative integer window is repaired by the following
independent forest inequality.

If `J` is a forest on 25 vertices and `a=i4(J)<=8854`, then

```text
i5(J) >= 7a-35198.
```

Indeed, `B4=C(25,4)-a>=3796` implies at least 16 edges.  There are at least
seven adjacent edge pairs, hence at least 3,990 incidences of edge pairs in
five-subsets.  A five-vertex forest contains at most six edge pairs, so at
least 665 five-subsets contain two or more edges.  The exact bad-set
incidence excess

```text
D=21B4-3B5=3(i5(J)-7a+35420)
```

is divisible by three, and therefore `D>=666`, proving the inequality.  The
verifier also packages the valid piecewise lift for every integer
`0<=a<=C(25,4)`.

The hard Bernstein cell splits at the exact integer boundary into
`0<=a<=8854`, where the strengthened forest inequality is imposed, and
`8855<=a<=12650`, where the generic constraints suffice.  Both subcells pass.
Together with the other 31 cells this gives the marker

```text
PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N27 32.
```

An independent audit rederives the forest inequality, enumerates all 291
labelled five-vertex forests used in the local bound, verifies the 51
piecewise intervals, regenerates all 32 batch keys, and parses all 33 exact
certifications with no gap or sign error.

## Artifacts

```text
FOREST_N25_I45_EDGE_PAIR_LIFT_2026-08-20.md
1BAF2AC41B75591F968D4AC213C5D761C1F77DCDB0A6244C439E3C2FD804B6D3

forest_n25_i45_edge_pair_lift_exact_20260820.json
184323919958BD9732BD34B88AD7B005B58247360D24966E4978381D0C082224

prove_rank7_delta0_n27_hard_face_with_forest_exclusion.py
6B642C6B358FAB53DF220FE28E4F8244A11253AE6734D9C8FD100E39FCAAA5C8

run_rank7_delta0_joint_capacity_faces_n27_batch.py
F6079599F8A4CFA39B0CA9F26DD1635BBA52ACD1A710CB141E1C560984A5E36E

rank7_delta0_joint_capacity_faces_n27_exact_20260820.json
7FE23FF9A004A6CD924A1D13B4F5166F05CECCC12CB51FECC137E849BCF48C3C

RANK7_DELTA0_N27_FOREST_EXCLUSION_INDEPENDENT_AUDIT_2026-08-20.md
6FE7FC5CAA57AE94B22043567AEF00F5DA79D52548AB04C2A54366138D394734
```
