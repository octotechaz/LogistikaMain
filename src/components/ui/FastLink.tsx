"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

type FastLinkProps = React.ComponentProps<typeof Link> & {
  href: string;
};

export function FastLink({ href, onMouseEnter, onFocus, onTouchStart, ...props }: FastLinkProps) {
  const router = useRouter();
  const prefetchedRef = useRef(false);

  const prefetch = useCallback(() => {
    if (prefetchedRef.current) {
      return;
    }

    prefetchedRef.current = true;
    router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        prefetch();
        onTouchStart?.(event);
      }}
      {...props}
    />
  );
}
