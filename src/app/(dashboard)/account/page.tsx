import { redirect } from 'next/navigation'

// /account has no index UI — send users straight to their wallet.
export default function AccountPage() {
  redirect('/account/wallet')
}
