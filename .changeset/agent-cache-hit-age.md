---
'fingerprint-pro-akamai-proxy-integration': patch
---

Serve agent responses with `Age: 0` and without the upstream `Cache-Tag`, on APIv3 and APIv4, so cache hits answered by any Akamai cache tier no longer expose the upstream purge tag
