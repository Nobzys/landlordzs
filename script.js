/* ═══════════════════════════════════════════
   LANDLORDZS — Main Script
════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── Mega Menu ─── */
  const megaBtn      = document.getElementById('allCategoriesBtn');
  const megaDropdown = document.getElementById('megaDropdown');
  const megaWrapper  = document.getElementById('megaMenuWrapper');

  if (megaBtn && megaDropdown) {
    megaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = megaDropdown.classList.toggle('open');
      megaBtn.setAttribute('aria-expanded', open);
    });

    document.addEventListener('click', (e) => {
      if (!megaWrapper.contains(e.target)) {
        megaDropdown.classList.remove('open');
        megaBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        megaDropdown.classList.remove('open');
        megaBtn.setAttribute('aria-expanded', 'false');
        megaBtn.focus();
      }
    });
  }

  /* ─── Sticky Header shadow ─── */
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* ─── Search Tabs ─── */
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  /* ─── Wishlist Toggle ─── */
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const active = btn.classList.toggle('active');
      btn.textContent = active ? '♥' : '♡';
      btn.setAttribute('aria-label', active ? 'Saved to wishlist' : 'Save to wishlist');
      showToast(active ? 'Added to wishlist ♥' : 'Removed from wishlist');
    });
  });

  /* ─── Scroll-to-Top ─── */
  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Smooth Scroll for # links ─── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ─── Toast Notification ─── */
  function showToast(message) {
    let toast = document.getElementById('lz-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'lz-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(10px);
        background: #222;
        color: #fff;
        padding: 10px 22px;
        border-radius: 24px;
        font-size: 13.5px;
        font-family: inherit;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,.2);
        z-index: 9999;
        opacity: 0;
        transition: opacity .25s ease, transform .25s ease;
        pointer-events: none;
        white-space: nowrap;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
    }, 2400);
  }

  /* ─── Mobile Menu (drawer) ─── */
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      let drawer = document.getElementById('mobileDrawer');
      if (!drawer) {
        drawer = buildMobileDrawer();
        document.body.appendChild(drawer);
      }
      const open = drawer.classList.toggle('drawer-open');
      mobileBtn.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  function buildMobileDrawer() {
    const overlay = document.createElement('div');
    overlay.id = 'mobileDrawer';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 1100;
      background: rgba(0,0,0,.45); opacity: 0;
      visibility: hidden; transition: opacity .25s ease, visibility .25s ease;
    `;

    const drawer = document.createElement('nav');
    drawer.style.cssText = `
      position: absolute; top: 0; right: 0;
      width: min(320px, 90vw); height: 100%;
      background: #fff; padding: 0;
      overflow-y: auto; transform: translateX(100%);
      transition: transform .28s ease;
      box-shadow: -4px 0 24px rgba(0,0,0,.15);
    `;

    const categories = [
      ['🏠','Properties for Sale'],['🔑','Properties for Rent'],
      ['🌍','Land & Plots'],['🏢','Commercial Property'],
      ['⚖️','Property Lawyers'],['🧱','Building Materials'],
      ['🔨','Contractors'],['📐','Engineers & Architects'],
      ['🏷️','Real Estate Agents'],['🧹','Cleaning Services'],
      ['🗑️','Waste Collection'],['🔒','Security Services'],
      ['🚜','Equipment Rentals'],['🚗','Vehicle Rentals'],
      ['🔧','Home Maintenance'],['💼','Jobs & Tenders'],['👥','Community']
    ];

    const topLinks = ['For Buyers','For Sellers','Help','Tools','Shopping','Messages','Get the App'];

    let html = `
      <div style="background:#B71C1C;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#fff;font-weight:800;font-size:18px;"><span>LANDLORD</span><span style="color:#ffb3b3">ZS</span></span>
        <button id="drawerClose" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
      <div style="padding:12px 0;">
        <div style="padding:10px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#999;">Navigation</div>
    `;

    topLinks.forEach(link => {
      html += `<a href="#" style="display:block;padding:12px 20px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;transition:background .15s;" onmouseover="this.style.background='#fce4e4'" onmouseout="this.style.background=''">${link}</a>`;
    });

    html += `<div style="padding:10px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#999;margin-top:8px;">All Categories</div>`;

    categories.forEach(([icon, name]) => {
      html += `<a href="#" style="display:flex;align-items:center;gap:12px;padding:11px 20px;font-size:13.5px;color:#333;border-bottom:1px solid #f5f5f5;transition:background .15s;" onmouseover="this.style.background='#fce4e4'" onmouseout="this.style.background=''"><span style="font-size:18px;">${icon}</span>${name}</a>`;
    });

    html += `
        <div style="padding:16px 20px;display:flex;gap:10px;margin-top:8px;">
          <a href="#" style="flex:1;background:#B71C1C;color:#fff;padding:11px;text-align:center;border-radius:6px;font-size:13px;font-weight:600;">Post Property Free</a>
          <a href="#" style="flex:1;background:#f0f0f0;color:#333;padding:11px;text-align:center;border-radius:6px;font-size:13px;font-weight:600;">Sign In</a>
        </div>
      </div>
    `;

    drawer.innerHTML = html;
    overlay.appendChild(drawer);

    overlay.classList.add = overlay.classList.add.bind(overlay.classList);

    Object.defineProperty(overlay, 'classList', {
      get() { return this._classList || (this._classList = Object.create(DOMTokenList.prototype)); }
    });

    overlay.classList = {
      _classes: new Set(),
      toggle(cls) {
        if (this._classes.has(cls)) {
          this._classes.delete(cls);
          overlay.style.opacity = '0';
          overlay.style.visibility = 'hidden';
          drawer.style.transform = 'translateX(100%)';
          return false;
        } else {
          this._classes.add(cls);
          overlay.style.opacity = '1';
          overlay.style.visibility = 'visible';
          drawer.style.transform = 'translateX(0)';
          return true;
        }
      },
      contains(cls) { return this._classes.has(cls); }
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDrawer();
    });

    setTimeout(() => {
      const closeBtn = overlay.querySelector('#drawerClose');
      if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    }, 0);

    function closeDrawer() {
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
      drawer.style.transform = 'translateX(100%)';
      overlay.classList._classes.clear();
      const mobileMenuBtn = document.getElementById('mobileMenuBtn');
      if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    return overlay;
  }

  /* ─── Counter Animation ─── */
  function animateCounters() {
    const counters = document.querySelectorAll('.trusted-number');
    counters.forEach(counter => {
      const text = counter.textContent.trim();
      const numMatch = text.match(/[\d,.]+/);
      if (!numMatch) return;

      const rawNum = parseFloat(numMatch[0].replace(/,/g, ''));
      const suffix = text.replace(numMatch[0], '').trim();
      const hasDot = rawNum % 1 !== 0;
      const duration = 1600;
      const steps = 40;
      const increment = rawNum / steps;
      let current = 0;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current = Math.min(current + increment, rawNum);
        const display = hasDot ? current.toFixed(1) : Math.floor(current).toLocaleString();
        counter.textContent = display + suffix;
        if (step >= steps) clearInterval(timer);
      }, duration / steps);
    });
  }

  /* ─── Intersection Observer for counter + fade-in ─── */
  const observerOptions = { threshold: 0.15 };

  let countersAnimated = false;
  const trustedSection = document.querySelector('.trusted-section');
  if (trustedSection) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
          countersAnimated = true;
          animateCounters();
        }
      });
    }, observerOptions);
    counterObserver.observe(trustedSection);
  }

  /* Fade-in sections on scroll */
  const fadeStyle = document.createElement('style');
  fadeStyle.textContent = `
    .fade-in { opacity: 0; transform: translateY(24px); transition: opacity .55s ease, transform .55s ease; }
    .fade-in.visible { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(fadeStyle);

  const fadeTargets = document.querySelectorAll(
    '.property-card, .professional-card, .service-card, .testimonial-card, .job-card, .prop-type-card, .material-card'
  );
  fadeTargets.forEach(el => el.classList.add('fade-in'));

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  fadeTargets.forEach(el => fadeObserver.observe(el));

  /* ─── Cart Count Placeholder ─── */
  const cartCount = document.querySelector('.cart-count');
  if (cartCount) cartCount.textContent = '0';

})();
