---
title: "From a Security Development Spec for Small LLMs to Regression Tests and Fuzzing Validation"
date: 2026-06-08
draft: false
tags: ["AI", "LLM", "CyberSecurity", "DevSecOps", "Fuzzing", "Jazzer", "Jest", "JUnit", "SoftwareTesting", "SecurityResearch", "ProblemFraming"]
categories: ["Security", "AI"]
summary: "This article explains how I split an XSS security development specification for small local models into core/verify/dev/test overlays, and what I learned while connecting LLM-based judgment to regression-test generation and Jazzer/Jazzer.js fuzzing seeds."
---

<!--
Image suggestion:
![LLM security spec to test repair and fuzzing workflow](/images/post/llm-security-spec-test-repair-fuzzing.webp)
-->

> **oh-my-secuaudit series** ([post 4](/en/post/2026-05-19-sec-audit-static-feedback-loop/) was about an audit workflow surviving by absorbing misses. This post 5 turns the judgment criteria themselves into regression tests and fuzzing seeds — making them executable.)
> 1. [Security Testing as Code — Structuring Assessment as Code](/en/post/2026-03-17-security-testing-as-code/)
> 2. [Structure Builders Will Outlast Vulnerability Finders](/en/post/2026-04-02-security-from-sense-to-structure/)
> 3. [How I Turned 228 Endpoints into 5 Clusters](/en/post/2026-04-15-security-code-clustering/)
> 4. [An Audit Workflow Survives Only When It Absorbs Misses](/en/post/2026-05-19-sec-audit-static-feedback-loop/)
> 5. **From a Security Development Spec for Small LLMs to Regression Tests and Fuzzing Validation** ← current post

## 1. Starting Point: Not a Model That Finds the Most Vulnerabilities, but One That Applies the Same Criteria

Recently, I was building a security development specification that could work even with small local models. The goal was not simply to ask an LLM, "Is this code vulnerable to XSS?" More precisely, I wanted developers and AI to use the same pass/fail criteria for XSS, and I wanted to compare how consistently different models classify the same code snippet as vulnerable, safe, or lacking enough evidence.

The important question in this project was not "Which model finds the most vulnerabilities?" The real question was: **Which model can make consistent judgments within limited context without inventing code it cannot see?** In real security review, a model must not imagine an unseen sanitizer, validator, middleware, template, Content-Type, or call path. A model that does that may produce plausible explanations, but its security judgments are not reproducible.

At first, the XSS security standard was a single large document. The guidance developers should read, the verification rubric security reviewers should use, and the judgment rules required for LLM evaluation were all mixed together in one file. Humans could still read it to some extent, but it was too heavy for small models. When the full specification was inserted into the judgment prompt, small models collapsed easily. When only the rules needed for judgment were compressed and provided, they became much more stable.

So I split the XSS specification as follows.

```text
spec/
  core/xss-core.md          ← SSOT: framework-agnostic XSS normative rules
  verify/xss-judge.md       ← verification overlay: judgment procedure, verdicts, evidence discipline
  dev/nextjs-vercel.md      ← development overlay: safe Next.js/Vercel authoring patterns
  dev/spring.md             ← development overlay: safe Spring authoring patterns
  test/intent-schema.md     ← test-generation overlay: intent JSON emitted by the LLM
  test/junit5-xss.md        ← JUnit5/MockMvc test authoring rules
```

The most important principle in this structure is that **the body of each rule exists only in `core`**. The development overlay, verification overlay, and test-generation overlay cite rule IDs from `core`. This reduces drift between documents that are likely to evolve independently.

This was not merely an exercise in shortening documentation. It was an attempt to make the same security standard usable in different forms: when humans read it, when a model judges code, when developers write code, and when a test generator turns the judgment into executable validation.

## 2. The Roles of Core, Verify, Dev, and Test

`core/xss-core.md` is the single source of truth for XSS defense. For example, query strings, path variables, request bodies, form fields, headers, cookies, external APIs, webhooks, message queues, file uploads, and batch-imported data are all treated as untrusted values. These values must go through context-specific defense at the point of output.

The core specification also clearly separates input validation from XSS defense. Input validation only constrains the shape of input. XSS defense is completed at output time through context-specific encoding or a verified sanitizer. HTML body, HTML attribute, URL attribute, JavaScript string, CSS value, HTML fragment, JSON response, and redirect are different output contexts, and each requires a different defense.

For example, URLs and redirects do not become safe merely because React or a template engine escapes them. Before rendering or navigating, a URL must be parsed and canonicalized, and the allowed scheme and host/path must be validated. `javascript:`, `data:`, and `vbscript:` should be blocked by default, and protocol-relative URLs such as `//evil.example/path` should also be blocked.

`verify/xss-judge.md` turns these core rules into a code-review judgment procedure. It asks the model to follow this process.

```text
1. Check whether the value source is untrusted.
2. Determine the output context.
3. Check whether the required context-specific defense is visible in the code.
4. Check whether an untrusted value reaches a forbidden sink.
5. If a sanitizer or validator exists, check whether its implementation and policy are visible.
6. Do not assume safety based only on CSP, WAF, or framework-default escaping.
```

The judgment labels are fixed to three values.

```text
CONFIRMED_VULNERABLE
FALSIFIED_SAFE
NOT_ENOUGH_EVIDENCE
```

`NOT_ENOUGH_EVIDENCE` is not a failure. It is an important correct answer that verifies whether the model refuses to infer code it cannot see. For example, even if a variable is named `safeHtml`, the model must not conclude that it is safe unless the sanitizer implementation and policy are visible.

`dev/nextjs-vercel.md` and `dev/spring.md` are not judgment criteria. They are authoring guides that help developers write safe code from the beginning. For example, the Next.js/Vercel overlay recommends rendering untrusted `searchParams`, `params`, request bodies, formData, headers, cookies, external API/CMS content, webhooks, and Edge Config values through JSX text interpolation by default.

```tsx
// Good
<div>{searchParams.q ?? ''}</div>

// Avoid
<div dangerouslySetInnerHTML={{ __html: searchParams.q ?? '' }} />
```

It also recommends that `router.push`, `redirect`, and `NextResponse.redirect` do not receive values directly from `searchParams`, `request.nextUrl.searchParams`, `formData`, or cookies. Only static paths or allowlisted internal paths should be used.

```ts
const ALLOWED_PATHS = new Set(['/dashboard', '/profile']);

export function toSafeInternalPath(v?: string | null) {
  if (!v || !v.startsWith('/') || v.startsWith('//') || !ALLOWED_PATHS.has(v)) {
    return '/dashboard';
  }
  return v;
}
```

In short, `core` defines the normative rules, `verify` defines judgment, `dev` defines safe authoring defaults, and the `test` overlay connects the LLM judgment to executable regression tests.

## 3. Small-Model Experiment: If the Spec Is Reduced, Small Models Can Follow

After splitting the spec, I tested how well local models could follow this structure. The environment was Apple M1 Pro with 16 GB RAM and MLX-LM. MLX-LM was suitable for repeatedly calling local models on Apple Silicon, and prompt caching reduced the cost of repeatedly injecting a fixed judgment spec.

The important observation was this: small models are not always weak. If the specification is shaped in a way that a small model can follow, it can behave quite reliably. Separating core rules from the judge procedure was more effective than passing a long natural-language guide as-is.

In particular, `Qwen2.5-Coder-3B` performed well for code vulnerability judgment. Although it was a small model, it followed the XSS judgment spec reasonably well, and its JSON output was relatively stable. At that point, a small-model-based security judgment engine looked feasible.

But this was only judgment. To become actual development-security automation, judgment results had to be connected to executable validation.

## 4. Why I Moved Toward Regression-Test Generation

What I wanted to build was not just an LLM security judgment engine. The final goal was a **security validation flow that combines an LLM with a central Jazzer/Jazzer.js-based fuzzing server**.

The current repository validates the following flow.

```text
1. Split the XSS security spec into core/verify/dev/test.
2. Let the LLM judge code snippets using core+verify.
3. Let the LLM output test intent as JSON.
4. Let a deterministic renderer generate JUnit5 or Jest regression tests.
5. Execute the generated tests differentially against vulnerable and fixed implementations.
6. Send the discriminating test and payload as seeds to a Jazzer/Jazzer.js fuzzing server.
```

The part that remains a design or next step is the central fuzzing server sending test bundles to developer PCs or CI agents, running regression tests and fuzzing on the developer side, and collecting crash inputs, corpus, and coverage back into the central server. In other words, the "central fuzzing server" described here is not yet a fully implemented system. It is the operational architecture that the regression-test generation experiment is moving toward.

The reason for considering Jazzer is clear. Jazzer is a coverage-guided in-process fuzzer for the JVM, and it integrates with JUnit 5 through `@FuzzTest`. This makes it easier to connect regression mode and fuzzing mode inside a developer's existing test environment. However, the implementation verified in the current `security-spec` repository is not an `@FuzzTest` renderer. It is a **JUnit5/MockMvc and Jest regression-test renderer**. Jazzer/Jazzer.js should be understood as the next validation stage that receives generated tests and payloads.

## 5. Regression-Test Generation Eval: Differential Execution

The regression-test generation eval is different from the verify eval, which only checks label agreement. It actually executes generated tests. The scoring method is differential execution.

```text
vulnerable implementation → FAIL
fixed implementation      → PASS

discriminates = (vuln→fail) ∧ (safe→pass)
```

A test that passes both implementations or fails both implementations is not useful. The Java track uses the exit code of the JUnit Platform ConsoleLauncher, and the JS/TSX track uses the Jest exit code.

The Java track is based on JUnit5 `@WebMvcTest`, executed through jbang and ConsoleLauncher. This makes it possible to inject fixtures and generated tests without constructing a full Maven project. The JS/TSX track uses Jest, jsdom, react-dom/server, and a Babel-based harness.

The targets are 13 cases from `llm-eval/cases.jsonl` that correspond to `CONFIRMED_VULNERABLE` and `FALSIFIED_SAFE`. `NOT_ENOUGH_EVIDENCE` cases are excluded from test generation because there is no defined vulnerable/safe behavior for them, but they remain in the verify eval.

There are 7 Java cases and 6 JS/TSX cases. The JS/TSX cases are grouped into 4 scenarios: `domresult`, `domhref`, `reacthtml`, and `reactscript`. Therefore, the results should distinguish between "Java 7 + JS/TSX 6 = 13 total test-generation targets" and "4 JS scenarios."

## 6. The Problem with Raw Code Generation

At first, I asked the model to generate Java/JUnit/MockMvc regression-test code directly. `Qwen2.5-Coder-3B` was fairly good at vulnerability judgment, but raw test-code generation exposed its limitations. So I tried larger models: 7B and 14B.

With raw Java generation, `Qwen2.5-Coder-14B` was close to 7/7 in logic. But the surface result was 4/7. The 3 failing cases were all compilation failures, and the cause was identical: a missing closing parenthesis at the end of the last `andExpect(content().string(not(containsString(...))))` statement.

The failure roughly looked like this.

```java
// Intended logic, but does not compile
mockMvc.perform(get("/search").param("q", "<script>alert(1)</script>"))
    .andExpect(status().isOk())
    .andExpect(content().string(containsString("&lt;script&gt;alert(1)&lt;/script&gt;")))
    .andExpect(content().string(not(containsString("<script>alert(1)</script>")));
```

The last line is missing one closing parenthesis. The compilable version is this.

```java
// Compilable form
mockMvc.perform(get("/search").param("q", "<script>alert(1)</script>"))
    .andExpect(status().isOk())
    .andExpect(content().string(containsString("&lt;script&gt;alert(1)&lt;/script&gt;")))
    .andExpect(content().string(not(containsString("<script>alert(1)</script>"))));
```

The important point is that this was not an XSS judgment failure. The security judgment was correct. The payload was correct. The assertion intent was correct. The failure came from the generated Java test artifact not being reliably compilable.

What was more interesting is that a one-shot repair loop did not work either. The important point here is not temperature 0 itself. Given the same model, same prompt, and same decoding condition, repeated output is expected. The real observation was that even after adding the compile error to the repair prompt, raw-code repair did not reliably remove the same structural error. The model reproduced the same assertion shape rather than fixing its own mistake.

This problem must be separated as follows.

```text
Security judgment failure:
- Wrong payload
- Failure to distinguish safe and vulnerable fixtures
- Wrong expected output
- Wrong XSS context classification

Artifact generation failure:
- Missing parenthesis
- Missing import
- Java string escaping error
- Assertion-chain syntax error
- Test-class structure error
- Jest matcher syntax error
```

This case was the second category. The model did not fail to understand security. I was asking the model to generate syntax-heavy artifacts that it did not actually need to generate.

## 7. Related Work: LLM Test Generation and Repair

To solve this problem, looking only at security vulnerability analysis papers was not enough. The closer areas were LLM-based unit test generation, test repair, and fuzz harness generation.

### 7.1 MultiFileTest: Executability Errors Are a Core Bottleneck in Multi-File Test Generation

MultiFileTest points out that existing LLM unit-test generation benchmarks often stay at the function, class, or single-file level, and proposes a benchmark for multi-file projects in Python, Java, and JavaScript. It evaluates multiple frontier LLMs and reports that most models show limited performance in a multi-file setting, with Java being the hardest among the three languages. It also reports that even advanced models produce executability errors and cascade errors, then reevaluates them under manual fixing and LLM self-fixing scenarios. Because this source is an anonymous ACL submission draft, details such as project counts and evaluated models may change in the final version. [2]

This is close to my problem. In my experiment, the model got the security intent right, but the actual Java test artifact did not compile. So the more accurate explanation was not "the model failed to judge XSS," but "the model failed to reliably produce an executable test artifact in a project setting." The error analysis in MultiFileTest, such as Java's syntax-heavy executability errors, JavaScript's mismatched parentheses, missing imports, and Jest framework compliance problems, is in the same family of failures I saw in JUnit/Jest test generation.

### 7.2 YATE: Do Not Discard Broken Tests; Repair Them

YATE points out that LLM-generated unit tests often fail in both syntax and semantics. But immediately discarding such tests is a missed opportunity. Even a broken test may target the underlying program logic, and once repaired, it can have real testing value. YATE combines rule-based static analysis and re-prompting to repair some incorrect tests. [3]

In my case as well, the failing tests were not something to discard. Their assertion intent and payload were correct. If one parenthesis was fixed, they could be used as discriminating tests. Therefore, this failure should be separated as a repairable artifact error rather than counted simply as a model-performance failure.

### 7.3 TestART: Template-Based Repair and Repeated Repair Failure

TestART identifies compilation/runtime errors, lack of coverage feedback, and repetitive repair failure as problems in LLM-based unit-test generation. It proposes a structure that improves generation and repair iterations together, using a template-based repair strategy to fix LLM-generated test cases. [4]

The fact that raw-code repair did not reliably fix the same structural error even after compile errors were included in the repair prompt resembles this problem. Telling the LLM to "fix it" repeatedly is not always the answer. Known syntax errors, repeated assertion-chain errors, and missing imports are often more reliably handled through rules or templates.

### 7.4 SecureCode v2.0: Structuring Security-Coding Knowledge as a Multi-Turn Dataset

SecureCode v2.0 is also relevant background. It proposes a production-grade dataset for training security-aware code generation models. According to the public abstract, the dataset consists of many security-focused coding examples split into train/validation/test sets. It also covers multiple programming languages and vulnerability categories. Each example uses a multi-turn conversational structure that moves from a baseline implementation to advanced security considerations and defense-in-depth guidance. Since exact counts and language coverage may vary depending on the version of the source, I do not cite the specific numbers in the main text. [5]

This direction shows that security development knowledge is not sufficiently captured by simple vulnerable/secure snippet pairs. The flow from developer requirement to vulnerable implementation, safe implementation, attack scenario, and operational defense matters.

However, SecureCode v2.0 is mainly a dataset for training security-aware code generation models. My problem is slightly different. I wanted to split a security development spec into `core` and `verify` layers so that a small local model could make judgments, then connect that judgment to regression tests and Jazzer/Jazzer.js fuzzing seeds. Therefore, SecureCode v2.0 is an important related trend, but it does not directly solve executable test-artifact reliability.

### 7.5 Connection to LLM-Based Fuzz Harness Generation

Research on Java library fuzzing harness generation is also connected. Coverage-guided fuzzing is effective, but fuzzing library code requires a harness that converts fuzzer input into valid API calls. Writing such a harness manually requires substantial knowledge. Related work divides LLM-powered agents into stages such as research, synthesis, compilation repair, coverage analysis, and refinement, then uses coverage feedback to improve the harness. [6]

Another Java vulnerability-discovery work, GONDAR, proposes a sink-centric fuzzing structure. It first finds reachable/exploitable sinks through CWE-specific scanning and LLM-assisted static filtering, then uses a coverage-guided fuzzer and agents to search for inputs that satisfy the target call site and exploit condition. [7]

These studies connect directly to the central fuzzing server + LLM architecture I have in mind. The LLM does not solve everything by itself. The fuzzer, compiler, static analysis, coverage feedback, and repair agent each do their part, while the LLM focuses on intent generation and interpretation between those tools.

## 8. Applied Design: The LLM Emits Intent; the Renderer Writes Code

The structure I applied to solve this problem is simple. Do not ask the LLM to write the entire JUnit or Jest test. The LLM outputs only the test intent as JSON. The deterministic renderer generates the syntax of JUnit/MockMvc or Jest code.

The current repository keeps the intent schema deliberately small. The model does not output request paths, HTTP methods, controller class names, component names, imports, annotations, or matcher chains. Those values are fixed in the scenario and known by the renderer. The model's role is to choose a discriminating payload and the correct check type.

This choice has a clear cost. Since the model does not create the structure, someone must author the scenario metadata in advance. Endpoint, method, parameter name, component prop, and fixture binding do not appear automatically. The current experiment works under the condition that this information is supplied by human-authored fixtures and scenario contracts.

```json
{
  "payload": "attack string to place into a request parameter",
  "check_type": "html_escaped | raw_absent | redirect_blocked | json_content_type",
  "safe_target": "/dashboard"
}
```

`safe_target` is required only for `redirect_blocked`.

### 8.1 HTML Body/Fragment: `html_escaped`

For cases where input is reflected into an HTML body or HTML fragment, `html_escaped` is used. The current renderer asserts that the raw payload must not appear in the response and that the fixture-expected HTML-escaped form must appear. This assertion is a regression oracle for distinguishing the current fixture pair; it is not a general conformance oracle that accepts all safe HTML-encoding representations.

```json
{
  "payload": "<script>alert(1)</script>",
  "check_type": "html_escaped"
}
```

Since the renderer knows the scenario-specific endpoint, it can, for example, inject the payload into `GET /search?q=` and generate the following JUnit assertion.

```java
mockMvc.perform(get("/search").param("q", "<script>alert(1)</script>"))
    .andExpect(status().isOk())
    .andExpect(content().string(not(containsString("<script>alert(1)</script>"))))
    .andExpect(content().string(containsString("&lt;script&gt;alert(1)&lt;/script&gt;")));
```

The model does not generate parentheses, imports, `@WebMvcTest`, `MockMvc` injection, or endpoint binding. The renderer does.

### 8.2 JavaScript Execution Context: `raw_absent`

When a value enters an execution context such as a `<script>` body, a JavaScript string, or an inline event handler, `raw_absent` is used instead of `html_escaped`. HTML entity encoding is not a defense for JavaScript execution contexts.

```json
{
  "payload": "</script><script>alert(1)</script>",
  "check_type": "raw_absent"
}
```

The renderer asserts that the raw attack string must not appear in the response.

```java
mockMvc.perform(get("/search").param("q", "</script><script>alert(1)</script>"))
    .andExpect(status().isOk())
    .andExpect(content().string(not(containsString("</script><script>alert(1)</script>"))));
```

Separating check types reduces the risk that the model incorrectly generalizes "HTML escaping is present, therefore the JavaScript context is safe."

### 8.3 Redirect: `redirect_blocked`

For redirect target validation, `redirect_blocked` is used. In the current fixture, unsafe redirect targets are remediated by redirecting to a safe default path, so the renderer uses that remediation behavior as the regression oracle.

```json
{
  "payload": "//evil.example/path",
  "check_type": "redirect_blocked",
  "safe_target": "/dashboard"
}
```

The renderer calls the scenario-specific redirect endpoint and checks whether the Location header equals `safe_target`.

```java
mockMvc.perform(post("/login").param("next", "//evil.example/path"))
    .andExpect(status().is3xxRedirection())
    .andExpect(header().string("Location", "/dashboard"));
```

### 8.4 JSON Response: `json_content_type`

If a JSON response is mistakenly rendered as an HTML page, it can create an XSS risk. For such cases, `json_content_type` is used. However, this check is only a minimal regression condition that ensures the response is not misused as HTML. It does not prove the presence of `X-Content-Type-Options: nosniff` or the safety of the entire call path.

```json
{
  "payload": "<svg/onload=alert(1)>",
  "check_type": "json_content_type"
}
```

The renderer checks whether the Content-Type is `application/json`.

```java
mockMvc.perform(get("/api/search").param("q", "<svg/onload=alert(1)>"))
    .andExpect(status().isOk())
    .andExpect(content().contentTypeCompatibleWith("application/json"));
```

## 9. Deterministic Renderer Example

A deterministic renderer is a fixed template that always generates the same test code for the same intent and scenario metadata. Here, scenario metadata means endpoint, method, parameter name, test class, and fixture binding. The model does not output this information.

The following is a simplified Python renderer example.

```python
def java_string(value: str) -> str:
    return (
        value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
    )

def html_escape_for_assertion(value: str) -> str:
    return (
        value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )

def render_mockmvc_assertions(intent: dict, scenario: dict) -> str:
    payload = intent["payload"]
    check_type = intent["check_type"]

    method = scenario["method"]
    path = scenario["path"]
    param = scenario["param"]

    if method != "GET":
        raise ValueError("This simplified renderer only shows GET examples.")

    request = f'get("{java_string(path)}").param("{java_string(param)}", "{java_string(payload)}")'

    lines = []
    lines.append(f"mockMvc.perform({request})")
    lines.append("    .andExpect(status().isOk())")

    if check_type == "html_escaped":
        escaped = html_escape_for_assertion(payload)
        lines.append(f'    .andExpect(content().string(not(containsString("{java_string(payload)}"))))')
        lines.append(f'    .andExpect(content().string(containsString("{java_string(escaped)}")))')

    elif check_type == "raw_absent":
        lines.append(f'    .andExpect(content().string(not(containsString("{java_string(payload)}"))))')

    elif check_type == "json_content_type":
        lines.append('    .andExpect(content().contentTypeCompatibleWith("application/json"))')

    else:
        raise ValueError(f"Unsupported check_type: {check_type}")

    lines[-1] += ";"
    return "\n".join(lines)
```

In this approach, the model does not decide how many parentheses are needed in `.andExpect(content().string(not(containsString(...))))`. The renderer always emits the same structure. This reduces errors such as missing parentheses, missing imports, and annotation mistakes that appeared in raw code generation.

The same principle applies to Jest. The model does not write Jest code directly; it outputs only payload and check type. The renderer uses a restricted matcher set such as `test()`, `expect()`, `toHaveAttribute()`, `not.toHaveAttribute()`, `toContain()`, and `not.toContain()`.

For example, suppose the intent for a DOM href scenario is as follows.

```json
{
  "payload": "javascript:alert(1)",
  "check_type": "raw_absent"
}
```

Using scenario metadata, the renderer can generate a Jest test like this.

```ts
test('domhref blocks unsafe href scheme', () => {
  document.body.innerHTML = '<a id="go"></a>';

  renderLink(document.getElementById('go'), 'javascript:alert(1)');

  const link = document.getElementById('go');
  expect(link?.getAttribute('href')).not.toBe('javascript:alert(1)');
});
```

The actual JS harness in the repository uses Jest, jsdom, react-dom/server, Babel for TSX, and isomorphic-dompurify under `test-eval/js/`. The code in this blog is a shortened example for explaining the concept.

## 10. What the Renderer Oracle Proves, and What It Does Not

The most important caution in this structure is that the assertion generated by the renderer is itself an oracle. Separating intent from renderer does not automatically turn the test into a general proof of security conformance. The current renderer creates a regression oracle that distinguishes vulnerable and fixed implementations within a hand-authored fixture pair and scenario contract.

For example, if `html_escaped` requires `containsString("&lt;script&gt;...")`, a safe implementation that uses the `&lt;`-style escaping used by the current fixture will pass. But an implementation that uses numeric character references such as `&#60;script&#62;` or `&#x3c;script&#x3e;`, or DOM text-node based rendering, may fail despite being safe. In that case, the test is not disproving XSS safety; it is saying that the implementation does not match the specific remediation form encoded by the fixture.

`redirect_blocked` has the same limitation. If the oracle requires `Location == /dashboard`, a safe implementation that rejects the request with 400 or redirects to another allowlisted internal path such as `/` may fail. Therefore, this check does not fully verify the semantic property "external redirect is impossible"; it regression-locks the safe behavior of the current fixture.

`json_content_type` is also a minimal condition. Checking that Content-Type is `application/json` helps prevent misuse as an HTML page, but it does not prove the existence of a `nosniff` header or the safety of client-side insertion paths.

Therefore, the current result must be interpreted as follows.

```text
Overstated interpretation:
- A 3B model can generate general XSS conformance tests.

Accurate interpretation:
- Within the currently defined 13 hand-authored fixtures/scenarios,
  a 3B model could reliably choose payload and check_type,
  and a deterministic renderer could produce compilable discriminating regression tests.
```

This limitation is a weakness, but it also clarifies the next direction. `html_escaped` can be extended from specific string comparison to DOM parsing and textContent-based verification. `redirect_blocked` can be expanded from `Location == safe_target` to a property-based oracle that checks the absence of external absolute URLs, protocol-relative URLs, and unsafe schemes. `json_content_type` can add `nosniff` and checks for client-side insertion paths.

In other words, the current renderer is not "an engine that fully proves security semantics." It is "an engine that produces stable regression oracles within defined fixtures and scenarios." This scope must be explicit.

## 11. The Remaining Cost: Scenario Metadata Authoring

The intent/renderer structure works well because the renderer already knows many things. Request path, HTTP method, parameter name, controller class, React component prop, fixture binding, and vulnerable/safe variants are not emitted by the model. They are supplied as scenario metadata.

This is an important load-bearing constraint. Since the model does not write raw code, the system depends on pre-authored scenario contracts. In the current experiment, this condition is explicitly provided. Therefore, the result means something closer to "a small model can reliably choose test intent within predefined scenarios," not "the system automatically generated all tests for an arbitrary real codebase."

To generalize this to arbitrary real codebases, the following problems remain.

```text
- Who finds source/sink/context?
- Who extracts endpoint, method, and parameter name?
- Who converts React component props or route handler inputs into scenarios?
- Without vulnerable/safe fixture pairs, how should differential oracles be created?
- Should unsafe mutations be generated automatically?
- Should patch candidates be created and used as safe counterparts?
- How can the renderer oracle move from a specific remediation form toward semantic properties?
```

This is the key research problem for the central fuzzing server. LLM judge, SAST, framework analyzer, route extractor, mutation engine, and renderer must work together for real-code generalization.

## 12. Connection to Jazzer/Jazzer.js: Current Implementation vs Next Step

What is currently verified in the repository is `intent JSON → JUnit/Jest deterministic renderer → differential execution`. The discriminating test and payload obtained from this result are intended to become seeds for a Jazzer/Jazzer.js fuzzing server.

Therefore, the following code is not implemented in the current repository. It is an example of an `@FuzzTest` renderer that could be added in the next stage.

```java
import com.code_intelligence.jazzer.junit.FuzzTest;

import static org.junit.jupiter.api.Assertions.*;

class SafeRedirectsFuzzTest {
  @FuzzTest
  void safe_redirect_path_should_remain_internal(String input) {
    String result = SafeRedirects.toSafeInternalPath(input);

    assertNotNull(result);
    assertTrue(result.startsWith("/"));
    assertFalse(result.startsWith("//"));
    assertFalse(result.contains(":"));
  }
}
```

Such an `@FuzzTest` can be generated deterministically in the same way as the regression-test renderer. But at the current stage, this example should be understood as an extension design, not an implemented feature. The verified result is simpler: when the LLM generated intent rather than raw Java/Jest code, `Qwen2.5-Coder-3B` could generate compilable discriminating regression tests for the current Java 7 and JS/TSX 6 test-generation targets, 13 cases in total.

## 13. Central Fuzzing Server Architecture

Extending this structure leads to the following architecture.

```text
[Central server]
  ├─ Manage security specs: core/verify/dev/test
  ├─ Run LLM judge
  ├─ Generate test intent
  ├─ Run JUnit/Jest renderer
  ├─ Create test bundle
  └─ Send to developer PC or CI agent

[Developer PC / CI agent]
  ├─ Receive test bundle
  ├─ Run JUnit/Jest regression tests
  ├─ Pass payloads as seeds to Jazzer/Jazzer.js
  ├─ Run fuzzing mode when needed
  ├─ Collect crash input / corpus / coverage
  └─ Send results back to central server

[Central server + LLM]
  ├─ Classify compile errors and semantic failures
  ├─ Separate test-intent errors from renderer errors
  ├─ Interpret crash input
  ├─ Suggest new payloads or seeds
  └─ Generate the next regression/fuzzing round
```

The key is role separation.

```text
LLM:
- Generate security intent
- Interpret source/sink/context/defense
- Generate test intent
- Interpret crash input
- Judge missing evidence

Renderer:
- Generate JUnit/Jest code
- Fix imports, parentheses, annotations, and matchers
- Handle language/framework-specific boilerplate

Compiler/Test Runner:
- Check compile_ok
- Perform differential execution
- Check regression pass/fail

Fuzzer:
- Perform coverage-guided input mutation
- Store crash inputs
- Expand the corpus
```

With this separation, the LLM does what it is good at, and deterministic tools do what they are good at. Each stage handles the task it is best suited for, and the LLM focuses on generating and interpreting intent between those stages.

## 14. Metrics Must Also Be Separated

Another important lesson from this experiment is that metrics must also be separated. If compile failures are mixed directly into discriminating-test failures, the model's security judgment ability is evaluated incorrectly.

The recommended metrics are as follows.

```text
intent_valid:
  Did the LLM generate a valid security test intent?

schema_ok:
  Did the LLM follow the intent schema?

render_compile_ok:
  Did the renderer generate test code that compiles in the current harness?

discriminate_ok:
  Does the test actually distinguish the vulnerable fixture from the safe fixture?

fuzz_seed_ready:
  Are the generated payload and test ready to be passed as Jazzer/Jazzer.js seeds?

semantic_fail:
  Does the test compile but express the wrong assertion semantics?

artifact_fail:
  Is the security intent correct while the raw code artifact is broken?
```

The missing-parenthesis case in raw Java should be classified like this.

```text
intent_valid: true
raw_render_compile_ok: false
repair_by_simple_patch: true
discriminate_ok_after_patch: true
failure_type: artifact_fail
```

This classification prevents the model from being evaluated incorrectly. The 14B model did not fail security judgment; it produced a syntax error in the Java artifact. In contrast, the intent+renderer structure removed syntax-heavy artifact generation from the model, which made the 3B model more stable.

## 15. What This Means as Cross-Domain Problem Reframing

This experience was interesting because the problem became visible in the language of another field. At first, it looked like an XSS regression-test failure. But when I inspected the generated artifact, the XSS judgment was correct and the test-code syntax was broken. Therefore, to understand the problem, it was not enough to read security vulnerability analysis papers. I also had to look at LLM-based unit test generation, test repair, fuzz harness generation, and coverage-guided fuzzing.

This is what I mean by cross-domain problem reframing. If the problem is kept only inside the security domain, it is easy to conclude that "we need a bigger model." But in the language of test generation, the problem becomes: "How should we repair and template the compile errors of LLM-generated test artifacts?" Then the solution changes from increasing model size to separating test intent from executable artifact.

This does not mean the intent/renderer separation itself is a completely new pattern. Structured output, constrained decoding, function calling, and template-based code generation are already common patterns in LLM engineering. What mattered in this case was not the destination, but the path. A phenomenon that first looked like an XSS judgment failure was reclassified as an executability problem in LLM-generated unit-test artifacts, and that led me to the language of test-repair literature.

The core of this case can be summarized as follows.

> Sometimes it is more effective to remove the parts where the model does not need to make mistakes than to make the model smarter.

This principle matters in security automation as well. Let SAST do what SAST is good at. Let compilers do what compilers are good at. Let fuzzers do what fuzzers are good at. LLMs become stronger when they focus on judgment, intent generation, evidence interpretation, and importing problem-solving frames from other domains.

## 16. Conclusion

To build a security development specification that works with small local models, simply shortening the prompt is not enough. The single source of truth for rules, judgment overlay, development overlay, and test-generation overlay must be separated. And to connect judgment results to real validation, the flow must extend to regression-test generation and fuzzing-seed generation.

However, if an LLM is asked to write the entire test code directly, the security intent may be correct while the generated artifact does not compile. This is not a security judgment failure. It is an LLM-generated test artifact reliability problem. Related research shows that compilation errors, runtime errors, repair loops, and template-based repair are central issues in LLM test generation.

Therefore, the current conclusion is not "3B is generally enough for XSS test generation." The more accurate conclusion is: "Within the currently defined 13 test-generation fixtures and scenario contracts, a 3B model that generates only intent was more stable and cost-effective than a 14B model that generated raw code."

In summary, the LLM handles test intent, the renderer handles JUnit/Jest code, the compiler and test runner handle code validity and differential execution, the fuzzer handles additional input exploration, and the LLM interprets the result again to design the next round. The point of this structure is not to reduce LLM usage. It is to place the LLM in the right position. In security automation, this is where cross-domain problem reframing stops being an abstract slogan and becomes a practical design principle.

## References

[1] Code Intelligence, "Jazzer: Coverage-guided, in-process fuzzing for the JVM." GitHub. https://github.com/CodeIntelligenceTesting/jazzer

[2] Anonymous ACL submission, "MultiFileTest: A Multi-File-Level LLM Unit Test Generation Benchmark and Impact of Error Fixing Mechanisms." PDF draft, 2026. (Anonymous submission draft; details should be verified against the final version.)

[3] Michael Konstantinou et al., "YATE: The Role of Test Repair in LLM-Based Unit Test Generation." arXiv, 2025. https://arxiv.org/abs/2507.18316

[4] Siqi Gu et al., "TestART: Improving LLM-based Unit Testing via Co-evolution of Automated Generation and Repair Iteration." arXiv, 2024. https://arxiv.org/abs/2408.03095

[5] Scott Thornton, "SecureCode v2.0: A Production-Grade Dataset for Training Security-Aware Code Generation Models." arXiv, 2025. https://arxiv.org/abs/2512.18542

[6] Nils Loose et al., "Coverage-Guided Multi-Agent Harness Generation for Java Library Fuzzing." arXiv, 2026. https://arxiv.org/abs/2603.08616

[7] Fabian Fleischer et al., "Contextualizing Sink Knowledge for Java Vulnerability Discovery." arXiv, 2026. https://arxiv.org/abs/2604.01645
