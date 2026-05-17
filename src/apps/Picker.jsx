import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 96px);
  grid-auto-rows: 96px;
  gap: 20px;
`;

const Tile = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  background: ${(p) =>
    p.$selected ? 'rgba(255,255,255,0.08)' : 'transparent'};
  border: 1px solid
    ${(p) => (p.$selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.08)')};
  transition: background 0.12s ease, border-color 0.12s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

function Picker({ items, onOpen, columns = 4 }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        setSelected((s) => Math.min(items.length - 1, s + 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(items.length - 1, s + columns));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - columns));
      } else if (e.code === 'Enter') {
        e.preventDefault();
        onOpen(items[selected].key);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [items, selected, onOpen, columns]);

  return (
    <Container>
      <Grid style={{ gridTemplateColumns: `repeat(${columns}, 96px)` }}>
        {items.map((item, i) => (
          <Tile
            key={item.key}
            $selected={i === selected}
            title={item.label}
            onClick={() => setSelected(i)}
            onDoubleClick={() => onOpen(item.key)}
          >
            {item.emoji}
          </Tile>
        ))}
      </Grid>
    </Container>
  );
}

export default Picker;
