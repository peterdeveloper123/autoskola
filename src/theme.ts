import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#245d51' },
    success: { main: '#296c3b' },
    error: { main: '#a83630' },
    background: { default: '#f6f6f2', paper: '#fffefa' },
    text: { primary: '#202b29', secondary: '#525f5a' },
    divider: '#d7ded7',
  },
  typography: {
    fontFamily: 'Arial, Verdana, sans-serif',
    fontSize: 18,
    h1: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.5 },
    h2: { fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.8 },
    body1: { fontSize: '1.125rem', lineHeight: 1.8 },
    body2: { fontSize: '1rem', lineHeight: 1.7 },
    button: { textTransform: 'none', fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 48, padding: '10px 18px' } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontSize: '1.125rem', fontWeight: 600, minHeight: 58 } } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiButtonBase: { styleOverrides: { root: { '&.Mui-focusVisible': { outline: '3px solid #c0801a', outlineOffset: 3 } } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.4rem', fontWeight: 600 } } },
  },
})
