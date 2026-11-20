# Repository evaluations

`project-evals.json` defines repository checks for links, shell-command paths, contracts, test roles, CI wiring, and roadmap phases. `mock-data-evals.json` checks Smart Mock fixtures and dictionary fallbacks.

The evaluator checks some architecture conventions by matching source markers. These checks are guardrails, not proof of behavior, and can be sensitive to refactors. Runtime tests and negative canaries provide behavioral evidence. Markdown shell checks verify local script paths, Docker build contexts, and static bind sources; they do not execute commands or validate external tools.

Run `node evals/run.mjs` directly or through `bash ./run.sh`.
