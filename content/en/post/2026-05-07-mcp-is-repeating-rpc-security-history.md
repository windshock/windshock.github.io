---
title: "MCP Is Repeating the History of RPC Security"
date: 2026-05-07
draft: false
featured: true
tags: ["MCP", "AI Security", "RPC", "Supply Chain", "DevSecOps"]
categories: ["Security", "Architecture"]
summary: "MCP is not just an AI plugin protocol. It introduces a new trust boundary where external input becomes local execution. This article analyzes MCP risks through RPC history, configuration escalation, localhost trust, and runtime exposure."
image: "/images/post/mcp-config-to-exec.svg"
---

![MCP configuration-to-execution flow](/images/post/mcp-config-to-exec.svg)

MCP (Model Context Protocol) looks like a simple plugin system for AI.

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

## MCP is not a plugin system — it is a delegation layer

MCP connects AI applications to external tools and data.

On the surface, this improves productivity:
- reading files
- querying APIs
- running tests
- interacting with databases

But underneath, MCP servers can have capabilities such as:

- file system access
- shell execution
- environment variable exposure
- internal API calls
- database operations
- build and deployment integration

This means:

> MCP is not just feature extension — it is capability delegation.

---

## The real problem: configuration becomes execution

Most developers treat configuration as safe.

But in MCP environments:

```text
External Input
→ AI suggestion / approval
→ MCP config (mcp.json)
→ command / args / endpoint
→ tool invocation
→ local execution
```

This is not just prompt injection.

This is **configuration escalation**.

> External input becomes configuration, and configuration becomes execution.

That is the real attack surface.

---

## History repeats: RPC security problems

The issue with RPC was never “remote calls”.

It was always about **trust boundaries**.

| RPC World | MCP World |
|---|---|
| remote invocation | tool invocation |
| serialized object | config JSON / arguments |
| trusted deserialization | trusted configuration |
| exposed endpoint | exposed MCP endpoint |
| localhost trust | local MCP trust |
| gadget chain | config-to-exec chain |

---

## Lessons from local security software failures

This pattern is not new.

Local security software (SSO, certificate tools, DRM, update agents)
have repeatedly failed in similar ways.

```text
External input
→ local API call
→ update/config change
→ download/install
→ code execution
```

The problem is not “update features”.

The problem is:

- unauthenticated local APIs
- externally controllable configuration
- weak integrity validation
- trusted execution paths

---

## Localhost is no longer a safe boundary

![Localhost trust breakdown](/images/post/mcp-localhost-trust.svg)

> Localhost is no longer a trust boundary — it is an attack surface.

---

## Attack vectors in MCP

![MCP attack vectors](/images/post/mcp-attack-vectors.svg)

1. User copy-paste
2. Direct config injection
3. AI-mediated configuration

---

## Why traditional scanners fail

MCP risks are not just code-level issues.

They emerge from:

- configuration
- runtime behavior
- hidden endpoints
- capability exposure

---

## Conclusion

MCP is not dangerous because it uses AI.

It is dangerous because:

> It turns configuration into delegated execution.

---

## Related

- https://github.com/windshock/mcpscan
