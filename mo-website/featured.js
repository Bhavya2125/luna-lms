// Artists Mo Entertainments has put on stage (from @mo__entertainments).
// [name, genre, tier, photo, where we did it]. No photo = a designed name card;
// drop a photo into img/ and add its path to switch to a photo card.
// Shown on the home page; any not in the shared roster (artists.js, generated
// from data/artists.json) are added to it here so search and booking find them.
window.MO_FEATURED = [
  ["Raman Negi", "Indie / Pop", 3, "img/a-raman-negi.jpg", "Sonabyss · NERIST"],
  ["Anand Bhaskar Collective", "Band", 2, "img/a-anand-bhaskar.jpg", "IIT Dharwad"],
  ["Joel Jazz", "Hip-hop", 4, "img/joel-2.jpg", "Pre-Esplendida"],
  ["Yung Sammy", "Hip-hop", 3, "img/abhiveera.jpg", "Abhiveera · NLU Assam"],
  ["Boomrang", "Band", 4, "img/a-boomrang.jpg", "CIMS · Chikkamagaluru"],
  ["Swastik", "Band", 4, "img/a-swastik.jpg", "Parsec 6.0 · IIT Dharwad"],
  ["The Bombay Lineup", "Band", 4, "img/a-bombay-lineup.jpg", "Vivante · IISER Tirupati"],
  ["DJ Rubz", "Electronic / DJ", 4, "img/vivante-1.jpg", "Vivante · IISER Tirupati"],
  ["Rohith Thiruvanathil & Nawaf", "Indie / Pop", 4, "img/a-rohith-nawaf.jpg", "Vivante · IISER Tirupati"],
  ["Young & Broke", "Indie / Pop", 4, "img/vivante-2.jpg", "Vivante · IISER Tirupati"],
  ["Truckle", "Electronic / DJ", 4, "img/a-truckle-akey.jpg", "Binary Beats · Parsec"],
  ["DJ Akey", "Electronic / DJ", 4, "img/a-truckle-akey.jpg", "Binary Beats · Parsec"],
  ["Vishwanath Haveri", "Kannada", 4, "img/a-vishwanath-haveri.jpg", "Chiguru · BMSET"],
  ["Arya", "Indie / Pop", 4, "img/a-arya.jpg", "Invento · KLE Tech"],
  ["Anuj Rehan", "Indie / Pop", 4, "img/exodia.jpg", "Exodia · IIT Mandi"],
  ["Naman Jain", "Comedy", 4, "img/a-naman-jain.jpg", "Parsec 6.0 · IIT Dharwad"],
  ["Pranav Sharma", "Comedy", 4, "img/a-pranav-sharma.jpg", "Parsec 6.0 · IIT Dharwad"],
  ["Piyush Sharma", "Comedy", 4, "img/a-piyush-sharma.jpg", "Invento · KLE Tech"],
  ["Siana Catherine", "Comedy", 4, "img/a-siana-catherine.jpg", "Farouche · BMS College"],
  ["Saurabh Rawat", "Comedy", 4, "img/a-saurabh-rawat.jpg", "Belagavi"],
  ["Vishal Sivakumar", "Comedy", 4, "img/vivante-3.jpg", "Vivante · IISER Tirupati"],
  ["Shamik Chakrabarti", "Comedy", 4, "img/mo-apr.jpg", "NHCE · Bengaluru"],
  ["Ganesh Kashyap", "Comedy", 4, "img/mo-nov.jpg", "Corporate · Bengaluru"],
];
(() => {
  const all = window.LW_ARTISTS || (window.LW_ARTISTS = []);
  const have = new Set(all.map(a => a[0].toLowerCase()));
  for (const [n, g, t] of window.MO_FEATURED) if (!have.has(n.toLowerCase())) all.push([n, g, t]);
})();
