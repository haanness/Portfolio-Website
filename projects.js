// projects.js — All project content in one place.
// To add a project: add an entry here + add it to portfolioCategories in script.js.
//
// Each project:
//   id        — matches the slug in script.js (used as URL ?id=)
//   title     — shown as page title and h1
//   category  — category slug matching a portfolio tab (e.g. "graphic-design",
//               "animation", "paintings-drawings"); translated via i18n.js
//   year      — e.g. "2024"
//   body      — array of paragraph strings, OR an { en, de, it } object of
//               such arrays for a localized description (falls back to en)
//   details   — no longer displayed anywhere (kept only as inert legacy data)
//   credits   — optional array of { name, role } pairs, rendered as a
//               horizontal divider followed by a name/role credits list
//   hero      — image path for the full-width top image, or null for placeholder
//   images    — array of { src, ratio } objects
//                 src   — image path, or null for placeholder
//                 ratio — padding-top % string, e.g. "125%" (4:5), "75%" (4:3),
//                         "100%" (square), "56.25%" (16:9), "140%" (tall portrait)

const PROJECTS = {

  'washed-out': {
    title:    'Washed Out',
    category: 'animation',
    year:     '2026',
    body: {
      en: [
        'Washed Out is an animated short film about failure and powerlessness. Five parallel narrated stories describe different life situations. The connecting element is the motif of being “stuck.” The characters are unable to move forward, paralyzed by their circumstances or themselves.',
        'This is contrasted with life advice from motivational coaches in the form of audio snippets from short videos. They reproduce the common narrative of the individualistic path to happiness and success. The aim is to highlight the tensions between the complex problems of realistic life situations and the inadequate responses of the content on individualistic social media.',
        'In addition, the film makes it possible to empathize with what it can mean to be powerless, stuck, and to fail in a society where supposedly anyone can make it.',
      ],
      de: [
        'Washed Out ist ein animierter Kurzfilm über Scheitern und Machtlosigkeit. In fünf parallel erzählten Geschichten werden unterschiedliche Lebenssituationen beschrieben. Das verbindende Element ist das Motiv des „Feststeckens“. Die Charaktere kommen nicht weiter, sind gelähmt von ihren Umständen, oder sich selbst.',
        'Dem werden Lebensratschläge von Motivationscoaches in Form von Audio-Schnipseln aus Kurzvideos gegenübergestellt. Sie reproduzieren die gängige Erzählung des individualistischen Wegs zu Glück und Erfolg. So sollen die Spannungen zwischen den vielschichtigen Problemen realistischer Lebenssituationen und den unzureichenden Antworten der Inhalte, in individualistisch geprägten sozialen Medien aufgezeigt werden.',
        'Zudem soll nachempfindbar gemacht werden, was es bedeuten kann, in einer Gesellschaft, in der es angeblich „jede:r schaffen kann“, machtlos zu sein, festzustecken und zu scheitern.',
      ],
      it: [
        '„Washed Out” è un cortometraggio animato che affronta il tema del fallimento e della mancanza di controllo. Cinque storie narrate in parallelo descrivono diverse situazioni di vita. L\'elemento che le accomuna è il motivo dell\'essere „bloccati”. I personaggi non riescono ad andare avanti, paralizzati dalle circostanze o da se stessi.',
        'A ciò si contrappongono i consigli di vita impartiti da coach motivazionali sotto forma di frammenti audio tratti da brevi video, che ripropongono il racconto comune del percorso individualistico verso la felicità e il successo. L\'obiettivo è mettere in luce le tensioni tra i problemi complessi delle situazioni di vita reali e le risposte inadeguate fornite dai contenuti dei social media individualistici.',
        'Inoltre, il film permette di immedesimarsi in ciò che può significare sentirsi impotenti, bloccati e falliti in una società in cui, presumibilmente, chiunque può farcela.',
      ],
    },
    credits: [
      { name: 'Anja Lechthaler',      role: 'Sounddesigner' },
      { name: 'Anton Vertipolokh',    role: 'Sounddesigner' },
      { name: 'Alexander Siegl',      role: 'Mixer' },
      { name: 'Adele Ischia, Sulu Records', role: 'Music' },
    ],
    // youtube: embed ID shown as first slide
    youtube: 'nMmstND8BKY',
    // hero: array of image paths for slideshow
    // Adjust filenames/extensions to match your Images/ folder
    hero: [
      'Images/Poster_washed_out.webp',
      'Images/Still1_washed_out.webp',
      'Images/Still2_washed_out.webp',
      'Images/Still3_washed_out.webp',
      'Images/Still4_washed_out.webp',
      'Images/Still5_washed_out.webp',
    ],
  },

  '105-7336': {
    title:    '105 7336',
    category: 'paintings-drawings',
    year:     '2022',
    body: [],
    hero: [
      'Images/105_7336.webp',
    ],
  },

  'interspaces': {
    title:    'Interspaces',
    category: 'paintings-drawings',
    year:     '2023',
    body: {
      en: [
        'This series of digital paintings is united by the motif of the house entrance. It is about understanding a space between inside and outside that, no matter how often you pass through it, always feels unfamiliar. The realistic digital rendering of these non-places deliberately plays with the aesthetics of a low-quality cell phone photo. Through this everyday, unstaged perspective, the motifs become more real and invite reflection on the otherwise unnoticed.',
      ],
      de: [
        'Diese Serie aus digitalen Malereien ist verbunden durch das Motiv des Hauseingangs. Es ging um das Verstehen eines Raums zwischen drinnen uns draußen, der sich egal wie oft man ihn durchquert immer fremd anfühlt. Die realistische digitale Ausarbeitung dieser nicht-Orte spielt bewusst mit der Ästhetik eines Handyfotos mit schlechter Qualität. Durch diesen alltäglichen, uninszenierten Blick werden die Motive realer und laden zur Reflexion über das sonst nicht wahrgenommene ein.',
      ],
      it: [
        'Questa serie di dipinti digitali è connessa dal motivo del soggetto dell\'entrata di casa. L\'obiettivo era comprendere uno spazio tra l\'interno e l\'esterno che, indipendentemente da quante volte lo si attraversi, sembra sempre estraneo. La realistica elaborazione digitale di questi non-luoghi gioca volutamente con l\'estetica di una foto scattata con un cellulare di scarsa qualità. Attraverso questo sguardo quotidiano e non in posa, i soggetti diventano più reali e invitano a riflettere su ciò che altrimenti non verrebbe percepito.',
      ],
    },
    hero: [
      'Images/Interspaces1.webp',
      'Images/Interspaces2.webp',
      'Images/Interspaces3.webp',
      'Images/Interspaces4.webp',
    ],
  },

  'most-humans': {
    title:    '(most) humans',
    category: 'graphic-design',
    year:     '2022',
    body: {
      en: [
        'This poster addresses the social unfairness connected to climate change and describes the three stages of injustice.',
      ],
      de: [
        'Dieses Plakat thematisiert die mit dem Klimawandel verbundene soziale Ungerechtigkeit und beschreibt sie in drei Stufen.',
      ],
      it: [
        'Questo poster affronta il tema delle ingiustizie sociali legate al cambiamento climatico e descrive le tre fasi dell\'ingiustizia.',
      ],
    },
    hero: [
      'Images/(most)_humans.webp',
    ],
  },

  'holzschnitte': {
    title:    'Holzschnitte',
    category: 'paintings-drawings',
    year:     '2024',
    body: [],
    hero: [
      'Images/Holzschnitt1.webp',
      'Images/Holzschnitt2.webp',
    ],
  },

  'sketches': {
    title:    'Sketches',
    category: 'paintings-drawings',
    year:     '2020 — Now',
    body: [],
    hero: [
      'Images/Sketchbook1.webp',
      'Images/Sketchbook2.webp',
      'Images/Sketchbook3.webp',
      'Images/Sketchbook4.webp',
    ],
  },

};