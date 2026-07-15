import { redirect } from 'next/navigation'

// /moderator is not a real route — moderators share the /admin dashboard.
// This page ensures any stale bookmark or redirect ends up in the right place.
export default function ModeratorRedirectPage() {
  redirect('/admin')
}
