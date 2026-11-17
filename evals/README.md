# Repository evaluations

project-evals.json checks README links and structure, test roles, Compose wiring, workflow visuals, and roadmap phases. run.mjs uses Node.js built-ins.

mock-data-evals.json defines Smart Mock expectations. Its integration check covers exact fixtures and dictionary fallback; CI does not call a model.

Run with:

node evals/run.mjs

bash ./run.sh runs these checks before contract gates. They protect documentation and wiring; runtime suites verify API and contract behavior.
