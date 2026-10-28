import { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

type Props = {
  /** Complete MusicXML document text. */
  xml: string;
  /** Accessible label describing what the rendered score shows. */
  label: string;
};

/** Renders a MusicXML string as notation with OpenSheetMusicDisplay. */
export function MusicXmlScore({ xml, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const osmd = new OpenSheetMusicDisplay(host, {
      autoResize: false,
      backend: 'svg',
      drawTitle: false,
      drawComposer: false,
    });
    osmd
      .load(xml)
      .then(() => {
        if (cancelled) return;
        osmd.render();
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not render score');
        }
      });
    return () => {
      cancelled = true;
      osmd.clear();
    };
  }, [xml]);

  if (error) {
    return <p role="alert">Score failed to render: {error}</p>;
  }
  return <div ref={hostRef} role="img" aria-label={label} />;
}

export default MusicXmlScore;
