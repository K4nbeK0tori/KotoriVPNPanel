import { useSakura } from '@/hooks/useSakura';

const PETAL_COUNT = 12;

export default function SakuraLayer() {
  const [enabled] = useSakura();
  if (!enabled) return null;
  return (
    <div className="sakura" aria-hidden="true">
      {Array.from({ length: PETAL_COUNT }, (_, i) => (
        <span key={i} className="sakura-petal" />
      ))}
    </div>
  );
}
