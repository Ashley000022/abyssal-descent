import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadLibreBaskerville} from '@remotion/google-fonts/LibreBaskerville';
import {loadFont as loadSpaceMono} from '@remotion/google-fonts/SpaceMono';

const {fontFamily: SANS} = loadInter();
const {fontFamily: SERIF} = loadLibreBaskerville();
const {fontFamily: MONO} = loadSpaceMono();

const COLORS = {
  paper: '#F5F4EF',
  paperWarm: '#F0EEE7',
  ink: '#24231F',
  inkSoft: '#6B6962',
  line: 'rgba(36,35,31,0.12)',
  cyan: '#BFE8F2',
  lavender: '#D8D1F2',
  coral: '#F0C1B6',
  mint: '#CDE9D9',
  oceanCyan: '#7AF7E8',
  oceanLavender: '#C9B7FF',
};

const PROMPT =
  'Create an immersive descent to the deepest place on Earth. Use bioluminescence and live telemetry.';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const fadeWindow = (
  frame: number,
  fadeInStart: number,
  fadeInEnd: number,
  fadeOutStart: number,
  fadeOutEnd: number,
) =>
  interpolate(frame, [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd], [0, 1, 1, 0], clamp);

const ManusMark: React.FC<{size?: number; color?: string}> = ({
  size = 34,
  color = COLORS.ink,
}) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <path
      d="M20 3.5C29.1 3.5 36.5 10.9 36.5 20S29.1 36.5 20 36.5 3.5 29.1 3.5 20 10.9 3.5 20 3.5Z"
      stroke={color}
      strokeWidth="2.3"
    />
    <path
      d="M12.5 25.9 17.8 11l4.5 11.2L27.5 14l-2.4 14.8"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ManusWordmark: React.FC<{color?: string; size?: number}> = ({
  color = COLORS.ink,
  size = 30,
}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, color}}>
    <ManusMark size={size + 2} color={color} />
    <span style={{fontFamily: SERIF, fontWeight: 700, fontSize: size, letterSpacing: '-0.035em'}}>
      manus
    </span>
  </div>
);

const BrandBlobs: React.FC<{seed: number; dark?: boolean; intensity?: number}> = ({
  seed,
  dark = false,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const palette = dark
    ? ['#0B4161', '#222C67', '#49285E', '#0D5667']
    : [COLORS.cyan, COLORS.lavender, COLORS.coral, COLORS.mint];

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: dark ? '#02050B' : COLORS.paper,
      }}
    >
      {palette.map((color, index) => {
        const baseX = random(`${seed}-x-${index}`) * 1500 - 120;
        const baseY = random(`${seed}-y-${index}`) * 850 - 100;
        const size = 620 + random(`${seed}-s-${index}`) * 560;
        const driftX = Math.sin(frame / (45 + index * 9) + index) * (45 + index * 8);
        const driftY = Math.cos(frame / (55 + index * 11) + index * 1.7) * (28 + index * 5);
        const scale = 1 + Math.sin(frame / (70 + index * 12)) * 0.035;
        return (
          <div
            key={color}
            style={{
              position: 'absolute',
              left: baseX + driftX,
              top: baseY + driftY,
              width: size,
              height: size * 0.75,
              borderRadius: '48% 52% 62% 38% / 48% 38% 62% 52%',
              background: color,
              opacity: (dark ? 0.4 : 0.58) * intensity,
              filter: `blur(${dark ? 120 : 105}px)`,
              transform: `rotate(${index * 27 - 18}deg) scale(${scale})`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background: dark
            ? 'radial-gradient(circle at 50% 45%, transparent 10%, rgba(0,1,6,0.74) 100%)'
            : 'radial-gradient(circle at 50% 38%, rgba(255,255,255,0.15), rgba(245,244,239,0.46) 82%)',
        }}
      />
    </AbsoluteFill>
  );
};

const TopBar: React.FC<{light?: boolean}> = ({light = false}) => (
  <div
    style={{
      position: 'absolute',
      top: 52,
      left: 66,
      right: 66,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 20,
    }}
  >
    <ManusWordmark color={light ? '#F6F7FA' : COLORS.ink} size={30} />
    <div
      style={{
        fontFamily: SANS,
        fontSize: 16,
        color: light ? 'rgba(246,247,250,0.68)' : COLORS.inkSoft,
        display: 'flex',
        gap: 26,
        alignItems: 'center',
      }}
    >
      <span>Home</span>
      <span
        style={{
          padding: '11px 17px',
          border: `1px solid ${light ? 'rgba(255,255,255,0.16)' : COLORS.line}`,
          borderRadius: 999,
          background: light ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.48)',
        }}
      >
        New task
      </span>
    </div>
  </div>
);

const PromptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({frame, fps, config: {damping: 22, stiffness: 90, mass: 0.9}});
  const typedLength = Math.floor(interpolate(frame, [24, 94], [0, PROMPT.length], clamp));
  const caretOpacity = frame % 14 < 8 ? 1 : 0;
  const sendPulse = spring({frame: frame - 96, fps, config: {damping: 12, stiffness: 220}});
  const out = interpolate(frame, [106, 120], [1, 0], clamp);

  return (
    <AbsoluteFill style={{opacity: out, fontFamily: SANS}}>
      <BrandBlobs seed={31} />
      <TopBar />
      <div
        style={{
          position: 'absolute',
          top: 212,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: interpolate(frame, [4, 24], [0, 1], clamp),
          transform: `translateY(${interpolate(entrance, [0, 1], [26, 0])}px)`,
        }}
      >
        <div style={{fontSize: 76, letterSpacing: '-0.055em', fontWeight: 500, color: COLORS.ink}}>
          What can I do for you?
        </div>
        <div style={{fontSize: 20, color: COLORS.inkSoft, marginTop: 18}}>
          Turn an idea into a working experience.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 300,
          left: '50%',
          top: 452,
          transform: `translateX(-50%) translateY(${interpolate(entrance, [0, 1], [40, 0])}px) scale(${interpolate(
            entrance,
            [0, 1],
            [0.975, 1],
          )})`,
          borderRadius: 32,
          background: 'rgba(255,255,255,0.88)',
          border: '1px solid rgba(36,35,31,0.1)',
          boxShadow: '0 28px 95px rgba(48,45,36,0.15), 0 2px 10px rgba(48,45,36,0.06)',
          padding: '42px 46px',
          boxSizing: 'border-box',
          backdropFilter: 'blur(30px)',
        }}
      >
        <div
          style={{
            fontSize: 29,
            lineHeight: 1.48,
            color: COLORS.ink,
            letterSpacing: '-0.018em',
            maxWidth: 1050,
            minHeight: 102,
          }}
        >
          {PROMPT.slice(0, typedLength)}
          <span style={{opacity: typedLength < PROMPT.length ? caretOpacity : 0}}>│</span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 42,
            bottom: 34,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: COLORS.inkSoft,
            fontSize: 16,
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: `1px solid ${COLORS.line}`,
              display: 'grid',
              placeItems: 'center',
              fontSize: 24,
            }}
          >
            +
          </span>
          <span>Attach files</span>
          <span style={{marginLeft: 14, opacity: 0.58}}>Web · Images · Code</span>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 36,
            bottom: 30,
            width: 62,
            height: 62,
            borderRadius: '50%',
            background: COLORS.ink,
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: 30,
            boxShadow: `0 0 ${18 + sendPulse * 34}px rgba(36,35,31,${0.12 + sendPulse * 0.2})`,
            transform: `scale(${1 + sendPulse * 0.14})`,
          }}
        >
          ↑
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 70,
          width: '100%',
          textAlign: 'center',
          color: COLORS.inkSoft,
          fontSize: 14,
          letterSpacing: '0.025em',
        }}
      >
        One prompt. A complete, interactive result.
      </div>
    </AbsoluteFill>
  );
};

const CheckIcon: React.FC<{progress: number}> = ({progress}) => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      background: progress >= 1 ? '#1E8B62' : 'rgba(36,35,31,0.08)',
      color: progress >= 1 ? 'white' : COLORS.inkSoft,
      fontSize: 16,
      transform: `scale(${0.8 + progress * 0.2})`,
    }}
  >
    {progress >= 1 ? '✓' : '·'}
  </div>
);

const AgentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inSpring = spring({frame, fps, config: {damping: 24, stiffness: 105}});
  const opacity = fadeWindow(frame, 0, 15, 118, 135);
  const tasks = [
    'Scaffolding the interactive experience',
    'Applying telemetry HUD and depth rail',
    'Generating bioluminescent visuals',
    'Polishing motion and pressure physics',
  ];
  const overall = interpolate(frame, [15, 112], [0, 1], clamp);

  return (
    <AbsoluteFill style={{opacity, fontFamily: SANS}}>
      <BrandBlobs seed={31} />
      <TopBar />
      <div
        style={{
          position: 'absolute',
          left: 276,
          top: 166,
          width: 1368,
          height: 752,
          borderRadius: 34,
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(36,35,31,0.1)',
          boxShadow: '0 38px 120px rgba(45,43,35,0.16)',
          overflow: 'hidden',
          transform: `translateY(${interpolate(inSpring, [0, 1], [44, 0])}px) scale(${interpolate(
            inSpring,
            [0, 1],
            [0.97, 1],
          )})`,
        }}
      >
        <div style={{position: 'absolute', left: 54, top: 48, right: 520}}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 14px',
              borderRadius: 999,
              background: '#EBF4EF',
              color: '#28745A',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.015em',
            }}
          >
            <span style={{width: 7, height: 7, borderRadius: 99, background: '#31A476'}} />
            AGENT BUILD
          </div>
          <div
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 48,
              marginTop: 24,
              letterSpacing: '-0.045em',
              color: COLORS.ink,
            }}
          >
            Building ABYSSAL
          </div>
          <div style={{fontSize: 18, color: COLORS.inkSoft, marginTop: 10}}>
            From idea to interactive app
          </div>

          <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: 18}}>
            {tasks.map((task, index) => {
              const rowIn = spring({
                frame: frame - (18 + index * 20),
                fps,
                config: {damping: 24, stiffness: 130},
              });
              const done = interpolate(frame, [35 + index * 20, 45 + index * 20], [0, 1], clamp);
              return (
                <div
                  key={task}
                  style={{
                    height: 65,
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 17,
                    padding: '0 18px',
                    background: index === 3 && done < 1 ? '#F4F2EC' : 'rgba(246,245,241,0.75)',
                    border: `1px solid ${COLORS.line}`,
                    opacity: rowIn,
                    transform: `translateX(${interpolate(rowIn, [0, 1], [-18, 0])}px)`,
                  }}
                >
                  <CheckIcon progress={done} />
                  <span style={{fontSize: 18, color: done >= 1 ? COLORS.inkSoft : COLORS.ink}}>{task}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: done >= 1 ? '#28745A' : COLORS.inkSoft,
                      fontFamily: MONO,
                      fontSize: 13,
                    }}
                  >
                    {done >= 1 ? 'DONE' : 'RUNNING'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 34,
            top: 34,
            bottom: 34,
            width: 430,
            borderRadius: 25,
            overflow: 'hidden',
            background: '#061625',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          <Img
            src={staticFile('abyssal/hero-abyssal.png')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.78,
              transform: `scale(${1.06 + overall * 0.06})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(3,19,31,0.02), rgba(1,7,14,0.62) 82%), radial-gradient(circle at 50% 40%, transparent, rgba(0,3,8,0.35))',
            }}
          />
          <div style={{position: 'absolute', left: 28, right: 28, bottom: 28, color: '#EEF8FA'}}>
            <div style={{fontFamily: MONO, fontSize: 11, letterSpacing: '0.26em', opacity: 0.65}}>
              LIVE PREVIEW
            </div>
            <div style={{fontSize: 42, fontWeight: 300, letterSpacing: '0.15em', marginTop: 10}}>
              ABYSSAL
            </div>
            <div
              style={{
                marginTop: 20,
                height: 4,
                borderRadius: 9,
                background: 'rgba(255,255,255,0.12)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${overall * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg,#BFE8F2,#7AF7E8,#C9B7FF)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ArtifactScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 23, stiffness: 100}});
  const zoom = interpolate(frame, [30, 120], [1, 1.28], {
    ...clamp,
    easing: Easing.bezier(0.2, 0.72, 0.2, 1),
  });
  const frameOpacity = interpolate(frame, [0, 10, 104, 120], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{fontFamily: SANS, opacity: frameOpacity, background: COLORS.paper}}>
      <BrandBlobs seed={38} intensity={0.86} />
      <TopBar />
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 122,
          width: 1600,
          height: 858,
          borderRadius: 26,
          background: '#FCFCFB',
          border: '1px solid rgba(36,35,31,0.12)',
          boxShadow: '0 38px 120px rgba(45,43,35,0.18)',
          overflow: 'hidden',
          transform: `translateY(${interpolate(enter, [0, 1], [42, 0])}px) scale(${interpolate(
            enter,
            [0, 1],
            [0.97, 1],
          )})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 285,
            background: '#F3F2EE',
            borderRight: `1px solid ${COLORS.line}`,
            padding: '32px 28px',
            boxSizing: 'border-box',
          }}
        >
          <ManusWordmark size={25} />
          <div
            style={{
              marginTop: 36,
              padding: '13px 14px',
              borderRadius: 12,
              background: COLORS.ink,
              color: 'white',
              fontSize: 15,
            }}
          >
            + &nbsp; New task
          </div>
          {['Home', 'Projects', 'Connectors', 'Skills'].map((label, index) => (
            <div
              key={label}
              style={{
                marginTop: index === 0 ? 26 : 7,
                padding: '11px 13px',
                color: COLORS.inkSoft,
                fontSize: 15,
              }}
            >
              {label}
            </div>
          ))}
          <div style={{marginTop: 34, fontSize: 11, letterSpacing: '0.14em', color: COLORS.inkSoft}}>
            RECENT
          </div>
          <div
            style={{
              marginTop: 13,
              padding: '14px 13px',
              borderRadius: 12,
              background: '#E7E4DC',
              color: COLORS.ink,
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            Build an immersive deep-sea experience
          </div>
        </div>

        <div style={{position: 'absolute', left: 285, top: 0, right: 0, bottom: 0, background: '#FAFAF8'}}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 76,
              borderBottom: `1px solid ${COLORS.line}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 30px',
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div style={{fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: COLORS.ink}}>ABYSSAL</div>
              <div style={{fontSize: 12, color: COLORS.inkSoft, marginTop: 2}}>Interactive web app</div>
            </div>
            <div
              style={{
                marginLeft: 'auto',
                padding: '9px 14px',
                borderRadius: 999,
                background: '#E9F5EE',
                color: '#28745A',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              DEPLOYED
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 35,
              top: 112,
              right: 35,
              bottom: 35,
              borderRadius: 20,
              overflow: 'hidden',
              background: '#071A26',
              border: '1px solid rgba(0,0,0,0.08)',
              transform: `scale(${zoom})`,
              transformOrigin: '50% 48%',
            }}
          >
            <Img
              src={staticFile('abyssal/app-hero-screen.webp')}
              style={{width: '100%', height: '100%', objectFit: 'cover'}}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const marineParticles = Array.from({length: 86}, (_, index) => ({
  x: random(`particle-x-${index}`) * 1920,
  y: random(`particle-y-${index}`) * 1080,
  size: 1 + random(`particle-size-${index}`) * 4,
  speed: 0.28 + random(`particle-speed-${index}`) * 1.2,
  alpha: 0.18 + random(`particle-alpha-${index}`) * 0.52,
}));

const MarineSnow: React.FC<{frame: number; density?: number}> = ({frame, density = 1}) => (
  <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
    {marineParticles.map((particle, index) => {
      const y = (particle.y + frame * particle.speed * 2.4) % 1120 - 20;
      const x = particle.x + Math.sin(frame / (28 + index % 19) + index) * 14;
      return (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: '#DDF5FF',
            opacity: particle.alpha * density,
            boxShadow: `0 0 ${particle.size * 4}px rgba(122,247,232,0.34)`,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

const depthStops = [0, 90, 165, 235, 300, 330];
const depthValues = [0, 700, 2400, 7600, 10935, 10935];

const formatDepth = (depth: number) => Math.round(depth).toLocaleString('en-US');

const getZone = (depth: number) => {
  if (depth >= 6000) return {name: 'HADALPELAGIC', label: 'HADAL ZONE', color: '#C9B7FF'};
  if (depth >= 4000) return {name: 'ABYSSOPELAGIC', label: 'THE ABYSS', color: '#FF9ECF'};
  if (depth >= 1000) return {name: 'BATHYPELAGIC', label: 'MIDNIGHT ZONE', color: '#D9FF7A'};
  if (depth >= 200) return {name: 'MESOPELAGIC', label: 'TWILIGHT ZONE', color: '#7AF7E8'};
  return {name: 'EPIPELAGIC', label: 'SUNLIGHT ZONE', color: '#CFF3FF'};
};

const DepthHUD: React.FC<{depth: number}> = ({depth}) => {
  const pressure = Math.round(1 + depth / 10.06);
  const temp = interpolate(depth, [0, 200, 1000, 4000, 7600, 10935], [26, 17, 4.3, 1.9, 1.7, 2.3], clamp);
  const light = depth < 2 ? '100%' : depth < 200 ? `${Math.max(0.1, 100 * Math.exp(-0.0235 * depth)).toFixed(1)}%` : '0%';
  const zone = getZone(depth);
  return (
    <div
      style={{
        position: 'absolute',
        right: 54,
        top: 50,
        fontFamily: MONO,
        textAlign: 'right',
        color: 'rgba(231,246,250,0.72)',
        fontSize: 17,
        letterSpacing: '0.075em',
        textShadow: '0 0 16px rgba(90,200,255,0.3)',
        zIndex: 30,
      }}
    >
      <div
        style={{
          fontSize: 13,
          letterSpacing: '0.3em',
          color: 'rgba(214,238,246,0.42)',
          borderBottom: '1px solid rgba(160,215,245,0.16)',
          paddingBottom: 10,
          marginBottom: 10,
        }}
      >
        TELEMETRY
      </div>
      {[
        ['DEPTH', `${depth < 1 ? '0' : '−' + formatDepth(depth)} m`],
        ['PRESS', `${pressure.toLocaleString('en-US')} atm`],
        ['TEMP', `${temp.toFixed(1)} °C`],
        ['LIGHT', light],
        ['ZONE', zone.name],
      ].map(([label, value]) => (
        <div key={label} style={{display: 'flex', justifyContent: 'flex-end', gap: 20, lineHeight: 1.95}}>
          <span style={{fontSize: 13, color: 'rgba(214,238,246,0.52)', letterSpacing: '0.18em'}}>{label}</span>
          <b style={{fontWeight: 500, minWidth: 166, color: '#F3FBFC', fontSize: 18}}>{value}</b>
        </div>
      ))}
    </div>
  );
};

const DepthRail: React.FC<{depth: number}> = ({depth}) => {
  const ticks = [0, 200, 1000, 4000, 6000, 10935];
  return (
    <div style={{position: 'absolute', left: 42, top: 90, bottom: 90, width: 120, zIndex: 30}}>
      <div style={{position: 'absolute', left: 8, top: 0, bottom: 0, width: 1, background: 'rgba(190,226,245,0.23)'}} />
      {ticks.map((value) => (
        <div
          key={value}
          style={{
            position: 'absolute',
            left: 1,
            top: `${(value / 10935) * 100}%`,
            width: 17,
            height: 1,
            background: 'rgba(190,226,245,0.5)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 26,
              top: -7,
              color: 'rgba(214,238,246,0.42)',
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {value.toLocaleString('en-US')} m
          </span>
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 4,
          top: `${(depth / 10935) * 100}%`,
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: COLORS.oceanCyan,
          boxShadow: '0 0 14px rgba(122,247,232,0.95),0 0 34px rgba(122,247,232,0.5)',
          transform: 'translateY(-4px)',
        }}
      />
    </div>
  );
};

const SceneCaption: React.FC<{
  eyebrow: string;
  title: string;
  subtitle: string;
  opacity: number;
  align?: 'left' | 'center';
  color?: string;
}> = ({eyebrow, title, subtitle, opacity, align = 'left', color = '#F2FAFC'}) => (
  <div
    style={{
      position: 'absolute',
      left: align === 'left' ? 210 : 0,
      right: align === 'center' ? 0 : 760,
      bottom: align === 'center' ? 140 : 104,
      textAlign: align,
      zIndex: 25,
      opacity,
      color,
      transform: `translateY(${(1 - opacity) * 22}px)`,
    }}
  >
    <div style={{fontFamily: MONO, fontSize: 14, letterSpacing: '0.28em', color: 'rgba(226,243,248,0.62)'}}>
      {eyebrow}
    </div>
    <div
      style={{
        fontFamily: title === 'ABYSSAL' || title === 'CHALLENGER DEEP' ? SANS : SERIF,
        fontSize: title === 'ABYSSAL' ? 98 : title === 'CHALLENGER DEEP' ? 74 : 72,
        fontWeight: title === 'ABYSSAL' ? 300 : 700,
        letterSpacing: title === 'ABYSSAL' ? '0.16em' : '-0.04em',
        marginTop: 16,
        textShadow: '0 0 46px rgba(150,220,250,0.2)',
      }}
    >
      {title}
    </div>
    <div style={{fontFamily: SANS, fontSize: 22, lineHeight: 1.55, color: 'rgba(226,243,248,0.68)', marginTop: 14}}>
      {subtitle}
    </div>
  </div>
);

const DescentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const depth = interpolate(frame, depthStops, depthValues, clamp);
  const heroOpacity = fadeWindow(frame, 0, 10, 72, 104);
  const jellyOpacity = fadeWindow(frame, 74, 102, 144, 173);
  const squidOpacity = fadeWindow(frame, 145, 173, 214, 242);
  const snailOpacity = fadeWindow(frame, 215, 244, 286, 316);
  const finalOpacity = interpolate(frame, [286, 320], [0, 1], clamp);
  const zone = getZone(depth);
  const masterOpacity = interpolate(frame, [0, 8, 319, 330], [0, 1, 1, 0.35], clamp);

  return (
    <AbsoluteFill style={{background: '#01040A', fontFamily: SANS, opacity: masterOpacity}}>
      <Img
        src={staticFile('abyssal/hero-abyssal.png')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: heroOpacity,
          transform: `scale(${1 + frame * 0.00055}) translateY(${frame * -0.035}px)`,
          filter: 'saturate(0.9) contrast(1.02)',
        }}
      />
      <Img
        src={staticFile('generated/comb-jelly-twilight.png')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: jellyOpacity,
          transform: `scale(${1.05 + (frame - 74) * 0.0008}) translateX(${interpolate(
            frame,
            [74, 173],
            [-24, 18],
            clamp,
          )}px)`,
        }}
      />
      <Img
        src={staticFile('generated/giant-squid-midnight.png')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: squidOpacity,
          transform: `scale(${1.04 + (frame - 145) * 0.0011}) translateX(${interpolate(
            frame,
            [145, 242],
            [22, -12],
            clamp,
          )}px)`,
        }}
      />
      <Img
        src={staticFile('generated/hadal-snailfish.png')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: snailOpacity,
          transform: `scale(${1.02 + (frame - 215) * 0.0007}) translateY(${interpolate(
            frame,
            [215, 316],
            [12, -12],
            clamp,
          )}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: finalOpacity,
          background:
            'radial-gradient(ellipse at 50% 36%, rgba(60,42,91,0.28), rgba(0,1,5,0.92) 72%), linear-gradient(#050713,#000104)',
        }}
      />

      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, transparent 22%, rgba(0,1,6,0.65) 110%), linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,1,6,0.34))',
        }}
      />
      <MarineSnow frame={frame} density={interpolate(depth, [0, 200, 1000, 10935], [0.2, 0.65, 1, 0.58], clamp)} />
      <DepthHUD depth={depth} />
      <DepthRail depth={depth} />

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: 4,
          width: `${(depth / 10935) * 100}%`,
          background: 'linear-gradient(90deg,#CFF3FF,#7AF7E8,#D9FF7A,#FF9ECF,#C9B7FF)',
          zIndex: 40,
          boxShadow: `0 0 16px ${zone.color}`,
        }}
      />

      <SceneCaption
        eyebrow="A VERTICAL EXPEDITION"
        title="ABYSSAL"
        subtitle="A live journey to the deepest place on Earth."
        opacity={fadeWindow(frame, 4, 20, 62, 86)}
        align="center"
      />
      <SceneCaption
        eyebrow="SPECIMEN 02 · CTENOPHORA · 700 M"
        title="Twilight"
        subtitle="Light becomes something life makes for itself."
        opacity={fadeWindow(frame, 90, 108, 142, 160)}
      />
      <SceneCaption
        eyebrow="SPECIMEN 04 · ARCHITEUTHIS DUX · 2,400 M"
        title="Midnight"
        subtitle="No sunlight has ever touched this water."
        opacity={fadeWindow(frame, 160, 178, 212, 230)}
      />
      <SceneCaption
        eyebrow="SPECIMEN 06 · PSEUDOLIPARIS · 7,600 M"
        title="Hadal"
        subtitle="Pressure approaching a thousand atmospheres."
        opacity={fadeWindow(frame, 230, 248, 278, 296)}
      />
      <SceneCaption
        eyebrow="MARIANA TRENCH · FULL OCEAN DEPTH"
        title="CHALLENGER DEEP"
        subtitle="— 10,935 M —"
        opacity={interpolate(frame, [296, 319], [0, 1], clamp)}
        align="center"
        color="#EEE9FF"
      />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 34,
          transform: 'translateX(-50%)',
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: '0.28em',
          color: zone.color,
          opacity: depth > 10 ? 0.75 : 0,
          zIndex: 30,
        }}
      >
        {zone.name} · {zone.label}
      </div>
    </AbsoluteFill>
  );
};

const EndCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame: frame - 10, fps, config: {damping: 24, stiffness: 92}});
  const darkOpacity = interpolate(frame, [0, 40], [1, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const lineTwo = spring({frame: frame - 22, fps, config: {damping: 24, stiffness: 100}});

  return (
    <AbsoluteFill style={{fontFamily: SANS, overflow: 'hidden'}}>
      <BrandBlobs seed={47} intensity={0.92} />
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 66,
          opacity: interpolate(frame, [20, 36], [0, 1], clamp),
        }}
      >
        <ManusWordmark size={31} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 250,
          right: 250,
          top: 296,
          textAlign: 'center',
          color: COLORS.ink,
        }}
      >
        <div
          style={{
            fontSize: 68,
            lineHeight: 1.12,
            letterSpacing: '-0.055em',
            fontWeight: 500,
            opacity: reveal,
            transform: `translateY(${interpolate(reveal, [0, 1], [28, 0])}px)`,
          }}
        >
          From one prompt to a world
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 74,
            lineHeight: 1.14,
            letterSpacing: '-0.05em',
            fontWeight: 700,
            marginTop: 6,
            opacity: lineTwo,
            transform: `translateY(${interpolate(lineTwo, [0, 1], [26, 0])}px)`,
          }}
        >
          you can explore.
        </div>
        <div
          style={{
            marginTop: 44,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 22px',
            borderRadius: 999,
            color: 'white',
            background: COLORS.ink,
            fontSize: 17,
            fontWeight: 600,
            opacity: interpolate(frame, [42, 58], [0, 1], clamp),
          }}
        >
          Build with Manus <span style={{fontSize: 20}}>↗</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 48,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 14,
          letterSpacing: '0.14em',
          color: COLORS.inkSoft,
          opacity: interpolate(frame, [48, 66], [0, 1], clamp),
        }}
      >
        MANUS.IM
      </div>

      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 44%, #11172B 0%, #01030A 72%)',
          opacity: darkOpacity,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export const ManusAbyssalCommercial: React.FC = () => {
  return (
    <AbsoluteFill style={{background: '#01030A'}}>
      <Audio
        src={staticFile('audio/manus-abyssal-score.wav')}
        volume={(frame) =>
          interpolate(frame, [0, 20, 650, 715], [0, 0.74, 0.74, 0], clamp)
        }
      />
      <Sequence from={0} durationInFrames={120}>
        <PromptScene />
      </Sequence>
      <Sequence from={105} durationInFrames={135}>
        <AgentScene />
      </Sequence>
      <Sequence from={225} durationInFrames={120}>
        <ArtifactScene />
      </Sequence>
      <Sequence from={330} durationInFrames={330}>
        <DescentScene />
      </Sequence>
      <Sequence from={630} durationInFrames={90}>
        <EndCardScene />
      </Sequence>
    </AbsoluteFill>
  );
};
