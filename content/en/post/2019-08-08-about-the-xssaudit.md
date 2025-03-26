---
title: About the XSSAudit
date: '2019-08-08'
categories: &id001
- XSS
- XSSAudit
- javascript
tags: *id001
---

## Why Was the XSSAudit Feature Removed in Chrome?

The Google Security Team proposed to the Chrome development team to remove the [XSSAudit feature](https://bugs.chromium.org/p/chromium/issues/detail?id=898081). Although the only rationale provided was that the feature could be bypassed (as argued in a paper by evn@google.com), it initially seemed unlikely that removal would proceed. However, it was ultimately decided that the feature would be completely eliminated in Chrome.

The main point of the [paper](/pdf/p1709-lekiesA.pdf) is that bypass methods using targets within new JavaScript frameworks are difficult to defend against. Therefore, it proposes a shift from the existing mitigation approach (the xssaudit filter) to an isolation/prevention method, namely Content Security Policy (CSP).

## Wasn't XSSAudit Useful?

From the perspective of companies like Google, if the XSSAudit feature incurs maintenance costs and results in poorer performance compared to competitors’ browsers (e.g., Microsoft’s), it is only natural to want to remove it. (In fact, this feature was already removed in MS EDGE.)

For ethical hackers and attackers, bypassing XSSAudit is only possible under very unusual circumstances, making the feature a particularly annoying and troublesome obstacle.

For security professionals and defenders, implementing the [challenging CSP](https://infosec.mozilla.org/guidelines/web_security#web-security-cheat-sheet) adds significant workload. Moreover, CSP is not a perfect defense mechanism.
![Attacks that CSP can or cannot protect against](/images/Current-state-of-CSP.png)

The [Content Security Policy Level 2 RFP](https://www.w3.org/TR/CSP2/#intro) also describes CSP as one way to enhance defenses:
> Content Security Policy (CSP) is not intended as a first line of defense against content injection vulnerabilities. Instead, CSP is best used as defense-in-depth, to reduce the harm caused by content injection attacks. As a first line of defense against content injection, server operators should validate their input and encode their output.

Apart from browser developers like Google, the XSSAudit feature was useful to nearly everyone. If the only reason for its removal is that it can be bypassed, it seems like a decision driven by corporate interests. Wasn't Google supposed to follow the motto “Don't be evil, do the right thing”?

## Regardless, We Now Must Study CSP Implementation Intensively :(
[How do I Content Security Policy](https://www.owasp.org/images/6/6d/2019-02-22_-_How_do_I_Content_Security_Policy_-_Print.pdf)  
[So we broke all CSPs …](https://www.owasp.org/images/c/c4/2017-04-20-OWASPNZ-SpagnuoloWeichselbaum.pdf)

