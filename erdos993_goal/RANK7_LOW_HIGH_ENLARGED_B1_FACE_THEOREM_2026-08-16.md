# Rank-seven low/high enlarged `b1`-face theorem

Date: 2026-08-16

Status: **RIGOROUS ENLARGED-FACE THEOREM AND COEFFICWISE-NOGO.**

This note closes the first exceptional family exposed by the
memory-bounded rank-seven low/high convolution scan.  It does not by itself
prove the full low/high cone or the all-forest rank-seven reserve.

## 1. The old off-face claim is false

The exact sliced reconstruction dehomogenizes the degree-14 cone margin at
the kept variable `b=1` and uses `(a,a0,b1)` as external exponents.  Its
first two completed slices are:

```text
(a,a0,b1)   terms       negative   negative outside the old hard face
(0,0,0)     17146622    210        0
(0,0,1)      8962942    203        203
```

The first slice extracts the old 81,335-term hard face exactly and matches
its independent reconstruction coefficient-for-coefficient.  In the
second slice the minimum new coefficient is `-242560`.  Hence the proposed
statement that every negative coefficient lies on the old `b1=0` hard face
is false.

This is a no-go for that coefficientwise reduction only.  It is not a
counterexample to the cone inequality or to Erdos Problem 993.

## 2. Smallest enlarged face

Set

```text
a=a0=a2=b2=b3=b4=b5=b6=0
```

but retain the high-factor slack `b1`.  Direct reconstruction from the
original low/high gap parametrization gives a homogeneous polynomial in

```text
(b,ta,a3,a4,a5,a6,tb,b0,b1).
```

It has 204,518 terms and 774 negative coefficients.  By `b1` exponent:

```text
b1 power   terms    negative     minimum
0           81335       210      -925616
1           56937       203      -242560
2           38331       181      -281216
3           20056       120      -180288
4            7859        60       -41344
```

There are no terms of higher `b1` degree.  The 203 negatives in power one
equal the complete negative count in the full sliced polynomial at
`(a,a0,b1)=(0,0,1)`.  Since this reduced face is literally a coefficient
subset of that full slice, cardinality proves that all 203 new negatives
are confined to this enlarged face.

The analogous direct one-variable faces for each of

```text
a,a0,a2,b2,b3,b4,b5,b6
```

have exactly the original 210 negatives and no new negative coefficient.
Thus `b1` is the unique one-variable enlargement forced by the scan.

## 3. Exact factor and AM-GM certificate

The complete enlarged margin factors exactly as

```text
(8b+ta+a3+a4+a5+a6) R_b1.
```

The linear factor is nonnegative on the cone.  The quotient `R_b1` has

```text
136451 terms,
316 negative coefficients,
minimum coefficient -115702,
maximum coefficient 4061912712192.
```

Using scale `10^6`, every negative quotient monomial is paid by one exact
AM-GM block

```text
A x^u + B x^v - C x^m >= 0,
u+v=2m,                     4AB>=C^2.
```

The replay allocates 316 blocks for the 316 negative monomials, with no
positive coefficient overused.  Its smallest quadratic slack is `2560`
and its smallest unused positive-source remainder is `121476`.  Therefore
`R_b1>=0`, and hence the entire enlarged `b1` face is nonnegative.

## 4. Exact replay and scope

Run

```powershell
python .\verify_rank7_low_high_b1_face.py
```

Expected status:

```text
PASS_EXACT_RANK7_LOW_HIGH_ENLARGED_B1_FACE
```

Artifacts and SHA-256 hashes:

```text
explore_rank7_convolution_extended_faces.py
B2A368E708EA605FEFA71596C72FD8963C142C179A49EF25C37A82DA00EC3617

verify_rank7_low_high_b1_face.py
968EC1416CB800426F2030F9013B82E1670A1EC2AEB2EC1F177B568B3A0D6263

rank7_low_high_b1_face_exact_20260816.json
EC0E30F884A8351DAA578C1EA5B8982932E89C6E958B8C04FCF9FBA7734A83F5
```

The next exact obligation is narrower than before: prove coefficientwise
nonnegativity outside this complete enlarged `b1` face, or identify and
certify the next enlarged exceptional face.  The low/low cone remains a
separate obligation.
