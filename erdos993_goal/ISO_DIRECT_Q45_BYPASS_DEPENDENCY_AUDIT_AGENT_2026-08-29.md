# Direct rank-four/rank-five/rank-six ISO versus the auxiliary dependency

Date: 2026-08-29

Status: **exact dependency audit only.**  Direct all-forest proofs of the
required `Q_4`, `Q_5`, and `Q_6` cells remove those three ranks from the
final target, but they do not remove internal `D_4,N_4,D_5,N_5,D_6,N_6`
obligations from the current termwise-nonnegative recurrence.  No new
auxiliary positivity lemma is claimed here.

## 1. Rank five also has a direct ISO bridge

The proved all-forest rank-five three-halves theorem states, for every forest
of order at least ten,

```text
S_5=10p_5^2-p_4p_5-12p_4p_6 >= 0.
```

The required ISO quantity satisfies the exact identity

```text
Q_5=5p_5^2+p_4^2-6p_4p_6
   =S_5/2+p_4^2+p_4p_5/2 >=0.                       (1)
```

Moreover,

```text
5<L(alpha)  iff  alpha>=9.
```

The only prefix-relevant forest of order below ten has order and alpha both
equal to nine, hence is `9K_1`.  For `(1+x)^9`,

```text
(p_4,p_5,p_6)=(126,126,84),
S_5=15876,                 Q_5=31752.
```

Thus every required target `Q_5` cell is already proved directly, just as
every required target `Q_4` cell is.

The proved all-forest rank-six reserve gives, whenever `alpha>=10`,

```text
S_6=12p_6^2-p_5p_6-14p_5p_7 >=0,
Q_6=S_6/2+p_5^2+p_5p_6/2 >=0.                       (1a)
```

Since `6<L(alpha)` is equivalent to `alpha>=10`, this covers every required
target `Q_6` cell exactly.  Hence the unresolved target ISO ranks begin at
seven.

## 2. Exact two-leaf dependency

Let `a~u` and `b~v` be nonsibling leaves of `F`, and put

```text
B=F-{a,b}.
```

The two exact reductions are

```text
Q_r(F)
 =Q_r(F-a)+Q_(r-1)(F-{a,u})+D_r(F,a),               (2)

D_r(F,a)
 =D_r(F-b,a)+D_(r-1)(F-{b,v},a)+N_r(B;u,v).         (3)
```

For an ordinary third leaf `z~s`,

```text
N_r(B)
 =N_r(B-z)+N_(r-1)(B-{z,s})+G_r(B,z).               (4)
```

Equations (2)--(4) show the exact dependency tree already for target rank
six; after the new direct bridge, the target-rank-seven tree simply adds
one identical layer on top:

```text
Q_7 -> direct Q_6 and D_7,
D_7 -> D_6 and N_7,
N_7 -> N_6 and the rank-seven FML gap.
```

Below that layer the dependency is
cell:

```text
Q_6
 |- Q_6 on a smaller forest
 |- direct Q_5
 `- D_6
    |- D_6 on a smaller forest
    |- D_5
    |  |- D_5 on a smaller forest
    |  |- D_4
    |  |  |- D_4 on a smaller forest
    |  |  |- D_3
    |  |  `- N_4
    |  `- N_5
    `- N_6
       |- N_6 on a smaller forest
       |- N_5
       `- rank-six FML gap

N_5
 |- N_5 on a smaller forest
 |- N_4
 `- rank-five FML gap

N_4
 |- N_4 on a smaller forest
 |- N_3
 `- rank-four FML gap.
```

Therefore direct `Q_4,Q_5,Q_6` do not truncate the **existing** auxiliary
induction.  It still descends internally through `D_6,D_5,D_4` and
`N_6,N_5,N_4`.

## 3. Why the direct lower `Q` term does not absorb `D` automatically

In (2), the direct `Q_(r-1)` term lives on

```text
F-{a,u},
```

whereas the lower `D_(r-1)` term in (3) lives on

```text
F-{b,v}
```

with leaf `a`.  These are opposite marked orientations.  Substituting the
definition of `D` does not cancel the direct lower `Q` term.  The most
immediate possible new coupling is

```text
Q_(r-1)(F-{a,u})+D_(r-1)(F-{b,v},a).                (5)
```

An exact literal-tree census through order eleven verified (2)--(3) in
`51538` cells and found no negative value of (5).  That is useful evidence
for a possible new cross-orientation lemma, but it is not an all-forest proof
and is not present in the current skeleton.

## 4. Correct frozen conclusion

There are two different statements:

1. The unresolved **target ISO ranks** begin at `r=7`, because required
   `Q_4`, `Q_5`, and `Q_6` are directly proved.
2. The unresolved **FML auxiliary domain in the current recurrence** still
   begins at `r=4`.  Rank-five FML invokes `N_4`, and the proof of `D_5`
   invokes both `D_4` and `N_5`.

It is therefore invalid to say that FML starts at rank six merely because
target ISO does.  Such a reduction would require a new proved coupling such
as (5), or another direct theorem that supplies the internal `D/N` cells.

## 5. Replay

Run

```text
python assemble_rank5_three_halves_to_iso_bridge_cutoff_agent.py
python assemble_rank6_three_halves_to_iso_bridge_cutoff_agent.py
python audit_iso_direct_rank_bypass_dependency_agent.py
```

The success markers are

```text
PASS_EXACT_RANK5_THREE_HALVES_TO_PREFIX_ISO_BRIDGE
PASS_EXACT_RANK6_THREE_HALVES_TO_PREFIX_ISO_BRIDGE
PASS_EXACT_DIRECT_Q456_DO_NOT_TRUNCATE_STANDARD_DN_DEPENDENCY
```
