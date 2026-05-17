import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const STORAGE_KEY = 'cyberdeck-picker-positions';
const TILE_WIDTH = 96;
const COL_STRIDE = 116;
const ROW_STRIDE = 104;
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
  width: ${TILE_WIDTH}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  user-select: none;
  cursor: ${(p) => (p.$dragging ? 'grabbing' : 'grab')};
  touch-action: none;
`;

const Icon = styled.img`
  width: 56px;
  height: 56px;
  pointer-events: none;
  -webkit-user-drag: none;
`;

const Label = styled.div`
  font-size: 12px;
  line-height: 1.2;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  text-align: center;
  background: ${(p) => (p.$selected ? '#fff' : 'transparent')};
  color: ${(p) => (p.$selected ? '#000' : '#fff')};
`;

function defaultPositions(items) {
  return items.reduce((acc, item, i) => {
    acc[item.key] = {
      x: MARGIN + (i % COLUMNS) * COL_STRIDE,
      y: MARGIN + Math.floor(i / COLUMNS) * ROW_STRIDE,
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
  const [selectedKey, setSelectedKey] = useState(null);
  const [draggingKey, setDraggingKey] = useState(null);
  const dragState = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // ignore quota / private-mode failures
    }
  }, [positions]);

  const handleTileMouseDown = (e, key) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedKey(key);

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
    <Container onMouseDown={() => setSelectedKey(null)}>
      {items.map((item) => {
        const pos = positions[item.key] || { x: MARGIN, y: MARGIN };
        return (
          <Tile
            key={item.key}
            $dragging={draggingKey === item.key}
            style={{ left: pos.x, top: pos.y }}
            onMouseDown={(e) => handleTileMouseDown(e, item.key)}
            onDoubleClick={() => onOpen(item.key)}
          >
            <Icon src={item.icon} alt="" draggable={false} />
            <Label $selected={selectedKey === item.key}>{item.label}</Label>
          </Tile>
        );
      })}
    </Container>
  );
}

export default Picker;
