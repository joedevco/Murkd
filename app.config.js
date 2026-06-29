const APP_VARIANT = process.env.EAS_BUILD_PROFILE ?? 'production';

const variants = {
  development: {
    name: 'Murkd Dev',
    android: { package: 'com.genigeek.Murkd.dev' },
    ios: { bundleIdentifier: 'com.genigeek.Murkd.dev' },
  },
  preview: {
    name: 'Murkd Preview',
    android: { package: 'com.genigeek.Murkd.preview' },
    ios: { bundleIdentifier: 'com.genigeek.Murkd.preview' },
  },
  production: {
    name: 'Murkd',
    android: { package: 'com.genigeek.Murkd' },
    ios: { bundleIdentifier: 'com.genigeek.Murkd' },
  },
};

const config = require('./app.json');

config.expo.name = variants[APP_VARIANT].name;
config.expo.android.package = variants[APP_VARIANT].android.package;
if (config.expo.ios) {
  config.expo.ios.bundleIdentifier = variants[APP_VARIANT].ios.bundleIdentifier;
}
if (APP_VARIANT !== 'production') {
  delete config.expo.android.googleServicesFile;
}

module.exports = config;
