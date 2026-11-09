import type { Chapter } from "@/lib/syllabus";

type VisualKind = "circuit" | "waves" | "photosynthesis" | "water-cycle" | "quadratic" | "motion" | "steps";

function chooseVisual(topic: string): VisualKind {
  const value = topic.toLowerCase();
  if (/electric|current|circuit|charge|resistance|voltage|magnet/.test(value)) return "circuit";
  if (/wave|light|sound|reflection|refraction|lens|mirror/.test(value)) return "waves";
  if (/photosynth|plant|chlorophyll|respiration/.test(value)) return "photosynthesis";
  if (/water cycle|rain|precipitation|evaporation|monsoon/.test(value)) return "water-cycle";
  if (/quadratic|polynomial|parabola|graph|zeroes|roots/.test(value)) return "quadratic";
  if (/motion|force|velocity|acceleration|newton|gravity|kinetic|energy/.test(value)) return "motion";
  return "steps";
}

function CircuitVisual() {
  return (
    <svg viewBox="0 0 420 150" role="img" aria-label="Animated circuit showing charge flowing from a battery through a bulb">
      <path className="lesson-wire" d="M75 72H155M205 72H345V112H75V72M345 72V32H75V72" />
      <path className="lesson-flow" d="M75 32H345V112H75V32" />
      <g className="lesson-battery"><path d="M55 57v30m12-38v46" /><text x="24" y="119">battery</text></g>
      <g className="lesson-bulb"><circle cx="180" cy="72" r="23" /><path d="M168 91h24m-21 7h18m-15 7h12" /></g>
      <text x="288" y="137">charge flows</text>
    </svg>
  );
}

function WaveVisual() {
  return (
    <svg viewBox="0 0 420 150" role="img" aria-label="Animated wave showing a repeating crest and trough">
      <path className="lesson-axis" d="M28 76H396M34 25V128" />
      <path className="lesson-wave" d="M35 76 C62 18 88 18 115 76 S168 134 195 76 S248 18 275 76 S328 134 355 76 S382 36 395 55" />
      <circle className="lesson-wave-dot" r="6"><animateMotion dur="4s" repeatCount="indefinite" path="M35 76 C62 18 88 18 115 76 S168 134 195 76 S248 18 275 76 S328 134 355 76 S382 36 395 55" /></circle>
      <text x="68" y="25">crest</text><text x="145" y="137">trough</text><text x="312" y="25">energy travels</text>
    </svg>
  );
}

function PhotosynthesisVisual() {
  return (
    <svg viewBox="0 0 420 150" role="img" aria-label="Animated photosynthesis diagram: sunlight, water and carbon dioxide help a leaf make glucose and oxygen">
      <circle className="lesson-sun" cx="60" cy="46" r="20" />
      <path className="lesson-ray" d="M83 50l52 18m-58-8 48 34" />
      <path className="lesson-leaf" d="M172 88c8-43 49-61 84-43-4 38-35 63-84 43Zm4-2 57-34" />
      <path className="lesson-arrow" d="M120 114h52m93 0h46" />
      <text x="25" y="105">sunlight</text><text x="126" y="138">CO₂ + water</text>
      <text x="295" y="104">glucose + O₂</text>
      <circle className="lesson-bubble bubble-one" cx="325" cy="43" r="5" /><circle className="lesson-bubble bubble-two" cx="348" cy="61" r="4" />
    </svg>
  );
}

function WaterCycleVisual() {
  return (
    <svg viewBox="0 0 420 150" role="img" aria-label="Animated water cycle showing evaporation, condensation and rainfall">
      <circle className="lesson-sun" cx="65" cy="36" r="19" />
      <path className="lesson-cloud" d="M196 49a21 21 0 0 1 40-6 24 24 0 0 1 38 18h-95a18 18 0 0 1 17-12Z" />
      <path className="lesson-water" d="M38 112c31-10 61 10 92 0s61 10 92 0" />
      <path className="lesson-evaporate" d="M82 99V63m22 36V54m22 45V68" />
      <path className="lesson-rain" d="M220 77l-8 17m27-17-8 17m27-17-8 17" />
      <text x="42" y="139">evaporation</text><text x="184" y="124">rainfall</text><text x="295" y="49">clouds form</text>
    </svg>
  );
}

function QuadraticVisual() {
  return (
    <svg viewBox="0 0 420 150" role="img" aria-label="Animated parabola on coordinate axes, showing how a quadratic graph meets the x axis at its roots">
      <path className="lesson-axis" d="M48 122V20M30 100H394" />
      <path className="lesson-parabola" d="M85 35Q210 168 335 35" />
      <circle className="lesson-root root-one" cx="132" cy="100" r="6" /><circle className="lesson-root root-two" cx="288" cy="100" r="6" />
      <text x="116" y="122">root</text><text x="272" y="122">root</text><text x="55" y="25">y</text><text x="385" y="96">x</text>
    </svg>
  );
}

function MotionVisual() {
  return (
    <svg viewBox="0 0 420 150" role="img" aria-label="Animated object moving along a path, with velocity and acceleration arrows">
      <path className="lesson-ground" d="M30 108H390" />
      <path className="lesson-vector" d="M128 78h113m-12-10 12 10-12 10" />
      <path className="lesson-vector vector-second" d="M228 49h74m-12-10 12 10-12 10" />
      <g className="lesson-moving-object"><rect x="45" y="78" width="55" height="29" rx="7" /><circle cx="58" cy="111" r="6" /><circle cx="88" cy="111" r="6" /></g>
      <text x="154" y="69">velocity</text><text x="236" y="39">acceleration</text>
    </svg>
  );
}

function StepsVisual({ labels }: { labels: string[] }) {
  return (
    <div className="lesson-steps" role="img" aria-label={`Animated concept sequence: ${labels.join(", then ")}`}>
      {labels.map((label, index) => (
        <div key={`${label}-${index}`} className="lesson-step" style={{ animationDelay: `${index * 0.55}s` }}>
          <span>{index + 1}</span><strong>{label}</strong>
          {index < labels.length - 1 ? <i aria-hidden="true">→</i> : null}
        </div>
      ))}
    </div>
  );
}

export default function LessonVisual({ chapter, prompt }: { chapter: Chapter; prompt: string }) {
  const kind = chooseVisual(`${chapter.name} ${prompt}`);
  const labels = chapter.topics.slice(0, 3).map((topic) => topic.length > 27 ? `${topic.slice(0, 25)}…` : topic);
  const title: Record<VisualKind, string> = {
    circuit: "See the idea · Electric current",
    waves: "See the idea · Waves",
    photosynthesis: "See the idea · Photosynthesis",
    "water-cycle": "See the idea · Water cycle",
    quadratic: "See the idea · Quadratic graph",
    motion: "See the idea · Motion",
    steps: `See the idea · ${chapter.name}`,
  };

  return (
    <figure className="lesson-visual" aria-label={title[kind]}>
      <figcaption>{title[kind]}</figcaption>
      <div className="lesson-visual-stage">
        {kind === "circuit" ? <CircuitVisual /> : null}
        {kind === "waves" ? <WaveVisual /> : null}
        {kind === "photosynthesis" ? <PhotosynthesisVisual /> : null}
        {kind === "water-cycle" ? <WaterCycleVisual /> : null}
        {kind === "quadratic" ? <QuadraticVisual /> : null}
        {kind === "motion" ? <MotionVisual /> : null}
        {kind === "steps" ? <StepsVisual labels={labels.length ? labels : [chapter.name, "Key idea", "Example"]} /> : null}
      </div>
    </figure>
  );
}

