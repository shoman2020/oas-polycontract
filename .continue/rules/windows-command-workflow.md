---
name: Windows command workflow
alwaysApply: true
description: Run safe project commands directly and use PowerShell-friendly, chunked file inspection on Windows.
---

# Command workflow

- When the task requires it, run safe, non-destructive commands in the project workspace without asking for extra confirmation. This includes reading/searching files, checking Git status or diffs, and running requested or relevant build, lint, and validation commands.
- Continue through the remaining authorized steps after each command completes. If a response or tool run is interrupted, inspect the current state and resume from the last verified step instead of repeating completed work.
- When a command fails, use its output to diagnose the cause, make a scoped fix when authorized, and rerun the relevant check. Report genuine blockers clearly.
- Use PowerShell syntax on Windows. Prefer `Get-Content`, `Select-Object`, `rg`, and native project scripts. Do not use Unix-only commands such as `head`, `cat -n`, or `2>/dev/null` in PowerShell.
- Read large files in focused chunks to stay within model context limits. For example, use `Get-Content .\README.md | Select-Object -First 40` and `Get-Content .\README.md | Select-Object -Skip 40 -First 40`; use `rg -n` to locate relevant sections first.
- Do not pause for routine confirmation when a safe command is needed to complete the requested task. Do not bypass Continue or IDE permission controls.
- Ask before destructive operations, dependency or tool installation, publishing, deployment, or remote Git changes such as push. Only perform these when the user explicitly requests them.
- Keep commands scoped to the workspace, inspect command output, and report failures rather than silently retrying with broader permissions.
