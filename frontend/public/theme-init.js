(function () {
  try {
    var theme = localStorage.getItem('stockpulse-theme');
    if (
      theme === 'dark' ||
      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    var presets = {
      default: '#465FFF',
      cyan: '#078DEE',
      purple: '#7635DC',
      blue: '#0C68E9',
      orange: '#FDA92D',
      red: '#FF3030',
      green: '#12B76A',
    };
    var lightPresets = {
      default: '#7592FF',
      cyan: '#68CDF9',
      purple: '#B985F4',
      blue: '#6BB1F8',
      orange: '#FED680',
      red: '#FFC1AC',
      green: '#6CE9A6',
    };
    var darkPresets = {
      default: '#2A31D8',
      cyan: '#0351AB',
      purple: '#431A9E',
      blue: '#063BA7',
      orange: '#B66816',
      red: '#B71833',
      green: '#027A48',
    };
    var accent = localStorage.getItem('stockpulse-accent-color') || 'default';
    if (presets[accent]) {
      var r = document.documentElement.style;
      r.setProperty('--color-brand-500', presets[accent]);
      r.setProperty('--color-brand-400', lightPresets[accent]);
      r.setProperty('--color-brand-600', darkPresets[accent]);
      r.setProperty('--color-brand-700', darkPresets[accent]);
      r.setProperty('--gooey-color-1', presets[accent]);
      r.setProperty('--gooey-color-2', lightPresets[accent]);
      r.setProperty('--gooey-color-3', lightPresets[accent]);
      r.setProperty('--gooey-color-4', lightPresets[accent] + '99');
    }
  } catch (e) {}
})();
