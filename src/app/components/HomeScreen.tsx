import { useState, useRef } from 'react';
import { Play, Users, Zap, X, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import { Sounds } from '../utils/sounds';
import { StepVisual } from './HowToPlayVisuals';

interface HomeScreenProps {
  onCreateGame: () => void;
  onJoinGame: () => void;
  onQuickPlay?: () => void;
}

/* ── How-to-Play content in 5 languages ─────────────────────────── */

type Lang = 'en' | 'hi' | 'gu' | 'mr' | 'ta';

interface RuleStep {
  icon: string;
  title: string;
  desc: string;
}

interface LangContent {
  label: string;        // tab label
  nativeLabel: string;  // native script label
  goal: string;
  steps: RuleStep[];
  scoring: { label: string; pts: string; note: string }[];
}

const LANG_CONTENT: Record<Lang, LangContent> = {
  en: {
    label: 'EN',
    nativeLabel: 'English',
    goal: 'Capture the most 10s to win!',
    steps: [
      { icon: '🎯', title: 'Objective', desc: 'Capture the 10-rank cards (called Mindis). The team with the most Mindis wins the round.' },
      { icon: '👥', title: 'Teams', desc: 'Players are split into two equal teams. In a 4-player game, you and the player opposite you are teammates.' },
      { icon: '🃏', title: 'Playing a Trick', desc: 'One player leads a card. Going clockwise, every player must play a card. The highest card of the led suit wins the trick.' },
      { icon: '↩️', title: 'Follow the Suit', desc: 'You MUST play a card of the same suit as the led card if you have one. Only if you have none may you play another suit.' },
      { icon: '⚡', title: 'Trump (Hukum)', desc: 'A designated trump suit beats all other suits. A 2 of trump beats an Ace of any other suit. Trump method is chosen before the game.' },
      { icon: '🏆', title: 'Winning', desc: 'After all 15 tricks, scores are tallied. Win enough rounds to reach the game points target and claim victory!' },
    ],
    scoring: [
      { label: 'Normal Win', pts: '1 pt', note: 'Team captures 3 or 4 Mindis' },
      { label: 'Mendikot', pts: '3 pts', note: 'Team captures all 4 Mindis' },
      { label: 'Whitewash', pts: '2 pts', note: 'Team wins all 15 tricks' },
    ],
  },
  hi: {
    label: 'हि',
    nativeLabel: 'हिंदी',
    goal: 'सबसे ज़्यादा मिंडी पकड़ें और जीतें!',
    steps: [
      { icon: '🎯', title: 'लक्ष्य', desc: '10 के पत्ते (मिंडी कहलाते हैं) जमा करें। जिस टीम के पास सबसे ज़्यादा मिंडी होंगी वो राउंड जीतेगी।' },
      { icon: '👥', title: 'टीमें', desc: 'खिलाड़ी दो बराबर टीमों में बंटते हैं। 4 खिलाड़ियों में आपके सामने वाला आपका teammate होता है।' },
      { icon: '🃏', title: 'एक चाल खेलना', desc: 'एक खिलाड़ी पत्ता चलता है। बाकी सभी clockwise क्रम में पत्ता डालते हैं। Led suit का सबसे ऊंचा पत्ता जीतता है।' },
      { icon: '↩️', title: 'Suit का पालन करें', desc: 'जो suit पहले चला हो, आपके पास उस suit का पत्ता हो तो वही डालना ज़रूरी है। तभी दूसरा suit डाल सकते हैं जब वो suit न हो।' },
      { icon: '⚡', title: 'हुकम (Trump)', desc: 'हुकम suit बाकी सभी suits को हराती है। हुकम का 2 भी किसी भी दूसरी suit के Ace को हरा सकता है।' },
      { icon: '🏆', title: 'जीतना', desc: '15 चालों के बाद अंक जोड़े जाते हैं। पर्याप्त राउंड जीतकर target points तक पहुँचें और विजेता बनें!' },
    ],
    scoring: [
      { label: 'सामान्य जीत', pts: '1 pt', note: '3 या 4 मिंडी मिली हों' },
      { label: 'मेंडीकोट', pts: '3 pts', note: 'सभी 4 मिंडी अपनी टीम को मिलें' },
      { label: 'व्हाइटवाश', pts: '2 pts', note: 'सभी 15 चालें जीती हों' },
    ],
  },
  gu: {
    label: 'ગુ',
    nativeLabel: 'ગુજરાતી',
    goal: 'સૌથી વધુ મીંડી મેળવો અને જીતો!',
    steps: [
      { icon: '🎯', title: 'ઉદ્દેશ', desc: '10 ના પત્તા (મીંડી) ભેગા કરો. જે ટીમ પાસે સૌથી વધુ મીંડી હોય એ ટીમ રાઉન્ડ જીતે.' },
      { icon: '👥', title: 'ટીમ', desc: 'ખેલાડીઓ બે ટીમમાં વહેંચાય. 4 ખેલાડીઓ હોય ત્યારે સામેનો ખેલાડી તમારો teammate.' },
      { icon: '🃏', title: 'એક ચાલ', desc: 'એક ખેલાડી પત્તો ફેંકે. ઘડિયાળ દિશામાં બધા એક-એક પત્તો મૂકે. Led suit નો સૌથી ઊંચો પત્તો ચાલ જીતે.' },
      { icon: '↩️', title: 'Suit ફૉલો કરો', desc: 'જો તમારી પાસે led suit નો પત્તો હોય, તો એ જ suit નો પત્તો મૂકવો ફરજિયાત. ફક્ત ત્યારે જ બીજી suit ચાલે જ્યારે led suit ન હોય.' },
      { icon: '⚡', title: 'હુકમ (Trump)', desc: 'હુકમ suit બીજી બધી suits ને હરાવે. હુકમ નો 2 પણ બીજી ગમે તે suit ના Ace ને હરાવે.' },
      { icon: '🏆', title: 'જીત', desc: '15 ચાલ પૂરી થાય ત્યારે ગણના. પૂરતા રાઉન્ડ જીતીને target points સુધી પહોંચો!' },
    ],
    scoring: [
      { label: 'સામાન્ય જીત', pts: '1 pt', note: '3 અથવા 4 મીંડી મળી' },
      { label: 'મેંડીકોટ', pts: '3 pts', note: 'ચારેય મીંડી ટીમ ને' },
      { label: 'વ્હાઇટવોશ', pts: '2 pts', note: 'બધી 15 ચાલ જીતી' },
    ],
  },
  mr: {
    label: 'म',
    nativeLabel: 'मराठी',
    goal: 'सर्वात जास्त मिंडी जिंका आणि विजयी व्हा!',
    steps: [
      { icon: '🎯', title: 'उद्दिष्ट', desc: '10 च्या पत्त्यांना (मिंडी) जमवा. ज्या संघाकडे सर्वात जास्त मिंडी असतील ते राऊंड जिंकतात.' },
      { icon: '👥', title: 'संघ', desc: 'खेळाडू दोन समान संघांत विभागले जातात. 4 खेळाडूंच्या खेळात समोरील खेळाडू तुमचा teammate असतो.' },
      { icon: '🃏', title: 'एक डाव', desc: 'एक खेळाडू पत्ता टाकतो. घड्याळाच्या दिशेने सर्वजण एक-एक पत्ता टाकतात. Led suit चा सर्वात उंच पत्ता डाव जिंकतो.' },
      { icon: '↩️', title: 'Suit पाळा', desc: 'जर तुमच्याकडे led suit चा पत्ता असेल, तर तोच टाकणे अनिवार्य आहे. फक्त तेव्हाच दुसरी suit टाकता येते जेव्हा ती suit नसते.' },
      { icon: '⚡', title: 'हुकूम (Trump)', desc: 'हुकूम suit इतर सर्व suits ना हरवते. हुकूमचा 2 देखील इतर कोणत्याही suit च्या Ace ला हरवतो.' },
      { icon: '🏆', title: 'विजय', desc: '15 डावांनंतर गुण मोजले जातात. पुरेसे राऊंड जिंकून target points पर्यंत पोहोचा!' },
    ],
    scoring: [
      { label: 'सामान्य विजय', pts: '1 pt', note: '3 किंवा 4 मिंडी मिळाल्या' },
      { label: 'मेंडीकोट', pts: '3 pts', note: 'सर्व 4 मिंडी संघाला मिळाल्या' },
      { label: 'व्हाइटवॉश', pts: '2 pts', note: 'सर्व 15 डाव जिंकले' },
    ],
  },
  ta: {
    label: 'த',
    nativeLabel: 'தமிழ்',
    goal: 'அதிக மிண்டிகள் பிடித்து வெல்லுங்கள்!',
    steps: [
      { icon: '🎯', title: 'நோக்கம்', desc: '10 சீட்டுகளை (மிண்டி என்று அழைக்கப்படும்) சேகரிக்கவும். அதிக மிண்டி உள்ள குழு சுற்றை வெல்லும்.' },
      { icon: '👥', title: 'குழுக்கள்', desc: 'வீரர்கள் இரண்டு சம குழுக்களாக பிரிக்கப்படுவார்கள். 4 வீரர்கள் விளையாடும்போது, எதிரே உள்ளவர் உங்கள் teammate.' },
      { icon: '🃏', title: 'ஒரு சுற்று', desc: 'ஒரு வீரர் சீட்டை போடுவார். கடிகாரத் திசையில் அனைவரும் ஒரு சீட்டு போடுவார்கள். Led suit இல் உயர்ந்த சீட்டு சுற்றை வெல்லும்.' },
      { icon: '↩️', title: 'Suit பின்பற்றவும்', desc: 'உங்களிடம் led suit இருந்தால் அதையே போட வேண்டும். அந்த suit இல்லாதபோது மட்டுமே வேறு suit போடலாம்.' },
      { icon: '⚡', title: 'ஹுக்கம் (Trump)', desc: 'Trump suit மற்ற அனைத்து suitகளையும் வெல்லும். Trump 2கூட மற்ற எந்த suit Aceஐயும் வெல்லும்.' },
      { icon: '🏆', title: 'வெற்றி', desc: '15 சுற்றுகளுக்குப் பிறகு மதிப்பெண்கள் கணக்கிடப்படும். இலக்கு மதிப்பெண்ணை அடைந்து வெற்றி பெறுங்கள்!' },
    ],
    scoring: [
      { label: 'சாதாரண வெற்றி', pts: '1 pt', note: '3 அல்லது 4 மிண்டி பிடிக்கப்பட்டது' },
      { label: 'மேண்டிகோட்', pts: '3 pts', note: 'நான்கு மிண்டியும் பிடிக்கப்பட்டது' },
      { label: 'வைட்வாஷ்', pts: '2 pts', note: '15 சுற்றுகளும் வெல்லப்பட்டது' },
    ],
  },
};

const LANG_ORDER: Lang[] = ['en', 'hi', 'gu', 'mr', 'ta'];

/* ── How-to-Play Modal ───────────────────────────────────────────── */

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const [lang, setLang] = useState<Lang>('en');
  const [step, setStep] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);   // live px offset while dragging
  const [isDragging, setIsDragging] = useState(false);

  const content = LANG_CONTENT[lang];
  const totalSteps = content.steps.length;

  // ── touch / mouse drag tracking ──────────────────────────────
  const dragStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50; // px to trigger a step change

  const goNext = () => setStep(s => Math.min(totalSteps - 1, s + 1));
  const goPrev = () => setStep(s => Math.max(0, s - 1));

  const onDragStart = (clientX: number) => {
    dragStartX.current = clientX;
    setIsDragging(true);
    setDragOffset(0);
  };
  const onDragMove = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    // clamp so it doesn't slide too far
    setDragOffset(Math.max(-120, Math.min(120, delta)));
  };
  const onDragEnd = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    if (delta < -SWIPE_THRESHOLD) goNext();
    else if (delta > SWIPE_THRESHOLD) goPrev();
    dragStartX.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientX);
  const onTouchMove  = (e: React.TouchEvent) => onDragMove(e.touches[0].clientX);
  const onTouchEnd   = (e: React.TouchEvent) => onDragEnd(e.changedTouches[0].clientX);

  // Mouse handlers (desktop drag)
  const onMouseDown  = (e: React.MouseEvent) => onDragStart(e.clientX);
  const onMouseMove  = (e: React.MouseEvent) => { if (isDragging) onDragMove(e.clientX); };
  const onMouseUp    = (e: React.MouseEvent) => { if (isDragging) onDragEnd(e.clientX); };
  const onMouseLeave = () => { if (isDragging) { setIsDragging(false); setDragOffset(0); dragStartX.current = null; } };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>

      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: 'linear-gradient(160deg,#1e0808,#2a0f0f)', border: '1px solid rgba(212,168,67,0.18)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '1px solid rgba(212,168,67,0.1)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)' }}>
              <BookOpen style={{ width: 15, height: 15, color: '#d4a843' }} />
            </div>
            <div>
              <div className="font-cinzel text-sm text-white tracking-wide">How to Play</div>
              <div className="text-[9px] tracking-widest" style={{ color: 'rgba(212,168,67,0.45)' }}>MINDI · MENDIKOT</div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* ── Language Tabs ── */}
        <div className="flex items-center gap-1.5 px-5 py-3 overflow-x-auto"
          style={{ borderBottom: '1px solid rgba(212,168,67,0.07)' }}>
          {LANG_ORDER.map(l => {
            const c = LANG_CONTENT[l];
            const active = lang === l;
            return (
              <button key={l} onClick={() => { setLang(l); setStep(0); }}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: active ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(212,168,67,0.35)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <span className="font-bold" style={{ fontSize: 13, color: active ? '#d4a843' : 'rgba(255,255,255,0.4)' }}>{c.label}</span>
                <span style={{ fontSize: 8, color: active ? 'rgba(212,168,67,0.6)' : 'rgba(255,255,255,0.2)' }}>{c.nativeLabel}</span>
              </button>
            );
          })}
        </div>

        {/* ── Goal Banner ── */}
        <div className="mx-5 mt-4 mb-3 px-4 py-2.5 rounded-2xl flex items-center gap-2.5"
          style={{ background: 'linear-gradient(90deg,rgba(212,168,67,0.12),rgba(212,168,67,0.05))', border: '1px solid rgba(212,168,67,0.2)' }}>
          <span style={{ fontSize: 20 }}>🎴</span>
          <span className="font-semibold" style={{ fontSize: 13, color: '#d4a843' }}>{content.goal}</span>
        </div>

        {/* ── Steps ── */}
        <div className="pb-2" style={{ overflowY: 'auto', maxHeight: 440 }}>

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3 px-5">
            {content.steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6, height: 6,
                  background: i === step ? '#d4a843' : 'rgba(212,168,67,0.2)',
                }} />
            ))}
          </div>

          {/* ── Swipeable slide area ── */}
          <div
            style={{ overflow: 'hidden', position: 'relative', touchAction: 'pan-y' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
          >
            {/* Sliding track — shows current + ghost neighbours */}
            <div style={{
              display: 'flex',
              transform: `translateX(calc(-${step * 100}% + ${dragOffset}px))`,
              transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.25,1,0.5,1)',
              willChange: 'transform',
              userSelect: 'none',
            }}>
              {content.steps.map((s, i) => (
                <div key={i} style={{ minWidth: '100%', padding: '0 20px', boxSizing: 'border-box' }}>

                  {/* Mini game screenshot — all languages */}
                  <StepVisual step={i} />

                  {/* Text card */}
                  <div className="rounded-2xl p-4 mb-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,168,67,0.1)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)', fontSize: 24 }}>
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-cinzel font-bold mb-1.5" style={{ fontSize: 13, color: '#e8d5a8' }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{s.desc}</div>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* Left / right edge tap zones + arrow hints */}
            {step > 0 && (
              <button onClick={goPrev}
                className="absolute left-0 top-0 bottom-0 flex items-center justify-start pl-1"
                style={{ width: 36, background: 'linear-gradient(90deg,rgba(18,4,4,0.5),transparent)', zIndex: 5 }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)' }}>
                  <ChevronLeft style={{ width: 14, height: 14, color: 'rgba(212,168,67,0.7)' }} />
                </div>
              </button>
            )}
            {step < totalSteps - 1 && (
              <button onClick={goNext}
                className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-1"
                style={{ width: 36, background: 'linear-gradient(270deg,rgba(18,4,4,0.5),transparent)', zIndex: 5 }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)' }}>
                  <ChevronRight style={{ width: 14, height: 14, color: 'rgba(212,168,67,0.7)' }} />
                </div>
              </button>
            )}
          </div>

          {/* Step counter + swipe hint */}
          <div className="flex items-center justify-center gap-2 mt-1 mb-4 px-5">
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{step + 1} / {totalSteps}</span>
            <span style={{ fontSize: 9, color: 'rgba(212,168,67,0.25)' }}>· swipe or tap arrows ·</span>
          </div>

          {/* ── Scoring table ── */}
          <div className="px-5" style={{ borderTop: '1px solid rgba(212,168,67,0.1)', paddingTop: 12, marginBottom: 16 }}>
            <div className="font-cinzel text-xs mb-3 tracking-wider" style={{ color: 'rgba(212,168,67,0.55)' }}>SCORING</div>
            <div className="space-y-2">
              {content.scoring.map((row, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-14 text-center font-bold rounded-lg py-1"
                    style={{
                      fontSize: 11,
                      background: i === 1 ? 'rgba(212,168,67,0.12)' : i === 2 ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.05)',
                      color: i === 1 ? '#d4a843' : i === 2 ? '#6fa3d4' : 'rgba(255,255,255,0.6)',
                      border: `1px solid ${i === 1 ? 'rgba(212,168,67,0.2)' : i === 2 ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    }}>
                    {row.pts}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold" style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{row.label}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{row.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className="px-5 pb-6 pt-1">
          <button onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-cinzel tracking-wider text-sm transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,rgba(212,168,67,0.25),rgba(180,120,40,0.15))', border: '1px solid rgba(212,168,67,0.3)', color: '#d4a843' }}>
            Let's Play! ♠
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── Home Screen ─────────────────────────────────────────────────── */

export function HomeScreen({ onCreateGame, onJoinGame, onQuickPlay }: HomeScreenProps) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const btn = (fn: () => void) => () => { Sounds.click(); fn(); };

  return (
    <>
      <div className="min-h-screen relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a0505 0%, #2d0a0a 30%, #1e0808 60%, #120404 100%)' }}>

        {/* Ornamental arch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.06]">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-t-full border-t-2 border-l-2 border-r-2"
            style={{ borderColor: 'rgba(212,168,67,0.5)' }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[440px] h-[220px] rounded-t-full border-t border-l border-r"
            style={{ borderColor: 'rgba(212,168,67,0.3)' }} />
        </div>

        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.06), transparent 70%)' }} />

        {/* Floating card silhouettes */}
        {[{ x: '12%', y: '20%', r: -15, d: '8s' }, { x: '82%', y: '30%', r: 10, d: '10s' }, { x: '8%', y: '65%', r: -8, d: '9s' }].map((c, i) => (
          <div key={i} className="absolute opacity-[0.04] animate-float"
            style={{ left: c.x, top: c.y, transform: `rotate(${c.r}deg)`, animationDuration: c.d, animationDelay: `${i}s` }}>
            <div className="w-12 h-18 rounded-md" style={{ border: '1.5px solid rgba(212,168,67,0.6)', width: 48, height: 68 }} />
          </div>
        ))}

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 max-w-lg mx-auto">

          {/* ── Logo ── */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-block mb-5 relative w-24 h-24">
              <div className="absolute inset-0 rounded-full animate-spin-slow"
                style={{ border: '1px solid rgba(212,168,67,0.15)' }} />
              <div className="absolute inset-2 rounded-full"
                style={{ border: '1px solid rgba(212,168,67,0.1)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl" style={{ color: '#d4a843', filter: 'drop-shadow(0 0 12px rgba(212,168,67,0.4))' }}>♠</span>
              </div>
            </div>

            <div className="font-cinzel text-5xl md:text-6xl mb-2 tracking-[0.1em]"
              style={{ color: '#d4a843', fontWeight: 800, textShadow: '0 0 20px rgba(212,168,67,0.3)' }}>
              MINDI
            </div>

            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.4))' }} />
              <p className="text-xs tracking-[0.12em]" style={{ color: 'rgba(212,168,67,0.5)' }}>
                THE CLASSIC INDIAN CARD GAME
              </p>
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, rgba(212,168,67,0.4), transparent)' }} />
            </div>
            <p className="text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.18)' }}>
              MENDIKOT · 4–10 PLAYERS · TWO TEAMS
            </p>
          </div>

          {/* ── Action Buttons ── */}
          <div className="w-full space-y-4 mb-8">
            {onQuickPlay && (
              <button onClick={btn(onQuickPlay)}
                className="group w-full relative overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.6), rgba(180,120,40,0.3), rgba(212,168,67,0.6))' }}>
                <div className="relative rounded-2xl px-6 py-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #2a0f0f, #3d1515)' }}>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)' }}>
                        <Zap className="w-6 h-6" style={{ color: '#d4a843' }} />
                      </div>
                      <div className="text-left">
                        <div className="font-cinzel text-lg text-white tracking-wide">Quick Play</div>
                        <div className="text-[11px]" style={{ color: 'rgba(212,168,67,0.5)' }}>Instant match vs AI</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full text-[9px] font-bold tracking-wider animate-bounce-subtle"
                      style={{ background: 'rgba(212,168,67,0.12)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.25)' }}>
                      PLAY
                    </div>
                  </div>
                </div>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={btn(onCreateGame)}
                className="group rounded-xl p-[1px] transition-all duration-300 hover:scale-[1.03]"
                style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.3), rgba(120,80,20,0.15))' }}>
                <div className="rounded-xl px-4 py-5" style={{ background: '#1e0a0a' }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)' }}>
                      <Play className="w-5 h-5" style={{ color: '#d4a843' }} />
                    </div>
                    <div className="font-cinzel text-sm text-white text-center">Create Game</div>
                    <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Host a room</div>
                  </div>
                </div>
              </button>

              <button onClick={btn(onJoinGame)}
                className="group rounded-xl p-[1px] transition-all duration-300 hover:scale-[1.03]"
                style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.3), rgba(120,80,20,0.15))' }}>
                <div className="rounded-xl px-4 py-5" style={{ background: '#1e0a0a' }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)' }}>
                      <Users className="w-5 h-5" style={{ color: '#d4a843' }} />
                    </div>
                    <div className="font-cinzel text-sm text-white text-center">Join Game</div>
                    <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Enter code</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ── How to Play trigger ── */}
          <button onClick={() => { Sounds.click(); setShowHowToPlay(true); }}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-6 transition-all hover:scale-[1.03]"
            style={{
              background: 'rgba(212,168,67,0.07)',
              border: '1px solid rgba(212,168,67,0.2)',
              color: 'rgba(212,168,67,0.7)',
            }}>
            <BookOpen style={{ width: 14, height: 14 }} />
            <span className="text-xs tracking-wider font-semibold">How to Play</span>
            <span className="text-[9px] tracking-widest opacity-60">EN · हि · ગુ · म · த</span>
          </button>

          <div className="text-[9px] tracking-widest" style={{ color: 'rgba(255,255,255,0.1)' }}>
            A ROYAL INDIAN CARD TRADITION
          </div>
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </>
  );
}
