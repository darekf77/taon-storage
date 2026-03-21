import {
  crossPlatformPath,
  Helpers,
  UtilsExecProc,
  UtilsFilesFolders,
  UtilsOs,
} from 'tnp-core/src';

import { TaonStor } from './taon-stor';

const defaultValue = 'something default';

const pathToFile = crossPlatformPath([
  UtilsOs.getRealHomeDir(),
  'temp-file-to-delete',
]);

class ExmpleCmp {
  public fileSecretFile = TaonStor.inFile(
    {
      filePath: pathToFile,
      defaultValue,
      key: 'fileSecretFile',
    },
    ExmpleCmp,
  );
}

describe('initialize file value', () => {
  it('Should proper initialize file value', async () => {
    const ins = new ExmpleCmp();
    await TaonStor.awaitAll();

    expect(ins.fileSecretFile).toBe(defaultValue);
    Helpers.removeFileIfExists(pathToFile);
  });
});
