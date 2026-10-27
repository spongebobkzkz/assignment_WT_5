const TRANSIT_ROUTES = [
  { id: "astana-almaty", name: "Astana ⇄ Almaty High-Speed Express", baseFare: 65 },
  { id: "shymkent-aktau", name: "Shymkent ⇄ Aktau Caspian Transit", baseFare: 85 },
  { id: "karaganda-atyrau", name: "Karaganda ⇄ Atyrau Industrial Link", baseFare: 55 }
];

const TICKET_TIERS = [
  { type: "standard", name: "Standard Class Coach", priceMultiplier: 1.0, seatsLeft: 14 },
  { type: "vip", name: "VIP Luxury Sleeper Suite", priceMultiplier: 2.2, seatsLeft: 3 },
  { type: "student", name: "Student Commuter Pass", priceMultiplier: 0.6, seatsLeft: 7 }
];

const SOLD_OUT_DATES = [
  "2026-11-05",
  "2026-11-12",
  "2026-11-20",
  "2026-12-31"
];

const PROMO_CODES = {
  "ASTANA2026": 0.20,
  "SPEED50": 0.50,
  "CARGO15": 0.15
};

const BLOCKED_DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "dispostable.com",
  "trashmail.com"
];

const ticketForm = document.getElementById("ticket-form");
const errorSummaryBanner = document.getElementById("ticket-error-summary");
const errorCountSpan = document.getElementById("error-count");

const routeSelect = document.getElementById("field-event");
const dateInput = document.getElementById("field-date");
const tierSelect = document.getElementById("field-type");
const qtyInput = document.getElementById("field-quantity");
const nameInput = document.getElementById("field-name");
const emailInput = document.getElementById("field-email");
const promoInput = document.getElementById("field-promo");

const previewRoute = document.getElementById("preview-event-name");
const previewTier = document.getElementById("preview-ticket-type");
const previewDate = document.getElementById("preview-date");
const previewQty = document.getElementById("preview-qty");
const previewName = document.getElementById("preview-name");
const previewEmail = document.getElementById("preview-email");
const previewPrice = document.getElementById("preview-total-price");
const previewDiscount = document.getElementById("preview-discount-info");

const bookingResultSection = document.getElementById("booking-result-section");
const bookingResultDetails = document.getElementById("booking-result-details");

const touchedFields = new Set();

function validateRoute(field) {
  if (!field.value) {
    return "Please select a transit express route.";
  }
  return "";
}

function validateDate(field) {
  const chosen = field.value;
  if (!chosen) {
    return "Date of transit departure is required.";
  }

  const today = new Date().toISOString().split("T")[0];
  if (chosen < today) {
    return "Departure date cannot be in the past.";
  }

  if (SOLD_OUT_DATES.includes(chosen)) {
    return `Transit on ${chosen} is completely booked out. Please select another date.`;
  }

  return "";
}

function validateTier(field) {
  if (!field.value) {
    return "Please select a passenger travel tier.";
  }
  return "";
}

function validateQuantity(field) {
  const qty = parseInt(field.value, 10);
  if (isNaN(qty) || qty < 1) {
    return "Quantity must be at least 1 ticket.";
  }

  const selectedTier = tierSelect.value;
  const inv = TICKET_TIERS.find(item => item.type === selectedTier);
  if (inv && qty > inv.seatsLeft) {
    return `Only ${inv.seatsLeft} seat(s) available for ${inv.name}. Cannot book ${qty}.`;
  }

  if (qty > 10) {
    return "Maximum 10 passenger passes per individual booking.";
  }

  return "";
}

function validateFullName(field) {
  const val = field.value.trim();
  if (!val) {
    return "Full passenger name is required.";
  }

  const parts = val.split(/\s+/);
  if (parts.length < 2) {
    return "Please enter both First and Last name (e.g. 'Estai Beisenbay').";
  }

  const namePattern = /^[A-Za-zА-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһ\- ]+$/;
  if (!namePattern.test(val)) {
    return "Passenger name may only contain alphabet characters and hyphens.";
  }

  if (parts[0].length < 2 || parts[1].length < 2) {
    return "Each name component must have at least 2 characters.";
  }

  return "";
}

function validateEmail(field) {
  const email = field.value.trim().toLowerCase();
  if (!email) {
    return "Contact email address is required.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailPattern.test(email)) {
    return "Please enter a valid email format (e.g. passenger@domain.kz).";
  }

  const domain = email.split("@")[1];
  if (BLOCKED_DISPOSABLE_DOMAINS.includes(domain)) {
    return "Disposable / temporary email services are not permitted.";
  }

  return "";
}

function validatePromoCode(field) {
  const code = field.value.trim().toUpperCase();
  if (code.length === 0) {
    return "";
  }

  if (!(code in PROMO_CODES)) {
    return `Promo code '${code}' is invalid. Valid codes: ASTANA2026, SPEED50, CARGO15.`;
  }

  return "";
}

const validatorsMap = {
  "field-event": validateRoute,
  "field-date": validateDate,
  "field-type": validateTier,
  "field-quantity": validateQuantity,
  "field-name": validateFullName,
  "field-email": validateEmail,
  "field-promo": validatePromoCode
};

function validateSingleField(field) {
  const validator = validatorsMap[field.id];
  if (!validator) return true;

  const errorMessage = validator(field);
  const group = field.closest(".form-field-group");
  const errorContainer = group ? group.querySelector(".field-error-feedback") : null;

  if (errorMessage) {
    field.setCustomValidity(errorMessage);
    if (touchedFields.has(field.id)) {
      field.setAttribute("aria-invalid", "true");
      if (group) {
        group.classList.add("has-error");
        group.classList.remove("is-valid");
      }
      if (errorContainer) {
        errorContainer.textContent = errorMessage;
      }
    }
    return false;
  } else {
    field.setCustomValidity("");
    if (touchedFields.has(field.id)) {
      field.removeAttribute("aria-invalid");
      if (group) {
        group.classList.remove("has-error");
        group.classList.add("is-valid");
      }
      if (errorContainer) {
        errorContainer.textContent = "";
      }
    }
    return true;
  }
}

function validateAllFieldsOnSubmit() {
  let firstInvalid = null;
  let totalErrors = 0;

  for (const id of Object.keys(validatorsMap)) {
    const el = document.getElementById(id);
    touchedFields.add(id);
    const isValid = validateSingleField(el);

    if (!isValid) {
      totalErrors += 1;
      if (!firstInvalid) {
        firstInvalid = el;
      }
    }
  }

  if (totalErrors > 0) {
    errorSummaryBanner.classList.add("active");
    errorCountSpan.textContent = String(totalErrors);
    if (firstInvalid) {
      firstInvalid.focus();
    }
    return false;
  } else {
    errorSummaryBanner.classList.remove("active");
    return true;
  }
}

function updateLiveTicketCard() {
  if (!previewRoute || !previewTier) return;

  const route = TRANSIT_ROUTES.find(r => r.id === routeSelect.value);
  previewRoute.textContent = route ? route.name : "Select Transit Route";

  const tier = TICKET_TIERS.find(t => t.type === tierSelect.value);
  previewTier.textContent = tier ? tier.name : "Travel Tier";

  previewDate.textContent = dateInput.value || "—";
  const qty = parseInt(qtyInput.value, 10) || 1;
  previewQty.textContent = `${qty} pass(es)`;

  previewName.textContent = nameInput.value.trim() || "Passenger Name";
  previewEmail.textContent = emailInput.value.trim() || "passenger@speedcargo.kz";

  const baseFare = route ? route.baseFare : 65;
  const multiplier = tier ? tier.priceMultiplier : 1.0;
  let subtotal = baseFare * multiplier * qty;

  const promo = promoInput.value.trim().toUpperCase();
  let discountPct = 0;
  if (promo in PROMO_CODES) {
    discountPct = PROMO_CODES[promo];
    previewDiscount.textContent = `Promo code '${promo}' applied (-${discountPct * 100}%)`;
  } else {
    previewDiscount.textContent = "";
  }

  const finalTotal = Math.max(0, subtotal * (1 - discountPct));
  previewPrice.textContent = `$${finalTotal.toFixed(2)}`;
}

function generateCargoBookingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AITU-${randomPart}-CARGO`;
}

function renderConfirmedPass(data) {
  while (bookingResultDetails.firstChild) {
    bookingResultDetails.removeChild(bookingResultDetails.firstChild);
  }

  const callout = document.createElement("div");
  callout.classList.add("booking-success-callout");
  callout.textContent = `✓ Booking Confirmed! Official Transit E-Ticket #${data.code} successfully generated.`;
  bookingResultDetails.appendChild(callout);

  const card = document.createElement("div");
  card.classList.add("luxury-ticket-card");

  const top = document.createElement("div");
  top.classList.add("ticket-top-section");

  const title = document.createElement("h3");
  title.classList.add("ticket-route-name");
  title.textContent = data.route;

  const pill = document.createElement("span");
  pill.classList.add("ticket-tier-pill");
  pill.textContent = data.tier;

  top.appendChild(title);
  top.appendChild(pill);
  card.appendChild(top);

  const bodyGrid = document.createElement("div");
  bodyGrid.classList.add("ticket-matrix-grid");

  const fields = [
    { label: "Passenger", value: data.name },
    { label: "Contact Email", value: data.email },
    { label: "Departure Date", value: data.date },
    { label: "Seats Reserved", value: `${data.quantity} Pass(es)` },
    { label: "Total Paid", value: `$${data.total.toFixed(2)}` },
    { label: "Serial Verification", value: data.code }
  ];

  for (const item of fields) {
    const itemWrap = document.createElement("div");
    const lbl = document.createElement("div");
    lbl.classList.add("ticket-matrix-label");
    lbl.textContent = item.label;

    const val = document.createElement("div");
    val.classList.add("ticket-matrix-val");
    val.textContent = item.value;

    itemWrap.appendChild(lbl);
    itemWrap.appendChild(val);
    bodyGrid.appendChild(itemWrap);
  }

  card.appendChild(bodyGrid);
  bookingResultDetails.appendChild(card);
  bookingResultSection.classList.add("active");
  bookingResultSection.scrollIntoView({ behavior: "smooth" });
}

function handleTicketFormSubmit(event) {
  event.preventDefault();

  const isValid = validateAllFieldsOnSubmit();
  if (!isValid) return;

  const selectedTier = tierSelect.value;
  const qty = parseInt(qtyInput.value, 10);
  const inv = TICKET_TIERS.find(t => t.type === selectedTier);
  if (inv) {
    inv.seatsLeft = Math.max(0, inv.seatsLeft - qty);
  }

  const route = TRANSIT_ROUTES.find(r => r.id === routeSelect.value);
  const baseFare = route ? route.baseFare : 65;
  const multiplier = inv ? inv.priceMultiplier : 1.0;
  const promo = promoInput.value.trim().toUpperCase();
  const discountRate = (promo in PROMO_CODES) ? PROMO_CODES[promo] : 0;
  const finalPrice = (baseFare * multiplier * qty) * (1 - discountRate);

  const bookingData = {
    route: route ? route.name : "Transit Route",
    tier: inv ? inv.name : "Standard",
    date: dateInput.value,
    quantity: qty,
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    total: finalPrice,
    code: generateCargoBookingCode()
  };

  renderConfirmedPass(bookingData);

  ticketForm.reset();
  touchedFields.clear();
  document.querySelectorAll(".form-field-group").forEach(group => {
    group.classList.remove("has-error", "is-valid");
  });
  updateLiveTicketCard();
}

function initTask3() {
  if (!ticketForm || !routeSelect || !dateInput || !tierSelect || !qtyInput) return;

  ticketForm.noValidate = true;

  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);

  for (const id of Object.keys(validatorsMap)) {
    const field = document.getElementById(id);
    if (!field) continue;

    field.addEventListener("blur", () => {
      touchedFields.add(field.id);
      validateSingleField(field);
    });

    field.addEventListener("input", () => {
      if (touchedFields.has(field.id)) {
        validateSingleField(field);
      }
      if (field.id === "field-type" && touchedFields.has("field-quantity")) {
        validateSingleField(qtyInput);
      }
      updateLiveTicketCard();
    });

    field.addEventListener("change", () => {
      if (touchedFields.has(field.id)) {
        validateSingleField(field);
      }
      if (field.id === "field-type" && touchedFields.has("field-quantity")) {
        validateSingleField(qtyInput);
      }
      updateLiveTicketCard();
    });
  }

  ticketForm.addEventListener("submit", handleTicketFormSubmit);
  updateLiveTicketCard();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTask3);
} else {
  initTask3();
}
