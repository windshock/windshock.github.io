---

title: "유지보수 중단 오픈소스를 Gmail과 Snyk 알림으로 관리한 방법"
date: 2025-05-12
draft: false
description: "Snyk 웹 UI에만 노출되는 취약점 정보를 Gmail과 Apps Script로 자동 수집하여 Google Sheets에 정리하는 구현 사례입니다."
tags: ["Code", "security", "automation", "snyk", "gmail", "apps script"]
featured: true
image: "/images/post/apps-script-ui.webp"
categories: ["Security", "Tools"]
summary: "Snyk의 웹 UI에만 노출되는 정보를 자동으로 수집해야 했습니다. Gmail과 Apps Script를 활용한 취약점 알림 자동 수집기 구현 사례를 소개합니다."
---

![Apps Script automation](/images/post/apps-script-ui.webp)

## 동기

처음에는 **Snyk**의 공식 [API](https://docs.snyk.io)만으로도 충분히 자동화가 가능할 거라 생각했습니다. 하지만 실제로는 "How to Fix", "Overview", 그리고 안전한 버전 정보 등 많은 유용한 데이터가 웹 UI에만 노출되어 있었고, API로는 모두 수집할 수 없었습니다.

그래서 저는 Gmail과 Google Apps Script를 활용해 직접 자동 수집기를 만들었습니다. 이 스크립트는 "no remediation available yet"라는 문구가 포함된 이메일을 읽고, 취약점 페이지에 접근하여 관련 정보를 추출합니다.

---

## 주요 기능

1. Gmail에서 "no remediation available yet" 문구가 포함된 Snyk 알림 이메일 검색
2. 취약점 상세 페이지로 리디렉션된 링크 추적
3. 아래 정보 자동 파싱:

   * 취약점 이름 및 링크
   * 영향 받는 패키지 및 버전
   * 해결 방법 (FAQ JSON-LD 기반)
   * Overview 텍스트 및 참고 링크
   * 최신 버전 정보 (latest, non-vulnerable, 배포일)
4. 모든 정보를 Google Sheets에 저장

---

## 스크린샷 예시

### Gmail 필터링 결과

![Gmail filtered search](/images/post/gmail-search.webp)

### Apps Script 로그 확인

![Apps Script code and logs](/images/post/apps-script-logs.webp)

### 출력된 구글 시트

![Output sheet](/images/post/sheet-output.webp)

---

## 전체 코드

```javascript
{{< highlight js "linenos=table" >}}
function extractSnykNoFixToSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.clearContents();
  sheet.appendRow([
    "Date", "Subject", "Project", "Vulnerability", "Vuln Link",
    "Package", "Version", "Snyk Package Link",
    "How to Fix", "Overview Text", "Overview Links", "References",
    "Latest Ver", "Non-Vuln Ver", "First Published", "Latest Published"
  ]);

  const threads = GmailApp.search('"no remediation available yet"');

  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      const date = msg.getDate();
      const subject = msg.getSubject();
      const body = msg.getBody();

      const iconBlockMatch = body.match(/<img[^>]+icon-cli\.webp[^>]*>[\s\S]*?<strong[^>]*>(.*?)<\/strong>/i);
      const project = iconBlockMatch ? iconBlockMatch[1].trim() : "";

      const vulnMatch = body.match(/<img[^>]+icon-vuln\.webp[^>]*>[\s\S]{0,300}?<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/i);
      let vulnUrl = vulnMatch ? vulnMatch[1].trim() : "";
      const vulnName = vulnMatch ? vulnMatch[2].trim() : "";

      const packageMatch = body.match(/Vulnerability in (@?[a-zA-Z0-9_.:\/\-]+)\s+([0-9][a-zA-Z0-9.\-_]*)/);
      const pkgName = packageMatch ? packageMatch[1].trim() : "";
      const pkgVer = packageMatch ? packageMatch[2].trim() : "";

      let howToFix = "", overviewText = "", overviewLinks = "", references = "", subtitleMatch, snykPkgLink;
      let latestVer = "", nonVulnVer = "", firstPublished = "", latestPublished = "";

      try {
        Logger.log(`🔗 Trying redirect fetch: ${vulnUrl}`);
        const resp = UrlFetchApp.fetch(vulnUrl, {
          followRedirects: false,
          muteHttpExceptions: true
        });

        const status = resp.getResponseCode();
        const headers = resp.getAllHeaders();
        const redirected = headers["Location"] || headers["location"] || vulnUrl;

        Logger.log(`📥 Response Code: ${status}`);
        Logger.log(`📎 Location Header: ${redirected}`);

        vulnUrl = redirected;
      } catch (e) {
        Logger.log(`🔥 Exception during redirect check for ${vulnUrl}: ${e}`);
      }

      try {
        const html = UrlFetchApp.fetch(vulnUrl).getContentText();
        Logger.log(`📄 HTML content preview (first 1000 chars):\n${html.slice(0, 1000)}`);

        subtitleMatch = html.match(/<span[^>]*subheading[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/i);
        snykPkgLink = subtitleMatch ? "https://security.snyk.io" + subtitleMatch[1] : "";
        Logger.log(`🔎 subtitleMatch: ${subtitleMatch}`);
        Logger.log(`🔗 snykPkgLink: ${snykPkgLink}`);

        howToFix = extractFixFromScriptJson(html);
        Logger.log(`✅ How to Fix: ${howToFix}`);

        const overviewResult = extractSectionLinks(html, "Overview");
        overviewText = overviewResult.text;
        overviewLinks = overviewResult.links.join(", ");
        Logger.log(`✅ Overview Text: ${overviewText}`);
        Logger.log(`✅ Overview Links: ${overviewLinks}`);

        const refsResult = extractSectionLinks(html, "References");
        references = refsResult.links.join(", ");
        Logger.log(`✅ References: ${references}`);

        if (snykPkgLink) {
          const pkgHtml = UrlFetchApp.fetch(snykPkgLink).getContentText();
          const valueFromLabel = (label) => {
            const allMatches = [...pkgHtml.matchAll(/<li[^>]*data-snyk-test="DetailsBoxItem: ([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>(.*?)<\/h3>[\s\S]*?<[^>]+>(.*?)<\//g)];
            for (const m of allMatches) {
              if (m[2]?.toLowerCase().includes(label)) return m[3].replace(/<[^>]+>/g, "").trim();
            }
            return "";
          };
          latestVer = valueFromLabel("latest version");
          nonVulnVer = valueFromLabel("latest non vulnerable version");
          firstPublished = valueFromLabel("first published");
          latestPublished = valueFromLabel("latest version published");
          Logger.log(`📦 Snyk Versions - Latest: ${latestVer}, Non-Vuln: ${nonVulnVer}, First: ${firstPublished}, Latest Pub: ${latestPublished}`);
        }
      } catch (e) {
        Logger.log(`🔥 Exception fetching redirected content for ${vulnUrl}: ${e}`);
      }

      const row = [date, subject, project, vulnName, vulnUrl, pkgName, pkgVer, snykPkgLink, howToFix, overviewText, overviewLinks, references, latestVer, nonVulnVer, firstPublished, latestPublished];
      sheet.appendRow(row);
    });
  });
}

function extractFixFromScriptJson(html) {
  const matches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)];
  for (const match of matches) {
    try {
      const json = JSON.parse(match[1]);
      const graph = json["@graph"] || [];
      for (const node of graph) {
        if (node["@type"] === "FAQPage" && node.mainEntity?.length) {
          for (const q of node.mainEntity) {
            if (q.name?.toLowerCase().includes("how to fix") && q.acceptedAnswer?.text) {
              return q.acceptedAnswer.text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            }
          }
        }
      }
    } catch (e) {
      Logger.log("❌ Failed to parse How to Fix from JSON-LD block: " + e);
    }
  }
  Logger.log("❌ No matching How to Fix found in JSON-LD blocks");
  return "";
}

function extractSectionLinks(html, sectionTitle) {
  const pattern = new RegExp(`<h2[^>]*>\\s*.{0,10}${sectionTitle}.{0,10}\\s*<\\/h2>[\\s\\S]{0,2000}?<div[^>]*class=\"markdown-to-html[^"]*\"[^>]*>([\\s\\S]*?)<\\/div>`, "gi");
  const matches = [...html.matchAll(pattern)];
  if (matches.length === 0) {
    Logger.log(`❌ Section "${sectionTitle}" not found.`);
    return { text: "", links: [] };
  }

  const content = matches[0][1];
  Logger.log(`🔍 Matched HTML block for ${sectionTitle}:\n${content.slice(0, 500)}`);

  const fragment = HtmlService.createHtmlOutput(content).getContent();
  const linkMatches = [...fragment.matchAll(/<a[^>]+href="([^"]+)"[^>]*>/g)];
  const links = linkMatches.map(m => m[1]);

  const text = content.replace(/<[^>]+>/g, "").replace(/\s+/g, ' ').trim();
  return { text, links };
}
{{< /highlight >}}
```

---

## 작동 방식 요약

### 1. Gmail에서 알림 검색

```javascript
const threads = GmailApp.search('"no remediation available yet"');
```

### 2. 취약점 메타데이터 추출

```javascript
const vulnMatch = body.match(...);
```

### 3. 리디렉션 링크 따라가기

```javascript
const resp = UrlFetchApp.fetch(vulnUrl, { followRedirects: false });
vulnUrl = resp.getAllHeaders()["Location"];
```

### 4. JSON-LD에서 "How to Fix" 추출

```javascript
const json = JSON.parse(match[1]);
```

### 5. Overview 및 참고 링크 파싱

```javascript
extractSectionLinks(html, "Overview");
```

### 6. 패키지 메타데이터 수집

```javascript
const pkgHtml = UrlFetchApp.fetch(snykPkgLink).getContentText();
```

---

## 실제 활용 사례

이 툴을 이용하여 **패치가 존재하지 않는 유지보수 중단 오픈소스 라이브러리**에 대한 조치 가이드를 작성해 공개했습니다:

* [CVE-2022-24434: Dicer 패치 가이드](https://windshock.github.io/ko/post/2025-05-12-cve-cve-2022-24434-dicer/)
* [CVE-2019-17570: Apache XMLRPC 패치 가이드](https://windshock.github.io/ko/post/2025-04-24-cve-2019-17570-apache-xmlrpc/)

---

## 직접 사용해 보기

* Snyk 알림을 받을 수 있는 Gmail 계정 사용
* [Google Apps Script](https://script.google.com)에 스크립트 작성
* `extractSnykNoFixToSheet()` 함수 붙여넣기
* 실행 후 Google Sheet 결과 확인

API 키도, Playwright나 Puppeteer도 필요 없습니다. 이메일과 스크립트만으로 충분합니다.

✋ 비슷한 경험 있으신가요? 여러분의 방식도 공유해 주세요!
