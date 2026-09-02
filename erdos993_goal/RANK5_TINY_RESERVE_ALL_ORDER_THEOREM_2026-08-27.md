# All-order rank-five tiny-reserve theorem

## Theorem

For every tree `T` of order at least 11,

```text
Q5(T)=10 i5(T)^2-i4(T)i5(T)-12 i4(T)i6(T)
     >= i4(T)i5(T)/120.
```

Consequently, whenever `i4(T)i5(T)>0`, the normalized rank-eight terminal
coordinate used by the later box proof satisfies

```text
V=1-Q5/(5 i4 i5) <= 599/600.
```

## Exact tail certificate

The only previously missing induction branch was a terminal core of order at
least 13 with one or more isolated sibling factors.  For its payment `M_s`,
the exact shifted certificate proves

```text
M_s >= d_s e_s^3/10              for every integer s>=1.
```

It checks `F_1` and all 15 forward differences of
`F_s=M_s-d_s e_s^3/10`.  Difference 16 vanishes, so Newton's formula covers
every integer `s>=1`.  The run certified 16 differences, 16 regions per
difference, 256 cells, and 3,881,176 exact Bernstein coefficients.  Every
initial coefficient was nonnegative and no subdivision was needed.

## Induction reserve

Set `alpha=1/120` and `J=Q5-alpha*i4*i5`.  The leaf identity rearranges as

```text
J(G)=(1+d/a)J(B)+M/(5ad)-alpha*e*(a+d).
```

The tail constraints `d/e<=1/3` and `h<=d` imply

```text
a=e+h <= 4e/3,
a+d   <= 5e/3.
```

Thus preserving `J>=0` needs payment coefficient at most `5/54`, while the
shifted certificate supplies `1/10`.  The strict remaining coefficient is

```text
1/10-5/54 = 1/135.
```

Orders 11 through 34 are already independently covered by the stronger
finite theorem `Q5>=i4*i5/5`; the exact tail induction begins at order 35.

## Replay artifacts

```text
certify_rank5_quantitative_isolate_shifted_root.py
  SHA256 FCB2F39D70BB80A98740AB333D094C2BD151FBB7708A135B06E838525147C5DA

rank5_quantitative_isolate_shifted_base1_tenth_exact_root_20260826.json
  SHA256 02247AA64708CACDAF8377CFFC119F39CFFA080D984769376A146BE8B7BE6AD7

assemble_rank5_tiny_reserve_all_order_root.py
  SHA256 EDB9738740FCAE95FACD409C47A530656A3062953D573BF114353A024109AF24

rank5_tiny_reserve_all_order_theorem_exact_root_20260826.json
  SHA256 419E5F40AF533ABA42A65C940FC64FC95824D2DBAD54B79F345703124B245FD5

audit_rank5_tiny_reserve_all_order_independent_root.py
  SHA256 9EAF4041644EC7484BCD443D80A3DE47FDD7FC892675CFC37986CE1FCA1D45C0

rank5_tiny_reserve_all_order_independent_assembly_audit_root_20260827.json
  SHA256 FF8572F02B1E9FB6ED6FD622B062B88B8746673850237D63C8C1A5D5D5811DBA
```

The independent audit rederives the assembly arithmetic and checks the full
256-cell hash registry, but deliberately records that it does not regenerate
the producer's 3,881,176 Bernstein coefficients.  This theorem supplies one
rank-eight input bound; it does not by itself prove rank-eight log-concavity
or the full Erdős conjecture.
