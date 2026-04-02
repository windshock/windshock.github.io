---
title: "Structure Builders Will Outlast Vulnerability Finders"
date: 2026-04-02
draft: false
featured: true
tags: ["Mind", "Vulnerability Research", "AI", "Security Automation", "Process Design"]
categories: ["Security Research", "AI"]
description: "18 years of vulnerability hunting distilled into one insight: the shift from individual instinct to scalable structure — and what AI means for those left standing."
image: "/images/pdf-previews/Security_From_Sense_to_Structure_p1.png"
---

{{< youtube TtqdvvWxevM >}}

{{< pdfembed file="/files/Security_From_Sense_to_Structure.pdf" lang="en" id="pdfjs-sense-to-structure-en" >}}

---

This is a personal record drawn from 18 years of throwing myself at vulnerability finding — head-first, body-first.
Your experience may differ.

Some parts may be uncomfortable.
But I'm not here to say who's right or wrong.
Just read it as: "huh, so some people think this way."

In earlier posts I wrote about why Korean security keeps feeling structurally stuck, and why a security assessment dies the moment it becomes a report.

This time I want to pick up where that left off.

**What kind of person finds vulnerabilities well?**  
**Why did that instinct eventually turn into structure?**  
**And what is AI becoming inside that structure?**

---

## 1. In the beginning, it was all instinct

There was nothing at the start.

No checklist, no process, no term called "dynamic analysis."
Dynamic analysis — feeding real inputs into a live system and watching how it reacts — is industry vocabulary now, but back then you just said "finding vulnerabilities."

More accurately, it was closer to **endlessly trying weird things**.

I rarely looked at source code.
Instead I fed inputs, watched responses, and ran a constant mental simulation of what was happening inside.
What language was this system built in? Where would a string get truncated? Where might a filter get skipped?
I kept imagining that while I tested.

There's one vulnerability I still remember.

In the Tomcat file upload library, inserting a null byte into a filename bypassed the extension check.
That might sound trivial by today's standards.
But at the time, "library vulnerability" wasn't a concept people reached for naturally.

I just knew that in C, strings end at a null byte, and I tried putting that into a web upload input.
Nobody taught me. It wasn't in any guideline.
It was simply what happened when knowledge and instinct connected.

Most early vulnerability detection worked that way.

---

## 2. Instinct became guidelines. Guidelines became copy-paste.

Over time, the instinct got organized.

Checklists emerged. Diagnostic guides appeared. Common payload patterns got documented.
That part is natural evolution.

The problem came next.

Guidelines were originally meant to *transmit* instinct. Somewhere along the way, they started *replacing* it.

It went like this:
See an input field → paste the preset payload → no reaction → mark it "no vulnerability" → move on.

And throughout that process, nobody asked:
Why could this input be dangerous? What is this system actually doing internally? Does "no response" really mean it's safe?

Those questions disappeared.

That's when work that would be embarrassing to call "hacking" started getting labeled "dynamic analysis."
The term itself isn't wrong.
In practice, though, it too often meant **mindless repetition dressed up in a respectable name**.

---

## 3. Without structure, quality depends on people

The assessment organizations of that era had no structure.
Everyone just did their thing.

The talented ones were genuinely impressive. The others were shockingly sloppy.
Someone would come in hungover and phone it in. Someone would write just enough report to pass. Someone leaving the company would fill in forms and nothing else.

I'm not blaming individuals.
Without structure, quality ultimately depends on people.
And any system like that will eventually collapse.

To fix the problem, we hired more people.
At first that looked like progress. Assessment throughput seemed to go up.

But a new problem emerged quickly: review.

Ten people come in, ten sets of results come out. Someone has to look at all of them.
Standards vary person to person. Review loops repeat. Revisions never end.
At some point, reviewing becomes harder than the actual assessment.

That's when the organization realizes:
the problem isn't the people. **It's the structure.**

---

## 4. When budget shrank, structure had to change

The turning point was money.

Security assessment budget turns out to be surprisingly easy to cut.
When it got cut, the old way became unsustainable.
We couldn't keep adding people. The review bottleneck was still there.

So we changed direction.

First, we cut items.

Some items got dropped because "even if we find it, nobody will fix it."
Others because "reviewing this properly requires too many people."
The reasons sounded principled. Honestly, the budget just wasn't there.

We did what was left.

And we shifted the question from "who does it" to "how it's done."
Not surviving on individual skill, but **maintaining quality through process**.

It wasn't a clean decision. It started with cutting losses.

---

## 5. The assembly line came to security assessment

The next move was division of labor.

We split the work by domain: file upload, authentication, authorization, command execution, data exposure.
Instead of one person covering everything, each person went deep on one area.
When a target came in, it moved down the line — passing through each domain in sequence, like a conveyor belt.

It worked.
You didn't need everyone to be uniformly excellent. You just needed each person to be good at their one domain.
Review criteria got simpler. The organization became less dependent on individual brilliance.

But this approach makes people uncomfortable.

Security researchers tend to have strong professional pride.
They want to read an entire system with their own mind.
To someone like that, this structure feels like being a cog in a machine.

Some people left because of it.
Their feeling wasn't wrong. I would have hated it too.

Even so, the structure stayed, and the organization became more stable.

That's when I first understood why Ford was remarkable.
Ford didn't build the assembly line to replace people.
**Ford built structure to turn human variance into something an industry could absorb.**
The same logic applied perfectly to security assessment.

---

## 6. The finder vs. the builder

Here a meaningful split emerges.

The person who finds vulnerabilities well has a simulator running in their head.
They look at a filename and imagine how the server processes it internally.
From a single response code, they infer the character of the logic behind it.
The Tomcat example above worked exactly like that — nobody taught it, but it was possible because I could picture the system's behavior in my mind.

The person who builds structure sees something different.
They design who's good at what, where bottlenecks form, how consistency gets maintained.
This person doesn't need to be the best hacker.
But they need to hold people, flow, and criteria in their head simultaneously.

These are completely different abilities.
And organizations confuse them constantly.

The brilliant hacker who becomes team lead seems like it should work — in practice, it usually doesn't.
Conversely, someone with ordinary technical instinct but strong structural thinking can run a team with remarkable stability.

---

## 7. AI works best inside structure

AI has no emotions. And it performs better the more its role is constrained.

This maps almost perfectly onto the assembly-line approach.

So I ran an experiment.

Using the Codex Agent SDK, I turned each assessment role into an agent and routed tasks through by domain.
File upload, auth/authz, template injection, exception-flow analysis — I split it by domain and gave each agent only the knowledge and procedures relevant to its area.

The results were better than expected.
Vulnerabilities came out in large numbers.

The problem was the opposite of what I feared.

There were false positives. Context sometimes got cut. The same issue would show up under different names as duplicate reports.
Results needed post-processing. Context had to be re-attached.

Even so — compared to the endless back-and-forth of aligning human assessors on standards and report wording — these were much simpler problems.
AI has no ego. It doesn't push back when you change the criteria. Running it at 3 a.m., it has no off days.

When working with people, the real difficulty was never the vulnerabilities.
It was the people.
That problem disappeared.

---

## 8. The problem is no longer "not finding enough"

The situation has completely shifted.

"How do we find more?" is already largely answered.
Run AI-assisted assessment and results keep accumulating —
faster than developers can process.

But those results can't be used as-is.

Some are accurate. Some overstate risk. Some report the same phenomenon twice under different names.
Detection itself has crossed a threshold.
The remaining problem is **interpretation and alignment**.

Which findings are genuinely dangerous? In what order should they be addressed? How do you translate them into something a developer can actually act on?
That's the real bottleneck now.

And so the question changes.

Not "how do we find more" — but **"how do we make the organization understand and act on what's been found?"**

---

## 9. Who will matter going forward

The people who can answer that question are the ones who will matter.

Vulnerability finders are still needed.
But that alone is no longer enough.

The increasingly rare skill is the ability to interpret detection output:
design domain-specific assessment criteria, build a knowledge base that reduces false positives and duplicates, and translate results into a form that developers and operators can actually work with.

In one phrase: **the person who turns instinct into structure**.

The sharper the instinct, the better.
But instinct alone won't be enough.

---

## 10. Conclusion

I keep coming back to this.

Not "how do we make AI find more" —

**"how do we make the organization understand and process what AI has already found?"**

That's the problem that matters now.

---

## Related Posts

This post continues from:

- [Why Security Assessment Reports Die the Moment They're Published](https://brunch.co.kr/@windshock/8)
- [Security Testing as Code — Structuring Assessment as Code](/en/post/2026-03-17-security-testing-as-code/)
- [Korean Security's Escape Velocity — Why It Keeps Running in Place](/en/post/2026-03-26-korean-security-escape-velocity/)
