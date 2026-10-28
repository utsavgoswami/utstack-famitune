import { describe, expect, it } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { convertPiece } from '../convert/convert.js';
import { convertScoreToText, emitFamiStudioText, midiToName, projectFromConverted } from './emit.js';

const SCORE = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
  `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
  `<part id="P1">${body}</part></score-partwise>`;

describe('midiToName', () => {
  it('spells sharps and shifts out-of-range pitches by octave', () => {
    expect(midiToName(60)).toEqual({ name: 'C3', octaveShifted: false });
    expect(midiToName(63)).toEqual({ name: 'D#3', octaveShifted: false });
    expect(midiToName(0)).toEqual({ name: 'C0', octaveShifted: true });
    expect(midiToName(120)).toEqual({ name: 'C7', octaveShifted: true });
  });
});

describe('emitFamiStudioText', () => {
  it('emits PatternCustomSettings for pickup length and tempo changes', () => {
    const parsed = parseScore(
      SCORE(
        `<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>` +
          `<sound tempo="90"/><note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration></note></measure>` +
          `<measure number="2"><sound tempo="140"/><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note></measure>`,
      ),
    );
    const converted = convertPiece(parsed);
    const { text } = emitFamiStudioText(projectFromConverted('Pickup Tempo', converted, parsed.measures.length));
    expect(text).toContain('PatternCustomSettings Time="0" Length="8"');
    expect(text).toMatch(/PatternCustomSettings Time="0" Length="8" NoteLength="\d+" Groove="[^"]+" BeatLength="\d+" GroovePaddingMode="Middle"/);
    expect(text).toMatch(/PatternCustomSettings Time="1" (Groove="[^"]+"|NoteLength="\d+")/);
    expect(text).toContain('Project Version="4.5.0"');
  });

  it('counts octave-shifted notes into the report', () => {
    const parsed = parseScore(
      SCORE(
        `<measure number="1"><attributes><divisions>1</divisions></attributes>` +
          `<note><pitch><step>C</step><octave>9</octave></pitch><duration>4</duration></note></measure>`,
      ),
    );
    const { text, report } = convertScoreToText('High', parsed);
    expect(report.octaveShiftedNotes).toBe(1);
    expect(text).toMatch(/Value="C7"/);
  });
});
