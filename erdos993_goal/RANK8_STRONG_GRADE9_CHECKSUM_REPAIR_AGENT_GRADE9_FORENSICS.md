# Rank-8 strong grade-9 checksum repair provenance

Scope: grade 9 only.  The historical artifacts are preserved in place and were
not modified.  This note records the exact stale/fresh boundary and the
independently replayable repair chain.

## Exact forensic attribution

The historical face `01`, outer exponent `0`, middle-row certificate recorded
the ordered coefficient SHA-256
`EA3719096C9B81C2169BC409F2ED5ED204ABDA64505FA6AB2C4FD0C518DAC64D`.
Two independent fresh constructions compared all `10,064,587` ordered nonzero
coefficients and found no coefficient or order mismatch.  Both fresh streams
hash to
`905AED8D56FAF06C413FA6E2D9E37FF5CF712E681581557D5AAF425094F773E0`.
The old artifact stores only aggregate statistics and the terminal digest, not
the old coefficient stream, so a first historical coefficient mismatch cannot
be recovered from it.  What is recoverable exactly is that the stale run is
confined to the face-`01` `b0^0` slice: its far row also differs, while its
outer-1 and outer-2 chunk files are byte-identical to the fresh run.

Fresh face-`01` outer-0 hashes:

- middle: `905AED8D56FAF06C413FA6E2D9E37FF5CF712E681581557D5AAF425094F773E0`
- far: `9EBE2D4FEAC68D5487B41E743AB31D45CC9FE6A4EDCF7FB2D919484D3D9854FE`

Historical face-`01` outer-0 hashes:

- middle: `EA3719096C9B81C2169BC409F2ED5ED204ABDA64505FA6AB2C4FD0C518DAC64D`
- far: `1F818CF4D6D628C0457A2A6C596889B8C4E8C398D8E8076AB737135A4378F00C`

## Forensic artifacts

- Comparator source:
  `diagnose_rank8_strong_grade9_face01_outer0_stream_agent_grade9_forensics.py`
  SHA-256 `3A28AF567F206CFFE20A69F5012661957DF3C0C39A72DE48FE7530A9D1AC656A`
- Comparator report:
  `rank8_strong_grade9_face01_outer0_stream_forensics_agent_grade9_forensics.json`
  SHA-256 `E2C72015848706A069704BEA4DEBCE8E4A30A3606955B337654856DC5FF75073`
- Historical producer job:
  `_multidegree_grades8_13_20260825/rank8_low_low_a23_mixed_cross_strong_grade9_multidegree_family_job_agent_20260823.json`
  SHA-256 `70192CFB7755C81A3CCA74A4119FC8CF255E71591381FF15F10007D504BBBE7F`
- Historical middle outer-0 chunk:
  `_multidegree_grades8_13_20260825/rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_9_outer_stream_agent_20260823_b0_exp_0.json`
  SHA-256 `024E4F05BAC11E78F818AC2D2A837CA9FB9298CA6A5A93FF2A3C933D505B917C`
- Historical far outer-0 chunk:
  `_multidegree_grades8_13_20260825/rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_9_outer_stream_agent_20260823_b0_exp_0.json`
  SHA-256 `6B773C24EEAC2AB33A2B9A3F13AE410F3B732346D632C6E3C3CF6246A7560AC9`
- Historical independent failure (agent):
  `rank8_low_low_a23_mixed_cross_multidegree_strong_grade9_independent_audit_agent_20260825.json.failure.json`
  SHA-256 `518CF88CD6E315CA1E433DA0BA5D16A95C9D1012CA4901E83BF5D10BE67B8232`
- Historical independent failure (root):
  `rank8_low_low_a23_mixed_cross_multidegree_strong_grade9_independent_audit_root_20260826.json.failure.json`
  SHA-256 `C40778C6C7A6F28B2967D87E0844AAE0A96B66F8E925C0A6C7B3D2D744BD4F5D`

## Fresh producer repair

The canonical producer source was imported unchanged by the fail-isolated
wrapper `rerun_rank8_strong_grade9_producer_agent_grade9_forensics.py`
(SHA-256
`69B82AD8070C91414403BD6E011FA200119EF6739A3493C95DD614BF526549F7`).
Its canonical producer source pin is
`DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342`.

Fresh job:
`_multidegree_grade9_repair_agent_grade9_forensics/rank8_low_low_a23_mixed_cross_strong_grade9_multidegree_family_job_agent_20260823.json`

- status: `PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE`
- SHA-256: `C53143A6B64FBD3E9D2BFD67C7DC8F23013D457FC96E663E9D24287A6D36D58C`
- completed cells: 4
- negative terms: 0 in every cell
- face-`01` complete hashes: middle
  `EA7EB0A304D4014AEEDFDC26CEE9F0C4F551D3AFB3D1EF8673910866F4AC58B8`,
  far `9F95945FB46B82F90ED528A60E518F193B7E1A41C6CF67731290FA8C97B0DB9C`
- face-`10` complete hashes: middle
  `3DB0AE6CF84E2D543E9EE9E250B5DAEA32937963135519DC7945321ACBED1A1F`,
  far `5A964D59938A155BB43C28E9FC6139654B9050A31678FE0E945865B42D27077A`

## Independent repair chain

The independent formal two-grading auditor was run against the exact fresh job
SHA above and completed all six face/outer slices.  It reconstructed each
natural bilinear atom independently, externally merged the atom streams, and
replayed both complete ordered rows for each face.  All chunk counts, signs,
minima, witnesses, chunk hashes, and complete-row hashes matched the producer;
all negative-term counts were zero.  Temporary replay streams were removed.

- Auditor source:
  `audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py`
  SHA-256 `A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F`
- Independent audit:
  `rank8_low_low_a23_mixed_cross_multidegree_strong_grade9_independent_audit_agent_grade9_forensics.json`
- audit status:
  `PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT`
- audit SHA-256:
  `7002C4D40E3C6BE4E4E82F39026D71C815437A0688DB0F478AE3B8D868ADBB4C`
- audited faces: 2; required rows per face: 2; outer chunks per row: 3

The per-grade assembler then pinned both the fresh producer job SHA and the
independent audit SHA before accepting the four complete face/row certificates.

- Assembler source:
  `assemble_rank8_low_low_a23_mixed_cross_multidegree_family_grade_agent.py`
  SHA-256 `F1DA08B8A20B594D851C87C1637A0F261BCAD8491FC130BEF99DC836D119BCB8`
- Assembled certificate:
  `rank8_low_low_a23_mixed_cross_multidegree_strong_grade9_assembler_agent_grade9_forensics.json`
- assembler status:
  `PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED`
- assembler SHA-256:
  `F9551FFD7C4C7EF5DED4C3F3268D86CD7EC2C8C15B5BDC3F01A8CCB7A8B44ACC`

This repairs and independently certifies the strong grade-9 multidegree row
only.  It does not by itself prove the full Erdős problem or certify any other
grade.
