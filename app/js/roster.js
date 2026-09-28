/* Class roster, instructor contact and company list.
   Practice roster for 3A – Intro to Plans, Fresno Central Valley (Local Union #27). All names are made up.
   Edit this file to change the class list for the next class.                               */
PT.roster = (() => {
  // NOTE: every apprentice name, company, e-mail and phone number in this training app is MADE UP.
  const NOTE = "Names, companies, e-mails and phone numbers in this training app are made up for practice.";
  const INSTRUCTOR = { name: "Juan Rodarte", role: "Instructor", company: "Central Valley JATC", email: "jrodarte@centralvalleyjatc.com", phone: "559-555-0127" };

  const CLASS = "3A – Intro to Plans · Fresno Central Valley (practice names)";
  // Practice (made-up) California union roofing contractors.
  const COMPANIES = [
    "Sierra Summit Roofing, Inc.", "Golden Valley Roof Systems", "Kings River Roofing & Sheet Metal", "Sequoia Commercial Roofing",
    "San Joaquin Roof & Deck Co.", "Tulare Basin Roofing Co.", "Mother Lode Roofing & Waterproofing", "Redwood Empire Roof Systems",
    "Pacific Crest Waterproofing", "Central Coast Membrane Roofing", "Yosemite Gateway Roofing", "Kern Valley Commercial Roofing",
    "Harbor Point Waterproofing", "Delta Breeze Roofing, Inc.", "High Desert Roof & Sheet Metal", "Mission Trail Roofing Co.",
  ];
  const PRACTICE_COMPANIES = COMPANIES;
  // Practice (made-up) class list – 11 apprentices, each with a random roster number 1–11 and a made-up employer.
  const APPRENTICES = [
    [11, "Mateo Ramirez", "Sierra Summit Roofing, Inc."],
    [8, "Luis Herrera", "Kings River Roofing & Sheet Metal"],
    [1, "Adrian Castillo", "Tulare Basin Roofing Co."],
    [7, "Daniel Ochoa", "Sierra Summit Roofing, Inc."],
    [2, "Ricardo Mendoza", "Golden Valley Roof Systems"],
    [3, "Samuel Vargas", "Kings River Roofing & Sheet Metal"],
    [9, "Victor Delgado", "San Joaquin Roof & Deck Co."],
    [6, "Andres Navarro", "Tulare Basin Roofing Co."],
    [4, "Marco Salazar", "Golden Valley Roof Systems"],
    [10, "Ivan Contreras", "Sequoia Commercial Roofing"],
    [5, "Tony Guzman", "San Joaquin Roof & Deck Co."],
  ].map(([no, name, company]) => ({ no, name, company, role: "Apprentice", email: practiceEmail(name), phone: "" })).sort((a, b) => a.no - b.no);
  const EMPLOYERS = [...new Set(APPRENTICES.map((a) => a.company))];

  // Practice e-mail (made up, never used to send anything) – apprentices can change it. "27" = Local 27.
  function practiceEmail(name, style = 0) {
    const parts = String(name || "apprentice").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s-]/g, "").split(/\s+/).filter(Boolean);
    const f = parts[0] || "apprentice", l = (parts.length > 1 ? parts[parts.length - 1] : "roofer").replace(/-/g, "");
    return [`${f}.${l}.roofer27@gmail.com`, `${f}${l}27@gmail.com`, `${f[0]}${l}.roofer27@gmail.com`, `${f}.${l}.local27@gmail.com`, `${l}.${f}27@gmail.com`, `${f}_${l}_27@gmail.com`][style % 6];
  }
  const randomEmail = (name, not) => { let e; do { e = practiceEmail(name, Math.floor(Math.random() * 6)); } while (e === not && Math.random() < 0.9); return e; };
  const randomCompany = (not) => { const list = COMPANIES.filter((c) => c !== not); return list[Math.floor(Math.random() * list.length)]; };
  const find = (name) => APPRENTICES.find((a) => a.name.toLowerCase() === String(name || "").trim().toLowerCase());

  return { NOTE, INSTRUCTOR, CLASS, APPRENTICES, EMPLOYERS, PRACTICE_COMPANIES, COMPANIES, practiceEmail, randomEmail, randomCompany, find };
})();
