import assert from "node:assert/strict";
import test from "node:test";
import { installPlatform } from "./pwa";

const ua = (userAgent: string, maxTouchPoints = 0) => installPlatform({ userAgent, maxTouchPoints });

test("Apple devices get the right install steps", () => {
  assert.equal(ua("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1", 5), "ios");
  // iPadOS asks for the desktop site and looks like a Mac, apart from its touch screen
  assert.equal(ua("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15", 5), "ios");
  assert.equal(ua("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1", 5), "ios");
  assert.equal(ua("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 380.0.0.0 (iPhone15,2)", 5), "ios-inapp");
  assert.equal(ua("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15"), "mac-safari");
});

test("other browsers use their own install prompt", () => {
  assert.equal(ua("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"), "other");
  assert.equal(ua("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36", 5), "other");
});
