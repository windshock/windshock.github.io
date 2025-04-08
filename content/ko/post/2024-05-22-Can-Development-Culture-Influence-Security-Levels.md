---
title: "개발문화가 보안수준에 영향을 미칠 수 있을까?"
date: "2024-05-22"
categories:
  - 개발문화
  - 보안
tags:
  - 개발문화
  - 보안 평가
  - 정적 분석 도구
draft: false
---

# 개발문화가 보안수준에 영향을 미칠 수 있을까?

![Development Culture](/images/post/development-culture.webp)

## 정적 분석 도구(joern)를 이용한 코드 품질과 보안 수준의 평가

# 배경

[개방적이고 협업 중심의 개발문화를 가진 구글](#구글의-개발문화) 등 회사와 달리, [그렇지 못한 일부 조직](#개발문화가-없는-조직)에서는 개인의 역량에 따라 코드의 품질 \- 보안 수준을 포함하여 \- 이 좌우될 수 있습니다. 특히, C 코드에서 [strcpy 함수](#strcpy-함수의-위험성)를 사용하는 등의 품질 낮은 코드를 작성하는 경향이 있는 개발자들에게 [정적 분석 도구](#정적-분석-도구)(joern, codeQL 등)을 [커스텀 룰](#커스텀-룰-예시)을 활용하여 코드의 품질과 보안 수준을 평가하여 제공할 수 있습니다. 결과적으로 개발 문화가 부족한 제한된 상황에서도 코드 품질과 동시에 보안수준이 향상되는, Good한 수준의 코드를 기대할 수 있습니다.

# 구글의 개발문화 {#구글의-개발문화}

[구글에서는 Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)를 활용하여 C++ 코드를 작성하고 관리하는데, 이를 회사 조직 차원에서 적용하는 방법은 다음과 같습니다:

1. [**조직 문화**: 구글은 개방적이고 협업 중심의 조직 문화를 가지고 있습니다](https://m.blog.naver.com/PostView.naver?blogId=bomnbaeum&logNo=222656395691). 이러한 문화는 개발자들이 서로 협력하고, 지식을 공유하며, 서로의 코드를 검토하고 피드백을 주는 환경을 조성합니다2. 이는 코딩 스타일 가이드를 준수하고, 코드의 품질을 높이는 데 도움이 됩니다2.  
2. [**교육 및 훈련**: 구글은 새로운 개발자들에게 코딩 스타일 가이드를 준수하는 방법을 교육하고, 이를 실제 작업에 적용하는 방법을 훈련합니다](https://mypark.tistory.com/entry/Google-C-Style-Guide-%EB%B2%88%EC%97%AD-%EC%A0%95%EB%A6%AC). 이는 개발자들이 코딩 스타일 가이드를 이해하고, 이를 자신의 작업에 적용하는 데 도움이 됩니다.  
3. **도구 및 자원 제공**: 구글은 개발자들에게 코딩 스타일 가이드를 준수하는 데 필요한 도구와 자원을 제공합니다1. 예를 들어, [`cpplint`](https://github.com/cpplint/cpplint)와 같은 lint 툴을 제공하여 코드 스타일 가이드를 준수하는지 자동으로 검사할 수 있습니다.

이러한 방식을 통해 구글은 조직 차원에서 코딩 스타일 가이드를 적용하고, 이를 통해 코드의 일관성을 유지하고, 코드의 품질을 높이는 데 도움이 됩니다. 이 외에도 [Google Style Guide](https://google.github.io/styleguide/)에는 다양한 코딩 표준과 규칙이 포함되어 있으며, C++ 표준 위원회 [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/) 자료도 있으니 참고하세요.

# 개발문화가 없는 조직 {#개발문화가-없는-조직}

대조적으로 일부 조직에는 강력한 개발 문화가 협업과 코딩 표준 준수를 장려하는 응집력 있는 문화가 부족합니다. 이는 개발을 자주 아웃소싱하고 아웃소싱 파트너가 자주 변경되는 기업의 경우 특히 그렇습니다. 이러한 시나리오에서는 일관되지 않은 관행, 개발자 간의 기술 수준 차이, 응집력 있는 표준 부족으로 인해 보안 수준을 포함한 코드 품질이 저하될 수 있습니다. 결과적으로 이러한 조직은 보안 취약성 및 차선의 코드 품질로 인한 위험이 높아집니다.

# strcpy 함수의 위험성 {#strcpy-함수의-위험성}

`strcpy` 함수는 문자열을 복사하는 함수입니다. [그러나 이 함수의 주요 문제점은 메모리의 경계를 검사하지 않는다는 것입니다](https://blog.naver.com/PostView.naver?blogId=hoyo1744&logNo=221676530258). 즉, 복사될 메모리의 크기보다 원본 문자열의 크기가 더 크면 버퍼 오버플로우 버그가 발생할 수 있습니다. 이는 프로그램 실행 시에 오류를 발생시키거나 프로그램이 오작동할 수 있습니다.

이러한 문제를 해결하기 위해 C11 표준에서는 `strcpy_s` 함수를 제공합니다. s`trcpy_s` 함수는 `strcpy` 함수의 단점을 보완하기 위해 만들어진 함수로, 이 함수를 사용할 때는 복사될 메모리의 크기를 두 번째 인자에 꼭 적어주어야 합니다. 이렇게 하면 버퍼 오버플로우 문제를 방지할 수 있습니다.

# 정적 분석 도구 {#정적-분석-도구}

Joern을 사용하면 포괄적인 CPG(코드 속성 그래프)가 구문, 제어 흐름 및 데이터 흐름을 통합 구조로 통합하여 복잡한 보안 취약성과 코드 문제를 철저하게 감지할 수 있으므로 유리합니다. 또한 Joern의 사용자 정의 가능한 쿼리를 통해 특정 프로젝트 요구 사항에 맞는 정밀한 취약성 탐지가 가능하며 확장성 덕분에 대규모 코드베이스를 효율적으로 분석할 수 있습니다. 개발 라이프사이클의 다양한 단계를 자동화하고 통합하는 이 도구의 기능은 문제를 조기에 감지하여 전반적인 코드 품질을 향상시키는 데 도움이 됩니다. 또한 Joern은 여러 프로그래밍 언어를 지원하므로 다양한 개발 환경에 다용도로 사용할 수 있습니다.

그러나 반드시 Joern을 사용할 필요는 없습니다. CodeQL 및 Checkmarx와 같은 유사한 도구도 강력한 정적 분석 기능을 제공합니다. 자세한 내용은 [Joern 문서](https://docs.joern.io/) 및 그래프 데이터베이스 및 코드 분석 기법에 대한 관련 자료를 참조하세요.

# 커스텀 룰 예시  {#커스텀-룰-예시}

| 구분  | Good (보안수준: 양호, 코드품질 : 양호) | Normal (보안수준 : 미흡 , 코드품질 : 낮음) | Bad (보안수준 : 취약, 코드품질 : 낮음)  |
| :---- | :---- | :---- | :---- |
| 설명  | 입력 값의 유효성 검사는 항상 이루어져야 합니다.  입력 값의 크기를 항상 확인하거나 함수 자체에서 입력의 크기를 검사하는 함수 (strncpy, strlcpy, strcpy\_s 등) 들로 대체하여 사용해야합니다.  | 입력 값의 크기를 확인하여 변수를 생성하고 있으나 위험한 함수를 사용하고 있습니다. 개발자가 데이터 타입에 대한 입력 값 크기를 착각 하는 예외적인 케이스에 취약할 수 있습니다.  | 입력의 크기를 확인하지 않고 버퍼 복사하는 것 ('전통적인 버퍼 오버플로우') 버퍼 오버 플로우 취약점을 통해, 권한 상승, 의도되지 않은 명령 실행 등의 시스템에 심각한 위험을 초래할 수 있습니다.  |
| Case  | **strlen\_malloc\_strncpy**  ZIP\_EXTERN zip\_int64\_t  zip\_add\_dir(**struct** zip \*za, **const** char \*name)  {   size\_t MAXSIZE \= 1024;   char\* sInput \= (char\*)malloc(MAXSIZE);   memset(sInput, 0, MAXSIZE);   ...   ...      **const** jbyte\* javaStr;   jint result \= \-1;   javaStr \= (\*env)-\>GetStringUTFChars(env, drmFileName, NULL);   **if**(javaStr \== NULL)    **goto** end;      strncpy(sInput, javaStr, MAXSIZE);  ......  ......  }  | **strlen\_malloc\_strcpy**  ZIP\_EXTERN zip\_int64\_t  zip\_add\_dir(**struct** zip \*za, **const** char \*name)  {      int len;      char \*s;  ......      s \= NULL;      len \= strlen(name);         **if** (name\[len-1\] \!= '/') {      **if** ((s=(char \*)malloc(len+2)) \== NULL) {          \_zip\_error\_set(\&za-\>error, ZIP\_ER\_MEMORY, 0);          **return** -1;      }        strcpy(s, name);  ......  }  | **malloc(정수)\_strcpy**  Java\_com\_skt\_skaf\_OA00050017\_engine\_ComicEngineJNI\_Open     (JNIEnv\* env, drmFileName, ......)  {   char\* sInput \= (char\*)malloc(1024);  ......      **const** jbyte\* javaStr;  ......      javaStr \= (\*env)-\>GetStringUTFChars(env, drmFileName, ((**void**\*)0));  ......      strcpy(sInput, javaStr);  ......  }  |
| Source/ Sink  | Source : \*  Sink : strncpy, strlcpy, strcpy\_s  | Source : \*  Sink : strcpy, strcat, sprintf, vsprintf, gets  | Source : GetStringUTFChars  Sink : strcpy, strcat, sprintf, vsprintf, gets  |
| Pattern  | malloc의 param이 더하기 표현이며, 그 malloc의 data flow 상 선행으로 strlen, 후행으로 strcpy이다.  | malloc의 param이 더하기 표현이며, 그 malloc의 data flow 상 선행으로 strlen, 후행으로 strcpy이다.  | malloc의 param에 정수를 입력하고 data flow 상에서 strcpy를 사용한다.  길이 제한이 없는 알려진 함수(GetStringUTFChars 등)의 결과 값을 strcpy의 input 값으로 사용한다.  |
| Rule  | echo "                                                                              \\  getCallsTo('malloc')                                                                \\  .ithArguments('0').children().has('type','AdditiveExpression').statements()         \\  .or(                                                                                \\      \_\_.**in**('REACHES').has('code',new P(CONTAINS\_REGEX,'.\*strlen.\*'))                 \\      .out('REACHES').has('code', new P(CONTAINS\_REGEX,'.\*malloc.\*')),                \\      \_\_.has('code',new P(CONTAINS\_REGEX,'.\*strlen.\*'))                               \\      ).out('REACHES')                                                                \\  .has('code', new P(CONTAINS\_REGEX,'.\*strncpy.\*|.\*strlcpys.\*|.\*strcpy\_s.\*'))    \\  .id()" | joern-lookup xviewer\_comic\_engin.tar.gz | joern-location xviewer\_comic\_engin  | echo "                                                                              \\  getCallsTo('malloc')                                                                \\  .ithArguments('0').children().has('type','AdditiveExpression').statements()         \\  .or(                                                                                \\      \_\_.**in**('REACHES').has('code',new P(CONTAINS\_REGEX,'.\*strlen.\*'))                 \\      .out('REACHES').has('code', new P(CONTAINS\_REGEX,'.\*malloc.\*')),                \\      \_\_.has('code',new P(CONTAINS\_REGEX,'.\*strlen.\*'))                               \\      ).out('REACHES')                                                                \\  .has('code', new P(CONTAINS\_REGEX,'.\*strcpy.\*|.\*sprintf.\*|.\*strcat.\*|.\*gets.\*'))    \\  .id()" | joern-lookup xviewer\_comic\_engin.tar.gz | joern-location xviewer\_comic\_engin | echo "                                                                                                  \\  getCallsTo(new P(CONTAINS\_REGEX, '.\*alloc.\*'))                                                          \\  .ithArguments('0').sideEffect({malparam \= it.get()})                                                    \\  .children().filter({it.get().value('type') \== 'PrimaryExpression'}).statements()                        \\  .out('REACHES').has('code', new P(CONTAINS\_REGEX, '.\*strcpy.\*|.\*sprintf.\*|.\*strcat.\*|.\*gets.\*'))        \\  .**in**('REACHES').not(has('code',new P(CONTAINS\_REGEX,'.\*alloc.\*')))                                       \\  .astNodes().has('type','CallExpression').statements()                                                   \\  .id()" | joern-lookup jni.tar.gz |
| 참고  | [https://randomascii.wordpress.com/2013/04/03/stop-using-strncpy-already/](https://randomascii.wordpress.com/2013/04/03/stop-using-strncpy-already/) | [https://www.cse.psu.edu/\~gxt29/papers/jdksecurity.pdf](https://www.cse.psu.edu/~gxt29/papers/jdksecurity.pdf)  |    |

