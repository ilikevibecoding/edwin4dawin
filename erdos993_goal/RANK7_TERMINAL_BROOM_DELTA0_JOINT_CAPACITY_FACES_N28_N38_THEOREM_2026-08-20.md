# Rank-seven `Delta0` joint-capacity face theorem for orders 28 through 38

Date: 2026-08-20

Status: **the two lower-retention endpoint faces are proved exactly for
`28<=n<=38` and `18<=m<=n-2`.** This is not yet the full `Delta0` theorem:
the opposite, lower-`b` endpoint and the small-`J` range `m<=17` are separate
obligations.

## Exact domain

Let `A` be a tree rooted at `q`, let `J=A-N[q]`, put `m=|J|`, and write

```text
a=i4(J),  b=i5(J),  z=c5/c6,
s=1-a/c5,  d=1-b/c6.
```

For `m>=18`, the verifier retains both exact lower bounds

```text
b >= ((m-7)(m-8)/(5(m-3))) a,
b >= C(m,5)-((m-4)/3)(C(m,4)-a),
```

and both exact upper capacities

```text
b <= c5-a,
b <= ((m-4)/5)a.
```

It also retains coefficientwise path minimality, the literal coefficient
ceilings, connected extension counting, and half retention:

```text
C(n-4,5) <= c5 <= C(n,5),
c6 <= C(n,6),
6/(n-6) <= z <= 1/mu6_lower,
b <= c6/2.
```

The rank-six defect coordinate is concave, so its two exact endpoints are
used.  The root `h6` coordinate is also concave.  At the upper end of the
feasible `b` interval, the minimum is therefore one of the two active faces

```text
b=c5-a                    (containment face),
b=((m-4)/5)a              (extension face).
```

The opposing inequalities are kept as feasibility constraints rather than
dropped.  Adaptive exact Bernstein subdivision discards a box only when an
exact constraint is strictly negative throughout that box.

## No-gap exact batch

The batch covers every

```text
28<=n<=38,
18<=m<=n-2,
face in {containment,extension},
rank-six endpoint q in {lower,upper}.
```

There are 154 `(n,m)` pairs and hence 616 exact face cells.  All 616 pass;
there is no unresolved or negative cell.  The final marker is

```text
PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N28_N38 616.
```

This pays the difficult lower-retention side for the stated finite band
without assuming rooted `C7`.  It does not pay the lower-`b`/upper-retention
side, does not cover `m<=17`, and makes no order-27 claim.

## Artifacts

```text
prove_rank7_delta0_joint_capacity_faces_finite.py
47B56B215EB3B7EA881537ED17DD21EACAF9139EDBFE584C6A013E41338545C1

run_rank7_delta0_joint_capacity_faces_finite_batch.py
A03AE76E4862778BB8F501A2E48085B2A175498571898D1BEBADC1DB418C3229

rank7_delta0_joint_capacity_faces_n28_n38_exact_20260820.json
D73730C11984AC29A7AF2B3ADE27002396A8B31C21091F176465FEA014F9C832
```
