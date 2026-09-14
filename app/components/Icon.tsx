"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export function Icon({ icon, label, className }: { icon: IconDefinition; label?: string; className?: string }) {
  return <FontAwesomeIcon icon={icon} aria-hidden={label ? undefined : true} title={label} className={className} />;
}
