---
title: "How to bypass XSSAudit"
date: 2019-08-22 00:00:00 +0900
categories: XSS XSSAudit javascript
---

## xssaudit 기능을 우회하는 방법은 다양하다.

여튼 글에서 나온 bypass 내용은 링크 추가하다가 귀찮다, 누가 좀 해줘…
1. innerHTML=XSS injection =  <https://gomakethings.com/preventing-cross-site-scripting-attacks-when-using-innerhtml-in-vanilla-javascript/>
2. <?php echo $_GET['xss']; ?> = <https://brutelogic.com.br/blog/the-easiest-way-to-bypass-xss-mitigations/>
3. 등등등…
4. Chrome extension을 이용한 우회

### 참고 자료
Code-Reuse Attacks for the Web: Breaking XSS mitigations via Script Gadgets: [github](https://github.com/google/security-research-pocs), [ppt](/pdf/OWASP_BeNeLux-Day_2017_Bypassing_XSS_mitigations_via_script_gadgets_Sebastian_Lekies.pdf), [pdf](/pdf/p1709-lekiesA.pdf)
<!--stackedit_data:
eyJoaXN0b3J5IjpbMTE3NTIzNDA0MiwtMTQ3Mjc4NDA3Nl19
-->