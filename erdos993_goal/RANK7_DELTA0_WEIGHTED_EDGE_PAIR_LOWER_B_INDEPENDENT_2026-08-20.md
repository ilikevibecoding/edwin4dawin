# Independent weighted edge-pair lift for rank-seven `Delta0`

Date: 2026-08-20

Status: **the weighted local inequality and its strongest direct integer
global lift are proved exactly, but the lift does not close the lower-`b`,
lower-`q` coefficient relaxation at order 27 or 28.**  Exact negative points
survive in the retained relaxation.  They are enclosure obstructions, not
trees and not counterexamples to the target theorem.

**Update:** this conclusion concerns the weighted-pair enclosure *before* the
independent `H=A-q` extension inequality is retained.  The subsequently added
valid constraint `6h6<=(n-6)h5` excludes both points below, and all four repaired
hard continuous cells pass exactly.  See
`RANK7_DELTA0_WEIGHTED_PAIR_H_EXTENSION_INDEPENDENT_AUDIT_2026-08-20.md`.

## 1. Exact five-vertex inequality

Let `S` be a bad five-set in a forest, let `t(S)` be its number of bad
four-subsets, and put

```text
delta(S)=t(S)-3.
```

Write `p_dis(S)` and `p_adj(S)` for the numbers of disjoint and adjacent
edge pairs in the induced forest on `S`.  Then

```text
delta(S) >= (1/2)p_dis(S) + (1/6)p_adj(S).                (1)
```

There are only nine nonempty five-vertex forest types, indexed by edge count
and degree sequence.  Their exact rows are:

| edges | degree sequence | `delta` | disjoint pairs | adjacent pairs | RHS |
|---:|---|---:|---:|---:|---:|
| 1 | `1,1,0,0,0` | 0 | 0 | 0 | 0 |
| 2 | `1,1,1,1,0` | 2 | 1 | 0 | 1/2 |
| 2 | `2,1,1,0,0` | 1 | 0 | 1 | 1/6 |
| 3 | `2,1,1,1,1` | 2 | 2 | 1 | 7/6 |
| 3 | `2,2,1,1,0` | 2 | 1 | 2 | 5/6 |
| 3 | `3,1,1,1,0` | 1 | 0 | 3 | 1/2 |
| 4 | `2,2,2,1,1` | 2 | 3 | 3 | 2 |
| 4 | `3,2,1,1,1` | 2 | 2 | 4 | 5/3 |
| 4 | `4,1,1,1,1` | 1 | 0 | 6 | 1 |

An independent enumeration of all `2^10` labelled five-vertex graphs retained
291 forests and reproduced every row.  The constants are componentwise sharp:
the four-edge star forces the adjacent coefficient to be at most `1/6`, and
with that coefficient the five-vertex path forces the disjoint coefficient to
be at most `1/2`.

## 2. Global lift

For an `m`-vertex forest `J`, write

```text
a=i4(J), b=i5(J),
B4=C(m,4)-a, B5=C(m,5)-b,
D=(m-4)B4-3B5.
```

The usual bad-four/bad-five incidence count gives

```text
D=sum_(bad five-sets S) delta(S).
```

Let `e` be the edge count and `A=sum_v C(deg(v),2)` the number of adjacent
edge pairs.  Every disjoint edge pair lies in `m-4` five-sets and every
adjacent pair lies in `C(m-3,2)` five-sets.  Summing (1) therefore gives

```text
D >= alpha*C(e,2) + (beta-alpha)A,                         (2)
alpha=(m-4)/2,
beta=C(m-3,2)/6.
```

This is the weighted improvement: a disjoint pair contributes `(m-4)/2` to
`D`, three times the older contribution obtained by dividing the unweighted
pair incidence by six.

From the bad-four union bound and the degree sum,

```text
e >= e0=ceil(B4/C(m-2,2)),
A >= A0=max(0,2e- m).
```

For every `m>=18`, `beta-alpha=(m-4)(m-9)/12>0`.  Hence the right side of
(2) is increasing in both the relevant edge and adjacent-pair floors, and its
minimum occurs at `e=e0`, `A=A0`.  The strongest direct rational consequence
is

```text
R = alpha*(C(e0,2)-A0) + beta*A0.                          (3)
```

The first term in (3) is the algebraic decomposition at the minimizer; it is
not a separate assertion that the actual number of disjoint pairs is at least
`C(e0,2)-A0`.

There is one final exact integrality gain.  Since

```text
D == (m-4)B4  (mod 3),
```

let `L` be the least integer at least `R` in that residue class.  Then

```text
D >= L,                                                    (4)
b >= ((m-4)a-2C(m,5)+L)/3.                                (5)
```

Equation (4) is the strongest integer/congruence rounding supplied directly
by (1), the union edge floor, and the degree-sum adjacent-pair floor.  It does
not claim to solve the finer forest-realizability problem for a prescribed
value of `B4`.

## 3. Exact surviving obstruction at `n=27`

The following exact point satisfies the weighted lift, the integer forest
ratio floor, both upper capacities, half retention, coefficient ceilings, and
the connected lower endpoint for `z`:

```text
n=27, m=24,
a=6820, b=17668,
c5=C(23,5)=33649,
z=2/7,
q=8/49,
s=2439/3059,
d=28601/33649.
```

Here

```text
B4=3806,
e0=17,
A0=10,
R=1610,
D == 1 (mod 3),
L=1612,
weighted integer b floor=17668,
forest-ratio raw floor=371008/21,
forest-ratio integer floor=17668.
```

All retained residuals are nonnegative; representative exact margins are

```text
c5-a-b=9161,
(m-4)a-5b=48060,
c5-2bz=23553,
C(27,6)z-c5=356477/7.
```

Nevertheless the normalized lower-`q` objective is

```text
-33633442950552 / 169714864333091
= -0.1981761767463178658... < 0.                              (6)
```

This is decisively not a tree counterexample: the relaxed point has
`c6=c5/z=235543/2`, which is not an integer.

## 4. Exact surviving obstruction at `n=28`

A second exact point is

```text
n=28, m=25,
a=8245, b=22937,
c5=C(24,5)=42504,
z=3/11,
q=25/154,
s=34259/42504,
d=132911/155848.
```

Its weighted data are

```text
B4=4405,
e0=18,
A0=11,
R=3829/2,
D == 0 (mod 3),
L=1917,
weighted integer b floor=22934.
```

The ratio floor is active instead:

```text
raw ratio=252297/11,
integer ratio floor=22937=b.
```

Again every retained constraint is satisfied; for example

```text
c5-a-b=11322,
(m-4)a-5b=58460,
c5-2bz=329922/11,
C(28,6)z-c5=662676/11.
```

The exact objective remains negative:

```text
-7919637695881 / 164579547528704
= -0.0481204245290548713... < 0.                              (7)
```

Here the displayed scalar coefficients happen to be integral, including
`c6=155848`, but the relaxation does not establish simultaneous realization
of `a,b,c5,c6` by any tree or forest.  Thus (7) is still only a relaxed-cone
obstruction.

## 5. Conclusion

The weighted inequality is exact, sharp at the local coefficient level, and
strictly strengthens the previous global edge-pair lift.  Its strongest direct
integer/congruence form still fails to eliminate the hard lower-`b`, lower-`q`
relaxed faces:

- order 27 survives already at `m=24`;
- order 28 survives already at `m=25`, on the ratio-active side.

Closing these orders therefore needs a relation enforcing more of the joint
forest/ambient coefficient realizability, not merely a stronger universal
lower bound on `i5(J)` derived from these edge-pair counts.

That relation has now been identified: the `H=A-q` extension inequality
`6h6<=(n-6)h5`.  It excludes both displayed points and repairs the four named
continuous cells; the statement immediately above should be read as the
diagnosis of the older enclosure.

## Artifacts

```text
verify_rank7_delta0_weighted_edge_pair_lower_b_obstructions.py
3A2E38D8DFDA02D0831F3131450AB69873847D0B7D55C42A6A6C097A1292AD31

rank7_delta0_weighted_edge_pair_lower_b_obstructions_exact_20260820.json
6BC2624353E9D82E5952C695A92AF26AAD6190A069DC664A9A8CA6E9C77519D5

probe_rank7_delta0_weighted_edge_pair_lower_b_independent.py
BF3F465D19B03958E7BA483A44498EA23443EAC990D212B90AFCB485E08D8444
```
