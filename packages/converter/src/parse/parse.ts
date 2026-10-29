import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { UnhandledConstruct } from '../report/report.js';
import { beatUnitQuarters, buildTempoMap, type RawTempoMark, type TempoMap, type TempoSource } from './tempo.js';

/**
 * Intermediate event model: the contract between the parse stage
 * and the adapt stage. An event carries stream identity, an absolute onset
 * in quarter notes, a duration in quarter notes, and (for pitched notes) a
 * MIDI pitch. The parse stage never uses NES frames; the adapt stage never
 * reads XML.
 */

/** One monophonic stream: the part, staff, and voice a note came from. */
export interface StreamId {
  part: string;
  staff: number;
  voice: string;
}

export interface NoteEvent {
  kind: 'note';
  stream: StreamId;
  /** Absolute onset in quarter notes from the start of the part. */
  onsetQuarters: number;
  /** Sounding duration in quarter notes. */
  durationQuarters: number;
  /**
   * Sounding MIDI pitch: written pitch plus the part `<transpose><chromatic>`
   * correction. May be fractional when `<alter>` is fractional; the adapt
   * stage rounds it and the report records the rounding.
   */
  midi: number;
  /** The note carries `<tie type="start">`; merged into one event in Increment 2. */
  tieStart: boolean;
  /** The note carries `<tie type="stop">`; merged into one event in Increment 2. */
  tieStop: boolean;
}

export interface RestEvent {
  kind: 'rest';
  stream: StreamId;
  /** Absolute onset in quarter notes from the start of the part. */
  onsetQuarters: number;
  /** Silence duration in quarter notes. */
  durationQuarters: number;
}

export type MusicEvent = NoteEvent | RestEvent;

/** Hard parse failure: the message names the problem and, when known, the part/measure location. */
export class MusicXmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MusicXmlParseError';
  }
}

const STEP_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Canonical sharp-only spelling for each pitch class: [step, alter]. */
const CANONICAL_SPELLING: Record<number, [string, number]> = {
  0: ['C', 0],
  1: ['C', 1],
  2: ['D', 0],
  3: ['D', 1],
  4: ['E', 0],
  5: ['F', 0],
  6: ['F', 1],
  7: ['G', 0],
  8: ['G', 1],
  9: ['A', 0],
  10: ['A', 1],
  11: ['B', 0],
};

/**
 * True when the written (step, alter) differs from the sharp-only spelling
 * of the written pitch (mapping spec section 1: flats respell to sharps,
 * pitch-exact). Fractional alters are microtones, not respellings.
 */
function needsRespelling(step: string, alter: number, writtenMidi: number): boolean {
  if (!Number.isInteger(alter)) return false;
  const pitchClass = ((Math.round(writtenMidi) % 12) + 12) % 12;
  const canonical = CANONICAL_SPELLING[pitchClass];
  if (!canonical) return false;
  return step !== canonical[0] || alter !== canonical[1];
}

type OrderedKids = unknown[];

interface Tagged {
  tag: string;
  kids: OrderedKids;
  attrs: Record<string, string>;
}

/** Split a preserveOrder node list into tag entries, keeping document order. */
function tagsOf(nodes: unknown): Tagged[] {
  if (!Array.isArray(nodes)) return [];
  const out: Tagged[] = [];
  for (const entry of nodes) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const attrs = (record[':@'] as Record<string, string> | undefined) ?? {};
    for (const [tag, value] of Object.entries(record)) {
      if (tag === ':@') continue;
      out.push({ tag, kids: Array.isArray(value) ? value : [], attrs });
    }
  }
  return out;
}

function firstChild(kids: OrderedKids, tag: string): Tagged | undefined {
  return tagsOf(kids).find((t) => t.tag === tag);
}

function hasChild(kids: OrderedKids, tag: string): boolean {
  return firstChild(kids, tag) !== undefined;
}

/** Text content of ordered node children, or '' when absent. */
function textOf(kids: OrderedKids): string {
  for (const kid of kids) {
    if (typeof kid === 'object' && kid !== null && '#text' in (kid as Record<string, unknown>)) {
      return String((kid as Record<string, unknown>)['#text']);
    }
  }
  return '';
}

/** Text content of the first `<tag>` child, or undefined when absent. */
function childText(kids: OrderedKids, tag: string): string | undefined {
  const child = firstChild(kids, tag);
  if (!child) return undefined;
  return textOf(child.kids);
}

function parseNumber(text: string | undefined): number | undefined {
  if (text === undefined || text === '') return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function createParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // Order matters: <backup>/<forward> interleave with <note> in the time
    // counter, so grouping by tag name would lose the cursor position.
    preserveOrder: true,
    trimValues: true,
    parseTagValue: true,
  });
}

/**
 * Parse partwise MusicXML into absolute-onset events plus the tempo map.
 * Rejects non-MusicXML input, malformed XML, and timewise scores with a
 * {@link MusicXmlParseError}. Skipped musical constructs (grace notes,
 * unpitched percussion, fractional pitch, repeats) land in
 * `unhandled` by name — nothing drops silently.
 */
export function parseScore(input: string): ParsedScore {
  const validation = XMLValidator.validate(input);
  if (validation !== true) {
    const { msg, line, col } = validation.err;
    throw new MusicXmlParseError(`malformed XML: ${msg} (line ${line}, column ${col})`);
  }
  const doc = createParser().parse(input) as unknown;
  const root = tagsOf(doc);
  if (root.some((t) => t.tag === 'score-timewise')) {
    throw new MusicXmlParseError(
      'unsupported layout: score-timewise scores are not supported in v1; provide a score-partwise score',
    );
  }
  const partwise = root.find((t) => t.tag === 'score-partwise');
  if (!partwise) {
    throw new MusicXmlParseError('not a MusicXML score: root is neither score-partwise nor score-timewise');
  }
  const { events, tempoMarks, unhandled, measures, endQuarters, enharmonicRespellings } = parsePartwise(
    partwise.kids,
  );
  return { events, tempoMap: buildTempoMap(tempoMarks), unhandled, measures, endQuarters, enharmonicRespellings };
}

/** One measure of the reference (first) part: absolute start and time signature. */
export interface MeasureInfo {
  ordinal: number;
  startQuarters: number;
  beats: number;
  beatType: number;
}

/** Parsed score: absolute-onset events plus the measure tempo map. */
export interface ParsedScore {
  events: MusicEvent[];
  tempoMap: TempoMap;
  /** Every skipped musical construct, by name — nothing drops silently. */
  unhandled: UnhandledConstruct[];
  /** Measure starts and time signatures from the first part. */
  measures: MeasureInfo[];
  /** Absolute cursor at the end of the first part, in quarter notes. */
  endQuarters: number;
  /** Written notes respelled to sharp-only output (pitch-exact). */
  enharmonicRespellings: number;
}

/** Parse partwise MusicXML into absolute-onset events (tempo map discarded). */
export function parseMusicXml(input: string): MusicEvent[] {
  return parseScore(input).events;
}

function parsePartwise(kids: OrderedKids): {
  events: MusicEvent[];
  tempoMarks: RawTempoMark[];
  unhandled: UnhandledConstruct[];
  measures: MeasureInfo[];
  endQuarters: number;
  enharmonicRespellings: number;
} {
  const partList = firstChild(kids, 'part-list');
  if (!partList) {
    throw new MusicXmlParseError('missing <part-list> in score-partwise score');
  }
  const declared = new Set<string>();
  for (const t of tagsOf(partList.kids)) {
    if (t.tag === 'score-part' && t.attrs['@_id'] !== undefined) {
      declared.add(t.attrs['@_id']);
    }
  }
  const events: MusicEvent[] = [];
  const tempoMarks: RawTempoMark[] = [];
  const unhandled: UnhandledConstruct[] = [];
  const measures: MeasureInfo[] = [];
  let endQuarters = 0;
  let enharmonicRespellings = 0;
  let partIndex = 0;
  for (const t of tagsOf(kids)) {
    if (t.tag !== 'part') continue;
    const partId = t.attrs['@_id'] ?? '';
    if (!declared.has(partId)) {
      throw new MusicXmlParseError(`part id "${partId}" has no matching <score-part> in <part-list>`);
    }
    const part = parsePart(partId, partIndex, t.kids, tempoMarks, unhandled, measures);
    events.push(...part.events);
    enharmonicRespellings += part.enharmonicRespellings;
    if (partIndex === 0) endQuarters = part.endQuarters;
    partIndex++;
  }
  return { events, tempoMarks, unhandled, measures, endQuarters, enharmonicRespellings };
}

function parsePart(
  partId: string,
  partIndex: number,
  kids: OrderedKids,
  tempoMarks: RawTempoMark[],
  unhandled: UnhandledConstruct[],
  measures: MeasureInfo[],
): { events: MusicEvent[]; endQuarters: number; enharmonicRespellings: number } {
  const events: MusicEvent[] = [];
  let divisions: number | undefined;
  let transposeChromatic = 0;
  let enharmonicRespellings = 0;
  // Absolute cursor in quarter notes. It carries across measure boundaries:
  // each measure's notes start where the previous measure ended, so onsets
  // are absolute and never derived from note order alone.
  let cursorQuarters = 0;
  let lastOnsetQuarters = 0;
  let haveLastOnset = false;
  let measureOrdinal = 0;
  let currentBeats = 4;
  let currentBeatType = 4;

  for (const t of tagsOf(kids)) {
    if (t.tag !== 'measure') continue;
    const measureLabel = t.attrs['@_number'] ?? '?';
    const loc = `part "${partId}", measure "${measureLabel}"`;
    const ordinal = measureOrdinal;
    measureOrdinal++;
    if (partIndex === 0) {
      measures.push({ ordinal, startQuarters: cursorQuarters, beats: currentBeats, beatType: currentBeatType });
    }
    for (const child of tagsOf(t.kids)) {
      if (child.tag === 'attributes') {
        const divisionsText = childText(child.kids, 'divisions');
        if (divisionsText !== undefined && divisionsText !== '') {
          const next = parseNumber(divisionsText);
          if (next === undefined || !Number.isInteger(next) || next <= 0) {
            throw new MusicXmlParseError(
              `invalid <divisions> "${divisionsText}" (${loc}): divisions must be a positive integer`,
            );
          }
          divisions = next;
        }
        const transpose = firstChild(child.kids, 'transpose');
        if (transpose) {
          // Mapping spec section 1 applies <transpose><chromatic> only;
          // <octave-change> is intentionally not applied here.
          const chromaticText = childText(transpose.kids, 'chromatic');
          const chromatic = parseNumber(chromaticText);
          if (chromatic === undefined || !Number.isInteger(chromatic)) {
            throw new MusicXmlParseError(
              `invalid <transpose><chromatic> "${chromaticText ?? ''}" (${loc}): chromatic transposition must be an integer`,
            );
          }
          transposeChromatic = chromatic;
        }
        const time = firstChild(child.kids, 'time');
        if (time) {
          const beats = parseNumber(childText(time.kids, 'beats'));
          const beatType = parseNumber(childText(time.kids, 'beat-type'));
          if (
            beats !== undefined &&
            Number.isInteger(beats) &&
            beats > 0 &&
            beatType !== undefined &&
            Number.isInteger(beatType) &&
            beatType > 0
          ) {
            currentBeats = beats;
            currentBeatType = beatType;
          }
        }
      } else if (child.tag === 'note') {
        const parsed = parseNote(partId, measureLabel, loc, child.kids, divisions, transposeChromatic, unhandled);
        if (parsed === undefined) continue;
        if (parsed.respelled) enharmonicRespellings++;
        const onsetQuarters = parsed.chord && haveLastOnset ? lastOnsetQuarters : cursorQuarters;
        events.push({ ...parsed.event, onsetQuarters });
        if (!parsed.chord) {
          cursorQuarters = onsetQuarters + parsed.event.durationQuarters;
          lastOnsetQuarters = onsetQuarters;
          haveLastOnset = true;
        }
      } else if (child.tag === 'backup' || child.tag === 'forward') {
        if (divisions === undefined) {
          throw new MusicXmlParseError(`missing <divisions> for <${child.tag}> (${loc})`);
        }
        const durationText = childText(child.kids, 'duration');
        const duration = parseNumber(durationText);
        if (duration === undefined || !Number.isInteger(duration) || duration <= 0) {
          throw new MusicXmlParseError(
            `invalid <${child.tag}> <duration> "${durationText ?? ''}" (${loc}): duration must be a positive integer`,
          );
        }
        const delta = duration / divisions;
        cursorQuarters = child.tag === 'backup' ? cursorQuarters - delta : cursorQuarters + delta;
        if (cursorQuarters < 0) {
          throw new MusicXmlParseError(`<backup> moves before the start of the score (${loc})`);
        }
      } else if (child.tag === 'sound' || child.tag === 'direction') {
        for (const mark of readTempoMarks(child, loc)) {
          tempoMarks.push({ ...mark, partIndex, measureOrdinal: ordinal });
        }
      } else if (child.tag === 'barline') {
        if (hasChild(child.kids, 'repeat')) {
          unhandled.push({ construct: 'repeat', part: partId, measure: measureLabel });
        }
      }
      // Remaining measure children (harmony, print, layout) are notation or
      // appearance: the input profile permits skipping those silently.
    }
  }
  return { events, endQuarters: cursorQuarters, enharmonicRespellings };
}

function soundTempo(attrs: Record<string, string>, loc: string): number | undefined {
  const text = attrs['@_tempo'];
  if (text === undefined) return undefined;
  const bpm = Number(text);
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new MusicXmlParseError(`invalid <sound tempo> "${text}" (${loc}): tempo must be a positive number`);
  }
  return bpm;
}

/**
 * Quarter-note BPM from a `<metronome>` marking, or undefined when the shape
 * carries no usable tempo (metric modulation without `<per-minute>`, unknown
 * beat unit). Unresolvable shapes are skipped here; Increment 2 logs them.
 */
function metronomeBpm(kids: OrderedKids): number | undefined {
  const units: string[] = [];
  let dots = 0;
  let perMinute: number | undefined;
  for (const t of tagsOf(kids)) {
    if (t.tag === 'beat-unit') {
      const unit = textOf(t.kids);
      if (unit !== '') units.push(unit);
    } else if (t.tag === 'beat-unit-dot') {
      dots++;
    } else if (t.tag === 'per-minute') {
      const value = Number(textOf(t.kids));
      if (Number.isFinite(value) && value > 0) perMinute = value;
    }
  }
  if (perMinute === undefined || units.length !== 1) return undefined;
  const quarters = beatUnitQuarters(units[0], dots);
  if (quarters === undefined) return undefined;
  return perMinute * quarters;
}

/**
 * Tempo marks from a measure-level `<sound>` or `<direction>` node.
 * `<sound tempo>` wins over `<metronome>` in the same direction.
 */
function readTempoMarks(node: Tagged, loc: string): Array<{ bpm: number; source: TempoSource }> {
  if (node.tag === 'sound') {
    const bpm = soundTempo(node.attrs, loc);
    return bpm === undefined ? [] : [{ bpm, source: 'sound' }];
  }
  let metronome: number | undefined;
  for (const t of tagsOf(node.kids)) {
    if (t.tag === 'sound') {
      const bpm = soundTempo(t.attrs, loc);
      if (bpm !== undefined) return [{ bpm, source: 'sound' }];
    } else if (t.tag === 'direction-type') {
      for (const d of tagsOf(t.kids)) {
        if (d.tag !== 'metronome') continue;
        const bpm = metronomeBpm(d.kids);
        if (bpm !== undefined) metronome = bpm;
      }
    }
  }
  return metronome === undefined ? [] : [{ bpm: metronome, source: 'metronome' }];
}

function parseNote(
  partId: string,
  measureLabel: string,
  loc: string,
  kids: OrderedKids,
  divisions: number | undefined,
  transposeChromatic: number,
  unhandled: UnhandledConstruct[],
):
  | { event: Omit<NoteEvent, 'onsetQuarters'> | Omit<RestEvent, 'onsetQuarters'>; chord: boolean; respelled: boolean }
  | undefined {
  if (hasChild(kids, 'grace')) {
    unhandled.push({ construct: 'grace-note', part: partId, measure: measureLabel });
    return undefined;
  }
  if (hasChild(kids, 'unpitched')) {
    unhandled.push({ construct: 'unpitched', part: partId, measure: measureLabel });
    return undefined;
  }
  const chord = hasChild(kids, 'chord');
  const durationText = childText(kids, 'duration');
  const duration = parseNumber(durationText);
  if (duration === undefined || !Number.isInteger(duration) || duration <= 0) {
    throw new MusicXmlParseError(
      `invalid note <duration> "${durationText ?? ''}" (${loc}): duration must be a positive integer`,
    );
  }
  if (divisions === undefined) {
    throw new MusicXmlParseError(`missing <divisions> for note (${loc}): no divisions value seen in part "${partId}"`);
  }
  const durationQuarters = duration / divisions;
  const voice = childText(kids, 'voice') || '1';
  const staffText = childText(kids, 'staff');
  const staff = staffText ? (parseNumber(staffText) ?? 1) : 1;
  const stream: StreamId = { part: partId, staff, voice };

  if (hasChild(kids, 'rest')) {
    return { event: { kind: 'rest', stream, durationQuarters }, chord, respelled: false };
  }
  const pitch = firstChild(kids, 'pitch');
  if (!pitch) {
    throw new MusicXmlParseError(`note has neither <pitch> nor <rest> (${loc})`);
  }
  const step = childText(pitch.kids, 'step');
  const base = step === undefined ? undefined : STEP_SEMITONES[step];
  if (base === undefined) {
    throw new MusicXmlParseError(`invalid pitch step "${step ?? ''}" (${loc}): step must be one of A-G`);
  }
  const octaveText = childText(pitch.kids, 'octave');
  const octave = parseNumber(octaveText);
  if (octave === undefined || !Number.isInteger(octave)) {
    throw new MusicXmlParseError(`invalid pitch octave "${octaveText ?? ''}" (${loc}): octave must be an integer`);
  }
  const alter = parseNumber(childText(pitch.kids, 'alter')) ?? 0;
  if (!Number.isInteger(alter)) {
    unhandled.push({ construct: 'fractional-alter', part: partId, measure: measureLabel });
  }
  const midi = (octave + 1) * 12 + base + alter + transposeChromatic;
  const writtenMidi = (octave + 1) * 12 + base + alter;
  const respelled = needsRespelling(step ?? '', alter, writtenMidi);
  let tieStart = false;
  let tieStop = false;
  for (const t of tagsOf(kids)) {
    if (t.tag !== 'tie') continue;
    if (t.attrs['@_type'] === 'start') tieStart = true;
    else if (t.attrs['@_type'] === 'stop') tieStop = true;
  }
  return { event: { kind: 'note', stream, durationQuarters, midi, tieStart, tieStop }, chord, respelled };
}
