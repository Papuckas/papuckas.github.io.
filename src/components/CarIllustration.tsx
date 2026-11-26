import React from 'react';
import { BodyType } from '../types/game';

interface CarIllustrationProps {
  bodyType: BodyType;
  accentColor: string;
  className?: string;
}

export const CarIllustration: React.FC<CarIllustrationProps> = ({
  bodyType,
  accentColor,
  className = '',
}) => {
  const isHighRide = bodyType === 'SUV' || bodyType === 'Pickup';
  const wheelY = isHighRide ? 70 : 71;
  const wheelR = isHighRide ? 13.5 : 12.2;
  const frontWheelX = bodyType === 'Pickup' ? 168 : 165;
  const rearWheelX = bodyType === 'Pickup' ? 58 : 61;

  const renderSilhouette = () => {
    switch (bodyType) {
      case 'Combi':
        return (
          <>
            {/* Long estate roofline + D-pillar wagon silhouette */}
            <path
              d="M22 69 L24 48 L32 34 L122 33 L156 48 L198 52 L203 66 L196 70 L22 70 Z"
              fill={accentColor}
              fillOpacity="0.94"
            />
            {/* Roof rails */}
            <path
              d="M36 31.5 L118 30.8"
              stroke="#94A3B8"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Side glass (front, rear, cargo D-pillar window) */}
            <path
              d="M34 48 L39 36 L68 36 L68 49 Z"
              fill="#0B1120"
              fillOpacity="0.9"
            />
            <path
              d="M72 49 L72 36 L118 36 L146 49 Z"
              fill="#0B1120"
              fillOpacity="0.9"
            />
            {/* B/C-pillar divider */}
            <line x1="100" y1="36" x2="100" y2="49" stroke={accentColor} strokeWidth="2.5" />
            {/* Taillight & Headlight */}
            <rect x="23" y="51" width="6" height="4.5" rx="1" fill="#EF4444" />
            <path d="M192 54 L202 56 L199 60 L190 58 Z" fill="#F8FAFC" fillOpacity="0.9" />
            {/* Beltline crease */}
            <line x1="30" y1="56" x2="190" y2="57" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
          </>
        );

      case 'SUV':
        return (
          <>
            {/* Tall boxy 4x4 SUV body with wheel arch cladding */}
            <path
              d="M21 66 L23 32 L130 30 L158 45 L199 49 L204 65 L195 68 L21 68 Z"
              fill={accentColor}
              fillOpacity="0.94"
            />
            {/* Roof rack */}
            <path d="M30 28.5 L124 27.5" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
            {/* Side windows */}
            <path d="M31 46 L34 34 L65 34 L65 46 Z" fill="#0B1120" fillOpacity="0.9" />
            <path d="M69 46 L69 34 L125 33 L149 46 Z" fill="#0B1120" fillOpacity="0.9" />
            <line x1="98" y1="34" x2="98" y2="46" stroke={accentColor} strokeWidth="2.6" />
            {/* Lower black cladding / skid plate */}
            <path d="M22 63 L200 63 L197 68 L22 68 Z" fill="#0F172A" fillOpacity="0.75" />
            {/* Spare wheel hint on rear tailgate */}
            <rect x="17" y="40" width="5" height="17" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="0.8" />
            {/* Headlight & Taillight */}
            <rect x="23" y="48" width="5" height="6" rx="1" fill="#EF4444" />
            <rect x="193" y="51" width="9" height="4.5" rx="1" fill="#F8FAFC" fillOpacity="0.9" />
          </>
        );

      case 'Supercar':
        return (
          <>
            {/* Low mid-engine wedge silhouette */}
            <path
              d="M18 69 L25 54 L46 49 L76 38 L124 37 L160 49 L204 56 L208 67 L197 71 L18 71 Z"
              fill={accentColor}
              fillOpacity="0.95"
            />
            {/* Sleek canopy glass */}
            <path
              d="M72 49 L81 40 L122 39.5 L151 50 Z"
              fill="#090F1D"
              fillOpacity="0.92"
            />
            {/* Side aero intake scoop */}
            <path d="M96 54 L120 51 L117 65 L93 64 Z" fill="#0F172A" fillOpacity="0.75" />
            {/* Integrated rear lip spoiler + front splitter */}
            <path d="M18 52 L32 50 L28 55 L19 55 Z" fill="#1E293B" />
            <path d="M184 68 L209 68 L206 71 L184 71 Z" fill="#0F172A" />
            {/* LED blade headlight & taillight */}
            <rect x="21" y="56" width="8" height="3" rx="1" fill="#EF4444" />
            <path d="M190 57 L204 59 L200 62 L188 60 Z" fill="#F8FAFC" fillOpacity="0.95" />
            <line x1="34" y1="53" x2="188" y2="57" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
          </>
        );

      case 'Track':
        return (
          <>
            {/* Extreme GT / prototype race profile with swan-neck wing & splitter */}
            <path
              d="M22 69 L28 53 L50 48 L78 37 L124 36 L158 49 L204 55 L210 67 L198 71 L22 71 Z"
              fill={accentColor}
              fillOpacity="0.95"
            />
            {/* Swan-neck GT rear wing */}
            <path d="M12 37 L38 35 L35 40 L14 41 Z" fill="#0F172A" stroke="#64748B" strokeWidth="0.9" />
            <line x1="28" y1="40" x2="31" y2="51" stroke="#334155" strokeWidth="2.2" />
            {/* Front carbon splitter */}
            <path d="M188 68 L213 68 L211 71.5 L188 71.5 Z" fill="#0F172A" />
            {/* Cockpit canopy */}
            <path d="M76 48 L83 39 L121 38.5 L149 49 Z" fill="#090F1D" fillOpacity="0.92" />
            {/* Racing number plate & side vent */}
            <rect x="92" y="53" width="22" height="11" rx="1.5" fill="#F8FAFC" fillOpacity="0.88" />
            <rect x="96" y="56" width="14" height="2" fill="#0F172A" />
            <rect x="96" y="60" width="9" height="2" fill="#0F172A" />
            <path d="M192 56 L205 58 L201 61 L190 59 Z" fill="#FACC15" fillOpacity="0.92" />
          </>
        );

      case 'Hatchback':
        return (
          <>
            {/* Compact 2-box hot hatch */}
            <path
              d="M28 70 L32 45 L46 35 L122 35 L154 49 L194 54 L198 69 L188 71 L28 71 Z"
              fill={accentColor}
              fillOpacity="0.94"
            />
            {/* Roof hatch spoiler */}
            <path d="M27 36 L44 34 L43 39 L29 40 Z" fill="#0F172A" />
            {/* Windows */}
            <path d="M40 48 L48 38 L85 38 L85 49 Z" fill="#0B1120" fillOpacity="0.9" />
            <path d="M89 49 L89 38 L120 38 L145 49 Z" fill="#0B1120" fillOpacity="0.9" />
            {/* Lights & crease */}
            <rect x="29" y="51" width="6" height="5" rx="1" fill="#EF4444" />
            <path d="M186 55 L196 57 L194 61 L184 59 Z" fill="#F8FAFC" fillOpacity="0.9" />
            <line x1="38" y1="56" x2="184" y2="57" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
          </>
        );

      case 'Pickup':
        return (
          <>
            {/* Open-bed 4x4 truck */}
            <path
              d="M18 66 L18 47 L88 47 L96 32 L148 32 L168 47 L203 50 L205 66 L195 68 L18 68 Z"
              fill={accentColor}
              fillOpacity="0.94"
            />
            {/* Roll bar in pickup bed */}
            <path d="M74 47 L88 33 L95 33 L84 47" fill="none" stroke="#334155" strokeWidth="2.5" />
            {/* Cab glass */}
            <path d="M98 46 L101 35 L144 35 L161 46 Z" fill="#0B1120" fillOpacity="0.9" />
            <line x1="122" y1="35" x2="122" y2="46" stroke={accentColor} strokeWidth="2.4" />
            {/* Heavy bumper & lights */}
            <path d="M18 63 L204 63 L202 68 L18 68 Z" fill="#0F172A" fillOpacity="0.7" />
            <rect x="19" y="49" width="4.5" height="7" rx="1" fill="#EF4444" />
            <rect x="195" y="52" width="8" height="5" rx="1" fill="#F8FAFC" fillOpacity="0.9" />
          </>
        );

      case 'Rally':
        return (
          <>
            {/* Aggressive rally sedan/hatch with WRC wing, hood scoop & mudflaps */}
            <path
              d="M24 68 L30 48 L56 47 L74 35 L126 35 L158 49 L198 53 L201 67 L193 69 L24 69 Z"
              fill={accentColor}
              fillOpacity="0.94"
            />
            {/* Large WRC rear wing */}
            <path d="M21 37 L42 36 L40 47 L33 47 L33 41 L22 41 Z" fill="#0F172A" />
            {/* Hood intake scoop */}
            <path d="M162 47 L176 48 L176 51 L160 50 Z" fill="#0F172A" />
            {/* Windows */}
            <path d="M62 48 L76 38 L123 38 L148 49 Z" fill="#0B1120" fillOpacity="0.9" />
            <line x1="100" y1="38" x2="100" y2="49" stroke={accentColor} strokeWidth="2.4" />
            {/* Mudflaps behind wheels */}
            <rect x="43" y="68" width="4" height="9" fill="#EF4444" />
            <rect x="145" y="68" width="4" height="9" fill="#EF4444" />
            {/* Lights */}
            <rect x="26" y="51" width="6" height="4.5" rx="1" fill="#EF4444" />
            <path d="M190 54 L200 56 L198 60 L188 58 Z" fill="#F8FAFC" fillOpacity="0.92" />
          </>
        );

      case 'Sedan':
        return (
          <>
            {/* Classic 3-box notchback sedan */}
            <path
              d="M22 69 L27 52 L56 49 L76 35 L130 35 L159 49 L198 53 L201 68 L192 70 L22 70 Z"
              fill={accentColor}
              fillOpacity="0.94"
            />
            {/* Front & rear side windows */}
            <path d="M64 49 L79 38 L101 38 L101 49 Z" fill="#0B1120" fillOpacity="0.9" />
            <path d="M105 49 L105 38 L127 38 L150 49 Z" fill="#0B1120" fillOpacity="0.9" />
            {/* Lights & beltline */}
            <rect x="23" y="53" width="7" height="4" rx="1" fill="#EF4444" />
            <path d="M189 55 L199 57 L197 60 L187 59 Z" fill="#F8FAFC" fillOpacity="0.9" />
            <line x1="34" y1="56" x2="186" y2="57" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
          </>
        );

      case 'Coupe':
      default:
        return (
          <>
            {/* Sleek 2-door fastback coupé */}
            <path
              d="M22 69 L29 52 L56 48 L84 35 L128 35 L161 49 L199 54 L202 68 L193 70 L22 70 Z"
              fill={accentColor}
              fillOpacity="0.94"
            />
            {/* Fastback side glass */}
            <path d="M66 48 L86 38 L125 38 L152 49 Z" fill="#0B1120" fillOpacity="0.9" />
            <line x1="108" y1="38" x2="112" y2="49" stroke={accentColor} strokeWidth="2.2" />
            {/* Lights & shoulder crease */}
            <rect x="24" y="53" width="7" height="4" rx="1" fill="#EF4444" />
            <path d="M190 56 L200 58 L198 61 L188 59 Z" fill="#F8FAFC" fillOpacity="0.92" />
            <line x1="36" y1="56" x2="188" y2="58" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          </>
        );
    }
  };

  const renderWheel = (cx: number) => (
    <g key={cx}>
      {/* Wheel well shadow */}
      <circle cx={cx} cy={wheelY} r={wheelR + 2.5} fill="#05080F" />
      {/* Tire */}
      <circle cx={cx} cy={wheelY} r={wheelR} fill="#0B101B" stroke="#334155" strokeWidth="2" />
      {/* Alloy rim */}
      <circle cx={cx} cy={wheelY} r={wheelR * 0.58} fill="#1E293B" stroke="#94A3B8" strokeWidth="1.2" />
      {/* Spokes */}
      <line x1={cx - wheelR * 0.45} y1={wheelY} x2={cx + wheelR * 0.45} y2={wheelY} stroke="#CBD5E1" strokeWidth="1.1" />
      <line x1={cx} y1={wheelY - wheelR * 0.45} x2={cx} y2={wheelY + wheelR * 0.45} stroke="#CBD5E1" strokeWidth="1.1" />
      <circle cx={cx} cy={wheelY} r={2.1} fill="#E2E8F0" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 224 94"
      className={`w-full h-full select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`ground-${bodyType}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(148,163,184,0)" />
          <stop offset="50%" stopColor="rgba(148,163,184,0.26)" />
          <stop offset="100%" stopColor="rgba(148,163,184,0)" />
        </linearGradient>
      </defs>
      {/* Ground line */}
      <rect x="12" y="83" width="200" height="1.5" fill={`url(#ground-${bodyType})`} />
      {/* Chassis */}
      {renderSilhouette()}
      {/* Front & Rear Wheels */}
      {renderWheel(rearWheelX)}
      {renderWheel(frontWheelX)}
    </svg>
  );
};
