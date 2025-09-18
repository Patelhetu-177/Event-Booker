import "@testing-library/jest-dom";

// Polyfills
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = require("util").TextEncoder as any;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = require("util").TextDecoder as any;
}
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = require('stream/web').ReadableStream as any;
}
if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = require('stream/web').WritableStream as any;
}
if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = require('stream/web').TransformStream as any;
}
if (typeof global.Request === "undefined") {
  global.Request = require("undici").Request;
}
if (typeof global.Response === "undefined") {
  global.Response = require("undici").Response;
}
