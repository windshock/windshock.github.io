---
title: "OpenStack Nova 예외 직렬화 패턴: 이론적 RCE 위험과 보안 교훈"
date: 2025-06-10
draft: false
tags: ["OpenStack", "Nova", "RCE", "취약점 분석", "oslo.messaging", "예외 직렬화"]
categories: ["보안 연구", "취약점 분석"]
summary: "OpenStack Nova의 예외 직렬화 메커니즘에서 발생할 수 있는 이론적 원격 코드 실행(RCE) 위험 분석과 여러 PoC, 방어책 제안"
image: "/images/post/ironic-conceptual-architecture.webp"
---

**작성자**: 이형관 (Hyeongkwan Lee)  
**이메일**: windshock@gmail.com  
**GitHub**: [https://github.com/windshock](https://github.com/windshock)  
**LinkedIn**: [https://www.linkedin.com/in/windshock/](https://www.linkedin.com/in/windshock/)  
**블로그**: [https://windshock.github.io](https://windshock.github.io/)

---

**XML-RPC 보안 시리즈**

- [시리즈 1 - XML-RPC 보안 취약점 분석 및 대응 전략](https://windshock.github.io/en/post/2025-03-28-xml-rpc-security-vulnerabilities-analysis-and-mitigation-strategies/)
- [시리즈 2 - CVE-2019-17570: Apache XML-RPC Exploit](https://windshock.github.io/en/post/2025-04-24-cve-2019-17570-apache-xmlrpc/)
- [시리즈 3 - OpenStack Nova 예외 직렬화 패턴: 이론적 RCE 위험과 보안 교훈](https://windshock.github.io/en/post/2025-06-10-rce-via-exception-serialization-in-openstack-nova/)

---

## **개요**

이 보고서는 OpenStack Nova에서 `oslo.messaging` 라이브러리를 사용할 때 발생할 수 있는 예외 직렬화/역직렬화 기반의 이론적 원격 코드 실행(RCE) 위험을 분석합니다.  
실제 환경에서 RCE가 쉽게 발생한다는 주장이 아니라, 보안 담당자와 개발자가 위험한 예외 처리 패턴(anti-pattern)을 인지하고 학습할 수 있도록 돕는 것이 목적입니다.  
실제 OpenStack 환경에서는 모듈 화이트리스트, 메시지 브로커 격리, 안전한 로깅 등 여러 방어장치가 적용되어 있어 실질적 공격 가능성은 매우 낮습니다.  
아래의 PoC(Proof-of-Concept) 시나리오들은 교육적 목적의 예시로, 방어장치가 모두 해제된 비현실적 환경을 가정합니다.

---

## **핵심 요약**

- 예외 직렬화/역직렬화 과정에서, 신뢰할 수 없는 예외 객체가 포맷팅될 때 위험이 발생할 수 있음
- 실제 OpenStack 환경에서는 여러 방어장치로 인해 실질적 RCE 발생 가능성은 극히 낮음
- PoC 코드 및 위험 패턴을 통해, 실무에서 반드시 피해야 할 예외 처리 방식(anti-pattern)을 명확히 제시

---

## **PoC 및 기술 분석**

> **경고: 아래 코드는 교육 및 연구 목적의 예시입니다. 실제 환경에서 실행하지 마세요.**

### PoC 1 – __str__ 오버라이드와 eval(str(e))

```python
class Evil(Exception):
    def __str__(self):
        return "__import__('os').system('touch /tmp/from_str_eval')"

eval(str(Evil()))  # RCE 발생
```

### PoC 2 – 사용자 정의 예외 클래스 임포트 경로 하이재킹

```python
# ironic/common/exception.py 파일에 악성 예외 클래스 작성
class MyException(Exception):
    def __init__(self, msg):
        print("init 실행")
        self.msg = msg
    def __str__(self):
        print("str 실행")
        return f"에러: {self.msg}"

MyException("테스트")
```

### PoC 3 – Race Condition(경쟁 조건) 이론적 예시

```python
import threading
import os
import time
import random
from queue import Queue
import queue  # for queue.Full 예외

hit_count = 0
ex_queue = Queue(maxsize=5)

class Boom(Exception):
    def __str__(self):
        global hit_count
        local_count = hit_count
        print(f"Thread {threading.current_thread().name} 읽기 hit_count={local_count}")
        time.sleep(random.uniform(0.001, 0.003))
        hit_count = local_count + 1
        print(f"Thread {threading.current_thread().name} 설정 hit_count={hit_count}")
        os.system(f"touch /tmp/hacked_race_{hit_count}_thread_{threading.current_thread().name}")
        return f"boom_{hit_count}"

def deserializer():
    global hit_count
    while hit_count < 5:
        ex = Boom()
        print(f"Thread {threading.current_thread().name} Boom 생성")
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
            print(f"Thread {threading.current_thread().name} Boom 가져옴, str 호출")
            str(ex)
            time.sleep(random.uniform(0.001, 0.003))
        except Queue.Empty:
            time.sleep(random.uniform(0.001, 0.003))
            continue

threads = [
    threading.Thread(target=deserializer, name=f"Deserializer-{i}") for i in range(2)
] + [
    threading.Thread(target=serializer, name=f"Serializer-{i}") for i in range(3)
]

for t in threads:
    t.start()
for t in threads:
    t.join(timeout=5)

print("최종 hit_count:", hit_count)
print("생성된 파일:", sorted([f for f in os.listdir("/tmp") if f.startswith("hacked_race_")]))
```

> **참고:** OpenStack의 실제 예외 직렬화/역직렬화 경로에서는 위와 같은 경쟁 조건이 발생하지 않습니다. 이 코드는 파이썬 동시성 이슈를 설명하기 위한 이론적 예시입니다.

---

## **실제 공격 난이도 및 한계**

- 메시지 브로커(RabbitMQ 등) 접근 권한 필요
- 오염된 예외 객체가 실제 포맷팅 단계까지 살아남아야 함
- `allowed_remote_exmods`에 포함된 클래스만 인스턴스화 가능
- 대부분의 로깅 시스템은 `exc_info=True`를 사용하여 안전하게 예외를 기록함

---

## **권고사항**

- `allowed_remote_exmods`를 엄격하게 정의하고 주기적으로 감사
- 예외 객체에 대해 `str()` 또는 `repr()` 직접 호출 금지
- 로깅 시 `exc_info=True` 옵션 사용 권장
- 예외 메시지 내용은 반드시 필터링/정제
- 사용자 정의 예외 클래스를 임포트하지 않고, `RemoteError` 등 안전한 기본 클래스로 대체

---

## **참고자료**

- [OpenStack Trove RPC Security Specification](https://specs.openstack.org/openstack/trove-specs/specs/ocata/secure-oslo-messaging-messages.html)

---

## **결론**

이 보고서는 예외 직렬화/역직렬화 패턴이 이론적으로 RCE로 이어질 수 있는 위험을 분석하지만, 실제 OpenStack 환경에서는 다층 방어로 인해 실질적 공격 가능성은 매우 낮다는 점을 강조합니다.  
핵심은 “위험한 예외 처리 패턴을 인지하고 피하는 것”이며, 이를 통해 분산 Python 시스템의 보안 수준을 한 단계 높일 수 있습니다.

