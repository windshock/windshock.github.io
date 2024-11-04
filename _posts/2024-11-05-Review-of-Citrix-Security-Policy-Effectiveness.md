# Review of Citrix Security Policy Effectiveness

## 1. Introduction
Citrix administrators apply security policies to each user’s VDI (Virtual Desktop Infrastructure) through Citrix Group Policy. However, certain structural vulnerabilities in Citrix CSE (Citrix Service Engine) and the Citrix VDI Agent allow for potential bypassing of these security policies.

## 2. Security Policy Bypass

### Bypass through Registry Manipulation
A security policy bypass is possible by manipulating the registry using a race condition that occurs during the Citrix VDI Agent (PicaSvc2.exe) policy storage process. While Citrix has implemented a stealth patch to mitigate this vulnerability, it is still possible to disable security policies by adjusting registry security settings and denying write permissions.

### Forced Termination of CSE
If the Citrix CSE (Citrix Service Engine) is forcibly terminated or deleted, security policies are not applied, potentially allowing unauthorized access to restricted resources.

### GPF File Manipulation
Attempting to bypass security policies by modifying the GPF (Group Policy File) or limiting its permissions is possible, though this method is unstable and has several limitations.

## 3. Bypass via Registry Modification and Write Permission Denial
When a user logs in with a standard account (e.g., User A), Citrix Security Policy settings are created in the registry based on the Windows session ID. Citrix's tendency to prioritize usability over security allows security policies to be bypassed by modifying the registry settings (CdmPolicies, IO, VCPolicies) and denying write permissions for all users. This enables bypassing security policies upon reconnection.

In test environments, automatic logout is triggered if the Citrix security policy registry settings are altered and permissions are restricted. By modifying values such as ClearPassword, Domain, and LogonTicket in the ICA file to arbitrary values (e.g., “test”), local accounts can bypass this automatic logout.

Furthermore, logging in with a local secondary account bypasses forced logout restrictions. Although Citrix limits multi-login sessions, it is possible to complete login by pressing Ctrl-Alt-Del, launching the Task Manager, and terminating the `PicaSessionAgent.exe` process.

Finally, logging in with a local account (e.g., "windshock") allows use of Citrix VDI without Citrix’s security policies, as they are bypassed in Windows Session 1.

## 4. Conclusion
Citrix’s approach to applying security policies seems to prioritize usability, which may enhance user accessibility but also introduces a structural vulnerability that could facilitate policy bypass. Organizations using Citrix should recognize these potential security bypasses and implement additional internal monitoring or alert systems to enable administrators to respond in real-time.

Furthermore, if Citrix were to enforce security policies at a lower system level, such as the Xen Hypervisor, this could help maintain a balance between security and usability while effectively preventing bypass attempts. This would ensure that organizations can achieve both the required security and the accessibility Citrix offers.

## References
- [Citrix Group Policy Troubleshooting for XenApp and XenDesktop](https://www.slideshare.net/slideshow/citrix-group-policy-troubleshooting-for-xenapp-and-xendesktop/41412077)
- [Bypassing Citrix Policy Is Not A Vulnerability, But It Can Be A Violation Of The Law](https://windshock.github.io/Bypassing-Citrix-policy-is-not-a-vulnerability,-but-it-can-be-a-violation-of-the-law)
<!--stackedit_data:
eyJoaXN0b3J5IjpbLTE5MDExODk2NzFdfQ==
-->