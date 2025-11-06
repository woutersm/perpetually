export type NavItem = {
  name: string;
  to: string;
};

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  links: {
    twitter: string;
  };
  pageSizes: number[];
  defaultPageSize: number;
};

export type FilterOption = {
  value: string;
  label: string;
};

export const licenseTypeEnum = {
  revoke: "REVOKE",
  restrict: "RESTRICT",
} as const;

export const productStatusEnum = {
  active: "ACTIVE",
  pending: "PENDING",
} as const;

export const licenseStatusEnum = {
  inactive: "INACTIVE",
  active: "ACTIVE",
  expired: "EXPIRED",
  disabled: "DISABLED",
  fallback: "FALLBACK",
} as const;

export const apiErrorsEnum = {
  apiKeyInvalid: "Invalid API key",
  noLicenseFound: "No license found",
  noActivationFound: "No activation found",
  licenseDisabled: "License is disabled",
  licenseExpired: "License is expired",
  keyInvalid: "No valid key",
  activationLimitReached: "Activation limit reached",
  noProductFound: "No product found",
} as const;

export const openapiErrors = {
  badRequest: "Bad Request",
  unauthorized: "Unauthorized",
  internalServerError: "Internal server error",
  noProductFound: "No product found",
};
