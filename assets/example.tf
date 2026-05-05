resource "random_string" "fpjs_integration_path" {
  length = 8
  special = false
  lower = true
  upper = false
  numeric = true
}

resource "random_string" "fpjs_agent_path" {
  length = 8
  special = false
  lower = true
  upper = false
  numeric = true
}

resource "random_string" "fpjs_result_path" {
  length = 8
  special = false
  lower = true
  upper = false
  numeric = true
}

variable "fpjs_integration_path" {
  type = string
  validation {
    condition = can(regex("(^$|^[a-zA-Z0-9/-]+$)", var.fpjs_integration_path))
    error_message = "Variable value must be a valid URL path"
  }
}

variable "fpjs_agent_path" {
  type = string
  validation {
    condition = can(regex("(^$|^[a-zA-Z0-9-]+$)", var.fpjs_agent_path))
    error_message = "Variable value must be a valid URL path"
  }
}

variable "fpjs_result_path" {
  type = string
  validation {
    condition = can(regex("(^$|^[a-zA-Z0-9-]+$)", var.fpjs_result_path))
    error_message = "Variable value must be a valid URL path"
  }
}

variable "fpjs_proxy_secret" {
  type = string
  validation {
    condition = can(regex("^([a-zA-Z0-9-])+$", var.fpjs_proxy_secret))
    error_message = "Variable value must be obtained from Fingerprint dashboard"
  }
}

locals {
  fpjs_integration_path = var.fpjs_integration_path != "" ? var.fpjs_integration_path : random_string.fpjs_integration_path.result
  fpjs_agent_path = var.fpjs_agent_path != "" ? var.fpjs_agent_path : random_string.fpjs_agent_path.result
  fpjs_result_path = var.fpjs_result_path != "" ? var.fpjs_result_path : random_string.fpjs_result_path.result
  fpjs_integration_path_escaped = replace(replace(var.fpjs_integration_path, "/", "\\\\/"), ".", "\\.")
}

data "akamai_property_rules_template" "rules" {
  template_file = abspath("${path.root}/rules/main.json") # Add fingerprint.json file to your rules children
  variables {
    name  = "fpjs_integration_path"
    value = local.fpjs_integration_path
    type = "string"
  }
  variables {
    name = "fpjs_integration_path_escaped"
    value = local.fpjs_integration_path_escaped
    type = "string"
  }
  variables {
    name  = "fpjs_agent_path"
    value = local.fpjs_agent_path
    type = "string"
  }
  variables {
    name  = "fpjs_result_path"
    value = local.fpjs_result_path
    type = "string"
  }
  variables {
    name  = "fpjs_proxy_secret"
    value = var.fpjs_proxy_secret
    type = "string"
  }
}
