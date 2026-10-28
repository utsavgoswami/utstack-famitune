import styles from './app.module.css';
import { ListeningBench } from './listening';
import { MusicXmlScore } from './music-xml-score';
import {
  MEASURE_XML,
  NOTE_XML,
  PART_XML,
  STAFF_XML,
  VOICE_XML,
} from './examples';

type SheetTerm = {
  id: string;
  term: string;
  definition: string;
  lookAt: string;
  xml: string;
  label: string;
};

const SHEET_TERMS: SheetTerm[] = [
  {
    id: 'note',
    term: 'Note',
    definition:
      'A note is one sound. A note has a pitch. A note has a duration. The pitch says which sound to play. The duration says how long the sound lasts. C4 is middle C.',
    lookAt:
      'Find one oval note head. The note has no stem. A note with an empty head and no stem is a whole note.',
    xml: NOTE_XML,
    label: 'One whole note C4 in one measure',
  },
  {
    id: 'measure',
    term: 'Measure (bar)',
    definition:
      'A measure is one block of time in music. In 4/4 time, one measure holds 4 quarter-note beats. A barline ends one measure. The next measure starts after the barline.',
    lookAt:
      'Find the vertical line in the middle. That line is a barline. 4 notes come before the barline. 4 notes come after the barline.',
    xml: MEASURE_XML,
    label: 'Two measures with four quarter notes in each measure',
  },
  {
    id: 'staff',
    term: 'Staff (stave)',
    definition:
      'A staff is 5 horizontal lines. Count the 5 lines as 1 staff. Do not count each line as one staff. A higher note position means a higher pitch. In treble clef, the 5 lines give E, G, B, D, and F from bottom to top. The 4 spaces give F, A, C, and E from bottom to top. A note can also sit above the 5 lines or below the 5 lines. A ledger line is a short line through a note or near a note. Ledger lines extend the staff for high notes and low notes. Middle C sits on one ledger line below the treble staff. The word stave means the same as the word staff.',
    lookAt:
      'Find the notes. The notes move up the lines from left to right. Each next note has a higher pitch.',
    xml: STAFF_XML,
    label: 'A scale that moves up on one treble staff',
  },
  {
    id: 'voice',
    term: 'Voice',
    definition:
      'A voice is one melodic line on one staff. Two voices can share one staff. Stems point up for voice 1. Stems point down for voice 2. A voice is not only a singing part. Piano music also has voices. In this example, both voices stay inside the 5 lines. A voice can also use notes above the lines or below the lines.',
    lookAt:
      'Find the top notes. Their stems point up. That is voice 1. Find the lower notes. Their stems point down. That is voice 2. Both voices use the same 5 lines and the same 4 spaces.',
    xml: VOICE_XML,
    label:
      'Two voices on one staff. Voice 1 has stems up. Voice 2 has stems down.',
  },
  {
    id: 'part',
    term: 'Part',
    definition:
      'A part is the complete music for one instrument. This score has 2 parts. The Melody part uses the top staff. The Bass part uses the bottom staff. The 2 parts sound at the same time.',
    lookAt:
      'Find 2 staves. The top staff is the Melody part. The bottom staff is the Bass part.',
    xml: PART_XML,
    label:
      'Two parts. The Melody part is at the top. The Bass part is at the bottom.',
  },
];

type Term = {
  id: string;
  term: string;
  kind: string;
  definition: string;
  notThis: string;
  example: string;
};

const TERMS: Term[] = [
  {
    id: 'stream',
    term: 'Stream',
    kind: 'Converter term. This is not a sheet-music term.',
    definition:
      'One stream is one sequence of notes in time order. The sequence can cross many measures. The sequence can include rests. At one moment, a stream gives zero notes or one note. A stream never gives two notes at the same moment.',
    notThis:
      'A stream is not the 5 lines of a staff. A stream is not one row of music on a printed page. One row of music on a printed page is a system.',
    example:
      'A piano part gives 2 streams. One stream comes from the right hand. One stream comes from the left hand.',
  },
  {
    id: 'monophonic-stream',
    term: 'Monophonic stream',
    kind: 'Converter term. This is not a sheet-music term.',
    definition:
      'Monophonic means one sound at a time. A monophonic stream gives zero notes or one note at each moment. The speed of the notes does not matter. The difficulty of the notes does not matter.',
    notThis: 'Monophonic does not mean quiet. Monophonic does not mean simple.',
    example:
      'A flute melody is a monophonic stream. A piano chord is not monophonic. The converter must split a chord or select one note from the chord.',
  },
  {
    id: 'parallel-streams',
    term: 'Parallel streams',
    kind: 'Converter term. This is not a sheet-music term.',
    definition:
      'Parallel streams sound in the same time period. Each stream gives its own sequence of notes.',
    notThis:
      'Parallel does not describe the position of notes on the page. Parallel describes overlap in time.',
    example:
      'A melody and a bass line sound together. The score gives 2 parallel streams.',
  },
  {
    id: 'channel',
    term: 'Channel',
    kind: 'FamiStudio and NES term. This is not a sheet-music term.',
    definition:
      'A channel is one sound output of the NES hardware. The NES has 5 channels. The channels are Square1, Square2, Triangle, Noise, and DPCM. One channel plays zero notes or one note at each moment.',
    notThis:
      'A channel is not a staff. A channel is not a part. The converter assigns one stream to one channel.',
    example: 'The converter assigns the melody stream to the Square1 channel.',
  },
  {
    id: 'melodic-channel',
    term: 'Melodic channel',
    kind: 'FamiStudio and NES term. This is not a sheet-music term.',
    definition:
      'A melodic channel is a channel that plays pitches. Square1, Square2, and Triangle are melodic channels. A melody stream can only go to a melodic channel.',
    notThis:
      'Noise and DPCM are channels. Noise and DPCM are not melodic channels. Noise gives drum sounds. DPCM plays recorded samples.',
    example:
      'The NES has 3 melodic channels. At most 3 melody streams can sound at one moment.',
  },
];

function StaffVoicesDiagram() {
  const staffY = [35, 45, 55, 65, 75];
  const voice1 = [45, 50, 55, 50];
  const voice2 = [65, 75, 70, 75];
  return (
    <svg
      viewBox="0 0 340 130"
      role="img"
      aria-label="One staff with two voices: melody notes with stems up, harmony notes with stems down"
      className={styles.diagram}
    >
      {staffY.map((y) => (
        <line
          key={y}
          x1="10"
          y1={y}
          x2="330"
          y2={y}
          stroke="#888"
          strokeWidth="1"
        />
      ))}
      {voice1.map((y, i) => (
        <g key={`v1-${i}`}>
          <ellipse cx={60 + i * 70} cy={y} rx="9" ry="6" fill="#2563eb" />
          <line
            x1={69 + i * 70}
            y1={y}
            x2={69 + i * 70}
            y2={y - 28}
            stroke="#2563eb"
            strokeWidth="2"
          />
        </g>
      ))}
      {voice2.map((y, i) => (
        <g key={`v2-${i}`}>
          <ellipse cx={60 + i * 70} cy={y} rx="9" ry="6" fill="#dc2626" />
          <line
            x1={51 + i * 70}
            y1={y}
            x2={51 + i * 70}
            y2={y + 24}
            stroke="#dc2626"
            strokeWidth="2"
          />
        </g>
      ))}
      <text x="10" y="12" fontSize="11" fill="#2563eb">
        voice 1: melody (stems up)
      </text>
      <text x="180" y="124" fontSize="11" fill="#dc2626">
        voice 2: harmony (stems down)
      </text>
    </svg>
  );
}

function FlowDiagram() {
  return (
    <svg
      viewBox="0 0 340 120"
      role="img"
      aria-label="Flow from sheet music parts to streams to NES channels"
      className={styles.diagram}
    >
      <rect
        x="5"
        y="35"
        width="90"
        height="50"
        rx="6"
        fill="#eef2ff"
        stroke="#6366f1"
      />
      <text x="50" y="55" textAnchor="middle" fontSize="11">
        piano part
      </text>
      <text x="50" y="72" textAnchor="middle" fontSize="11">
        2 voices
      </text>
      <rect
        x="125"
        y="10"
        width="90"
        height="34"
        rx="6"
        fill="#eff6ff"
        stroke="#2563eb"
      />
      <text x="170" y="31" textAnchor="middle" fontSize="11">
        stream 1
      </text>
      <rect
        x="125"
        y="76"
        width="90"
        height="34"
        rx="6"
        fill="#eff6ff"
        stroke="#2563eb"
      />
      <text x="170" y="97" textAnchor="middle" fontSize="11">
        stream 2
      </text>
      <rect
        x="245"
        y="10"
        width="90"
        height="34"
        rx="6"
        fill="#fef2f2"
        stroke="#dc2626"
      />
      <text x="290" y="31" textAnchor="middle" fontSize="11">
        Square1
      </text>
      <rect
        x="245"
        y="76"
        width="90"
        height="34"
        rx="6"
        fill="#fef2f2"
        stroke="#dc2626"
      />
      <text x="290" y="97" textAnchor="middle" fontSize="11">
        Triangle
      </text>
      <line x1="95" y1="50" x2="125" y2="27" stroke="#333" strokeWidth="1.5" />
      <line x1="95" y1="70" x2="125" y2="93" stroke="#333" strokeWidth="1.5" />
      <line x1="215" y1="27" x2="245" y2="27" stroke="#333" strokeWidth="1.5" />
      <line x1="215" y1="93" x2="245" y2="93" stroke="#333" strokeWidth="1.5" />
    </svg>
  );
}

export function App() {
  return (
    <main className={styles.page}>
      <h1>MusicXML to NES: term glossary</h1>
      <p className={styles.lede}>
        This page defines sheet-music words first. Each sheet-music word has a
        rendered MusicXML example. The page then defines the converter words.
        The converter words are stream and channel.{' '}
        <a href="#listening-heading">Skip to the listening bench ↓</a>
      </p>

      <section aria-labelledby="sheet-heading">
        <h2 id="sheet-heading">Sheet-music words, with rendered examples</h2>
        <p>
          OpenSheetMusicDisplay renders each MusicXML example in the browser.
          First read the definition. Then find the item in the rendered score.
        </p>
        {SHEET_TERMS.map((t) => (
          <section key={t.id} aria-labelledby={`sheet-${t.id}`}>
            <h3 id={`sheet-${t.id}`}>{t.term}</h3>
            <p>{t.definition}</p>
            <MusicXmlScore xml={t.xml} label={t.label} />
            <p className={styles.kind}>{t.lookAt}</p>
          </section>
        ))}
      </section>

      <section aria-labelledby="voices-heading">
        <h2 id="voices-heading">Same idea as a diagram</h2>
        <p>
          The diagram shows the same idea as the Voice example. Both voices
          share the same 5 staff lines. MusicXML gives each note a voice number.
          The converter uses the voice number to separate the 2 voices.
        </p>
        <StaffVoicesDiagram />
      </section>

      {TERMS.map((t) => (
        <section key={t.id} aria-labelledby={`term-${t.id}`}>
          <h2 id={`term-${t.id}`}>{t.term}</h2>
          <p className={styles.kind}>{t.kind}</p>
          <p>{t.definition}</p>
          <p>
            <strong>Not this:</strong> {t.notThis}
          </p>
          <p>
            <strong>Example:</strong> {t.example}
          </p>
        </section>
      ))}

      <section aria-labelledby="flow-heading">
        <h2 id="flow-heading">How the words connect</h2>
        <p>
          The converter splits sheet music into streams. Sheet music gives
          parts, staves, and voices. The converter assigns each stream to one
          channel. Parallel streams need parallel channels. The NES has only 3
          melodic channels.
        </p>
        <FlowDiagram />
      </section>

      <section aria-labelledby="listening-heading">
        <h2 id="listening-heading">Listening bench: judge the four fixtures</h2>
        <ListeningBench />
      </section>
    </main>
  );
}

export default App;
