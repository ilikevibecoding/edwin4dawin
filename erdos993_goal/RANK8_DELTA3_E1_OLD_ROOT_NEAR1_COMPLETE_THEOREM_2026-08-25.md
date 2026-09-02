# Rank-eight Delta3 e=1 old-root near=1 theorem

Date: 2026-08-25

Status: **proved with an independent exact literal adjacency-list/include-
exclude tree-DP replay**.  No sign conclusion is inferred from the near=0,
near=2, or Delta2 theorems.  This closes one old-root orbit of the
subdivided-claw (`e=1`) family, not arbitrary leaf extension or Problem 993.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Choose an arm with
at least two vertices and root `T` at its second vertex, leaving one vertex
between the center and the root.  Extend any one of the three arms by one new
leaf.  Then the `Delta3` coefficient of the rank-eight terminal residual at
the old root increases strictly.

Order the two arms not containing the root and write the source arm lengths as

```text
(tail+2, short+1, short+difference+1),
```

where all parameters are nonnegative.  The source order is

```text
n = tail + 2*short + difference + 5,
```

so `n>=23` is precisely

```text
tail + 2*short + difference >= 18.              (1)
```

The root-arm, shorter-other-arm, and longer-other-arm extension labels cover
all arm choices; equal other-arm lengths only introduce symmetry.

## Exact no-gap certificate

For each extension orbit, (1) is partitioned without gaps or overlaps into
109 integer Newton cells:

1. `tail>=18`;
2. fixed `tail=0..17` and
   `short>=ceil((18-tail)/2)`;
3. fixed smaller `tail,short` and
   `difference>=18-tail-2*short`.

The count is `1 + 18 + 90 = 109`.  Exact Delta3 forward differences with
conservative degree bound 26 in each active coordinate immediately certify
90 cells per extension.  The remaining 19 have positive sampled values and
origins but a mixed initial Newton basis: ten univariate rays, eight
bivariate cells, and the `tail>=18` trivariate cell.

Every mixed cell is replaced by an exact disjoint refinement:

- Each obstructed difference ray is a finite positive prefix followed by a
  shifted degree-26 Newton tail with nonnegative coefficients and positive
  origin.
- Each obstructed bivariate cell is split into
  `short>=5,difference>=0` and fixed-short strips below 5.  The bulk is
  coefficientwise nonnegative, while each strip uses a finite prefix and
  shifted Newton tail.
- The trivariate cell is partitioned into

  ```text
  short>=5, difference>=0;
  short=0..4, difference>=5;
  short=0..4, difference=0..4.
  ```

  Per extension this gives one `27^3` tensor, five `27^2` tensors, and
  twenty-five 27-coefficient rays.

The complete rank-3 producer certifies:

| exact item | count |
|---|---:|
| extension orbits | 3 |
| original cells | 327 |
| immediate coefficientwise cells | 270 |
| original mixed cells replaced | 57 |
| original coefficients profiled | 105,705 |
| refined bivariate bulk tensors | 24 |
| refined trivariate regions | 93 |
| refined tensor coefficients | 89,505 |
| shifted rays | 90 |
| shifted-ray coefficients | 2,430 |
| literal finite-prefix values | 180 |
| negative coefficients in proving regions | 0 |

Every proving-region origin and literal prefix value is positive.  The
minimum sampled increment across the three original partitions is
`224017756555203436826`.

## Independent replay

The dedicated audit imports no near=0 or near=2 certificate or conclusion,
no Delta2 certificate or conclusion, and none of the producer, refinement-
helper, or subdivided-claw path-polynomial code.  It builds each source and
extended claw as a literal adjacency list, places the old root at arm
distance two, and computes the core and root-deletion independence
polynomials through rank eight with generic include/exclude forest DP.  The
only shared mathematical definition is the canonical terminal residual in
`verify_rank8_q8_terminal_reduction.py`.

The audit matched all 327 original rank-3 ordered coefficient digests, all 24
bivariate bulk tensors, all 93 trivariate-region digests, all 90 shifted
rays, and all 180 literal prefix values.  It independently reconstructed the
threshold-18 and refinement partitions and verified that each of the 57
mixed cells is replaced exactly once.

Audit status:

```text
PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR1_COMPLETE
```

## Exact evidence

```text
probe_rank8_delta23_e1_old_root_near1_profile_agent_20260825.py
  CEF8FCFA0E5B8F8117A55FB50780A5F802A4993A8516CAD5B4987D24D708540E
rank8_delta23_e1_old_root_near1_profile_exact_agent_20260825.json
  D4E2D83701881E723D799E9592094ADA6EB97DF8AB4E5E4D5EC85DBEBC24AA12

rank8_e1_old_root_refinement_machinery_agent_20260825.py
  2771F20D90E1F7BC6016FA20FA375548413BD3EB7B88454510C3919D254804AE

prove_rank8_delta3_e1_old_root_near1_complete_agent_20260825.py
  D992E689A23EE27506E24EA783D530604E1459FD0C4F31F65CD7254CB3F305D3
rank8_delta3_e1_old_root_near1_complete_exact_agent_20260825.json
  B3E98DE6989AC6D8F22401F420604AA6673E67606B69381BFD11F7C29A7D4888

audit_rank8_delta3_e1_old_root_near1_complete_agent_20260825.py
  E03AC7AADA17538D81BE13A7CEDDD5F3CAF79F3C610B609D797503BF44E86E3F
rank8_delta3_e1_old_root_near1_complete_independent_audit_agent_20260825.json
  B5E110EDC937A5AB33DC2722B32F42537EA3981D77C4A07F350A95DE471A760B
```

## Boundary

This theorem closes `Delta3` only for the `e=1` subdivided-claw old-root
orbit with `near=1`.  Other root distances, arbitrary trees, the general
`Delta2/3` inserted-new-leaf gates, full `Q8/PGC`, forest independence-
sequence unimodality, and Erdős Problem 993 remain open.
