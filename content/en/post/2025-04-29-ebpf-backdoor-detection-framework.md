---
title: "Detection Frameworks and Latest Methodologies for eBPF-Based Backdoors"
date: 2025-04-28
draft: false
tags: ["eBPF", "Rootkit Detection", "BPFDoor", "Kernel Security", "Tracee", "LKRG", "Hypervisor Audit", "Forensics"]
categories: ["Linux Security", "Cloud Security", "Advanced Threat Detection"]
summary: "This article analyzes the rise of backdoors and rootkits exploiting eBPF, the detection challenges they pose, and comprehensively summarizes the latest countermeasures and research trends (2023–2025), including Tracee, LKRG, bpftool, and hypervisor-based auditing."
---

![ebpf hook overview](https://ebpf.io/static/99c69bbff092c35b9c83f00a80fed240/fb370/hook-overview.webp)

## **Overview: The Rise of eBPF Backdoors and Detection Challenges**

eBPF (extended BPF) is a powerful technology that allows dynamic injection of programs into the Linux kernel, originally intended for legitimate use cases such as **performance monitoring and security enforcement**​ ([sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=eBPF%20has%20gained%20a%20lot,specified%29%20kernel%20events%20occur))​ ([sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=In%20fact%2C%20in%20the%20many,and%20also%20enforce%20security%20policies)). However, in recent years, attackers have increasingly **abused eBPF to develop backdoors and rootkits**, making eBPF a *double-edged sword* in the security landscape​ ([aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=protect%20organizations,malicious%20usage%20of%20the%20eBPF)).  
Since 2023, several rootkits (`ebpfkit`, `TripleCross`) and malware (`Pamspy`) utilizing eBPF have emerged, enabling **malicious activities** such as credential theft and firewall evasion​ ([aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=protect%20organizations,malicious%20usage%20of%20the%20eBPF)).  
Because eBPF-based backdoors operate at the kernel level, they are **extremely difficult to detect** and are often missed by traditional security tools​ ([trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=difficult%20to%20detect%20due%20to,protection%20solutions%20in%20Linux%20and))​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Detection)).  
In this article, we comprehensively summarize open detection frameworks, tools, the latest research trends, challenges, strategies, case studies, and practical utilities for dealing with eBPF-based backdoors.
## **Detection Challenges of eBPF Backdoors**

**eBPF backdoors are extremely difficult to detect using traditional rootkit detection methods.**  
Unlike conventional kernel modules, eBPF programs do not appear as separate modules; instead, they execute inside the kernel’s BPF virtual machine, making them **inherently stealthy**.  
For example, the `BPFDoor` backdoor used in APT attacks inserted packet filters into the kernel to **bypass firewall rules** while masquerading as if no network ports were open​ ([trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=difficult%20to%20detect%20due%20to,protection%20solutions%20in%20Linux%20and)).  
Once an eBPF rootkit is installed, it can even **manipulate the outputs of system diagnostic tools** to hide its presence​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Detection)).  
According to Red Canary’s analysis, once loaded, eBPF malware can stealthily alter results from tools like `bpftool` and `debugfs`, making post-compromise detection extremely difficult​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Detection)).  
Thus, if detection **fails at the loading stage**, identifying the backdoor afterward becomes extremely challenging—this is the **core difficulty** in detecting eBPF backdoors​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Detection)).

To overcome these challenges, a strategy combining **real-time monitoring** and **post-incident forensic techniques** is essential.  
For example, **kernel-level monitoring tools** that intercept eBPF program loading events can detect malicious eBPF activity **at its inception**​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF)).  
Conversely, if a rootkit is already active, **hypervisor-based** or **memory forensic approaches** must be employed to examine kernel memory externally​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=While%20these%20two%20tools%20provide,is%20believed%20to%20be%20secure)).  
Below, we will explore these **real-time detection frameworks** and **research-driven methodologies**, analyzing their characteristics and limitations in detail.
## **Why Linux Anti-Virus Cannot Cover eBPF Backdoors**

**Conclusion:**  
General-purpose Linux anti-virus solutions cannot detect or block eBPF-based backdoors.

### **Key Reasons**

* **eBPF backdoors are not file-based:**  
  Traditional Linux anti-virus tools are optimized for scanning malicious files in the file system.  
  However, eBPF programs are loaded into the kernel’s BPF subsystem and are executed upon specific events, meaning they do **not exist directly** in the file system.
  
* **Inability to monitor internal kernel activities:**  
  Conventional Linux AV solutions primarily monitor user-space processes and disk I/O activities.  
  eBPF programs operate within kernel space, far beyond the reach of traditional AV monitoring.

* **Potential for information manipulation:**  
  eBPF rootkits can tamper with system calls, process lists, and file lists.  
  Therefore, the data seen by the AV scanner itself may already be **forged**.

* **Inability to detect BPF-level hooks:**  
  Traditional anti-virus scanners cannot capture kernel-level activities like system call table hooking, kprobe/uprobes attachment, or eBPF event interception.

### **Practical Summary**

* **File-based malware** (e.g., web shells, trojans): **Detectable**  
* **Kernel-space eBPF backdoors**: **Not detectable**  
* **Kernel module-based rootkits**: **Not detectable**

> "Linux antivirus solutions fundamentally cannot detect eBPF backdoors.  
> Without kernel-level integrity protection, no output can be trusted."

**Therefore, the use of kernel integrity protection modules like LKRG (Linux Kernel Runtime Guard) is strongly recommended.**
## **Tracee vs LKRG: Their Complementary Roles**

When addressing eBPF backdoors and kernel rootkits, Tracee and LKRG complement each other at different layers.

| Aspect | Tracee | LKRG |
| :----- | :----- | :--- |
| **What is monitored?** | Kernel events (e.g., bpf calls, execve, open) | Kernel object integrity (e.g., syscall table, credentials) |
| **When is monitoring performed?** | Detection upon the occurrence of **attack events** | Detection upon **attempts to tamper** with kernel structures |
| **Detection focus** | System call level | Kernel memory structure level |
| **Primary goal** | Threat hunting (detect anomalies) | Integrity enforcement and protection |
| **Operation method** | Passive event logging and alerting | Active prevention or alerting on integrity violations |
| **Nature** | Incident response-oriented | Incident prevention-oriented |

### **Summary**

* **Tracee** acts as a **security camera**, recording anomalous activities after they happen.  
* **LKRG** serves as **security bars**, actively monitoring kernel structures and preventing tampering.

> "Using only Tracee records incidents but cannot block them.  
> Using only LKRG blocks tampering but leaves no forensic trail.  
> **Using both together provides the strongest protection, combining detection and prevention.**"


## **Simple Script for Detecting BPFDoor-like Behavior: `bpfdoor_detector.sh`**

This is a lightweight script designed to detect processes exhibiting behaviors similar to the **BPFDoor** eBPF backdoor.

### **Script Features**

* Detects processes running with **deleted executables** (`(deleted)` state).
* Filters processes that are using **BPF sockets**.
* **Excludes** legitimate programs that use BPF, such as `tcpdump`, `wireshark`, and `dhclient`.
* Displays **basic network connection information** for suspicious processes.

### **Usage**

```bash
sudo ./bpfdoor_detector.sh
```

* Must be run with **root privileges**.  
* Required commands: `ps`, `grep`, `readlink`, `ss`

### **Full Script Code**

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

### **Cautions**

* This script provides **only lightweight hints** at the process level.
* **Advanced eBPF rootkits can tamper with `/proc`**, so relying solely on this script is **not sufficient**.
* It is **strongly recommended to use this script in combination with kernel integrity protection modules** like LKRG.

> Without kernel integrity protection like LKRG, even detection results may be forged.

## **Checking for eBPF Backdoors in OpenStack Environments**

In OpenStack environments, you can directly inspect eBPF activities occurring on the host OS (KVM Hypervisor), but you cannot directly observe eBPF activities inside guest VMs without additional interaction.
This command allows you to inspect eBPF activities inside guest VMs directly from the host OS in an OpenStack environment:

### **Usage**
openstack server ssh --vm-id "$VM_ID" -- bash -c "$(cat scan_bpf.sh)" > "result_${VM_ID}.txt" 2>&1

### **Inspection Script Using bpftool(scan_bpf.sh)**

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

### **Script Explanation**

* **`bpftool prog show`**: Lists all currently loaded eBPF programs in the kernel. Essential for spotting potentially malicious BPF programs.
* **`bpftool map show`**: Lists all BPF maps. Malicious actors may exploit maps for C2 command control or session management.
* **Checking XDP attachments**:
  * Use `ip link show` to check if any XDP programs are attached to network interfaces.
  * XDP (eXpress Data Path) allows direct packet interception at the NIC (Layer 2) level and may be exploited by backdoors like BPFDoor to manipulate traffic stealthily.
* **Checking TC (Traffic Control) filters**:
  * Use `tc filter show` to check if BPF-based traffic filters are applied to network interfaces.
  * TC filters can be used to selectively manipulate network traffic.

> **Summary**:  
> By inspecting BPF programs, maps, XDP attachments, and TC filters, you can detect traces of eBPF backdoors early from the OpenStack host level.


## **Dealing with eBPF Backdoors in vSphere + VMware NSX Environments**

In vSphere (ESXi) environments, direct inspection inside guest OSs is difficult,  
but NSX allows detection of abnormal behaviors at the **network level**.

### **Possible Detection Strategies**

| Method | Description |
| :----- | :---------- |
| **Using Distributed Firewall (DFW) Rules** | Detect or block unexpected outbound port usage or C2 server connection attempts. |
| **Activating NSX IDS/IPS Features** | Detect communication patterns similar to BPFDoor (e.g., abnormal UDP, ICMP tunneling). |
| **Using Flow Analytics** | Analyze East-West traffic between VMs to detect abnormal communication flows. |
| **Leveraging NSX Threat Intelligence** | If NSX ATP (Advanced Threat Protection) modules are enabled, detect known IOCs (Indicators of Compromise). |

### **Cautions**

* NSX **cannot detect internal kernel tampering**. (Detection is purely from a network perspective.)
* **Separate monitoring inside guest OSs** is still necessary. (e.g., using Tracee, EDR, etc.)

> "**In vSphere environments, the most effective approach is a dual-layered structure:  
> use NSX for network-level anomaly detection, and deploy separate runtime security tools inside guest OSs for kernel monitoring.**"

## **Publicly Available eBPF Backdoor Detection Frameworks and Tools**

Several **open-source tools and frameworks** have recently been developed to detect malicious eBPF activities.  
Here are key tools and their characteristics:

| Tool/Framework | Approach and Features | Remarks |
| :------------- | :-------------------- | :------ |
| **Tracee (Aqua Security)** | An **eBPF-based real-time monitoring tool** that traces kernel events to detect malicious behaviors. Especially captures `bpf_attach` events at the moment an eBPF program attaches to a kprobe/tracepoint, recording ID, name, type, and used helper functions​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF))​ ([aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=Aqua%20Tracee%20%E2%80%93%20Out)). | Open-source (available on GitHub). Developed by Aqua Security for detecting eBPF rootkits and malware. |
| **ebpfkit-monitor** | A specialized tool developed by Datadog researchers (Fournier) that **statically analyzes** eBPF bytecode or **monitors execution** to detect malicious eBPF loading​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=On%20the%20other%20hand%2C%20ebpfkit,Such%20rootkits%20can%20hide%20themselves)). | Open-source (available on GitHub). Originally designed to detect the `ebpfkit` rootkit. |
| **Falco (CNCF/Sysdig)** | A **Host Intrusion Detection System (HIDS)** that uses eBPF to monitor system calls for malicious activities. Recent versions can **monitor `bpf()` syscall invocations** to detect privilege escalation attempts using eBPF​ ([sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20best%20way%20to%20deal,kernel%20and%20detect%20suspicious%20activities)). | Open-source CNCF project. Often used in container/cloud environments with customizable rules. |
| **bpftool (Linux native tool)** | A **built-in BPF debugging/management tool** that lists loaded eBPF programs, maps, and links. Manual inspection using `bpftool prog`, `bpftool map`, etc., can help detect suspicious BPF objects and attachment points​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Use%20,programs)). | Available in Linux 4.x and above. Useful for manual inspections or lightweight scripting. |
| **Volatility eBPF Plugin** | A plugin for the memory forensic tool **Volatility**, allowing **extraction and analysis of eBPF programs from memory dumps** by searching the `prog_idr` structure​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=the%20compiled%20eBPF%20programs,the%20called%20functions%20are%20identified)). Includes a **classifier** to identify potentially malicious programs. | Research-grade tool (released in 2024). Most effective for hypervisor/offline memory dump analysis, as active rootkits can tamper with live systems. |

---

These tools vary in **strengths and use cases**.  
For example, **Tracee** and **Falco** are strong in **real-time detection**, catching the exact moment an eBPF program is loaded or detecting suspicious system call patterns​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF))​ ([sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20best%20way%20to%20deal,kernel%20and%20detect%20suspicious%20activities)).

In contrast, forensic tools like the **Volatility plugin** are valuable for **post-compromise investigations**, enabling detection of stealthy backdoors by analyzing hypervisor-level memory dumps​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=While%20these%20two%20tools%20provide,is%20believed%20to%20be%20secure)).

> **Summary**:  
> Combining these tools according to the situation allows building a **multi-layered eBPF threat detection strategy**.

## **Latest Detection Methodologies (2023–2025) and Research Trends**

Recent **academic papers, security reports, and technical blogs** have introduced various approaches and improvements for detecting eBPF-based backdoors.  
Key methodologies include:

### **1. Real-Time Load Monitoring**

The most effective detection occurs **at the moment an eBPF program is loaded into the kernel**​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=If%20you%20suspect%20there%20may,based%20malware)).

According to Red Canary, if you miss the loading event, detecting eBPF malware becomes **extremely difficult**.  
Thus, EDR (Endpoint Detection and Response) solutions or custom monitoring tools must watch for **`bpf()` syscalls**, **kprobe registrations**, and similar events in real-time​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=If%20you%20suspect%20there%20may,can%E2%80%99t%20trust%20the%20data%20you)).

Aqua Security incorporated `bpf_attach` event monitoring into **Tracee**, enabling automatic detection the moment a malicious eBPF program hooks into a kprobe or uretprobe​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF))​ ([aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=Aqua%20Tracee%20%E2%80%93%20Out)).

In 2023, Aqua detected the **Pamspy malware**, which hijacked PAM authentication using an eBPF uretprobe.  
By capturing the loading event of the `trace_pam_get_a` eBPF program, they identified **plaintext credential theft attempts**​ ([aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=Below%20you%20can%20see%20a,clear%20text%20username%20and%20password)).

> **Summary**:  
> **Kernel event hook monitoring** is becoming a crucial trend in modern EDRs and open-source tools.

---

### **2. Kernel Integrity Checking and Hardening**

Research efforts also focus on embedding **security controls inside the kernel** to block or detect eBPF backdoors proactively.

Recommendations include:

* Enabling `CONFIG_BPF_UNPRIV_DEFAULT_OFF` to prevent unprivileged users from using eBPF​ ([sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20most%20effective%20way%20to,Kprobe%2C%20TC%2C%20and%20so%20on)).
* Restricting `SYS_bpf` syscall usage to root users only.
* Disabling unnecessary options like `CONFIG_BPF_KPROBE_OVERRIDE` and reducing the attack surface by **removing kprobe features** during kernel compilation​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=,programmatically%20disable%20things%20like%20kprobes)).

> These approaches are **preventive**, aiming to reduce the risk before an attack happens.

---

### **3. Hypervisor-Based Auditing**

Host-based detection tools can be **bypassed by rootkits** with kernel-level privileges​ ([blog.thalium.re](https://blog.thalium.re/posts/linux-kernel-rust-module-for-rootkit-detection/#:~:text=to%20place%20our%20EDR%20in,the%20kernel)).

To address this, 2023–2024 research explored **auditing eBPF activities from the hypervisor layer**.

Examples:

* The **HyperBee** framework proposed inspecting eBPF programs loaded in guest OSs **before execution**​ ([conferences.sigcomm.org](https://conferences.sigcomm.org/sigcomm/2023/files/workshop-ebpf/10-HyperBee.pdf#:~:text=Comprehensiveness,and%20their%20user%20space)).
* Another 2024 study showed **snapshotting guest memory** with lightweight hypervisors and using Volatility plugins to extract and classify suspicious eBPF helper functions​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=the%20compiled%20eBPF%20programs,the%20called%20functions%20are%20identified)).

> Hypervisor-based techniques offer a promising path to detect **stealthy rootkits** without relying on compromised guest OSs.

---

### **4. Post-Incident Inspection and Hunting**

If real-time detection fails, **manual threat hunting** becomes necessary.  
Recommendations from recent reports include:

* **Checking for unexpected kprobes**:  
  Inspect `/sys/kernel/debug/kprobes/list` for unusual hooks on unfamiliar functions​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Look%20for%20unexpected%20kprobes%20loaded%3A)).

* **Listing loaded eBPF programs**:  
  Use `bpftool prog` to enumerate in-memory eBPF programs. Pay special attention to suspicious types like `kprobe`​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Use%20,programs)).

* **Checking BPF-linked perf events**:  
  `bpftool perf` can reveal which PIDs have attached probes.

* **Inspecting XDP and TC hooks**:  
  Verify if unexpected XDP programs (`ip link show`) or TC filters (`tc filter show`) are attached.

* **Monitoring the BPF filesystem (`bpffs`)**:  
  Look into `/sys/fs/bpf/` for **pinned objects** that attackers may use for persistence​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Check%20if%20there%20are%20any,BPF%20filesystem)).

* **Checking system logs**:  
  Review `dmesg` for BPF-related warnings, such as unauthorized `bpf()` usage or dangerous helper functions like `bpf_override_return`.

> **Summary**:  
> Modern threat hunting involves **multi-angle system inspection**, collecting any suspicious BPF-related evidence for deep analysis.

---

## **Real-World Case Studies: Detecting and Responding to eBPF Backdoors**

One representative case that highlights the importance of eBPF detection is the **BPFDoor backdoor**.

**BPFDoor** is a Linux backdoor discovered in the late 2010s, which utilized **classic BPF (cBPF) filters** to detect specific **magic packets** and open reverse shells for attackers​ ([trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=BPFDoor%20samples%20load%20classic%20BPF,uniquely%20stand%20for%20specific%20identifiers)).  
Because it bypassed firewall rules and hid network ports from scans, it was dubbed a "**doorless backdoor**."

In 2022, BPFDoor was publicly exposed, and by 2023, APT attackers had enhanced it, making BPF filters even more complex​ ([trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=This%20entry%20shows%20how%20Red,of%20BPFDoor%20in%20infected%20systems)).

**Security vendors used both network-level and host-level indicators** to detect BPFDoor:

* **Trend Micro** updated their products to detect BPFDoor’s BPF filter patterns​ ([trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=difficult%20to%20detect%20due%20to,protection%20solutions%20in%20Linux%20and)).
* They investigated **setsockopt calls inserting BPF filters** and tracked suspicious **raw socket processes**.
* Trend Micro also noted that newer variants increased BPF filter complexity sixfold, indicating ongoing evolution​ ([trendmicro.com](https://www.trendmicro.com/en_us/research/23/g/detecting-bpfdoor-backdoor-variants-abusing-bpf-filters.html#:~:text=From%20a%20technical%20perspective%2C%20the,refer%20to%20the%20same%20technology)).

> **Takeaway**:  
> BPFDoor proved that **BPF-based backdoors are detectable**, but attackers are constantly adapting.

---

Another notable case is the detection of the **Pamspy malware**:

* **Pamspy** exploited an eBPF **uretprobe** to intercept results from authentication functions inside `libpam.so`.
* Aqua Security researchers detected it using their open-source tool **Tracee**.
* The Tracee logs captured detailed information such as the **hooked function name** (`pam_get_authtok`) and **memory offsets**,  
  allowing the detection of **credential theft attempts without needing hidden processes**​ ([aquasec.com](https://www.aquasec.com/blog/detecting-ebpf-malware-with-tracee/#:~:text=Below%20you%20can%20see%20a,clear%20text%20username%20and%20password)).

> **Summary**:  
> **Modern breaches increasingly involve eBPF-based tactics**, and community sharing of tools and case studies is advancing defensive strategies.

## **Response Strategies and Practical Recommendations**

To counter eBPF-based backdoors, **a multilayered detection and prevention strategy is essential**.  
Here are actionable recommendations for practical environments:

### **1. Privilege Management and Hardening**

* **Disable eBPF** entirely via kernel compile options or sysctl settings if not needed​ ([sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20most%20effective%20way%20to,Kprobe%2C%20TC%2C%20and%20so%20on)).
* Restrict `CAP_BPF` capabilities and enforce `CONFIG_BPF_UNPRIV_DEFAULT_OFF`.
* Set `CONFIG_BPF_JIT_ALWAYS_ON` to minimize eBPF JIT exploitation risks.
* Disable unused kprobe/tracepoint features to reduce attack surface​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=,programmatically%20disable%20things%20like%20kprobes)).

---

### **2. Deploy Real-Time Monitoring Tools**

* Deploy **open-source HIDS/EDR tools** that can monitor eBPF-related events.
* **Falco** can track suspicious `bpf()` or `perf_event_open` system calls with rule-based alerts​ ([sysdig.com](https://sysdig.com/blog/ebpf-offensive-capabilities/#:~:text=The%20best%20way%20to%20deal,kernel%20and%20detect%20suspicious%20activities)).
* **Tracee** can log kernel hook events in real time​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=out%3A%20Tracee%20,event%20oc%02curs%20whenever%20an%20eBPF)).
* Consider containerizing these tools for lightweight deployment and **always-on detection**.

---

### **3. Conduct Regular Integrity Checks**

* Schedule regular scans using `bpftool` to **dump the list of loaded eBPF programs**.
* Compare (diff) with previous outputs to identify new or suspicious entries.
* Focus especially on newly appeared `kprobe`, `tracepoint`, or unknown eBPF programs​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Use%20,programs)).
* Regularly inspect `/sys/fs/bpf/` and `/sys/kernel/debug/kprobes/list` for unusual activity​ ([redcanary.com](https://redcanary.com/blog/threat-detection/ebpf-malware/#:~:text=Look%20for%20unexpected%20kprobes%20loaded%3A)).

---

### **4. Prepare Forensic Capabilities**

* Establish **memory forensic procedures** for critical servers.
* Prepare hypervisor-based snapshots or remote memory dump capabilities.
* Use tools like **Volatility plugins** to extract eBPF-related structures post-incident​ ([scitepress.org](https://www.scitepress.org/Papers/2024/124708/124708.pdf#:~:text=While%20these%20two%20tools%20provide,is%20believed%20to%20be%20secure)).
* Memory forensics acts as a **last line of defense** against stealthy eBPF backdoors.

---

### **5. Continuously Update and Share Intelligence**

* Stay updated on the latest security blogs, conferences, and GitHub repositories.
* Actively incorporate new IOCs (Indicators of Compromise) and detection rules.
* Quickly analyze and reflect new backdoor variants or malware samples (e.g., updated BPFDoor variants) into internal security measures.

> **Summary**:  
> eBPF backdoor detection demands **a proactive, multilayered defense** combining real-time monitoring, post-incident validation, preventive hardening, and continuous intelligence updates.  
> Security professionals must leverage eBPF itself to **watch the kernel from within**, turning attackers' tools into defenders' shields.

---

## 📌 Additional Note: Kernel Integrity Validation Must Be Strengthened in National Security Requirements

In the National Security Requirements (South Korea), kernel integrity validation is currently marked as "conditionally mandatory."  
However, for **critical infrastructure**, **public-facing servers**, and **sensitive information servers**,  
it should be treated as an **absolute mandatory** requirement.  
Without kernel integrity validation, it is impossible to prove the security of the system.

- 📄 National security requirements reference (Korean): [Official link from the National Intelligence Service (NIS)](https://www.nis.go.kr/AF/1_7_2_4/view.do?seq=98)

> ※ As of the latest version (Server Common Security Requirements v3.0), integrity validation of the operating system kernel or kernel-level modules is required conditionally.

### Related Materials

| Category | Image |
|:----|:----|
| National Security Requirements Framework | ![National Security Requirements Framework](/images/post/NationalSecurityRequirementsFramework.webp) |
| Kernel Integrity Validation Requirements (Excerpt) | ![Kernel Integrity Validation Item](/images/post/KernelIntegrityValidationItem.webp) |

