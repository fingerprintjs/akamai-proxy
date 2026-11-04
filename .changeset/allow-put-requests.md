---
'fingerprint-pro-akamai-proxy-integration': patch
---

Allow `PUT` requests on the integration path, so APIv4 `PUT` requests are proxied instead of being rejected by Akamai with `501 Unsupported Request`
