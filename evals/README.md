# Repository evaluations

`project-evals.json` defines repository consistency checks for links, shell paths, contracts, test roles, CI wiring, and roadmap phases. `mock-data-evals.json` checks Smart Mock fixtures and dictionary fallbacks.

The evaluator checks architecture conventions by matching source markers and structural definitions. These checks are project-internal guardrails, not proofs of runtime behavior, and can be sensitive to refactors. Runtime tests and negative canaries provide behavioral evidence. Markdown shell checks verify local script paths, Docker build contexts, and static bind sources; they do not execute commands or validate external tools.

> **Adoption note**: `evals/run.mjs` is tailored specifically as a meta-consistency gate for this repository showcase. Adopting engineering teams should **not** copy `evals/run.mjs` into their own microservices or libraries. Production teams should instead rely on standard static linters (ESLint, Spectral, ShellCheck), type systems, and automated behavioral integration tests.

Run `node evals/run.mjs` directly or through `bash ./run.sh`.
