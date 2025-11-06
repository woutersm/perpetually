import * as Headless from "@headlessui/react";
import { Link as RemixLink, type LinkProps } from "@remix-run/react";
import { forwardRef } from "react";

export const Link = forwardRef(function Link(
  props: LinkProps & React.ComponentPropsWithoutRef<"a">,
  ref: React.ForwardedRef<HTMLAnchorElement>,
) {
  return (
    <Headless.DataInteractive>
      <RemixLink ref={ref} {...props} />
    </Headless.DataInteractive>
  );
});
