'use client'

import { useState } from 'react'

interface FAQ { q: string; a: string }
interface HelpCategory { id: string; title: string; icon: string; items: FAQ[] }

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    items: [
      {
        q: 'What is LANDLORDZS?',
        a: "LANDLORDZS is Cameroon's property marketplace connecting buyers, sellers, renters, agents, contractors, engineers, architects, lawyers, vendors, and service providers — all in one platform.",
      },
      {
        q: 'How do I use LANDLORDZS?',
        a: 'You can browse properties, building materials, rentals, and services without an account. To post listings, save favourites, make bookings, or access your dashboard, create a free account and choose your role.',
      },
      {
        q: 'Is LANDLORDZS free to use?',
        a: 'Browsing is always free. Creating an account is free. Posting a property listing is free. Marketplace transactions may involve service fees depending on the deal type.',
      },
      {
        q: 'What cities does LANDLORDZS cover?',
        a: 'LANDLORDZS covers major Cameroon cities including Yaoundé, Douala, Bafoussam, Bamenda, Buea, Limbe, Kribi, Bertoua, Ebolowa, Ngaoundéré, Maroua, and Kumba — with more cities being added.',
      },
    ],
  },
  {
    id: 'registration',
    title: 'Registration & Account',
    icon: '👤',
    items: [
      {
        q: 'How do I create an account?',
        a: 'Click "Join" in the top navigation bar. Enter your name, email address, and password. You will receive a verification email — confirm it to activate your account.',
      },
      {
        q: 'What roles can I register as?',
        a: 'You can register as: Buyer, Seller, Agent, Contractor, Engineer, Architect, Property Lawyer, Property Manager, Vendor, Maintenance Provider, or Cleaning Services Provider. Choose the role that best matches how you use the platform.',
      },
      {
        q: 'Can I change my role after registration?',
        a: 'Your primary role is set during registration and onboarding. To request a role change, email support@landlordzs.com with your account email and the role you need.',
      },
      {
        q: 'Does my account need approval?',
        a: 'Buyers are approved instantly. Sellers, agents, vendors, contractors, engineers, architects, lawyers, property managers, and service providers require admin review before they can post listings or offer services.',
      },
      {
        q: 'I did not receive my verification email. What should I do?',
        a: 'Check your spam or junk folder. If it is not there, email support@landlordzs.com with your registered email address and we will resend the verification link.',
      },
    ],
  },
  {
    id: 'for-buyers',
    title: 'For Buyers',
    icon: '🏠',
    items: [
      {
        q: 'How do I search for properties?',
        a: 'Use the search bar at the top of the page or visit the Properties section. Filter by city, property type (apartment, villa, land, commercial), listing type (for sale, for rent, shortlet), price range, and more.',
      },
      {
        q: 'What does the Verified badge mean?',
        a: 'A Verified badge means the listing has been reviewed by the LANDLORDZS team. The property details, ownership documents, and images have been checked for accuracy.',
      },
      {
        q: 'How do I save a property?',
        a: 'Sign in and click the heart icon on any property card or property page. Your saved properties appear in your buyer dashboard under Favourites.',
      },
      {
        q: 'How do I compare properties?',
        a: 'After saving properties to your favourites, use the Compare feature in your buyer dashboard to view multiple properties side by side.',
      },
      {
        q: 'Can I book a property viewing?',
        a: 'Yes. On any property listing, you can submit a booking request for a viewing or inspection. Track your bookings in your buyer dashboard.',
      },
      {
        q: 'How do I make an inquiry about a property?',
        a: 'Open the property listing and use the contact details provided — the owner or agent phone number is shown on the listing if they have chosen to display it. All submitted inquiries appear in your buyer dashboard.',
      },
    ],
  },
  {
    id: 'for-sellers',
    title: 'For Sellers & Landlords',
    icon: '🔑',
    items: [
      {
        q: 'How do I list a property?',
        a: 'Register with the Seller role, complete account verification, then click "Post Property Free" in the navigation bar. Fill in the property details, upload photos, and submit for review.',
      },
      {
        q: 'How long does listing approval take?',
        a: 'The LANDLORDZS team reviews all new listings. Approval typically takes 1–2 business days. You will be notified by email once your listing is live.',
      },
      {
        q: 'Can I list multiple properties?',
        a: 'Yes. Approved sellers can post multiple property listings from their seller dashboard. Each listing is reviewed individually.',
      },
      {
        q: 'How do I manage my listings?',
        a: 'Your seller dashboard shows all your active, pending, and archived listings. You can edit details, update photos, change the price, or deactivate a listing at any time.',
      },
      {
        q: 'What listing types can I post?',
        a: 'You can list properties For Sale, For Rent (long-term), or as Shortlets (short-term / vacation rentals).',
      },
      {
        q: 'How do I receive buyer inquiries?',
        a: 'Inquiries from buyers appear in your seller dashboard. Buyers can also see your phone number on the listing if you choose to display it.',
      },
    ],
  },
  {
    id: 'for-renters',
    title: 'For Renters',
    icon: '🏘️',
    items: [
      {
        q: 'What is the difference between For Rent and Shortlet?',
        a: '"For Rent" listings are long-term rentals (monthly or annual agreements). "Shortlet" listings are short-term stays — daily, weekly, or for a few months — ideal for visitors or people relocating.',
      },
      {
        q: 'How do I find rental properties?',
        a: 'Go to the Properties section and filter by listing type "For Rent" or "Shortlet". You can also filter by city, price range, number of bedrooms, and other features.',
      },
      {
        q: 'Can I also rent equipment or vehicles?',
        a: 'Yes. The Rentals section covers equipment rentals (heavy machinery, tools) and vehicle rentals (cars, SUVs, trucks) in addition to property rentals.',
      },
      {
        q: 'How do I contact a landlord?',
        a: 'Open the property listing and use the contact details provided. If a phone number is shown, you can call the owner or agent directly from the listing page.',
      },
    ],
  },
  {
    id: 'for-agents',
    title: 'For Agents',
    icon: '🤝',
    items: [
      {
        q: 'How do I register as an agent?',
        a: 'Select the "Agent" role during registration and complete your profile with your specialization (residential, commercial, land, rental, or industrial). Your account is reviewed by the admin team before activation.',
      },
      {
        q: 'Can an agent list properties on behalf of sellers?',
        a: 'Yes. Approved agents can post property listings. The listing will show the agent as the point of contact, linking them to the property owner.',
      },
      {
        q: 'How do agents appear in search?',
        a: 'Agent profiles are visible when buyers view property listings you manage. Your name, verification status, and contact phone number appear on the listing contact card.',
      },
      {
        q: 'What is the agent specialization field?',
        a: 'During onboarding you choose a specialization: Residential, Commercial, Land, Rental, or Industrial. This helps match you with the right buyers and properties.',
      },
    ],
  },
  {
    id: 'for-professionals',
    title: 'For Professionals & Service Providers',
    icon: '🔨',
    items: [
      {
        q: 'Who qualifies as a Professional on LANDLORDZS?',
        a: 'The Professionals category includes Contractors, Engineers, Architects, Property Lawyers, Property Managers, Maintenance Providers, and Cleaning Services Providers.',
      },
      {
        q: 'How do I register as a professional?',
        a: 'Choose your role (e.g. Contractor, Engineer, Architect) during registration and complete your profile including your specialization, portfolio, and credentials. Admin approval is required before your profile is visible.',
      },
      {
        q: 'How do clients find me?',
        a: 'Your profile appears in the Professionals and Services sections. Clients can view your specializations, browse your portfolio, and contact you directly through your listed phone number.',
      },
      {
        q: 'What services can be offered on the platform?',
        a: 'The Services section covers general contracting, engineering, architecture, property law, property management, home maintenance (plumbing, electrical, painting, carpentry, HVAC), and cleaning services (residential, commercial, deep cleaning, post-construction).',
      },
      {
        q: 'Can I apply for jobs or tenders?',
        a: 'Yes. The Jobs & Tenders section lists construction and property-related opportunities. Verified professionals can browse and apply for relevant listings.',
      },
    ],
  },
  {
    id: 'for-vendors',
    title: 'For Vendors / Building Materials',
    icon: '🧱',
    items: [
      {
        q: 'How do I sell building materials on LANDLORDZS?',
        a: 'Register with the Vendor role, complete your profile, and wait for admin approval. Once approved, you can list products in the Materials marketplace — including cement, tiles, steel, timber, roofing, paint, and more.',
      },
      {
        q: 'How do buyers purchase materials?',
        a: 'Buyers browse the Materials marketplace, add products to their cart, and check out. Vendors can choose to ship directly or allow collection from their location.',
      },
      {
        q: 'How do I manage my product listings?',
        a: 'Your vendor dashboard shows all your active product listings. You can update prices, stock levels, photos, and descriptions at any time.',
      },
      {
        q: 'Can I also offer services as a vendor?',
        a: 'Vendors are registered specifically for material products. If you also offer services (e.g. installation), email support@landlordzs.com to discuss the best role configuration for your business.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Safety',
    icon: '🔒',
    items: [
      {
        q: 'How are payments protected on LANDLORDZS?',
        a: 'LANDLORDZS uses a milestone-based escrow system for transactions. Funds are held securely until agreed milestones are completed and both parties confirm the deal — protecting buyers from fraud and ensuring sellers receive payment.',
      },
      {
        q: 'What is the escrow system?',
        a: 'Escrow is a secure payment method where funds are held by LANDLORDZS until transaction conditions are met. You can track your escrow transactions through your account dashboard.',
      },
      {
        q: 'How do I report a suspicious listing?',
        a: 'Email support@landlordzs.com with the property ID or listing URL and a description of your concern. Our team reviews all reports promptly.',
      },
      {
        q: 'What should I avoid when transacting?',
        a: 'Never send money outside the LANDLORDZS platform for a transaction. Do not share bank account passwords or PINs. Be cautious of listings with unusually low prices and sellers who avoid in-person meetings or viewings.',
      },
      {
        q: 'Is my personal data secure?',
        a: 'LANDLORDZS stores your data securely. We do not sell your personal information to third parties. Your phone number is only visible on listings if you explicitly choose to display it.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & Complaints',
    icon: '🛡️',
    items: [
      {
        q: 'How do I report a problem with a listing or user?',
        a: 'Email support@landlordzs.com with details of the issue — include the listing ID or user profile link and a clear description. Our moderation team will review and take action within 2 business days.',
      },
      {
        q: 'How do I request deletion of my account?',
        a: 'Email support@landlordzs.com from your registered email address with the subject "Account Deletion Request". We will process your request within 7 business days.',
      },
      {
        q: 'Can I update or correct my personal information?',
        a: 'Yes. Go to your account profile settings to update your name, phone number, profile photo, and other details at any time.',
      },
      {
        q: 'What data does LANDLORDZS collect?',
        a: 'We collect the information you provide during registration and listing creation (name, email, phone, property details), as well as usage data to improve the platform. We do not collect payment card details — all secure transactions use our escrow system.',
      },
    ],
  },
  {
    id: 'guides',
    title: 'Guides & Knowledge Base',
    icon: '📚',
    items: [
      {
        q: 'How do I buy property safely in Cameroon?',
        a: 'Always verify the land title (Titre Foncier) before paying any money. Use a verified property lawyer to review documents. Where possible, use the LANDLORDZS escrow system to protect your funds during the transaction.',
      },
      {
        q: 'What documents do I need to sell a property?',
        a: 'You typically need the Titre Foncier (land title), a Certificat de Propriété, valid identification, and any previous sale agreements. A property lawyer can guide you through the full documentation process.',
      },
      {
        q: 'What should I check before renting a property?',
        a: "Inspect the property in person. Confirm the landlord's ownership documents. Get a written rental agreement that clearly states the monthly rent, deposit, and duration. Check utility connections (water, electricity).",
      },
      {
        q: 'What is a Titre Foncier?',
        a: 'A Titre Foncier is the highest form of land ownership document in Cameroon. It is issued by the government and provides legally conclusive proof of ownership. Always prefer properties with a Titre Foncier for maximum security.',
      },
      {
        q: 'How do I hire a contractor for a construction project?',
        a: 'Browse the Professionals section to find verified contractors. Review their specializations and portfolio. Get written quotations from at least three contractors before signing any agreement. Use the escrow system for milestone-based payments.',
      },
    ],
  },
]

export default function HelpContent() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const filtered = q
    ? HELP_CATEGORIES.flatMap(cat =>
        cat.items
          .filter(item => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q))
          .map(item => ({ ...item, category: cat.title }))
      )
    : []

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#222222] py-14 px-4">
        <div className="max-w-[1280px] mx-auto space-y-5">
          <h1 className="text-3xl font-bold text-white">Help Center</h1>
          <p className="text-white/75 max-w-xl text-[15px] leading-relaxed">
            Find answers to common questions about buying, selling, renting, and using LANDLORDZS services across Cameroon.
          </p>
          {/* Search */}
          <div className="flex items-center max-w-xl border border-white/20 rounded-lg overflow-hidden bg-white/10 focus-within:bg-white/15 transition-colors">
            <input
              type="text"
              placeholder="Search the Help Center..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 px-4 py-3 bg-transparent text-white placeholder-white/50 text-[14px] outline-none min-w-0"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="px-3 text-white/60 hover:text-white text-lg border-none bg-transparent cursor-pointer"
              >
                ×
              </button>
            )}
            <span className="flex items-center justify-center w-11 h-11 bg-[#B71C1C] shrink-0" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-10">

        {/* Search results */}
        {q ? (
          <div className="space-y-4 mb-10">
            <p className="text-sm text-gray-500">
              {filtered.length === 0
                ? `No results for "${query}"`
                : `${filtered.length} result${filtered.length === 1 ? '' : 's'} for "${query}"`}
            </p>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-sm mb-4">Try different keywords, or browse the categories below.</p>
                <button
                  onClick={() => setQuery('')}
                  className="text-sm font-semibold text-[#B71C1C] hover:text-[#7f1111] transition-colors"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filtered.map((item, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#B71C1C] mb-1">{item.category}</p>
                  <h3 className="font-semibold text-[#222222] mb-2 text-[15px]">{item.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Category quick-nav */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-12">
              {HELP_CATEGORIES.map(cat => (
                <a
                  key={cat.id}
                  href={`#${cat.id}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-[#B71C1C]/40 hover:bg-[#fce4e4] transition-colors text-center group"
                >
                  <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                  <span className="text-[12.5px] font-semibold text-gray-800 group-hover:text-[#B71C1C] transition-colors leading-snug">
                    {cat.title}
                  </span>
                </a>
              ))}
            </div>

            {/* Full FAQ sections */}
            <div className="space-y-14">
              {HELP_CATEGORIES.map(cat => (
                <section key={cat.id} id={cat.id} className="scroll-mt-40">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-[#222222] tracking-[-0.3px] mb-6 pb-3 border-b border-gray-200">
                    <span aria-hidden="true">{cat.icon}</span>
                    {cat.title}
                  </h2>
                  <div className="space-y-4">
                    {cat.items.map(item => (
                      <div
                        key={item.q}
                        className="rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
                      >
                        <h3 className="font-semibold text-[#222222] mb-2 text-[15px]">{item.q}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        {/* Contact CTA */}
        <div className="mt-16 rounded-2xl bg-[#222222] px-8 py-12 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Still need help?</h2>
          <p className="text-white/75 text-sm mb-8 max-w-md mx-auto leading-relaxed">
            Our support team is here for you. Send us an email and we&apos;ll get back to you as soon as possible.
          </p>
          <a
            href="mailto:support@landlordzs.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#B71C1C] hover:bg-[#7f1111] text-white font-semibold text-sm transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,12 2,6"/>
            </svg>
            Contact Support
          </a>
        </div>
      </div>
    </main>
  )
}
