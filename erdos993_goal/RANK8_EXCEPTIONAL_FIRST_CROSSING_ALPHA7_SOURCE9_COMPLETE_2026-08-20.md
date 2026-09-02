# Rank-eight terminal-alpha-seven source-nine complete theorem

Date: 2026-08-20

Status: **exact ten-shard no-gap PASS with ten fresh independent
bidirectional audits.**

## Scoped theorem

For every terminal exceptional alpha-seven jet type with sorted index
`248 <= t <= 947`, and every exceptional source product of alpha nine using
component types at most `t`, adjoining terminal type `t` gives total alpha 16
and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 9 in the terminal-alpha-seven band.

## Exact recurrence and coverage

The independent lower-type coefficient audit gives `c9=5437` and `c2=5`.
For relative terminal index `L=1..700`, the exact raw source count is

```text
5437 + 5*L.
```

```text
248..343  344..432  433..515  516..593  594..667
668..738  739..806  807..871  872..934  935..947

exact union                  248..947
terminal types                    700
shards                             10
gaps                                0
overlaps                            0
```

Each producer used set-valued exact lower-product recurrence and alpha-seven
prefix convolution.  Each independent audit used a list-valued exponent DP for
all 5,437 lower alpha-nine multisets and five alpha-two bases, regenerated
multiplicities, and matched key and product tables in both SQLite `EXCEPT`
directions.  The assembly audit then rehashed and queried every sealed database
and independently reconstructed the raw formula and type union.

## Exact aggregate

```text
independently enumerated raw multisets      5,032,650
canonical check keys                       4,137,272
distinct shard-product counts sum          4,023,777
raw-to-canonical equivalence compression     895,378
key-to-product compression within shards     113,495
negative Q8                                        0
zero Q8                                            0
minimum Q8                               134,309,004
maximum Q8                         9,241,161,551,766
```

Product counts are summed over shards, not globally deduplicated.  Compression
counts are exact equivalence compression, not omissions.

## Resources

```text
fresh producer processes                       10
fresh independent audit processes              10
workers per process                              1
producer elapsed seconds sum             56.694098
audit elapsed seconds sum                77.323674
maximum producer peak private MiB         39.136719
maximum audit peak private MiB            124.996094
operating abort gate                            448 MiB
hard cap                                        512 MiB
```

No resource checkpoint, nonpositive sign, or database mismatch occurred.

## Immutable hash seal

```text
producer source  99DBFAC4154280AF6F2EDA88F4C231BDA4FB26BB1717A0903EF0291D6CB5853F
shard auditor    16ACD6587ED57FE0D6C3578FCFB79CF80363440CE250FAFA89341141A51FCBA8
```

Shard triples are listed as `report / database / audit`:

```text
248..343
D1E26AD5B6BD78269540793A57323945101E3B89652784BA038550AFE2B8F8DC
48C16347F27B15C338819CB9859054FEBB903009665E3CB463B61DD6D39ACADD
35A5CF6B4EE6182AA4E4CAE3B63D712C975AC8203A90C8544D73B560D49E9349

344..432
70ACAA992C462AC4D17F8B499CB00F984A1E183E91CB412B1EB7416F676B9541
C20A530E8E5872ED5EDA43CBE23F7420317B3B3A8C3EDBE764DB5DE5BD1A590A
11CF4049237D99588C7707275ECBB020436AC5A1DAB75A6E94AB5EF6DC6C5C7B

433..515
5B784EC03EABD43320CF14889A051BBA53D4D9FB427CAFF06B3BD31C5737332C
16B3B18E5F453BDDEBF0182DFF9AEDED7DA403B37B67AE29C1B420B1142CA6A5
6E3FDB7582EA2D798EBF0CF64998482430E33F43006B8936355ED23D17F2FDC8

516..593
89B8395A5BEB150B68A0D6D78EDA6E6D07CF66366A7BCBB227C6A91E0D3F81DA
3719D0ABE445C238FF49723BDA474E6B6E0BBEF072EBF8CC2EF62895A0323107
1187D82E4F901C406E75D2BC0C91FA30EF546A9239E6CCAF01A22F0C116ADED0

594..667
C2D348A9CBB326A0BEDF32A351B6665B2A8DB39EBA89799F881373D7EA6E7116
4E34CBC7F7CD71E706BDCB8E122872749B300D230F759E54914581891DF0C38F
01502900E518539DCF5992EB856DED5CB81501BAAD50A1C5B2198B7FB3AA4CD0

668..738
085C443FB66E20477B5DB209359BBE938CEC2B0D4DDEA14A49897E1B5C5BAE95
E93BE392F514BA6A4F0594466C01B00940428414F0A82F3E7B07578AC7E013AC
B6B61C4E2D6F82E6304B91424C9E3D94845CEC5B0AAADD9475DDEBAB221397B0

739..806
4B3552B021E22B5565F7B510EEC9C8A9559621415E8FED168A37996C1BE0782F
0C7C35381CE43779837C46AFD9C67204811D1318D271059934A6F284958EE172
99EC530825B6B5CAB7838B15BCD673340FA3FE0567FD404DFC9FFDA87CBBFD51

807..871
F10E8F6CF52DD011F6755AC912A819D7900695650F353607ABB3ECC718D4EF70
09B0201FBD4AA3AAC9B832A01B1581A030B8052B4FB43EA86A03DC09BB492469
AC9186EEBE2B37DB1B7FFF32705E58C9B596D27F9E6C5261CAD3102EA366C6CF

872..934
50315E2FC4B2E609BC6348B5CE2B203F76C4B08A941718E4C893D80F123D5CCD
339E20D6054F5296E4D543E446A428FDBFB3E6FF15310EF2B1CF3242931CD979
2B847BE3898ADAF5B402C5898CED3DD544FE486921147AD2C2177449C63944AF

935..947
6D188EF7B9B4937F3DF3019D30298334804C224C02322739188724EBBFCDF84B
59674BCEE8F2289EA447D6400B7538D5C52A5C58457C7A0DB0C8F25012C4DD3D
1B2DA19B404B258AE03B24D62B208534C664CC7C403515D956473E98EB866F27
```

Complete assembly:

```text
assembler source  7D3735FF04F4063A6C02E5DBF7CD373CFD144FC250004964C371515A12EF3351
assembly JSON     61C3A98C6486A0D3CCD9F28C0FC6C935851FD4463A23C74CD7B4A184D137276B
auditor source    801DD884B862966FC88018059DF05535A1FFC6E30B99110F88E99C82CDDB7136
audit JSON        D8671293CD872F676BD3DFA36B8BFB628D4B6B61747493016342F49C5C9DE414
```

## Scope boundary

This closes only source alpha 9 of terminal alpha 7.  Sources alpha 10 through
13 remain.  Terminal alpha 8 and 9, full/full cones, connected `Delta0..3`,
connected `Q8`, full forest `Q8`, and PGC remain.  No source-10, order-26, e2,
or master work was launched or modified.
