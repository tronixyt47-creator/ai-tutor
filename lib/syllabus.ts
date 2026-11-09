// CBSE Class 10 syllabus map (rationalised NCERT syllabus).
// Chapter names follow the current NCERT textbooks so the tutor can point
// students at the right book and exercise set.

export type Chapter = {
  id: string;
  name: string;
  topics: string[];
};

export type Subject = {
  id: string;
  name: string;
  short: string;
  accent: string; // tailwind gradient stops
  paper: string; // exam pattern hint shown in the UI
  chapters: Chapter[];
};

const ch = (id: string, name: string, topics: string[]): Chapter => ({ id, name, topics });

export const SUBJECTS: Subject[] = [
  {
    id: "maths",
    name: "Mathematics",
    short: "Maths",
    accent: "from-violet-500/25 to-indigo-500/10",
    paper: "80 marks theory + 20 internal · 3 hours",
    chapters: [
      ch("real-numbers", "Real Numbers", [
        "Euclid's division lemma",
        "Fundamental Theorem of Arithmetic",
        "HCF and LCM",
        "Irrational numbers",
      ]),
      ch("polynomials", "Polynomials", [
        "Zeroes and coefficients",
        "Division algorithm",
        "Reading graphs of polynomials",
      ]),
      ch("linear-equations", "Pair of Linear Equations", [
        "Graphical method",
        "Substitution and elimination",
        "Word problems",
        "Consistency of a pair",
      ]),
      ch("quadratic-equations", "Quadratic Equations", [
        "Factorisation",
        "Quadratic formula",
        "Nature of roots (discriminant)",
        "Word problems",
      ]),
      ch("arithmetic-progressions", "Arithmetic Progressions", [
        "nth term",
        "Sum of n terms",
        "AP word problems",
      ]),
      ch("triangles", "Triangles", [
        "Similarity criteria",
        "Basic Proportionality Theorem",
        "Pythagoras theorem and areas",
      ]),
      ch("coordinate-geometry", "Coordinate Geometry", [
        "Distance formula",
        "Section formula",
        "Midpoint formula",
      ]),
      ch("trigonometry", "Introduction to Trigonometry", [
        "Trigonometric ratios",
        "Values at standard angles",
        "Trigonometric identities",
      ]),
      ch("applications-of-trigonometry", "Applications of Trigonometry", [
        "Heights and distances",
        "Angle of elevation and depression",
      ]),
      ch("circles", "Circles", [
        "Tangent and its properties",
        "Number of tangents from a point",
        "Tangent theorems",
      ]),
      ch("areas-related-to-circles", "Areas Related to Circles", [
        "Area of sector and segment",
        "Combinations of plane figures",
      ]),
      ch("surface-areas-volumes", "Surface Areas and Volumes", [
        "Combination of solids",
        "Frustum of a cone",
        "Conversion of solids",
      ]),
      ch("statistics", "Statistics", [
        "Mean: direct, assumed mean, step deviation",
        "Median of grouped data",
        "Mode of grouped data",
        "Ogive and cumulative frequency",
      ]),
      ch("probability", "Probability", [
        "Classical probability",
        "Cards, dice and coins problems",
        "Complementary events",
      ]),
    ],
  },
  {
    id: "science",
    name: "Science",
    short: "Science",
    accent: "from-emerald-500/25 to-teal-500/10",
    paper: "80 marks theory + 20 internal · 3 hours",
    chapters: [
      ch("chemical-reactions", "Chemical Reactions and Equations", [
        "Balancing chemical equations",
        "Types of reactions",
        "Oxidation and reduction",
        "Corrosion and rancidity",
      ]),
      ch("acids-bases-salts", "Acids, Bases and Salts", [
        "pH scale and indicators",
        "Reactions of acids and bases",
        "Baking soda, washing soda, bleaching powder, POP",
      ]),
      ch("metals-nonmetals", "Metals and Non-metals", [
        "Reactivity series",
        "Ionic compounds",
        "Extraction of metals",
        "Corrosion and alloys",
      ]),
      ch("carbon-compounds", "Carbon and its Compounds", [
        "Covalent bonding",
        "Homologous series and functional groups",
        "Substitution, addition, esterification",
        "Soaps and detergents",
      ]),
      ch("life-processes", "Life Processes", [
        "Nutrition",
        "Respiration",
        "Transportation",
        "Excretion",
      ]),
      ch("control-coordination", "Control and Coordination", [
        "Reflex action",
        "Human nervous system",
        "Hormones in animals",
        "Plant hormones and tropisms",
      ]),
      ch("reproduction", "How do Organisms Reproduce?", [
        "Asexual reproduction",
        "Flower structure and pollination",
        "Human reproductive system",
        "Reproductive health",
      ]),
      ch("heredity", "Heredity", [
        "Mendel's experiments",
        "Monohybrid and dihybrid crosses",
        "Sex determination in humans",
      ]),
      ch("light", "Light: Reflection and Refraction", [
        "Reflection and spherical mirrors",
        "Mirror formula and magnification",
        "Refraction and lenses",
        "Lens formula and power",
      ]),
      ch("human-eye", "The Human Eye and the Colourful World", [
        "Structure of the eye",
        "Defects of vision and correction",
        "Prism and dispersion",
        "Scattering: Tyndall effect",
      ]),
      ch("electricity", "Electricity", [
        "Ohm's law",
        "Resistance and resistivity",
        "Series and parallel circuits",
        "Heating effect and electric power",
      ]),
      ch("magnetic-effects", "Magnetic Effects of Electric Current", [
        "Magnetic field and field lines",
        "Force on a current-carrying conductor",
        "Electric motor",
        "Electromagnetic induction and generator",
        "Domestic electric circuits",
      ]),
      ch("our-environment", "Our Environment", [
        "Food chains and trophic levels",
        "Biodegradable and non-biodegradable waste",
        "Ozone depletion and waste management",
      ]),
    ],
  },
  {
    id: "history",
    name: "History",
    short: "History",
    accent: "from-amber-500/25 to-orange-500/10",
    paper: "Part of the 80-mark Social Science paper",
    chapters: [
      ch("nationalism-europe", "The Rise of Nationalism in Europe", [
        "French Revolution and the idea of the nation",
        "Making of Germany and Italy",
        "Nationalism and imperialism",
      ]),
      ch("nationalism-india", "Nationalism in India", [
        "First World War and Khilafat",
        "Non-Cooperation and Civil Disobedience",
        "Sense of collective belonging",
      ]),
      ch("global-world", "The Making of a Global World", [
        "Pre-modern world and silk routes",
        "Nineteenth century global economy",
        "The Great Depression",
      ]),
      ch("industrialisation", "The Age of Industrialisation", [
        "Proto-industrialisation",
        "Factories and hand labour",
        "Market for goods",
      ]),
      ch("print-culture", "Print Culture and the Modern World", [
        "Print revolution",
        "Print and the French Revolution",
        "Print in India",
      ]),
    ],
  },
  {
    id: "geography",
    name: "Geography",
    short: "Geography",
    accent: "from-sky-500/25 to-cyan-500/10",
    paper: "Part of the 80-mark Social Science paper",
    chapters: [
      ch("resources-development", "Resources and Development", [
        "Classification of resources",
        "Soil types and conservation",
        "Land degradation",
      ]),
      ch("forest-wildlife", "Forest and Wildlife Resources", [
        "Biodiversity and its loss",
        "Conservation strategies",
        "Community and conservation",
      ]),
      ch("water-resources", "Water Resources", [
        "Water scarcity and dams",
        "Rainwater harvesting",
        "Multipurpose river projects",
      ]),
      ch("agriculture", "Agriculture", [
        "Farming systems and cropping patterns",
        "Major crops",
        "Food security and technological reforms",
      ]),
      ch("minerals-energy", "Minerals and Energy Resources", [
        "Types of minerals",
        "Distribution of minerals",
        "Conventional and non-conventional energy",
      ]),
      ch("manufacturing", "Manufacturing Industries", [
        "Classification of industries",
        "Iron, steel, textile and IT industries",
        "Industrial pollution",
      ]),
      ch("lifelines", "Lifelines of National Economy", [
        "Roadways, railways, pipelines",
        "Waterways and airways",
        "International trade and tourism",
      ]),
    ],
  },
  {
    id: "civics",
    name: "Political Science",
    short: "Civics",
    accent: "from-rose-500/25 to-pink-500/10",
    paper: "Part of the 80-mark Social Science paper",
    chapters: [
      ch("power-sharing", "Power Sharing", [
        "Belgium and Sri Lanka",
        "Majoritarianism",
        "Forms of power sharing",
      ]),
      ch("federalism", "Federalism", [
        "What makes India federal",
        "Union, State and Concurrent lists",
        "Decentralisation and panchayats",
      ]),
      ch("gender-religion-caste", "Gender, Religion and Caste", [
        "Gender and politics",
        "Communalism",
        "Caste in politics",
      ]),
      ch("political-parties", "Political Parties", [
        "Functions of parties",
        "National and regional parties",
        "Challenges and reforms",
      ]),
      ch("outcomes-of-democracy", "Outcomes of Democracy", [
        "Accountable and responsive government",
        "Economic growth and inequality",
        "Democracy and social diversity",
      ]),
    ],
  },
  {
    id: "economics",
    name: "Economics",
    short: "Economics",
    accent: "from-lime-500/25 to-emerald-500/10",
    paper: "Part of the 80-mark Social Science paper",
    chapters: [
      ch("development", "Development", [
        "Different people, different goals",
        "National income and per capita income",
        "HDI and sustainability",
      ]),
      ch("sectors", "Sectors of the Indian Economy", [
        "Primary, secondary, tertiary sectors",
        "Organised and unorganised sector",
        "Public and private sector",
      ]),
      ch("money-credit", "Money and Credit", [
        "Money as a medium of exchange",
        "Formal and informal credit",
        "Self Help Groups",
      ]),
      ch("globalisation", "Globalisation and the Indian Economy", [
        "MNCs and foreign trade",
        "Liberalisation and WTO",
        "Impact of globalisation",
      ]),
      ch("consumer-rights", "Consumer Rights", [
        "Consumer exploitation",
        "Consumer Protection Act",
        "Right to information and redressal",
      ]),
    ],
  },
  {
    id: "english",
    name: "English",
    short: "English",
    accent: "from-fuchsia-500/25 to-purple-500/10",
    paper: "80 marks theory + 20 internal · First Flight & Footprints Without Feet",
    chapters: [
      ch("a-letter-to-god", "A Letter to God", ["Faith and irony", "Character of Lencho", "Theme and message"]),
      ch("nelson-mandela", "Nelson Mandela: Long Walk to Freedom", ["Freedom and its meaning", "Apartheid", "Tone of the speech"]),
      ch("two-stories-about-flying", "Two Stories about Flying", ["His First Flight", "Black Aeroplane", "Courage and trust"]),
      ch("anne-frank", "From the Diary of Anne Frank", ["Diary as a form", "Anne's character", "Humour and honesty"]),
      ch("glimpses-of-india", "Glimpses of India", ["A Baker from Goa", "Coorg", "Tea from Assam"]),
      ch("mijbil-the-otter", "Mijbil the Otter", ["Human-animal bond", "Descriptive writing", "Humour"]),
      ch("madam-rides-the-bus", "Madam Rides the Bus", ["Valli's character", "Curiosity and independence", "Theme"]),
      ch("sermon-at-benares", "The Sermon at Benares", ["Buddha's teaching", "Grief and wisdom", "Message"]),
      ch("the-proposal", "The Proposal", ["Satire", "Character sketch", "Drama and dialogue"]),
      ch("dust-of-snow", "Poem: Dust of Snow", ["Symbolism", "Change of mood", "Rhyme scheme"]),
      ch("fire-and-ice", "Poem: Fire and Ice", ["Symbols of desire and hate", "Rhyme scheme", "Theme"]),
      ch("tiger-in-the-zoo", "Poem: A Tiger in the Zoo", ["Contrast", "Poetic devices", "Theme of freedom"]),
      ch("the-ball-poem", "Poem: The Ball Poem", ["Loss and growing up", "Symbolism", "Tone"]),
      ch("amanda", "Poem: Amanda!", ["Freedom and nagging", "Poetic devices", "Tone"]),
      ch("the-trees", "Poem: The Trees", ["Nature and freedom", "Imagery", "Theme"]),
      ch("fog", "Poem: Fog", ["Metaphor", "Imagery", "Comparison with a cat"]),
      ch("custard-the-dragon", "Poem: The Tale of Custard the Dragon", ["Ballad form", "Humour", "Irony"]),
      ch("for-anne-gregory", "Poem: For Anne Gregory", ["Appearance vs inner beauty", "Irony", "Form"]),
      ch("triumph-of-surgery", "A Triumph of Surgery", ["Character of Tricki", "Humour", "Theme"]),
      ch("thiefs-story", "The Thief's Story", ["Hari Singh and Anil", "Trust and change", "Theme"]),
      ch("midnight-visitor", "The Midnight Visitor", ["Suspense", "Ausable's wit", "Detective fiction"]),
      ch("question-of-trust", "A Question of Trust", ["Horace Danby", "Irony", "Title significance"]),
      ch("footprints-without-feet", "Footprints without Feet", ["Griffin's character", "Science and ethics", "Theme"]),
      ch("making-of-a-scientist", "The Making of a Scientist", ["Richard Ebright", "Curiosity and hard work", "Theme"]),
      ch("the-necklace", "The Necklace", ["Matilda's character", "Irony", "Theme"]),
      ch("bholi", "Bholi", ["Bholi's transformation", "Education and dignity", "Theme"]),
      ch("book-that-saved-the-earth", "The Book That Saved the Earth", ["Science fiction", "Comedy", "Theme"]),
      ch("writing-skills", "Writing Skills", ["Formal letter", "Analytical paragraph", "Notice and report"]),
      ch("grammar", "Grammar", ["Tenses", "Modals", "Reported speech", "Determiners", "Subject-verb concord"]),
    ],
  },
  {
    id: "it",
    name: "Information Technology",
    short: "IT 402",
    accent: "from-cyan-500/25 to-blue-500/10",
    paper: "50 marks theory + 50 marks practical",
    chapters: [
      ch("digital-documentation", "Digital Documentation (Advanced)", [
        "Styles and templates",
        "Images, tables and mail merge",
        "Table of contents",
      ]),
      ch("spreadsheet", "Electronic Spreadsheet (Advanced)", [
        "Formulas and functions",
        "Goal seek and scenarios",
        "Linking sheets and consolidation",
        "Data tables and charts",
      ]),
      ch("database", "Database Management System", [
        "Tables, primary key, data types",
        "Queries and forms",
        "Reports",
      ]),
      ch("web-applications", "Web Applications and Security", [
        "HTML forms and CSS basics",
        "Networking and accessibility",
        "Workplace safety and IT security",
      ]),
    ],
  },
];

export const DEFAULT_SUBJECT = SUBJECTS[0];
export const DEFAULT_CHAPTER = DEFAULT_SUBJECT.chapters[0];

export function findSubject(id: string | null | undefined): Subject {
  return SUBJECTS.find((s) => s.id === id) ?? DEFAULT_SUBJECT;
}

export function findChapter(subjectId: string | null | undefined, chapterId: string | null | undefined): Chapter {
  const subject = findSubject(subjectId);
  return subject.chapters.find((c) => c.id === chapterId) ?? subject.chapters[0];
}
