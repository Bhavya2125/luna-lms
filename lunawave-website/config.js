// Luna Wave's contact details: the one file to edit when they change.
// Anything set to "" is hidden on the site.
window.LW_CONTACT = {
  whatsapp: "918296533233",                        // digits with country code, no + or spaces
  phone: "+91 82965 33233",                        // as it should appear on the site
  email: "",                                       // public booking email (add it here); where briefs are emailed is set in Vercel (LEADS_TO)
  instagram: "luna.wave_ind",

  // Booking briefs are POSTed here and emailed to the team (see api/enquiry.js).
  // "" turns it off: the form then sends the brief over WhatsApp instead.
  enquiryEndpoint: "/api/enquiry",
};
