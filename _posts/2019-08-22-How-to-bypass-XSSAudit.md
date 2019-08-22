---
title: "How to bypass XSSAudit"
date: 2019-08-22 00:00:00 +0900
categories: XSS XSSAudit javascript
---

## xssaudit 기능을 우회하는 방법은 다양하다.

Javascript framework은 취약하지만, 실제 공격까지 가도록 Garget을 연결하는 부분이 시간과 노력이 참 많이 걸리고 어렵다는 것.

글에서 나온 bypass 예제를 보면 bypass 방법이 예전에 waf bypass 로직(<https://www.owasp.org/index.php/Testing_for_HTTP_Parameter_pollution_(OTG-INPVAL-004)>)과 비슷한데, <script 부분을 waf(sucuri cloudproxy WAF)에서 제거해버리니 xssaudit은 탐지(string match…) 못하고 우회되는 것…
<http://brutelogic.com.br/bypass/bypass-auditor.php?q=%3Csvg+o%3Cscriptnload=alert(1)%3E>
![enter image description here](/images/wafw00f_Securi_WAF.png)


여튼 글에서 나온 bypass 내용은 링크 추가하다가 귀찮다, 누가 좀 해줘…
1. innerHTML=XSS injection =  <https://gomakethings.com/preventing-cross-site-scripting-attacks-when-using-innerhtml-in-vanilla-javascript/>
2. <?php echo $_GET['xss']; ?> = <https://brutelogic.com.br/blog/the-easiest-way-to-bypass-xss-mitigations/>
3. 등등등…
4. Chrome extension을 이용한 우회

### 참고 자료
Code-Reuse Attacks for the Web: Breaking XSS mitigations via Script Gadgets: [github](https://github.com/google/security-research-pocs), [ppt](/pdf/OWASP_BeNeLux-Day_2017_Bypassing_XSS_mitigations_via_script_gadgets_Sebastian_Lekies.pdf), [pdf](/pdf/p1709-lekiesA.pdf)
<!--stackedit_data:
eyJoaXN0b3J5IjpbNDU2MTUzODgzLC0xNDcyNzg0MDc2XX0=
-->