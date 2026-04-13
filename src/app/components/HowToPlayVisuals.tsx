/**
 * HowToPlayVisuals — pixel-faithful mini reproductions of the actual game UI.
 * Used in the How-to-Play modal as per-step "screenshots".
 * All styling is derived from Card.tsx / TrickArea.tsx / GameTable.tsx.
 */

/* ── shared constants (mirror Card.tsx) ─────────────────────────── */
const SUIT_SYM: Record<string, string> = { hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣' };
const SUIT_COL: Record<string, string> = { hearts: '#c0181a', diamonds: '#c2410c', spades: '#2e2e4a', clubs: '#14532d' };
const SUIT_COL_LIGHT: Record<string, string> = { hearts: '#d93535', diamonds: '#e05520', spades: '#6b7aaa', clubs: '#2a8a55' };
const TEAM_BG = ['rgba(96,165,250,0.15)', 'rgba(248,113,113,0.15)'];
const TEAM_BD = ['rgba(96,165,250,0.4)', 'rgba(248,113,113,0.4)'];
const TEAM_TX = ['#6fa3d4', '#d47070'];
const AVATARS = ['🦁', '🦅', '🐘', '🦚', '🐅', '🐍', '🦎', '🐎'];

/* ── Mini Card ───────────────────────────────────────────────────── */
interface MiniCardProps {
  rank: string;
  suit: string;
  isMindi?: boolean;   // 10-rank → gold glow
  dim?: boolean;       // unplayable → grey
  back?: boolean;      // face-down
  w?: number;
  h?: number;
}
function MiniCard({ rank, suit, isMindi, dim, back, w = 42, h = 58 }: MiniCardProps) {
  const sc = SUIT_COL[suit] ?? '#555';
  const scl = SUIT_COL_LIGHT[suit] ?? '#888';
  const sym = SUIT_SYM[suit] ?? '';

  if (back) return (
    <div style={{
      width: w, height: h, borderRadius: 6, flexShrink: 0,
      background: 'linear-gradient(145deg,#3b0a0a,#5c1a1a,#4a1010)',
      border: '1px solid rgba(212,168,67,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, filter: dim ? 'brightness(0.5) grayscale(0.4)' : undefined,
    }}>
      <span style={{ color: 'rgba(212,168,67,0.35)', fontSize: 16 }}>♠</span>
    </div>
  );

  return (
    <div style={{
      width: w, height: h, borderRadius: 6, flexShrink: 0, position: 'relative',
      background: isMindi
        ? 'linear-gradient(170deg,#fffdf5,#fef3c7,#fde68a)'
        : 'linear-gradient(170deg,#fffef8,#faf8f0,#f5f0e4)',
      border: isMindi ? '1.5px solid rgba(212,168,67,0.65)' : '1px solid rgba(0,0,0,0.1)',
      boxShadow: isMindi ? '0 0 10px rgba(212,168,67,0.45)' : '0 2px 6px rgba(0,0,0,0.25)',
      filter: dim ? 'brightness(0.45) saturate(0.3) grayscale(0.3)' : undefined,
      overflow: 'hidden',
    }}>
      {/* top-left rank + suit */}
      <div style={{ position: 'absolute', top: 3, left: 4, lineHeight: 1 }}>
        <div style={{ fontFamily: 'serif', fontWeight: 800, fontSize: 11, color: sc, lineHeight: 1 }}>{rank}</div>
        <div style={{ fontSize: 8, color: scl, lineHeight: 1 }}>{sym}</div>
      </div>
      {/* center suit */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, color: sc, filter: `drop-shadow(0 1px 2px ${sc}55)` }}>{sym}</span>
      </div>
      {/* bottom-right (flipped) */}
      <div style={{ position: 'absolute', bottom: 3, right: 4, lineHeight: 1, transform: 'rotate(180deg)' }}>
        <div style={{ fontFamily: 'serif', fontWeight: 800, fontSize: 11, color: sc }}>{rank}</div>
      </div>
      {isMindi && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 60%,rgba(212,168,67,0.18),transparent 70%)',
        }} />
      )}
    </div>
  );
}

/* ── Player badge (horizontal) ───────────────────────────────────── */
function PlayerBadge({ name, teamId, isCurrent, avatar }: { name: string; teamId: 0|1; isCurrent?: boolean; avatar: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: isCurrent ? 'rgba(212,168,67,0.15)' : TEAM_BG[teamId],
      border: `1px solid ${isCurrent ? 'rgba(212,168,67,0.5)' : TEAM_BD[teamId]}`,
      color: isCurrent ? '#d4a843' : TEAM_TX[teamId],
      boxShadow: isCurrent ? '0 0 8px rgba(212,168,67,0.3)' : undefined,
    }}>
      <span style={{ fontSize: 12 }}>{avatar}</span>
      <span>{name}</span>
      {isCurrent && <span style={{ fontSize: 7, color: '#d4a843' }} className="animate-pulse">●</span>}
    </div>
  );
}

/* ══ STEP 0 — Objective: Mindi cards glow ═══════════════════════════ */
function ObjectiveVisual() {
  const cards = [
    { rank: 'A', suit: 'spades' },
    { rank: '10', suit: 'hearts', isMindi: true },
    { rank: 'K', suit: 'diamonds' },
    { rank: '10', suit: 'clubs', isMindi: true },
    { rank: '9', suit: 'spades' },
    { rank: '10', suit: 'spades', isMindi: true },
  ];
  return (
    <div style={{
      width: '100%', padding: '14px 10px 10px',
      background: 'linear-gradient(160deg,#1e0808,#2a0f0f)',
      borderRadius: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        padding: '4px 10px',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid rgba(212,168,67,0.1)',
      }}>
        <span style={{ color: '#d4a843', fontSize: 12 }}>♠</span>
        <span style={{ fontFamily: 'serif', letterSpacing: '0.15em', fontSize: 9, color: 'rgba(212,168,67,0.6)' }}>MINDI</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>#1/15</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, marginTop: 28 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ transform: c.isMindi ? 'translateY(-8px) scale(1.05)' : undefined, transition: 'transform 0.3s' }}>
            <MiniCard rank={c.rank} suit={c.suit} isMindi={c.isMindi} w={38} h={54} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <div style={{
          padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 700,
          background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.3)', color: '#d4a843',
        }}>
          ✦ Glowing cards are Mindis (10s) — capture them!
        </div>
      </div>
    </div>
  );
}

/* ══ STEP 1 — Teams: compass-point badges ══════════════════════════ */
function TeamsVisual() {
  return (
    <div style={{
      width: '100%', padding: 12,
      background: 'linear-gradient(160deg,#1e0808,#2a0f0f)',
      borderRadius: 12, position: 'relative',
    }}>
      <div style={{ position: 'relative', height: 130 }}>
        {/* Table oval */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 130, height: 75,
          borderRadius: 16,
          background: 'radial-gradient(ellipse at 50% 40%,rgba(212,168,67,0.04),rgba(0,0,0,0.4))',
          border: '1px solid rgba(212,168,67,0.1)',
        }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 8, color: 'rgba(212,168,67,0.15)', letterSpacing: '0.1em' }}>TABLE</span>
          </div>
        </div>
        {/* Top — Arjun Team A */}
        <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)' }}>
          <PlayerBadge name="Arjun" teamId={0} avatar="🦅" />
        </div>
        {/* Bottom — You Team A */}
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)' }}>
          <PlayerBadge name="You" teamId={0} avatar="🦁" isCurrent />
        </div>
        {/* Left — Priya Team B */}
        <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)' }}>
          <PlayerBadge name="Priya" teamId={1} avatar="🦚" />
        </div>
        {/* Right — Vikram Team B */}
        <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}>
          <PlayerBadge name="Vikram" teamId={1} avatar="🐅" />
        </div>
      </div>
      {/* Team legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 4 }}>
        {([0, 1] as const).map(t => (
          <div key={t} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 99, fontSize: 9,
            background: TEAM_BG[t], border: `1px solid ${TEAM_BD[t]}`, color: TEAM_TX[t],
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 99, background: TEAM_TX[t] }} />
            Team {t === 0 ? 'A' : 'B'}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ STEP 2 — Playing a Trick ═══════════════════════════════════════ */
function TrickVisual() {
  const played = [
    { rank: 'K', suit: 'hearts', name: 'Arjun', avatar: '🦅', teamId: 0 as const, winner: false },
    { rank: 'A', suit: 'hearts', name: 'Vikram', avatar: '🐅', teamId: 1 as const, winner: true },
    { rank: '9', suit: 'hearts', name: 'Priya', avatar: '🦚', teamId: 1 as const, winner: false },
    { rank: 'J', suit: 'hearts', name: 'You', avatar: '🦁', teamId: 0 as const, winner: false },
  ];
  // Cardinal positions for 4 cards around center
  const positions = [
    { top: 6, left: '50%', tx: '-50%' },      // top
    { top: '50%', right: 8, ty: '-50%' },      // right
    { bottom: 6, left: '50%', tx: '-50%' },    // bottom
    { top: '50%', left: 8, ty: '-50%' },       // left
  ];
  return (
    <div style={{
      width: '100%', padding: 10,
      background: 'linear-gradient(160deg,#1e0808,#2a0f0f)',
      borderRadius: 12, position: 'relative',
    }}>
      {/* Led suit tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>LED SUIT</span>
        <span style={{ fontSize: 14, color: '#d93535' }}>♥</span>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>Hearts</span>
        <div style={{ flex: 1 }} />
        <div style={{ padding: '2px 6px', borderRadius: 6, fontSize: 8, background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', color: '#d4a843' }}>
          Trick #3
        </div>
      </div>
      <div style={{ position: 'relative', height: 120 }}>
        {/* Table circle */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 80, height: 80, borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%,rgba(212,168,67,0.05),rgba(30,8,8,0.5))',
          border: '1px solid rgba(212,168,67,0.1)',
        }} />
        {/* Cards */}
        {played.map((p, i) => {
          const pos = positions[i];
          return (
            <div key={i} style={{
              position: 'absolute',
              ...(pos.top !== undefined ? { top: pos.top } : {}),
              ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
              ...(pos.left !== undefined ? { left: pos.left } : {}),
              ...(pos.right !== undefined ? { right: pos.right } : {}),
              transform: `${pos.tx ? `translateX(${pos.tx})` : ''} ${pos.ty ? `translateY(${pos.ty})` : ''}`.trim(),
              filter: p.winner ? 'drop-shadow(0 0 8px rgba(212,168,67,0.6))' : undefined,
              zIndex: p.winner ? 2 : 1,
            }}>
              <MiniCard rank={p.rank} suit={p.suit} w={36} h={50} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <div style={{
          padding: '2px 10px', borderRadius: 99, fontSize: 9,
          background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)', color: '#d4a843',
        }}>
          A♥ wins — highest of led suit
        </div>
      </div>
    </div>
  );
}

/* ══ STEP 3 — Follow the Suit: hand with playable/unplayable ════════ */
function FollowSuitVisual() {
  const hand = [
    { rank: 'A', suit: 'hearts', playable: true },
    { rank: 'J', suit: 'hearts', playable: true },
    { rank: 'K', suit: 'spades', playable: false },
    { rank: '10', suit: 'diamonds', playable: false, isMindi: true },
    { rank: '8', suit: 'clubs', playable: false },
    { rank: '9', suit: 'hearts', playable: true },
  ];
  return (
    <div style={{
      width: '100%', padding: '10px 10px 12px',
      background: 'linear-gradient(160deg,#1e0808,#2a0f0f)',
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{
          padding: '3px 10px', borderRadius: 99, fontSize: 9,
          background: 'rgba(211,47,47,0.1)', border: '1px solid rgba(211,47,47,0.3)', color: '#d93535',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span>♥ Hearts led</span>
        </div>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>You have hearts → must follow</span>
      </div>
      {/* Hand */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', position: 'relative', height: 68 }}>
        {hand.map((c, i) => {
          const offset = (i - (hand.length - 1) / 2) * 30;
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `calc(50% + ${offset}px)`,
              transform: `translateX(-50%) translateY(${c.playable ? -12 : 0}px)`,
              transition: 'transform 0.3s',
              zIndex: c.playable ? 10 + i : i,
            }}>
              <MiniCard rank={c.rank} suit={c.suit} isMindi={c.isMindi} dim={!c.playable} w={36} h={52} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#d93535' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(211,47,47,0.15)', border: '1px solid rgba(211,47,47,0.4)' }} />
          Playable (hearts)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
          Blocked (other suits)
        </div>
      </div>
    </div>
  );
}

/* ══ STEP 4 — Trump (Hukum) beats everything ════════════════════════ */
function TrumpVisual() {
  return (
    <div style={{
      width: '100%', padding: '10px',
      background: 'linear-gradient(160deg,#1e0808,#2a0f0f)',
      borderRadius: 12,
    }}>
      {/* Header bar replica */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 10px', borderRadius: 8, marginBottom: 10,
        background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,168,67,0.12)',
      }}>
        <span style={{ fontFamily: 'serif', fontSize: 10, color: 'rgba(212,168,67,0.6)', letterSpacing: '0.2em' }}>MINDI</span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 99,
          background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)',
        }}>
          <span style={{ fontSize: 10, color: '#d4a843' }}>⚡</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>Trump</span>
          <span style={{ fontSize: 16, color: '#2e3caa', lineHeight: 1 }}>♠</span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>2 – 1</span>
      </div>
      {/* Comparison */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <MiniCard rank="2" suit="spades" w={42} h={60} />
          <div style={{ fontSize: 8, color: '#d4a843', marginTop: 4 }}>Trump 2</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700,
            background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.3)', color: '#d4a843',
          }}>BEATS</div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>any card</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <MiniCard rank="A" suit="hearts" w={42} h={60} />
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Any Ace</div>
        </div>
      </div>
    </div>
  );
}

/* ══ STEP 5 — Winning / Scoreboard ══════════════════════════════════ */
function WinningVisual() {
  return (
    <div style={{
      width: '100%', padding: 10,
      background: 'linear-gradient(160deg,#1e0808,#2a0f0f)',
      borderRadius: 12,
    }}>
      {/* MENDIKOT banner */}
      <div style={{
        textAlign: 'center', marginBottom: 10, padding: '6px 10px', borderRadius: 10,
        background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)',
      }}>
        <div style={{ fontFamily: 'serif', fontSize: 14, fontWeight: 700, color: '#d4a843', letterSpacing: '0.15em' }}>MENDIKOT!</div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>Team A captured all 4 Mindis</div>
      </div>
      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
        {/* Team A */}
        <div style={{
          padding: '8px 6px', borderRadius: 10, textAlign: 'center',
          background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)',
        }}>
          <div style={{ fontSize: 8, color: 'rgba(96,165,250,0.6)', letterSpacing: '0.1em', marginBottom: 2 }}>TEAM A</div>
          <div style={{ fontFamily: 'serif', fontSize: 22, fontWeight: 700, color: '#6fa3d4', lineHeight: 1 }}>7</div>
          <div style={{ fontSize: 7, color: 'rgba(96,165,250,0.4)', marginTop: 1 }}>4 Mindis · 10 tricks</div>
        </div>
        {/* VS */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>–</div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.15)', marginTop: 1 }}>pts</div>
        </div>
        {/* Team B */}
        <div style={{
          padding: '8px 6px', borderRadius: 10, textAlign: 'center',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
        }}>
          <div style={{ fontSize: 8, color: 'rgba(248,113,113,0.6)', letterSpacing: '0.1em', marginBottom: 2 }}>TEAM B</div>
          <div style={{ fontFamily: 'serif', fontSize: 22, fontWeight: 700, color: '#d47070', lineHeight: 1 }}>4</div>
          <div style={{ fontSize: 7, color: 'rgba(248,113,113,0.4)', marginTop: 1 }}>0 Mindis · 5 tricks</div>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ marginTop: 8, borderRadius: 99, overflow: 'hidden', height: 4, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ height: '100%', width: '63%', borderRadius: 99, background: 'linear-gradient(90deg,#6fa3d4,#4a90d4)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 7, color: 'rgba(96,165,250,0.4)' }}>Team A — 7/11 pts</span>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.15)' }}>First to 11 wins</span>
      </div>
    </div>
  );
}

/* ── Public export ───────────────────────────────────────────────── */
const STEP_VISUALS = [
  ObjectiveVisual,
  TeamsVisual,
  TrickVisual,
  FollowSuitVisual,
  TrumpVisual,
  WinningVisual,
];

export function StepVisual({ step }: { step: number }) {
  const Visual = STEP_VISUALS[step];
  if (!Visual) return null;
  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(212,168,67,0.12)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      marginBottom: 10,
    }}>
      <Visual />
    </div>
  );
}
