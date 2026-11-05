// Mo's contact details: the one file to edit before launch.
// PLACEHOLDERS below: swap in the real WhatsApp number, phone and email before going live.
// Anything set to "" is hidden on the site.
window.MO_CONTACT = {
  whatsapp: "910000000000",               // digits with country code, no + or spaces, e.g. "919876543210"
  phone: "+91 00000 00000",               // as it should appear on the site
  email: "bookings@moentertainments.in",  // shown on the site; where briefs are emailed is set in Vercel (LEADS_TO)
  instagram: "mo__entertainments",

  // Booking briefs are POSTed here and emailed to the team (see api/enquiry.js).
  // "" turns it off: the form then sends the brief over WhatsApp instead.
  enquiryEndpoint: "/api/enquiry",
};
