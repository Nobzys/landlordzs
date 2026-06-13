-- Migration: 0014 — Jobs & Tenders

CREATE TABLE public.jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  requirements         TEXT,
  responsibilities     TEXT,
  category             TEXT,
  job_type             public.job_type NOT NULL DEFAULT 'contract',
  city                 public.cameroon_city,
  address              TEXT,
  is_remote            BOOLEAN NOT NULL DEFAULT FALSE,
  salary_min           BIGINT,
  salary_max           BIGINT,
  currency             public.currency_code NOT NULL DEFAULT 'XAF',
  salary_period        TEXT NOT NULL DEFAULT 'month',
  experience_years_min INT NOT NULL DEFAULT 0,
  skills_required      TEXT[] NOT NULL DEFAULT '{}',
  status               public.job_status NOT NULL DEFAULT 'draft',
  application_count    INT NOT NULL DEFAULT 0,
  view_count           INT NOT NULL DEFAULT 0,
  deadline             DATE,
  published_at         TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('jobs');
CREATE INDEX idx_jobs_poster  ON public.jobs(poster_id);
CREATE INDEX idx_jobs_status  ON public.jobs(status);
CREATE INDEX idx_jobs_city    ON public.jobs(city);
CREATE INDEX idx_jobs_type    ON public.jobs(job_type);
CREATE INDEX idx_jobs_active  ON public.jobs(status, published_at) WHERE status = 'active';

CREATE TABLE public.job_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter    TEXT,
  cv_url          TEXT,
  portfolio_url   TEXT,
  expected_salary BIGINT,
  status          public.application_status NOT NULL DEFAULT 'submitted',
  notes           TEXT,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);
SELECT public.attach_updated_at('job_applications');
CREATE INDEX idx_job_apps_job       ON public.job_applications(job_id);
CREATE INDEX idx_job_apps_applicant ON public.job_applications(applicant_id);
CREATE INDEX idx_job_apps_status    ON public.job_applications(status);

CREATE TABLE public.tenders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  scope_of_work       TEXT,
  requirements        TEXT,
  category            TEXT,
  city                public.cameroon_city,
  address             TEXT,
  budget_min          BIGINT,
  budget_max          BIGINT,
  currency            public.currency_code NOT NULL DEFAULT 'XAF',
  status              public.tender_status NOT NULL DEFAULT 'draft',
  documents           TEXT[] NOT NULL DEFAULT '{}',
  submission_deadline DATE NOT NULL,
  start_date          DATE,
  completion_date     DATE,
  bid_count           INT NOT NULL DEFAULT 0,
  published_at        TIMESTAMPTZ,
  awarded_at          TIMESTAMPTZ,
  awarded_to          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('tenders');
CREATE INDEX idx_tenders_poster   ON public.tenders(poster_id);
CREATE INDEX idx_tenders_status   ON public.tenders(status);
CREATE INDEX idx_tenders_city     ON public.tenders(city);
CREATE INDEX idx_tenders_deadline ON public.tenders(submission_deadline);

CREATE TABLE public.tender_bids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id     UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  bidder_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount        BIGINT NOT NULL,
  currency      public.currency_code NOT NULL DEFAULT 'XAF',
  timeline_days INT,
  proposal      TEXT NOT NULL,
  documents     TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('submitted','shortlisted','awarded','rejected','withdrawn')),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tender_id, bidder_id)
);
SELECT public.attach_updated_at('tender_bids');
CREATE INDEX idx_tender_bids_tender ON public.tender_bids(tender_id);
CREATE INDEX idx_tender_bids_bidder ON public.tender_bids(bidder_id);
CREATE INDEX idx_tender_bids_status ON public.tender_bids(status);
