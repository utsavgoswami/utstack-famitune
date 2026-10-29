# Spec Delta

## Purpose

Convert a MusicXML score into NES music that a person can play and hear. The
conversion preserves pitches, rhythms, and tempo. The conversion reports every
loss in text.

## ADDED Requirements

### Requirement: Supported MusicXML input is accepted, unsupported input fails clearly
The converter SHALL accept plain-text partwise MusicXML scores inside the
supported subset. The project input profile defines that subset. The converter
SHALL reject 3 input classes with an error. The classes are non-MusicXML input,
malformed XML, and unsupported score layouts. The error SHALL name the problem.
The error SHALL name the location when the converter knows the location.

#### Scenario: Hello World score converts
- **WHEN** the converter runs on a partwise score containing one part, one 4/4 measure, and one whole note
- **THEN** conversion succeeds and produces a FamiStudio Text file

#### Scenario: Timewise score is rejected
- **WHEN** the converter runs on a score whose root is the timewise layout
- **THEN** conversion fails with an error stating the layout is unsupported and no output file is produced

### Requirement: Pitches convert to exact NES note names
Each supported pitched note SHALL convert to the NES note name with the same
sounding pitch. The converter SHALL use sharp spelling. FamiStudio octave
labels run one octave above scientific pitch notation (FamiStudio `C3`
sounds middle C at 261.6 Hz; verified by render probe against the pinned
4.5.0 build), so the emitted name is the sharp spelling of the sounding
MIDI pitch minus 12. The converter SHALL apply part transposition before
this conversion. A pitch outside the FamiStudio range C0 to B7 (sounding
MIDI 24 to 119) SHALL move by octave into the range when an octave move can
reach the range. Otherwise the converter SHALL clamp the pitch. The
converter SHALL report each affected note.

#### Scenario: Middle C converts exactly
- **WHEN** a score contains a C in octave 4 with no alteration
- **THEN** the output contains a note named C3 at the corresponding position

#### Scenario: Flat converts to its sharp equivalent
- **WHEN** a score contains an E-flat in octave 4
- **THEN** the output contains a note named D#3 and the conversion report notes the respelling

### Requirement: Rhythm, rests, and ties preserve sounding time
The converter SHALL derive note onsets and durations from 2 inputs. Input 1 is
the divisions value of the score. Input 2 is the time counter of the score. A
rest SHALL produce silence with the correct length. Tied notes SHALL sound as
one continuous note. The duration of that note SHALL equal the sum of the tied
durations.

#### Scenario: Tied notes merge
- **WHEN** two quarter notes of the same pitch are joined by a tie across a barline
- **THEN** the output contains one note whose duration equals the sum of both

#### Scenario: Rest produces a gap
- **WHEN** a measure contains a quarter rest between two notes
- **THEN** no note sounds during the rest and the following note starts at the correct position

### Requirement: Parallel streams allocate to monophonic channels deterministically
The converter SHALL extract monophonic streams from parts, staves, and voices.
The converter SHALL assign each stream to at most one NES melodic channel. The
melodic channels are Square 1, Square 2, and Triangle. Identical input SHALL
always give the same assignment. The converter SHALL report a stream that
exceeds the channel count as dropped. The converter SHALL NOT interleave a
dropped stream onto an occupied channel.

#### Scenario: Two streams use two channels
- **WHEN** a score contains a high melody stream and a low bass stream
- **THEN** the melody sounds on Square 1 and the bass on Triangle

#### Scenario: Overflow stream is reported
- **WHEN** a score contains four melodic streams
- **THEN** three streams are converted and the report identifies the dropped stream and its note count

### Requirement: Chords reduce to one pitch per channel with reporting
A stream can contain simultaneous pitches. In that case the converter SHALL
keep one pitch per channel. The documented reduction rule selects that pitch.
The report SHALL state 2 counts. Count 1 is the number of kept chord tones.
Count 2 is the number of dropped chord tones.

#### Scenario: Three-note chord keeps one pitch
- **WHEN** a melody stream contains a three-note chord
- **THEN** one pitch sounds on that stream's channel and the report counts two dropped chord tones

### Requirement: Tempo realizes to NES frames with the actual BPM reported
The converter SHALL convert score tempo to NES frame counts. The converter
SHALL use the FamiStudio tempo model for this conversion. The converter SHALL
use the documented default tempo when the score marks no tempo. The converter
SHALL warn in that case. The report SHALL state the realized BPM. The report
SHALL state the requested BPM next to the realized BPM.

#### Scenario: Marked tempo is realized
- **WHEN** a score marks quarter-note = 120 and uses a 16th-note grid
- **THEN** the emitted song uses a frame groove whose realized BPM is within 1 BPM of 120, as stated in the report

#### Scenario: Missing tempo warns and defaults
- **WHEN** a score contains no tempo marking
- **THEN** conversion proceeds at the default tempo and the report contains a missing-tempo warning

### Requirement: Every loss and unhandled construct is reported
The converter SHALL produce a conversion report. The report SHALL list 5 item
classes. The classes are dropped notes, reduced chord tones, range-adjusted
pitches, skipped content, and unhandled input constructs. Silent loss of
musical content MUST NOT occur.

#### Scenario: Unhandled construct is logged
- **WHEN** a score contains a construct outside the supported subset, such as a grace note
- **THEN** conversion completes for the supported content and the report names the unhandled construct

### Requirement: Emitted FamiStudio Text imports and renders to audio
The pinned FamiStudio build SHALL accept the emitted FamiStudio Text. Rendering
SHALL produce one WAV file and one NSF file. In the WAV file, audible pitches
SHALL match the source score. In the WAV file, each note onset SHALL match the
source score within one NES frame. The NSF file SHALL play as NES music.

#### Scenario: Hello World renders one audible pitch
- **WHEN** the Hello World output is rendered to WAV
- **THEN** the WAV contains a single sustained pitch corresponding to C4 for the expected duration

### Requirement: Conversion is deterministic
Two converter runs on identical input SHALL produce byte-identical FamiStudio
Text output. Both runs SHALL use the same pinned FamiStudio version.

#### Scenario: Repeat conversion is identical
- **WHEN** the same score is converted twice
- **THEN** the two output files are byte-identical
