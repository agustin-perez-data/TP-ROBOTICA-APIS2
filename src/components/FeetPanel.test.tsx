// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { FeetPanel, resumenPatas } from './FeetPanel';

describe('resumenPatas', () => {
  it.each([
    [{ FR: 'en_el_aire', FL: 'apoyada', RR: 'apoyada', RL: 'apoyada' }, '3 apoyadas · FR en el aire'],
    [{ FR: 'apoyada', FL: 'apoyada', RR: 'apoyada', RL: 'apoyada' }, '4 apoyadas'],
    [{ R_foot: 'apoyada', L_foot: 'en_el_aire' }, '1 apoyada · L_foot en el aire'],
    [{ FR: 'desconocido', FL: 'apoyada' }, '1 apoyada · FR sin dato'],
    [{ FR: 'en_el_aire', FL: 'en_el_aire' }, '0 apoyadas · FR, FL en el aire'],
  ] as const)('%j → %s', (patas, esperado) => {
    expect(resumenPatas(patas)).toBe(esperado);
  });
});

describe('FeetPanel', () => {
  it('dibuja cada pata con su estado', () => {
    renderUi(
      <FeetPanel
        nombres={['FR', 'FL', 'RR', 'RL']}
        patas={{ FR: 'en_el_aire', FL: 'apoyada', RR: 'apoyada', RL: 'apoyada' }}
      />,
    );
    expect(screen.getByLabelText('FR: en el aire')).toBeInTheDocument();
    expect(screen.getByLabelText('FL: apoyada')).toBeInTheDocument();
    expect(screen.getByText('3 apoyadas · FR en el aire')).toBeInTheDocument();
  });

  it('dibuja los pies del G1', () => {
    renderUi(<FeetPanel nombres={['R_foot', 'L_foot']} patas={{ R_foot: 'apoyada', L_foot: 'en_el_aire' }} />);
    expect(screen.getByLabelText('R_foot: apoyada')).toBeInTheDocument();
    expect(screen.getByLabelText('L_foot: en el aire')).toBeInTheDocument();
  });

  it('sin patas lo aclara', () => {
    renderUi(<FeetPanel nombres={[]} patas={{}} />);
    expect(screen.getByText('Este robot no informa el contacto de las patas.')).toBeInTheDocument();
  });
});
