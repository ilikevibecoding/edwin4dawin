# Four-minor leaf gaps under a common forest component

Date: 2026-08-29

Status: **exact symbolic reduction, not a positivity theorem.**  The identities
below show that disconnected unmarked components act on the two four-minor
leaf forms by an upper-triangular product rule.  The remaining Wronskian
correction still needs a cutoff-aware sign argument.

Let `T=(E,U,V,W)` denote a four-minor tuple and write

```text
N(T) = the compact nested four-minor kernel,
R(T) = z^2 E(w)W(z)+w^2 E(z)W(w)
       +zw[U(w)V(z)+U(z)V(w)].
```

If an unmarked component with independence polynomial `P` is disjoint from
both marks, it multiplies every row of `T` by `P`.  Put

```text
J(P)=(z-w)[P'(z)P(w)-P(z)P'(w)]/2.
```

The exact common-factor rules are

```text
N(P*T)=P(z)P(w)N(T)+J(P)R(T),
R(P*T)=P(z)P(w)R(T).
```

For the ordinary third-leaf split, let `C` be the four-minor tuple on
`B-{z,s}` and `H` the tuple on `B-N[s]`.  Denote the compact ordinary gaps by

```text
G_N(C,H)
 =(z+w)N(C)+2zw B_N(H,C)
  -(z-w)^2[R(C+H)-R(H)]/2,

G_R(C,H)
 =(z+w)R(C)+2zw B_R(H,C).
```

Then

```text
G_N(P*C,P*H)=P(z)P(w)G_N(C,H)+J(P)G_R(C,H),
G_R(P*C,P*H)=P(z)P(w)G_R(C,H).                      (1)
```

The second line is coefficientwise nonnegative whenever the input tuples
have nonnegative coefficients: `R` is derivative-free and its polarization
contains only positive cross-products.  Thus (1) isolates the entire
disconnected-component difficulty in the `J(P)` action.  It does not make
that action positive; `J(P)` need not have one coefficient sign.

For the isolate gap

```text
L_N(T)=(z+w)N(T)-(z-w)^2R(T)/2,
```

the corresponding rule is

```text
L_N(P*T)=P(z)P(w)L_N(T)+(z+w)J(P)R(T).              (2)
```

Equations (1)--(2) turn common components into a two-form triangular module.
They permit a proof to strip such components provided the relevant truncated
Schur coefficients of the `J(P)` correction are paid by the first term.  That
payment is the remaining theorem-strength obligation.

Replay:

```powershell
python .\derive_iso_common_factor_product_rule_root.py
python .\derive_iso_fml_common_factor_product_rule_root.py
```

Markers:

```text
DERIVED_EXACT_ISO_COMMON_FACTOR_PRODUCT_RULE
DERIVED_EXACT_ISO_FML_COMMON_FACTOR_PRODUCT_RULE
```

SHA-256 pins:

```text
derive_iso_common_factor_product_rule_root.py
11AFA5656137329D27760B1D64782F6FD4C0B50573F922283CC9155C3080D85E

iso_common_factor_product_rule_symbolic_root_20260829.json
BA549774795B03C48A9ABF35A595CBF37BE7021B62A8A2354A25A5DDA39B8ADE

derive_iso_fml_common_factor_product_rule_root.py
CD94F3DFA5793221C834D0180804DF368215099E0858D9BFFA76F775A70DC6D9

iso_fml_common_factor_product_rule_symbolic_root_20260829.json
2C7596B3D2D673A206BBCF72C92F0F9FC92E029B0D40AB85C06648FBC62A8075
```

All four pins are hashes of the on-disk bytes.  The producers also print the
LF-normalized serialized-report hashes before Windows newline translation.
