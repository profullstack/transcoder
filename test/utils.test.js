/**
 * Tests for utility helpers
 */

import { expect } from 'chai';
import { parseFfprobeFrameRate } from '../src/utils.js';

describe('Utils Module', function() {
  describe('parseFfprobeFrameRate()', function() {
    it('should parse ffprobe ratio frame rates without eval', function() {
      expect(parseFfprobeFrameRate('30000/1001')).to.be.closeTo(29.97002997, 0.000001);
      expect(parseFfprobeFrameRate('24000/1001')).to.be.closeTo(23.97602397, 0.000001);
    });

    it('should parse numeric frame rates', function() {
      expect(parseFfprobeFrameRate('25')).to.equal(25);
      expect(parseFfprobeFrameRate(60)).to.equal(60);
    });

    it('should reject invalid or unsafe frame-rate values', function() {
      expect(parseFfprobeFrameRate('1/0')).to.equal(0);
      expect(parseFfprobeFrameRate('30000/1001/1')).to.equal(0);
      expect(parseFfprobeFrameRate('process.exit()')).to.equal(0);
      expect(parseFfprobeFrameRate('')).to.equal(0);
      expect(parseFfprobeFrameRate(null)).to.equal(0);
    });
  });
});
