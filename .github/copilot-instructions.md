# Git and Tool Execution Rules

- Always execute local Git CLI commands through the VS Code terminal.
- Use PowerShell on Windows.
- Never send Git commands to SQL tools.
- Never interpret Git commands as SQL statements.
- Use GitHub MCP for remote GitHub operations.
- Use SQL tools exclusively for database queries.
- Before executing Git commands, verify the repository working directory.

For Git status requests, execute:

```powershell
git status
```

Return the actual command output without inventing results.