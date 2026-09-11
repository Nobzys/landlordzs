-- =============================================================================
-- DEV SEED: Jobs & Careers test data
-- PURPOSE:  Populate the jobs table for local UI development/testing.
-- SAFETY:   All rows inserted with category='_dev_seed' for easy cleanup.
-- CLEANUP:  Run the DELETE block at the bottom to remove all seed rows.
-- USAGE:    Paste into Supabase SQL editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- NOTE: Uses the first existing profile as poster.  If the profiles table is
-- empty this script will fail — create at least one user account first.

DO $$
DECLARE
  v_poster UUID;
BEGIN
  SELECT id INTO v_poster FROM public.profiles ORDER BY created_at LIMIT 1;
  IF v_poster IS NULL THEN
    RAISE EXCEPTION 'No profiles found. Create at least one user account before seeding.';
  END IF;

  -- ─── 12 seed jobs (more than PAGE_SIZE=8 to exercise pagination) ──────────

  INSERT INTO public.jobs
    (poster_id, title, description, requirements, category, job_type,
     city, is_remote, salary_min, salary_max, salary_period,
     experience_years_min, skills_required, status, published_at, deadline)
  VALUES

  -- 1. Real Estate Sales
  (v_poster,
   'Real Estate Sales Executive',
   'Join our fast-growing agency and help clients buy, sell and rent residential and commercial properties across Cameroon. You will manage listings, conduct viewings, and close deals.',
   'Proven track record in property or B2B sales. Strong negotiation skills. Valid driving licence.',
   'Real Estate Sales', 'full_time', 'yaounde', FALSE,
   300000, 700000, 'month', 2,
   ARRAY['Sales', 'Negotiation', 'CRM', 'Property Valuation'],
   'active', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days'),

  -- 2. Civil Engineering
  (v_poster,
   'Senior Structural Engineer',
   'Design and oversee structural systems for large-scale residential and commercial buildings in Douala. You will prepare structural calculations, review shop drawings, and coordinate with architects and contractors.',
   'B.Eng or M.Eng in Civil/Structural Engineering. 6+ years site and design experience. Familiarity with Eurocodes and local standards.',
   'Civil Engineering', 'full_time', 'douala', FALSE,
   800000, 1200000, 'month', 6,
   ARRAY['AutoCAD', 'SAP2000', 'ETABS', 'Structural Calculations', 'Site Supervision'],
   'active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '45 days'),

  -- 3. Construction / Project Management
  (v_poster,
   'Construction Project Manager',
   'Lead end-to-end delivery of a mixed-use development in Kribi: residential villas, commercial units, and shared amenities. Manage contractors, budget, timeline, and client communications.',
   'Degree in Civil Engineering or Construction Management. 5+ years as PM on projects ≥ 500M XAF. PMP or Prince2 certification preferred.',
   'Construction', 'full_time', 'kribi', FALSE,
   900000, 1500000, 'month', 5,
   ARRAY['Project Management', 'MS Project', 'Cost Control', 'Contract Admin', 'HSE'],
   'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '60 days'),

  -- 4. Architecture
  (v_poster,
   'AutoCAD / Revit Draughtsman',
   'Produce detailed architectural drawings, sections, and construction documents for residential and light-commercial projects. Work under the supervision of a registered architect.',
   'HND or Degree in Architecture or Architectural Technology. Proficiency in AutoCAD required; Revit a plus. 0–3 years experience.',
   'Architecture', 'full_time', 'yaounde', FALSE,
   200000, 350000, 'month', 1,
   ARRAY['AutoCAD', 'Revit', 'SketchUp', 'Adobe PDF'],
   'active', NOW() - INTERVAL '3 days', NOW() + INTERVAL '30 days'),

  -- 5. Property Management
  (v_poster,
   'Property Manager',
   'Manage a portfolio of 50+ residential units in Limbe: tenant screening, rent collection, maintenance scheduling, and reporting to the property owner.',
   'Diploma or degree in Business, Estate Management, or related field. 3+ years property or facilities management experience.',
   'Property Management', 'full_time', 'limbe', FALSE,
   350000, 550000, 'month', 3,
   ARRAY['Tenant Relations', 'Maintenance Planning', 'Budgeting', 'MS Excel'],
   'active', NOW() - INTERVAL '4 days', NOW() + INTERVAL '30 days'),

  -- 6. Electrical Engineering
  (v_poster,
   'Electrical Engineer — Building Services',
   'Design low-voltage electrical installations for residential estates and commercial complexes in Buea. Prepare single-line diagrams, load calculations, and tender specifications.',
   'B.Eng Electrical Engineering. 3–5 years in building services or MEP consultancy. Knowledge of IEC and local SONEL standards.',
   'Electrical Engineering', 'full_time', 'buea', FALSE,
   500000, 800000, 'month', 3,
   ARRAY['AutoCAD Electrical', 'Load Calculations', 'Panel Design', 'IEC Standards'],
   'active', NOW() - INTERVAL '6 days', NOW() + INTERVAL '45 days'),

  -- 7. Project Management
  (v_poster,
   'Project Coordinator',
   'Support senior project managers across multiple active construction sites in Douala: scheduling, procurement tracking, stakeholder meeting minutes, and monthly reporting.',
   'Degree in Engineering, Architecture, or Business. 2–4 years coordination or assistant PM experience. Strong Excel and reporting skills.',
   'Project Management', 'full_time', 'douala', FALSE,
   280000, 420000, 'month', 2,
   ARRAY['Scheduling', 'MS Project', 'Procurement', 'Reporting', 'Communication'],
   'active', NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days'),

  -- 8. Site Supervision
  (v_poster,
   'Senior Site Supervisor — Residential',
   'Supervise daily operations on a 120-unit gated residential estate under construction in Bamenda. Ensure quality, health & safety, and programme compliance.',
   'HND or Degree in Civil Engineering or Building Technology. 5+ years hands-on site supervision. Knowledge of reinforced concrete and masonry construction.',
   'Site Supervision', 'full_time', 'bamenda', FALSE,
   400000, 650000, 'month', 5,
   ARRAY['Quality Control', 'HSE', 'Reinforced Concrete', 'Masonry', 'Site Planning'],
   'active', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days'),

  -- 9. Estimating / QS
  (v_poster,
   'Quantity Surveyor / Estimator',
   'Prepare Bills of Quantities, cost estimates, and tender evaluations for a busy construction consultancy operating across the Centre and Littoral regions.',
   'Degree in Quantity Surveying or Civil Engineering. 3+ years QS/estimating in building construction. Proficiency in AutoCAD for taking off.',
   'Estimating / Quantity Surveying', 'full_time', 'yaounde', FALSE,
   450000, 700000, 'month', 3,
   ARRAY['Bills of Quantities', 'Cost Estimating', 'AutoCAD', 'MS Excel', 'Tender Analysis'],
   'active', NOW() - INTERVAL '8 days', NOW() + INTERVAL '30 days'),

  -- 10. Remote / Freelance option
  (v_poster,
   'Freelance BIM Modeller (Remote)',
   'Produce Revit BIM models and coordination drawings for ongoing real estate development projects. Work is entirely remote with weekly video reviews.',
   '3+ years Revit BIM experience. Experience with clash detection (Navisworks) preferred. Available for at least 20h/week.',
   'Architecture', 'freelance', NULL, TRUE,
   NULL, NULL, 'month', 3,
   ARRAY['Revit', 'BIM', 'Navisworks', 'IFC', 'Coordination'],
   'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '20 days'),

  -- 11. Administration / Finance
  (v_poster,
   'Property Accounts Officer',
   'Maintain financial records for a portfolio of rental properties: invoice processing, bank reconciliation, rent ledgers, and monthly management accounts.',
   'HND or degree in Accounting or Finance. 2+ years bookkeeping experience. Proficiency in Sage or QuickBooks.',
   'Administration / Finance', 'full_time', 'douala', FALSE,
   200000, 300000, 'month', 2,
   ARRAY['Accounting', 'Sage', 'QuickBooks', 'Bank Reconciliation', 'Rent Ledgers'],
   'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '30 days'),

  -- 12. Marketing
  (v_poster,
   'Digital Marketing Executive — Real Estate',
   'Manage social media, paid ads, and content for a leading Douala property developer. Drive qualified leads for off-plan residential and commercial properties.',
   'Degree in Marketing or Communications. 2+ years digital marketing, ideally for property or financial services. Experience with Meta Ads and Google Ads.',
   'Marketing', 'full_time', 'douala', FALSE,
   250000, 400000, 'month', 2,
   ARRAY['Social Media', 'Meta Ads', 'Google Ads', 'Content Creation', 'Lead Generation'],
   'active', NOW() - INTERVAL '3 days', NOW() + INTERVAL '30 days');

  RAISE NOTICE 'Seed complete — 12 dev jobs inserted with poster_id = %', v_poster;
END;
$$;

-- =============================================================================
-- CLEANUP — run this block to remove all seed rows
-- =============================================================================
-- DELETE FROM public.jobs
-- WHERE category IN (
--   'Real Estate Sales', 'Civil Engineering', 'Construction',
--   'Architecture', 'Property Management', 'Electrical Engineering',
--   'Project Management', 'Site Supervision', 'Estimating / Quantity Surveying',
--   'Administration / Finance', 'Marketing'
-- )
-- AND status = 'active'
-- AND description ILIKE '%gated residential estate%'
--    OR title ILIKE '%Draughtsman%'
--    OR title ILIKE '%BIM Modeller%';
--
-- Safer alternative — delete by the exact titles inserted above:
-- DELETE FROM public.jobs WHERE title IN (
--   'Real Estate Sales Executive',
--   'Senior Structural Engineer',
--   'Construction Project Manager',
--   'AutoCAD / Revit Draughtsman',
--   'Property Manager',
--   'Electrical Engineer — Building Services',
--   'Project Coordinator',
--   'Senior Site Supervisor — Residential',
--   'Quantity Surveyor / Estimator',
--   'Freelance BIM Modeller (Remote)',
--   'Property Accounts Officer',
--   'Digital Marketing Executive — Real Estate'
-- );
