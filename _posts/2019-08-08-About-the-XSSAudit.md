---
title: "About the XSSAudit"
date: 2019-08-08 04:00:00 +0900
categories: XSS XSSAudit javascript
---

## 브라우저에서 xssaudit 기능이 제거되는 이유는 무엇인가?
Google Chrome에 한해서 , 

해당 기능이 제거되어야 한다는 주요 이유는 쉽게(?) 우회 가능하기 때문인 것으로 보인다.
구글은 이제 xssaudit filter를 아웃(retire)하자고 제안한 분이 evn@google.com 인데, 그 분이 작성한 논문(첨부)이 그 근거인 듯.

다른 방법들도 있지만 대표적으로 신규 javascript framework의 garget을 이용한 우회 방법은 방어하기 어려우므로, 기존 완화하는 방법(xssaudit filter)에서  격리/예방하는 방법(csp)으로 변화하자는 것이 주요 내용이다.

Javascript framework은 취약하지만, 실제 공격까지 가도록 Garget을 연결하는 부분이 시간과 노력이 참 많이 걸리고 어렵다는 것.

글에서 나온 bypass 예제를 보면 bypass 방법이 예전에 waf bypass 로직(<https://www.owasp.org/index.php/Testing_for_HTTP_Parameter_pollution_(OTG-INPVAL-004)>)과 비슷한데, <script 부분을 waf(sucuri cloudproxy WAF)에서 제거해버리니 xssaudit은 탐지(string match…) 못하고 우회되는 것…
<http://brutelogic.com.br/bypass/bypass-auditor.php?q=%3Csvg+o%3Cscriptnload=alert(1)%3E>
![enter image description here](/images/wafw00f_Securi_WAF.png)



## XSSAudit은 유용하지 않았던가?
Google과 같은 업체 입장에서는 XSSAudit 기능에 유지 비용이 소모되고, 이 기능으로 인해 경쟁 업체(MS 등) 브라우저보다 성능이 느려진다면, 이런 기능은 제거하고 싶은 것이 당연할 겁니다. (실제로 MS EDGE에서 해당 기능을 제거하였습니다.)
표준[# Content Security Policy Level 2 RFP](https://www.w3.org/TR/CSP2/#intro)의 내용에서도 CSP는 방어를 강화하는 한가지 방식으로 기술하고 있습니다. 
> Content Security Policy (CSP) is not intended as a first line of defense against content injection vulnerabilities. Instead, CSP is best used as defense-in-depth, to reduce the harm caused by content injection attacks. As a first line of defense against content injection, server operators should validate their input and encode their output.

## xssaudit 기능을 우회하는 방법은 다양하다.

여튼 글에서 나온 bypass 내용은 링크 추가하다가 귀찮다, 누가 좀 해줘…
1. innerHTML=XSS injection =  <https://gomakethings.com/preventing-cross-site-scripting-attacks-when-using-innerhtml-in-vanilla-javascript/>
2. <?php echo $_GET['xss']; ?> = <https://brutelogic.com.br/blog/the-easiest-way-to-bypass-xss-mitigations/>
3. 등등등…
4. Chrome extension을 이용한 우회

## 기술의 변화로 xssaudit 원리(차단)를 개선하거나, CSP 격리 등 보완 방법이 필요하다.


### 참고 자료
Code-Reuse Attacks for the Web: Breaking XSS mitigations via Script Gadgets: [github](https://github.com/google/security-research-pocs), [ppt](/pdf/OWASP_BeNeLux-Day_2017_Bypassing_XSS_mitigations_via_script_gadgets_Sebastian_Lekies.pdf), [pdf](/pdf/p1709-lekiesA.pdf)
<!--stackedit_data:
eyJoaXN0b3J5IjpbNjU2OTI4ODE1LC0xNDM0MDAwMDc2LC05OD
k1NDQwODksOTc3ODk3MTksLTEzNjMxMTg0NTYsLTExNzIxMjgz
MTJdfQ==
-->