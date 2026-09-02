# Uniform low/high strong auxiliary on the simultaneous first-gap quadrant

## Theorem

For every integer `k>=8` and every real `x,y,s,t>=0`, take

```text
L_s=(x+k+1+s,x+k-1,x+k-2,...,x),
R_t=(y+k+1+t,y+k-1,y+k-2,...,y).
```

For their binomial convolution `c` and oriented left-tail convolution `v`,

```text
(x+k-2) M(c) + B(c,v) > 0.
```

Thus the complete two-dimensional quadrant formed by the first ordinary gap
slack in each row is closed uniformly in rank.

## Bivariate reduction

Normalize

```text
p=s/(x+k+1),
q=t/(y+k+1).
```

The strong auxiliary is a polynomial of degree at most two in each variable.
The zero axis and the two one-variable axes are supplied by the independently
audited zero-slack, left-gap, and right-gap theorems.  Four mixed coefficients
remain:

```text
p q, p q^2, p^2 q, p^2 q^2.
```

An abstract polynomial-ring calculation verifies these are exactly the four
cross coefficients extracted from the original convolution.

## Mixed four-product payments

After the common positive scale `((x+k)(y+k))^2`, every mixed coefficient has
the same four-product form

```text
T L alpha + T R beta - L R gamma - R^2 delta.
```

The proof uses the same two ratio payments as the zero-slack theorem.  After
`k=u+8`, every stored numerator coefficient is a strictly positive integer:

| mixed power | alpha | beta | cubic payment | unit payment |
|---|---:|---:|---:|---:|
| `p q` | 90 | 189 | 357 | 189 |
| `p q^2` | 90 | 189 | 357 | 189 |
| `p^2 q` | 90 | 195 | 347 | 195 |
| `p^2 q^2` | 90 | 195 | 347 | 195 |

All 3,304 sparse coefficients were replayed exactly by the independent audit.
The minimum coefficient is `1`.

## Artifacts

```text
prove_uniform_low_high_both_gap0_slacks_root.py
  SHA256 CE5013F56604DFCAADDDAE9092DF0B0D9E7323690C9A8147FEDB6E5DF8D2C5DE

uniform_low_high_both_gap0_slacks_exact_root_20260827.json
  SHA256 3CD9799EBFFFAE8DB504962736336E101BEF27970EAF839F6773D47AD6E21611

audit_uniform_low_high_both_gap0_slacks_independent_root.py
  SHA256 BC7DD71BEF5AEC4FC4DE594B2BE1696C37A2781DFD2D6AC01ADDD68C16A5FA6B

uniform_low_high_both_gap0_slacks_independent_audit_root_20260827.json
  SHA256 78C4B4293C245EA08414418FC64CA865DE7C922937AEDE1D90BCE689B1219522
```

Both the exact producer and the separately implemented independent audit pass.
Gap coordinates with index at least one remain outside this theorem, so this
is not yet a proof of the full Erdős conjecture.
