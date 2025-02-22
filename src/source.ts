import type { VLCPlayerSource } from './types/js';
import { Image } from 'react-native';

export const resolveAssetSource = (input: VLCPlayerSource, autoplay: boolean) => {
  const source = Image.resolveAssetSource(input);
  let uri = source.uri || '';
  if (uri && uri.match(/^\//)) {
    uri = `file://${uri}`;
  }
  let isNetwork = !!(uri && uri.match(/^https?:/));
  const isAsset = !!(uri && uri.match(/^(assets-library|file|content|ms-appx|ms-appdata):/));
  if (!isAsset) {
    isNetwork = true;
  }
  if (uri && uri.match(/^\//)) {
    isNetwork = false;
  }

  return { ...source, isNetwork, isAsset, autoplay, initOptions: [...(input.initOptions || []), '--input-repeat=1000'] };
};
