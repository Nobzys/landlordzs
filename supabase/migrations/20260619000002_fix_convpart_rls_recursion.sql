-- Fix: "infinite recursion detected in policy for relation conversation_participants"
-- Root cause: convpart_select (20260610000016_rls_policies.sql) queries
-- conversation_participants from inside that table's own SELECT policy via an
-- EXISTS subquery. Postgres refuses to evaluate a policy that requires
-- re-applying RLS to the same relation, and aborts the whole query. Because
-- storage.objects' chat-attachment policies (lzs_chatatt_insert/select) also
-- reference conversation_participants via EXISTS, planning ANY insert into
-- storage.objects — regardless of bucket — pulls in this broken policy and
-- fails with a generic DatabaseInvalidObjectDefinition/503, which is what
-- surfaced as the portfolio-image upload failure.
--
-- Fix: move the same-table lookup into a SECURITY DEFINER helper function.
-- SECURITY DEFINER functions run with the privileges of their owner and do
-- not re-trigger RLS on the table they query, breaking the recursion while
-- preserving the original intent (a user may see a participant row if they
-- are also a participant in that same conversation).

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "convpart_select" ON public.conversation_participants;
CREATE POLICY "convpart_select" ON public.conversation_participants FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_conversation_participant(conversation_id)
  OR public.is_admin()
);

SELECT pg_notify('pgrst', 'reload schema');
