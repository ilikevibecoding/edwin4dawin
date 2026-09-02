# Pure-cubic `B2=5` subdivision-reduction progress

Date: 2026-08-17

Status: **exact finite evidence and an exact transfer identity; not an
all-length monotonicity theorem.**

## Candidate reduction

Let `T'` be obtained from a tree `T` by subdividing the edge `uv` once,
with new vertex `w`. Exact endpoint-state partition gives

```text
I(T')=I(T)+x I(T-{u,v})+x^2 I(T-(N[u] union N[v])).
```

For a pre-existing root `q` outside `{u,v}`,

```text
I(T'-q)=I(T-q)
 +x I(T-{q,u,v})
 +x^2 I(T-({q} union N[u] union N[v])).
```

For `q=u` or `q=v`, the root-deleted increment has only the `x` term:

```text
I(T'-q)=I(T-q)+x I(T-{u,v}).
```

For the new root `w`,

```text
I(T'-w)=I(T)+x^2 I(T-(N[u] union N[v])).
```

These identities suggest an induction if every low terminal-broom Newton
coefficient is nondecreasing under subdivision.

## Complete exact tests at the first three orders

Both pure-cubic `B2=5` skeletons, every canonical positive edge-length
composition, every edge, and every pre-existing root were checked at orders
23, 24, and 25. Every new subdivision vertex was checked separately.

| order | edge/root comparisons | negative low-rank increments |
|---:|---:|---:|
| 23 | 31,560,738 | 0 |
| 24 | 58,358,784 | 0 |
| 25 | 104,300,350 | 0 |
| total | 194,219,872 | 0 |

This is 1,359,539,104 exact comparisons after expanding ranks `Delta^0`
through `Delta^6`. In addition, 7,975,836 new subdivision roots have all
seven low coefficients positive.

The rankwise minimum increments are:

```text
n=23:
9318891473824451260, 21644931296825561216,
23369113990713038320, 20237887665323915952,
14579511565479687952, 8419502536280491552,
3832700825444102564

n=24:
33602647708585408512, 75234645545850807597,
75367918370887330797, 60458602735049283555,
40596863002792807263, 22049979473360729712,
9479144522948128986

n=25:
113021089541972707504, 245132761745584284172,
229115813945854925312, 171123599765581749357,
107418699899990059492, 55041473738329961718,
22409422421175362269
```

Every displayed minimum strictly increases from one tested order to the
next. This supports, but does not prove, an all-length induction.

## Exact obstruction to the naive proof

It is not enough to say that both the core polynomial and root-deleted
polynomial receive coefficientwise nonnegative increments. Treating generic
increments `c->c+u`, `h->h+v` as independent produces negative monomials in
every low residual increment: the exact counts at ranks zero through six are

```text
83, 130, 171, 215, 260, 331, 253.
```

Thus an all-length proof must retain the two coupled subdivision forests in
the displayed identities or factor the increment through known lower-rank
reserves. Generic coefficientwise monotonicity is false as a proof method.

Artifacts and SHA-256:

```text
probe_rank7_b2_5_cubic_subdivision_monotonicity.rs
EE46DA90E84BC580DA84DC17D89A2F1768769AAC539D7CF71704A5CF44E8A885

rank7_b2_5_cubic_subdivision_monotonicity_n23.log
BA8DFF24DF21B40D9ACAA93AE866044831629662AE18FEBA70BFC4D25E2B6F7E

rank7_b2_5_cubic_subdivision_monotonicity_n24.log
FD0F16EB3F64B875C3DBCCC3160CC33966498CCA05F170D094BAEE31CE741D36

rank7_b2_5_cubic_subdivision_monotonicity_n25.log
551A3A766935FF6257ED6764A9B81F1DE0DF2029CF6972B2A63D354CC27243CD

probe_rank7_residual_increment_generic.py
3E64E67E6B8749FFACD5E901CA0BC87556D1FDFC9C9D27F28CA9A7B03CC78B60
```
