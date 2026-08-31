'use server'

import { createClient } from '@/lib/supabase/server'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { v4 as uuidv4 } from 'uuid'
import type { ActionResult } from '@/types/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParticipantProfile = {
  id: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
}

export type ConversationParticipant = {
  id: string
  conversation_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  last_read_at: string | null
  is_muted: boolean
  left_at: string | null
  profile: ParticipantProfile | null
}

export type LastMessage = {
  id: string
  content: string
  content_type: string
  sender_id: string
  is_deleted: boolean
  created_at: string
}

export type ConversationWithDetails = {
  id: string
  type: 'direct' | 'group' | 'support'
  title: string | null
  context_type: string | null
  context_id: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  participants: ConversationParticipant[]
  last_message: LastMessage | null
  unread_count: number
}

export type MessageAttachment = {
  id: string
  message_id: string
  // Storage path within the chat-attachments bucket (no separate path column exists
  // in the migration — only url). Use:
  //   supabase.storage.from('chat-attachments').createSignedUrl(attachment.url, 3600)
  // to get a usable download link. Do NOT treat this field as a public HTTP URL.
  url: string
  file_name: string
  file_type: string
  file_size: number | null
  created_at: string
}

export type MessageWithDetails = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  content_type: 'text' | 'image' | 'file' | 'audio' | 'system'
  reply_to_id: string | null
  is_edited: boolean
  edited_at: string | null
  is_deleted: boolean
  deleted_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  sender: ParticipantProfile | null
  attachments: MessageAttachment[]
  reply_to: {
    id: string
    content: string
    is_deleted: boolean
    sender_id: string
  } | null
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, user: null }
  return { supabase, user }
}

// ─── Allowed MIME types for chat attachments (mirrors bucket config in 0019) ──

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
])
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024 // 50 MB — matches bucket file_size_limit

function attachmentContentType(mimeType: string): 'image' | 'audio' | 'file' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

// ─── findExistingDirectConversation (internal) ────────────────────────────────
// Returns the conversation id if a non-archived direct conversation already
// exists between the two users, so createConversation can return it without
// creating a duplicate.

async function findExistingDirectConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  userId: string,
  recipientId: string,
): Promise<string | null> {
  const { data: myConvs } = await sb
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)
    .is('left_at', null)

  if (!myConvs || myConvs.length === 0) return null

  const myConvIds = (myConvs as { conversation_id: string }[]).map(r => r.conversation_id)

  const { data: shared } = await sb
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', recipientId)
    .in('conversation_id', myConvIds)
    .is('left_at', null)

  if (!shared || shared.length === 0) return null

  const sharedIds = (shared as { conversation_id: string }[]).map(r => r.conversation_id)

  const { data: existing } = await sb
    .from('conversations')
    .select('id')
    .in('id', sharedIds)
    .eq('type', 'direct')
    .eq('is_archived', false)
    .limit(1)
    .maybeSingle()

  return existing?.id ?? null
}

// ─── createConversation ────────────────────────────────────────────────────────
// Creates a direct conversation between the current user and recipientId.
// If a non-archived direct conversation already exists between the same two
// users, returns it without creating a duplicate.
// contextType / contextId link the conversation to a property or order (Task 17.2).

export async function createConversation(params: {
  recipientId: string
  title?: string
  contextType?: string
  contextId?: string
  initialMessage?: string
}): Promise<ActionResult<{ conversationId: string }>> {
  const { supabase, user } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  if (params.recipientId === user.id) {
    return { error: 'Cannot start a conversation with yourself' }
  }

  const { data: recipient } = await sb
    .from('profiles')
    .select('id')
    .eq('id', params.recipientId)
    .maybeSingle()

  if (!recipient) return { error: 'Recipient not found' }

  const existing = await findExistingDirectConversation(sb, user.id, params.recipientId)
  if (existing) return { success: true, data: { conversationId: existing } }

  const { data: conversation, error: convError } = await sb
    .from('conversations')
    .insert({
      type:         'direct',
      title:        params.title         ?? null,
      context_type: params.contextType   ?? null,
      context_id:   params.contextId     ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (convError || !conversation) {
    return { error: convError?.message ?? 'Failed to create conversation' }
  }

  const { error: partError } = await sb
    .from('conversation_participants')
    .insert([
      { conversation_id: conversation.id, user_id: user.id,            role: 'admin'  },
      { conversation_id: conversation.id, user_id: params.recipientId, role: 'member' },
    ])

  if (partError) {
    // Without a DELETE RLS policy on conversations, cleanup of the orphaned row
    // is not possible via the user client. The row is invisible to both parties
    // (no participant rows exist) so it does not affect UX.
    return { error: partError.message ?? 'Failed to add participants' }
  }

  if (params.initialMessage?.trim()) {
    await sb.from('messages').insert({
      conversation_id: conversation.id,
      sender_id:       user.id,
      content:         params.initialMessage.trim(),
      content_type:    'text',
    })
  }

  return { success: true, data: { conversationId: conversation.id } }
}

// ─── getConversations ──────────────────────────────────────────────────────────
// Returns all non-archived conversations the current user participates in,
// enriched with participant profiles, last message preview, and unread count.
//
// Unread count is computed in application code from the most recent 500 messages
// across all conversations, which is accurate for typical volumes. High-volume
// conversations (>500 messages since last read) may show a capped count.

export async function getConversations(): Promise<ConversationWithDetails[]> {
  const { supabase, user } = await requireAuth()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Step 1: user's active participations
  const { data: myParts, error: myPartsError } = await sb
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id)
    .is('left_at', null)

  if (myPartsError || !myParts || myParts.length === 0) return []

  type MyPart = { conversation_id: string; last_read_at: string | null }
  const myPartsTyped = myParts as MyPart[]
  const convIds = myPartsTyped.map(p => p.conversation_id)
  const myReadMap = new Map<string, string | null>(
    myPartsTyped.map(p => [p.conversation_id, p.last_read_at])
  )

  // Step 2: conversations
  const { data: conversations, error: convsError } = await sb
    .from('conversations')
    .select('id, type, title, context_type, context_id, is_archived, created_at, updated_at')
    .in('id', convIds)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  if (convsError || !conversations || conversations.length === 0) return []

  // Step 3: all participants across these conversations
  const { data: allParts } = await sb
    .from('conversation_participants')
    .select('id, conversation_id, user_id, role, joined_at, last_read_at, is_muted, left_at')
    .in('conversation_id', convIds)

  type PartRow = {
    id: string; conversation_id: string; user_id: string
    role: 'admin' | 'member'; joined_at: string; last_read_at: string | null
    is_muted: boolean; left_at: string | null
  }
  const allPartsTyped = (allParts ?? []) as PartRow[]

  // Step 4: batch-fetch profiles for all participant user ids
  const allUserIds = [...new Set(allPartsTyped.map(p => p.user_id))]
  const profileMap = new Map<string, ParticipantProfile>()

  if (allUserIds.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, full_name, display_name, avatar_url, is_verified')
      .in('id', allUserIds)

    for (const p of (profiles ?? []) as ParticipantProfile[]) {
      profileMap.set(p.id, p)
    }
  }

  const partsByConv = new Map<string, ConversationParticipant[]>()
  for (const p of allPartsTyped) {
    const list = partsByConv.get(p.conversation_id) ?? []
    list.push({ ...p, profile: profileMap.get(p.user_id) ?? null })
    partsByConv.set(p.conversation_id, list)
  }

  // Step 5: recent messages — used for last-message preview and unread count.
  // Fetching in one query avoids N+1. Limit 500 covers typical active inboxes.
  const { data: recentMsgs } = await sb
    .from('messages')
    .select('id, conversation_id, content, content_type, sender_id, is_deleted, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })
    .limit(500)

  type RecentMsg = {
    id: string; conversation_id: string; content: string; content_type: string
    sender_id: string; is_deleted: boolean; created_at: string
  }

  const lastMsgMap = new Map<string, LastMessage>()
  const unreadMap  = new Map<string, number>()

  for (const msg of (recentMsgs ?? []) as RecentMsg[]) {
    if (!lastMsgMap.has(msg.conversation_id)) {
      lastMsgMap.set(msg.conversation_id, {
        id:           msg.id,
        content:      msg.is_deleted ? '(Message deleted)' : msg.content,
        content_type: msg.content_type,
        sender_id:    msg.sender_id,
        is_deleted:   msg.is_deleted,
        created_at:   msg.created_at,
      })
    }
    if (msg.sender_id !== user.id && !msg.is_deleted) {
      const myLastRead = myReadMap.get(msg.conversation_id) ?? null
      if (!myLastRead || msg.created_at > myLastRead) {
        unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) ?? 0) + 1)
      }
    }
  }

  type ConvRow = {
    id: string; type: 'direct' | 'group' | 'support'; title: string | null
    context_type: string | null; context_id: string | null
    is_archived: boolean; created_at: string; updated_at: string
  }

  return (conversations as ConvRow[]).map(conv => ({
    id:           conv.id,
    type:         conv.type,
    title:        conv.title,
    context_type: conv.context_type,
    context_id:   conv.context_id,
    is_archived:  conv.is_archived,
    created_at:   conv.created_at,
    updated_at:   conv.updated_at,
    participants: partsByConv.get(conv.id) ?? [],
    last_message: lastMsgMap.get(conv.id) ?? null,
    unread_count: unreadMap.get(conv.id) ?? 0,
  }))
}

// ─── getMessages ───────────────────────────────────────────────────────────────
// Returns messages for a conversation in descending order (newest first) for
// cursor-based pagination. Callers should reverse the array for display.
// Only participants can retrieve messages (enforced by both RLS and explicit check).

export async function getMessages(
  conversationId: string,
  options: { limit?: number; before?: string } = {},
): Promise<MessageWithDetails[]> {
  const { supabase, user } = await requireAuth()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const limit = Math.min(options.limit ?? 50, 100)

  // Explicit participant check — fail fast with empty result before hitting RLS
  const { data: participation } = await sb
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle()

  if (!participation) return []

  // Step 1: messages
  let query = sb
    .from('messages')
    .select(
      'id, conversation_id, sender_id, content, content_type, reply_to_id,' +
      ' is_edited, edited_at, is_deleted, deleted_at, metadata, created_at'
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (options.before) {
    query = query.lt('created_at', options.before)
  }

  const { data: messages, error: msgError } = await query

  if (msgError || !messages || messages.length === 0) return []

  type MsgRow = {
    id: string; conversation_id: string; sender_id: string; content: string
    content_type: string; reply_to_id: string | null; is_edited: boolean
    edited_at: string | null; is_deleted: boolean; deleted_at: string | null
    metadata: Record<string, unknown>; created_at: string
  }
  const msgRows = messages as MsgRow[]
  const msgIds  = msgRows.map(m => m.id)

  // Step 2: batch-fetch sender profiles
  const senderIds = [...new Set(msgRows.map(m => m.sender_id))]
  const profileMap = new Map<string, ParticipantProfile>()

  if (senderIds.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, full_name, display_name, avatar_url, is_verified')
      .in('id', senderIds)

    for (const p of (profiles ?? []) as ParticipantProfile[]) {
      profileMap.set(p.id, p)
    }
  }

  // Step 3: batch-fetch attachments
  const { data: attachments } = await sb
    .from('message_attachments')
    .select('id, message_id, url, file_name, file_type, file_size, created_at')
    .in('message_id', msgIds)

  const attsByMsg = new Map<string, MessageAttachment[]>()
  for (const att of (attachments ?? []) as MessageAttachment[]) {
    const list = attsByMsg.get(att.message_id) ?? []
    list.push(att)
    attsByMsg.set(att.message_id, list)
  }

  // Step 4: batch-fetch reply-to previews
  const replyToIds = [...new Set(
    msgRows.map(m => m.reply_to_id).filter((id): id is string => id != null)
  )]
  const replyToMap = new Map<string, MessageWithDetails['reply_to']>()

  if (replyToIds.length > 0) {
    const { data: replyTos } = await sb
      .from('messages')
      .select('id, content, is_deleted, sender_id')
      .in('id', replyToIds)

    for (const r of (replyTos ?? []) as { id: string; content: string; is_deleted: boolean; sender_id: string }[]) {
      replyToMap.set(r.id, {
        id:         r.id,
        content:    r.is_deleted ? '(Message deleted)' : r.content,
        is_deleted: r.is_deleted,
        sender_id:  r.sender_id,
      })
    }
  }

  return msgRows.map(msg => ({
    id:              msg.id,
    conversation_id: msg.conversation_id,
    sender_id:       msg.sender_id,
    // Mask content for soft-deleted messages
    content:         msg.is_deleted ? '(Message deleted)' : msg.content,
    content_type:    msg.content_type as MessageWithDetails['content_type'],
    reply_to_id:     msg.reply_to_id,
    is_edited:       msg.is_edited,
    edited_at:       msg.edited_at,
    is_deleted:      msg.is_deleted,
    deleted_at:      msg.deleted_at,
    metadata:        msg.metadata ?? {},
    created_at:      msg.created_at,
    sender:          profileMap.get(msg.sender_id) ?? null,
    // Hide attachments from soft-deleted messages
    attachments:     msg.is_deleted ? [] : (attsByMsg.get(msg.id) ?? []),
    reply_to:        msg.reply_to_id ? (replyToMap.get(msg.reply_to_id) ?? null) : null,
  }))
}

// ─── sendMessage ───────────────────────────────────────────────────────────────

export async function sendMessage(params: {
  conversationId: string
  content: string
  contentType?: 'text' | 'image' | 'file' | 'audio'
  replyToId?: string
}): Promise<ActionResult<{ messageId: string }>> {
  const { supabase, user } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const content = params.content.trim()
  if (!content) return { error: 'Message content cannot be empty' }

  // Explicit participation check — provides a clear error ahead of RLS rejection
  const { data: participation } = await sb
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', params.conversationId)
    .eq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle()

  if (!participation) return { error: 'You are not a participant in this conversation' }

  const { data: msg, error: msgError } = await sb
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id:       user.id,
      content,
      content_type:    params.contentType ?? 'text',
      reply_to_id:     params.replyToId ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (msgError || !msg) {
    return { error: msgError?.message ?? 'Failed to send message' }
  }

  return { success: true, data: { messageId: msg.id } }
}

// ─── markConversationRead ──────────────────────────────────────────────────────

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const { supabase, user } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { error } = await sb
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .is('left_at', null)

  if (error) return { error: error.message ?? 'Failed to mark conversation as read' }

  return { success: true }
}

// ─── deleteMessage ─────────────────────────────────────────────────────────────
// Soft-deletes a message. Content is masked in getMessages / getConversations.
// The sender is the only party who can soft-delete their own messages (RLS: msg_update).

export async function deleteMessage(messageId: string): Promise<ActionResult> {
  const { supabase, user } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { error } = await sb
    .from('messages')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', user.id)

  if (error) return { error: error.message ?? 'Failed to delete message' }

  return { success: true }
}

// ─── uploadAttachment ──────────────────────────────────────────────────────────
// Uploads a file to the chat-attachments bucket (private, 50 MB cap), then:
//   1. Creates a messages row with content = filename, content_type = image|audio|file
//   2. Creates a message_attachments row with url = storage path
//
// Returns the message id, attachment id, and storage path.
// Storage path format: {conversation_id}/{user_id}/{uuid}.{ext}
// This matches the lzs_chatatt_insert policy which requires path[2] = auth.uid().
//
// The url field in message_attachments stores the storage path, not an HTTP URL.
// Generate a signed URL in the component layer:
//   supabase.storage.from('chat-attachments').createSignedUrl(url, 3600)

export async function uploadAttachment(formData: FormData): Promise<ActionResult<{
  messageId: string
  attachmentId: string
  storagePath: string
}>> {
  const { supabase, user } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb             = supabase as any
  const file           = formData.get('file')           as File   | null
  const conversationId = formData.get('conversationId') as string | null
  const replyToId      = formData.get('replyToId')      as string | null

  if (!file || !conversationId) {
    return { error: 'file and conversationId are required' }
  }

  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return { error: 'File type not supported. Allowed: images, PDF, video, audio.' }
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: 'File exceeds the 50 MB limit.' }
  }

  // Verify participant before touching storage
  const { data: participation } = await sb
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle()

  if (!participation) return { error: 'You are not a participant in this conversation' }

  // Path: {conversation_id}/{user_id}/{uuid}.{ext}
  // Matches lzs_chatatt_insert: path[1]=conversation_id, path[2]=user_id
  const ext         = (file.name.split('.').pop() ?? 'bin').toLowerCase()
  const storagePath = `${conversationId}/${user.id}/${uuidv4()}.${ext}`
  const buffer      = Buffer.from(await file.arrayBuffer())

  // Use the user-authenticated client (not admin) so storage RLS is enforced.
  // auth.uid() in the RLS context = user.id from the session cookie.
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKETS.CHAT_ATTACHMENTS)
    .upload(storagePath, buffer, {
      contentType:  file.type,
      cacheControl: '3600',
      upsert:       false,
    })

  if (storageError) {
    return { error: storageError.message ?? 'Failed to upload file' }
  }

  // messages.content is NOT NULL — use filename as content for attachment messages
  const { data: msg, error: msgError } = await sb
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      content:         file.name,
      content_type:    attachmentContentType(file.type),
      reply_to_id:     replyToId ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (msgError || !msg) {
    // Best-effort storage cleanup to avoid orphaned files
    await supabase.storage.from(STORAGE_BUCKETS.CHAT_ATTACHMENTS).remove([storagePath])
    return { error: msgError?.message ?? 'Failed to create message' }
  }

  const { data: attachment, error: attError } = await sb
    .from('message_attachments')
    .insert({
      message_id: msg.id,
      url:        storagePath,
      file_name:  file.name,
      file_type:  file.type,
      file_size:  file.size,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (attError || !attachment) {
    // Message was created — soft-delete it to keep thread consistent
    await sb.from('messages').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    }).eq('id', msg.id)
    return { error: attError?.message ?? 'Failed to record attachment' }
  }

  return {
    success: true,
    data: {
      messageId:    msg.id,
      attachmentId: attachment.id,
      storagePath,
    },
  }
}
