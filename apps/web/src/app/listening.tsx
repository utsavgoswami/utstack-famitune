import { useState } from 'react';
import { MusicXmlScore } from './music-xml-score';
import styles from './listening.module.css';

import helloWorldXml from '../../../../packages/converter/fixtures/hello-world.musicxml?raw';
import chromaticXml from '../../../../packages/converter/fixtures/chromatic-scale.musicxml?raw';
import restsTieXml from '../../../../packages/converter/fixtures/rests-and-tie.musicxml?raw';
import twoStreamXml from '../../../../packages/converter/fixtures/two-stream-excerpt.musicxml?raw';
import helloWorldWav from '../../../../packages/converter/exports/hello-world/hello-world.wav?url';
import chromaticWav from '../../../../packages/converter/exports/chromatic-scale/chromatic-scale.wav?url';
import restsTieWav from '../../../../packages/converter/exports/rests-and-tie/rests-and-tie.wav?url';
import twoStreamWav from '../../../../packages/converter/exports/two-stream-excerpt/two-stream-excerpt.wav?url';
import helloWorldNsf from '../../../../packages/converter/exports/hello-world/hello-world.nsf?url';
import chromaticNsf from '../../../../packages/converter/exports/chromatic-scale/chromatic-scale.nsf?url';
import restsTieNsf from '../../../../packages/converter/exports/rests-and-tie/rests-and-tie.nsf?url';
import twoStreamNsf from '../../../../packages/converter/exports/two-stream-excerpt/two-stream-excerpt.nsf?url';

type Fixture = {
  id: string;
  title: string;
  xml: string;
  scoreLabel: string;
  wav: string;
  nsf: string;
  listenFor: string[];
  losses: string;
};

const FIXTURES: Fixture[] = [
  {
    id: 'hello-world',
    title: '1. Hello World',
    xml: helloWorldXml,
    scoreLabel: 'One whole note C4 in one 4/4 measure',
    wav: helloWorldWav,
    nsf: helloWorldNsf,
    listenFor: [
      'One clean C4 note.',
      'Full sustain near 2 seconds.',
      'No clicks and no early cutoff.',
    ],
    losses: 'None. The report must show zero losses.',
  },
  {
    id: 'chromatic-scale',
    title: '2. Chromatic scale',
    xml: chromaticXml,
    scoreLabel: 'Chromatic scale C4 to C5 and back, quarter notes at quarter equals 120',
    wav: chromaticWav,
    nsf: chromaticNsf,
    listenFor: [
      '25 even quarter notes at quarter equals 120.',
      'Ascending sharps from C4 to C5.',
      'Descending flats back to C4.',
      'Each step sounds distinct.',
    ],
    losses: 'None. Flats respell to sharps with exact pitch, so no loss is logged.',
  },
  {
    id: 'rests-and-tie',
    title: '3. Rests and tie melody',
    xml: restsTieXml,
    scoreLabel: 'Melody with rests, dots, and a tie across a barline',
    wav: restsTieWav,
    nsf: restsTieNsf,
    listenFor: [
      'C4 quarter note, then a truly silent quarter rest.',
      'One unbroken D across the barline (3 quarters, no re-attack).',
      'Dotted E, short F, then a closing rest.',
    ],
    losses: 'None. The tied D merges to one note before conversion.',
  },
  {
    id: 'two-stream-excerpt',
    title: '4. Two-stream excerpt',
    xml: twoStreamXml,
    scoreLabel: 'Melody part over bass part with one three-note chord',
    wav: twoStreamWav,
    nsf: twoStreamNsf,
    listenFor: [
      'Square lead melody over triangle bass (C3, then F2 whole notes).',
      'The three-note chord sounds only its top note, G5.',
      'A4 follows the chord, then silence.',
    ],
    losses: 'One declared loss: 2 dropped chord tones, counted in the report.',
  },
];

type Verdict = 'pass' | 'fail' | null;

function loadVerdict(id: string): Verdict {
  try {
    const saved = window.localStorage.getItem(`famitune-verdict-${id}`);
    return saved === 'pass' || saved === 'fail' ? saved : null;
  } catch {
    return null;
  }
}

function FixtureCard({ fixture }: { fixture: Fixture }) {
  const [verdict, setVerdict] = useState<Verdict>(() => loadVerdict(fixture.id));

  const choose = (next: 'pass' | 'fail') => {
    setVerdict(next);
    try {
      window.localStorage.setItem(`famitune-verdict-${fixture.id}`, next);
    } catch {
      // Private browsing or blocked storage: the verdict still shows.
    }
  };

  return (
    <section aria-labelledby={`listen-${fixture.id}`} className={styles.card}>
      <h3 id={`listen-${fixture.id}`}>{fixture.title}</h3>
      <MusicXmlScore xml={fixture.xml} label={fixture.scoreLabel} />
      <audio controls preload="none" src={fixture.wav} className={styles.player}>
        The browser cannot play this audio.
      </audio>
      <p>
        <a href={fixture.nsf} download={`${fixture.id}.nsf`}>
          Download the NSF
        </a>{' '}
        and play it in an NSF player or emulator as the real-NES check.
      </p>
      <h4>Listen for</h4>
      <ul>
        {fixture.listenFor.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        <strong>Expected losses:</strong> {fixture.losses}
      </p>
      <fieldset className={styles.verdict}>
        <legend>Verdict</legend>
        <label>
          <input
            type="radio"
            name={`verdict-${fixture.id}`}
            checked={verdict === 'pass'}
            onChange={() => choose('pass')}
          />{' '}
          Pass
        </label>
        <label>
          <input
            type="radio"
            name={`verdict-${fixture.id}`}
            checked={verdict === 'fail'}
            onChange={() => choose('fail')}
          />{' '}
          Fail
        </label>
      </fieldset>
    </section>
  );
}

export function ListeningBench() {
  const [copied, setCopied] = useState(false);
  const [generation, setGeneration] = useState(0);

  const copyVerdicts = async () => {
    const lines = FIXTURES.map((f) => {
      const verdict = loadVerdict(f.id);
      return `- ${f.id}: ${verdict === null ? 'UNJUDGED' : verdict.toUpperCase()}`;
    });
    const text = `Listening verdicts (MusicXML to NES vertical slice):\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const resetVerdicts = () => {
    try {
      for (const fixture of FIXTURES) {
        window.localStorage.removeItem(`famitune-verdict-${fixture.id}`);
      }
    } catch {
      // Storage already unavailable: nothing persisted to clear.
    }
    setCopied(false);
    setGeneration((g) => g + 1);
  };

  return (
    <div>
      <p>
        Each card shows the source score and its rendered WAV. Listen, judge
        each card, then copy the verdicts and paste them back to the agent.
      </p>
      {FIXTURES.map((fixture) => (
        <FixtureCard key={`${fixture.id}-${generation}`} fixture={fixture} />
      ))}
      <p>
        <button type="button" onClick={copyVerdicts}>
          Copy verdicts
        </button>{' '}
        <button type="button" onClick={resetVerdicts}>
          Reset verdicts
        </button>{' '}
        {copied ? 'Copied. Paste the text back to the agent.' : ''}
      </p>
    </div>
  );
}

export default ListeningBench;
