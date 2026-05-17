import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const STORAGE_KEY = 'cyberdeck-picker-positions';
const TILE_SIZE = 96;
const GAP = 20;
const COLUMNS = 4;
const MARGIN = 80;
const DRAG_THRESHOLD = 3;

const Container = styled.div`
  flex: 1;
  background: #000;
  position: relative;
  overflow: hidden;
  cursor: default;
`;

const Tile = styled.div`
  position: absolute;
  width: ${TILE_SIZE}px;
  height: ${TILE_SIZE}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji',
    'Twemoji Mozilla', 'EmojiOne Color', 'Android Emoji', sans-serif;
  border-radius: 12px;
  user-select: none;
  background: ${(p) => (p.$dragging ? 'rgba(255,255,255,0.12)' : 'transparent')};
  border: 1px solid
    ${(p) => (p.$dragging ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.08)')};
  cursor: ${(p) => (p.$dragging ? 'grabbing' : 'grab')};
  transition: background 0.12s ease, border-color 0.12s ease;
  touch-action: none;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

function defaultPositions(items) {
  const stride = TILE_SIZE + GAP;
  return items.reduce((acc, item, i) => {
    acc[item.key] = {
      x: MARGIN + (i % COLUMNS) * stride,
      y: MARGIN + Math.floor(i / COLUMNS) * stride,
    };
    return acc;
  }, {});
}

function loadPositions(items) {
  const defaults = defaultPositions(items);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    for (const key of Object.keys(saved)) {
      if (
        defaults[key] &&
        typeof saved[key]?.x === 'number' &&
        typeof saved[key]?.y === 'number'
      ) {
        defaults[key] = saved[key];
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

function Picker({ items, onOpen }) {
  const [positions, setPositions] = useState(() => loadPositions(items));
  const [draggingKey, setDraggingKey] = useState(null);
  const dragState = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // ignore quota / private-mode failures
    }
  }, [positions]);

  const handleMouseDown = (e, key) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = positions[key];
    dragState.current = {
      key,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };

    const onMove = (ev) => {
      const s = dragState.current;
      if (!s) return;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;
      if (!s.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        s.moved = true;
        setDraggingKey(s.key);
      }
      if (s.moved) {
        setPositions((prev) => ({
          ...prev,
          [s.key]: { x: s.origX + dx, y: s.origY + dy },
        }));
      }
    };

    const onUp = () => {
      dragState.current = null;
      setDraggingKey(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <Container>
      {items.map((item) => {
        const pos = positions[item.key] || { x: MARGIN, y: MARGIN };
        return (
          <Tile
            key={item.key}
            $dragging={draggingKey === item.key}
            title={item.label}
            style={{ left: pos.x, top: pos.y }}
            onMouseDown={(e) => handleMouseDown(e, item.key)}
            onDoubleClick={() => onOpen(item.key)}
          >
            {item.emoji}
          </Tile>
        );
      })}
    </Container>
  );
}

export default Picker;
