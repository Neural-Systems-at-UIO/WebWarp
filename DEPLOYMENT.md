# WebWarp, LocaliZoom collab apps deployment guide
## OKD
### Image
WebWarp, LocaliZoom collab apps use PHP for IAM code-token exchange. Suggested image is `PHP`, the version that is in use in the actual deployment is https://github.com/sclorg/s2i-php-container/blob/master/7.1 (not available any more, 7.3 is the oldest one still supported at the time of writing)
### HTTPS
Both IAM and the Collaboratory environment mandates securing the route. Actual deployment uses the default "Edge" flavour.
### OIDC configuration
Configuration details are taken from environment variables. With the exception of the two `ebrains_secret_*` variables they are not considered sensitive, but one may find it simpler to put all of them into secure storage for the sake of uniformity.  
(`_ww`=WebWarp, `_lz`=LocaliZoom)
* `ebrains_id_ww=<client-id>`
* `ebrains_secret_ww=<client-secret>`
* `ebrains_redirect_ww=<actual-host>/callback.php`
* `ebrains_id_lz=<client-id>`
* `ebrains_secret_lz=<client-secret>`
* `ebrains_redirect_lz=<actual-host>/callback.php`
* `ebrains_auth=https://iam.ebrains.eu/auth/realms/hbp/protocol/openid-connect/auth`
* `ebrains_token=https://iam.ebrains.eu/auth/realms/hbp/protocol/openid-connect/token`

### Collab app registration
WebWarp launches with `webwarp.php`.  
LocaliZoom collab app launches with `collab.php`.
## Docker
Image is in the `webwarp` project, https://docker-registry.ebrains.eu/harbor/projects/96  
It still requires securing the route, which falls outside the scope of this document.  
Environment variables and app registration are same as above.