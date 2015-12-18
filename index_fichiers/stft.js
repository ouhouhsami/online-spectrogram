(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.stft = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.transform = transform;
exports.inverseTransform = inverseTransform;
/*
 * Free FFT and convolution (JavaScript)
 *
 * Copyright (c) 2014 Project Nayuki
 * http://www.nayuki.io/page/free-small-fft-in-multiple-languages
 *
 * (MIT License)
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */

/*
 * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
 * The vector can have any length. This is a wrapper function.
 */
function transform(real, imag) {
    if (real.length != imag.length) throw "Mismatched lengths";

    var n = real.length;
    if (n == 0) return;else if ((n & n - 1) == 0) // Is power of 2
        transformRadix2(real, imag);else // More complicated algorithm for arbitrary sizes
        transformBluestein(real, imag);
}

/*
 * Computes the inverse discrete Fourier transform (IDFT) of the given complex vector, storing the result back into the vector.
 * The vector can have any length. This is a wrapper function. This transform does not perform scaling, so the inverse is not a true inverse.
 */
function inverseTransform(real, imag) {
    transform(imag, real);
}

/*
 * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
 * The vector's length must be a power of 2. Uses the Cooley-Tukey decimation-in-time radix-2 algorithm.
 */
function transformRadix2(real, imag) {
    // Initialization
    if (real.length != imag.length) throw "Mismatched lengths";
    var n = real.length;
    if (n == 1) // Trivial transform
        return;
    var levels = -1;
    for (var i = 0; i < 32; i++) {
        if (1 << i == n) levels = i; // Equal to log2(n)
    }
    if (levels == -1) throw "Length is not a power of 2";
    var cosTable = new Array(n / 2);
    var sinTable = new Array(n / 2);
    for (var i = 0; i < n / 2; i++) {
        cosTable[i] = Math.cos(2 * Math.PI * i / n);
        sinTable[i] = Math.sin(2 * Math.PI * i / n);
    }

    // Bit-reversed addressing permutation
    for (var i = 0; i < n; i++) {
        var j = reverseBits(i, levels);
        if (j > i) {
            var temp = real[i];
            real[i] = real[j];
            real[j] = temp;
            temp = imag[i];
            imag[i] = imag[j];
            imag[j] = temp;
        }
    }

    // Cooley-Tukey decimation-in-time radix-2 FFT
    for (var size = 2; size <= n; size *= 2) {
        var halfsize = size / 2;
        var tablestep = n / size;
        for (var i = 0; i < n; i += size) {
            for (var j = i, k = 0; j < i + halfsize; j++, k += tablestep) {
                var tpre = real[j + halfsize] * cosTable[k] + imag[j + halfsize] * sinTable[k];
                var tpim = -real[j + halfsize] * sinTable[k] + imag[j + halfsize] * cosTable[k];
                real[j + halfsize] = real[j] - tpre;
                imag[j + halfsize] = imag[j] - tpim;
                real[j] += tpre;
                imag[j] += tpim;
            }
        }
    }

    // Returns the integer whose value is the reverse of the lowest 'bits' bits of the integer 'x'.
    function reverseBits(x, bits) {
        var y = 0;
        for (var i = 0; i < bits; i++) {
            y = y << 1 | x & 1;
            x >>>= 1;
        }
        return y;
    }
}

/*
 * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
 * The vector can have any length. This requires the convolution function, which in turn requires the radix-2 FFT function.
 * Uses Bluestein's chirp z-transform algorithm.
 */
function transformBluestein(real, imag) {
    // Find a power-of-2 convolution length m such that m >= n * 2 + 1
    if (real.length != imag.length) throw "Mismatched lengths";
    var n = real.length;
    var m = 1;
    while (m < n * 2 + 1) {
        m *= 2;
    } // Trignometric tables
    var cosTable = new Array(n);
    var sinTable = new Array(n);
    for (var i = 0; i < n; i++) {
        var j = i * i % (n * 2); // This is more accurate than j = i * i
        cosTable[i] = Math.cos(Math.PI * j / n);
        sinTable[i] = Math.sin(Math.PI * j / n);
    }

    // Temporary vectors and preprocessing
    var areal = new Array(m);
    var aimag = new Array(m);
    for (var i = 0; i < n; i++) {
        areal[i] = real[i] * cosTable[i] + imag[i] * sinTable[i];
        aimag[i] = -real[i] * sinTable[i] + imag[i] * cosTable[i];
    }
    for (var i = n; i < m; i++) {
        areal[i] = aimag[i] = 0;
    }var breal = new Array(m);
    var bimag = new Array(m);
    breal[0] = cosTable[0];
    bimag[0] = sinTable[0];
    for (var i = 1; i < n; i++) {
        breal[i] = breal[m - i] = cosTable[i];
        bimag[i] = bimag[m - i] = sinTable[i];
    }
    for (var i = n; i <= m - n; i++) {
        breal[i] = bimag[i] = 0;
    } // Convolution
    var creal = new Array(m);
    var cimag = new Array(m);
    convolveComplex(areal, aimag, breal, bimag, creal, cimag);

    // Postprocessing
    for (var i = 0; i < n; i++) {
        real[i] = creal[i] * cosTable[i] + cimag[i] * sinTable[i];
        imag[i] = -creal[i] * sinTable[i] + cimag[i] * cosTable[i];
    }
}

/*
 * Computes the circular convolution of the given real vectors. Each vector's length must be the same.
 */
function convolveReal(x, y, out) {
    if (x.length != y.length || x.length != out.length) throw "Mismatched lengths";
    var zeros = new Array(x.length);
    for (var i = 0; i < zeros.length; i++) {
        zeros[i] = 0;
    }convolveComplex(x, zeros, y, zeros.slice(), out, zeros.slice());
}

/*
 * Computes the circular convolution of the given complex vectors. Each vector's length must be the same.
 */
function convolveComplex(xreal, ximag, yreal, yimag, outreal, outimag) {
    if (xreal.length != ximag.length || xreal.length != yreal.length || yreal.length != yimag.length || xreal.length != outreal.length || outreal.length != outimag.length) throw "Mismatched lengths";

    var n = xreal.length;
    xreal = xreal.slice();
    ximag = ximag.slice();
    yreal = yreal.slice();
    yimag = yimag.slice();

    transform(xreal, ximag);
    transform(yreal, yimag);
    for (var i = 0; i < n; i++) {
        var temp = xreal[i] * yreal[i] - ximag[i] * yimag[i];
        ximag[i] = ximag[i] * yreal[i] + xreal[i] * yimag[i];
        xreal[i] = temp;
    }
    inverseTransform(xreal, ximag);
    for (var i = 0; i < n; i++) {
        // Scaling (because this FFT implementation omits it)
        outreal[i] = xreal[i] / n;
        outimag[i] = ximag[i] / n;
    }
}
},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.range = range;
exports.linspace = linspace;
exports.isPower2 = isPower2;
exports.zip = zip;
exports.fft = fft;
exports.ifft = ifft;
exports.zeros = zeros;

var _fft = require('./fft.js');

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

/**
 * range
 * @param {number} start - Starting number of the sequence.
 * @param {number} [stop=undefined] - Generate numbers up to, but not including this number.
 * @param {number} [step=1] - Difference between each number in the sequence.
 * @return {array} Array of evenly spaced values.
 */
function range() {
  var start = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
  var stop = arguments.length <= 1 || arguments[1] === undefined ? undefined : arguments[1];
  var step = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];

  var result = [];
  if (stop == undefined) stop = start;
  if (step > 0 && start >= stop || step < 0 && start <= stop) {
    return result;
  }
  var i = undefined;
  for (i = start; step > 0 ? i < stop : i > stop; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * linspace
 * @param {number} start - Starting number of the sequence.
 * @param {number} [stop=undefined] - Generate numbers up to, but not including this number.
 * @param {number} [num=undefined] - Number of samples to generate
 * @return {array} Array of num equally spaced samples in the closed interval [start, stop]
 */
function linspace(start, stop) {
  var num = arguments.length <= 2 || arguments[2] === undefined ? undefined : arguments[2];

  if ((typeof num === 'undefined' ? 'undefined' : _typeof(num)) == undefined) num = Math.max(Math.round(stop - start) + 1, 1);
  if (num < 2) {
    return num === 1 ? [start] : [];
  }
  var i = undefined,
      ret = Array(num);
  num--;
  for (i = num; i >= 0; i--) {
    ret[i] = (i * stop + (num - i) * start) / num;
  }
  return ret;
}

/**
 * isPower2
 * Test is number is power of 2
 * @param {number} number - number to be tested.
 * @return {bool} true if number is a power of 2, otherwise false.
 */
function isPower2(number) {
  return (number & number - 1) == 0 && number != 0;
}

/**
 * zip arrays
 */
function zip() {
  var args = [].slice.call(arguments);
  var shortest = args.length == 0 ? [] : args.reduce(function (a, b) {
    return a.length < b.length ? a : b;
  });

  return shortest.map(function (_, i) {
    return args.map(function (array) {
      return array[i];
    });
  });
}

/**
 * fft
 */
function fft(real, img) {
  var realCopy = real.slice();
  var imgCopy = undefined;
  if (img == undefined) {
    imgCopy = Array.apply(null, Array(real.length)).map(Number.prototype.valueOf, 0);
  } else {
    imgCopy = img.slice();
  }
  (0, _fft.transform)(realCopy, imgCopy);
  return [realCopy, imgCopy];
}

/**
 * ifft
 */
function ifft(real, img) {
  var realCopy = real.slice();
  var imgCopy = undefined;
  if (img == undefined) {
    imgCopy = Array.apply(null, Array(real.length)).map(Number.prototype.valueOf, 0);
  } else {
    imgCopy = img.slice();
  }
  var length = real.length;
  (0, _fft.inverseTransform)(imgCopy, realCopy);
  realCopy = realCopy.map(function (i) {
    return i / length;
  });
  imgCopy = imgCopy.map(function (i) {
    return i / length;
  });
  return [realCopy, imgCopy];
}

function zeros(size) {
  return Array.apply(null, Array(size)).map(Number.prototype.valueOf, 0);
}
},{"./fft.js":1}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dftAnal = dftAnal;

var _audioSignalProcessingUtils = require("audio-signal-processing-utils");

function dftAnal(x, w, N) {
  /*
  Analysis of a signal using the discrete Fourier transform
  x: input signal, w: analysis window, N: FFT size
  returns mX, pX: magnitude and phase spectrum
  */
  if (!(0, _audioSignalProcessingUtils.isPower2)(N)) {
    // raise error if N not a power of two
    throw new Error("FFT size (N) is not a power of 2");
  }

  if (w.length > N) {
    // raise error if window size bigger than fft size
    throw new Error("Window size (M) is bigger than FFT size");
  }

  // size of positive spectrum, it includes sample 0
  var hN = N / 2 + 1;
  // half analysis window size by rounding
  var hM1 = parseInt(Math.floor((w.length + 1) / 2));
  // half analysis window size by floor
  var hM2 = parseInt(Math.floor(w.length / 2));
  // normalize analysis window
  var sum = w.reduce(function (pv, cv) {
    return pv + cv;
  }, 0);
  // window the input sound
  var xw = (0, _audioSignalProcessingUtils.zip)(x, w).map(function (elmt) {
    return elmt[0] * elmt[1] / sum;
  });
  // zero-phase window in fftbuffer
  var fftbuffer = xw.slice(hM2).concat(xw.slice(0, hM2));
  // compute FFT
  var X = (0, _audioSignalProcessingUtils.fft)(fftbuffer);
  // // compute absolute value of positive side
  // absX = abs(X[:hN])
  var absX = (0, _audioSignalProcessingUtils.zip)(X[0], X[1]).slice(0, hN).map(function (i) {
    return Math.sqrt(i[0] * i[0] + i[1] * i[1]);
  });
  // // if zeros add epsilon to handle log
  // absX[absX<np.finfo(float).eps] = np.finfo(float).eps
  // // magnitude spectrum of positive frequencies in dB
  // mX = 20 * np.log10(absX)
  var mX = absX.map(function (i) {
    return Math.log10(i);
  });
  // // for phase calculation set to 0 the small values
  // X[:hN].real[np.abs(X[:hN].real) < tol] = 0.0
  // // for phase calculation set to 0 the small values
  // X[:hN].imag[np.abs(X[:hN].imag) < tol] = 0.0
  // // unwrapped phase spectrum of positive frequencies
  // pX = np.unwrap(np.angle(X[:hN]))
  var pX = (0, _audioSignalProcessingUtils.zip)(X[0], X[1]).slice(0, hN).map(function (x) {
    return Math.atan2(x[1], x[0]);
  });
  return [mX, pX];
}
},{"audio-signal-processing-utils":2}],4:[function(require,module,exports){
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stft = stft;
exports.stftAnal = stftAnal;
exports.stftSynth = stftSynth;

var _audioSignalProcessingUtils = require('audio-signal-processing-utils');

var _discretFourierTransform = require('discret-fourier-transform');

function stft(x, fs, w, N, H) {}

function stftAnal(x, w, N, H) {
  /**
   * Analysis of a sound using the short-time Fourier transform
   * x: input array sound, w: analysis window, N: FFT size, H: hop size
   * returns xmX, xpX: magnitude and phase spectra
  */
  if (H <= 0) {
    //raise error if hop size 0 or negative
    throw new Error("Hop size (H) smaller or equal to 0");
  }

  var M = w.length; // size of analysis window
  var hM1 = parseInt(Math.floor((M + 1) / 2)); // half analysis window size by rounding
  var hM2 = parseInt(Math.floor(M / 2)); // half analysis window size by floor
  // let x = np.append(zeros(hM2),x)                  // add zeros at beginning to center first window at sample 0
  // let x = np.append(x,zeros(hM2))                  // add zeros at the end to analyze last sample
  //let x = x;
  x = (0, _audioSignalProcessingUtils.zeros)(hM2).concat(x, (0, _audioSignalProcessingUtils.zeros)(hM2));
  var pin = hM1; // initialize sound pointer in middle of analysis window
  var pend = x.length - hM1; // last sample to start a frame
  //w = w / sum(w)                                  // normalize analysis window
  var sum = w.reduce(function (pv, cv) {
    return pv + cv;
  }, 0);
  w = w.map(function (elmt) {
    return elmt / sum;
  });
  var xmX = [];
  var xpX = [];
  // y = np.zeros(x.size)                            // initialize output array
  while (pin <= pend) {
    // while sound pointer is smaller than last sample
    var x1 = x.slice(pin - hM1, pin + hM2); // select one frame of input sound
    var mX = undefined,
        pX = undefined;
    // compute dft
    // if(pin == hM1){                                // if first frame create output arrays
    //   xmX = np.array([mX])
    //   xpX = np.array([pX])
    // }else{                                         // append output to existing array
    //   xmX = np.vstack((xmX,np.array([mX])))
    //   xpX = np.vstack((xpX,np.array([pX])))
    // }

    var _dftAnal = (0, _discretFourierTransform.dftAnal)(x1, w, N);

    var _dftAnal2 = _slicedToArray(_dftAnal, 2);

    mX = _dftAnal2[0];
    pX = _dftAnal2[1];
    xmX.push(mX);
    xpX.push(pX);
    pin += H; // advance sound pointer
  }
  return [xmX, xpX];
}

function stftSynth(mY, pY, M, H) {
  /**
   * Synthesis of a sound using the short-time Fourier transform
   * mY: magnitude spectra, pY: phase spectra, M: window size, H: hop-size
  returns y: output sound
   */
  // half analysis window size by rounding
  var hM1 = Math.floor((M + 1) / 2);
  // half analysis window size by floor
  var hM2 = Math.floor(M / 2);
  // number of frames
  var nFrames = mY.length;
  // initialize output array
  var y = new Array(nFrames * H + hM1 + hM2);
  // iterate over all frames
  var pin = hM1;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _audioSignalProcessingUtils.range)(nFrames)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var i = _step.value;
    }
    //   // compute idft
    //   y1 = DFT.dftSynth(mY[i,:], pY[i,:], M)
    //   // overlap-add to generate output sound
    //   y[pin-hM1:pin+hM2] += H*y1
    //   // advance sound pointer
    //   pin += H
    // // delete half of first window which was added in stftAnal
    // y = np.delete(y, range(hM2))
    // // delete the end of the sound that was added in stftAnal
    // y = np.delete(y, range(y.size-hM1, y.size))
    // return y
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}
},{"audio-signal-processing-utils":2,"discret-fourier-transform":3}]},{},[4])(4)
});