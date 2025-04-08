---
title: Security threats and mitigation strategies for java reflection
date: '2019-09-03'
categories: &id001 []
tags: *id001
aliases:
  - /xss/xssaudit/javascript/Extension-Language-And-Reflection/
  - /Security-Threats-and-Mitigation-Strategies-for-Java-Reflection/
---

### Security Threats and Mitigation Strategies for Java Reflection

The **Java Reflection API** is a powerful tool that allows dynamic manipulation of classes, methods, and interfaces at runtime. However, due to its flexibility, it introduces significant security risks, as attackers can exploit it to gain unauthorized access to systems. In this article, we will explore the security threats posed by Java Reflection and outline strategies to mitigate these risks.

#### The Risks of Using Reflection API

Reflection is commonly used to inspect the structure of objects or dynamically invoke methods at runtime. However, without a proper **Security Manager**, sensitive methods (like `execute`, `eval`, etc.) can be accessed, leading to potential **Remote Code Execution (RCE)** attacks.

For example, the following code demonstrates the risks of using Reflection to execute system commands:

```java
#set($exp="test")
$exp.getClass().forName("java.lang.Runtime")
.getMethod("getRuntime", null)
.invoke(null, null)
.exec("calc")
```

This code uses the Velocity template engine with Reflection to execute a system command, which can be exploited by attackers if proper security measures are not in place. However, Java 9 introduced enhanced security mechanisms to mitigate such risks.

#### Java 9 and the StackWalker API

In Java 9, the traditional `Reflection.getCallerClass` method was deprecated and replaced with the **StackWalker API**, which provides a more secure way to inspect the calling class. Previously, security checks were only performed on the immediate caller, but with **StackWalker**, the entire call stack can be examined for more comprehensive security.

For more details, refer to the [Stack Walking API guide](https://www.sitepoint.com/deep-dive-into-java-9s-stack-walking-api/). This ensures that all potential vulnerabilities along the call chain are addressed, as demonstrated by the **CVE-2012-4681** exploit. In this vulnerability, issues with caller-sensitive methods in Java were exploited, leading to attacks, but since Java 8, the `@CallerSensitive` annotation has helped safeguard such methods.

#### The Problem with Blacklist-Based Security and the Need for Whitelisting

Traditional blacklist-based security approaches focus on blocking specific dangerous elements but often fail to cover all attack vectors. For instance, blacklisting certain methods or classes can easily be bypassed by attackers who find alternate methods that aren't blocked.

**Expression Language Injection** and other dynamic code execution attacks frequently exploit this limitation. As demonstrated in the [Blackhat JSON Attacks](https://www.blackhat.com/docs/us-17/thursday/us-17-Munoz-Friday-The-13th-Json-Attacks.pdf), blacklist filtering methods can be bypassed, and attackers can execute malicious commands through unblocked pathways.

For this reason, a **whitelisting approach** is generally more effective. Whitelisting only allows access to explicitly trusted classes and methods, while blocking everything else by default. This significantly reduces the risk of code execution through unapproved methods or reflection-based attacks.

#### The Role and Limitations of SecureUberspector

**SecureUberspector** in Apache Velocity is a tool that limits class loading and Reflection, especially in scenarios where untrusted or numerous template writers are involved. It prevents the execution of arbitrary objects and reflection on those objects, enhancing security. However, it has limitations.

For example, in **CVE-2019-17558**, SecureUberspector could not fully block all reflection-based attacks. Particularly, it does not prevent the use of **javax.script.ScriptEngineManager**, which can be exploited to execute arbitrary code. [GHSL-2020-048](https://securitylab.github.com/advisories/GHSL-2020-048-apache-velocity/) demonstrates how attackers can bypass SecureUberspector using this vulnerability:

```java
#set($engine = $scriptEngineManager.getEngineByName("nashorn"))
#engine.eval("java.lang.Runtime.getRuntime().exec('calc')")
```

This script bypasses SecureUberspector and allows remote command execution. Similarly, attackers can bypass security mechanisms using **Groovy** scripts, as noted in the [SecureLayer7 analysis](https://blog.securelayer7.net/analyzing-security-vulnerabilities-in-xwiki-in-depth-examination/).

#### Applying Whitelisting: Concrete Strategies

Whitelisting is the preferred security model, allowing only trusted classes, methods, and objects while blocking all others. Below are specific methods for applying whitelisting in Java.

1. **Using the Security Manager**  
   The Java **Security Manager** can be employed to restrict access to sensitive resources and only allow specific classes or methods to be executed.

   ```java
   System.setSecurityManager(new SecurityManager());

   // Define permissions for trusted methods/classes
   PermissionCollection perms = new Permissions();
   perms.add(new RuntimePermission("accessDeclaredMembers")); // Allow reflection access
   perms.add(new RuntimePermission("createClassLoader")); // Allow class loader creation

   AccessController.doPrivileged(new PrivilegedAction<Void>() {
       public Void run() {
           // Execute only within whitelisted methods
           secureMethod();
           return null;
       }
   }, new AccessControlContext(new ProtectionDomain[] {new ProtectionDomain(null, perms)}));
   ```

2. **Controlling Access with Reflection**  
   When using Reflection, you can manually restrict access to certain classes and methods, rejecting any that are not explicitly allowed.

   ```java
   private static final Set<String> allowedMethods = Set.of(
       "java.lang.String", "java.util.List" // Whitelisted classes
   );

   public static Object invokeMethod(Method method, Object target, Object... args) throws Exception {
       if (!allowedMethods.contains(method.getDeclaringClass().getName())) {
           throw new SecurityException("Unauthorized method invocation: " + method.getName());
       }
       return method.invoke(target, args); // Only whitelisted methods are executed
   }
   ```

3. **Whitelisting in Script Engines**  
   Script engines such as **javax.script.ScriptEngineManager** can also implement whitelisting to ensure that only safe scripts or commands are executed.

   ```java
   ScriptEngine engine = new ScriptEngineManager().getEngineByName("nashorn");
   engine.setBindings(new SimpleBindings(allowedMethods), ScriptContext.ENGINE_SCOPE); // Apply whitelisting
   engine.eval("some safe script here");
   ```

4. **Whitelisting in Template Engines**  
   Tools like SecureUberspector can be configured to enforce a whitelisting approach by limiting access to trusted methods and objects in template engines.

   ```java
   public Iterator getIterator(Object obj, Info i) {
       if (obj != null) {
           SecureIntrospectorControl sic = (SecureIntrospectorControl) introspector;
           if (sic.checkObjectExecutePermission(obj.getClass(), null)) {
               return super.getIterator(obj, i);
           } else {
               log.warn("Cannot retrieve iterator from " + obj.getClass() + " due to security restrictions.");
           }
       }
       return null;
   }
   ```

#### Protecting with StackWalker: Caller Validation

Introduced in Java 9, the **StackWalker API** provides a secure way to inspect the call stack, offering better control over method invocations. StackWalker can be used to ensure that methods are only invoked by trusted callers.

Below is an example using StackWalker to validate the caller of a method:

```java
import java.lang.StackWalker;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class SecurityManagerUtil {
    // Whitelisted caller classes
    private static final Set<String> allowedCallers = Set.of("com.example.TrustedClass");

    public static void checkCaller() {
        List<String> stackTrace = StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE)
                .walk(frames -> frames.map(frame -> frame.getDeclaringClass().getName())
                .collect(Collectors.toList()));

        // If caller is not whitelisted, throw an exception
        boolean isCallerAllowed = stackTrace.stream().anyMatch(allowedCallers::contains);
        if (!isCallerAllowed) {
            throw new SecurityException("Unauthorized caller detected: " + stackTrace);
        }
    }

    public static void secureMethod() {
        checkCaller(); // Verify caller before execution
        System.out.println("Secure method executed.");
    }
}
```

This example ensures that only trusted classes are allowed to invoke `secureMethod()`. If an unauthorized class tries to access the method, an exception is thrown.

#### Conclusion: Proper Use and Protection of Reflection

The Java Reflection API is a flexible and powerful tool, but it introduces significant security risks, especially when combined with template engines like Velocity. **Blacklist-based** approaches are prone to bypasses, while **whitelisting** provides stronger protection by allowing only trusted elements to be executed. Furthermore, leveraging the **StackWalker API** enhances security by validating method invocations and blocking unauthorized access.

By combining whitelisting with tools like StackWalker, you can ensure that your Java applications are more secure and resilient against reflection-based attacks.
<!--stackedit_data:
eyJoaXN0b3J5IjpbLTE2ODg3NTM4N119
-->
