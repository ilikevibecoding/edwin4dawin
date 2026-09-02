# Rank-eight terminal-family full shifted finite guard through core order 20

Date: 2026-08-20

Status: **proved for every rooted tree core of order at most 20 and every
required sibling count.  This is a literal `Q8` family theorem, not merely a
residual-coefficient check.**

## Theorem

Let `A` be a tree rooted at `q`, put `H=A-q`, and define the terminal family

```text
I(G_t;x)=(1+x)^t I(A;x)+xI(H;x),   t>=1.
```

For every such rooted core with `|A|<=20`,

```text
Q8(G_t)=16i8(G_t)^2-i7(G_t)i8(G_t)-18i7(G_t)i9(G_t)>0
```

whenever `alpha(G_t)>=14`.

## Correct exceptional-core shift

The leading term of `(1+x)^t I(A;x)` shows exactly that

```text
alpha(G_t)=alpha(A)+t.
```

For each core the verifier therefore expands the literal full `Q8(G_t)` at

```text
t0=max(1,14-alpha(A)).
```

It evaluates `Q8(G_t)` at 18 consecutive integer values, takes exact forward
differences, and verifies the sixteenth difference is zero.  Thus

```text
Q8(G_t)=sum_(j=0)^15 binom(t-t0,j) C_j.
```

Every one of the sixteen shifted Newton coefficients `C_j` is strictly
positive for every rooted family in the census.  Consequently the displayed
`Q8` inequality holds simultaneously for all `t>=t0`, not just for a finite
sample of sibling counts.

This is the correct guard for small cores.  It does not discard the `Q8(A)`
or `Q7(H)` terms, and it remains valid when either lower reserve is negative.
In particular, it disposes the exact residual-`Delta0` controls at core
orders 11--14 without pretending that those residual coefficients are
nonnegative.

## Exact coverage

The canonical WROM stream and exact tree DP cover

```text
free tree cores:    1,346,024
rooted families:   26,056,124
shifted ranks:              16
negative rows:               0.
```

At every order 1 through 20, the minimum of each shifted coefficient is
strictly positive.  The rank-15 minimum is the constant `6435`; the complete
orderwise vectors are stored in the assembled JSON report.

## Scope

This theorem closes the exceptional terminal-family guard only for reduced
core orders at most 20.  Core orders 21 through 26 remain finite obligations.
The connected-tree induction above the finite band, the open lower analytic
coefficients, the rank-seven `Q7` dependency, and the all-forest convolution
lift are separate.

## Replay and hashes

Compile and run the two disjoint ranges, then assemble:

```powershell
rustc -O --target x86_64-pc-windows-gnu .\verify_rank8_terminal_full_shifted_q8_finite.rs -o .\verify_rank8_terminal_full_shifted_q8_finite.exe
.\verify_rank8_terminal_full_shifted_q8_finite.exe 1 17
.\verify_rank8_terminal_full_shifted_q8_finite.exe 18 20
python .\assemble_rank8_terminal_full_shifted_q8_finite.py
```

Expected final marker:

```text
PASS_EXACT_RANK8_TERMINAL_FULL_SHIFTED_Q8_N1_N20
```

Current SHA-256 values are

```text
verify_rank8_terminal_full_shifted_q8_finite.rs
E44032FB37E1E10FFC005103B123331C2242052DE5AC0A9103505B749CE9D0CB

verify_rank8_terminal_full_shifted_q8_finite.exe
A62204C01E9350C56ACBCFA0473C964E6121FD9020373F090854C8F023008AA4

assemble_rank8_terminal_full_shifted_q8_finite.py
AC90775FB2009FD33E042A35B6A36E8A930671382625D26C2800D3C4CE0685D3

rank8_terminal_full_shifted_q8_n1_n20_exact_20260820.json
8F4E342164068CD75B85486B4CA4CB562AAA7EDC9F53714F4E03601E13164060

rank8_terminal_full_shifted_q8_n1_n17_exact_20260820.log
3DF38E7B8D0171624B8D867074C931651AB21A8B9750260B852E3E7EC9CBA385

rank8_terminal_full_shifted_q8_n18_n20_exact_20260820.log
C3714075C33E7712CC7A579518B2A15CA12FBC0BAF17DF5040BAFB1C25934E71
```
