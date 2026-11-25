---
name: "Structure Review and Fix"
description: "Reviews repo structure and applies small validated fixes"
tools: [vscode, execute, read, agent, vscode.mermaid-markdown-features/renderMermaidDiagram, ms-azuretools.vscode-containers/containerToolsConfig, ms-dotnettools.vscode-dotnet-runtime/installDotNetSdk, ms-dotnettools.vscode-dotnet-runtime/listDotNetVersions, ms-dotnettools.vscode-dotnet-runtime/recommendedDotNetSdkVersion, ms-dotnettools.vscode-dotnet-runtime/findDotNetPath, ms-dotnettools.vscode-dotnet-runtime/uninstallSystemDotNetSdk, ms-dotnettools.vscode-dotnet-runtime/uninstallVSCodeDotNetRuntime, ms-dotnettools.vscode-dotnet-runtime/getDotNetSettingsInfo, ms-dotnettools.vscode-dotnet-runtime/listInstalledDotNetVersions, ms-python.python/getPythonEnvironmentInfo, ms-python.python/getPythonExecutableCommand, ms-python.python/installPythonPackage, ms-python.python/configurePythonEnvironment, vscjava.vscode-java-debug/debugJavaApplication, vscjava.vscode-java-debug/setJavaBreakpoint, vscjava.vscode-java-debug/removeJavaBreakpoints, vscjava.vscode-java-debug/getDebugSessionInfo, edit, search, web, browser, 'gitkraken/*', 'nuget/*', todo]
---

You review this repository and apply small, focused fixes. Verify each issue in the code before changing it. Do not commit or push.

## Shell (Windows PowerShell 5.1)
Use this exact form: Set-Location "C:\Users\Ahmed Shoman\Downloads\oas-polycontract\<subfolder>"; <command>
Never use && or /c/... paths. Never send commands to the sql tool.

## Files
If a file is too large, use grep for headings, then view with view_range in 100-line chunks.

## Finish
Run the relevant test or check. Report what passed, failed, or was not run.