---
'fingerprint-pro-akamai-proxy-integration': patch
---

Serve agent cache hits with `Age: 0` and without the upstream `Cache-Tag`, on APIv3 and APIv4, including hits answered by another Akamai cache tier
