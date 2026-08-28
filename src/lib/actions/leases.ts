'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/types/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeaseRow {
  id:             string
  property_id:    string
  owner_id:       string
  manager_id:     string | null
  tenant_id:      string
  assignment_id:  string | null
  status:         'draft' | 'active' | 'expired' | 'terminated'
  monthly_rent:   number
  deposit_amount: number
  start_date:     string
  end_date:       string | null
  terms:          string | null
  notes:          string | null
  activated_at:   string | null
  terminated_at:  string | null
  created_at:     string
  updated_at:     string
  property?: {
    id:      string
    title:   string
    city:    string
    address: string | null
  } | null
  tenant?: {
    id:           string
    full_name:    string | null
    display_name: string | null
    email:        string
    phone:        string | null
    avatar_url:   string | null
  } | null
  owner?: {
    id:           string
    full_name:    string | null
    display_name: string | null
    email:        string
  } | null
}

export interface TenantResult {
  id:           string
  full_name:    string | null
  display_name: string | null
  email:        string
}

export interface ManagedProperty {
  id:    string
  title: string
  city:  string
}

// ─── Find tenant by email ──────────────────────────────────────────────────────

export async function findTenantByEmail(
  email: string,
): Promise<ActionResult<TenantResult>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: tenant } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email, account_status')
    .ilike('email', email.trim())
    .single()

  if (!tenant) return { error: 'No account found with this email address.' }
  if (tenant.id === user.id) {
    return { error: 'You cannot be the tenant on your own property.' }
  }
  if (tenant.account_status !== 'active') {
    return { error: 'This user account is not yet active on the platform.' }
  }

  return {
    data: {
      id:           tenant.id,
      full_name:    tenant.full_name,
      display_name: tenant.display_name,
      email:        tenant.email,
    },
  }
}

// ─── Create a draft lease agreement ──────────────────────────────────────────

export interface CreateLeaseInput {
  propertyId:    string
  tenantId:      string
  monthlyRent:   number
  depositAmount: number
  startDate:     string
  endDate?:      string | null
  terms?:        string | null
}

export async function createLeaseAgreement(
  input: CreateLeaseInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id, role, account_status')
    .eq('id', user.id)
    .single()
  if (!profile || profile.account_status !== 'active') {
    return { error: 'Unauthorized' }
  }

  let ownerId: string
  let managerId: string | null = null
  let assignmentId: string | null = null

  if (['seller', 'agent', 'admin'].includes(profile.role)) {
    // Owner path: verify property ownership
    const { data: property } = await (supabase as any)
      .from('properties')
      .select('id, owner_id')
      .eq('id', input.propertyId)
      .eq('owner_id', user.id)
      .single()
    if (!property) {
      return { error: 'Property not found or you do not own this property.' }
    }
    ownerId = user.id
  } else if (profile.role === 'property_manager') {
    // PM path: verify active assignment for this property
    const { data: assignment } = await (supabase as any)
      .from('property_assignments')
      .select('id, owner_id')
      .eq('property_id', input.propertyId)
      .eq('manager_id', user.id)
      .eq('status', 'active')
      .single()
    if (!assignment) {
      return { error: 'You do not have an active management assignment for this property.' }
    }
    ownerId = assignment.owner_id
    managerId = user.id
    assignmentId = assignment.id
  } else {
    return { error: 'You are not authorised to create lease agreements.' }
  }

  // Validate dates
  if (input.endDate && input.startDate >= input.endDate) {
    return { error: 'End date must be after start date.' }
  }

  // Prevent duplicate active lease
  const { data: existingActive } = await (supabase as any)
    .from('lease_agreements')
    .select('id')
    .eq('property_id', input.propertyId)
    .eq('status', 'active')
    .maybeSingle()
  if (existingActive) {
    return { error: 'This property already has an active lease agreement.' }
  }

  // INSERT via admin client — owner_id is always set server-side from verified auth
  const admin = createAdminClient()
  const { data: newLease, error: insertError } = await (admin as any)
    .from('lease_agreements')
    .insert({
      property_id:    input.propertyId,
      owner_id:       ownerId,
      manager_id:     managerId,
      tenant_id:      input.tenantId,
      assignment_id:  assignmentId,
      status:         'draft',
      monthly_rent:   input.monthlyRent,
      deposit_amount: input.depositAmount ?? 0,
      start_date:     input.startDate,
      end_date:       input.endDate ?? null,
      terms:          input.terms ?? null,
    })
    .select('id')
    .single()
  if (insertError) return { error: insertError.message }

  revalidatePath('/property-manager/tenants')
  revalidatePath(`/seller/listings/${input.propertyId}/leases`)
  return { data: { id: newLease.id } }
}

// ─── Activate a draft lease ───────────────────────────────────────────────────

export async function activateLease(leaseId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: lease } = await (supabase as any)
    .from('lease_agreements')
    .select('id, owner_id, manager_id, status')
    .eq('id', leaseId)
    .single()
  if (!lease) return { error: 'Lease not found.' }
  if (user.id !== lease.owner_id && user.id !== lease.manager_id) {
    return { error: 'You are not authorised to modify this lease.' }
  }
  if (lease.status !== 'draft') {
    return { error: 'Only draft leases can be activated.' }
  }

  const { error } = await (supabase as any)
    .from('lease_agreements')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('id', leaseId)
  if (error) return { error: error.message }

  revalidatePath('/property-manager/tenants')
  revalidatePath('/account/leases')
  return {}
}

// ─── Terminate an active lease ────────────────────────────────────────────────

export async function terminateLease(leaseId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: lease } = await (supabase as any)
    .from('lease_agreements')
    .select('id, owner_id, manager_id, property_id, status')
    .eq('id', leaseId)
    .single()
  if (!lease) return { error: 'Lease not found.' }
  if (user.id !== lease.owner_id && user.id !== lease.manager_id) {
    return { error: 'You are not authorised to terminate this lease.' }
  }
  if (lease.status !== 'active') {
    return { error: 'Only active leases can be terminated.' }
  }

  const { error } = await (supabase as any)
    .from('lease_agreements')
    .update({ status: 'terminated', terminated_at: new Date().toISOString() })
    .eq('id', leaseId)
  if (error) return { error: error.message }

  revalidatePath('/property-manager/tenants')
  revalidatePath(`/seller/listings/${lease.property_id}/leases`)
  revalidatePath('/account/leases')
  return {}
}

// ─── PM: get all actively managed properties (for lease creation form) ────────

export async function getManagedProperties(): Promise<ManagedProperty[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: assignments } = await (supabase as any)
    .from('property_assignments')
    .select('property_id')
    .eq('manager_id', user.id)
    .eq('status', 'active')
  if (!assignments?.length) return []

  const propertyIds = assignments.map((a: any) => a.property_id)
  const { data: properties } = await (supabase as any)
    .from('properties')
    .select('id, title, city')
    .in('id', propertyIds)

  return properties ?? []
}

// ─── PM: get all leases across managed properties ─────────────────────────────

export async function getManagedLeases(): Promise<LeaseRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Step 1: active assignment property IDs for this PM
  const { data: assignments } = await (supabase as any)
    .from('property_assignments')
    .select('property_id')
    .eq('manager_id', user.id)
    .eq('status', 'active')
  if (!assignments?.length) return []

  const propertyIds = assignments.map((a: any) => a.property_id)

  // Step 2: all leases for those properties
  const { data: leases } = await (supabase as any)
    .from('lease_agreements')
    .select('*')
    .in('property_id', propertyIds)
    .order('created_at', { ascending: false })
  if (!leases?.length) return []

  // Step 3: enrich — tenant profiles and property details
  const tenantIds = [...new Set<string>(leases.map((l: any) => l.tenant_id))]
  const uniquePropertyIds = [...new Set<string>(leases.map((l: any) => l.property_id))]

  const { data: tenants } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email, phone, avatar_url')
    .in('id', tenantIds)

  const { data: properties } = await (supabase as any)
    .from('properties')
    .select('id, title, city, address')
    .in('id', uniquePropertyIds)

  const tenantMap:   Record<string, any> = Object.fromEntries((tenants    ?? []).map((t: any) => [t.id, t]))
  const propertyMap: Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))

  return leases.map((l: any) => ({
    ...l,
    tenant:   tenantMap[l.tenant_id]     ?? null,
    property: propertyMap[l.property_id] ?? null,
  }))
}

// ─── Owner: get all leases for a specific property ────────────────────────────

export async function getPropertyLeases(propertyId: string): Promise<LeaseRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Ownership gate
  const { data: property } = await (supabase as any)
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()
  if (!property) return []

  const { data: leases } = await (supabase as any)
    .from('lease_agreements')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
  if (!leases?.length) return []

  // Enrich with tenant profiles
  const tenantIds = [...new Set<string>(leases.map((l: any) => l.tenant_id))]
  const { data: tenants } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email, phone, avatar_url')
    .in('id', tenantIds)

  const tenantMap: Record<string, any> = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]))

  return leases.map((l: any) => ({
    ...l,
    tenant: tenantMap[l.tenant_id] ?? null,
  }))
}

// ─── Tenant: get my own leases ────────────────────────────────────────────────

export async function getMyLeases(): Promise<LeaseRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: leases } = await (supabase as any)
    .from('lease_agreements')
    .select('*')
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })
  if (!leases?.length) return []

  // Enrich with property and owner data
  const propertyIds = [...new Set<string>(leases.map((l: any) => l.property_id))]
  const ownerIds    = [...new Set<string>(leases.map((l: any) => l.owner_id))]

  const { data: properties } = await (supabase as any)
    .from('properties')
    .select('id, title, city, address')
    .in('id', propertyIds)

  const { data: owners } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, display_name, email')
    .in('id', ownerIds)

  const propMap:  Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))
  const ownerMap: Record<string, any> = Object.fromEntries((owners    ?? []).map((o: any) => [o.id, o]))

  return leases.map((l: any) => ({
    ...l,
    property: propMap[l.property_id]  ?? null,
    owner:    ownerMap[l.owner_id]    ?? null,
  }))
}
