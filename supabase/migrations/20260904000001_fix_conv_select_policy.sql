-- Migration: 20260904000001 — Fix conv_select RLS policy on conversations
--
-- ROOT CAUSE:
--   The original conv_select USING clause used an inline EXISTS subquery:
--
--     EXISTS(SELECT 1 FROM conversation_participants WHERE conversation_id = id ...)
--
--   Inside that subquery, PostgreSQL resolved the unqualified 'id' to
--   conversation_participants.id (the participants PK) rather than the
--   outer conversations.id being protected by the policy. This made the
--   EXISTS condition always FALSE, so no conversation was ever visible
--   to non-admin users — even when the user was a valid participant.
--
-- BROKEN POLICY (preserved for reference):
--   CREATE POLICY "conv_select" ON public.conversations FOR SELECT USING (
--     EXISTS(
--       SELECT 1 FROM public.conversation_participants
--       WHERE conversation_participants.conversation_id = conversation_participants.id  -- ← always FALSE
--         AND conversation_participants.user_id = auth.uid()
--     )
--     OR public.is_admin()
--   );
--
-- FIX:
--   Replace the inline EXISTS with is_conversation_participant(id), where 'id'
--   in the USING clause unambiguously refers to conversations.id.
--   is_conversation_participant is already defined as SECURITY DEFINER,
--   matching the pattern used by the working convpart_select policy.
--
-- SCOPE:
--   Only conv_select is touched. All other policies (conv_insert, convpart_*,
--   msg_*, profiles_*) are unchanged.

DROP POLICY IF EXISTS "conv_select" ON public.conversations;

CREATE POLICY "conv_select" ON public.conversations
  FOR SELECT
  USING (
    is_conversation_participant(id)
    OR is_admin()
  );
