import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-extrabold text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to homepage
          </Link>
          <Link
            href="/properties"
            className="inline-flex items-center justify-center rounded-md border px-5 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Browse properties
          </Link>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          <span className="font-extrabold tracking-tight text-primary">LANDLORD</span>
          <span className="font-extrabold tracking-tight text-destructive">ZS</span>
        </p>
      </div>
    </div>
  )
}
