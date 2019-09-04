---
title: "Extension Language and Reflection"
date: 2019-09-03 05:28:00 +0900
categories: XSS XSSAudit javascript
---
jdk 9에서부터는   reflection 의 getCallerClass은 더이상 사용되지 않으며 StackWalker﻿을 사용해야 합니다.
https://riptutorial.com/java/topic/9868/stack-walking-api

[https://www.sitepoint.com/deep-dive-into-java-9s-stack-walking-api/](https://www.sitepoint.com/deep-dive-into-java-9s-stack-walking-api/)
[https://stackoverflow.com/questions/11306811/how-to-get-the-caller-class-in-java](https://stackoverflow.com/questions/11306811/how-to-get-the-caller-class-in-java)

이유도 작성 필요.
el과 [Expression Language Injection](https://www.owasp.org/index.php/Expression_Language_Injection)으로 인한 
EL을 블랙리스트 필터링하는 방식이 기존 패치의 방식, 지속적인 우회
[https://www.blackhat.com/docs/us-17/thursday/us-17-Munoz-Friday-The-13th-Json-Attacks.pdf](https://www.blackhat.com/docs/us-17/thursday/us-17-Munoz-Friday-The-13th-Json-Attacks.pdf)
[https://www.blackhat.com/docs/us-14/materials/us-14-Novikov-The-New-Page-Of-Injections-Book-Memcached-Injections-WP.pdf](https://www.blackhat.com/docs/us-14/materials/us-14-Novikov-The-New-Page-Of-Injections-Book-Memcached-Injections-WP.pdf)
reflection이 가능하므로 exploit 가능
민감한 api (execute, eval 등)에서 caller의 method 접근제한이 추가되면 reflection 제한 가능
reflection의 위협 [https://stackoverflow.com/questions/3002904/what-is-the-security-risk-of-object-reflection](https://stackoverflow.com/questions/3002904/what-is-the-security-risk-of-object-reflection)

취약한 코드 패턴
[https://vulncat.fortify.com/en/detail?id=desc.dataflow.java.server_side_template_injection](https://vulncat.fortify.com/en/detail?id=desc.dataflow.java.server_side_template_injection)
[https://find-sec-bugs.github.io/bugs.htm#TEMPLATE_INJECTION_VELOCITY](https://find-sec-bugs.github.io/bugs.htm#TEMPLATE_INJECTION_VELOCITY)
[https://wiki.sei.cmu.edu/confluence/display/java/SEC05-J.+Do+not+use+reflection+to+increase+accessibility+of+classes%2C+methods%2C+or+fields](https://wiki.sei.cmu.edu/confluence/display/java/SEC05-J.+Do+not+use+reflection+to+increase+accessibility+of+classes%2C+methods%2C+or+fields)

Recopick은 confluence를 사용하는데, 관리자 기능을 얻었다는 것은 내부 서버 권한도 받았다는 것으로 이해하는 것이 타당합니다. Confluence는 html 페이지를 동적으로 표시하기 위해 [VELOCITY_TEMPLATE](https://velocity.apache.org/engine/1.7/user-guide.html)을  사용합니다.

이 경우에 template에서 java코드를 사용하므로 reflection 방식으로 서버 명령 실행(별도로 제한하지 않으면)이 가능합니다.
> [SecureUberspector](https://velocity.apache.org/engine/2.0/apidocs/org/apache/velocity/util/introspection/SecureUberspector.html) This uberspector prevents classloader related method calls. Use this introspector for situations in which template writers are numerous or untrusted. Specifically, this introspector prevents creation of arbitrary objects or reflection on objects. It is a standalone uberspector.

[SecureUberspector의 구현](https://github.com/VISTALL/apache.velocity-engine/blob/master/velocity-engine-core/src/main/java/org/apache/velocity/util/introspection/SecureUberspector.java)은 EL로 실행되는 object를 white 방식으로 제한하여, reflection을 사용하는 공격 코드는 차단됩니다.

        public Iterator getIterator(Object obj, Info i)
    {
        if (obj != null)
        {
            SecureIntrospectorControl sic = (SecureIntrospectorControl)introspector;
            if (sic.checkObjectExecutePermission(obj.getClass(), null))
            {
                return super.getIterator(obj, i);
            }
            else
            {
                log.warn("Cannot retrieve iterator from " + obj.getClass() +
                         " due to security restrictions.");
            }
        }
        return null;
    }

confluence에서 velocity template을 이용하여 RCE(Remote Code Execution)하는 예제는 [https://paper.seebug.org/886/](https://paper.seebug.org/886/) 링크를 참고하세요.

Java reflection은 runtime 상태에서 method,class,interface를 테스트할 수 있는 API로 원격 코드 공격에 주로 사용됩니다. [https://www.geeksforgeeks.org/reflection-in-java/](https://www.geeksforgeeks.org/reflection-in-java/)

#set($exp="test")$exp.getClass().forName("java.lang.Runtime").getMethod("getRuntime",null).invoke(null,null).exec("calc"))

ð  #set은 Velocity template 코드입니다.

ð  getClass 부터가 reflection 코드입니다.

추가 확인 필요
[https://openjdk.java.net/jeps/118](https://openjdk.java.net/jeps/118)
[https://bodden.de/pubs/hhl+17hardening.pdf](https://bodden.de/pubs/hhl+17hardening.pdf)

openjsk에서만 지원 하는 것도 확인 필요

@CallerSensitive annotation은 JVM이 사용하는 Annotation으로 reflection에 의한 호출을 무시하고 Reflection.getCallerClass()을 이용하여 CallerClass에 따라 호출 여부를 결정할 수 있습니다.
> A caller-sensitive method varies its behavior according to the class of its immediate caller. It discovers its caller’s class by invoking the `sun.reflect.Reflection.getCallerClass` method.

Oracle 시큐어코딩 가이드에 따르면 해당 기능은 호출자의 를 검증하는 immediate class loader로 SecurityManager를 우회하여 표준 API를 직접호출 하는 경우를 보완하기 위해 작성된 ([JEP 176](http://openjdk.java.net/jeps/176)) 표준입니다.

하는 [코드 형태](https://www.programcreek.com/java-api-examples/?class=sun.reflect.Reflection&method=getCallerClass)를 보입니다.
    @CallerSensitive
    public static java.util.Enumeration<Driver> getDrivers() {
        java.util.Vector<Driver> result = new java.util.Vector<>();
    
        Class<?> callerClass = Reflection.getCallerClass();
    
        // Walk through the loaded registeredDrivers.
        for(DriverInfo aDriver : registeredDrivers) {
            // If the caller does not have permission to load the driver then
            // skip it.
            if(isDriverAllowed(aDriver.driver, callerClass)) {
                result.addElement(aDriver.driver);
            } else {
                println("    skipping: " + aDriver.getClass().getName());
            }
        }
        return (result.elements());
    }

이것 외에 stacktrace 등의 방법이 존재합니다만, 성능은 JVM에서 지원하는 annotation이 가장 좋습니다.
 - [StackWalker](https://www.javaworld.com/article/3188289/java-9s-other-new-enhancements-part-5-stack-walking-api.html)
 - [WhoCalled](https://github.com/nallar/WhoCalled)
```
Benchmark                                               Mode  Samples     Score    Error  Units
m.n.w.WhoCalledBenchmark.testReflectionCalledBy         avgt       10  2178.268 ± 86.156  ns/op
m.n.w.WhoCalledBenchmark.testReflectionGet              avgt       10    86.975 ±  5.302  ns/op
m.n.w.WhoCalledBenchmark.testSecurityManagerCalledBy    avgt       10   495.695 ± 12.243  ns/op
m.n.w.WhoCalledBenchmark.testSecurityManagerGet         avgt       10   502.327 ± 22.478  ns/op
m.n.w.WhoCalledBenchmark.testStackTraceCalledBy         avgt       10  8630.241 ± 21.425  ns/op
m.n.w.WhoCalledBenchmark.testStackTraceGet              avgt       10  9161.564 ± 85.620  ns/op
```
참조 : https://github.com/nallar/WhoCalled/issues/1#issuecomment-180750822


##참고 자료
[https://stackoverflow.com/questions/22626808/what-does-the-sun-reflect-callersensitive-annotation-mean](https://stackoverflow.com/questions/22626808/what-does-the-sun-reflect-callersensitive-annotation-mean)
[https://www.oracle.com/technetwork/java/seccodeguide-139067.html#9-8](https://www.oracle.com/technetwork/java/seccodeguide-139067.html#9-8)
[http://openjdk.java.net/jeps/176](http://openjdk.java.net/jeps/176)
[https://github.com/nallar/WhoCalled](https://github.com/nallar/WhoCalled)
<!--stackedit_data:
eyJoaXN0b3J5IjpbMTk3NjgxNzQxMSwtMTM3MTUzMDkzMiwtNT
E3Nzg0MDQ2XX0=
-->