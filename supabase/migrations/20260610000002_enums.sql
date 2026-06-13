-- Migration: 0002 — Custom Enum Types
-- Run order: after extensions, before any table creation

CREATE TYPE public.user_role AS ENUM (
  'admin','moderator','buyer','seller','agent',
  'vendor','contractor','engineer','architect','lawyer'
);

CREATE TYPE public.account_status AS ENUM (
  'active','suspended','banned','pending_verification','deactivated'
);

CREATE TYPE public.verification_status AS ENUM (
  'pending','submitted','under_review','approved','rejected','expired'
);

CREATE TYPE public.kyc_level AS ENUM ('none','basic','standard','enhanced');

CREATE TYPE public.property_type AS ENUM (
  'apartment','house','villa','studio','duplex','penthouse',
  'land','commercial_space','office','warehouse','shop','farm'
);

CREATE TYPE public.listing_type AS ENUM (
  'sale','rent','short_term','lease','auction'
);

CREATE TYPE public.property_status AS ENUM (
  'draft','pending_review','active','under_offer',
  'sold','rented','off_market','expired','rejected'
);

CREATE TYPE public.land_title_type AS ENUM (
  'titre_foncier','acte_de_vente','bail_emphyteotique',
  'convention','lettre_attribution','none'
);

CREATE TYPE public.cameroon_city AS ENUM (
  'yaounde','douala','buea','bamenda','limbe','kribi',
  'bafoussam','ngaoundere','maroua','garoua','bertoua',
  'ebolowa','kumba','nkongsamba','edea','other'
);

CREATE TYPE public.transaction_type AS ENUM (
  'property_sale','property_rent','product_purchase','service_payment',
  'rental_payment','subscription','commission','refund','escrow_deposit',
  'escrow_release','wallet_topup','wallet_withdrawal','payout'
);

CREATE TYPE public.payment_provider AS ENUM (
  'mtn_momo','orange_money','stripe','bank_transfer','cash','wallet'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending','processing','completed','failed','cancelled','refunded'
);

CREATE TYPE public.escrow_status AS ENUM (
  'pending','funded','released','disputed','refunded','cancelled'
);

CREATE TYPE public.milestone_status AS ENUM (
  'pending','in_progress','completed','approved','disputed'
);

CREATE TYPE public.order_status AS ENUM (
  'pending','confirmed','processing','shipped','delivered',
  'cancelled','returned','refunded'
);

CREATE TYPE public.booking_status AS ENUM (
  'pending','confirmed','active','completed','cancelled','no_show'
);

CREATE TYPE public.service_request_status AS ENUM (
  'open','quoted','accepted','in_progress','completed','disputed','cancelled'
);

CREATE TYPE public.job_type AS ENUM (
  'full_time','part_time','contract','freelance','internship'
);

CREATE TYPE public.job_status AS ENUM (
  'draft','active','closed','expired','filled'
);

CREATE TYPE public.application_status AS ENUM (
  'submitted','reviewed','shortlisted','interviewed','accepted','rejected','withdrawn'
);

CREATE TYPE public.tender_status AS ENUM (
  'draft','published','closed','awarded','cancelled'
);

CREATE TYPE public.currency_code AS ENUM ('XAF','USD','EUR','GBP');

CREATE TYPE public.profession_type AS ENUM (
  'contractor','engineer','architect','lawyer'
);

CREATE TYPE public.report_type AS ENUM (
  'spam','fraud','inappropriate','misleading','illegal','harassment','other'
);

CREATE TYPE public.report_status AS ENUM (
  'pending','reviewing','resolved','dismissed'
);

CREATE TYPE public.notification_type AS ENUM (
  'message','enquiry','offer','booking','payment','review',
  'property_update','order_update','service_update','job_update',
  'system','promotional','verification'
);

CREATE TYPE public.post_status AS ENUM (
  'active','pinned','closed','hidden','deleted'
);

CREATE TYPE public.reaction_type AS ENUM (
  'like','dislike','helpful','not_helpful'
);
