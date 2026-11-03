# Third-party material in S1@1.0's oracle

S1's hidden tests are the benchmark's own. The data three of its suites run on is not: it is listed here
with its source, its pin (dl-002) and its license, as `scenario.yaml`'s `oracle.third_party` declares it.

| File | Source | Pin | License |
|---|---|---|---|
| `oracle/patch/tests.json` | [json-patch/json-patch-tests](https://github.com/json-patch/json-patch-tests), unchanged | commit `2a928f9044aad35c74e2788d498bcf2c6b91adea` | Apache-2.0 ([Apache-2.0.txt](Apache-2.0.txt)) |
| `oracle/patch/spec_tests.json` | [json-patch/json-patch-tests](https://github.com/json-patch/json-patch-tests), unchanged | commit `2a928f9044aad35c74e2788d498bcf2c6b91adea` | Apache-2.0 ([Apache-2.0.txt](Apache-2.0.txt)) |
| `oracle/pointer/rfc6901-section5.json` | [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901#section-5) section 5, the document and its twelve pointers, transcribed into JSON | `sha256` | BSD-3-Clause, Copyright (c) 2013 IETF Trust and the persons identified as the document authors ([BSD-3-Clause-IETF.txt](BSD-3-Clause-IETF.txt)) |
| `oracle/merge-patch/rfc7386-appendix-a.json` | [RFC 7386](https://www.rfc-editor.org/rfc/rfc7386#appendix-A) Appendix A, its fifteen test cases, transcribed into JSON | `sha256` | BSD-3-Clause, Copyright (c) 2014 IETF Trust and the persons identified as the document authors ([BSD-3-Clause-IETF.txt](BSD-3-Clause-IETF.txt)) |

The RFC examples are Code Components (JSON, and tables of values) under the IETF Trust Legal Provisions,
section 4; both RFCs point to the BSD License of section 4.e, which the Trust has named the Revised BSD
License since 2021: BSD-3-Clause. This was confirmed while authoring S1 (task-032), as dl-002 asked.
