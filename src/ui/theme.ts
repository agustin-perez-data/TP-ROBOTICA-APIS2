import { createTheme, type MantineColorsTuple } from '@mantine/core';

const senal: MantineColorsTuple = [
  '#e8f0fb',
  '#cfdff5',
  '#a3c1ea',
  '#74a1de',
  '#4c85d3',
  '#3473cc',
  '#1f5fbf',
  '#1a52a6',
  '#14468e',
  '#0d3875',
];

export const theme = createTheme({
  fontFamily: "'Barlow', system-ui, sans-serif",
  headings: { fontFamily: "'Barlow', system-ui, sans-serif" },
  primaryColor: 'senal',
  primaryShade: 6,
  colors: { senal },
  defaultRadius: 'sm',
  activeClassName: 'presionable',
});
