import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { EscrowList } from '@/components/payments/EscrowList'
import { CreateEscrowForm } from '@/components/payments/CreateEscrowForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const metadata: Metadata = { title: 'Escrow' }

export default async function EscrowPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Escrow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Secure milestone-based payments for property transactions and services
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Escrow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Escrow</DialogTitle>
            </DialogHeader>
            <CreateEscrowForm />
          </DialogContent>
        </Dialog>
      </div>
      <EscrowList />
    </div>
  )
}
