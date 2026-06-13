-- Migration: 0016 — Row Level Security (enable + policies for all tables)

-- ─── Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_records               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_videos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_views            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inquiries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_quotations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_contracts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_listings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_milestones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_bids               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings         ENABLE ROW LEVEL SECURITY;

-- ─── profiles ───────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all"    ON public.profiles FOR ALL USING (public.is_admin());

-- ─── verifications ──────────────────────────────────────────────────────────
CREATE POLICY "email_verif_own"  ON public.email_verifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "email_verif_adm"  ON public.email_verifications FOR ALL USING (public.is_admin());
CREATE POLICY "phone_verif_own"  ON public.phone_verifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "kyc_own_select"   ON public.kyc_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "kyc_own_insert"   ON public.kyc_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "kyc_mod_all"      ON public.kyc_records FOR ALL USING (public.is_moderator());

-- ─── user_permissions / sessions ────────────────────────────────────────────
CREATE POLICY "uperm_own"         ON public.user_permissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "uperm_admin"       ON public.user_permissions FOR ALL USING (public.is_admin());
CREATE POLICY "usess_own"         ON public.user_sessions    FOR ALL USING (user_id = auth.uid());

-- ─── agencies ───────────────────────────────────────────────────────────────
CREATE POLICY "agencies_select"  ON public.agencies FOR SELECT USING (is_active OR owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "agencies_insert"  ON public.agencies FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "agencies_update"  ON public.agencies FOR UPDATE USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "agencies_delete"  ON public.agencies FOR DELETE USING (owner_id = auth.uid() OR public.is_admin());

-- ─── agent_profiles ─────────────────────────────────────────────────────────
CREATE POLICY "agent_prof_select" ON public.agent_profiles FOR SELECT USING (true);
CREATE POLICY "agent_prof_own"    ON public.agent_profiles FOR ALL USING (id = auth.uid() OR public.is_admin());

-- ─── properties ─────────────────────────────────────────────────────────────
CREATE POLICY "propcat_select"  ON public.property_categories FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "propcat_admin"   ON public.property_categories FOR ALL USING (public.is_admin());

CREATE POLICY "prop_select"     ON public.properties FOR SELECT USING (
  status = 'active' OR owner_id = auth.uid() OR agent_id = auth.uid() OR public.is_admin()
);
CREATE POLICY "prop_insert"     ON public.properties FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "prop_update"     ON public.properties FOR UPDATE USING (owner_id = auth.uid() OR agent_id = auth.uid() OR public.is_admin());
CREATE POLICY "prop_delete"     ON public.properties FOR DELETE USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "propimg_select"  ON public.property_images FOR SELECT USING (true);
CREATE POLICY "propimg_own"     ON public.property_images FOR ALL USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid()))
  OR public.is_admin()
);
CREATE POLICY "propvid_select"  ON public.property_videos FOR SELECT USING (true);
CREATE POLICY "propvid_own"     ON public.property_videos FOR ALL USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid()))
  OR public.is_admin()
);
CREATE POLICY "propamen_select" ON public.property_amenities FOR SELECT USING (true);
CREATE POLICY "propamen_own"    ON public.property_amenities FOR ALL USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid()))
  OR public.is_admin()
);

CREATE POLICY "propverif_select" ON public.property_verifications FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  OR public.is_moderator()
);
CREATE POLICY "propverif_mod"    ON public.property_verifications FOR ALL USING (public.is_moderator());

CREATE POLICY "propview_insert"  ON public.property_views FOR INSERT WITH CHECK (true);
CREATE POLICY "propview_select"  ON public.property_views FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "propfav_own"      ON public.property_favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY "savedsearch_own"  ON public.saved_searches     FOR ALL USING (user_id = auth.uid());
CREATE POLICY "propinq_insert"   ON public.property_inquiries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "propinq_select"   ON public.property_inquiries FOR SELECT USING (
  sender_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  OR public.is_admin()
);

-- ─── vendors / marketplace ───────────────────────────────────────────────────
CREATE POLICY "vendor_select"   ON public.vendor_profiles FOR SELECT USING (true);
CREATE POLICY "vendor_own"      ON public.vendor_profiles FOR ALL USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "prodcat_select"  ON public.product_categories FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "prodcat_admin"   ON public.product_categories FOR ALL USING (public.is_admin());

CREATE POLICY "prod_select"     ON public.products FOR SELECT USING (is_active OR vendor_id = auth.uid() OR public.is_admin());
CREATE POLICY "prod_insert"     ON public.products FOR INSERT WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "prod_update"     ON public.products FOR UPDATE USING (vendor_id = auth.uid() OR public.is_admin());
CREATE POLICY "prod_delete"     ON public.products FOR DELETE USING (vendor_id = auth.uid() OR public.is_admin());

CREATE POLICY "prodimg_select"  ON public.product_images FOR SELECT USING (true);
CREATE POLICY "prodimg_own"     ON public.product_images FOR ALL USING (
  EXISTS(SELECT 1 FROM public.products WHERE id = product_id AND vendor_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "prodvar_select"  ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "prodvar_own"     ON public.product_variants FOR ALL USING (
  EXISTS(SELECT 1 FROM public.products WHERE id = product_id AND vendor_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "inv_vendor"      ON public.inventory_logs FOR ALL USING (
  EXISTS(SELECT 1 FROM public.products WHERE id = product_id AND vendor_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "cart_own"        ON public.cart_items FOR ALL USING (user_id = auth.uid());

CREATE POLICY "orders_select"   ON public.orders FOR SELECT USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR public.is_admin());
CREATE POLICY "orders_insert"   ON public.orders FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "orders_update"   ON public.orders FOR UPDATE USING (vendor_id = auth.uid() OR public.is_admin());
CREATE POLICY "orderitems_sel"  ON public.order_items FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.orders WHERE id = order_id AND (buyer_id = auth.uid() OR vendor_id = auth.uid()))
  OR public.is_admin()
);

-- ─── professionals ───────────────────────────────────────────────────────────
CREATE POLICY "prof_select"      ON public.professional_profiles FOR SELECT USING (true);
CREATE POLICY "prof_own"         ON public.professional_profiles FOR ALL USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "portitem_select"  ON public.portfolio_items       FOR SELECT USING (true);
CREATE POLICY "portitem_own"     ON public.portfolio_items       FOR ALL USING (professional_id = auth.uid());
CREATE POLICY "portimg_select"   ON public.portfolio_images      FOR SELECT USING (true);
CREATE POLICY "portimg_own"      ON public.portfolio_images      FOR ALL USING (
  EXISTS(SELECT 1 FROM public.portfolio_items WHERE id = portfolio_id AND professional_id = auth.uid())
);

CREATE POLICY "svccat_select"    ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "svccat_admin"     ON public.service_categories FOR ALL USING (public.is_admin());
CREATE POLICY "svclist_select"   ON public.service_listings FOR SELECT USING (is_active OR provider_id = auth.uid() OR public.is_admin());
CREATE POLICY "svclist_insert"   ON public.service_listings FOR INSERT WITH CHECK (provider_id = auth.uid());
CREATE POLICY "svclist_update"   ON public.service_listings FOR UPDATE USING (provider_id = auth.uid() OR public.is_admin());
CREATE POLICY "svcreq_select"    ON public.service_requests FOR SELECT USING (
  status = 'open' OR client_id = auth.uid() OR public.is_moderator()
);
CREATE POLICY "svcreq_insert"    ON public.service_requests FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "svcreq_update"    ON public.service_requests FOR UPDATE USING (client_id = auth.uid() OR public.is_admin());
CREATE POLICY "svcquot_select"   ON public.service_quotations FOR SELECT USING (
  provider_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.service_requests WHERE id = request_id AND client_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "svcquot_insert"   ON public.service_quotations FOR INSERT WITH CHECK (provider_id = auth.uid());
CREATE POLICY "svcquot_update"   ON public.service_quotations FOR UPDATE USING (
  provider_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.service_requests WHERE id = request_id AND client_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "svccont_parties"  ON public.service_contracts FOR ALL USING (
  client_id = auth.uid() OR provider_id = auth.uid() OR public.is_admin()
);
CREATE POLICY "svcbook_parties"  ON public.service_bookings FOR ALL USING (
  client_id = auth.uid() OR provider_id = auth.uid() OR public.is_admin()
);

-- ─── rentals ─────────────────────────────────────────────────────────────────
CREATE POLICY "rentcat_select"   ON public.rental_categories FOR SELECT USING (true);
CREATE POLICY "rentcat_admin"    ON public.rental_categories FOR ALL USING (public.is_admin());
CREATE POLICY "rentlist_select"  ON public.rental_listings FOR SELECT USING (is_available OR owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "rentlist_insert"  ON public.rental_listings FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "rentlist_update"  ON public.rental_listings FOR UPDATE USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "rentbook_parties" ON public.rental_bookings FOR ALL USING (
  renter_id = auth.uid() OR owner_id = auth.uid() OR public.is_admin()
);

-- ─── forum ───────────────────────────────────────────────────────────────────
CREATE POLICY "forumcat_select"  ON public.forum_categories FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "forumcat_admin"   ON public.forum_categories FOR ALL USING (public.is_admin());
CREATE POLICY "forumpost_select" ON public.forum_posts FOR SELECT USING (
  status NOT IN ('hidden','deleted') OR author_id = auth.uid() OR public.is_moderator()
);
CREATE POLICY "forumpost_insert" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "forumpost_update" ON public.forum_posts FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "forumpost_delete" ON public.forum_posts FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "forumcmt_select"  ON public.forum_comments FOR SELECT USING (NOT is_hidden OR author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "forumcmt_insert"  ON public.forum_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "forumcmt_update"  ON public.forum_comments FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "forumcmt_delete"  ON public.forum_comments FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "forumreact_sel"   ON public.forum_reactions FOR SELECT USING (true);
CREATE POLICY "forumreact_own"   ON public.forum_reactions FOR ALL USING (user_id = auth.uid());

-- ─── messaging ───────────────────────────────────────────────────────────────
CREATE POLICY "conv_select"      ON public.conversations FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "conv_insert"      ON public.conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "convpart_select"  ON public.conversation_participants FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.conversation_participants p2 WHERE p2.conversation_id = conversation_id AND p2.user_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "convpart_insert"  ON public.conversation_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "convpart_update"  ON public.conversation_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "msg_select"       ON public.messages FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "msg_insert"       ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "msg_update"       ON public.messages FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "msg_delete"       ON public.messages FOR DELETE USING (sender_id = auth.uid() OR public.is_moderator());
CREATE POLICY "msgatt_select"    ON public.message_attachments FOR SELECT USING (
  EXISTS(
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_id AND cp.user_id = auth.uid()
  )
);
CREATE POLICY "msgatt_insert"    ON public.message_attachments FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.messages WHERE id = message_id AND sender_id = auth.uid())
);

-- ─── notifications ───────────────────────────────────────────────────────────
CREATE POLICY "notifpref_own"    ON public.notification_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "notif_select"     ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update"     ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notif_insert"     ON public.notifications FOR INSERT WITH CHECK (public.is_admin());

-- ─── reviews ─────────────────────────────────────────────────────────────────
CREATE POLICY "review_select"    ON public.reviews FOR SELECT USING (NOT is_hidden OR reviewer_id = auth.uid() OR public.is_moderator());
CREATE POLICY "review_insert"    ON public.reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "review_update"    ON public.reviews FOR UPDATE USING (reviewer_id = auth.uid() OR public.is_moderator());
CREATE POLICY "revresp_select"   ON public.review_responses FOR SELECT USING (true);
CREATE POLICY "revresp_insert"   ON public.review_responses FOR INSERT WITH CHECK (responder_id = auth.uid());
CREATE POLICY "revresp_update"   ON public.review_responses FOR UPDATE USING (responder_id = auth.uid());

-- ─── payments / escrow ───────────────────────────────────────────────────────
CREATE POLICY "wallet_own"       ON public.wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wallet_admin"     ON public.wallets FOR ALL USING (public.is_admin());
CREATE POLICY "wallettx_own"     ON public.wallet_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wallettx_admin"   ON public.wallet_transactions FOR ALL USING (public.is_admin());
CREATE POLICY "tx_select"        ON public.transactions FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid() OR public.is_admin());
CREATE POLICY "tx_insert"        ON public.transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tx_admin"         ON public.transactions FOR UPDATE USING (public.is_admin());
CREATE POLICY "escrow_select"    ON public.escrow_accounts FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid() OR public.is_admin());
CREATE POLICY "escrow_insert"    ON public.escrow_accounts FOR INSERT WITH CHECK (payer_id = auth.uid());
CREATE POLICY "escrow_admin"     ON public.escrow_accounts FOR UPDATE USING (public.is_admin());
CREATE POLICY "escmile_parties"  ON public.escrow_milestones FOR ALL USING (
  EXISTS(SELECT 1 FROM public.escrow_accounts WHERE id = escrow_id AND (payer_id = auth.uid() OR payee_id = auth.uid()))
  OR public.is_admin()
);
CREATE POLICY "escevt_select"    ON public.escrow_events FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.escrow_accounts WHERE id = escrow_id AND (payer_id = auth.uid() OR payee_id = auth.uid()))
  OR public.is_admin()
);
CREATE POLICY "payout_own"       ON public.payouts FOR SELECT USING (recipient_id = auth.uid() OR public.is_admin());
CREATE POLICY "payout_admin"     ON public.payouts FOR ALL USING (public.is_admin());
CREATE POLICY "comm_select"      ON public.commission_records FOR SELECT USING (earner_id = auth.uid() OR public.is_admin());

-- ─── jobs & tenders ──────────────────────────────────────────────────────────
CREATE POLICY "jobs_select"      ON public.jobs FOR SELECT USING (status = 'active' OR poster_id = auth.uid() OR public.is_admin());
CREATE POLICY "jobs_insert"      ON public.jobs FOR INSERT WITH CHECK (poster_id = auth.uid());
CREATE POLICY "jobs_update"      ON public.jobs FOR UPDATE USING (poster_id = auth.uid() OR public.is_admin());
CREATE POLICY "jobapp_select"    ON public.job_applications FOR SELECT USING (
  applicant_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "jobapp_insert"    ON public.job_applications FOR INSERT WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "jobapp_update"    ON public.job_applications FOR UPDATE USING (
  applicant_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "tender_select"    ON public.tenders FOR SELECT USING (status = 'published' OR poster_id = auth.uid() OR public.is_admin());
CREATE POLICY "tender_insert"    ON public.tenders FOR INSERT WITH CHECK (poster_id = auth.uid());
CREATE POLICY "tender_update"    ON public.tenders FOR UPDATE USING (poster_id = auth.uid() OR public.is_admin());
CREATE POLICY "tenderbid_select" ON public.tender_bids FOR SELECT USING (
  bidder_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.tenders WHERE id = tender_id AND poster_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "tenderbid_insert" ON public.tender_bids FOR INSERT WITH CHECK (bidder_id = auth.uid());
CREATE POLICY "tenderbid_update" ON public.tender_bids FOR UPDATE USING (bidder_id = auth.uid() OR public.is_admin());

-- ─── admin & moderation ──────────────────────────────────────────────────────
CREATE POLICY "modreport_select" ON public.moderation_reports FOR SELECT USING (reporter_id = auth.uid() OR public.is_moderator());
CREATE POLICY "modreport_insert" ON public.moderation_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "modreport_update" ON public.moderation_reports FOR UPDATE USING (public.is_moderator());
CREATE POLICY "adminlog_admin"   ON public.admin_logs        FOR ALL USING (public.is_admin());
CREATE POLICY "actlog_select"    ON public.activity_logs     FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "actlog_insert"    ON public.activity_logs     FOR INSERT WITH CHECK (true);
CREATE POLICY "announce_select"  ON public.announcements FOR SELECT USING (
  (is_active AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at >= NOW())) OR public.is_admin()
);
CREATE POLICY "announce_admin"   ON public.announcements   FOR ALL USING (public.is_admin());
CREATE POLICY "settings_select"  ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin"   ON public.platform_settings FOR ALL USING (public.is_admin());
