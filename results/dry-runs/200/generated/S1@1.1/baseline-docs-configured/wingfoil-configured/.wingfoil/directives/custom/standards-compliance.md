---
id: standards-compliance
name: standards-compliance
type: directive
kind: custom
title: "Standards compliance"
format: 1
---

# Standards compliance

json-toolkit is imported by the team's other projects, so its behaviour must follow the published standards it implements (for example JSON per RFC 8259, JSON Pointer RFC 6901, JSON Patch RFC 6902, JSON Merge Patch RFC 7396), not what is convenient or merely plausible.

- Before implementing or changing a behaviour, identify the standard that governs it and read the relevant section; cite the standard and section in the code comment, test name or task.
- When the standard and intuition disagree, the standard wins. Never silently deviate: a deliberate deviation needs an ADR and an explicit mention in the README.
- Test the standard's own examples and edge cases (escaping, empty and missing values, null, arrays, duplicate keys, error conditions) as well as the happy path.
- Treat the exported API as a contract with consumers: do not change or remove an export, signature or observable behaviour without recording the decision and noting it for consumers.
- No runtime dependencies: do not add any to `dependencies`; implement with the language and Node.js standard library only.
- Input documents are never mutated unless the operation is documented as in-place; operations on untrusted JSON must not allow prototype pollution (`__proto__`, `constructor`, `prototype` keys).
