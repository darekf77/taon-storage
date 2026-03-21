import {
  crossPlatformPath,
  Helpers,
  UtilsExecProc,
  UtilsFilesFolders,
  UtilsOs,
} from 'tnp-core/src';

import { TaonStor } from './taon-stor';

describe('initialize file value', () => {
  const defaultValue = 'something default';

  const pathToFile = crossPlatformPath([
    UtilsOs.getRealHomeDir(),
    'temp-file-to-delete',
  ]);

  class ExmpleCmp {
    public fileSecretFile = TaonStor.inFile(
      {
        defaultValue,
        keyOrPath: pathToFile,
      },
      ExmpleCmp,
    );
  }

  it('Should proper initialize file value', async () => {
    const ins = new ExmpleCmp();
    await TaonStor.awaitAll();

    expect(ins.fileSecretFile()).toBe(defaultValue);
    Helpers.removeFileIfExists(pathToFile);
  });
});

describe('initialize json value', () => {
  const defaultValueJson = {
    hello: 'world',
  };

  const pathTojson = crossPlatformPath([
    UtilsOs.getRealHomeDir(),
    'temp-file-to-delete.json',
  ]);

  class ExmpleCmpForJson {
    public fileSecretJson = TaonStor.inFile(
      {
        defaultValue: defaultValueJson,
        keyOrPath: pathTojson,
      },
      ExmpleCmpForJson,
    );
  }

  it('Should proper initialize json value', async () => {
    const ins = new ExmpleCmpForJson();
    await TaonStor.awaitAll();

    expect(ins.fileSecretJson()).toBe(defaultValueJson);
    Helpers.removeFileIfExists(pathTojson);
  });
});
