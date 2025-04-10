---
title: 자바 리플렉션의 보안 위협과 완화 전략
date: '2019-09-03'
categories: &id001 []
tags: *id001
featured: true
image: "/images/post/java-reflection-security.webp"
description: "**자바 리플렉션 API**는 런타임에 클래스, 메서드, 인터페이스를 동적으로 조작할 수 있게 해주는 강력한 도구입니다. 하지만 그 유연성 때문에 공격자가 이를 악용해 시스템에 무단 접근할 수 있는 심각한 보안 위험이 발생합니다. 본 문서에서는 자바 리플렉션이 야기하는 보안 위협을 살펴보고, 이러한 위험을 완화하기 위한 전략들을 설명합니다."
---

### 자바 리플렉션의 보안 위협과 완화 전략

**자바 리플렉션 API**는 런타임에 클래스, 메서드, 인터페이스를 동적으로 조작할 수 있게 해주는 강력한 도구입니다. 하지만 그 유연성 때문에 공격자가 이를 악용해 시스템에 무단 접근할 수 있는 심각한 보안 위험이 발생합니다. 본 문서에서는 자바 리플렉션이 야기하는 보안 위협을 살펴보고, 이러한 위험을 완화하기 위한 전략들을 설명합니다.

#### 리플렉션 API 사용 시의 위험성

리플렉션은 객체의 구조를 검사하거나 런타임에 메서드를 동적으로 호출하는 데 일반적으로 사용됩니다. 그러나 적절한 **보안 관리자(Security Manager)**가 없는 경우, `execute`, `eval` 등과 같은 민감한 메서드에 접근할 수 있어 잠재적인 **원격 코드 실행(RCE)** 공격을 유발할 수 있습니다.

예를 들어, 아래 코드는 시스템 명령어를 실행하기 위해 리플렉션을 사용하는 위험성을 보여줍니다:

```java
#set($exp="test")
$exp.getClass().forName("java.lang.Runtime")
.getMethod("getRuntime", null)
.invoke(null, null)
.exec("calc")
```

이 코드는 Velocity 템플릿 엔진과 리플렉션을 사용하여 시스템 명령어를 실행하는데, 적절한 보안 조치가 마련되지 않은 경우 공격자에 의해 악용될 수 있습니다. 다행히도, Java 9에서는 이러한 위험을 완화하기 위한 보안 메커니즘이 강화되었습니다.

#### Java 9와 StackWalker API

Java 9에서는 기존의 `Reflection.getCallerClass` 메서드가 더 이상 사용되지 않고, 대신 **StackWalker API**가 도입되었습니다. 이 API는 호출 클래스를 검사하는 보다 안전한 방법을 제공합니다. 이전에는 보안 검사가 바로 직전 호출자에 대해서만 수행되었지만, **StackWalker**를 사용하면 전체 호출 스택을 검사하여 보다 포괄적인 보안을 확보할 수 있습니다.

자세한 내용은 [Stack Walking API 가이드](https://www.sitepoint.com/deep-dive-into-java-9s-stack-walking-api/)를 참고하세요. 이 방법은 호출 체인 전체에 걸친 잠재적 취약점을 모두 해결하도록 돕는데, 이는 **CVE-2012-4681** 취약점 사례에서도 확인할 수 있습니다. 이 취약점에서는 자바의 호출자 민감 메서드가 악용되어 공격이 발생했으나, Java 8 이후로 `@CallerSensitive` 애노테이션을 통해 이러한 메서드를 보호할 수 있게 되었습니다.

#### 블랙리스트 기반 보안의 문제점과 화이트리스트의 필요성

전통적인 블랙리스트 기반 보안 접근 방식은 특정 위험 요소를 차단하는 데 초점을 맞추지만, 모든 공격 벡터를 포괄하지 못하는 한계가 있습니다. 예를 들어, 특정 메서드나 클래스를 블랙리스트에 올려도, 공격자는 차단되지 않은 다른 대체 방법을 사용하여 우회할 수 있습니다.

**표현 언어 주입(Expression Language Injection)** 및 기타 동적 코드 실행 공격은 이러한 한계를 자주 악용합니다. [Blackhat JSON Attacks](https://www.blackhat.com/docs/us-17/thursday/us-17-Munoz-Friday-The-13th-Json-Attacks.pdf)에서처럼, 블랙리스트 필터링 방식은 우회될 수 있으며, 공격자는 차단되지 않은 경로를 통해 악의적인 명령어를 실행할 수 있습니다.

이러한 이유로 **화이트리스트 접근 방식**이 일반적으로 더 효과적입니다. 화이트리스트 방식은 명시적으로 신뢰할 수 있는 클래스와 메서드만 접근을 허용하고 기본적으로 나머지를 모두 차단하므로, 승인되지 않은 메서드나 리플렉션 기반 공격을 통한 코드 실행 위험을 크게 줄일 수 있습니다.

#### SecureUberspector의 역할과 한계

Apache Velocity의 **SecureUberspector**는 클래스 로딩과 리플렉션을 제한하는 도구로, 특히 신뢰할 수 없는 다수의 템플릿 작성자가 관여하는 경우에 유용합니다. 이는 임의의 객체 실행과 해당 객체에 대한 리플렉션을 차단하여 보안을 강화합니다. 그러나 한계가 존재합니다.

예를 들어, **CVE-2019-17558**에서 SecureUberspector는 모든 리플렉션 기반 공격을 완전히 차단하지 못했습니다. 특히, **javax.script.ScriptEngineManager**의 사용을 막지 못해, 이를 통해 임의의 코드 실행이 가능해졌습니다. [GHSL-2020-048](https://securitylab.github.com/advisories/GHSL-2020-048-apache-velocity/)에서는 공격자가 이 취약점을 이용하여 SecureUberspector를 우회하는 방법을 보여줍니다:

```java
#set($engine = $scriptEngineManager.getEngineByName("nashorn"))
#engine.eval("java.lang.Runtime.getRuntime().exec('calc')")
```

이 스크립트는 SecureUberspector를 우회하여 원격 명령어 실행을 가능하게 합니다. 마찬가지로, 공격자는 [SecureLayer7 분석](https://blog.securelayer7.net/analyzing-security-vulnerabilities-in-xwiki-in-depth-examination/)에서 언급된 바와 같이 **Groovy** 스크립트를 사용해 보안 메커니즘을 우회할 수 있습니다.

#### 화이트리스트 적용: 구체적인 전략

화이트리스트는 신뢰할 수 있는 클래스, 메서드, 객체만 허용하고 그 외는 모두 차단하는 보안 모델로, 선호되는 방식입니다. 아래는 자바에서 화이트리스트를 적용하는 구체적인 방법들입니다.

1. **보안 관리자(Security Manager) 사용**  
   자바 **보안 관리자**를 사용하면 민감한 리소스에 대한 접근을 제한하고 특정 클래스나 메서드만 실행할 수 있도록 할 수 있습니다.

   ```java
   System.setSecurityManager(new SecurityManager());

   // 신뢰할 수 있는 메서드/클래스에 대한 권한 정의
   PermissionCollection perms = new Permissions();
   perms.add(new RuntimePermission("accessDeclaredMembers")); // 리플렉션 접근 허용
   perms.add(new RuntimePermission("createClassLoader")); // 클래스 로더 생성 허용

   AccessController.doPrivileged(new PrivilegedAction<Void>() {
       public Void run() {
           // 화이트리스트에 포함된 메서드 내에서만 실행
           secureMethod();
           return null;
       }
   }, new AccessControlContext(new ProtectionDomain[] {new ProtectionDomain(null, perms)}));
   ```

2. **리플렉션을 통한 접근 제어**  
   리플렉션 사용 시, 특정 클래스와 메서드에 대한 접근을 수동으로 제한하여 명시적으로 허용되지 않은 경우 접근을 거부할 수 있습니다.

   ```java
   private static final Set<String> allowedMethods = Set.of(
       "java.lang.String", "java.util.List" // 화이트리스트에 포함된 클래스
   );

   public static Object invokeMethod(Method method, Object target, Object... args) throws Exception {
       if (!allowedMethods.contains(method.getDeclaringClass().getName())) {
           throw new SecurityException("Unauthorized method invocation: " + method.getName());
       }
       return method.invoke(target, args); // 화이트리스트에 포함된 메서드만 실행
   }
   ```

3. **스크립트 엔진에서의 화이트리스트 적용**  
   **javax.script.ScriptEngineManager**와 같은 스크립트 엔진도 화이트리스트를 구현하여 안전한 스크립트나 명령어만 실행되도록 할 수 있습니다.

   ```java
   ScriptEngine engine = new ScriptEngineManager().getEngineByName("nashorn");
   engine.setBindings(new SimpleBindings(allowedMethods), ScriptContext.ENGINE_SCOPE); // 화이트리스트 적용
   engine.eval("some safe script here");
   ```

4. **템플릿 엔진에서의 화이트리스트 적용**  
   SecureUberspector와 같은 도구는 템플릿 엔진 내에서 신뢰할 수 있는 메서드와 객체에 대한 접근을 제한하는 화이트리스트 방식을 강제하도록 설정할 수 있습니다.

   ```java
   public Iterator getIterator(Object obj, Info i) {
       if (obj != null) {
           SecureIntrospectorControl sic = (SecureIntrospectorControl) introspector;
           if (sic.checkObjectExecutePermission(obj.getClass(), null)) {
               return super.getIterator(obj, i);
           } else {
               log.warn("보안 제한으로 인해 " + obj.getClass() + "에서 iterator를 가져올 수 없습니다.");
           }
       }
       return null;
   }
   ```

#### StackWalker를 통한 보호: 호출자 검증

Java 9에서 도입된 **StackWalker API**는 호출 스택을 검사하는 안전한 방법을 제공하여, 메서드 호출에 대한 더 나은 제어를 가능하게 합니다. StackWalker를 사용하면 메서드가 신뢰할 수 있는 호출자에 의해서만 호출되는지 확인할 수 있습니다.

다음은 StackWalker를 사용하여 메서드의 호출자를 검증하는 예제입니다:

```java
import java.lang.StackWalker;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class SecurityManagerUtil {
    // 화이트리스트에 포함된 호출자 클래스
    private static final Set<String> allowedCallers = Set.of("com.example.TrustedClass");

    public static void checkCaller() {
        List<String> stackTrace = StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE)
                .walk(frames -> frames.map(frame -> frame.getDeclaringClass().getName())
                .collect(Collectors.toList()));

        // 호출자가 화이트리스트에 포함되지 않은 경우 예외 발생
        boolean isCallerAllowed = stackTrace.stream().anyMatch(allowedCallers::contains);
        if (!isCallerAllowed) {
            throw new SecurityException("Unauthorized caller detected: " + stackTrace);
        }
    }

    public static void secureMethod() {
        checkCaller(); // 실행 전 호출자 검증
        System.out.println("Secure method executed.");
    }
}
```

이 예제는 신뢰할 수 있는 클래스만이 `secureMethod()`를 호출할 수 있도록 보장합니다. 만약 허가되지 않은 클래스가 메서드에 접근하려 할 경우, 예외가 발생합니다.

#### 결론: 리플렉션의 올바른 사용과 보호

자바 리플렉션 API는 유연하고 강력한 도구이지만, 특히 Velocity와 같은 템플릿 엔진과 결합될 경우 심각한 보안 위험을 초래합니다. **블랙리스트 기반** 접근 방식은 우회될 가능성이 높지만, **화이트리스트** 방식은 신뢰할 수 있는 요소만 실행되도록 하여 더 강력한 보호를 제공합니다. 또한, **StackWalker API**를 활용하면 메서드 호출을 검증하고 무단 접근을 차단하여 보안을 한층 강화할 수 있습니다.

화이트리스트와 StackWalker와 같은 도구를 결합함으로써, 자바 애플리케이션을 리플렉션 기반 공격에 대해 더욱 안전하고 견고하게 만들 수 있습니다.
