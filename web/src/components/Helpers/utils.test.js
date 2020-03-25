import {concatArrayBuffers} from './utils';

describe('Utils', () => {
  describe('concatArrayBuffers', () => {
    const array1 = new Int8Array(8);
    array1[0] = 1;
    const array2 = new Int8Array(16);
    array2[0] = 2;
    it('should return when only first array is present', () => {
      const result = concatArrayBuffers(array1, null);

      expect(result.byteLength).toEqual(8);
    });

    it('should return when only second array is present', () => {
      const result = concatArrayBuffers(null, array2);

      expect(result.byteLength).toEqual(16);
      expect(result[0]).toEqual(2);
    });

    it('should return when both arrays are present', () => {
      const result = concatArrayBuffers(array1, array2);
      const view = new Int8Array(result);

      expect(result.byteLength).toEqual(24);
      expect(view[0]).toEqual(1);
      expect(view[8]).toEqual(2);
    });
  });
});
