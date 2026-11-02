---
title: "The O’Reilly Curse: When 20-Year-Old Java Upload Code Becomes a Vulnerability"
date: 2026-11-02
draft: false
featured: true
translationKey: "oreilly-cos-upload-curse"
tags: ["Mind", "File Upload", "CWE-434", "Java", "Legacy Code", "Vulnerability Research"]
categories: ["Vulnerability Research", "Software Security"]
description: "A documented save-before-validation design in O’Reilly COS MultipartRequest, combined with first-file-only application validation, can leave an executable JSP behind in an image-upload flow. A CWE-434 case study through code, a reproduction walkthrough, and the proper fix."
image: "/images/post/oreilly-cos-upload-curse/cover.webp"
cover:
  image: "/images/post/oreilly-cos-upload-curse/cover.webp"
  alt: "The O'Reilly Curse infographic — how O'Reilly COS MultipartRequest's save-before-validation and first-file-only validation can leave an executable JSP behind in an image-upload flow"
---

> **Key point:** The existence of file validation code does not guarantee that rejected files never remain on the server. When O’Reilly COS `MultipartRequest` saves files before validation, and the application validates only the “first” uploaded file, an executable JSP can survive an image-upload flow.
>
> Research repo and PoC: https://github.com/windshock/oreilly-cos-upload-poc

## 1. Why an old library can still become a modern problem

When reviewing older Java web applications, it is not unusual to encounter `com.oreilly.servlet.MultipartRequest`. It is the upload helper from the O’Reilly COS library, associated with Jason Hunter’s *Java Servlet Programming*. The lab in this repository uses the `05Nov2002` version.

This was not designed as a “dangerous” feature from the start. In fact, the behavior is documented. COS handles `multipart/form-data` requests in a way that **writes uploaded files to disk inside the constructor first**, and only then allows the application to inspect file names and types. It is a classic *push model* API.

The problem appears when developers create a `MultipartRequest` object and **validate files only afterward**, without fully appreciating that ordering. By the time validation runs, the files have already been written. If the validation logic does not cover every file included in the request, some files may remain on disk even when the request should have been rejected.

This is not a claim of a new CVE or a previously unknown zero-day in COS itself. It is a **CWE-434 (Unrestricted Upload of File with Dangerous Type)** case caused by a documented design choice combined with insecure application-side implementation.

## 2. Core mechanism: saving happens before validation

The essential logic in the demo JSP looks like this:

```java
MultipartRequest multi = new MultipartRequest(
    request, realFolder, maxSize, "UTF-8",
    new DefaultFileRenamePolicy()
);

Enumeration files = multi.getFileNames();
String name = (String) files.nextElement();
String filename = multi.getFilesystemName(name);
String type = multi.getContentType(name);
```

The first problem is that `new MultipartRequest(...)` has already written all uploaded files into `realFolder`. Only after that does the application call `getFileNames().nextElement()`, which retrieves **just one form field name** rather than iterating through all uploaded files.

Cleanup on validation failure is also applied to only that selected file:

```java
if (!chkExt(filename) || !chkContent(type)) {
    File bad = new File(realFolder + "/" + filename);
    if (bad.exists()) bad.delete();
    return;
}
```

The validation itself is limited. `chkExt()` checks the extension, and `chkContent()` reads the **client-supplied `Content-Type`** value, not the actual file bytes. That means the code is not performing content-based file validation in any strong sense.

So the implementation rests on two flawed assumptions:

1. that files are still “safe” to inspect when validation begins, and  
2. that validating and optionally deleting one file is enough to represent the safety of the whole multipart request.

## 3. What happens when multiple files are uploaded together?

The published PoC recreates this behavior in a local Tomcat environment. The lab uses COS `05Nov2002`, Tomcat `8.5.93-jdk8-temurin`, and an `/uploads` directory inside the web application. The uploaded JSP payload is deliberately harmless and prints only a fixed marker string.

If you upload a single `.jsp` file, the demo logic is intended to reject and delete it. But the behavior changes when one multipart request contains **one valid GIF and two JSP files**:

```bash
curl -s \
  -F "a=@payloads/ok.gif;type=image/gif" \
  -F "b=@payloads/hello.jsp;type=application/octet-stream" \
  -F "c=@payloads/hello2.jsp;type=application/octet-stream" \
  http://localhost:8899/app/uploadImage.jsp
```

The key issue is not simply upload ordering. The application checks **only the first element** returned by `getFileNames()`. In the original COS implementation, file metadata is stored in a `Hashtable`, so this enumeration order is not guaranteed to match multipart transmission order.

However, if the request includes three files and **two of them are JSPs**, then no matter which single file gets selected and validated, **at least one JSP remains outside the validation-and-delete path**.

The flow is easier to understand this way:

```text
multipart request: [valid GIF] [test JSP 1] [test JSP 2]
                        |
                        v
 MultipartRequest constructor saves all 3 files first
                        |
                        v
     getFileNames().nextElement() selects only one
                        |
                        v
    Only the selected file is checked by extension/MIME
                        |
                        v
    The remaining files may stay on disk unvalidated
                        |
                        v
 If /uploads is JSP-executable, the surviving JSP can run
```

The test JSP prints `HELLO-FROM-UPLOADED-JSP` and does nothing else. If that string is returned when the uploaded file is requested, it demonstrates that **a JSP not fully covered by the image-upload validation flow has been interpreted by the application server**.

This does **not** mean the public repository demonstrates operating-system command execution. The repo’s scope is limited to proving *server-side execution of a harmless uploaded JSP*. Real-world impact would depend on the storage path, file handling policy, servlet container behavior, and surrounding deployment architecture.

## 4. Why this can be more serious than “just file upload”

In the PoC, the upload path is placed under the web application root as `/uploads`. If Tomcat is willing to process `.jsp` files from that location, then an uploaded JSP can execute server-side.

If, on the other hand, files are stored outside the web root, or the upload location is exposed only as a static file origin with script execution disabled, then the same validation bypass would **not automatically imply JSP execution**. That distinction matters. File-upload validation bypass, dangerous file persistence on disk, and server-side code execution are related but separate steps that require separate evidence.

The absence of a CVE also does not imply safety. CVEs identify publicly tracked vulnerabilities; **CWE-434 describes a class of weakness**. A dependency scanner may show no alert for COS, yet the application’s usage pattern can still be insecure.

## 5. How to fix it properly

The answer is not simply “replace `cos.jar` with another version.” The application logic must change.

Uploads should first be handled in a **non-executable, non-public temporary location**. Every file in the request should be validated before any file is moved into its final destination. If one file fails validation, the safer behavior is to clean up **all temporary files created by that request**.

Extension checks and client-supplied MIME values are not enough. Validation should examine file signatures, structure, and expected content as appropriate. Final file names should be generated server-side. Most importantly, the upload directory must never allow execution of server-side scripts such as JSP.

If a legacy system must continue using COS, it should consider the `MultipartParser` pull model or a strictly isolated temporary directory workflow. In new implementations, a modern upload mechanism such as the Servlet `Part` API is preferable—but the core principles remain the same: **validate every file and keep uploads out of executable paths**.

For legacy code review, the following patterns are useful starting points:

```bash
grep -ran "com.oreilly.servlet" --include='*.jsp' --include='*.java' .
grep -rn "getFileNames().nextElement()" --include='*.jsp' .
```

These searches do not prove a vulnerability by themselves. They help identify code worth reviewing for validation coverage, error handling, cleanup logic, storage location, and executable upload paths.

## 6. The larger lesson behind “The O’Reilly Curse”

COS was built to help servlet developers implement file upload more easily. Its documentation explains the save-first behavior and points to alternatives such as `MultipartParser`. So it would be inaccurate to reduce this story to “old O’Reilly code is broken.”

The more important question is this: **under what assumptions was this code introduced, and who is still verifying those assumptions today?** Book sample code and old helper libraries can survive for years inside WAR files long after their original context has been forgotten. Dependency inventories and CVE checks alone often miss that kind of application-level usage risk.

So the real lesson here is not the discovery of a novel exploit. It is the need to revisit two very ordinary questions at code level:

- **When exactly does a file get written?**  
- **How many files does the validation logic actually cover?**

The greatest risk in old software is often not its age by itself, but the fact that nobody is still validating the assumptions it was built on.

---

### Research materials and references

- Research repo and PoC: https://github.com/windshock/oreilly-cos-upload-poc
- Demo JSP: https://github.com/windshock/oreilly-cos-upload-poc/blob/main/webapp/app/uploadImage.jsp
- O’Reilly COS `MultipartRequest` Javadoc: https://www.servlets.com/cos/javadoc/com/oreilly/servlet/MultipartRequest.html
- O’Reilly COS FAQ: https://www.servlets.com/cos/faq.html
- KISA, *Web Editor Security Guide* (2022-11-07): https://boho.or.kr/kr/bbs/view.do?bbsId=B0000127&nttId=67020&menuNo=205021
- OWASP, *File Upload Cheat Sheet*: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- MITRE, CWE-434: https://cwe.mitre.org/data/definitions/434.html

**Validation scope:** This article is based on the public repository, the PoC code, and the official COS documentation. It does not claim independent rerun results from the author’s local Docker environment, and it does not claim that any specific production service is affected. The public PoC should be used only in authorized test environments.
