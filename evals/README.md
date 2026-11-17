# Repository checks

`project-evals.json` checks documentation links, test roles, Compose wiring, security/workflow coverage, dependency locks, and roadmap phases. `run.mjs` uses Node.js built-ins.

`mock-data-evals.json` checks Smart Mock fixtures and dictionary fallbacks. CI does not call a model.

Run `node evals/run.mjs` directly or through `bash ./run.sh`. These checks cover repository wiring; runtime suites verify API behavior.
