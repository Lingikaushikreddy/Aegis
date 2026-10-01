# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub:
**Security → Report a vulnerability** on
[github.com/Lingikaushikreddy/Aegis](https://github.com/Lingikaushikreddy/Aegis/security/advisories/new).
Do not open a public issue. You should get a reply within 7 days.

Useful reports include the version, a description of the impact, and steps or code to
reproduce. Reports about the cryptographic format, key handling, or anything that weakens the
guarantees in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) are especially welcome.

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | yes |
| Aegis v0 platform (`legacy/platform` branch) | no; archived |

## Known compromised material

Before 2026-09-30 this repository contained `certs/key.pem`, a self-signed TLS private key
(CN=localhost, O=Vaulted) used by the archived v0 platform's development servers. It is public
and must be treated as compromised. Never use it. aegis-shred itself does not use TLS
certificates.

## Status

aegis-shred has not had an independent security audit.
