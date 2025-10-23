import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 15px;
`;

const EncoderSection = styled.div`
  background: #0f0f0f;
  border-radius: 8px;
  padding: 20px;
`;

const ComponentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
`;

const Component = styled.div`
  background: #000;
  border-radius: 4px;
  padding: 15px;
  text-align: center;
`;

const ComponentLabel = styled.div`
  color: #aaa;
  font-size: 14px;
  margin-bottom: 10px;
  text-transform: uppercase;
`;

const ComponentValue = styled.div`
  color: ${(props) => (props.active ? '#fff' : '#666')};
  font-size: 32px;
  font-weight: bold;
  margin: 10px 0;
`;

const ComponentState = styled.div`
  color: #888;
  font-size: 12px;
  margin-top: 5px;
`;

const EncoderValue = styled.div`
  color: #fff;
  font-size: 48px;
  font-weight: bold;
  margin: 10px 0;
`;

const EncoderDirection = styled.div`
  color: #aaa;
  font-size: 14px;
  margin-top: 5px;
`;

const SwitchComponent = styled(Component)``;

const SwitchLabel = styled(ComponentLabel)`
  color: ${(props) => {
    if (props.color === 'red') return '#ff0000';
    if (props.color === 'green') return '#00ff00';
    if (props.color === 'blue') return '#0080ff';
    return '#aaa';
  }};
`;

const SwitchValue = styled(ComponentValue)`
  color: ${(props) => {
    if (props.active) {
      if (props.color === 'red') return '#ff0000';
      if (props.color === 'green') return '#00ff00';
      if (props.color === 'blue') return '#0080ff';
    }
    return '#666';
  }};
`;

function Debug({ hardwareData }) {
  const { key, switches, encoders } = hardwareData;

  const getKeyStatus = (active) => {
    if (active === null) return 'UNKNOWN';
    return active ? 'ACTIVE' : 'INACTIVE';
  };

  const getSwitchStatus = (active) => {
    if (active === null) return 'UNKNOWN';
    return active ? 'ACTIVE' : 'INACTIVE';
  };

  return (
    <Container>
      <TopRow>
        {['red', 'green', 'blue'].map((color) => (
          <SwitchComponent
            key={color}
            active={switches[color].active}
            color={color}>
            <SwitchLabel color={color}>{color}</SwitchLabel>
            <SwitchValue active={switches[color].active} color={color}>
              {switches[color].active === null
                ? '?'
                : switches[color].active
                ? '●'
                : '○'}
            </SwitchValue>
            <ComponentState>
              {getSwitchStatus(switches[color].active)}
            </ComponentState>
          </SwitchComponent>
        ))}
        <Component active={key.active}>
          <ComponentLabel>Key</ComponentLabel>
          <ComponentValue active={key.active}>
            {key.active === null ? '?' : key.active ? '●' : '○'}
          </ComponentValue>
          <ComponentState>{getKeyStatus(key.active)}</ComponentState>
        </Component>
      </TopRow>

      <EncoderSection>
        <ComponentGrid>
          {[1, 2, 3, 4].map((id) => (
            <Component key={id} active={true}>
              <ComponentLabel>Encoder {id}</ComponentLabel>
              <EncoderValue>{encoders[id].value}</EncoderValue>
              <EncoderDirection>
                {encoders[id].direction === 'right'
                  ? '→ CLOCKWISE'
                  : encoders[id].direction === 'left'
                  ? '← COUNTER-CW'
                  : '— IDLE'}
              </EncoderDirection>
            </Component>
          ))}
        </ComponentGrid>
      </EncoderSection>
    </Container>
  );
}

export default Debug;
