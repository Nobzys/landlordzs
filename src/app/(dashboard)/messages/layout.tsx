import { MessagesShell } from '@/components/messaging/MessagesShell'

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <MessagesShell>{children}</MessagesShell>
}
