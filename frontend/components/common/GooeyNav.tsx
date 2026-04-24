"use client";

import { useRef, useEffect, useState, useCallback } from "react";

export interface GooeyNavItem {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  icon?: React.ReactNode;
  /** If true, this item acts as a toggle — clicking it again is allowed and it deactivates after animation */
  isToggle?: boolean;
  /** If true, show a rounded border outline (like minimals.cc Sign In button) */
  bordered?: boolean;
}

interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
  className?: string;
}

export default function GooeyNav({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = -1,
  className = "",
}: GooeyNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = useCallback(
    (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
      const angle =
        ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
      return [distance * Math.cos(angle), distance * Math.sin(angle)];
    },
    []
  );

  const createParticle = useCallback(
    (i: number, t: number, d: [number, number], r: number) => {
      const rotate = noise(r / 10);
      return {
        start: getXY(d[0], particleCount - i, particleCount),
        end: getXY(d[1] + noise(7), particleCount - i, particleCount),
        time: t,
        scale: 1 + noise(0.2),
        color: colors[Math.floor(Math.random() * colors.length)],
        rotate:
          rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
      };
    },
    [getXY, particleCount, colors]
  );

  const makeParticles = useCallback(
    (element: HTMLElement) => {
      const d = particleDistances;
      const r = particleR;
      const bubbleTime = animationTime * 2 + timeVariance;
      element.style.setProperty("--time", `${bubbleTime}ms`);

      for (let i = 0; i < particleCount; i++) {
        const t = animationTime * 2 + noise(timeVariance * 2);
        const p = createParticle(i, t, d, r);
        element.classList.remove("active");

        setTimeout(() => {
          const particle = document.createElement("span");
          const point = document.createElement("span");
          particle.classList.add("gooey-particle");
          particle.style.setProperty("--start-x", `${p.start[0]}px`);
          particle.style.setProperty("--start-y", `${p.start[1]}px`);
          particle.style.setProperty("--end-x", `${p.end[0]}px`);
          particle.style.setProperty("--end-y", `${p.end[1]}px`);
          particle.style.setProperty("--time", `${p.time}ms`);
          particle.style.setProperty("--scale", `${p.scale}`);
          particle.style.setProperty(
            "--color",
            `var(--gooey-color-${p.color}, white)`
          );
          particle.style.setProperty("--rotate", `${p.rotate}deg`);

          point.classList.add("gooey-point");
          particle.appendChild(point);
          element.appendChild(particle);
          requestAnimationFrame(() => {
            element.classList.add("active");
          });
          setTimeout(() => {
            try {
              element.removeChild(particle);
            } catch {
              // particle already removed
            }
          }, t);
        }, 30);
      }
    },
    [animationTime, particleCount, particleDistances, particleR, timeVariance, createParticle]
  );

  const updateEffectPosition = useCallback(
    (element: HTMLElement) => {
      if (!containerRef.current || !filterRef.current || !textRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const pos = element.getBoundingClientRect();

      const styles = {
        left: `${pos.x - containerRect.x}px`,
        top: `${pos.y - containerRect.y}px`,
        width: `${pos.width}px`,
        height: `${pos.height}px`,
      };
      Object.assign(filterRef.current.style, styles);
      Object.assign(textRef.current.style, styles);
      textRef.current.innerText = element.innerText;
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      const liEl = e.currentTarget as HTMLElement;
      const item = items[index];
      const isToggle = item.isToggle ?? false;

      // For non-toggle items, skip if already active
      if (activeIndex === index && !isToggle) return;

      setActiveIndex(index);
      updateEffectPosition(liEl);

      if (filterRef.current) {
        const particles = filterRef.current.querySelectorAll(".gooey-particle");
        particles.forEach((p) => filterRef.current!.removeChild(p));
      }

      if (textRef.current) {
        textRef.current.classList.remove("active");
        void (textRef.current as HTMLElement).offsetWidth;
        textRef.current.classList.add("active");
      }

      if (filterRef.current) {
        makeParticles(filterRef.current);
      }

      // Trigger the item's onClick or navigate
      if (isToggle) {
        // Toggle items fire immediately and deactivate after animation
        if (item.onClick) {
          item.onClick(e);
        }
        setTimeout(() => {
          setActiveIndex(-1);
        }, 800);
      } else {
        // Non-toggle items wait for animation to finish before navigating
        const navigate = () => {
          if (item.onClick) {
            item.onClick(e);
          } else if (item.href) {
            window.location.href = item.href;
          }
        };
        setTimeout(navigate, animationTime);
      }
    },
    [activeIndex, items, animationTime, makeParticles, updateEffectPosition]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const liEl = e.currentTarget.parentElement;
        if (liEl) {
          handleClick(
            { currentTarget: liEl } as unknown as React.MouseEvent,
            index
          );
        }
      }
    },
    [handleClick]
  );

  useEffect(() => {
    if (activeIndex < 0 || !navRef.current || !containerRef.current) return;
    const activeLi = navRef.current.querySelectorAll("li")[activeIndex];
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add("active");
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll("li")[activeIndex];
      if (currentActiveLi) {
        updateEffectPosition(currentActiveLi);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex, updateEffectPosition]);

  return (
    <div className={`gooey-container ${className}`} ref={containerRef}>
      <nav>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li
              key={index}
              className={`${activeIndex === index ? "active" : ""} ${items[index].bordered ? "bordered" : ""}`}
              onClick={(e) => handleClick(e, index)}
            >
              <a
                href={item.href || "#"}
                onClick={(e) => e.preventDefault()}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={0}
              >
                {item.icon && <span className="gooey-icon">{item.icon}</span>}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="gooey-effect gooey-filter" ref={filterRef} />
      <span className="gooey-effect gooey-text" ref={textRef} />
    </div>
  );
}
