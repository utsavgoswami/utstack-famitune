const HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
  </part-list>`;

const ATTRS_TREBLE = `<attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>`;

function note(step: string, octave: number, duration = 1, extra = ''): string {
  return `<note>${extra}<pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><type>quarter</type></note>`;
}

/** One whole note: the smallest complete MusicXML score. */
export const NOTE_XML = `${HEADER}
  <part id="P1">
    <measure number="1">
      ${ATTRS_TREBLE}
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

/** Four quarter notes fill one 4/4 measure; barlines separate measures. */
export const MEASURE_XML = `${HEADER}
  <part id="P1">
    <measure number="1">
      ${ATTRS_TREBLE}
      ${note('C', 4)}${note('D', 4)}${note('E', 4)}${note('F', 4)}
    </measure>
    <measure number="2">
      ${note('G', 4)}${note('F', 4)}${note('E', 4)}${note('D', 4)}
    </measure>
  </part>
</score-partwise>`;

/** A scale written on one treble staff (5 lines). */
export const STAFF_XML = `${HEADER}
  <part id="P1">
    <measure number="1">
      ${ATTRS_TREBLE}
      ${note('C', 4)}${note('D', 4)}${note('E', 4)}${note('F', 4)}
    </measure>
    <measure number="2">
      ${note('G', 4)}${note('A', 4)}${note('B', 4)}
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

/** Two voices share one staff: voice 1 stems up, voice 2 stems down. */
export const VOICE_XML = `${HEADER}
  <part id="P1">
    <measure number="1">
      ${ATTRS_TREBLE}
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><stem>up</stem></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><stem>up</stem></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><stem>up</stem></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><stem>up</stem></note>
      <backup><duration>4</duration></backup>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><stem>down</stem></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><stem>down</stem></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><stem>down</stem></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><stem>down</stem></note>
    </measure>
  </part>
</score-partwise>`;

/** Two parts: each part is one instrument's music, printed as its own staff. */
export const PART_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
    <score-part id="P2"><part-name>Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      ${ATTRS_TREBLE}
      ${note('E', 5)}${note('D', 5)}${note('C', 5)}${note('D', 5)}
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>2</duration><type>half</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>2</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>`;
