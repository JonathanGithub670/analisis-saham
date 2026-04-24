// @ts-nocheck
import React, { useLayoutEffect, useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { GoArrowUpRight } from 'react-icons/go';
import { useThemeSettings } from '@/contexts/ThemeSettingsContext';

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links: { label: string; href: string }[];
};

interface CardNavProps {
  items: CardNavItem[];
  isOpen: boolean;
  ease?: string;
  onCloseComplete?: () => void;
}

const SpotlightCard: React.FC<{
  item: CardNavItem;
  idx: number;
  setCardRef: (i: number) => (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}> = ({ item, idx, setCardRef, children }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { currentPreset } = useThemeSettings();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={(el) => {
        setCardRef(idx)(el);
        (cardRef as any).current = el;
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className="group relative flex flex-col p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-xl border border-white/5 active:scale-[0.98] w-full overflow-hidden"
      style={{ backgroundColor: item.bgColor, color: item.textColor }}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${currentPreset.light}55, transparent 80%)`
        }}
      />
      <div className="relative z-10 flex flex-col h-full">
        {children}
      </div>
    </div>
  );
};

const CardNav: React.FC<CardNavProps> = ({
  items,
  isOpen,
  ease = 'circ.out',
  onCloseComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const onCloseCompleteRef = useRef(onCloseComplete);

  // Sync ref for callback to avoid re-triggering effects
  useEffect(() => {
    onCloseCompleteRef.current = onCloseComplete;
  }, [onCloseComplete]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // Set initial state
    gsap.set(containerRef.current, { height: 0, opacity: 0, marginTop: 0 });
    gsap.set(cardsRef.current, { y: 20, opacity: 0 });

    const tl = gsap.timeline({ 
      paused: true,
      onComplete: () => setIsAnimating(false),
      onReverseComplete: () => {
        setIsAnimating(false);
        if (onCloseCompleteRef.current) onCloseCompleteRef.current();
      }
    });

    // Step 1: Container animation
    tl.to(containerRef.current, {
      height: 'auto',
      opacity: 1,
      marginTop: 20,
      duration: 0.4,
      ease: ease
    });

    // Step 2: Cards stagger entry
    tl.to(cardsRef.current, {
      y: 0,
      opacity: 1,
      duration: 0.4,
      stagger: 0.08,
      ease: ease
    }, '-=0.25');

    tlRef.current = tl;

    return () => {
      tl.kill();
    };
  }, [ease, items]); // Only recreate if items change

  useEffect(() => {
    if (!tlRef.current) return;
    
    setIsAnimating(true);
    if (isOpen) {
      tlRef.current.play();
    } else {
      tlRef.current.reverse();
    }
  }, [isOpen]);

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current[i] = el;
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden w-full ${!isOpen && !isAnimating ? 'invisible' : 'visible'}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6 auto-rows-fr">
        {items.map((item, idx) => (
          <SpotlightCard key={idx} item={item} idx={idx} setCardRef={setCardRef}>
            <div className="flex justify-center items-start mb-8 gap-4">
              <span className="text-xl font-bold tracking-tight whitespace-nowrap text-center">{item.label}</span>
            </div>
            
            <div className="mt-auto flex flex-col gap-2.5">
              {item.links.map((link, lIdx) => (
                <a
                  key={lIdx}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold opacity-70 hover:opacity-100 flex items-center justify-center gap-1.5 no-underline backdrop-blur-sm bg-white/5 py-1.5 px-3 rounded-lg w-full transition-all hover:bg-white/10"
                >
                  {link.label}
                  <GoArrowUpRight className="text-[10px]" />
                </a>
              ))}
            </div>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
};

export default CardNav;
