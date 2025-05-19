---
title: "eBPF 기반 백도어 탐지 프레임워크와 최신 방법론"
date: 2025-04-28
draft: false
tags: ["Mind", "SKTelecom", "eBPF", "루트킷 탐지", "BPFDoor", "커널 보안", "Tracee", "LKRG", "Hypervisor Audit", "포렌식"]
categories: ["Linux Security", "Cloud Security", "Advanced Threat Detection"]
image: "https://ebpf.io/static/99c69bbff092c35b9c83f00a80fed240/fb370/hook-overview.webp"
featured: true
summary: "eBPF를 악용한 백도어 및 루트킷의 부상과 탐지 난제를 분석하고, Tracee, LKRG, bpftool, Hypervisor 기반 감사 등 최신 대응 방법과 연구 동향(2023~2025)을 종합 정리합니다."
---

![ebpf hook overview](https://ebpf.io/static/99c69bbff092c35b9c83f00a80fed240/fb370/hook-overview.webp)

## **개요: eBPF 백도어의 부상과 탐지 과제**

eBPF(extended BPF)은 리눅스 커널에 동적으로 프로그램을 삽입할 수 있는 강력한 기술로, 원래 성능 모니터링이나 보안 등 **정상적인 용도**로 널리 활용되고 있습니다​[sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=eBPF%20has%20gained%20a%20lot,specified%29%20kernel%20events%20occur)​[sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=In%20fact%2C%20in%20the%20many,and%20also%20enforce%20security%20policies). 그러나 최근 몇 년 사이 공격자들이 **eBPF를 악용한 백도어 및 루트킷**을 개발하면서, eBPF는 보안 측면에서 *양날의 검*이 되었습니다​[aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=protect%20organizations,malicious%20usage%20of%20the%20eBPF). 실제로 2023년 이후 eBPF를 이용한 루트킷(`ebpfkit`, `TripleCross` 등)과 멀웨어(`Pamspy` 등)이 등장하여 암암리에 인증 정보 탈취, 방화벽 우회 등의 **악성 행위**에 활용되고 있습니다​[aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=protect%20organizations,malicious%20usage%20of%20the%20eBPF). 이러한 eBPF 기반 백도어는 커널 레벨에서 동작하기 때문에 **탐지가 매우 까다롭고** 전통적인 보안 도구로는 놓치기 쉽습니다​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=difficult%20to%20detect%20due%20to,protection%20solutions%20in%20Linux%20and)​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Detection). 아래에서는 공개된 탐지 프레임워크와 도구, 최신 연구 동향, 탐지의 어려움과 대응 전략, 실제 사례 및 활용 가능한 도구를 종합적으로 정리합니다.

## **eBPF 백도어의 탐지 어려움**

**eBPF 백도어는 일반적인 루트킷 탐지 방식으로는 식별하기 어렵습니다.** eBPF 프로그램은 기존 커널 모듈과 달리 별도 모듈로 표시되지 않고, 커널의 BPF VM 내에서 실행되므로 **은폐**에 유리합니다. 예를 들어 APT 공격에 사용된 `BPFDoor` 백도어는 커널에 패킷 필터를 삽입하여 **방화벽 규칙을 우회**하면서도 네트워크 포트가 열려 있지 않은 것처럼 위장하여 탐지를 회피했습니다​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=difficult%20to%20detect%20due%20to,protection%20solutions%20in%20Linux%20and). 또한 eBPF 루트킷이 시스템에 설치되고 나면, **시스템 진단 도구의 출력 자체를 조작**하여 자신의 존재를 숨길 수 있습니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Detection). Red Canary 분석에 따르면, eBPF 기반 멀웨어가 일단 로드된 후에는 `bpftool`이나 `debugfs`와 같은 툴의 결과도 신뢰하기 어려울 정도로 교묘하게 숨길 수 있다고 합니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Detection). 따라서 **로드 시점**에 탐지하지 못하면 사후 탐지는 매우 난관이며, 이것이 eBPF 백도어 탐지의 핵심 어려움입니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Detection).

이러한 어려움을 극복하기 위해 **실시간 모니터링**과 **사후 포렌식 기법**을 모두 활용하는 전략이 필요합니다. 예를 들어 **탐지 도구를 커널 수준에서 동작**시켜 eBPF 프로그램의 로딩 이벤트를 가로채면, 악성 eBPF가 활동을 시작하는 **초기에 탐지**할 수 있습니다​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF). 반면, 이미 활성화된 루트킷에 대해서는 **하이퍼바이저나 메모리 포렌식**을 통해 바깥에서 커널 메모리를 검사하는 기법이 고려됩니다​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=While%20these%20two%20tools%20provide,is%20believed%20to%20be%20secure). 아래에서는 이러한 **실시간 탐지 프레임워크**들과 **연구 기반 방법론**을 상세히 살펴보고, 각 접근법의 특징과 한계를 논의합니다.

## **리눅스 백신(Anti-Virus)로 eBPF 백도어가 커버되지 않는 이유**

**결론:** 일반 리눅스 백신(Anti-Virus)으로는 eBPF 기반 백도어를 탐지하거나 차단할 수 없습니다.

### **주요 이유**

* **eBPF 백도어는 파일 기반이 아님**: 리눅스 백신은 파일 시스템 상에 존재하는 악성 파일을 스캔하는데 최적화되어 있습니다. 하지만 eBPF 프로그램은 커널 BPF 서브시스템 안에 로드되어 특정 이벤트에 연결되어 실행되므로, 파일 시스템에는 직접 존재하지 않습니다.  
* **커널 내부 활동은 감시 불가**: 전통적인 리눅스 백신은 유저스페이스 프로세스와 디스크 I/O를 주로 감시합니다. 커널 스페이스에서 동작하는 eBPF 프로그램은 탐지 대상이 아닙니다.  
* **정보 조작 가능성**: eBPF 루트킷은 시스템콜, 프로세스 목록, 파일 목록을 조작할 수 있습니다. 따라서 백신이 보는 정보 자체가 변조되어 있을 수 있습니다.  
* **백신 스캐너는 BPF Hook까지 감지하지 못함**: 시스템콜 테이블 후킹, kprobe/uprobe attach 등 커널 레벨 후킹은 전통 백신의 탐지 범위를 넘어서 있습니다.

### **현실적 결론**

* **파일형 악성코드**(웹쉘, 트로이목마)는 커버 가능  
* **커널 스페이스 eBPF 백도어**는 커버 불가  
* **커널 모듈 기반 루트킷**도 커버 불가

"리눅스 백신은 기본적으로 eBPF 백도어를 탐지할 수 없다. 커널 수준 무결성 보호 없이는 신뢰할 수 없다."

**따라서 LKRG(Linux Kernel Runtime Guard)와 같은 커널 무결성 보호 모듈이 필요합니다.**

---

## **Tracee vs LKRG: 각각의 역할**

eBPF 백도어나 커널 루트킷에 대응할 때, Tracee와 LKRG는 서로 다른 층위를 보완합니다.

| 항목 | Tracee | LKRG |
| ----- | ----- | ----- |
| **무엇을 감시?** | 커널 이벤트 (bpf 호출, execve, open 등) | 커널 객체 무결성 (시스템콜 테이블, 크리덴셜 등) |
| **언제 감시?** | 공격 "행위(Event)" 발생 시 탐지 | 커널 구조 변조 "시도" 발생 시 탐지 |
| **탐지 포인트** | 시스템콜 레벨 | 커널 메모리 구조체 레벨 |
| **초점** | 이상 징후 헌팅 (Hunting) | 무결성 보장 및 방어 (Protection) |
| **방식** | 이벤트 기록 및 경보 (Passive) | 무결성 위반 시 즉시 차단 또는 경고 (Active) |
| **성격** | 사고 후 대응 중심 | 사고 사전 차단 중심 |

### **요약**

* **Tracee**는 이상 행위를 "찍어서" 기록하는 보안 CCTV 역할을 합니다.  
* **LKRG**는 커널 구조 자체를 감시해서 변조를 "막는" 방범창 역할을 합니다.

**둘을 함께 사용할 때 가장 강력한 보호가 가능합니다.**

"Tracee만 쓰면 사고는 기록되지만 막을 수 없고, LKRG만 쓰면 기록은 남지 않는다. 따라서 둘을 병행해야 탐지와 방어가 동시에 이뤄진다."

## **BPFDoor 탐지를 위한 간단한 스크립트: `bpfdoor_detector.sh`**

eBPF 백도어 중 하나인 **BPFDoor**와 유사한 행동을 보이는 프로세스를 탐지하기 위해 설계된 경량 스크립트입니다.

### **스크립트 특징**

* **삭제된 실행파일** `(deleted)` 상태로 실행 중인 프로세스 탐지  
* **BPF 소켓**을 사용하는 프로세스 필터링  
* **정상적인 BPF 사용 프로그램 제외** (`tcpdump`, `wireshark`, `dhclient` 등)  
* **간단한 네트워크 연결 정보 표시**

### **사용법**

sudo ./bpfdoor\_detector.sh

* 반드시 루트 권한으로 실행해야 합니다.  
* 필요 명령어: `ps`, `grep`, `readlink`, `ss`

### **스크립트 코드 전문**

```bash
#!/bin/bash

# BPFDoor-like Suspicious Process Detector

# Check for root permission
if [ "$(id -u)" -ne 0 ]; then
  echo "[!] This script must be run as root."
  exit 1
fi

# Check required commands
for cmd in ps grep readlink ss; do
  if ! command -v $cmd &>/dev/null; then
    echo "[!] $cmd command is required. Please install it first."
    exit 1
  fi
done

echo "[*] Starting focused BPFDoor-like process detection..."

found=0

# Iterate over all PIDs
for pid in $(ls /proc/ | grep -E '^[0-9]+$'); do
  [ -d "/proc/$pid" ] || continue

  exe_path=$(readlink /proc/$pid/exe 2>/dev/null)

  if [[ $exe_path == *"(deleted)" ]]; then
    if [ -r /proc/$pid/net/packet ] && [ -s /proc/$pid/net/packet ]; then
      cmdline=$(ps -p $pid -o cmd= 2>/dev/null)

      if [[ ! $cmdline =~ "tcpdump|wireshark|dhclient" ]]; then
        echo "[!] Suspicious process detected:"
        echo "    - PID: $pid"
        echo "    - Command: $cmdline"
        echo "    - Deleted executable: $exe_path"
        echo "    - BPF socket is active"

        ss -p -n 2>/dev/null | grep "pid=$pid," | awk '{print "    - Network: " $0}'
        echo ""

        found=1
      fi
    fi
  fi

  done

[ $found -eq 0 ] && echo "[*] No suspicious processes found."

echo "[*] Detection completed."
```

### **주의사항**

* 이 스크립트는 프로세스 레벨에서 간단한 힌트만 제공하는 **경량 탐지 도구**입니다.  
* 고급 eBPF 루트킷은 `/proc` 정보까지 조작할 수 있으므로, 이 스크립트만으로는 완전한 보장이 되지 않습니다.  
* **커널 무결성 보호 모듈**(예: LKRG)과 함께 사용할 것을 강력히 권장합니다.

Without kernel integrity protection like LKRG, even detection results can be faked.

## **OpenStack 환경에서의 eBPF 백도어 점검 방법**

OpenStack 환경에서는 호스트 OS(KVM 하이퍼바이저)에서 발생하는 eBPF 활동을 직접 검사할 수 있지만, 추가적인 상호 작용 없이는 게스트 VM 내부의 eBPF 활동을 직접 관찰할 수 없습니다. 다음 명령을 사용하면 OpenStack 환경의 호스트 OS에서 게스트 VM 내부의 eBPF 활동을 직접 검사할 수 있습니다.

### **사용법** 

openstack server ssh --vm-id "$VM_ID" -- bash -c "$(cat scan_bpf.sh)" > "result_${VM_ID}.txt" 2>&1

### **bpftool을 이용한 점검 스크립트(scan_bpf.sh)**

```bash
#!/bin/bash

# List all BPF programs
echo "[*] Listing currently loaded BPF programs..."
bpftool prog show

# List all BPF maps
echo "[*] Listing currently loaded BPF maps..."
bpftool map show

# Optional: Check for unexpected XDP attachments
echo "[*] Checking for XDP programs attached to network interfaces..."
for iface in $(ls /sys/class/net/); do
  ip link show dev "$iface" | grep -q "xdp" && echo "[!] XDP attached: $iface"
done

# Optional: Check for TC filters
echo "[*] Checking for TC filters..."
for iface in $(ls /sys/class/net/); do
  tc filter show dev "$iface" 2>/dev/null | grep -i "bpf" && echo "[!] BPF TC filter detected on: $iface"
done

echo "[*] BPF scan completed."
```

### **스크립트 상세 설명**

* **bpftool prog show**: 현재 커널에 로드되어 있는 eBPF 프로그램 전체 목록을 출력합니다. 악성 BPF 프로그램이 로드되어 있을 수 있으므로 필수 점검 항목입니다.  
* **bpftool map show**: BPF 프로그램이 사용하는 데이터 맵(BPF map)을 모두 출력합니다. C2 명령 제어나 세션 유지에 악용될 수 있는 맵을 탐지하는 데 사용합니다.  
* **XDP (eXpress Data Path) attachment 검사**:  
  * `ip link show` 명령으로 각 네트워크 인터페이스에 XDP 프로그램이 붙어 있는지 검사합니다.  
  * XDP는 NIC(Level 2)에서 바로 패킷을 가로채는 고속 패스 기술로, BPFDoor 같은 백도어가 은밀히 트래픽을 조작하거나 필터링하는 데 사용될 수 있습니다.  
* **TC (Traffic Control) filter 검사**:  
  * `tc filter show` 명령으로 인터페이스에 연결된 BPF 기반 트래픽 필터를 확인합니다.  
  * TC 필터는 네트워크 흐름을 조작하거나 특정 조건에서만 통신을 허용/차단하는 데 악용될 수 있습니다.

요약: bpftool 스크립트는 프로그램, 맵, XDP, TC 필터 네 가지 핵심 지점을 점검하여, OpenStack 호스트 수준에서 eBPF 백도어의 흔적을 조기에 탐지할 수 있습니다.

---

### **추가 고급 방법: Guest OS 공통 패턴 제거 및 이상 징후 필터링**

bpftool을 통해 수집한 모든 BPF 프로그램 정보는 OpenStack Hypervisor(KVM) 기준, 게스트 VM마다 공통적으로 로드된 정상 프로그램들도 포함되어 있습니다.

이때, 모든 Guest OS에 공통적으로 존재하는 정상 eBPF 프로그램은 필터링하고, 튀는(비정상적인) 프로그램만 추출하는 방식으로 점검 효율을 높일 수 있습니다.

#### **간단한 필터링 스크립트 예시**

```bash
#!/bin/bash

# Collect current BPF programs
bpftool prog show > /tmp/bpf_prog_list_all.txt

# Define known common patterns (adjust based on your environment)
COMMON_PATTERNS=("kube-proxy" "cilium" "flannel" "calico" "ovs-vswitchd" "normal VM agent")

# Filter out common entries
grep -v -E "$(IFS='|'; echo "${COMMON_PATTERNS[*]}")" /tmp/bpf_prog_list_all.txt > /tmp/bpf_prog_suspicious.txt

echo "[*] Suspicious BPF programs after filtering:"
cat /tmp/bpf_prog_suspicious.txt
```

#### **설명**

* **COMMON\_PATTERNS**: OpenStack 환경에서 VM들이 공통으로 사용하는 정상적인 BPF 프로그램 이름을 배열로 설정합니다.  
* **grep \-v \-E**: 정상 패턴에 일치하지 않는 항목만 남깁니다.  
* **결과 파일**: `/tmp/bpf_prog_suspicious.txt`에 비정상적으로 보이는 항목만 남겨 분석합니다.

요약: 공통 정상 패턴을 제거하고 튀는 것만 보는 방식으로 필터링하면, OpenStack 호스트 수준에서도 eBPF 백도어를 훨씬 빠르게 식별할 수 있습니다.

---

### **자동 학습 기반 공통 패턴 갱신 (diff 방식)**

시간이 지남에 따라 Guest OS 공통 패턴은 변경될 수 있습니다. 따라서 수동으로 패턴을 관리하는 대신, 과거와 현재의 bpftool 결과를 비교(diff)하여 자동으로 갱신할 수 있습니다.

#### **자동 학습 스크립트 예시**

```bash
#!/bin/bash

BASELINE_FILE="/opt/bpf_baseline.txt"
CURRENT_FILE="/tmp/bpf_current.txt"
NEW_SUSPICIOUS_FILE="/tmp/bpf_diff_suspicious.txt"

# Collect current BPF programs
bpftool prog show > "$CURRENT_FILE"

# If no baseline exists, create one
if [ ! -f "$BASELINE_FILE" ]; then
  echo "[*] No baseline found. Creating initial baseline..."
  cp "$CURRENT_FILE" "$BASELINE_FILE"
  exit 0
fi

# Compare current with baseline
echo "[*] Comparing current BPF programs with baseline..."
diff --unchanged-line-format= --old-line-format= "$BASELINE_FILE" --new-line-format='%L' "$CURRENT_FILE" > "$NEW_SUSPICIOUS_FILE"

echo "[*] Newly detected suspicious BPF programs:"
cat "$NEW_SUSPICIOUS_FILE"
```

#### **설명**

* **BASELINE\_FILE**: 정상적인 BPF 프로그램 목록(기준)을 저장합니다.  
* **CURRENT\_FILE**: 현재 스캔한 BPF 프로그램 목록입니다.  
* **diff** 명령어를 사용해 기준과 현재를 비교하고, 새로운 항목만 추출합니다.  
* 새로운 eBPF 프로그램이 발견되면 바로 탐지할 수 있습니다.

요약: 정기적으로 bpftool 스캔 결과를 저장하고, diff를 통해 변화를 추적하면 자동으로 튀는 프로그램만 선별할 수 있습니다.

---

## **vSphere \+ VMware NSX 환경에서의 eBPF 백도어 대응**

vSphere(ESXi) 환경에서는 게스트 OS 내부 감시는 어렵지만, NSX를 통해 네트워크 단에서 이상 행위를 감지할 수 있습니다.

### **가능한 탐지 방향**

| 방법 | 설명 |
| ----- | ----- |
| **Distributed Firewall(DFW) 규칙 활용** | 예상치 못한 outbound 포트, C2 서버 연결 시도를 탐지하거나 차단 |
| **NSX IDS/IPS 기능 활성화** | BPFDoor 스타일 통신 패턴(비정상 UDP, ICMP 터널링 등)을 탐지 |
| **Flow Analytics 활용** | VM 간 비정상 통신(East-West Movement) 흐름을 NSX가 분석하고 이상 징후 감지 |
| **NSX Threat Intelligence** | NSX ATP(Advanced Threat Protection) 모듈이 활성화된 경우 Known IOC 매칭 가능 |

### **주의사항**

* NSX는 커널 내부 변조를 직접 탐지하지 못합니다. (네트워크 관점에서 탐지)  
* 게스트 OS 내부 이상 행위에 대한 대응은 여전히 필요합니다. (Tracee, EDR 등 추가 권장)

"vSphere 환경에서는 NSX를 활용해 비정상 네트워크 패턴을 탐지하고, 게스트 OS 내부에서는 별도의 런타임 보안 도구로 커널 활동을 모니터링하는 이중 구조가 가장 효과적이다."

## **공개된 eBPF 백도어 탐지 프레임워크 및 도구**

최근 공개된 여러 **오픈소스 도구와 프레임워크**가 eBPF 악성 활용을 탐지하기 위해 개발되었습니다. 주요 도구와 그 특징은 다음과 같습니다:

| 도구/프레임워크 | 접근 방식 및 주요 기능 | 비고 |
| ----- | ----- | ----- |
| **Tracee (Aqua Security)** | eBPF 기반 **실시간 모니터링** 도구로, 커널 이벤트를 추적하여 악성 행위를 탐지. 특히 eBPF 프로그램이 kprobe/tracepoint 등에 **attach되는 순간** 발생하는 `bpf_attach` 이벤트를 포착해 어떤 eBPF 프로그램(ID, 이름, 타입, 사용된 helper 함수 등)이 로드되는지 기록함​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF)​[aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=Aqua%20Tracee%20%E2%80%93%20Out). | 오픈소스 (GitHub 제공)​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=Security%2C%20A,In%202018%2011th). Aqua Security 연구팀이 개발하여 eBPF 루트킷과 멀웨어 탐지에 활용​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF). |
| **ebpfkit-monitor** | Datadog 연구원(Fournier)이 개발한 **전용 탐지 툴**로, eBPF 바이트코드를 **정적 분석**하거나 **실행 시 모니터링**하여 악의적인 eBPF 로딩을 탐지함. 원래 eBPF 루트킷인 `ebpfkit`을 검출하기 위해 설계되었으며, 의심스러운 eBPF 프로그램 로딩을 감시하고 차단 가능​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=On%20the%20other%20hand%2C%20ebpfkit,Such%20rootkits%20can%20hide%20themselves). | 오픈소스 (GitHub 제공). eBPF 루트킷 **ebpfkit** 대응으로 개발​[github.com](https://github.com/Gui774ume/ebpfkit-monitor#:~:text=%60ebpfkit,specifically%20designed%20to%20detect%20ebpfkit). |
| **Falco (CNCF/Sysdig)** | **호스트 침입 탐지(HIDS)** 도구로, eBPF를 통해 시스템 콜 등을 모니터링하여 악성 행위를 탐지. 최근 버전에서는 `bpf()` **시스템콜 호출을 감시**함으로써 권한 상승을 위한 eBPF 악용 시도를 탐지하고 경보를 발생시킬 수 있음​[sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20best%20way%20to%20deal,kernel%20and%20detect%20suspicious%20activities). | 오픈소스 CNCF 프로젝트. 주로 컨테이너/클라우드 환경에서 활용되며, 정책을 설정해 eBPF 관련 이벤트를 추적 가능. |
| **bpftool (리눅스 기본 도구)** | 리눅스 커널에 내장된 **BPF 디버깅/관리 도구**로, 현재 로드된 eBPF 프로그램, 맵, 링크 정보를 나열할 수 있음. 수동 조사 시 `bpftool prog`, `bpftool map`, `bpftool link`, `bpftool perf` 등의 명령으로 **의심스러운 eBPF 프로그램**(예: kprobe 유형 백도어)과 **연결 지점**(어떤 함수에 붙었는지)을 확인 가능​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Use%20,programs)​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=,kretprobe%20func%20inet_csk_accept%20offset%200). | 리눅스 4.x 이상에서 제공. 수동 조사나 스크립트로 활용하여 비정상적 BPF 객체(예: 알 수 없는 이름의 kprobe 프로그램 등) 탐지에 유용​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Look%20for%20unexpected%20kprobes%20loaded%3A)​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Use%20,programs). |
| **Volatility eBPF 플러그인** | 메모리 포렌식 도구 **Volatility**용 플러그인으로, **메모리 덤프에서 eBPF 프로그램을 추출**하고 분석함. 커널 내부의 `prog_idr` 구조체를 탐색하여 로드된 모든 eBPF 바이트코드와 메타데이터(이름, 길이, 타입, 사용 helper 함수 등)를 수집​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=the%20compiled%20eBPF%20programs,the%20called%20functions%20are%20identified)​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=The%20plugin%20output%20lists%20the,points%20to%20the%20compiled%20pro%02gram). 이를 바탕으로 악성 가능성이 높은 eBPF 프로그램을 선별하는 \*\*분류기(classifier)\*\*를 제공. | 연구용 도구 (2024년 학술 연구에서 공개​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=the%20compiled%20eBPF%20programs,loading%20time%2C%20type%2C%20and%20code)​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=While%20these%20two%20tools%20provide,is%20believed%20to%20be%20secure)). 실행 중인 시스템에서는 루트킷에 의해 우회될 수 있으나, **하이퍼바이저나 오프라인 메모리 덤프** 분석에 활용하여 내부 관찰자를 회피한 탐지가 가능함​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=While%20these%20two%20tools%20provide,is%20believed%20to%20be%20secure). |

이들 도구는 각각 **장단점과 적용 범위**가 다릅니다. 예를 들어 **Tracee**와 **Falco**는 **실시간 탐지**에 강점이 있어, eBPF 백도어가 **로드되는 순간** 탐지하거나 실행 중 수상한 시스템콜 패턴을 식별합니다​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF)​[sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20best%20way%20to%20deal,kernel%20and%20detect%20suspicious%20activities). 반면 **Volatility 플러그인**과 같은 포렌식 도구는 *사후 분석*에 유용하며, **이미 설치되어 은신 중인 루트킷**도 하이퍼바이저 수준에서 메모리를 덤프하여 찾아낼 수 있습니다​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=While%20these%20two%20tools%20provide,is%20believed%20to%20be%20secure). 이러한 도구들을 상황에 맞게 조합하면 다층적인 탐지 전략을 구축할 수 있습니다.

## **최신 탐지 방법론 (2023\~2025)과 연구 동향**

최근 공개된 **연구 논문, 보안 보고서, 기술 블로그**에서는 eBPF 백도어 탐지를 위한 다양한 접근법과 개선 사항을 제시하고 있습니다. 주요한 방법론은 다음과 같습니다:

* **실시간 로드 모니터링:** 가장 효과적인 탐지는 eBPF 프로그램이 **커널에 로드될 때** 이루어집니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=If%20you%20suspect%20there%20may,based%20malware). Red Canary에 따르면, eBPF 기반 멀웨어는 로드 시점을 놓치면 탐지가 극도로 어려워지므로 EDR(Endpoint Detection & Response) 솔루션이나 커스텀 모니터링 도구가 **bpf 시스템콜 호출, kprobe 등록** 등의 이벤트를 실시간 감시해야 합니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=If%20you%20suspect%20there%20may,based%20malware)​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=If%20you%20suspect%20there%20may,can%E2%80%99t%20trust%20the%20data%20you). Aqua Security는 이와 관련해 Tracee 도구에 `bpf_attach` 이벤트 모니터링을 추가하여, 악성 eBPF 프로그램이 kprobe/uretprobe 등에 붙는 순간 자동으로 탐지하도록 구현했습니다​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF)​[aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=Aqua%20Tracee%20%E2%80%93%20Out). 실제로 2023년 Aqua 측은 PAM 인증 모듈을 훔쳐보는 **Pamspy 멀웨어**를 Tracee로 탐지해냈는데, `pam_get_authtok` 함수를 후킹한 eBPF uretprobe 프로그램(`trace_pam_get_a`)의 로드 이벤트를 포착함으로써 **평문 크리덴셜 탈취 시도를 적발**할 수 있었습니다​[aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=Below%20you%20can%20see%20a,clear%20text%20username%20and%20password). 이처럼 **커널 내부 이벤트에 대한 훅(hook) 모니터링**은 최신 EDR과 오픈소스 도구에서 중요한 추세입니다.

* **커널 내부 무결성 검사 및 제한:** eBPF 백도어를 원천 차단하거나 탐지하기 위해 **커널 자체에 보안장치**를 두는 연구도 진행되고 있습니다. 예를 들어 Sysdig의 보고는, 최신 커널 설정에서 `CONFIG_BPF_UNPRIV_DEFAULT_OFF`를 통해 비권한 사용자에 의한 eBPF 사용을 막고, **SYS\_bpf 시스템콜을 루트만 사용**하도록 제한하는 것을 권고합니다​[sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20most%20effective%20way%20to,Kprobe%2C%20TC%2C%20and%20so%20on). 또한 eBPF에 의한 커널 함수 변조를 막기 위해 `CONFIG_BPF_KPROBE_OVERRIDE`와 같은 옵션을 비활성화하고, 불필요한 kprobe 기능이나 eBPF 기능은 아예 컴파일 제외하는 식으로 **공격 표면을 줄이는 전략**도 제시됩니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=,programmatically%20disable%20things%20like%20kprobes). 이러한 설정은 탐지라기보다는 **예방적 수단**이지만, eBPF 악용을 사전에 차단함으로써 탐지 부담을 낮추는 효과가 있습니다.

* **하이퍼바이저 기반 감사(Audit):** 호스트 OS 내부에서 동작하는 탐지기는 동일한 커널 권한을 가진 루트킷에 의해 **우회**될 위험이 있습니다​[blog.thalium.re](https://blog.thalium.re/posts/linux-kernel-rust-module-for-rootkit-detection/#:~:text=to%20place%20our%20EDR%20in,the%20kernel). 이를 보완하고자, 2023\~2024년 연구들은 **하이퍼바이저 레벨**에서 게스트의 eBPF 동작을 감사하는 방안을 모색했습니다. 예를 들어 2023년 SIGCOMM 워크숍의 **HyperBee** 연구는, 하이퍼바이저가 게스트 OS에 로드되는 모든 eBPF 프로그램을 **사전에 검사**하도록 하여 악성 코드를 차단하는 프레임워크를 제안했습니다​[conferences.sigcomm.org](https://conferences.sigcomm.org/sigcomm/2023/files/workshop-ebpf/10-HyperBee.pdf#:~:text=Comprehensiveness,and%20their%20user%20space). 마찬가지로 2024년 한 연구에서는 경량 하이퍼바이저를 이용해 **게스트 메모리를 스냅샷**하고, Volatility 플러그인으로 eBPF 프로그램을 추출한 뒤 **의심스러운 helper 함수 호출 여부** 등을 분류하는 기법을 선보였습니다​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=the%20compiled%20eBPF%20programs,the%20called%20functions%20are%20identified)​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=The%20plugin%20output%20lists%20the,points%20to%20the%20compiled%20pro%02gram). 이러한 외부 감사 기법들은 **은폐된 루트킷도 투명하게 들여다볼 수 있다는 점**에서 향후 실용화 가능성이 주목됩니다.

* **시스템 후속 검사 및 헌팅:** 만약 실시간 탐지에 실패했다면, **보안 담당자에 의한 수동 헌팅**과 분석이 필요합니다. 최신 보고서들은 관리자가 의심 상황에서 다음 사항을 점검하라고 조언합니다:

  * **예상치 못한 kprobe 존재 여부:** `/sys/kernel/debug/kprobes/list`를 확인하여 등록된 kprobe 중 평소 시스템에서는 볼 수 없는 후킹 지점이 있는지 살펴봅니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Look%20for%20unexpected%20kprobes%20loaded%3A). 예를 들어 사용자 공간에 로드한 적 없는 함수에 대한 kprobe가 걸려 있다면 루트킷을 의심해야 합니다.

  * **로드된 eBPF 프로그램 나열:** `bpftool prog` 명령으로 현재 메모리에 상주하는 eBPF 프로그램 목록을 확인합니다. 일반적인 시스템에도 `cgroup_skb` 등 몇몇 eBPF 프로그램이 있을 수 있지만, `kprobe` 유형 프로그램이나 이상한 이름/경로로 로드된 것이 있다면 주의해야 합니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Use%20,programs). 또한 `bpftool perf`로 **eBPF가 연결된 퍼프 이벤트(perf event)** 정보를 보면, 어떤 PID가 어떤 커널 함수에 kprobe/uretprobe를 걸었는지 알 수 있어 수상한 후킹을 찾아낼 수 있습니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=,kretprobe%20func%20inet_csk_accept%20offset%200).

  * **네트워크 훅 및 XDP 확인:** `ip link show`로 네트워크 인터페이스에 `XDP` 프로그램이 붙어있는지 (`prog/xdp id ...` 형태) 확인하고​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Look%20for%20loaded%20XDP%20programs,to%20this%20in%20the%20output), `tc filter show`로 **트래픽 필터**에 eBPF가 사용되었는지 검사합니다. 일반적인 시스템에서는 사용되지 않는 XDP나 TC 필터가 활성화되어 있다면 의심해볼 수 있습니다.

  * **BPF 가상파일시스템(bpffs) 점검:** `/sys/fs/bpf/` 디렉토리에 **pinning**된 객체(eBPF 프로그램이나 맵)가 존재하는지 확인합니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Check%20if%20there%20are%20any,BPF%20filesystem). 공격자는 eBPF 객체를 pin시켜 영구 저장해두기도 하므로, 알 수 없는 핀 객체가 있다면 분석이 필요합니다.

  * **시스템 로그 모니터링:** 커널 로그(`dmesg`) 등에 BPF 관련 경고나 오류 메시지가 남았는지 확인합니다. 예를 들어 권한 없는 사용자가 BPF를 시도하다 실패한 로그, 또는 `bpf_override_return` 등의 **위험한 helper 함수 사용 경고**가 기록되었을 수 있습니다.

이상의 방법들은 **2023\~2024년 보안 블로그와 보고서**들에서 공통적으로 권장되는 후속 탐지 기법들입니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Look%20for%20unexpected%20kprobes%20loaded%3A)​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Check%20if%20there%20are%20any,BPF%20filesystem). 핵심은 **시스템 상태를 다각도로 검사하여** eBPF 백도어의 흔적을 찾는 것으로, 일반적인 패턴과 벗어나는 BPF 관련 항목은 모두 수집하여 심층 분석해야 합니다.

## **실제 사례: eBPF 백도어 탐지와 대응**

**BPFDoor 백도어** 사례는 eBPF 탐지의 중요성을 일깨워준 대표적 사건입니다. BPFDoor는 2010년대 후반부터 발견된 리눅스 백도어로, 리눅스의 **클래식 BPF(cBPF) 필터**를 이용해 특정 **매직 패킷**을 감지하면 공격자의 쉘 접속을 열어주는 방식으로 동작했습니다​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=BPFDoor%20samples%20load%20classic%20BPF,uniquely%20stand%20for%20specific%20identifiers)​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=The%20reverse%20connection%20is%20then,it%20opens%20is%20also%20privileged). 방화벽 규칙을 회피하고 포트 스캐닝으로 드러나지 않는 기법 탓에 “문이 없는 백도어”라고도 불렸습니다. 2022년 이 백도어가 공개된 후, 2023년에는 APT 공격자들이 BPF 필터 복잡도를 높이는 등 **백도어를 고도화**하여 계속 활용한 정황이 포착되었습니다​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=This%20entry%20shows%20how%20Red,of%20BPFDoor%20in%20infected%20systems)​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=From%20a%20technical%20perspective%2C%20the,refer%20to%20the%20same%20technology).

보안 업체들은 BPFDoor 탐지를 위해 **네트워크 및 호스트 수준의 징후**를 모두 활용했습니다. 예를 들어 **Trend Micro**는 자사 제품에 BPFDoor의 BPF 필터 패턴을 식별하는 **시그니처**를 추가하여 탐지율을 높였으며​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=difficult%20to%20detect%20due%20to,protection%20solutions%20in%20Linux%20and)​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=Solaris%20operating%20systems%20%28OS%29,Trend%20products%E2%80%99%20monitoring%20and%20detection), 침해 조사 시 **setsockopt로 BPF 필터를 삽입**하는 행위를 로그에서 찾아내거나, 수상한 **raw 소켓을 보유한 프로세스**를 추적하는 방식으로 BPFDoor를 찾아냈습니다. 또한 최신 변종 분석을 통해 **백도어 활성화 트리거 패킷**의 매직 넘버나 BPF 명령어 수 등을 파악함으로써, 이후 샘플에서는 필터 명령이 6배 증가하는 등 진화 양상을 확인하고 방어에 반영했습니다​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=This%20entry%20shows%20how%20Red,of%20BPFDoor%20in%20infected%20systems)​[trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=From%20a%20technical%20perspective%2C%20the,refer%20to%20the%20same%20technology). BPFDoor 사례는 **eBPF 기반 백도어도 면밀히 탐지 가능**함을 보여주었지만, 동시에 공격자들도 대응책을 우회하도록 기법을 꾸준히 업데이트하고 있음을 시사합니다.

다른 실례로 앞서 언급한 **Pamspy** 멀웨어의 탐지 과정이 있습니다. Pamspy는 eBPF **uretprobe**를 이용해 `libpam.so`의 인증 함수 결과를 가로챈 신종 멀웨어인데, Aqua Security 연구진이 **Tracee 오픈소스 도구**로 이 공격을 탐지해 발표했습니다. Tracee의 경고 로그에는 `pam_get_authtok` 함수를 후킹한 eBPF 프로그램의 이름과 메모리 오프셋 등이 기록되었고, 이를 통해 **시스템 내 숨겨진 백도어 프로세스 없이도** eBPF만으로 자격 증명을 유출하는 공격을 식별해낸 사례입니다​[aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=Below%20you%20can%20see%20a,clear%20text%20username%20and%20password). 이처럼 *최신 침해 사례에서는 eBPF 탐지 도구의 활용*이 점점 중요해지고 있으며, 커뮤니티와 업체들이 관련 정보를 공유하면서 방어 전략을 발전시키고 있습니다.

## **대응 전략 및 실용적 권고사항**

eBPF 기반 백도어에 대응하기 위해서는 **다층적인 탐지와 예방 전략**이 요구됩니다. 아래는 실무적으로 적용할 수 있는 권고사항입니다:

* **권한 관리 및 하드닝:** 서버에서 eBPF가 불필요하다면 아예 커널 컴파일 옵션이나 sysctl 설정으로 **비활성화**해놓습니다​[sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20most%20effective%20way%20to,Kprobe%2C%20TC%2C%20and%20so%20on). 특히 비권한 사용자(`CAP_BPF` 권한 미보유)가 eBPF를 사용할 수 없도록 하고, `CONFIG_BPF_JIT_ALWAYS_ON` 등을 통해 eBPF JIT의 악용 가능성을 낮춥니다. 또한 사용하지 않는 kprobe/tracepoint 기능은 꺼두는 것이 좋습니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=,programmatically%20disable%20things%20like%20kprobes).

* **실시간 모니터링 도구 활용:** 운영 환경에 **오픈소스 HIDS/EDR** 도구를 배포하여 eBPF 관련 이벤트를 모니터링합니다. 예를 들어 **Falco**를 사용하면 `bpf()` 시스템콜이나 `perf_event_open` 호출을 룰(rule) 기반으로 감시해 이상 행동을 경고할 수 있고​[sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20best%20way%20to%20deal,kernel%20and%20detect%20suspicious%20activities), **Tracee**를 데몬으로 실행하면 루트킷이 커널에 훅을 거는 순간 상세 정보를 로그로 남길 수 있습니다​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF). 이러한 도구는 가볍게 컨테이너화하여 배포할 수도 있으므로, **상시 탐지 체계**로 활용합니다.

* **정기적 무결성 검사:** 크론(cron) 등을 활용해 일정 주기마다 `bpftool`을 실행하고 **로드된 eBPF 프로그램 목록을 덤프**하도록 스크립트를 구성합니다. 이전 출력과 \*\*비교(diff)\*\*하여 신규로 등장한 프로그램이나 변화가 있는지를 체크하고, 발견 시 보안 담당자에게 알림을 주도록 합니다. 특히 프로덕션 환경에서 평소 로드되지 않는 `kprobe`, `tracepoint` 유형의 프로그램 ID가 새로 생겼다면 즉시 분석이 필요합니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Use%20,programs). 이와 함께 `/sys/fs/bpf` 디렉토리 내용과 `/sys/kernel/debug/kprobes/list`도 정기 확인하면 은밀하게 상주하는 백도어를 걸러내는 데 도움이 됩니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Look%20for%20unexpected%20kprobes%20loaded%3A)​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Check%20if%20there%20are%20any,BPF%20filesystem).

* **포렌식 대비:** 고급 공격에 대비해 **메모리 포렌식 절차**를 마련해 둡니다. 중요 서버에는 가능하다면 **하이퍼바이저 기반 스냅샷**이나 원격 메모리 덤프 수단을 준비하고, 사고 발생 시 Volatility 플러그인 등을 활용해 커널 메모리를 분석함으로써 **루트킷이 숨긴 흔적까지 탐지**할 수 있도록 합니다​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=While%20these%20two%20tools%20provide,is%20believed%20to%20be%20secure). 이러한 포렌식은 최후의 수단이지만, eBPF 백도어처럼 흔적을 남기지 않는 공격에 대한 *마지막 안전망*이 될 수 있습니다.

* **업데이트 및 정보 공유:** eBPF 보안은 최신 연구와 사례 공유가 활발히 이루어지는 분야입니다. 관리자들은 보안 업체의 블로그, 컨퍼런스 자료를 지속적으로 팔로업하여 \*\*최신 IOC(Indicators of Compromise)\*\*와 탐지 룰을 업데이트해야 합니다. 예를 들어 BPFDoor의 새로운 변종에 대응한 시그니처나, GitHub에 공개된 새로운 eBPF 루트킷 샘플 등을 빠르게 입수하여 자체적인 탐지 규칙에 반영해야 합니다.

결론적으로, eBPF 백도어 탐지는 **최신 기술 동향을 반영한 다층적 접근**이 요구됩니다. 실시간 모니터링과 사후 검증, 예방적 하드닝을 조합하여 대응하고, 커뮤니티의 오픈소스 도구와 정보를 적극 활용하는 것이 중요합니다. eBPF는 향후에도 공격자에게 매력적인 도구인 만큼, 수비 측에서도 **eBPF의 힘을 역이용**해 커널을 감시하고 위협을 조기에 차단하는 노력이 필요합니다​[sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20best%20way%20to%20deal,kernel%20and%20detect%20suspicious%20activities). 지속적인 연구 개발과 정보 공유를 통해, 보안 전문가들은 새로운 eBPF 기반 공격 기법에도 한 발 앞선 탐지 능력을 갖추어 나가야 할 것입니다​[redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=come%20to%20better%20understand%20how,how%20best%20to%20detect%20it).

**참고 자료:** 주요 내용은 2023\~2025년에 발표된 공개 자료를 참고하였으며, Aqua Security, Sysdig, Trend Micro, Red Canary 등의 공식 블로그와 학술 연구​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=Rootkits%20based%20on%20eBPF%20programs,to%20detect%20malicious%20eBPF%20programs)​[scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF)를 기반으로 정리되었습니다. 각주에 표시된 출처를 통해 세부 내용을 확인할 수 있습니다.

## 📌 추가 참고: 국가용 보안요구사항에서도 커널 무결성 검증은 강화되어야 합니다

국가용 보안요구사항에서도 커널 무결성 검증은 '조건부 필수'로 규정되어 있습니다.  
하지만 **중요 기반시설, 외부 노출 서버, 중요정보 처리 서버**에서는 선택사항이 아니라 **반드시 필수 요건**으로 강화되어야 합니다.  
커널 무결성 검증 없이는 시스템의 보안성을 스스로 입증할 수 없습니다.

- 📄 National security requirements reference (Korean): [국가정보원 국가용 보안요구사항 공식 링크](https://www.nis.go.kr/AF/1_7_2_4/view.do?seq=98)

> ※ 현재 기준(서버 공통보안요구사항 v3.0)에서는 운영체제 커널 또는 커널 레벨 모듈에 대해 '조건부 필수'로 무결성 검증 기능을 요구하고 있습니다.

### 관련 자료

| 구분 | 이미지 |
|:----|:----|
| 국가용 보안요구사항 체계도 | ![국가용 보안요구사항 체계](/images/post/NationalSecurityRequirementsFramework.webp) |
| 커널 무결성 검증 항목 (서버 공통보안요구사항 발췌) | ![커널 무결성 검증 항목](/images/post/KernelIntegrityValidationItem.webp) |


