import React, { useEffect, useState } from 'react';
import { Shield, FileText, X } from 'lucide-react';

interface LegalDoc {
  title: string;
  effectiveDate: string;
  contactEmail: string;
  sections: Array<{ heading: string; body: string[] }>;
}

interface LegalModalProps {
  initialTab: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ initialTab, onClose }) => {
  const [tab, setTab] = useState<'privacy' | 'terms'>(initialTab);
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/v1/legal/${tab}`)
      .then((res) => res.json())
      .then((json) => {
        if (active && json?.data) {
          setDoc(json.data);
        }
      })
      .catch(() => {
        if (active) setDoc(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[88vh] rounded-2xl border border-emerald-500/35 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('privacy')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                tab === 'privacy'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Privacy Policy
            </button>
            <button
              onClick={() => setTab('terms')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                tab === 'terms'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Terms of Service
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close legal notice"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading document...</div>
          ) : doc ? (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">{doc.title}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Effective {doc.effectiveDate} &bull; Contact: {doc.contactEmail}
                </p>
              </div>
              {doc.sections.map((section) => (
                <section key={section.heading} className="space-y-1.5">
                  <h3 className="text-sm font-bold text-emerald-400">{section.heading}</h3>
                  {section.body.map((para, idx) => (
                    <p key={idx} className="text-xs leading-relaxed text-slate-300">
                      {para}
                    </p>
                  ))}
                </section>
              ))}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-rose-300">
              Unable to load document right now. Visit /legal/{tab} in your browser.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
