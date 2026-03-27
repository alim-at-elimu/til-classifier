'use client';

import { useState, useEffect } from 'react';
import { AssessedFile, Innovation, Innovator, emptyInnovation, emptyInnovator } from '@/lib/profile-types';

interface Props {
  files: AssessedFile[];
  onComplete: (innovator: Innovator, innovation: Innovation) => void;
  onBack: () => void;
}

type Phase = 'extracting' | 'searching' | 'done' | 'error';

export default function ExtractionStep({ files, onComplete, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('extracting');
  const [message, setMessage] = useState('Preparing files for extraction…');
  const [error, setError] = useState('');
  const [innovator, setInnovator] = useState<Innovator | null>(null);
  const [innovation, setInnovation] = useState<Innovation | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const extractable = files.filter((f) => f.decision === 'extract');
      if (extractable.length === 0) { setPhase('error'); setError('No files selected.'); return; }

      const filePayloads = extractable.map((f) => ({
        name: f.name, type: f.type, base64: f.base64, textContent: f.textContent,
      }));

      try {
        setPhase('extracting');
        setMessage(`Sending ${extractable.length} file(s) to Claude…`);

        const extractRes = await fetch('/api/profile-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filePayloads }),
        });
        if (!extractRes.ok) throw new Error(`Extraction failed: ${await extractRes.text()}`);
        const extractData = await extractRes.json();
        if (cancelled) return;

        let extractedInnovator: Innovator = extractData.innovator || extractData.organisation || emptyInnovator();
        let extractedInnovation: Innovation = {
          ...emptyInnovation(),
          ...(extractData.innovation || extractData.profile || {}),
          model_steps: extractData.innovation?.model_steps || extractData.profile?.model_steps || [],
          evidence_stats: extractData.innovation?.evidence_stats || extractData.profile?.evidence_stats || [],
          government_relationships: extractData.innovation?.government_relationships || extractData.profile?.government_relationships || [],
          adoption_pathway_bullets: extractData.innovation?.adoption_pathway_bullets || extractData.profile?.adoption_pathway_bullets || [],
          funding_covers: extractData.innovation?.funding_covers || extractData.profile?.funding_covers || [],
          confidence_flags: extractData.innovation?.confidence_flags || extractData.profile?.confidence_flags || [],
          web_augmented_fields: [],
          file_updated_fields: [],
        };

        // Web search augmentation
        setPhase('searching');
        setMessage('Searching the web for additional information…');

        const searchRes = await fetch('/api/profile-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organisation: extractedInnovator, profile: extractedInnovation }),
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.organisation) extractedInnovator = searchData.organisation;
          if (searchData.profile) extractedInnovation = { ...extractedInnovation, ...searchData.profile };
        }

        if (!cancelled) {
          setInnovator(extractedInnovator);
          setInnovation(extractedInnovation);
          setPhase('done');
        }
      } catch (err) {
        if (!cancelled) { setPhase('error'); setError(err instanceof Error ? err.message : 'Failed'); }
      }
    }
    run();
    return () => { cancelled = true; };
  }, [files]);

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Extraction error</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
        <div className="mt-6"><button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Back</button></div>
      </div>
    );
  }

  if (phase === 'done' && innovator && innovation) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-medium text-emerald-800">Extraction complete</p>
          <p className="mt-1 text-sm text-emerald-600">
            {innovator.name ? `Profile for "${innovator.name}"` : 'Profile'} extracted
            {innovation.confidence_flags.length > 0 && ` with ${innovation.confidence_flags.length} field(s) flagged for review`}
            {innovation.web_augmented_fields.length > 0 && ` and ${innovation.web_augmented_fields.length} field(s) from web`}.
          </p>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <button onClick={() => onComplete(innovator, innovation)} className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600">Review tear sheet →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-gray-700">
          {phase === 'extracting' ? 'Step 3a: Claude extraction' : 'Step 3b: Web search augmentation'}
        </p>
        <p className="mt-1 text-xs text-gray-400">{message}</p>
      </div>
    </div>
  );
}
