# Post-sector sixth-Cohn-core reduction

Date: 2026-08-13

## Result

There is a scalar Cohn recurrence that bypasses the proposed all-history
three-step energy majorant.  It does not prove the inequalities (107.1)--
(107.2), but it gives their required Schur exterior conclusion from a bounded
degree-six terminal core.  Degree five is one step too short: exact
post-sector cores with four disk roots occur there, outside the invariant
interval `[2,3]`.

Let

```text
P_n(z)=q(Rz),             R^2=A,
I_n=# {zeros of P_n in |z|<1},
```

where `q` is the corrected lower-selector Duran polynomial of degree `n=m`.
Assume no Cohn pivot below is of modulus one.  Repeated Cohn reduction produces
a degree-six core `P_6`.  If

```text
I_6 in {2,3,4},                                           (1)
```

then, in every order,

```text
2<=I_m<=m-2.                                              (2)
```

In particular `q` has at least two roots in `|z|<R`, equivalently at most
`m-2` roots outside the target disk.  This is exactly the Schur exterior-index
bound sought from the block-energy inequalities.  The separate equality of
this exterior index with the negative-ray Sturm index is not proved here.

The order six is sharp for this invariant-core formulation in the current
exact evidence: the cell `(d,r,s,a,m)=(13,8,22,2,11)` has `I_5=4`.

## 1. Radical-free recurrence

Write the ascending coefficients of the current degree-`n` polynomial before
the powers of `R` are installed as

```text
b_0,b_1,...,b_n.
```

The squared reflection parameter and the next coefficient vector are

```text
kappa_n^2=A^n(b_n/b_0)^2,                              (3)
b'_j=b_j-A^(n-j)(b_n/b_0)b_(n-j),   0<=j<n.           (4)
```

Indeed (4), after restoring `R^j` in coefficient `j`, is precisely the
degree-`n-1` polynomial obtained from

```text
P_n(z)-kappa_n z^n P_n(1/z).
```

In particular

```text
b'_0=b_0(1-kappa_n^2),                                 (5)
```

so (3)--(4) stay entirely over the rationals.  They are a one-vector scalar
recurrence, with no quadratic energy bookkeeping and no square-root field.

## 2. The invariant interval

Cohn's rule says, for `kappa_n^2!=1`,

```text
I_n=I_(n-1),                 if kappa_n^2<1,
I_n=n-I_(n-1),               if kappa_n^2>1.           (6)
```

Suppose `n>=5` and `2<=I_n<=n-2`.  At the next upward reconstruction step,
the two possibilities are

```text
I_(n+1)=I_n,
I_(n+1)=n+1-I_n.
```

The first lies in `[2,n-2]` and the second in `[3,n-1]`; both are contained
in `[2,(n+1)-2]`.  Thus this interval is invariant under every later
reflection sign.  Since (1) is exactly `2<=I_6<=4`, induction proves (2).
This part is an all-order theorem and uses no path-specific estimate.

## 3. Exact path evidence and remaining theorem

The replay
`verify_lower_selector_post_sector_sixth_cohn_core_reduction.py` reconstructs
the actual selector, its forced-zero normalization, the normalized Duran
coefficients, every rational Cohn step (3)--(5), and the final degree-six
root count.  Across all post-sector cells with

```text
m>=7, A<=(m-1)^2, 5<=d<=30,
```

it checks 7,106 cells exactly.  Every pivot is nonunit and every degree-six
core has two, three, or four disk roots.  This is exact finite evidence only, not an
all-order proof of (1).

The remaining path-specific theorem is now:

> On both natural-coordinate cones (unforced and forced), the rational Cohn
> descent (3)--(4) has no unit pivot and its degree-six core has disk count
> two, three, or four.

Equivalently, write a `+` when a core reflection square is greater than one
and a `-` when it is less than one, in degree-one-through-six order.  The
complete six-bit truth table shows that the path theorem need only exclude
the following 14 words (the number after each word is its disk count):

```text
------:0   -----+:6   ----+-:5   ----++:1
---++-:1   ---+++:5   --++--:1   --++-+:5
-++---:1   -++--+:5   +-----:1   +----+:5
++----:1   ++---+:5
```

Thus the analytic target is a finite forbidden-language theorem for the six
terminal Schur reflection signs, plus exclusion of unit pivots.  The exact
`d<=30` audit encounters 46 allowed words and none of these 14 forbidden
words.

This target is different from merely expanding the last three quotient
coefficients: the descent still transports all coefficients, but its state is
an explicit rational coefficient vector and its terminal obligation is a
fixed sixth-degree root count.  It is therefore a clean Schur--Levinson
recurrence alternative to proving the stronger energy inequalities
(107.1)--(107.2).

## 4. Dependency warning

This reduction is algebraic and does not use the half-angle polar-preservation
argument in master Section 59.4.  Consequently it remains valid independently
of the current audit of that argument.  However, the broader claim that the
complementary sector `A>(m-1)^2` is already closed does depend on that separate
argument and is not reasserted here.

The replay reports

```text
PASS_EXACT_D5_TO_D30_POST_SECTOR_SIXTH_COHN_CORE_AUDIT.
```

The replay source and report SHA-256 hashes are respectively
`DE8C4AFEE955230916E82702027489660376309CE7A86C09473E1DFEE5BEF209`
and
`F48A840E529B04928374692E81C01EB456FE35E03E16349746C14C9479CF4C03`.
