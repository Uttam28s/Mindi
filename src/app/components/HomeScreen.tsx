import { useState, useRef } from 'react';
import { Play, Users, Zap, X, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import { Sounds } from '../utils/sounds';
import { haptic } from '../utils/juice';
import { StepVisual } from './HowToPlayVisuals';
import { UtsavBackground } from './UtsavBackground';
import { SoundToggle } from './SoundToggle';

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
      { label: 'Mendikot', pts: '2 pts', note: 'Team captures all 4 Mindis' },
      { label: 'Whitewash', pts: '3 pts', note: 'Team wins all 15 tricks' },
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
      { label: 'मेंडीकोट', pts: '2 pts', note: 'सभी 4 मिंडी अपनी टीम को मिलें' },
      { label: 'व्हाइटवाश', pts: '3 pts', note: 'सभी 15 चालें जीती हों' },
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
      { label: 'મેંડીકોટ', pts: '2 pts', note: 'ચારેય મીંડી ટીમ ને' },
      { label: 'વ્હાઇટવોશ', pts: '3 pts', note: 'બધી 15 ચાલ જીતી' },
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
      { label: 'मेंडीकोट', pts: '2 pts', note: 'सर्व 4 मिंडी संघाला मिळाल्या' },
      { label: 'व्हाइटवॉश', pts: '3 pts', note: 'सर्व 15 डाव जिंकले' },
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
      { label: 'மேண்டிகோட்', pts: '2 pts', note: 'நான்கு மிண்டியும் பிடிக்கப்பட்டது' },
      { label: 'வைட்வாஷ்', pts: '3 pts', note: '15 சுற்றுகளும் வெல்லப்பட்டது' },
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
      style={{ background: 'rgba(20,10,44,0.9)' }}
      onClick={onClose}>

      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: 'linear-gradient(168deg,#40287F,#2C1F5E)', border: '1px solid rgba(255,201,60,0.18)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '1px solid rgba(255,201,60,0.1)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,201,60,0.1)', border: '1px solid rgba(255,201,60,0.2)' }}>
              <BookOpen style={{ width: 15, height: 15, color: '#FFC93C' }} />
            </div>
            <div>
              <div className="u-display text-sm text-white tracking-wide">How to Play</div>
              <div className="text-[9px] tracking-widest" style={{ color: 'rgba(255,201,60,0.45)' }}>MINDI · MENDIKOT</div>
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
          style={{ borderBottom: '1px solid rgba(255,201,60,0.07)' }}>
          {LANG_ORDER.map(l => {
            const c = LANG_CONTENT[l];
            const active = lang === l;
            return (
              <button key={l} onClick={() => { setLang(l); setStep(0); }}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: active ? 'rgba(255,201,60,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(255,201,60,0.35)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <span className="font-bold" style={{ fontSize: 13, color: active ? '#FFC93C' : 'rgba(255,255,255,0.4)' }}>{c.label}</span>
                <span style={{ fontSize: 8, color: active ? 'rgba(255,201,60,0.6)' : 'rgba(255,255,255,0.2)' }}>{c.nativeLabel}</span>
              </button>
            );
          })}
        </div>

        {/* ── Goal Banner ── */}
        <div className="mx-5 mt-4 mb-3 px-4 py-2.5 rounded-2xl flex items-center gap-2.5"
          style={{ background: 'linear-gradient(90deg,rgba(255,201,60,0.12),rgba(255,201,60,0.05))', border: '1px solid rgba(255,201,60,0.2)' }}>
          <span style={{ fontSize: 20 }}>🎴</span>
          <span className="font-semibold" style={{ fontSize: 13, color: '#FFC93C' }}>{content.goal}</span>
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
                  background: i === step ? '#FFC93C' : 'rgba(255,201,60,0.2)',
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
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,201,60,0.1)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,201,60,0.08)', border: '1px solid rgba(255,201,60,0.15)', fontSize: 24 }}>
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="u-display font-bold mb-1.5" style={{ fontSize: 13, color: '#FFF0BE' }}>{s.title}</div>
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
                  style={{ background: 'rgba(255,201,60,0.1)', border: '1px solid rgba(255,201,60,0.2)' }}>
                  <ChevronLeft style={{ width: 14, height: 14, color: 'rgba(255,201,60,0.7)' }} />
                </div>
              </button>
            )}
            {step < totalSteps - 1 && (
              <button onClick={goNext}
                className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-1"
                style={{ width: 36, background: 'linear-gradient(270deg,rgba(18,4,4,0.5),transparent)', zIndex: 5 }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,201,60,0.1)', border: '1px solid rgba(255,201,60,0.2)' }}>
                  <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,201,60,0.7)' }} />
                </div>
              </button>
            )}
          </div>

          {/* Step counter + swipe hint */}
          <div className="flex items-center justify-center gap-2 mt-1 mb-4 px-5">
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{step + 1} / {totalSteps}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,201,60,0.25)' }}>· swipe or tap arrows ·</span>
          </div>

          {/* ── Scoring table ── */}
          <div className="px-5" style={{ borderTop: '1px solid rgba(255,201,60,0.1)', paddingTop: 12, marginBottom: 16 }}>
            <div className="u-display text-xs mb-3 tracking-wider" style={{ color: 'rgba(255,201,60,0.55)' }}>SCORING</div>
            <div className="space-y-2">
              {content.scoring.map((row, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-14 text-center font-bold rounded-lg py-1"
                    style={{
                      fontSize: 11,
                      background: i === 1 ? 'rgba(255,201,60,0.12)' : i === 2 ? 'rgba(37,201,245,0.1)' : 'rgba(255,255,255,0.05)',
                      color: i === 1 ? '#FFC93C' : i === 2 ? '#25C9F5' : 'rgba(255,255,255,0.6)',
                      border: `1px solid ${i === 1 ? 'rgba(255,201,60,0.2)' : i === 2 ? 'rgba(37,201,245,0.2)' : 'rgba(255,255,255,0.07)'}`,
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
            className="w-full py-3.5 rounded-2xl u-display tracking-wider text-sm transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,rgba(255,201,60,0.25),rgba(180,120,40,0.15))', border: '1px solid rgba(255,201,60,0.3)', color: '#FFC93C' }}>
            Let's Play! ♠
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── Home Screen ─────────────────────────────────────────────────── */

/* ── Utsav logo: chunky stacked type on a spinning suit rosette ─────── */

function Logo() {
  const suits = ['hearts', 'spades', 'diamonds', 'clubs'] as const;
  const paths: Record<string, string> = {
    hearts:  'M12 20.9 4.1 13a5.2 5.2 0 0 1 7.3-7.4l.6.6.6-.6A5.2 5.2 0 0 1 19.9 13z',
    diamonds:'M12 2.2 21.2 12 12 21.8 2.8 12z',
    spades:  'M12 2.2C12 2.2 4.1 8.4 4.1 13.2a4.7 4.7 0 0 0 7.3 3.9c-.3 2-1.2 3.5-2.4 4.4h6a6.4 6.4 0 0 1-2.4-4.4 4.7 4.7 0 0 0 7.3-3.9c0-4.8-7.9-11-7.9-11z',
    clubs:   'M12 2.1a4.1 4.1 0 0 0-2.7 7.2A4.1 4.1 0 1 0 7 16.8a4 4 0 0 0 3.4-1.9c-.2 2.1-1.1 3.7-2.3 4.6h7.8c-1.2-.9-2.1-2.5-2.3-4.6a4 4 0 0 0 3.4 1.9 4.1 4.1 0 1 0-2.3-7.5A4.1 4.1 0 0 0 12 2.1z',
  };
  const cols = ['#FF4D8D', '#7B5CFF', '#FFC93C', '#38E08A'];

  return (
    <div className="text-center u-anim-pop-in" style={{ marginBottom: 26 }}>
      {/* four suits arranged as a rosette, gently counter-rotating */}
      <div style={{ position: 'relative', width: 104, height: 104, margin: '0 auto 10px' }}>
        <div className="u-ambient" style={{ position: 'absolute', inset: 0, animation: 'spin-slow 26s linear infinite' }}>
          {suits.map((s, i) => {
            const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
            return (
              <div key={s} style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `translate(-50%,-50%) translate(${Math.cos(a) * 34}px, ${Math.sin(a) * 34}px)`,
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={paths[s]} fill={cols[i]} transform="translate(0,1)" opacity=".45" />
                  <path d={paths[s]} fill={cols[i]} />
                </svg>
              </div>
            );
          })}
        </div>
        <div className="u-anim-breathe" style={{
          position: 'absolute', inset: 26, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #FFF2C4, #FFC93C 62%, #E09A00 100%)',
          boxShadow: '0 4px 0 #C98A00, 0 10px 20px rgba(30,16,60,.4), inset 0 -4px 8px rgba(201,138,0,.5)',
        }} />
      </div>

      <div className="u-title" style={{ fontSize: 'clamp(52px,15vw,74px)', letterSpacing: '.01em' }}>
        MINDI
      </div>

      <div style={{
        display: 'inline-block', marginTop: 4, padding: '5px 16px', borderRadius: 999,
        background: 'rgba(255,255,255,.18)', border: '2px solid rgba(255,255,255,.34)',
        boxShadow: '0 3px 0 rgba(52,36,110,.3)',
      }}>
        <span className="u-body" style={{ fontSize: 12.5, color: '#fff', letterSpacing: '.06em' }}>
          MENDIKOT · 4–10 PLAYERS
        </span>
      </div>
    </div>
  );
}

/* ── Big chunky menu button ─────────────────────────────────────────── */

function MenuButton({
  onClick, icon, title, subtitle, variant, badge, wide,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  variant: 'holi' | 'sky' | 'mint' | 'jamun' | 'marigold';
  badge?: string;
  wide?: boolean;
}) {
  const cls = variant === 'holi' ? '' : `u-btn--${variant}`;
  return (
    <button
      onClick={onClick}
      className={`u-btn ${cls}`}
      style={{
        width: '100%',
        padding: wide ? '16px 20px' : '18px 14px',
        borderRadius: 22,
        display: 'flex',
        alignItems: 'center',
        gap: wide ? 14 : 8,
        flexDirection: wide ? 'row' : 'column',
        justifyContent: wide ? 'flex-start' : 'center',
        textAlign: wide ? 'left' : 'center',
      }}
    >
      <span style={{
        width: wide ? 46 : 40, height: wide ? 46 : 40, flex: 'none',
        borderRadius: 14, display: 'grid', placeItems: 'center',
        background: 'rgba(255,255,255,.26)',
        boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.12), inset 0 2px 0 rgba(255,255,255,.4)',
        position: 'relative', zIndex: 1,
      }}>
        {icon}
      </span>
      <span style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: wide ? 21 : 15.5, lineHeight: 1.1 }}>{title}</span>
        <span style={{ display: 'block', fontSize: wide ? 12.5 : 11, fontWeight: 600, opacity: .82, lineHeight: 1.25 }}>
          {subtitle}
        </span>
      </span>
      {badge && (
        <span className="u-anim-breathe" style={{
          position: 'relative', zIndex: 1, flex: 'none',
          padding: '5px 12px', borderRadius: 999, fontSize: 11.5,
          background: '#fff', color: '#C41F5E',
          boxShadow: '0 2px 0 rgba(0,0,0,.16)',
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Home Screen ────────────────────────────────────────────────────── */

export function HomeScreen({ onCreateGame, onJoinGame, onQuickPlay }: HomeScreenProps) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const btn = (fn: () => void) => () => { Sounds.click(); haptic(11); fn(); };

  return (
    <>
      <div className="min-h-screen relative overflow-hidden">
        <UtsavBackground variant="menu" />

        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 20 }}>
          <SoundToggle />
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto"
          style={{ paddingTop: 96 }}>

          <Logo />

          <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {onQuickPlay && (
              <div className="u-anim-drop-in" style={{ animationDelay: '80ms' }}>
                <MenuButton
                  wide
                  onClick={btn(onQuickPlay)}
                  variant="holi"
                  icon={<Zap style={{ width: 24, height: 24, color: '#fff' }} />}
                  title="Quick Play"
                  subtitle="Jump straight into a match"
                  badge="GO"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="u-anim-drop-in" style={{ animationDelay: '160ms' }}>
                <MenuButton
                  onClick={btn(onCreateGame)}
                  variant="sky"
                  icon={<Play style={{ width: 20, height: 20, color: '#fff' }} />}
                  title="Create"
                  subtitle="Host a room"
                />
              </div>
              <div className="u-anim-drop-in" style={{ animationDelay: '230ms' }}>
                <MenuButton
                  onClick={btn(onJoinGame)}
                  variant="mint"
                  icon={<Users style={{ width: 20, height: 20, color: '#04351D' }} />}
                  title="Join"
                  subtitle="Enter a code"
                />
              </div>
            </div>
          </div>

          {/* ── How to Play ── */}
          <button
            onClick={() => { Sounds.click(); haptic(11); setShowHowToPlay(true); }}
            className="u-btn u-anim-drop-in"
            style={{
              animationDelay: '300ms',
              background: 'rgba(255,255,255,.2)',
              boxShadow: '0 4px 0 rgba(52,36,110,.42), inset 0 2px 0 rgba(255,255,255,.34)',
              padding: '11px 20px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 9,
            }}
          >
            <BookOpen style={{ width: 15, height: 15, position: 'relative', zIndex: 1 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>How to Play</span>
            <span style={{ position: 'relative', zIndex: 1, fontSize: 10.5, opacity: .78 }}>
              EN · हि · ગુ · म · த
            </span>
          </button>

          <div className="u-body" style={{ marginTop: 22, fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: '.1em' }}>
            खेलो · રમો · விளையாடு
          </div>
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </>
  );
}
