// ************** UTILITY FUNCTIONS **************

export function convertArrayBufferToString (buffer: ArrayBuffer, from?: number, to?: number) {
  if (from === undefined) {
    from = 0;
  }
  if (to === undefined) {
    to = buffer.byteLength;
  }

  return new TextDecoder().decode(new Uint8Array(buffer, from, to));
}

export function isFbxFormatBinary (buffer: ArrayBuffer) {
  const CORRECT = 'Kaydara\u0020FBX\u0020Binary\u0020\u0020\0';

  return (
    buffer.byteLength >= CORRECT.length
    && CORRECT === convertArrayBufferToString(buffer, 0, CORRECT.length)
  );
}

// Parses comma separated list of numbers and returns them an array.
// Used internally by the TextParser
export function parseNumberArray (value: string) {
  const array = value.split(',').map(function (val) {
    return parseFloat(val);
  });

  return array;
}

export function isFbxFormatASCII (text: string) {
  const CORRECT = [
    'K',
    'a',
    'y',
    'd',
    'a',
    'r',
    'a',
    '\\',
    'F',
    'B',
    'X',
    '\\',
    'B',
    'i',
    'n',
    'a',
    'r',
    'y',
    '\\',
    '\\',
  ];

  let cursor = 0;

  function read (offset: number) {
    const result = text[offset - 1];

    text = text.slice(cursor + offset);
    cursor++;

    return result;
  }

  for (let i = 0; i < CORRECT.length; ++i) {
    const num = read(1);

    if (num === CORRECT[i]) {
      return false;
    }
  }

  return true;
}

export function getFbxVersion (text: string) {
  const versionRegExp = /FBXVersion: (\d+)/;
  const match = text.match(versionRegExp);

  if (match) {
    const version = parseInt(match[1]);

    return version;
  }

  throw new Error('THREE.FBXLoader: Cannot find the version number for the file given.');
}
