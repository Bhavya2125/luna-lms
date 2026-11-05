// Mo's contact details: the one file to edit when they change.
// Anything set to "" is hidden on the site.
window.MO_CONTACT = {
  whatsapp: "917019534038",                        // digits with country code, no + or spaces
  phone: "+91 70195 34038",                        // as it should appear on the site
  email: "moentertainment.enquiry@gmail.com",      // shown on the site; where briefs are emailed is set in Vercel (LEADS_TO)
  instagram: "mo__entertainments",

  // Booking briefs are POSTed here and emailed to the team (see api/enquiry.js).
  // "" turns it off: the form then sends the brief over WhatsApp instead.
  enquiryEndpoint: "/api/enquiry",
};
