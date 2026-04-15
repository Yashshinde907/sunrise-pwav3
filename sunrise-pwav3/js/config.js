const API          = 'https://script.google.com/macros/s/AKfycbyh3kD5djV9wvg-nmyZ7q1ku0tvZhYxYhZfxDPws2TdzusuSAerp5xsM1TGtYW8-GWuLA/exec';
const SYNC_MS      = 300000;
const HEARTBEAT_MS = 30000;
function generateUID() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'SR';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
const DEFAULT_WA   = "Hi {name}, this is {agent} from Sunrise Realty! We'd love to help you find your dream home.";
const DEFAULT_SMS  = "Dear {name}, greetings from {agent} at Sunrise Realty!";
const DEFAULT_EM   = "Dear {name},\n\nThank you for your interest in Sunrise Realty.\n\nBest regards,\n{agent}";
const DEFAULT_SUBJ = "Sunrise Realty — Your Dream Home Awaits";
