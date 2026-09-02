# Rank-seven tree terminal-broom reduction and high Newton certificate

Date: 2026-08-13

Status: **rigorous partial theorem, not an all-order rank-seven reserve.**
This note proves the exact terminal-broom induction identity and certifies
seven of its fourteen residual Newton coefficients.  The remaining
coefficients `Delta^0` through `Delta^6` are open in this package.

## 1. Target

For a tree `T`, write `i_j=i_j(T)` and

```text
Q7(T)=14 i7^2-i6 i7-16 i6 i8.
```

The desired connected-tree theorem is `Q7(T)>=0` whenever
`alpha(T)>=12`.  This note does not yet prove that theorem.

## 2. Exact terminal-broom decomposition

Let `A` be a tree rooted at `q`, let `H=A-q`, and obtain `G_t` by
adjoining a new support vertex at `q` together with `t>=1` new leaves
adjacent to the support.  Then

```text
I(G_t;x)=(1+x)^t I(A;x)+x I(H;x).
```

Write `c_j=i_j(A)`, `h_j=i_j(H)`, and

```text
p_j(t)=sum_{l=0}^j binom(t,l)c_{j-l}+h_{j-1}.
```

Put

```text
p8o(t)=sum_{l=1}^8 binom(t,l)c_{8-l}
```

and define

```text
R_t = 7 c6 h5 [14 p7(t)^2-p6(t)p7(t)-16p6(t)p8o(t)]
      -7 h5 p6(t)[14c7^2-c6c7]
      -8 c6 p6(t)[12h6^2-h5h6].
```

Exact expansion proves

```text
7 c6 h5 Q7(G_t)
 = R_t + 7 h5 p6(t) Q7(A) + 8 c6 p6(t) Q6(H).       (1)
```

Thus strong induction and the proved all-forest rank-six theorem reduce
the terminal step to `R_t>=0`.  The residual has degree exactly thirteen:

```text
R_t=sum_{j=0}^13 binom(t-1,j) Delta^j R_1.           (2)
```

The identity and Newton reconstruction are independently replayed by
`verify_rank7_terminal_broom_reduction.py`.

## 3. Coefficients Delta^8 through Delta^13

Let `n=|A|`, `a=i4(A-N[q])`, and `b=i5(A-N[q])`.  After substituting

```text
c0=1, c1=n, c2=binom(n-1,2), h5=c5-a, h6=c6-b,
```

the top coefficients factor.  For example,

```text
Delta^13 R_1 = 12012 c6(c5-a),
Delta^12 R_1 = 15708 c6(c5-a)(n+3).
```

The next two negative brackets are bounded by `c3<=binom(n,3)` and
`c4<=binom(n,4)`, giving respectively

```text
-9n^2-133n-157,
-(2/3)(59n^3+897n^2+7039n+3807).
```

For `Delta^9`, ordinary extension counting

```text
4c4 <= (n-3)c3,   5c5 <= (n-4)c4
```

reduces the required bracket to

```text
(87n^4+190n^3+5079n^2+22868n+4956)/3 > 0.
```

For `Delta^8`, discard the nonnegative rooted term and use extension
counting through `c6`.  The bracket becomes

```text
f_n(x)=168x^2-2(14n^3-127n^2+1727n+2892)x
       +735n^4-1260n^3+3465n^2+10080n+756,
```

where `x=c3`.  Coefficientwise path minimality gives
`x>=binom(n-2,3)`.  For `n>=15`, the derivative at this endpoint is

```text
2(14n^3-125n^2-999n-3564)>0,
```

and the endpoint value is

```text
(n^5+833n^4+5285n^3+3985n^2-20976n+79740)/3 > 0.
```

Therefore `Delta^j R_1>=0` for `8<=j<=13` and every rooted tree core
of order at least 15.  The exact replay is
`verify_rank7_terminal_broom_high_differences.py`.

## 4. Coefficient Delta^7

The only rooted contribution to the factored bracket is

```text
(32n+34)a-56b.
```

Since the forest `A-N[q]` has at most `n-1` vertices, extension counting
gives `5b<=(n-5)a`, so this contribution is at least

```text
2(52n+225)a/5 >= 0.
```

After it is discarded, the bracket is strictly decreasing in `c7`.
The proved rank-six reserve sends `c7` to

```text
c7 <= (12c6^2-c5c6)/(14c5).
```

The resulting expression is strictly decreasing in `c6`; the proved
rank-five reserve sends `c6` to

```text
c6 <= (10c5^2-c4c5)/(12c4).
```

The resulting expression is strictly decreasing in `c5`; the proved
rank-four reserve sends `c5` to

```text
c5 <= (8c4^2-c3c4)/(10c3).
```

The final expression depends only on `(n,c3,c4)`.  The standard sharp
tree ratio intervals

```text
3/(n-3) <= c2/c3 <= 3(n-1)/((n-3)(n-4)),
8w/(6-w) <= c3/c4 <= 4w/(3(1-w))
```

map its entire `n>=15` domain to a three-dimensional unit box.  Its
exact tensor-Bernstein expansion has degrees `(20,9,4)` and 1,050
coefficients, all nonnegative; no subdivision is required.  Hence

```text
Delta^7 R_1 >= 0                         (n>=15).     (3)
```

The replay is `verify_rank7_terminal_broom_delta7.py`.

## 5. Exact achieved scope and remaining obligation

Combining Sections 3 and 4 proves

```text
Delta^j R_1 >= 0 for 7<=j<=13 and every rooted tree core n>=15.
```

This is half of the terminal-broom Newton cone.  It is not valid to infer
`R_t>=0` until `Delta^0` through `Delta^6` are also proved (or replaced
by another exact tail argument).  Exact random stress on 10,000 rooted
tree cores of orders 20 through 300 found no negative coefficient among
all fourteen, but that is finite evidence only and is not part of the
proof.

An independent signed-128-bit WROM free-tree replay now exhausts every
tree and every root through core order 18.  It finds:

```text
Delta^1,...,Delta^13 R_1 >= 0  from the first nonvacuous core order 7;
R_1 < 0 is possible only at core orders 10, 11, and 12;
R_1 >= 0 for every rooted core of orders 13 through 18.
```

The minimum `R_1` at core order 13 is `71,223,264`; at order 18 it is
`346,314,054,550,464`.  Consequently the remaining analytic obligation
can start at core order 19.  The exact replay source is
`verify_rank7_terminal_broom_finite.rs`, and its order-18 output is
`rank7_terminal_broom_finite_n18.log`.

## 6. Replay

```powershell
python .\verify_rank7_terminal_broom_reduction.py
python .\verify_rank7_terminal_broom_high_differences.py
python .\verify_rank7_terminal_broom_delta7.py
rustup target add x86_64-pc-windows-gnu
rustc -O --target x86_64-pc-windows-gnu .\verify_rank7_terminal_broom_finite.rs -o .\verify_rank7_terminal_broom_finite.exe
.\verify_rank7_terminal_broom_finite.exe 18
```
