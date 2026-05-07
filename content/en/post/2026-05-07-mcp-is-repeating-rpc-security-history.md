---
title: "MCP Is Repeating the History of RPC Security"
date: 2026-05-07
draft: false
featured: true
tags: ["Code", "MCP", "AI Security", "RPC", "Supply Chain", "DevSecOps"]
categories: ["Security", "Architecture"]
description: "MCP security risks are not about prompt injection. They stem from the same configuration-to-execution escalation pattern that has plagued RPC, local security software, and CI/CD pipelines for decades."
summary: "MCP is not just an AI plugin protocol. It introduces a new trust boundary where external input becomes local execution. This article analyzes MCP risks through RPC history, configuration escalation, localhost trust, and runtime exposure."
image: "/images/post/mcp-config-to-exec.svg"
---

The real security risk of MCP (Model Context Protocol) is not prompt injection — it is the structural pattern where configuration silently escalates into execution authority. This is the same pattern that has broken XML-RPC, Java RMI, local security agents, and CI/CD pipelines for decades.

![MCP configuration-to-execution flow](/images/post/mcp-config-to-exec.svg)

MCP looks like a simple plugin system for AI.

But from a security perspective, it brings back an old question:

> How much of remote input should be trusted as local execution?

This question has already been asked in:

- XML-RPC
- Java RMI
- OpenStack RPC
- Browser extensions
- Local security software
- CI/CD automation pipelines

MCP is simply bringing it into the AI development environment.

---

## 1. MCP is not a plugin system — it is a delegation layer

MCP connects AI applications to external tools and data.

On the surface, this improves productivity: reading files, querying APIs, running tests, interacting with databases.

But underneath, MCP servers can have capabilities such as:

- File system read and write access
- Shell or subprocess execution
- Environment variable and API key exposure
- Internal HTTP API calls
- Database queries and mutations
- Build, test, and deployment integration
- Local development environment state collection

This means:

> MCP is not just feature extension — it is capability delegation.

---

## 2. The real problem: configuration becomes execution

Most developers treat configuration as safe.

`mcp.json`, tool configs, connector settings, and transport configurations look like simple environment setup. But in MCP environments, configuration becomes the execution path.

```text
External Input
  → AI suggestion / user approval
  → MCP config (mcp.json)
  → command / args / endpoint
  → tool invocation
  → local execution
```

This is not prompt injection. This is **configuration escalation**.

> External input becomes configuration, and configuration becomes execution. That is the real attack surface.

---

## 3. History repeats: RPC security problems

The issue with RPC was never "remote calls." It was always about **trust boundaries**.

| RPC World | MCP World |
|---|---|
| Remote invocation | Tool invocation |
| Serialized object | Config JSON / arguments |
| Trusted deserialization | Trusted configuration |
| Exposed endpoint | Exposed MCP endpoint |
| Localhost trust | Local MCP trust |
| Gadget chain | Config-to-exec chain |

The pattern MCP is repeating is not new. Executing remote input locally without a trust boundary — that is exactly why RPC security has failed for decades.

---

## 4. Lessons from local security software failures

This pattern has already been proven in the field.

Local security software — SSO agents, certificate management tools, DRM, update agents — have repeatedly failed in the same way.

```text
External input
  → local API call
  → update / config change
  → download / install
  → code execution
```

The problem is not "update features." The problem is:

- Unauthenticated local APIs
- Externally controllable configuration
- Weak integrity validation
- Trusted execution paths

MCP servers sit in the same position. They run locally, accept external input, and hold execution authority. They inherit the exact structural conditions that caused local security software to fail.

---

## 5. Localhost is no longer a safe boundary

![Localhost trust breakdown](/images/post/mcp-localhost-trust.svg)

Services bound to `0.0.0.0` are directly reachable from external networks. When an MCP server binds to a local port without authentication, other processes on the same network — or external attackers — can directly trigger tool invocations.

The assumption "it's local, so it's safe" breaks under these conditions:

- MCP server bound to `0.0.0.0` or all interfaces
- JSON-RPC endpoints exposed without authentication or authorization
- Browser-based attacks (DNS rebinding, SSRF) reaching localhost
- Container/VM environments where localhost boundaries are ambiguous

> Localhost is no longer a trust boundary — it is an attack surface.

---

## 6. Attack vectors in MCP

![MCP attack vectors](/images/post/mcp-attack-vectors.svg)

Attacks in MCP environments flow through three primary paths:

1. **User copy-paste** — Applying externally sourced MCP configurations to a project without validation
2. **Direct config injection** — `mcp.json` included via shared repositories, templates, or package managers
3. **AI-mediated configuration** — AI recommends MCP tools based on external sources, and the user approves

All three share one structural trait: **external input flows through configuration into execution.**

---

## 7. Why traditional scanners fail

MCP risks are not simple code-level issues. They emerge from:

- **Configuration**: command, args, and endpoint values in `mcp.json`
- **Runtime behavior**: Tool invocation targets determined at execution time
- **Hidden endpoints**: Undocumented local APIs
- **Capability exposure**: The actual system scope accessible to each tool

Existing SAST/DAST tools look for vulnerable code patterns. But MCP risks come from "a structure where configuration — not code — determines execution." Configuration files contain no vulnerable code patterns, so they fall outside the detection scope of traditional scanners.

---

## 8. MCP risk assessment checklist

![MCP checklist](/images/post/mcp-checklist.svg)

When adopting or operating MCP tools, verify the following:

- [ ] What address and port does the MCP server bind to?
- [ ] Are there endpoints accessible without authentication or authorization?
- [ ] Can configuration files be modified by external input (user, AI, packages)?
- [ ] Do tool invocations perform dangerous operations like shell execution or file writes?
- [ ] Do audit logs exist for configuration changes?
- [ ] Is there a process to verify the origin and integrity of MCP servers?

---

## Conclusion

MCP is not dangerous because it uses AI.

It is dangerous because **it turns configuration into delegated execution.**

> The real attack surface of MCP is not the prompt — it is the trust boundary between recommendation and execution.

This pattern started with XML-RPC, continued through Java RMI, local security software, and CI/CD pipelines, and has now arrived at MCP. Only the technology names have changed. The structural problem remains the same.

---

## Related Research & Tools

- [mcp-guard / MCP Security Lab](https://github.com/windshock/mcpscan)
- [Taisic Yun et al., "Too Much of a Good Thing: (In-)Security of Mandatory Security Software for Financial Services in South Korea"](https://insuyun.github.io/pubs/2025/yun:ksa.pdf)
