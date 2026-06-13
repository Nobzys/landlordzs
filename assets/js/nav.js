/* ================================================================
   LANDLORDZS — Shared Navigation & Interactivity  (assets/js/nav.js)

   Each page sets before loading this file:
     window.LZ_BASE        = './' (root) or '../' (one level deep)
     window.LZ_BREADCRUMB  = [{label, url}, ...]   (optional)
     window.LZ_PAGE        = 'page-id'              (optional, for active nav)
================================================================ */

(function () {
  'use strict';

  const B = window.LZ_BASE || '../';

  /* ── Navigation data ── */
  const categories = [
    { icon:'🏠', name:'Properties for Sale',   sub:'Buy your dream home',     url:'properties/buy.html'           },
    { icon:'🔑', name:'Properties for Rent',    sub:'Find rental homes',        url:'properties/rent.html'          },
    { icon:'🌍', name:'Land & Plots',           sub:'Invest in land',           url:'properties/land.html'          },
    { icon:'🏢', name:'Commercial Property',    sub:'Offices, shops & more',    url:'properties/commercial.html'    },
    { icon:'⚖️', name:'Property Lawyers',       sub:'Legal professionals',      url:'professionals/lawyers.html'    },
    { icon:'🧱', name:'Building Materials',     sub:'Cement, tiles & more',     url:'materials/materials-home.html' },
    { icon:'🔨', name:'Contractors',            sub:'Hire skilled builders',    url:'professionals/contractors.html'},
    { icon:'📐', name:'Engineers & Architects', sub:'Design professionals',     url:'professionals/engineers.html'  },
    { icon:'🏷️', name:'Real Estate Agents',     sub:'Trusted local agents',     url:'professionals/property-managers.html'},
    { icon:'🧹', name:'Cleaning Services',      sub:'Home & office cleaning',   url:'services/cleaning.html'        },
    { icon:'🗑️', name:'Waste Collection',       sub:'Disposal & recycling',     url:'services/waste-collection.html'},
    { icon:'🔒', name:'Security Services',      sub:'Guards & surveillance',    url:'services/security.html'        },
    { icon:'🚜', name:'Equipment Rentals',      sub:'Heavy machinery hire',     url:'rentals/equipment-rentals.html'},
    { icon:'🚗', name:'Vehicle Rentals',        sub:'Cars, SUVs & trucks',      url:'rentals/vehicle-rentals.html'  },
    { icon:'🔧', name:'Home Maintenance',       sub:'Repairs & installations',  url:'services/plumbing-services.html'},
    { icon:'💼', name:'Jobs & Tenders',         sub:'Construction & property',  url:'jobs/jobs.html'                },
    { icon:'👥', name:'Community',              sub:'Connect & discuss',        url:'pages/about.html'              },
  ];

  /* ── Build Header HTML ── */
  function buildHeader() {
    const cats = categories.map(c => `
      <a href="${B}${c.url}" class="mega-item" role="menuitem">
        <span class="mega-icon">${c.icon}</span>
        <div><strong>${c.name}</strong><small>${c.sub}</small></div>
      </a>`).join('');

    return `
<div class="topbar">
  <div class="container topbar-inner">
    <nav class="topbar-left">
      <a href="${B}pages/about.html">For Buyers</a>
      <a href="${B}pages/about.html">For Sellers</a>
      <a href="${B}pages/contact.html">Help</a>
      <a href="#">Tools</a>
      <a href="${B}materials/materials-home.html">Shopping</a>
      <a href="#">Messages</a>
      <a href="#">Get the App</a>
    </nav>
    <div class="topbar-right">
      <a href="${B}auth/login.html"    class="topbar-link">Sign In</a>
      <span class="topbar-divider">|</span>
      <a href="${B}auth/register.html" class="topbar-link">Join</a>
      <a href="#" class="topbar-link cart-icon" aria-label="Cart">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <span class="cart-count" id="cartCount">0</span>
      </a>
      <a href="#" class="btn btn-primary btn-sm">Post Property Free</a>
    </div>
  </div>
</div>

<header class="header" id="lz-main-header">
  <div class="container header-inner">
    <a href="${B}index.html" class="logo">
      <span class="logo-land">LANDLORD</span><span class="logo-zs">ZS</span>
    </a>

    <div class="mega-menu-wrapper" id="megaMenuWrapper">
      <button class="all-categories-btn" id="allCategoriesBtn" aria-expanded="false" aria-haspopup="true">
        <span class="hamburger-lines"><span></span><span></span><span></span></span>
        All Categories
        <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="mega-dropdown" id="megaDropdown" role="menu">
        <div class="mega-dropdown-grid">${cats}</div>
      </div>
    </div>

    <div class="header-search">
      <input type="text" placeholder="Search properties, services, materials..." aria-label="Search" id="headerSearchInput"/>
      <button class="header-search-btn" id="headerSearchBtn" aria-label="Search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </button>
    </div>

    <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;
  }

  /* ── Build Footer HTML ── */
  function buildFooter() {
    return `
<footer class="footer">
  <div class="footer-top">
    <div class="container footer-top-inner">
      <div class="footer-brand">
        <div class="logo footer-logo">
          <span class="logo-land">LANDLORD</span><span class="logo-zs">ZS</span>
        </div>
        <p>Everything Property. One Trusted Platform.<br>Cameroon's largest real estate and construction marketplace.</p>
        <div class="footer-social">
          <a href="#" aria-label="Facebook"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
          <a href="#" aria-label="Twitter"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg></a>
          <a href="#" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
          <a href="#" aria-label="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Properties</h4>
        <ul>
          <li><a href="${B}properties/buy.html">Buy Property</a></li>
          <li><a href="${B}properties/rent.html">Rent Property</a></li>
          <li><a href="${B}properties/land.html">Land &amp; Plots</a></li>
          <li><a href="${B}properties/commercial.html">Commercial</a></li>
          <li><a href="${B}properties/property-details.html">Luxury Homes</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Marketplace</h4>
        <ul>
          <li><a href="${B}materials/materials-home.html">Building Materials</a></li>
          <li><a href="${B}rentals/equipment-rentals.html">Equipment Rentals</a></li>
          <li><a href="${B}rentals/vehicle-rentals.html">Vehicle Rentals</a></li>
          <li><a href="${B}services/cleaning.html">Home Services</a></li>
          <li><a href="${B}jobs/jobs.html">Jobs &amp; Tenders</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Professionals</h4>
        <ul>
          <li><a href="${B}professionals/contractors.html">Contractors</a></li>
          <li><a href="${B}professionals/engineers.html">Engineers</a></li>
          <li><a href="${B}professionals/architects.html">Architects</a></li>
          <li><a href="${B}professionals/lawyers.html">Lawyers</a></li>
          <li><a href="${B}professionals/surveyors.html">Surveyors</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="${B}pages/about.html">About Us</a></li>
          <li><a href="${B}pages/contact.html">Contact</a></li>
          <li><a href="#">Careers</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Press</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Support</h4>
        <ul>
          <li><a href="${B}pages/contact.html">Help Center</a></li>
          <li><a href="#">FAQs</a></li>
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Terms of Use</a></li>
          <li><a href="#">Report a Listing</a></li>
        </ul>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="container footer-bottom-inner">
      <p>&copy; 2026 LANDLORDZS. All rights reserved. | Cameroon's #1 Property Marketplace</p>
      <div class="footer-bottom-links">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="${B}pages/sitemap.html">Sitemap</a>
      </div>
    </div>
  </div>
</footer>`;
  }

  /* ── Build Breadcrumb HTML ── */
  function buildBreadcrumb(crumbs) {
    if (!crumbs || crumbs.length === 0) return '';
    const items = crumbs.map((c, i) => {
      if (i === crumbs.length - 1) {
        return `<span class="breadcrumb-current">${c.label}</span>`;
      }
      const link = c.url ? `<a href="${c.url}">${c.label}</a>` : `<span>${c.label}</span>`;
      return `${link}<span class="breadcrumb-sep">›</span>`;
    }).join('');
    return `<div class="breadcrumb-bar"><div class="container"><nav class="breadcrumb" aria-label="Breadcrumb">${items}</nav></div></div>`;
  }

  /* ── Inject into DOM ── */
  function inject() {
    const hEl = document.getElementById('lz-header');
    const fEl = document.getElementById('lz-footer');
    const bEl = document.getElementById('lz-breadcrumb');

    if (hEl) hEl.innerHTML = buildHeader();
    if (fEl) fEl.innerHTML = buildFooter();
    if (bEl && window.LZ_BREADCRUMB) bEl.innerHTML = buildBreadcrumb(window.LZ_BREADCRUMB);
  }

  /* ── Setup all interactivity ── */
  function setup() {
    setupMegaMenu();
    setupStickyHeader();
    setupMobileDrawer();
    setupScrollTop();
    setupWishlist();
    setupSearchTabs();
    setupFadeIn();
    setupCounters();
  }

  /* ── Mega Menu ── */
  function setupMegaMenu() {
    const btn      = document.getElementById('allCategoriesBtn');
    const dropdown = document.getElementById('megaDropdown');
    const wrapper  = document.getElementById('megaMenuWrapper');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', (e) => {
      if (wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  /* ── Sticky Header ── */
  function setupStickyHeader() {
    const h = document.getElementById('lz-main-header');
    if (!h) return;
    window.addEventListener('scroll', () => h.classList.toggle('scrolled', window.scrollY > 10), { passive: true });
  }

  /* ── Scroll-to-Top ── */
  function setupScrollTop() {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── Wishlist buttons ── */
  function setupWishlist() {
    document.querySelectorAll('.wishlist-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = b.classList.toggle('active');
        b.textContent = on ? '♥' : '♡';
        showToast(on ? 'Saved to wishlist ♥' : 'Removed from wishlist');
      });
    });
  }

  /* ── Search Tabs ── */
  function setupSearchTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
    }));
  }

  /* ── Fade-in on scroll ── */
  function setupFadeIn() {
    const targets = document.querySelectorAll(
      '.property-card,.professional-card,.service-card,.testimonial-card,.job-card,.prop-type-card,.material-card,.product-card,.rental-card,.team-card,.value-card,.stat-card'
    );
    if (!targets.length || !window.IntersectionObserver) return;
    targets.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; el.style.transition = 'opacity .5s ease, transform .5s ease'; });
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    targets.forEach(el => obs.observe(el));
  }

  /* ── Counter Animation ── */
  function setupCounters() {
    const section = document.querySelector('.trusted-section');
    if (!section || !window.IntersectionObserver) return;
    let done = false;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !done) {
        done = true;
        document.querySelectorAll('.trusted-number').forEach(el => {
          const raw = el.textContent.trim();
          const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
          const suffix = raw.replace(/[0-9.,]/g, '').trim();
          const steps = 40, dur = 1600;
          let step = 0;
          const timer = setInterval(() => {
            step++;
            const val = Math.min((num / steps) * step, num);
            el.textContent = (Number.isInteger(num) ? Math.floor(val).toLocaleString() : val.toFixed(1)) + suffix;
            if (step >= steps) clearInterval(timer);
          }, dur / steps);
        });
      }
    }, { threshold: 0.2 });
    obs.observe(section);
  }

  /* ── Mobile Drawer ── */
  function setupMobileDrawer() {
    const btn = document.getElementById('mobileMenuBtn');
    if (!btn) return;

    let overlay = null;

    btn.addEventListener('click', () => {
      if (!overlay) overlay = createDrawer();
      const isOpen = overlay.dataset.open === '1';
      if (isOpen) closeDrawer(overlay, btn);
      else openDrawer(overlay, btn);
    });
  }

  function createDrawer() {
    const overlay = document.createElement('div');
    overlay.dataset.open = '0';
    Object.assign(overlay.style, {
      position:'fixed', inset:'0', zIndex:'1200',
      background:'rgba(0,0,0,0)', visibility:'hidden', transition:'background .25s ease'
    });

    const drawer = document.createElement('nav');
    Object.assign(drawer.style, {
      position:'absolute', top:'0', right:'0',
      width:'min(320px,90vw)', height:'100%',
      background:'#fff', overflowY:'auto',
      transform:'translateX(100%)', transition:'transform .28s ease',
      boxShadow:'-4px 0 24px rgba(0,0,0,.15)'
    });

    const cats = categories.map(c =>
      `<a href="${B}${c.url}" style="display:flex;align-items:center;gap:12px;padding:11px 20px;font-size:13.5px;color:#333;border-bottom:1px solid #f5f5f5;">
        <span style="font-size:18px;">${c.icon}</span>${c.name}</a>`
    ).join('');

    drawer.innerHTML = `
      <div style="background:#B71C1C;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:800;font-size:18px;color:#fff;"><span>LANDLORD</span><span style="color:#ffb3b3">ZS</span></span>
        <button id="drawerClose" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
      <div style="padding:12px 0;">
        <div style="padding:8px 20px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#999;">Navigation</div>
        <a href="${B}properties/buy.html"  style="display:block;padding:12px 20px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">For Buyers</a>
        <a href="${B}pages/about.html"     style="display:block;padding:12px 20px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">For Sellers</a>
        <a href="${B}pages/contact.html"   style="display:block;padding:12px 20px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">Help</a>
        <a href="${B}jobs/jobs.html"        style="display:block;padding:12px 20px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">Jobs &amp; Tenders</a>
        <div style="padding:8px 20px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#999;margin-top:8px;">Categories</div>
        ${cats}
        <div style="padding:16px 20px;display:flex;gap:10px;margin-top:8px;">
          <a href="${B}auth/register.html" style="flex:1;background:#B71C1C;color:#fff;padding:11px;text-align:center;border-radius:6px;font-size:13px;font-weight:600;">Post Free</a>
          <a href="${B}auth/login.html"    style="flex:1;background:#f0f0f0;color:#333;padding:11px;text-align:center;border-radius:6px;font-size:13px;font-weight:600;">Sign In</a>
        </div>
      </div>`;

    overlay.appendChild(drawer);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDrawer(overlay, document.getElementById('mobileMenuBtn'));
    });
    drawer.querySelector('#drawerClose').addEventListener('click', () =>
      closeDrawer(overlay, document.getElementById('mobileMenuBtn'))
    );
    return overlay;
  }

  function openDrawer(overlay, btn) {
    overlay.style.visibility = 'visible';
    overlay.style.background = 'rgba(0,0,0,.45)';
    overlay.querySelector('nav').style.transform = 'translateX(0)';
    overlay.dataset.open = '1';
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer(overlay, btn) {
    overlay.style.background = 'rgba(0,0,0,0)';
    overlay.querySelector('nav').style.transform = 'translateX(100%)';
    overlay.dataset.open = '0';
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { overlay.style.visibility = 'hidden'; }, 280);
  }

  /* ── Toast ── */
  window.showToast = function (msg, type) {
    let el = document.getElementById('lz-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lz-toast';
      Object.assign(el.style, {
        position:'fixed', bottom:'80px', left:'50%',
        transform:'translateX(-50%) translateY(10px)',
        background:'#222', color:'#fff', padding:'10px 22px',
        borderRadius:'24px', fontSize:'13.5px', fontFamily:'inherit',
        fontWeight:'500', boxShadow:'0 4px 16px rgba(0,0,0,.2)',
        zIndex:'9999', opacity:'0', transition:'opacity .25s ease, transform .25s ease',
        pointerEvents:'none', whiteSpace:'nowrap'
      });
      if (type === 'success') el.style.background = '#2e7d32';
      if (type === 'error')   el.style.background = '#B71C1C';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(10px)';
    }, 2600);
  };

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { inject(); setup(); });
  } else {
    inject(); setup();
  }

})();
