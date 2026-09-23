/* =====================================================================
   Matrix Money landing page, vanilla JS
   - sticky header shadow
   - mobile hamburger menu (no framework)
   - live mortgage calculator (standard amortization formula, no API)
   - enquiry form validation + confirmation block (posts nowhere)
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------
     1. Sticky header: subtle shadow once the page has scrolled
     --------------------------------------------------------------- */
  var header = document.getElementById("site-header");
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 8) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------
     2. Mobile hamburger menu
     --------------------------------------------------------------- */
  var menuBtn = document.getElementById("menuBtn");
  var navLinks = document.getElementById("navLinks");

  function setMenu(open) {
    if (!menuBtn || !navLinks) return;
    navLinks.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });

    // Close after choosing a destination
    navLinks.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuBtn.focus();
      }
    });

    // Reset when resizing up to the desktop layout
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 900) setMenu(false);
    });
  }

  /* ---------------------------------------------------------------
     3. Mortgage calculator
        Standard amortization (principal + interest):
          M = P * r * (1 + r)^n / ((1 + r)^n - 1)
        P = loan amount, r = monthly rate, n = number of payments.
        Nothing is fetched: the maths runs locally.
     --------------------------------------------------------------- */
  var money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  /**
   * Monthly principal + interest payment.
   * @param {number} principal loan amount
   * @param {number} annualRatePct annual interest rate, e.g. 6.49
   * @param {number} years amortization in years
   * @returns {number} monthly payment (0 when the inputs cannot produce one)
   */
  function monthlyPayment(principal, annualRatePct, years) {
    var n = Math.round(years * 12);
    var r = annualRatePct / 100 / 12;
    if (!isFinite(principal) || principal <= 0 || !isFinite(n) || n <= 0 || !isFinite(r) || r < 0) {
      return 0;
    }
    if (r === 0) return principal / n;
    var growth = Math.pow(1 + r, n);
    return (principal * r * growth) / (growth - 1);
  }

  var homePriceEl = document.getElementById("homePrice");
  var downPaymentEl = document.getElementById("downPayment");
  var rateEl = document.getElementById("rate");
  var termEl = document.getElementById("term");
  var rateValueEl = document.getElementById("rateValue");
  var termValueEl = document.getElementById("termValue");
  var paymentEl = document.getElementById("monthlyPayment");
  var downPctEl = document.getElementById("downPct");

  function numberFrom(el, fallback) {
    if (!el) return fallback;
    var v = parseFloat(el.value);
    return isFinite(v) ? v : fallback;
  }

  function updateCalculator() {
    if (!homePriceEl || !downPaymentEl || !rateEl || !termEl || !paymentEl) return;

    var price = Math.max(0, numberFrom(homePriceEl, 0));
    var down = Math.max(0, numberFrom(downPaymentEl, 0));
    var rate = numberFrom(rateEl, 6.49);
    var years = numberFrom(termEl, 30);

    var loan = Math.max(0, price - down);
    var payment = monthlyPayment(loan, rate, years);

    paymentEl.textContent = money.format(Math.round(payment));

    if (rateValueEl) rateValueEl.textContent = rate.toFixed(2) + "%";
    if (termValueEl) termValueEl.textContent = years + (years === 1 ? " year" : " years");
    if (downPctEl) {
      var pct = price > 0 ? Math.round((down / price) * 100) : 0;
      downPctEl.textContent = pct + "% down";
    }

    paymentEl.setAttribute("aria-live", "polite");
    paymentEl.dataset.loanAmount = String(Math.round(loan));
    paymentEl.dataset.monthlyPayment = payment.toFixed(2);
  }

  if (homePriceEl && downPaymentEl && rateEl && termEl && paymentEl) {
    [homePriceEl, downPaymentEl, rateEl, termEl].forEach(function (el) {
      el.addEventListener("input", updateCalculator);
      el.addEventListener("change", updateCalculator);
    });
    updateCalculator();
  }

  // Exposed for testing/documentation only
  window.MatrixMoney = {
    calcMonthlyPayment: monthlyPayment,
    updateCalculator: updateCalculator
  };

  /* ---------------------------------------------------------------
     4. Enquiry form
        No real endpoint. Submit is intercepted, validated locally and
        the confirmation block is revealed. See the FORM ENDPOINT
        PLACEHOLDER comment in index.html to wire up a handler.
     --------------------------------------------------------------- */
  var form = document.getElementById("enquiryForm");
  var formError = document.getElementById("formError");
  var formSuccess = document.getElementById("formSuccess");

  function showError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.hidden = false;
  }

  function clearError() {
    if (!formError) return;
    formError.textContent = "";
    formError.hidden = true;
  }

  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault(); // no network request is made from this page
      clearError();

      var name = form.elements.fullName ? form.elements.fullName.value.trim() : "";
      var phone = form.elements.phone ? form.elements.phone.value.trim() : "";
      var email = form.elements.email ? form.elements.email.value.trim() : "";
      var consent = form.elements.consent ? form.elements.consent.checked : true;

      if (!name) {
        showError("Please add your full name so we know who to call.");
        if (form.elements.fullName) form.elements.fullName.focus();
        return;
      }

      if (!phone && !email) {
        showError("Please add a phone number or an email so we can reach you.");
        if (form.elements.phone) form.elements.phone.focus();
        return;
      }

      if (email && !looksLikeEmail(email)) {
        showError("That email looks incomplete. Please check it.");
        if (form.elements.email) form.elements.email.focus();
        return;
      }

      if (!consent) {
        showError("Please tick the consent box so we can contact you.");
        if (form.elements.consent) form.elements.consent.focus();
        return;
      }

      // ---- send here instead of nowhere when a real endpoint exists ----
      // var payload = Object.fromEntries(new FormData(form).entries());
      // fetch("/api/enquiry", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(payload) });
      // -----------------------------------------------------------------

      form.hidden = true;
      if (formSuccess) {
        formSuccess.hidden = false;
        if (typeof formSuccess.focus === "function") formSuccess.focus();
        if (typeof formSuccess.scrollIntoView === "function") {
          formSuccess.scrollIntoView({ block: "center" });
        }
      }
    });
  }

  /* ---------------------------------------------------------------
     5. FAQ accordion: keep one panel open at a time (progressive
        enhancement, <details> works with JS disabled too)
     --------------------------------------------------------------- */
  var faqItems = document.querySelectorAll(".faq-item");
  if (faqItems.length) {
    Array.prototype.forEach.call(faqItems, function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        Array.prototype.forEach.call(faqItems, function (other) {
          if (other !== item) other.open = false;
        });
      });
    });
  }
})();
