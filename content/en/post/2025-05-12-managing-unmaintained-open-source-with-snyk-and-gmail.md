---
title: "How I Managed Unmaintained Open Source with Gmail and Snyk Alerts"
date: 2025-05-12
draft: false
tags: ["security", "automation", "snyk", "gmail", "apps script"]
categories: ["Security", "Tools"]
summary: "When API access falls short, automation through Gmail and Apps Script becomes essential. Here's how I used Google Apps Script to collect Snyk vulnerability alerts and patch data automatically."
---

![Apps Script automation](/images/post/apps-script-ui.webp)

## Motivation

I initially assumed that Snyk's alerts could be fully automated through their official API. But API alone couldn’t handle everything I needed. Many useful details—including "How to Fix", "Overview" descriptions, and safe versions—were easier to extract from the web interface.

Since this gap couldn't be bridged via API, I built an automated parser using Gmail and Google Apps Script. This method reads the contents of emails containing the phrase "no remediation available yet" and scrapes all relevant data from the linked vulnerability page.

---

## What It Does

1. Searches Gmail for Snyk alerts that mention "no remediation available yet"
2. Follows the redirect link to the Snyk vulnerability page
3. Parses:

   * Vulnerability name & link
   * Affected package & version
   * Fix suggestions (via structured FAQ JSON-LD)
   * Overview text & references
   * Latest version info (latest, non-vulnerable, publish dates)
4. Outputs all collected data to Google Sheets

---

## Screenshot Examples

### Gmail Search Results

![Gmail filtered search](/images/post/gmail-search.webp)

### Apps Script Running

![Apps Script code and logs](/images/post/apps-script-logs.webp)

### Output Google Sheet

![Output sheet](/images/post/sheet-output.webp)

---

## Full Code

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

## How It Works

### 1. Gmail Parsing

```javascript
const threads = GmailApp.search('"no remediation available yet"');
```

Searches for relevant Snyk alert emails.

### 2. Extracting Vulnerability Metadata

```javascript
const vulnMatch = body.match(...);
```

Grabs the vulnerability name and URL from the email body.

### 3. Following Redirect

```javascript
const resp = UrlFetchApp.fetch(vulnUrl, { followRedirects: false });
vulnUrl = resp.getAllHeaders()["Location"];
```

Snyk uses redirect links in emails. I follow them manually.

### 4. Extracting "How to Fix" from JSON-LD

```javascript
const json = JSON.parse(match[1]);
```

This looks into embedded `<script type="application/ld+json">` blocks to get FAQ text.

### 5. Overview & References Section

```javascript
extractSectionLinks(html, "Overview");
```

Regex-based static scraping of the structured HTML overview block.

### 6. Snyk Package Page Metadata

```javascript
const pkgHtml = UrlFetchApp.fetch(snykPkgLink).getContentText();
```

Fetches info like:

* Latest version
* Latest non-vulnerable version
* First published
* Latest published

---

## Real-World Use Case

I used this tool to track vulnerable packages and write actionable guides for open source libraries that are no longer maintained and have no official fixes:

* [CVE-2022-24434: Dicer patch guide](https://windshock.github.io/en/post/2025-05-12-cve-cve-2022-24434-dicer/)
* [CVE-2019-17570: Apache XMLRPC patch guide](https://windshock.github.io/en/post/2025-04-24-cve-2019-17570-apache-xmlrpc/)

---

## Want to Try It?

* Use your Gmail account with access to Snyk alerts
* Set up a [Google Apps Script](https://script.google.com)
* Paste the `extractSnykNoFixToSheet()` function into the script editor
* Run it and inspect your Google Sheet

No API keys, no scraping with Playwright or Puppeteer. Just email + code.

✋ If you've tackled a similar challenge, let me know how you did it differently!

