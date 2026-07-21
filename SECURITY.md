# Security policy

## Supported versions

Security fixes are provided for the current 0.3.x release line. After 1.0 promotion, the current 1.0.x line replaces it. Older and prerelease versions may be deprecated when a corrective release is available.

## Reporting

Report vulnerabilities privately with a [GitHub security advisory](https://github.com/le2ni/zplr/security/advisories/new). Do not open a public issue before a coordinated fix is available. Include the affected version, minimal ZPL, impact, runtime, and any proof of resource exhaustion or boundary escape.

The project aims to acknowledge reports within 7 days and provide a status update within 14 days. Timelines vary with severity and reproducibility.

## Trust boundaries

ZPL is untrusted input. ZPLr does not contact printers, execute network/RFID commands, or map printer resource names to host paths. Callers remain responsible for choosing limits appropriate to their service and for constraining user-provided font providers. Browser playground rendering stays local to the browser.

No release may ship with a known high or critical production vulnerability.
