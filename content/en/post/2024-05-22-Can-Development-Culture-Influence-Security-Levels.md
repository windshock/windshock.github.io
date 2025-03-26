---
title: "Can Development Culture Influence Security Levels?"
date: "2024-05-22"
categories:
  - Development Culture
  - Security
tags:
  - Development Culture
  - Security Evaluation
  - Static Analysis Tools
draft: false
---

# Can Development Culture Influence Security Levels?

## Evaluating Code Quality and Security Levels Using Static Analysis Tools (Joern)

### Background

Unlike companies like [Google](#google-development-culture) with an open and collaborative development culture, in some organizations that lack such culture, the quality of the code, including security levels, can be heavily influenced by the individual’s capability. In particular, developers who tend to write poor quality code, such as using the [strcpy function](#strcpy-function-risk), can have their code quality and security levels assessed by utilizing [static analysis tools](#static-analysis-tools) (Joern, CodeQL, etc.) with [custom rules](#custom-rule-examples). As a result, even in situations where the development culture is lacking, code quality and security levels can be improved, leading to the production of good-quality code.

# Google's Development Culture {#google-development-culture}

At [Google, the Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) is used to write and manage C++ code. The way this is applied at the organizational level is as follows:

1. [**Organizational Culture**: Google has an open and collaborative organizational culture](https://m.blog.naver.com/PostView.naver?blogId=bomnbaeum&logNo=222656395691). This culture encourages developers to collaborate, share knowledge, review each other’s code, and provide feedback. This helps maintain coding style guidelines and improves the quality of code.
2. [**Training and Education**: Google trains new developers on how to adhere to coding style guidelines and apply them in their actual work](https://mypark.tistory.com/entry/Google-C-Style-Guide-%EB%B2%88%EC%97%AD-%EC%A0%95%EB%A6%AC). This helps developers understand the coding style guidelines and apply them in their work.
3. **Tools and Resources Provided**: Google provides developers with tools and resources needed to comply with coding style guidelines. For example, tools like [`cpplint`](https://github.com/cpplint/cpplint) are provided to automatically check whether code complies with the style guide.

Through this approach, Google applies coding style guidelines at the organizational level, which helps maintain code consistency and improve code quality. For further reading, check the [Google Style Guide](https://google.github.io/styleguide/) and the C++ Core Guidelines by the [C++ Standards Committee](https://isocpp.github.io/CppCoreGuidelines/).

# Organizations Without Development Culture {#organizations-without-development-culture}

In contrast, some organizations lack a strong development culture that encourages collaboration and adherence to coding standards. This is particularly true for companies that frequently outsource development and have frequent changes in outsourcing partners. In these scenarios, inconsistent practices, varying skill levels between developers, and a lack of cohesive standards can lead to deteriorating code quality, including security levels. Consequently, these organizations face higher risks due to security vulnerabilities and subpar code quality.

# Risks of the strcpy Function {#strcpy-function-risk}

The `strcpy` function is used to copy strings. [However, the main issue with this function is that it does not check memory boundaries](https://blog.naver.com/PostView.naver?blogId=hoyo1744&logNo=221676530258). This means that if the original string's size exceeds the size of the destination memory, a buffer overflow bug can occur. This may result in errors during program execution or cause the program to malfunction.

To resolve this issue, the C11 standard provides the `strcpy_s` function. The `strcpy_s` function was created to address the shortcomings of `strcpy`, and when using this function, the size of the destination memory must be specified as the second argument. This helps prevent buffer overflow issues.

# Static Analysis Tools {#static-analysis-tools}

Using Joern, a comprehensive Code Property Graph (CPG) integrates syntax, control flow, and data flow into a unified structure, thoroughly detecting complex security vulnerabilities and code issues. Joern’s customizable queries allow precise vulnerability detection tailored to specific project needs, and its scalability enables efficient analysis of large codebases. The tool's functionality automates and integrates various stages of the development lifecycle, helping detect issues early and improve overall code quality. Joern supports multiple programming languages, making it versatile for various development environments.

However, it is not necessary to use Joern exclusively. Similar tools like CodeQL and Checkmarx also provide powerful static analysis capabilities. For more details, refer to the [Joern Documentation](https://docs.joern.io/) and related materials on graph databases and code analysis techniques.

# Custom Rule Examples  {#custom-rule-examples}

| Category  | Good (Security Level: High, Code Quality: High) | Normal (Security Level: Low, Code Quality: Low) | Bad (Security Level: Critical, Code Quality: Low)  |
| :---- | :---- | :---- | :---- |
| Description  | Input validation must always be performed. Input size should always be checked, or functions that check input size (such as `strncpy`, `strlcpy`, `strcpy_s`) should be used instead.  | Input size is checked, but dangerous functions are still used. Developers may be vulnerable to exceptional cases where input size is misunderstood for data types.  | Failing to check input size before buffer copy ('Traditional Buffer Overflow'). This can lead to critical security vulnerabilities, such as privilege escalation and unintended command execution. |
| Case  | **strlen\_malloc\_strncpy**  ZIP\_EXTERN zip\_int64\_t  zip\_add\_dir(**struct** zip \*za, **const** char \*name)  {   size\_t MAXSIZE \= 1024;   char\* sInput \= (char\*)malloc(MAXSIZE);   memset(sInput, 0, MAXSIZE);   ...   ...      **const** jbyte\* javaStr;   jint result \= \-1;   javaStr \= (\*env)-\>GetStringUTFChars(env, drmFileName, NULL);   **if**(javaStr \== NULL)    **goto** end;      strncpy(sInput, javaStr, MAXSIZE);  ......  ......  }  | **strlen\_malloc\_strcpy**  ZIP\_EXTERN zip\_int64\_t  zip\_add\_dir(**struct** zip \*za, **const** char \*name)  {      int len;      char \*s;  ......      s \= NULL;      len \= strlen(name);         **if** (name\[len-1\] \!= '/') {      **if** ((s=(char \*)malloc(len+2)) \== NULL) {          \_zip\_error\_set(\&za-\>error, ZIP\_ER\_MEMORY, 0);          **return** -1;      }        strcpy(s, name);  ......  }  | **malloc(정수)\_strcpy**  Java\_com\_skt\_skaf\_OA00050017\_engine\_ComicEngineJNI\_Open     (JNIEnv\* env, drmFileName, ......)  {   char\* sInput \= (char\*)malloc(1024);  ......      **const** jbyte\* javaStr;  ......      javaStr \= (\*env)-\>GetStringUTFChars(env, drmFileName, ((**void**\*)0));  ......      strcpy(sInput, javaStr);  ......  }  |
| Source/ Sink  | Source : \*  Sink : strncpy, strlcpy, strcpy\_s  | Source : \*  Sink : strcpy, strcat, sprintf, vsprintf, gets  | Source : GetStringUTFChars  Sink : strcpy, strcat, sprintf, vsprintf, gets  |
| Pattern  | The parameter for `malloc` is an additive expression, and its data flow has `strlen` preceding it and `strcpy` following it.  | The parameter for `malloc` is an additive expression, and its data flow has `strlen` preceding it and `strcpy` following it.  | The `malloc` parameter takes an integer input, and the data flow uses `strcpy`. Known functions with no length limit (such as `GetStringUTFChars`) are used as the input to `strcpy`. |
| Rule  | echo "                                                                              \\  getCallsTo('malloc')                                                                \\  .ithArguments('0').children().has('type','AdditiveExpression').statements()         \\  .or(                                                                                \\      \_\_.**in**('REACHES').has('code',new P(CONTAINS\_REGEX,'.\*strlen.\*'))                 \\      .out('REACHES').has('code', new P(CONTAINS\_REGEX,'.\*malloc.\*')),                \\      \_\_.has('code',new P(CONTAINS\_REGEX,'.\*strlen.\*'))                               \\      ).out('REACHES')                                                                \\  .has('code', new P(CONTAINS\_REGEX,'.\*strncpy.\*|.\*strlcpys.\*|.\*strcpy\_s.\*'))    \\  .id()" | joern-lookup xviewer\_comic\_engin.tar.gz | joern-location xviewer\_comic\_engin  | echo "                                                                              \\  getCallsTo('malloc')                                                                \\  .ithArguments('0').children().has('type','AdditiveExpression').statements()         \\  .or(                                                                                \\      \_\_.**in**('REACHES').has('code',new P(CONTAINS\_REGEX,'.\*strlen.\*'))                 \\      .out('REACHES').has('code', new P(CONTAINS\_REGEX,'.\*malloc.\*')),                \\      \_\_.has('code',new P(CONTAINS\_REGEX,'.\*strlen.\*'))                               \\      ).out('REACHES')                                                                \\  .has('code', new P(CONTAINS\_REGEX,'.\*strcpy.\*|.\*sprintf.\*|.\*strcat.\*|.\*gets.\*'))    \\  .id()" | joern-lookup xviewer\_comic\_engin.tar.gz | joern-location xviewer\_comic\_engin | echo "                                                                                                  \\  getCallsTo(new P(CONTAINS\_REGEX, '.\*alloc.\*'))                                                          \\  .ithArguments('0').sideEffect({malparam \= it.get()})                                                    \\  .children().filter({it.get().value('type') \== 'PrimaryExpression'}).statements()                        \\  .out('REACHES').has('code', new P(CONTAINS\_REGEX, '.\*strcpy.\*|.\*sprintf.\*|.\*strcat.\*|.\*gets.\*'))        \\  .**in**('REACHES').not(has('code',new P(CONTAINS\_REGEX,'.\*alloc.\*')))                                       \\  .astNodes().has('type','CallExpression').statements()                                                   \\  .id()" | joern-lookup jni.tar.gz |
| 참고  | [https://randomascii.wordpress.com/2013/04/03/stop-using-strncpy-already/](https://randomascii.wordpress.com/2013/04/03/stop-using-strncpy-already/) | [https://www.cse.psu.edu/\~gxt29/papers/jdksecurity.pdf](https://www.cse.psu.edu/~gxt29/papers/jdksecurity.pdf)  |    |

