---
title: "About the XSSAudit"
date: 2019-08-08 04:00:00 +0900
categories: XSS XSSAudit javascript
---

## Chrome에서 XSSAudit 기능이 제거되어야 하는 이유?

Google 보안팀에서는 Chrome 개발팀에게 [XSSAudit 기능을 제거하자는 제안](https://bugs.chromium.org/p/chromium/issues/detail?id=898081)을 했지만, Google 보안팀이 제시한 근거는 우회 가능하다는 내용( evn@google.com의 논문)이라 

논문의 주요 내용은 신규 javascript framework의 garget을 이용한 우회 방법은 방어하기 어려우므로, 기존 완화하는 방법(xssaudit filter)에서  격리/예방하는 방법(Content Security Policy, 이하 CSP)으로 변화하자는 것이 주요 내용이다.

[Chrome의 XSSAudit 우회 방법](https://windshock.github.io/xss/xssaudit/javascript/How-to-bypass-XSSAudit/)은 별도로 정리했다.

## XSSAudit은 유용하지 않았던가?
Google과 같은 업체 입장에서는 XSSAudit 기능에 의해 유지 비용이 소모되고 경쟁 업체(MS 등) 브라우저보다 성능이 느려진다면, 이 기능은 제거하고 싶은 것이 당연할 겁니다. (실제로 MS EDGE에서 해당 기능을 제거하였습니다.)

모의해커 등 공격자 입장에서는 매우 비정상적인 상황에서만 XSSAudit 우회가 가능하므로 해당 기능을 매우 귀찮고 성가신 존재입니다. 

보안 담당자 등 방어자 입장에서는 [적용하기 어려운 CSP](https://infosec.mozilla.org/guidelines/web_security#web-security-cheat-sheet)를 도입해야 하므로 업무적으로 피곤하게 됩니다. 또한 CSP도 완벽한 방어 방법은 아닙니다.

[# Content Security Policy Level 2 RFP](https://www.w3.org/TR/CSP2/#intro)의 내용에서도 CSP는 방어를 강화하는 한가지 방식으로 기술하고 있습니다. 
> Content Security Policy (CSP) is not intended as a first line of defense against content injection vulnerabilities. Instead, CSP is best used as defense-in-depth, to reduce the harm caused by content injection attacks. As a first line of defense against content injection, server operators should validate their input and encode their output.

구글 등 브라우저 개발사 외에는 모두 유용했던 기능인데 제거하려는 이유가 우회된다는 것 뿐이라면, 업체 중심적인 의사 결정으로 보입니다. Google은 Don't be evil, Do the right thing 아니었나요?




## 기술의 변화로 xssaudit 원리(차단)를 개선하거나, CSP 격리 등 보완 방법이 필요하다.




<!--stackedit_data:
eyJoaXN0b3J5IjpbMTQ2ODY2MjgxMywxMzAyMzgwMjU3LDEzMD
c4NzI1NjcsMzY3NjYzNzMzLDIwNDIyMjU4MzYsLTE0MzQwMDAw
NzYsLTk4OTU0NDA4OSw5Nzc4OTcxOSwtMTM2MzExODQ1NiwtMT
E3MjEyODMxMl19
-->