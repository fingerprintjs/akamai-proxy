<p align="center">
  <a href="https://fingerprint.com">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://fingerprintjs.github.io/home/resources/logo_light.svg" />
        <source media="(prefers-color-scheme: light)" srcset="https://fingerprintjs.github.io/home/resources/logo_dark.svg" />
        <img src="https://fingerprintjs.github.io/home/resources/logo_dark.svg" alt="Fingerprint logo" width="312px" />
   </picture>
  </a>
</p>
<p align="center">
<a href="https://github.com/fingerprintjs/akamai-proxy"><img src="https://img.shields.io/github/v/release/fingerprintjs/akamai-proxy" alt="Current version"></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/:license-mit-blue.svg" alt="MIT license"></a>
<a href="https://discord.gg/39EpE2neBg"><img src="https://img.shields.io/discord/852099967190433792?style=logo&label=Discord&logo=Discord&logoColor=white" alt="Discord server"></a>
</p>

# Fingerprint Pro Akamai Proxy Integration

[Fingerprint][fingerprint] is a device intelligence platform offering industry-leading accuracy.

Fingerprint Akamai Proxy Integration is responsible for proxying identification and agent-download requests between your website and Fingerprint through your Akamai infrastructure. The integration consists of a set of property rules you need to add to your Akamai property configuration. The property rules template is available in this repository.

## 🚧 Requirements and expectations

* **Limited to Enterprise plan**: The Akamai Proxy Integration is accessible and exclusively supported for customers on the **Enterprise** Plan. Other customers are encouraged to use [Custom subdomain setup][custom-subdomain-setup] or [Cloudflare Proxy Integration][cloudflare-proxy-integration].

* **Manual updates occasionally required**: The underlying data contract in the identification logic can change to keep up with browser updates. Using the Akamai Proxy Integration might require occasional manual updates on your side. Ignoring these updates will lead to lower accuracy or service disruption.

## How to install with Terraform

> [!NOTE]
> This section assumes you use Terraform to manage your site infrastructure on Akamai and that your site uses the `latest` Akamai rule format.
> * If you do not use Terraform, see  [How to install without Terraform](#how-to-install-using-akamai-property-manager-api-without-terraform).
> * If your Akamai property uses a different rule format, please contact our [support team][support].

This is a quick overview of the installation setup. For detailed step-by-step instructions, see the [Akamai proxy integration guide in our documentation][akamai-guide].

1. Go to Fingerprint **Dashboard** > [**API Keys**][fingerprint-api-keys] and click **Create Proxy Key** to create a proxy secret. You will use it later to authenticate your requests to Fingerprint APIs. 
2. Add the following variable blocks to the Akamai property [Rules template][akamai-ref-rules-template] in your Terraform configuration file. If you are using a plain JSON file instead of a rules template, reach out to our [support team][support].

    ```tf
    # main.tf
    data "akamai_property_rules_template" "rules" {
          # Assuming this is property's rules file
          template_file = "/rules/main.json" 
          variables {
            name  = "fpjs_integration_path"
            value = "YOUR_INTEGRATION_PATH_HERE" # any random string that's a valid URL
            type = "string"
          }
          variables {
            name  = "fpjs_proxy_secret"
            value = "YOUR_PROXY_SECRET_HERE" # Use the proxy secret from the previous step
            type = "string"
          }
    }
    ```

3. Go to this repository [latest releases][latest-releases] and download these two JSON files:
   * `terraform-fingerprint-property-rules.json`
   * `terraform-fingerprint-property-variables.json`
4. Add the files to the `rules` directory of your Terraform project.
5. Reference the files inside your `rules/main.json` file:

    ```json5
    // rules/main.json
    {
      "rules": {
        "name": "default",
        "behaviors": [
          // ...
        ],
        "children": [
          //...
          // Add the downloaded rules file as a child
          "#include:terraform-fingerprint-property-rules.json" 
        ],
        // Add the downloaded variables file (or merge it with existing variables file)
        "variables": "#include:terraform-fingerprint-property-variables.json"
        // ...
      }
    }
    ```

6. Run `terraform plan` to review your changes and `terraform apply` to deploy them.
7. Configure the Fingerprint [JS Agent][js-agent-v4] on your website using the paths defined in Step 2.

    ```javascript
    import * as Fingerprint from '@fingerprint/agent'
    
    const fp = Fingerprint.start({
      apiKey: 'PUBLIC_API_KEY',
      endpoints: 'https://yourwebsite.com/YOUR_INTEGRATION_PATH_HERE',
    });
    ```

See the [Akamai proxy integration guide][akamai-guide-step-3] in our documentation for more details. 

### Building property rules for Terraform locally

If you prefer, you can clone this repository and build the property rules and variables locally.

1. Run `pnpm install`.
2. Run `pnpm build --type terraform`. It will generate the following files you can use in your Terraform configuration as described above.

  - `dist/terraform/terraform-fingerprint-property-rules.json`
  - `dist/terraform/terraform-fingerprint-property-variables.json`
  - `dist/terraform/example.tf`

The JSON files are equivalent to the JSON files available in the [latest releases][latest-releases].

## How to install using Akamai Property Manager API (without Terraform)

You can clone this repository and build the property rules locally into a single `body.json` file. You can then apply them as a patch update to your property configuration using Akamai [Property Manager API][akamai-ref-papi]. This allows you to install the integration in an automated way even if you do not use Terraform.


1. Run `pnpm install`.
2. Run `pnpm build --type patchBody --integration-path YOUR_INTEGRATION_PATH_HERE --agent-path YOUR_AGENT_PATH_HERE --result-path YOUR_RESULT_PATH_HERE --proxy-secret YOUR_PROXY_SECRET_HERE`.
   * Use the same values you would use in [Step 2](#how-to-install-with-terraform) if you were installing with Terraform.
   * The command generates a `dist/patch-body/body.json` file. This file includes all rules and property variables necessary for the integration.
3. Use the [Patch a property's rule tree][akamai-ref-patch-property-version-rules] endpoint of the Akamai Property Manager API to apply the generated JSON to your Akamai property.

For detailed instructions please see the [Deploy Akamai Integration using Property Manager API][akamai-guide-deploy-via-papi] documentation.
  
If you have any questions, reach out to our [support team][support]. 

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.

[akamai-guide]: https://docs.fingerprint.com/docs/akamai-proxy-integration
[akamai-guide-deploy-via-papi]: https://docs.fingerprint.com/docs/deploy-akamai-proxy-integration-via-papi
[akamai-guide-step-3]: https://docs.fingerprint.com/docs/deploy-akamai-proxy-integration-via-terraform#step-3-add-variable-blocks-to-your-rules-template
[akamai-ref-papi]: https://techdocs.akamai.com/property-mgr/reference/api
[akamai-ref-patch-property-version-rules]: https://techdocs.akamai.com/property-mgr/reference/patch-property-version-rules
[akamai-ref-rules-template]: https://techdocs.akamai.com/terraform/docs/pm-ds-rules-template
[cloudflare-proxy-integration]: https://docs.fingerprint.com/docs/cloudflare-integration
[custom-subdomain-setup]: https://docs.fingerprint.com/docs/custom-subdomain-setup
[fingerprint]: https://fingerprint.com
[fingerprint-api-keys]: https://dashboard.fingerprint.com/api-keys
[js-agent-v4]: https://docs.fingerprint.com/reference/js-agent-v4
[latest-releases]: https://github.com/fingerprintjs/akamai-proxy/releases/latest
[support]: https://fingerprint.com/support/