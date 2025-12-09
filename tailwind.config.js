/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          '00': 'var(--base00)',
          '01': 'var(--base01)',
          '02': 'var(--base02)',
          '03': 'var(--base03)',
          '04': 'var(--base04)',
          '05': 'var(--base05)',
          '06': 'var(--base06)',
          '07': 'var(--base07)',
          '08': 'var(--base08)',
          '09': 'var(--base09)',
          '0A': 'var(--base0A)',
          '0B': 'var(--base0B)',
          '0C': 'var(--base0C)',
          '0D': 'var(--base0D)',
          '0E': 'var(--base0E)',
          '0F': 'var(--base0F)',
        },
      },
      backgroundColor: {
        'primary': 'var(--base00)',
        'secondary': 'var(--base01)',
        'tertiary': 'var(--base02)',
      },
      textColor: {
        'primary': 'var(--base05)',
        'secondary': 'var(--base04)',
        'accent': 'var(--base0D)',
      },
      borderColor: {
        'default': 'var(--base03)',
        'accent': 'var(--base0D)',
      },
    },
  },
  plugins: [],
}
