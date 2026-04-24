"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  content: string;
  example?: string;
}

export function InfoTooltip({ content, example }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const onEnter = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  }, []);

  const onLeave = useCallback(() => setPos(null), []);

  return (
    <span className="inline-flex items-center ml-1">
      <button
        ref={btnRef}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="text-gray-400 hover:text-gray-500 transition-colors"
        aria-label="More info"
      >
        <svg width="13" height="13" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1" fill="none" />
          <text x="7" y="11" textAnchor="middle" fontSize="9" fontWeight="600" fill="currentColor">i</text>
        </svg>
      </button>

      {pos && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg px-3 py-2.5 shadow-xl pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, calc(-100% - 8px))",
            width: 200,
            fontSize: 11,
            lineHeight: "1.5",
            whiteSpace: "normal",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          <p className="text-gray-100">{content}</p>
          {example && <p className="mt-1 text-gray-400">{example}</p>}
          <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  );
}
