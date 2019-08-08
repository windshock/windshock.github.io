---
title: "About the XSSAudit"
date: 2019-08-08 04:00:00 +0900
categories: XSS XSSAudit javascript
---
구글은 이제 xssaudit filter를 아웃(retire)하자고 제안한 분이 evn@google.com 인데,

그 분이 작성한 논문(첨부)이 그 근거인 듯.

 

주요 내용은 신규 javascript framework이 나오면서 신규 garget으로 우회되는 것들을 계속 막기는 어려우니,

기존 방어 전략인 mitigation(xssaudit filter)에서 Isolation/prevention(csp) 전략으로 가야 한다는 내용.

 

너도 하면서 느끼겠지만 Javascript framework은 취약하지만, 

실제 공격까지 가도록 Garget을 연결하는 부분이 시간과 노력이 참 많이 걸리고 어렵다는 것.

 

글에서 나온 bypass 예제를 보면 bypass 방법이 예전에 waf bypass 로직

(https://www.owasp.org/index.php/Testing_for_HTTP_Parameter_pollution_(OTG-INPVAL-004)과 비슷한데,



<script 부분을 waf(sucuri cloudproxy WAF)에서 제거해버리니 xssaudit은 탐지(string match…) 못하고 우회되는 것…

http://brutelogic.com.br/bypass/bypass-auditor.php?q=%3Csvg+o%3Cscriptnload=alert(1)%3E

image.png

 

여튼 글에서 나온 bypass 내용은 링크 추가하다가 귀찮다, 누가 좀 해줘…

1.     innerHTML=XSS injection =  https://gomakethings.com/preventing-cross-site-scripting-attacks-when-using-innerhtml-in-vanilla-javascript/

2.     <?php echo $_GET['xss']; ?> = https://brutelogic.com.br/blog/the-easiest-way-to-bypass-xss-mitigations/

3.     등등등…

 

자료도 참고.

https://github.com/google/security-research-pocs  
