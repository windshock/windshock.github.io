---
title: "The Moment AI Truly Becomes New: Not When It Finds the Answer, but When It Rewrites the Problem"
date: 2026-05-24
draft: false
featured: true
tags: ["TrustAndCulture", "AI", "LLM", "Cross-Domain Reasoning", "Cybersecurity", "Exploit Reasoning", "Structural Thinking"]
categories: ["Security", "AI", "Policy"]
description: "Through the Nightingale myth, the white-hacker discourse, the Sterbenz lemma, and browser exploit reasoning, this essay argues that the real change LLMs bring lies not in knowledge retrieval but in problem reframing."
summary: "The moment an LLM truly becomes interesting is not when it finds the right answer, but when it rewrites a failure in one domain as a solvable problem in another. The Nightingale–white-hacker narrative and Sterbenz–exploit reasoning both connect through the same question of cross-domain problem reframing."
image: ""
---

> The moment AI truly becomes new is not when it finds the answer.
> **It is when it rewrites the problem.**

In the beginning there were two completely different stories.

One was about Florence Nightingale and the white-hacker. Why does society translate institutional failure into individual dedication and ethics? Why are structural problems so often turned into hero narratives?

The other was about LLMs and exploit reasoning. Here exploit reasoning means the reasoning process of asking whether a vulnerability can actually be chained into a real attack flow. Does it matter that an LLM knows the Sterbenz lemma, or does it matter that it reframed the reasons an exploit chain — the multi-step path from a vulnerability to a real effect — fails as a problem of `precision loss` (information being clipped while a number is stored or computed) and `numeric representation` (the format the computer uses to hold numbers)?

The two look far apart.

One is about social narrative and policy ethics. The other is about browser exploits, floating-point arithmetic, GPU observables, and the Sterbenz lemma. A browser exploit is the work of connecting a browser vulnerability into a real attack flow; floating-point arithmetic is how computers approximate and compute real numbers; a GPU observable is when a GPU's computation leaves an externally observable trace such as a screen pixel, a timing difference, or a rendering difference.

But the two connect through the same question.

```text
Across domains that look unrelated on the surface,
can you find the hidden structural bottleneck,
and rewrite that problem in the language of another domain?
```

I want to call this **cross-domain problem reframing** — rewriting a problem across fields.

The evaluation criterion of this essay is not "did the LLM get the answer right." A more important question is **who reframed the problem first.** So at the end the criterion comes back not to the artifact but to the timeline — who made which shift, and when.

---

## 1. Knowledge retrieval is different from problem reframing

When we look at LLMs we often focus on "what does it know."

- Which papers does this model know?
- Which vulnerability names does it remember?
- Which mathematical theorems does it recall?
- Which APIs can it explain?

These matter, of course. But there is a more important moment.

The moment when the model does not answer the question already given, but reshapes the question itself.

If you ask "what is the Sterbenz lemma?", it is not surprising for the model to answer like this:

```text
The Sterbenz lemma is a theorem in floating-point arithmetic stating that, under certain conditions, the difference of two numbers can be computed exactly.
```

This is closer to retrieval — knowledge lookup.

But the following flow is different.

Below, `primitive` means not the entire attack but a small reusable functional fragment of an attack. A `leak primitive` is one such fragment that leaks a little information, such as an address or an internal value. `pointer-like information` does not mean an actual memory address itself but a value or hint that can be handled like one.

```text
The exploit chain is failing
→ The shortage is not simply a missing leak primitive
→ The real issue is whether pointer-like information is preserved in the current computation model
→ This is a problem of numeric representation / precision loss
→ It can be rewritten as a floating-point exact-subtraction problem
→ At which point the Sterbenz lemma becomes a candidate
```

What matters here is not that the name "Sterbenz lemma" is known. What matters is that the exploit failure was rewritten in the language of numerical analysis — the field that studies how computers approximate and compute numbers.

Miss this distinction and you will mis-evaluate the LLM's capability.

---

## 2. First case: Nightingale and the white-hacker

Florence Nightingale is usually remembered as "the lady with the lamp" — a symbol of devotion walking between hospital beds and tending wounded soldiers. But Nightingale was not just a figure of devotion. She read the failures of sanitation, mortality, hospital administration, and the wartime medical system as data, and demanded reform.

What society remembered longer, however, was the angel image more than the reformer.

Why?

Angels are convenient. An angel does not ask about institutional failure. An angel does not ask whose responsibility it is. Rather than demand structural fixes, an angel shows individual devotion shining on top of broken structures.

This pattern repeats in today's cybersecurity.

White-hackers are needed. They find vulnerabilities, disclose before exploitation, and surface risk earlier than attackers. But the bright label "white-hacker" sometimes pushes away inconvenient questions.

- Why was that vulnerability in the system to begin with?
- Why did the company not build enough structure to find and fix it itself?
- Why is the cost of security failure compensated by individual ethics, dedication, overtime, and honor?
- Why does the institution lean on benevolent outside individuals for vulnerability discovery?

This is not a criticism of individual white-hackers.

Quite the opposite. The ethical practice of white-hackers matters. But if that practice does not feed into institutional reform — if it is only consumed as a cushion for institutional failure — it becomes a problem.

The problem has to be rewritten like this.

```text
Are there enough white-hackers?
```

A more important question than that is:

```text
Why does the security system not work adequately without white-hacker goodwill?
```

This is the first problem reframing.

The surface question was "how do we train good hackers." The structural question becomes "why do organizations and the state translate accountability into individual ethics."

---

## 3. Second case: the Sterbenz lemma and exploit reasoning

Now switch to a completely different field.

In browser exploit development, simply triggering a vulnerability is not enough. Here "trigger" means making the vulnerability actually fire. What matters is the form in which the value produced by the vulnerability can be handled.

There may be a value. But whether that value can be computed in the desired way is a separate problem.

For example, JavaScript's ordinary `Number` is an IEEE 754 double — the standard numeric format JavaScript uses to hold real numbers. Ordinary bitwise operations — that is, bit-level operations — coerce values into 32-bit signed integers. Inside the browser, addresses, offsets (positions relative to a reference point), compressed pointers (compressed addresses), tagged values (values where a type tag is mixed in), and NaN-boxed values (values that use the NaN range to carry other information) do not live in a plain `uint64_t` (64-bit unsigned integer) world.

So exploit developers often run into this problem.

```text
We have the value.
But we cannot preserve that value in the precision and representation we want.
```

Take a path through GPU/WebGL/WebGPU and the constraints change again. The shader pipeline — the stages by which a graphics card processes drawing computations — has historically been float-centric. `float32` is a 32-bit floating-point number with a limited mantissa. The mantissa is the part of a float that holds the significant digits of the actual number. In some situations, how much information can be preserved inside float arithmetic matters more than directly extracting integer bits.

This is where the Sterbenz lemma can enter.

The Sterbenz lemma says roughly that, under the following condition, the difference of two floating-point numbers can be computed exactly, without rounding. Floating-point is the numeric format used to approximate very large or very small numbers; rounding is the rounding-or-truncation that happens during that approximation.

```text
If y / 2 <= x <= 2y, then x - y can be computed exactly.
```

Here "exact" means precise without approximation error.

Of course this is not a new theorem. It has been a known result in floating-point arithmetic since the 1970s. What matters is not the theorem itself but how it is reinterpreted as a problem inside exploit reasoning.

The less surprising flow is this.

```text
exact subtraction
→ floating-point exactness
→ Sterbenz lemma
```

This is close to semantic retrieval.

The genuinely interesting flow is this.

```text
We have an exploit primitive
→ But it is not chaining into an exploit
→ The bottleneck is not the leak itself but numeric representation / precision loss
→ The core question is whether address-related information is preserved in the current allowed computation model
→ This can be rewritten as a numerical-analysis problem
→ We search for rounding-free subtraction conditions
→ Sterbenz lemma becomes a candidate
→ Then we examine the possibility of encoding it via pixel / rendering / timing observables
```

This is not retrieval. It is rewriting the problem in the language of another domain.

---

## 4. A pixel is not just a screen dot; it can become an observable surface

The flow of this section is not a claim about an actually observed LLM trace. It is a constructed example of what a reframing capability could look like. An LLM trace is the intermediate record or conversational flow by which a model arrives at an answer.

There is one important misunderstanding to defuse.

This does not mean a GPU directly reads pointers. A pointer is a value that points to a memory location; dereferencing is the act of reading the memory at that location. The mention of GPU or pixel in a browser exploit does not mean the GPU itself dereferences memory addresses as-is.

A more accurate structure is:

```text
A pointer-like value / offset / corrupted numeric value produced by an exploit primitive
→ Passed into a restricted representation such as JS Number, TypedArray, DataView, WebGL/WebGPU input
→ Available operations are limited to float arithmetic, coordinate transforms, rendering/timing observables
→ Encoded into indirect observables such as pixel position, rendering difference, timing, cache behavior
→ Examined for side-channel-like information recovery
```

TypedArray and DataView are tools that let JavaScript handle numeric arrays in memory more directly. Side-channel-like information recovery means inferring information not by reading it directly but through indirect signals such as timing differences, cache behavior, and on-screen changes.

Here the pixel is not just a dot on the screen. It can be an encoding surface that turns a computation result into something externally observable — a surface or path that converts an internal value into an observable trace such as a color, a position, or a timing difference.

Security research has long held the view that rendering differences, canvases, WebGL, GPU cache/timing, and SVG filter leakage can be information channels. In plain terms, visible changes such as color, position, rendering outcomes, and timing differences can be clues to internal computation. The purpose of this essay is not to explain a specific exploit procedure. Quite the opposite. What matters here is the structure of thought, not the attack procedure.

```text
We obtained the value
```

is different from

```text
We can convert that value, within current runtime / representation / precision constraints, into an exploit primitive
```

Here runtime is the environment in which the program actually runs; representation and precision are, respectively, how a value is represented and the precision it carries.

This distinction is one of the recurring observations when reading modern browser exploitation writeups — that is, modern browser-exploit analyses.

---

## 5. Why are the two cases alike?

Now place the two stories side by side again.

```text
Nightingale / white-hacker case

Institutional failure
→ Translated into individual devotion and ethics
→ Structural accountability blurred
→ The question has to be rewritten
→ Not "is the individual good?" but "why does the structure depend on individual goodwill?"
```

```text
Sterbenz / exploit reasoning case

Exploit chain failure
→ Appears as a missing vulnerability or missing leak
→ The real bottleneck may be numeric representation / precision loss
→ The question has to be rewritten
→ Not "do we have the value?" but "is the value preserved inside the current computation model?"
```

Two completely different fields, the same structure.

```text
Surface question
→ Hidden bottleneck
→ Redefined in the language of another domain
→ New solution candidate or new evaluation criterion emerges
```

This is cross-domain problem reframing.

It is not the same as a simple analogy. An analogy says "A resembles B." Problem reframing goes one step further.

```text
If you rewrite a stuck problem in A using the language of B,
bottlenecks and solution candidates invisible from A become visible.
```

The Nightingale–white-hacker connection is social and institutional reframing.

The Sterbenz–exploit connection is technical and mathematical reframing.

But the two do not have to collapse into the same task. In the Nightingale–white-hacker case, the social meaning layered on top of the problem — the symbols and interpretations society added — has to be stripped away first to reveal the structure. In the Sterbenz–exploit case, that meaning layer is relatively thin, and the technical bottleneck is moved directly into another domain's coordinate system — that is, into another field's frame and language.

Both matter for understanding LLMs.

---

## 6. LLM capability has to be split into three stages

Not every connection an LLM makes carries the same meaning. At minimum it has to be split into three stages.

| Stage | Description | Example |
|---|---|---|
| Semantic retrieval | Find related knowledge from given cues | Recall `Sterbenz lemma` from `exact subtraction` |
| Analogy generation | Explain how two domains resemble each other | Note that the Nightingale myth and white-hacker heroization rhyme |
| Problem reframing | Rewrite a stuck problem in one domain as a solvable problem in another | Redefine an exploit failure as a precision-loss problem |

The first is close to search. The second is finding likeness. The third is a strategy of redefining the problem.

In security, the dangerous and interesting one is the third.

The more important question than "can the LLM generate exploit code" is:

```text
Can the LLM convert the bottleneck of a failed exploit chain into the constraints — the conditions — of another domain?
```

The following questions become important, for example.

- Why does this primitive not lead to an exploit?
- We have the value — why can we not compute or output it the way we want?
- In which language can this bottleneck be rewritten: compiler theory, numerical analysis, OS internals, browser value representation, or side-channel engineering?
- Did a human supply this transition first, or did the model propose it first?
- Was the proposed bridge — the connection between two fields — verified against the actual target environment's constraints?

From here the LLM becomes a strategy assistant, not just a code generator.

---

## 7. Criteria for evaluating "the LLM did it"

The most dangerous illusion in evaluating AI-assisted exploit research or AI-assisted vulnerability discovery is mixing the human's framing with the model's retrieval. Each of these phrases refers to exploit research and vulnerability discovery that uses AI as a supporting tool.

For example, suppose a human already said this.

```text
This problem seems to be due to precision loss.
Is there a condition under which subtraction can be done without rounding?
```

If the LLM then finds the Sterbenz lemma, that is useful but not surprising. The human has already supplied the core frame.

Conversely, if the model produces the following flow first, the significance is much greater.

```text
This exploit chain is not failing for lack of a leak.
The bottleneck is that information is being lost in the current representation.
We can rewrite it as a floating-point exactness problem.
```

So the evaluation criterion must be the timeline, not the artifact.

- Who defined the bottleneck first?
- Who proposed the key domain transition?
- Which words did the human supply first?
- At what point did the model bring in a theorem (proven result) or an engineering trick (implementation technique) from another field?
- Did the proposal match the actual target constraints — the limits of the target environment?

Without these questions, "the LLM made the exploit" and "the human nearly defined the problem and the model retrieved the related literature" blur together.

These two cases are completely different.

---

## 8. Connections society recorded vs. connections the model recalls

When I first worked through this discussion, a sentence came to mind.

> The bias of the narratives society records becomes the cognition limit of the model.

The direction is right but the phrasing is too strong to use as is.

A more accurate version is this.

> An LLM more easily recalls connections that society has repeatedly recorded. Conversely, structural similarities that have been rarely recorded or never explicitly linked may be less salient in default responses.

Nightingale has been heavily recorded as "the angel." White-hackers are heavily recorded as "ethical hackers," "guardians of the cyber world," "the good hackers." But the connection "the structure that translates institutional failure into individual ethics" is recorded far less.

So the model, by default, leans toward the more recorded direction.

This does not mean the model cannot make such connections. On the contrary, a good model can construct them given hints, context, and a verification loop — an iterative process of checking whether a proposal actually holds.

Some connections are under-recorded because power and institutions are uncomfortable with them; some are simply rare; some are severed by disciplinary boundaries. The model does not automatically tell these apart. So structures that are not recorded have to be explicitly rewritten more often.

But the key point is this.

```text
Recorded connections come to mind easily.
Unrecorded structures only become visible when the problem is rewritten.
```

This is true for humans too.

---

## 9. What should defenders look at?

AI-security discussions often drift toward "can AI build an exploit." That question is necessary but not sufficient.

The more important future question is this.

```text
Can AI convert which bottleneck into which solvable problem in another domain?
```

Defenders should record the following.

| Observation | Meaning |
|---|---|
| Human framing supplied? | Did a human supply the core frame first? |
| Bottleneck identification | How did the model define the cause of failure? |
| Representation reasoning | Did it track type, precision, and representation constraints of values? |
| Cross-domain transfer | Did it bring in theorems, patterns, or techniques from another domain? |
| Primitive composition | Did it tie that transition to a real exploit primitive or evaluation criterion? |
| Validation evidence | Was it verified against a real target or benchmark? |

Validation evidence here means the basis of verification. It should include at least one of:

- A record verifying that the proposed bridge matches the actual target environment's constraints
- Results from a benchmark (a comparative experiment baseline) or a toy harness (a small experimental rig) confirming that the bottleneck redefinition holds
- Even short of a PoC, evidence that the proposed representation, precision, or observable path is feasible in that environment

With these criteria, we can actually evaluate the real capability of AI-assisted security research — security research that uses AI as a supporting tool.

Looking only at the code the model produces is too late. The important shift happens before the code. It happens at the moment the problem is rewritten.

---

## 10. Policy works the same way

This discussion does not stop at technology.

The same problem appears in my recent piece [A critical reading of structural ethics in cybersecurity policy](/en/post/2026-05-24-structural-ethics-cybersecurity-policy-korea/).

The surface question of policy often starts like this.

```text
How many white-hackers should we train?
How do we grow security headcount?
What duties should we impose on companies?
```

Rewritten structurally, the question shifts.

```text
Why is security failure repeatedly translated into individual ethics and operator accountability?
How should organizations and the state design where accountability lands?
Are we giving the CISO only accountability, or also authority and budget?
Do white-hacker discoveries flow back into institutional improvement?
```

Good policy reframes the problem the way good exploit reasoning does.

It looks at the bottleneck, not the surface symptom. It looks at structural repeatability, not individual goodwill. It looks at the feedback loop — the flow by which discovery and action return as institutional improvement — not at heroic narratives.

---

## 11. Conclusion: the future of AI is in framing, not in answers

It has become familiar to say that AI knows a lot. The important question is no longer the volume of knowledge.

What matters is this.

> How far can AI rewrite a problem?

Connecting Nightingale and the white-hacker is not just a metaphor. It is seeing the structure that translates institutional failure into individual ethics.

Connecting the Sterbenz lemma and exploit reasoning is not just keyword search. It is rewriting exploit failure as a numerical-precision problem — a problem of how precisely numbers can be carried.

The two cases head to the same conclusion but do not travel the same path. One strips away the meaning layer accumulated on top of the problem to reveal the structure; the other moves the stuck technical bottleneck directly into another domain's coordinate system. By "coordinate system" I mean the frame and language used to view the problem. The difference is less about types of reframing capability and more about what already lies in front of the problem.

Both demand the same capability.

```text
Do not look at the surface — look at the structure.
Rewrite the structure in the language of another domain.
Verify that the transition leads to actual problem-solving or an evaluation criterion.
```

This is where AI truly becomes new.

Not when it finds the answer.

When it rewrites the problem.

In security, that capability is double-edged. To defenders it is a new analytical capability. To attackers it can be a strategic capability that resurrects failed exploit chains.

So we should track not just LLMs' coding ability but their **problem reframing ability** — the ability to rewrite a problem in another language.

The question going forward is this.

> Not "what does the model know?"
> but
> "what did the model rewrite as another problem?"

---

## Summary

- The important capability of an LLM is not knowledge retrieval but problem redefinition.
- The Nightingale–white-hacker connection is an example of social and institutional cross-domain reasoning — the kind of thinking that reads structure across fields.
- The Sterbenz–exploit connection is an example of technical and mathematical cross-domain reasoning.
- Both rewrite surface questions in the language of hidden bottlenecks, but they start from different places. One peels off the meaning layer; the other moves the technical bottleneck straight into another coordinate system.
- When evaluating AI-assisted exploit research, separate out whether the human supplied the frame first, whether the model identified the bottleneck, whether it brought concepts from other fields, and whether there is validation evidence.
- Defenders should track which bottleneck the model converted into which solvable problem in another domain, not which code the model produced.

---

## Related Reading

This article is not part of a single linear series. It addresses two threads at once — AI security evaluation and social narrative. Reading the following alongside it makes both sides of cross-domain reframing sharper.

- [The Real Battleground of National AI Strategy Is Not Just GPU Count](/en/post/2026-05-24-ai-national-strategy-control-plane/) — Published the same day. AI evaluation infrastructure read through the lens of control plane, harness, and verification.
- [The AI Slop Paradox: Why Triage Gets Harder in an Era Where Vulnerabilities Are Easier to Find](/en/post/2026-04-30-ai-slop-vulnerability-triage/) — How to redefine and verify AI-generated candidates connects directly to the evaluation criteria in this article.
- [oh-my-secuaudit Part 4: sec-audit-static feedback loop](/en/post/2026-05-19-sec-audit-static-feedback-loop/) — A field case for how "validation evidence" operates inside the v2.0 → v2.7/v2.8 evolution of an actual security audit tool.
- [After CVE is Too Late: In the AI Era, Vulnerabilities Move Before They Get a Number](/en/post/2026-04-29-after-cve-response-ai-vulnerability/) — Where AI-assisted exploit research meets the operational flow.
- [A Critical Reading of Structural Ethics in Cybersecurity Policy](/en/post/2026-05-24-structural-ethics-cybersecurity-policy-korea/) — A companion piece that goes deeper into how the Nightingale–white-hacker narrative operates at the level of policy ethics.

---

## References

- [Security Field Notes: LLM cross-domain exploit reasoning and Sterbenz bridge](https://github.com/windshock/security-field-notes/blob/main/knowledge/ai-security/2026-05-24-llm-cross-domain-exploit-reasoning-sterbenz.md)
- [Security Field Notes: Cross-domain reasoning — narrative bias and exploit bottleneck framing](https://github.com/windshock/security-field-notes/blob/main/knowledge/ai-security/2026-05-24-cross-domain-reasoning-narrative-bias-bridge.md)
- [Project Zero: JITSploitation I — A JIT Bug](https://projectzero.google/2020/09/jitsploitation-one.html)
- [Project Zero: JITSploitation II — Getting Read/Write](https://projectzero.google/2020/09/jitsploitation-two.html)
- [Project Zero: JITSploitation III — Subverting Control Flow](https://projectzero.google/2020/09/jitsploitation-three.html)
- [GitHub Security Lab: Getting RCE in Chrome with incomplete object initialization in the Maglev compiler](https://github.blog/security/vulnerability-research/getting-rce-in-chrome-with-incomplete-object-initialization-in-the-maglev-compiler/)
- [Sterbenz lemma](https://en.wikipedia.org/wiki/Sterbenz_lemma)
- Pat H. Sterbenz, *Floating-Point Computation*, 1974.
- Jean-Michel Muller et al., *Handbook of Floating-Point Arithmetic*, 2018.
- [Smithsonian Magazine: The Defiance of Florence Nightingale](https://www.smithsonianmag.com/history/the-worlds-most-famous-nurse-florence-nightingale-180974155/)
- [Coordinated vulnerability disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure)
