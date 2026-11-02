---
title: "오라일리의 저주(The O'Reilly Curse): 20년 된 Java 업로드 코드가 취약점이 되는 순간"
date: 2026-11-02
draft: false
featured: true
translationKey: "oreilly-cos-upload-curse"
tags: ["Mind", "File Upload", "CWE-434", "Java", "Legacy Code", "Vulnerability Research"]
categories: ["취약점 연구", "소프트웨어 보안"]
description: "O'Reilly COS MultipartRequest의 문서화된 선(先)저장 동작과 '첫 번째 파일만 검증'하는 애플리케이션 로직이 결합하면, 이미지 업로드 기능에서 실행 가능한 JSP가 서버에 남을 수 있다. CWE-434 사례를 코드·재현 흐름·수정 방향으로 분석한다."
image: "/images/post/oreilly-cos-upload-curse/cover.webp"
cover:
  image: "/images/post/oreilly-cos-upload-curse/cover.webp"
  alt: "오라일리의 저주 인포그래픽 — O'Reilly COS MultipartRequest의 선저장·첫 파일만 검증 설계가 이미지 업로드에서 실행 가능한 JSP를 남기는 흐름"
---

> **핵심:** 업로드 파일을 검증하는 코드가 존재한다고 해서, 검증에 실패한 파일이 서버에 남지 않는 것은 아니다. O'Reilly COS `MultipartRequest`의 선저장 동작과 애플리케이션의 '첫 번째 파일만 검사'하는 로직이 결합하면, 이미지 업로드 기능에서 실행 가능한 JSP 파일이 남을 수 있다.
>
> 연구 및 재현 코드: https://github.com/windshock/oreilly-cos-upload-poc

## 1. 오래된 라이브러리가 문제가 되는 이유

Java 기반의 오래된 웹 서비스를 살펴보면 `com.oreilly.servlet.MultipartRequest`를 만나는 경우가 있다. 이 클래스는 Jason Hunter의 *Java Servlet Programming*과 연관된 O'Reilly COS 라이브러리의 파일 업로드 도우미다. 저장소의 실험은 `05Nov2002` 버전을 사용한다.

처음부터 위험한 기능으로 만들어진 것은 아니다. 오히려 `MultipartRequest`의 동작은 공식 문서에 명확히 설명되어 있다. HTTP `multipart/form-data` 요청을 받으면 **생성자 안에서 업로드된 파일을 디스크에 먼저 기록**하고, 그 후 애플리케이션이 파일 이름과 유형 등을 확인할 수 있도록 한다. 간결한 API를 제공하는 이른바 *push model*이다.

문제는 사용자가 그 순서를 충분히 의식하지 않고 `MultipartRequest` 객체를 만든 **다음에** 파일을 검증할 때 나타난다. 검증이 실행되는 시점에는 파일이 이미 저장돼 있다. 더구나 검증이 요청에 포함된 파일 전체를 다루지 않는다면, 검사 대상에서 빠진 파일은 그대로 남는다.

여기서 다루는 것은 COS 자체의 새로운 CVE나 알려지지 않은 제로데이가 아니다. 문서화된 설계 선택과 취약한 애플리케이션 구현이 결합하는 **CWE-434(위험한 유형의 파일 업로드 허용)** 사례다.

## 2. 핵심 원리: 저장이 검증보다 먼저 일어난다

실험용 JSP의 핵심 코드는 다음과 같다.

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

첫 번째 문제는 `new MultipartRequest(...)`가 호출되면서 이미 모든 업로드 파일이 `realFolder`에 기록된다는 점이다. 그다음 `getFileNames().nextElement()`는 업로드된 파일들을 순회하는 대신 **단 하나의 폼 필드명**만 가져온다. `name`은 파일명 자체가 아니라 multipart 폼 필드의 이름이다.

검증 실패 시의 정리도 선택된 파일 하나에만 적용된다.

```java
if (!chkExt(filename) || !chkContent(type)) {
    File bad = new File(realFolder + "/" + filename);
    if (bad.exists()) bad.delete();
    return;
}
```

이때 검증 자체에도 한계가 있다. `chkExt()`는 확장자를 확인하고, `chkContent()`가 읽는 값은 실제 파일 바이트를 분석한 결과가 아니라 **클라이언트가 전달한 `Content-Type`**이다. 확장자와 MIME 값만 검사하는 방식으로는 파일의 실질적인 내용이 안전하다는 것을 보장할 수 없다.

따라서 이 코드는 두 가지 잘못된 가정 위에 놓인다. 첫째, 검증 전에 파일이 안전한 위치에 있을 것이라는 가정. 둘째, 한 파일을 검사하고 필요하면 삭제하면 업로드 요청 전체가 처리됐을 것이라는 가정이다.

## 3. 여러 파일을 한 번에 보내면 어떻게 될까?

공개한 PoC는 이 문제를 로컬 Tomcat 환경에서 재현하도록 작성했다. 실험 환경은 COS `05Nov2002`, Tomcat `8.5.93-jdk8-temurin`, 그리고 웹 애플리케이션 내부의 `/uploads` 디렉터리다. 업로드 파일은 실제 명령을 실행하지 않고 고정 문자열만 출력한다.

먼저 단일 JSP 파일만 업로드하면, 검증 로직은 해당 파일을 거부하고 삭제하도록 설계돼 있다. 하지만 하나의 multipart 요청에 정상적인 GIF 파일 하나와 테스트용 JSP 파일 두 개를 함께 넣으면 상황이 달라진다.

```bash
curl -s \
  -F "a=@payloads/ok.gif;type=image/gif" \
  -F "b=@payloads/hello.jsp;type=application/octet-stream" \
  -F "c=@payloads/hello2.jsp;type=application/octet-stream" \
  http://localhost:8899/app/uploadImage.jsp
```

여기서 중요한 것은 전송 순서를 조작하는 것이 아니다. 코드가 `getFileNames()`의 **첫 번째 원소 하나만 검사**한다는 점이다. 원본 COS는 파일 메타데이터를 `Hashtable`에 보관하므로 이 열거 순서가 multipart 전송 순서와 같다고 보장할 수 없다. 그러나 세 파일 중 JSP가 두 개라면, 어느 한 파일을 검사하고 삭제하더라도 **적어도 하나의 JSP가 검사·삭제 대상에서 빠진다**.

요청의 흐름을 정리하면 다음과 같다.

```text
multipart 요청: [정상 GIF] [테스트 JSP 1] [테스트 JSP 2]
                     |
                     v
  MultipartRequest 생성자: 파일 3개를 먼저 저장
                     |
                     v
     getFileNames().nextElement(): 하나만 선택
                     |
                     v
       선택된 파일만 확장자/MIME 검사
                     |
                     v
     나머지 파일은 별도의 검증 없이 남을 수 있음
                     |
                     v
  /uploads가 JSP 실행 경로라면 남은 JSP 접근 시 실행
```

테스트 JSP는 `HELLO-FROM-UPLOADED-JSP`라는 문자열을 출력하는 코드뿐이다. 실행 가능한 업로드 경로에서 해당 문자열이 응답된다면, **이미지 업로드 검증을 거치지 않은 JSP가 웹 애플리케이션에서 해석됐음**을 확인하는 지표가 된다.

이것은 운영체제 명령 실행을 시도하거나 입증했다는 뜻이 아니다. 공개 저장소의 검증 범위는 *무해한 JSP 코드의 서버 측 실행*이다. 실제 서비스에서의 영향은 업로드 경로의 접근 제어, 파일 저장 위치, JSP 실행 설정, 웹 서버 구성에 따라 달라진다.

## 4. 왜 '파일 업로드 성공'보다 더 심각할 수 있나

이 PoC는 저장 경로를 웹 애플리케이션 루트 아래인 `/uploads`로 잡았다. 따라서 Tomcat이 그 경로의 `.jsp`를 처리하도록 구성돼 있다면, 공격자가 업로드한 JSP가 서버 측에서 실행될 수 있다.

반대로 파일을 웹 루트 밖에 저장하거나, 업로드 경로를 단순 정적 파일 전용으로 제공하고 스크립트 실행을 금지했다면 **동일한 검증 우회가 곧바로 JSP 실행을 뜻하지는 않는다**. 이 구분이 중요하다. 파일 업로드 검증 우회, 서버에 위험한 파일이 남는 현상, 서버 측 코드 실행은 연결될 수 있지만 서로 다른 증거가 필요한 단계다.

CVE 식별자가 없다는 사실도 안전을 보증하지 않는다. CVE는 공개적으로 식별된 개별 취약점에 부여되는 식별자이고, CWE-434는 이러한 유형의 약점을 분류한다. **의존성 스캐너에서 경고가 나오지 않더라도 애플리케이션의 사용 방식은 취약할 수 있다.**

## 5. 어떻게 고쳐야 할까

해결책은 단순히 `cos.jar`를 다른 버전으로 교체하는 데 있지 않다. 취약한 애플리케이션 코드를 수정해야 한다.

업로드는 먼저 **실행 불가능하고 외부에 노출되지 않은 임시 영역**에서 처리하고, 요청에 포함된 모든 파일을 검증한 뒤 허용된 파일만 최종 위치로 이동시켜야 한다. 중간에 하나라도 검증에 실패하면 해당 요청으로 만들어진 임시 파일을 모두 정리하는 편이 안전하다. 확장자나 클라이언트 MIME 값만 믿지 말고 파일 시그니처·구조 및 실제 사용 목적에 맞는 내용을 확인해야 한다. 저장 파일명은 서버가 새로 생성하고, 업로드 디렉터리에서는 JSP 등 서버 측 스크립트를 절대 실행하지 않도록 분리한다.

기존 COS를 계속 사용해야 한다면 `MultipartParser`의 pull 모델이나 격리된 임시 경로 사용을 검토할 수 있다. 새로운 구현이라면 Servlet `Part` API 등 현대적인 업로드 처리 수단을 사용하되, **모든 파일 검증 및 저장 경로 분리라는 원칙 자체는 그대로 적용**해야 한다.

레거시 코드 진단에서는 다음과 같은 패턴부터 찾아볼 만하다.

```bash
grep -ran "com.oreilly.servlet" --include='*.jsp' --include='*.java' .
grep -rn "getFileNames().nextElement()" --include='*.jsp' .
```

이 검색은 취약점을 확정하는 검사가 아니라 **코드 리뷰 대상 후보를 찾는 방법**이다. 실제로는 반복문이 있는지, 저장 전에 격리하는지, 오류 발생 시 전체 파일을 정리하는지, 저장 위치에서 서버 측 코드가 실행되는지를 함께 봐야 한다.

## 6. 이 사례가 보여주는 더 큰 문제

COS는 당시의 서블릿 개발자가 손쉽게 파일 업로드를 구현하도록 돕는 라이브러리였다. 공식 문서도 선저장 방식의 동작과 대안인 `MultipartParser`를 설명한다. 따라서 이 문제를 단순히 '오래된 오라일리 코드가 잘못됐다'고 정리하는 것은 부정확하다.

더 중요한 질문은 **코드가 어느 시점에, 어떤 전제 아래 도입되었고, 그 전제를 지금도 누가 확인하고 있는가**이다. 서적 예제나 오래된 도우미 라이브러리는 한 번 복사되거나 WAR에 포함된 뒤, 도입 배경이 사라진 상태로 오랜 기간 살아남을 수 있다. 라이브러리 버전과 알려진 CVE만 확인하는 점검으로는 이런 사용 패턴을 발견하기 어렵다.

결국 이번 사례의 핵심은 새로운 공격 기법의 발견이 아니다. **'파일을 저장하는 시점'과 '검증하는 범위'라는 두 가지 평범한 질문을 코드 수준에서 다시 확인해야 한다**는 것이다. 오래된 소프트웨어의 위험은 나이 자체보다, 설계 당시의 가정을 더 이상 검증하지 않는 데서 커진다.

---

### 연구 자료와 참고 문헌

- 실험 저장소 및 코드: https://github.com/windshock/oreilly-cos-upload-poc
- 실험 JSP 구현: https://github.com/windshock/oreilly-cos-upload-poc/blob/main/webapp/app/uploadImage.jsp
- O'Reilly COS `MultipartRequest` Javadoc: https://www.servlets.com/cos/javadoc/com/oreilly/servlet/MultipartRequest.html
- O'Reilly COS FAQ: https://www.servlets.com/cos/faq.html
- KISA, *웹 에디터 보안 가이드* (2022-11-07): https://boho.or.kr/kr/bbs/view.do?bbsId=B0000127&nttId=67020&menuNo=205021
- OWASP, *File Upload Cheat Sheet*: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- MITRE, CWE-434: https://cwe.mitre.org/data/definitions/434.html

**검증 범위:** 본문은 공개 저장소의 코드·실험 절차 및 COS 공식 문서를 바탕으로 작성했다. 필자가 로컬 Docker 실험을 독립적으로 재실행한 결과를 추가한 것은 아니며, 특정 운영 서비스가 영향을 받는다는 주장도 아니다. 공개 PoC는 허가된 실험 환경에서만 사용해야 한다.
