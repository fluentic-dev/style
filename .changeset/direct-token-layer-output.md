---
"@fluentic/style": patch
---

Use token CSS variables directly for token-valued properties and apply combineStyle overrides on consuming elements. Overrides share one token value per element and inherit into descendants; dynamic non-token values retain property-local variables.

Reduce extracted CSS output by grouping consecutive rules in the same layer and emitting one ordered layer declaration. Preserve important sublayer reservations so late-loaded rules keep their cascade precedence.
