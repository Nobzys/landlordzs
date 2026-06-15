'use client'
import Link from 'next/link'
import { Button, type ButtonProps } from '@/components/ui/button'

// Wraps Button asChild + Link in a client component so that Link is always
// created locally — never deserialized from the RSC payload — before Button's
// isValidElement() check runs. Using Button asChild with a Link child passed
// from a server component causes isValidElement to return false during
// hydration, falling through to the <button> fallback and producing a
// server/client HTML mismatch.
type LinkButtonProps = Omit<ButtonProps, 'asChild'> & {
  href: string
  target?: React.AnchorHTMLAttributes<HTMLAnchorElement>['target']
  rel?: string
}

export function LinkButton({ href, target, rel, children, ...buttonProps }: LinkButtonProps) {
  return (
    <Button {...buttonProps} asChild>
      <Link href={href} target={target} rel={rel}>{children}</Link>
    </Button>
  )
}
