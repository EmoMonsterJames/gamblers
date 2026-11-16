// =====================================================================
// 🧠 Quiz Casino question bank (Survival Land · 패자부활전) — advanced level.
//   SYNONYMS: [word, synonym (answer), Korean meaning (hint 1)] — the wrong options
//             are the answers of other words, so every option is a hard word too.
//   ACRONYMS: [acronym, what it stands for (answer), field (hint 1), 3 wrong expansions]
// quizQuestion() → { kind, q, options[4], answer, hint }
// =====================================================================
export const SYNONYMS = [
    ["EPHEMERAL", "transient", "덧없는, 순식간에 지나가는"], ["OBSEQUIOUS", "servile", "지나치게 아첨하는, 비굴한"], ["LACONIC", "terse", "말수가 적은, 간결한"],
    ["UBIQUITOUS", "omnipresent", "어디에나 있는"], ["RECALCITRANT", "unruly", "고집 센, 다루기 힘든"], ["PERNICIOUS", "deleterious", "치명적인, 해로운"],
    ["MAGNANIMOUS", "benevolent", "관대한, 도량이 넓은"], ["GARRULOUS", "loquacious", "수다스러운"], ["INTRANSIGENT", "uncompromising", "타협하지 않는"],
    ["PERFIDIOUS", "treacherous", "배신하는, 믿을 수 없는"], ["INSIPID", "vapid", "맛없는, 재미없는"], ["COGENT", "compelling", "설득력 있는"],
    ["ENERVATE", "debilitate", "기력을 빼앗다, 약화시키다"], ["OBDURATE", "obstinate", "완고한"], ["PUSILLANIMOUS", "craven", "겁 많은, 소심한"],
    ["SANGUINE", "optimistic", "낙관적인"], ["ESOTERIC", "arcane", "소수만 아는, 난해한"], ["VOCIFEROUS", "clamorous", "시끄럽게 떠드는"],
    ["IMPECUNIOUS", "penniless", "무일푼의"], ["MENDACIOUS", "deceitful", "거짓말하는"], ["TRUCULENT", "belligerent", "호전적인, 공격적인"],
    ["AMELIORATE", "alleviate", "개선하다, 완화하다"], ["EXACERBATE", "aggravate", "악화시키다"], ["OBFUSCATE", "obscure", "애매하게 하다, 흐리게 하다"],
    ["EQUANIMITY", "composure", "평정, 침착"], ["FASTIDIOUS", "meticulous", "꼼꼼한, 까다로운"], ["MUNIFICENT", "bountiful", "아낌없이 주는"],
    ["INCHOATE", "rudimentary", "초기의, 미완성의"], ["INSOUCIANT", "nonchalant", "태평한, 무관심한"], ["LUGUBRIOUS", "mournful", "침울한, 애처로운"],
    ["PARSIMONIOUS", "miserly", "인색한"], ["QUIXOTIC", "idealistic", "비현실적으로 이상적인"], ["RETICENT", "taciturn", "말을 아끼는, 과묵한"],
    ["SALUBRIOUS", "wholesome", "건강에 좋은"], ["VACILLATE", "waver", "망설이다, 흔들리다"], ["ACRIMONIOUS", "rancorous", "신랄한, 원한이 담긴"],
    ["CAPRICIOUS", "fickle", "변덕스러운"], ["DIFFIDENT", "timid", "자신감 없는, 소심한"], ["ERUDITE", "scholarly", "학식 있는"],
    ["FORTUITOUS", "serendipitous", "우연한 (뜻밖에 운 좋은)"], ["GREGARIOUS", "convivial", "사교적인"], ["ICONOCLAST", "nonconformist", "인습 타파주의자"],
    ["SYCOPHANT", "toady", "아첨꾼"], ["ABSTRUSE", "recondite", "난해한"], ["PROPITIOUS", "auspicious", "길조의, 유리한"],
    ["EXCULPATE", "exonerate", "무죄를 입증하다"], ["DISPARAGE", "denigrate", "깎아내리다"], ["ENIGMATIC", "inscrutable", "수수께끼 같은"],
    ["INDEFATIGABLE", "tireless", "지칠 줄 모르는"], ["SOPORIFIC", "somnolent", "졸리게 하는"], ["PHLEGMATIC", "impassive", "침착한, 무감정한"]
];
export const ACRONYMS = [
    ["LASER", "Light Amplification by Stimulated Emission of Radiation", "물리학 · 빛", ["Light Amplified by Simulated Energy Radiation", "Luminous Array of Stimulated Electron Rays", "Linear Amplification of Synchronized Emitted Radiation"]],
    ["RADAR", "Radio Detection And Ranging", "전파 · 탐지", ["Radio Analysis of Distance And Range", "Rapid Area Detection And Reconnaissance", "Radial Detection of Aircraft by Radio"]],
    ["SONAR", "Sound Navigation And Ranging", "수중 음파", ["Sonic Oscillation for Navigation And Radar", "Submarine Observation by Noise And Radio", "Sound Network for Aquatic Ranging"]],
    ["SCUBA", "Self-Contained Underwater Breathing Apparatus", "잠수 장비", ["Submersible Compressed Underwater Breathing Air", "Standard Compressed Underwater Breathing Apparatus", "Self-Controlled Underwater Buoyancy Apparatus"]],
    ["CAPTCHA", "Completely Automated Public Turing test to tell Computers and Humans Apart", "인터넷 보안", ["Computer Automated Program To Check Human Access", "Completely Automated Protocol To Confirm Human Authentication", "Controlled Access Program To Challenge Hackers Automatically"]],
    ["UNESCO", "United Nations Educational, Scientific and Cultural Organization", "국제기구 · 문화유산", ["United Nations Environmental, Social and Cultural Organization", "Union of Nations for Education, Science and Culture Operations", "United Nations Economic, Scientific and Cultural Office"]],
    ["UNICEF", "United Nations International Children's Emergency Fund", "국제기구 · 어린이", ["United Nations Institute for Children's Education and Food", "United Nations International Child Education Foundation", "Universal Network for International Children's Emergency Funding"]],
    ["NASDAQ", "National Association of Securities Dealers Automated Quotations", "미국 증권 시장", ["North American Stock and Derivatives Automated Quotations", "National Automated Securities and Debt Accounting Quotient", "New American Securities Dealers Automated Quotes"]],
    ["DARPA", "Defense Advanced Research Projects Agency", "미국 국방 연구", ["Department of Advanced Research and Planning Administration", "Defense Applied Robotics and Programming Agency", "Digital Advanced Research Protocol Authority"]],
    ["CERN", "Conseil Européen pour la Recherche Nucléaire", "유럽 입자물리 연구소 (프랑스어)", ["Centre Européen de Recherche Numérique", "Commission Européenne pour la Recherche Naturelle", "Conseil Européen de Radiation Nucléaire"]],
    ["FIFA", "Fédération Internationale de Football Association", "축구 (프랑스어)", ["Federation of International Football Associations", "Fédération Internationale des Footballeurs Amateurs", "Fellowship of International Football Athletes"]],
    ["JPEG", "Joint Photographic Experts Group", "이미지 파일 형식", ["Joint Picture Encoding Group", "Japanese Photographic Engineering Guild", "Joint Pixel Exchange Graphics"]],
    ["GIF", "Graphics Interchange Format", "이미지 파일 형식", ["Graphic Image File", "General Image Format", "Graphical Interface Frame"]],
    ["SQL", "Structured Query Language", "데이터베이스", ["Sequential Query Logic", "Standard Question Language", "Simple Query Lookup"]],
    ["HTTP", "Hypertext Transfer Protocol", "웹 통신", ["High Throughput Text Protocol", "Hyperlink Text Transmission Process", "Hypermedia Transfer Technology Platform"]],
    ["TASER", "Thomas A. Swift's Electric Rifle", "전기 충격기 (소설 제목에서 유래)", ["Tactical Automatic Shock Emitting Rifle", "Targeted Anti-personnel Shock Electro Rifle", "Temporary Arrest by Shock and Electric Restraint"]],
    ["ZIP (code)", "Zone Improvement Plan", "미국 우편번호", ["Zonal Index of Postcodes", "Zone Identification Program", "Zip Index of Post"]],
    ["SWAT", "Special Weapons And Tactics", "경찰 특수부대", ["Special Warfare And Tactical team", "Strategic Weapons Assault Team", "Security Weapons And Training"]],
    ["INTERPOL", "International Criminal Police Organization", "국제 경찰", ["International Police Liaison", "Internal Police Operations League", "International Terrorism Prevention Organization"]],
    ["RSVP", "Répondez s'il vous plaît", "초대장 (프랑스어)", ["Reply Soon, Very Pleased", "Respond Swiftly, Venue Pending", "Réservez Sans Votre Partenaire"]],
    ["AWOL", "Absent Without Official Leave", "군대 · 무단이탈", ["Away Without Leave", "Absent With Out Lawful Order", "Assigned Without Official Location"]],
    ["OPEC", "Organization of the Petroleum Exporting Countries", "석유", ["Organization of Petroleum and Energy Corporations", "Oil Producing and Exporting Consortium", "Organization for Petroleum Economic Cooperation"]],
    ["ASEAN", "Association of Southeast Asian Nations", "동남아시아 협력", ["Alliance of South-East Asian Nations", "Asian Security and Economic Alliance Network", "Association of South and East Asian Nations"]],
    ["MRI", "Magnetic Resonance Imaging", "의료 영상", ["Medical Radiation Imaging", "Magnetic Radio Inspection", "Molecular Resonance Instrument"]],
    ["IUPAC", "International Union of Pure and Applied Chemistry", "화학 명명법", ["International Union of Physics and Applied Chemistry", "Institute for Universal Pure and Applied Chemistry", "International Union of Particle and Atomic Chemistry"]],
    ["GDPR", "General Data Protection Regulation", "EU 개인정보 법", ["Global Data Privacy Rules", "General Digital Privacy Regulation", "Government Data Protection Registry"]],
    ["NAFTA", "North American Free Trade Agreement", "무역 협정", ["North Atlantic Free Trade Association", "National American Fair Trade Act", "North American Financial Trade Alliance"]],
    ["CRISPR", "Clustered Regularly Interspaced Short Palindromic Repeats", "유전자 가위", ["Controlled Recombinant Insertion of Specific Protein Repeats", "Clustered Repeats In Spliced Palindromic RNA", "Cellular Regulation by Interspaced Short Protein Repeats"]],
    ["NIMBY", "Not In My Back Yard", "지역 이기주의", ["No Investment in My Building Yard", "Neighbors In My Backyard", "Not Interested, Move Beyond Yonder"]],
    ["SNAFU", "Situation Normal: All Fouled Up", "군대 은어", ["Systems Not Activated For Use", "Standard Notice: All Forces Unite", "Serious Network And Function Unavailable"]]
];

const pickN = (arr, n) => { const a = [...arr], out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); return out; };
const shuffle = a => pickN(a, a.length);
// recently asked questions are skipped (kept in memory for the session)
const recent = [];
export function quizQuestion() {
    const syn = Math.random() < 0.55;
    const pool = (syn ? SYNONYMS : ACRONYMS).filter(x => !recent.includes(x[0]));
    const x = pool[Math.floor(Math.random() * pool.length)] || (syn ? SYNONYMS : ACRONYMS)[0];
    recent.push(x[0]); if (recent.length > 30) recent.shift();
    if (syn) {
        const wrong = pickN(SYNONYMS.filter(y => y[0] !== x[0]).map(y => y[1]), 3);
        return { kind: "synonym", label: "📚 English Synonym", q: `Which word is a SYNONYM of "${x[0]}"?`, options: shuffle([x[1], ...wrong]), answer: x[1], hint: `뜻: ${x[2]}` };
    }
    return { kind: "acronym", label: "🌍 Trivia · Acronym", q: `What does "${x[0]}" stand for?`, options: shuffle([x[1], ...x[3]]), answer: x[1], hint: `분야: ${x[2]}` };
}
